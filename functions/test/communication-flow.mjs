/**
 * Employee Communication end-to-end smoke test — hand-run against the emulator:
 *
 *   npm --prefix functions run build
 *   firebase emulators:start --project demo-nourishos
 *   node functions/test/communication-flow.mjs
 *
 * Walks employee_communication.md's whole lifecycle as six real signed-in users
 * — department head, HR, GM, the subject employee, an employee with no login,
 * and an unrelated one — so `firestore.rules` is genuinely enforced rather than
 * bypassed. Seeding uses `Bearer owner`, which skips rules on purpose; every
 * assertion after that uses a real ID token.
 *
 * Bare global fetch, no dependencies. What is worth asserting here is not the
 * happy path alone but the four things a typecheck cannot see: the approval
 * chain resolving around the requester, the three read branches (including the
 * two denials), the validity window starting at acknowledgement, and the
 * fallback for an employee who has no NourishOS account at all.
 */
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const LIB = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib')
const PROJECT = 'demo-nourishos'
const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`
const AUTH = `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1`
const AUTH_ADMIN = `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/${PROJECT}`
const FN = `http://127.0.0.1:5001/${PROJECT}/asia-southeast2`

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

// ---- typed-value helpers for the Firestore REST shape ----
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

/** Rules-enforced read. Returns {status, doc}. 403 = denied, 404 = allowed-but-missing. */
async function read(path, idToken) {
  const res = await fetch(`${FS}/${path}`, { headers: { Authorization: `Bearer ${idToken}` } })
  const body = res.ok ? await res.json() : null
  return {
    status: res.status,
    doc: body ? Object.fromEntries(Object.entries(body.fields ?? {}).map(([k, v]) => [k, unV(v)])) : null,
  }
}

/** Rules-enforced list, the shape a client subscription uses. */
async function runQuery(collection, where, idToken) {
  const res = await fetch(`${FS}:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        ...(where
          ? {
              where: {
                fieldFilter: { field: { fieldPath: where.field }, op: 'EQUAL', value: V(where.value) },
              },
            }
          : {}),
      },
    }),
  })
  const text = await res.text()
  if (!res.ok) return { status: res.status, rows: null, error: text }
  const rows = JSON.parse(text)
    .filter((entry) => entry.document)
    .map((entry) => ({
      id: entry.document.name.split('/').pop(),
      ...Object.fromEntries(Object.entries(entry.document.fields ?? {}).map(([k, v]) => [k, unV(v)])),
    }))
  return { status: 200, rows }
}

async function call(name, idToken, data) {
  const res = await fetch(`${FN}/${name}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.error) {
    return { ok: false, status: res.status, code: body.error?.status ?? body.error?.message, message: body.error?.message }
  }
  return { ok: true, data: body.result?.data }
}

/** Auth user + custom claims + a fresh token that actually carries them. */
async function actor(email, { role, departmentId, outletId, employeeId, permissions }) {
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
    body: JSON.stringify({
      localId: uid,
      customAttributes: JSON.stringify({ role, departmentId, outletId }),
    }),
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
    ...(employeeId ? { employeeId } : {}),
  })

  // Re-sign-in so the token carries the claims set above.
  const signIn = await fetch(`${AUTH}/accounts:signInWithPassword?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  }).then((r) => r.json())
  const payload = JSON.parse(Buffer.from(signIn.idToken.split('.')[1], 'base64').toString())
  if (payload.role !== role) throw new Error(`token for ${email} lacks the role claim: ${JSON.stringify(payload)}`)
  return { uid, email, role, token: signIn.idToken }
}

const BASE = ['dashboard.read', 'tasks.complete', 'chat.send']
const HR = [...BASE, 'employees.read', 'employees.create', 'employees.update', 'employees.communicate']
const LEADER = [...BASE, 'employees.communicate']

const stamp = Date.now()
const EMP_A = `empA-${stamp}`
const EMP_B = `empB-${stamp}`

console.log('Seeding actors and employees…')

// EMP_A has a login; EMP_B does not — the two halves of the acknowledgement design.
const lead = await actor(`lead-${stamp}@x.test`, {
  role: 'kitchenLeader',
  departmentId: 'kitchen',
  outletId: 'nourish_uluwatu',
  permissions: LEADER,
})
const otherLead = await actor(`bar-${stamp}@x.test`, {
  role: 'barLeader',
  departmentId: 'bar',
  outletId: 'nourish_uluwatu',
  permissions: LEADER,
})
const hr = await actor(`hr-${stamp}@x.test`, {
  role: 'hrManager',
  departmentId: 'human_resources',
  outletId: 'boh_nourish_group',
  permissions: HR,
})
const gm = await actor(`gm-${stamp}@x.test`, {
  role: 'generalManager',
  departmentId: 'admin_general',
  outletId: 'boh_nourish_group',
  permissions: [...BASE, 'employees.read'],
})
const employee = await actor(`emp-${stamp}@x.test`, {
  role: 'staff',
  departmentId: 'kitchen',
  outletId: 'nourish_uluwatu',
  employeeId: EMP_A,
  permissions: BASE,
})
const stranger = await actor(`stranger-${stamp}@x.test`, {
  role: 'staff',
  departmentId: 'kitchen',
  outletId: 'nourish_uluwatu',
  permissions: BASE,
})

for (const [id, name, number] of [
  [EMP_A, 'Ayu Kitchen', 'N-9001'],
  [EMP_B, 'Budi NoLogin', 'N-9002'],
]) {
  await seed(`employees/${id}`, {
    fullName: name,
    employeeNumber: number,
    departmentId: 'kitchen',
    outletId: 'nourish_uluwatu',
    position: 'cook',
    status: 'active',
    isArchived: false,
    joinDate: '2024-01-01',
  })
}

const FORM = {
  type: 'SP1',
  description: 'Repeated late arrival',
  incident: {
    date: '2026-08-18',
    time: '09:15',
    location: 'Nourish Uluwatu kitchen',
    details: 'Arrived 45 minutes late for the third time this month.',
    codeOfConductReference: 'CoC §4.2 Punctuality',
  },
  proposedAction: { category: 'coaching', description: 'Weekly check-in for a month.' },
  furtherAction: { employer: 'Adjust the roster', employee: 'Arrive on time' },
  repeatIncident: { consequence: 'A repeat escalates to SP2.', nextExpectedAction: 'SP2' },
}

console.log('\n1. Department head creates and submits')

const created = await call('createDisciplinaryRecord', lead.token, { ...FORM, employeeId: EMP_A })
check('a department head with employees.communicate can create', created.ok, created.message)
const recordId = created.data?.recordId
if (!recordId) {
  console.error('\nNo recordId — aborting.')
  process.exit(1)
}

const afterCreate = (await read(`disciplinaryActions/${recordId}`, hr.token)).doc
check('employeeUid resolved from the users doc', afterCreate?.employeeUid === employee.uid, `got ${afterCreate?.employeeUid}`)
check('employee facts denormalized', afterCreate?.employeeName === 'Ayu Kitchen' && afterCreate?.departmentId === 'kitchen')
check('starts as a draft, not released', afterCreate?.status === 'draft' && afterCreate?.releasedToEmployee === false)
check('validityDays defaulted from the SP1 type', afterCreate?.validityDays === 180, `got ${afterCreate?.validityDays}`)

const strangerCreate = await call('createDisciplinaryRecord', stranger.token, { ...FORM, employeeId: EMP_A })
check('plain staff cannot create', !strangerCreate.ok && /permission/i.test(strangerCreate.message ?? ''), strangerCreate.message)

const submitted = await call('submitCommunicationRecord', lead.token, { recordId })
check('submit routes into the approval chain', submitted.ok, submitted.message)
const approvalRequestId = submitted.data?.approvalRequestId

const req = (await read(`approvalRequests/${approvalRequestId}`, hr.token)).doc
const chain = (req?.steps ?? []).map((s) => s.approverRole)
check(
  'the chain drops the requesting kitchenLeader: hrManager -> generalManager',
  JSON.stringify(chain) === JSON.stringify(['hrManager', 'generalManager']),
  `got ${JSON.stringify(chain)}`,
)

const resubmit = await call('submitCommunicationRecord', lead.token, { recordId })
check('a submitted record cannot be submitted twice', !resubmit.ok, resubmit.message)
const editAfterSubmit = await call('updateDisciplinaryRecord', hr.token, { ...FORM, recordId })
check('a submitted record is locked to editing (Rule 2)', !editAfterSubmit.ok, editAfterSubmit.message)

console.log('\n2. Read rules')

check('HR reads the record', (await read(`disciplinaryActions/${recordId}`, hr.token)).status === 200)
check('the GM reads the record', (await read(`disciplinaryActions/${recordId}`, gm.token)).status === 200)
const leadList = await runQuery('disciplinaryActions', { field: 'departmentId', value: 'kitchen' }, lead.token)
check('the kitchen leader lists their own department', leadList.status === 200 && leadList.rows.some((r) => r.id === recordId), leadList.error)
const otherLeadList = await runQuery('disciplinaryActions', { field: 'departmentId', value: 'kitchen' }, otherLead.token)
check('a bar leader is denied the kitchen list', otherLeadList.status === 403, `status ${otherLeadList.status}`)
check('the subject employee cannot read it before release', (await read(`disciplinaryActions/${recordId}`, employee.token)).status === 403)
check('an unrelated employee cannot read it', (await read(`disciplinaryActions/${recordId}`, stranger.token)).status === 403)

const earlyStatement = await call('submitEmployeeStatement', employee.token, { recordId, text: 'Too early.' })
check('the employee cannot submit a statement before release', !earlyStatement.ok, earlyStatement.message)
const earlyAck = await call('acknowledgeCommunicationRecord', employee.token, {
  recordId,
  acknowledgementStatus: 'acknowledged',
})
check('the employee cannot acknowledge before the GM signs', !earlyAck.ok, earlyAck.message)

console.log('\n3. HR then GM approve')

const hrApprove = await call('approveStep', hr.token, { approvalRequestId, comments: 'Reviewed.' })
check('HR approves step 1', hrApprove.ok, hrApprove.message)
const gmEarly = await call('approveStep', employee.token, { approvalRequestId })
check('a non-approver cannot approve', !gmEarly.ok, gmEarly.message)
const gmApprove = await call('approveStep', gm.token, { approvalRequestId, comments: 'Signed.' })
check('the GM approves step 2', gmApprove.ok, gmApprove.message)

// The onApprovalRequestResolved Firestore trigger may not deliver on this box
// (Windows named pipes), so fall back to invoking the registered handler.
async function waitForRelease() {
  for (let i = 0; i < 10; i += 1) {
    const doc = (await read(`disciplinaryActions/${recordId}`, hr.token)).doc
    if (doc?.status === 'pendingEmployee') return { doc, viaTrigger: true }
    await new Promise((r) => setTimeout(r, 700))
  }
  const { createRequire } = await import('module')
  const require = createRequire(import.meta.url)
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
  process.env.GCLOUD_PROJECT = PROJECT
  require(join(LIB, 'hr/employees/index.js'))
  const { getApprovalResolvedHandler } = require(join(LIB, 'shared/approval/registry.js'))
  await getApprovalResolvedHandler('employeeCommunication')({
    approvalRequestId,
    module: 'hr',
    resourceType: 'employeeCommunication',
    resourceId: recordId,
    newStatus: 'approved',
  })
  return { doc: (await read(`disciplinaryActions/${recordId}`, hr.token)).doc, viaTrigger: false }
}

const { doc: released, viaTrigger } = await waitForRelease()
console.log(`     (release ${viaTrigger ? 'came from the Firestore trigger' : 'invoked the registered handler directly'})`)
check('approval releases the record to the employee', released?.status === 'pendingEmployee' && released?.releasedToEmployee === true, JSON.stringify({ status: released?.status, released: released?.releasedToEmployee }))
check('the subject employee can now read it', (await read(`disciplinaryActions/${recordId}`, employee.token)).status === 200)
check('an unrelated employee still cannot', (await read(`disciplinaryActions/${recordId}`, stranger.token)).status === 403)

// A notification is readable only by its own recipient, so this asks as them.
const notif = await runQuery('notifications', { field: 'recipientUid', value: employee.uid }, employee.token)
const released_notif = (notif.rows ?? []).find((n) => n.referenceId === recordId)
check('the employee was notified with a deep link', Boolean(released_notif) && released_notif.actionUrl === `/communications/employee/${recordId}`, JSON.stringify(released_notif?.actionUrl))

console.log('\n4. Employee statement and acknowledgement')

const statement = await call('submitEmployeeStatement', employee.token, {
  recordId,
  text: 'The bus was late. I have changed to an earlier one.',
})
check('the employee submits their own statement', statement.ok, statement.message)
const twice = await call('submitEmployeeStatement', employee.token, { recordId, text: 'Changed my mind.' })
check('the statement is immutable once submitted', !twice.ok, twice.message)

const withStatement = (await read(`disciplinaryActions/${recordId}`, hr.token)).doc
check('the statement is not flagged as entered on behalf', withStatement?.employeeStatement?.enteredOnBehalf === false)

const refuseAsSelf = await call('acknowledgeCommunicationRecord', employee.token, {
  recordId,
  acknowledgementStatus: 'refused',
  circumstances: 'I refuse.',
})
check('an employee cannot self-report a refusal (Rule 7)', !refuseAsSelf.ok, refuseAsSelf.message)

const ack = await call('acknowledgeCommunicationRecord', employee.token, {
  recordId,
  acknowledgementStatus: 'acknowledged',
  signedName: 'Ayu Kitchen',
})
check('the employee acknowledges receipt', ack.ok, ack.message)

const active = (await read(`disciplinaryActions/${recordId}`, hr.token)).doc
const expected = new Date(Date.parse(`${ack.data?.validFrom}T00:00:00Z`) + 180 * 86400000).toISOString().slice(0, 10)
check('status becomes active', active?.status === 'active', `got ${active?.status}`)
check('validUntil is validFrom + 180 days', active?.validUntil === expected, `${active?.validUntil} vs ${expected}`)
check('the signature is typed, not witnessed', active?.acknowledgement?.method === 'typedSignature' && active?.acknowledgement?.witnessedBy === null)

console.log('\n5. HR fallback for an employee with no login')

const bCreated = await call('createDisciplinaryRecord', hr.token, {
  ...FORM,
  type: 'verbalWarning',
  employeeId: EMP_B,
})
check('HR creates a record for an employee with no account', bCreated.ok, bCreated.message)
const bId = bCreated.data?.recordId
const bDoc = (await read(`disciplinaryActions/${bId}`, hr.token)).doc
check('employeeUid is null when there is no users doc', bDoc?.employeeUid === null, `got ${bDoc?.employeeUid}`)
check('validityDays defaulted to 90 for a verbal warning', bDoc?.validityDays === 90, `got ${bDoc?.validityDays}`)

await call('submitCommunicationRecord', hr.token, { recordId: bId })
const bReq = (await read(`approvalRequests/${(await read(`disciplinaryActions/${bId}`, hr.token)).doc.approvalRequestId}`, hr.token)).doc
check(
  'HR filing gets kitchenLeader -> generalManager (their own step dropped)',
  JSON.stringify((bReq?.steps ?? []).map((s) => s.approverRole)) === JSON.stringify(['kitchenLeader', 'generalManager']),
  JSON.stringify((bReq?.steps ?? []).map((s) => s.approverRole)),
)
const bApprovalId = (await read(`disciplinaryActions/${bId}`, hr.token)).doc.approvalRequestId
await call('approveStep', lead.token, { approvalRequestId: bApprovalId, comments: 'ok' })
await call('approveStep', gm.token, { approvalRequestId: bApprovalId, comments: 'ok' })
{
  const { createRequire } = await import('module')
  const require = createRequire(import.meta.url)
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
  process.env.GCLOUD_PROJECT = PROJECT
  require(join(LIB, 'hr/employees/index.js'))
  const { getApprovalResolvedHandler } = require(join(LIB, 'shared/approval/registry.js'))
  const doc = (await read(`disciplinaryActions/${bId}`, hr.token)).doc
  if (doc.status !== 'pendingEmployee') {
    await getApprovalResolvedHandler('employeeCommunication')({
      approvalRequestId: bApprovalId,
      module: 'hr',
      resourceType: 'employeeCommunication',
      resourceId: bId,
      newStatus: 'approved',
    })
  }
}

const noCircumstances = await call('acknowledgeCommunicationRecord', hr.token, {
  recordId: bId,
  acknowledgementStatus: 'refused',
})
check('a refusal without circumstances is rejected', !noCircumstances.ok, noCircumstances.message)

const hrAck = await call('acknowledgeCommunicationRecord', hr.token, {
  recordId: bId,
  acknowledgementStatus: 'refused',
  circumstances: 'Read aloud in the office; the employee declined to sign. Witnessed by the kitchen leader.',
})
check('HR records the refusal on the employee behalf', hrAck.ok, hrAck.message)
const bActive = (await read(`disciplinaryActions/${bId}`, hr.token)).doc
check('a refusal still starts the validity clock (§16)', bActive?.status === 'active' && Boolean(bActive?.validUntil))
check('the witness is recorded', bActive?.acknowledgement?.witnessedBy === hr.uid)

console.log('\n6. Coaching has no validity window')

const coaching = await call('createDisciplinaryRecord', hr.token, {
  ...FORM,
  type: 'coaching',
  employeeId: EMP_A,
})
const cId = coaching.data?.recordId
const cDoc = (await read(`disciplinaryActions/${cId}`, hr.token)).doc
check('coaching defaults to no expiry', cDoc?.validityDays === null, `got ${cDoc?.validityDays}`)

console.log('\n7. Expiry job')
{
  const { createRequire } = await import('module')
  const require = createRequire(import.meta.url)
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
  process.env.GCLOUD_PROJECT = PROJECT
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' })
  const soon = new Date(Date.parse(`${today}T00:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10)

  // Two hand-seeded actives: one due today, one due in 7 days.
  const dueId = `due-${stamp}`
  const soonId = `soon-${stamp}`
  for (const [id, validUntil] of [[dueId, today], [soonId, soon]]) {
    await seed(`disciplinaryActions/${id}`, {
      employeeId: EMP_A,
      employeeName: 'Ayu Kitchen',
      employeeNumber: 'N-9001',
      departmentId: 'kitchen',
      outletId: 'nourish_uluwatu',
      type: 'SP2',
      description: 'seeded',
      investigationNotes: [],
      status: 'active',
      isArchived: false,
      validUntil,
      validityDays: 180,
      createdBy: hr.uid,
      updatedBy: hr.uid,
    })
  }

  const { expireCommunicationRecords } = require(join(LIB, 'hr/employees/communicationExpiry.js'))
  await expireCommunicationRecords.run({ scheduleTime: new Date().toISOString() })

  const dueDoc = (await read(`disciplinaryActions/${dueId}`, hr.token)).doc
  const soonDoc = (await read(`disciplinaryActions/${soonId}`, hr.token)).doc
  check('a record due today becomes expired', dueDoc?.status === 'expired', `got ${dueDoc?.status}`)
  check('a record due in 7 days stays active', soonDoc?.status === 'active', `got ${soonDoc?.status}`)

  const hrNotifs = await runQuery('notifications', { field: 'recipientUid', value: hr.uid }, hr.token)
  const expiredNotif = (hrNotifs.rows ?? []).find((n) => n.referenceId === dueId)
  const soonNotif = (hrNotifs.rows ?? []).find((n) => n.referenceId === soonId)
  check('HR is told it expired', expiredNotif?.title === 'Warning Expired', JSON.stringify(expiredNotif?.title))
  check('HR is warned 7 days out', soonNotif?.title === 'Warning Expiring', JSON.stringify(soonNotif?.title))

  const closed = await call('closeDisciplinaryRecord', hr.token, { recordId: dueId, closureReason: 'Case complete.' })
  check('an expired record can be closed', closed.ok, closed.message)

  // A legacy pre-workflow record must still be closeable without migration.
  const legacyId = `legacy-${stamp}`
  await seed(`disciplinaryActions/${legacyId}`, {
    employeeId: EMP_A,
    type: 'SP1',
    description: 'pre-workflow record',
    investigationNotes: [],
    status: 'open',
    isArchived: false,
    createdBy: hr.uid,
    updatedBy: hr.uid,
  })
  const legacyClose = await call('closeDisciplinaryRecord', hr.token, { recordId: legacyId })
  check('a legacy `open` record can still be closed', legacyClose.ok, legacyClose.message)
}

console.log('\n8. Audit trail')
// auditLogs is deny-all to every client by design (AUDIT_LOG.md §8), so this one
// read bypasses rules deliberately — it proves the entries exist, nothing more.
const audit = await runQuery('auditLogs', { field: 'resourceId', value: recordId }, 'owner')
const events = new Set((audit.rows ?? []).map((r) => r.eventType))
check(
  'every material change was audited',
  ['DisciplinaryRecordCreated', 'CommunicationSubmitted', 'CommunicationStatementSubmitted', 'CommunicationAcknowledged'].every(
    (e) => events.has(e),
  ),
  [...events].join(', '),
)

console.log(`\n${pass} passed, ${fail} failed.`)
process.exit(fail === 0 ? 0 : 1)
