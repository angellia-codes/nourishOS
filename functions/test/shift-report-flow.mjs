/**
 * Opening/Closing Shift Report smoke test — hand-run against the emulator:
 *
 *   $env:FUNCTIONS_DISCOVERY_TIMEOUT = "120"
 *   firebase emulators:start --project demo-nourishos
 *   npm --prefix functions run build
 *   node functions/test/shift-report-flow.mjs
 *
 * Drives submitShiftReport as real signed-in users so both trust boundaries are
 * actually exercised: the callable's permission + validation checks, and
 * firestore.rules on the way back out.
 *
 * Asserts what must hold (opening_closing_shift_report_template.md):
 *   - an opening report lands at the deterministic id outletId__date__opening
 *   - a second opening report for the same outlet+day is rejected
 *   - a closing report resolves openingReportId back to the morning's report
 *   - an unknown checklist item id is rejected rather than silently dropped
 *   - closing-only fields are blanked on an opening report
 *   - a caller without shiftReports.submit is rejected
 *   - a manager from another outlet cannot read the report
 */
import assert from 'node:assert/strict'

const FN = 'http://127.0.0.1:5001/demo-nourishos/asia-southeast2'
const FS = 'http://127.0.0.1:8080/v1/projects/demo-nourishos/databases/(default)/documents'
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1'
const AUTH_ADMIN = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-nourishos'

let pass = 0
let fail = 0
function check(label, ok, detail = '') {
  if (ok) {
    pass += 1
    console.log(`  ok   ${label}`)
  } else {
    fail += 1
    console.error(`  FAIL ${label}${detail ? `\n       ${detail}` : ''}`)
  }
}

const V = (v) => {
  if (v === null) return { nullValue: null }
  if (typeof v === 'string') return { stringValue: v }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(V) } }
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, V(x)])) } }
}
const unV = (f) => {
  if (!f) return undefined
  if ('nullValue' in f) return null
  if ('stringValue' in f) return f.stringValue
  if ('booleanValue' in f) return f.booleanValue
  if ('integerValue' in f) return Number(f.integerValue)
  if ('doubleValue' in f) return f.doubleValue
  if ('timestampValue' in f) return f.timestampValue
  if ('arrayValue' in f) return (f.arrayValue.values ?? []).map(unV)
  if ('mapValue' in f) return Object.fromEntries(Object.entries(f.mapValue.fields ?? {}).map(([k, x]) => [k, unV(x)]))
  return undefined
}

async function seed(path, data) {
  const res = await fetch(`${FS}/${path}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, V(v)])) }),
  })
  if (!res.ok) throw new Error(`seed ${path}: ${res.status} ${await res.text()}`)
}

/** Rules-enforced read. 403 = denied, 404 = allowed-but-missing. */
async function read(path, idToken) {
  const res = await fetch(`${FS}/${path}`, { headers: { Authorization: `Bearer ${idToken}` } })
  const body = res.ok ? await res.json() : null
  return {
    status: res.status,
    doc: body ? Object.fromEntries(Object.entries(body.fields ?? {}).map(([k, v]) => [k, unV(v)])) : null,
  }
}

async function call(name, idToken, data) {
  const res = await fetch(`${FN}/${name}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.error) {
    return { ok: false, status: res.status, code: body.error?.status, message: body.error?.message ?? '' }
  }
  return { ok: true, data: body.result?.data }
}

async function actor(email, { role, departmentId, outletId, permissions }) {
  const password = 'Password123!'
  const up = await fetch(`${AUTH}/accounts:signUp?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  }).then((r) => r.json())
  if (!up.localId) throw new Error(`signUp ${email}: ${JSON.stringify(up)}`)
  const uid = up.localId

  const claimed = await fetch(`${AUTH_ADMIN}/accounts:update`, {
    method: 'POST',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ localId: uid, customAttributes: JSON.stringify({ role, departmentId, outletId }) }),
  })
  if (!claimed.ok) throw new Error(`claims ${email}: ${claimed.status} ${await claimed.text()}`)

  await seed(`roles/${role}`, { name: role, description: role, permissions, status: 'active', isArchived: false })
  await seed(`users/${uid}`, {
    email,
    displayName: email.split('@')[0],
    roleId: role,
    departmentId,
    outletId,
    status: 'active',
  })

  const signIn = await fetch(`${AUTH}/accounts:signInWithPassword?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  }).then((r) => r.json())
  const payload = JSON.parse(Buffer.from(signIn.idToken.split('.')[1], 'base64').toString())
  if (payload.role !== role) throw new Error(`token for ${email} lacks the role claim: ${JSON.stringify(payload)}`)
  return { uid, email, role, outletId, token: signIn.idToken }
}

/** WITA date key, matching functions/src/lib/timestamps.ts — the doc id depends on it. */
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' })

const BASE = ['dashboard.read', 'tasks.complete', 'chat.send']
const stamp = Date.now()

/**
 * Document ids are deterministic (outlet + WITA date + type), so a rerun on the
 * same day collides with the previous run's documents. Clear them first — the
 * script is meant to be re-runnable, not once-per-day.
 */
async function clearTodaysReports() {
  const ids = [
    `nourish_uluwatu__${today}__opening`,
    `nourish_uluwatu__${today}__closing`,
    `nourish_berawa__${today}__closing`,
  ]
  await Promise.all(
    ids.map((id) => fetch(`${FS}/shiftHandovers/${id}`, { method: 'DELETE', headers: { Authorization: 'Bearer owner' } })),
  )
}

async function main() {
  console.log('Shift Reports — emulator smoke test\n')
  await clearTodaysReports()

  const manager = await actor(`sr-manager-${stamp}@nourish.test`, {
    role: `srManager${stamp}`,
    departmentId: 'fb_service',
    outletId: 'nourish_uluwatu',
    permissions: [...BASE, 'shiftReports.submit', 'shiftReports.read'],
  })
  const otherOutlet = await actor(`sr-other-${stamp}@nourish.test`, {
    role: `srOther${stamp}`,
    departmentId: 'fb_service',
    outletId: 'nourish_berawa',
    permissions: [...BASE, 'shiftReports.submit', 'shiftReports.read'],
  })
  const noPermission = await actor(`sr-staff-${stamp}@nourish.test`, {
    role: `srStaff${stamp}`,
    departmentId: 'fb_service',
    outletId: 'nourish_uluwatu',
    permissions: [...BASE],
  })

  const openingId = `${manager.outletId}__${today}__opening`
  const closingId = `${manager.outletId}__${today}__closing`

  // ---- Opening report ----
  const opening = await call('submitShiftReport', manager.token, {
    reportType: 'opening',
    shift: 'Morning',
    foodPromo: 'Nasi campur 20% off',
    unavailableItems: [
      { category: 'cakeGelato', product: 'Pistachio gelato', reason: 'Supplier delay', actionRequired: 'Chase supplier' },
      { category: 'food', product: '', reason: 'blank row', actionRequired: '' },
    ],
    maintenance: { present: true, details: 'Chiller 2 running warm' },
    complaints: { present: false, details: 'should be dropped' },
    floor: { pic: 'Wayan', regularStaff: 4, dailyWorker: 1, midShift: 2 },
    priorities: ['Chase gelato supplier', 'Brief new daily worker', '', 'fourth is cut'],
    // closing-only fields, sent deliberately to prove the server blanks them
    managerIc: 'should not stick',
    followUpRequired: 'should not stick',
    hygiene: { present: true, details: 'should not stick' },
    checklistStatuses: { lights_on: true, cash_float: false },
  })
  check('opening report submitted', opening.ok, opening.message)
  check('opening report id is deterministic', opening.data?.reportId === openingId, `got ${opening.data?.reportId}`)

  const openingDoc = (await read(`shiftHandovers/${openingId}`, manager.token)).doc
  check('filing manager can read own outlet report', openingDoc !== null)
  check('blank product rows dropped', openingDoc?.unavailableItems?.length === 1, JSON.stringify(openingDoc?.unavailableItems))
  check('flagged issue kept with details', openingDoc?.maintenance?.details === 'Chiller 2 running warm')
  check('unflagged issue details dropped', openingDoc?.complaints?.details === '')
  check('priorities trimmed to three non-empty', openingDoc?.priorities?.length === 2, JSON.stringify(openingDoc?.priorities))
  check('closing-only managerIc blanked on opening', openingDoc?.managerIc === '')
  check('closing-only followUpRequired blanked on opening', openingDoc?.followUpRequired === '')
  check('closing-only hygiene blanked on opening', openingDoc?.hygiene?.present === false)
  check('checklist stored', openingDoc?.checklistStatuses?.lights_on === true)
  check('date is the WITA key', openingDoc?.date === today, `got ${openingDoc?.date}`)
  check('status is submitted', openingDoc?.status === 'submitted')

  // ---- Duplicate ----
  const duplicate = await call('submitShiftReport', manager.token, { reportType: 'opening', shift: 'Morning' })
  check('second opening report rejected', !duplicate.ok && /already/i.test(duplicate.message), duplicate.message)

  // ---- Validation ----
  const badItem = await call('submitShiftReport', manager.token, {
    reportType: 'closing',
    shift: 'Night',
    checklistStatuses: { not_a_real_item: true },
  })
  check('unknown checklist item rejected', !badItem.ok && /Unknown checklist item/.test(badItem.message), badItem.message)

  const openingItemOnClosing = await call('submitShiftReport', manager.token, {
    reportType: 'closing',
    shift: 'Night',
    checklistStatuses: { lights_on: true },
  })
  check(
    'opening checklist item rejected on a closing report',
    !openingItemOnClosing.ok && /Unknown checklist item/.test(openingItemOnClosing.message),
    openingItemOnClosing.message,
  )

  const noShift = await call('submitShiftReport', manager.token, { reportType: 'closing', shift: '   ' })
  check('blank shift rejected', !noShift.ok && /Shift is required/.test(noShift.message), noShift.message)

  const badType = await call('submitShiftReport', manager.token, { reportType: 'midday', shift: 'Mid' })
  check('unknown reportType rejected', !badType.ok && /reportType/.test(badType.message), badType.message)

  const badOutlet = await call('submitShiftReport', manager.token, {
    reportType: 'closing',
    shift: 'Night',
    outletId: 'not_an_outlet',
  })
  check('unknown outlet rejected', !badOutlet.ok && /Unknown outlet/.test(badOutlet.message), badOutlet.message)

  // ---- Permission ----
  const denied = await call('submitShiftReport', noPermission.token, { reportType: 'closing', shift: 'Night' })
  check('caller without shiftReports.submit rejected', !denied.ok, denied.message)

  // ---- Closing report + carry-forward link ----
  const closing = await call('submitShiftReport', manager.token, {
    reportType: 'closing',
    shift: 'Night',
    managerIc: 'Komang',
    hygiene: { present: true, details: 'Floor drain blocked' },
    followUpRequired: 'Engineering to attend tomorrow',
    picAcknowledgement: 'Made',
    checklistStatuses: { outlet_secured: true, chiller_checked: true },
    reviewRating: 4.6,
    reviewCount: 128,
  })
  check('closing report submitted', closing.ok, closing.message)
  check('closing report id is deterministic', closing.data?.reportId === closingId, `got ${closing.data?.reportId}`)

  const closingDoc = (await read(`shiftHandovers/${closingId}`, manager.token)).doc
  check('closing report links back to the opening report', closingDoc?.openingReportId === openingId, `got ${closingDoc?.openingReportId}`)
  check('closing-only hygiene kept', closingDoc?.hygiene?.details === 'Floor drain blocked')
  check('closing-only managerIc kept', closingDoc?.managerIc === 'Komang')
  check('review rating stored as a number', closingDoc?.reviewRating === 4.6, `got ${closingDoc?.reviewRating}`)

  // A closing report with no opening report that day carries a null link.
  const soloClosing = await call('submitShiftReport', otherOutlet.token, { reportType: 'closing', shift: 'Night' })
  check('closing report without an opening report submitted', soloClosing.ok, soloClosing.message)
  const soloDoc = (await read(`shiftHandovers/${soloClosing.data?.reportId}`, otherOutlet.token)).doc
  check('openingReportId is null when no opening report exists', soloDoc?.openingReportId === null, `got ${soloDoc?.openingReportId}`)

  // ---- firestore.rules ----
  const crossOutlet = await read(`shiftHandovers/${openingId}`, otherOutlet.token)
  check('manager from another outlet is denied', crossOutlet.status === 403, `got HTTP ${crossOutlet.status}`)

  console.log(`\n${pass} passed, ${fail} failed`)
  assert.equal(fail, 0, `${fail} check(s) failed`)
}

main().catch((error) => {
  console.error(`\nAborted: ${error.message}`)
  process.exitCode = 1
})
