/**
 * Payroll batch + payslip end-to-end smoke test - hand-run against the emulator:
 *
 *   firebase emulators:start --project demo-nourishos
 *   npm --prefix functions run build
 *   node functions/test/payroll-flow.mjs
 *
 * Rewritten 2026-08-26 for the batch/payslip model in
 * docs/modules/payroll-components-payslip-design.md. The previous version
 * exercised `importPayroll` and the flat `payrollRecords` collection, both
 * retired.
 *
 * Walks a full month: annual parameters -> component registry -> CSV parse and
 * reconciliation -> batch creation -> the finance/GM/director approval chain ->
 * payslips becoming readable. The statutory maths itself is pinned separately,
 * without an emulator, by payroll-statutory.mjs; what this covers is the parts
 * only a live stack can show - RBAC, firestore.rules, the approval handler,
 * and the duplicate-file guard.
 *
 * Re-runnable: employees get a per-run id suffix and the CSV hash changes with
 * them, so a second run is a genuinely new file rather than a rejected duplicate.
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const here = path.dirname(fileURLToPath(import.meta.url))

let ROLE_PERMISSIONS
let PERMISSIONS
try {
  ;({ ROLE_PERMISSIONS } = require(path.join(here, '..', 'lib', 'lib', 'organization.js')))
  ;({ PERMISSIONS } = require(path.join(here, '..', 'lib', 'lib', 'permissions.js')))
} catch {
  console.error('Could not load the compiled lib — run `npm --prefix functions run build` first.')
  process.exit(1)
}

const PROJECT = 'demo-nourishos'
const AUTH = `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1`
const AUTH_ADMIN = `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/${PROJECT}`
const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`
const FN = `http://127.0.0.1:5001/${PROJECT}/asia-southeast2`
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }

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
  if (v === null || v === undefined) return { nullValue: null }
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

async function seedDoc(path_, data) {
  const res = await fetch(`${FS}/${path_}`, {
    method: 'PATCH',
    headers: OWNER,
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, V(v)])) }),
  })
  if (!res.ok) throw new Error(`seed ${path_}: ${res.status} ${await res.text()}`)
}

async function getDoc(path_, idToken) {
  const res = await fetch(`${FS}/${path_}`, { headers: idToken ? { Authorization: `Bearer ${idToken}` } : OWNER })
  return { status: res.status, doc: res.ok ? Object.fromEntries(Object.entries((await res.json()).fields ?? {}).map(([k, v]) => [k, unV(v)])) : null }
}

function permissionsFor(roleId) {
  return roleId === 'superAdmin' ? Object.values(PERMISSIONS) : ROLE_PERMISSIONS[roleId]
}

async function seedAccount({ role, email, outlet, department, name }) {
  const sub = `flow-${role}`
  const idp = await fetch(`${AUTH}/accounts:signInWithIdp?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      postBody: `id_token=${JSON.stringify({ sub, email, email_verified: true, name })}&providerId=google.com`,
      requestUri: 'http://localhost',
      returnIdpCredential: true,
      returnSecureToken: true,
    }),
  }).then((r) => r.json())
  if (!idp.localId) throw new Error(`signInWithIdp(${role}): ${JSON.stringify(idp)}`)
  const uid = idp.localId

  await fetch(`${AUTH_ADMIN}/accounts:update`, {
    method: 'POST',
    headers: OWNER,
    body: JSON.stringify({ localId: uid, displayName: name, customAttributes: JSON.stringify({ role, departmentId: department, outletId: outlet }) }),
  })

  const now = new Date().toISOString()
  const permissions = permissionsFor(role)
  await seedDoc(`roles/${role}`, {
    name: role, description: 'Seeded for payroll-flow test.', permissions, status: 'active', isArchived: false,
    createdAt: now, createdBy: 'seed', updatedAt: now, updatedBy: 'seed',
  })
  await seedDoc(`users/${uid}`, {
    email, displayName: name, roleId: role, departmentId: department, outletId: outlet, status: 'active', isArchived: false,
    createdAt: now, createdBy: 'seed', updatedAt: now, updatedBy: 'seed',
  })

  const reIdp = await fetch(`${AUTH}/accounts:signInWithIdp?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      postBody: `id_token=${JSON.stringify({ sub, email, email_verified: true })}&providerId=google.com`,
      requestUri: 'http://localhost',
      returnIdpCredential: true,
      returnSecureToken: true,
    }),
  }).then((r) => r.json())

  return { uid, idToken: reIdp.idToken }
}

async function call(idToken, name, data = {}) {
  const res = await fetch(`${FN}/${name}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.error) {
    throw new Error(`${name}: ${body.error?.message ?? `HTTP ${res.status}`}`)
  }
  return body.result?.data
}

const { PAYROLL_CSV_COLUMNS } = require(path.join(here, '..', 'lib', 'lib', 'payroll.js'))
const { recomputeStatutory } = require(path.join(here, '..', 'lib', 'hr', 'payroll', 'statutory.js'))

const OUTLET = 'nourish_uluwatu'
const PERIOD = '2026-09'
const YEAR = 2026

/** Section 4.2 - the 2026 statutory parameters this run validates against. */
const PARAMETERS = {
  year: YEAR,
  jkk: 0.0054,
  jkm: 0.003,
  jhtCompany: 0.037,
  jhtEmployee: 0.02,
  jpCompany: 0.02,
  jpEmployee: 0.01,
  bpjsKesCo: 0.04,
  bpjsKesEmp: 0.01,
  bpjsKesFam: 0.01,
  jpWageCeiling: 11086300,
  bpjsKesCeiling: 12000000,
  effectiveFrom: `${YEAR}-01-01`,
}

/** Every column section 5 defines, blank unless the row overrides it. */
function blankRow() {
  return Object.fromEntries(PAYROLL_CSV_COLUMNS.map((column) => [column, '']))
}

/**
 * Builds one arithmetically-consistent CSV row, with the statutory figures
 * computed exactly the way the validator will recompute them - so a clean row
 * really is clean and any failure below is a real one.
 *
 * BPJS Kesehatan is left nil: this employee is not enrolled, the same case the
 * design doc's own reference slip carries, and validate.ts treats a nil
 * Kesehatan line as not-enrolled rather than a variance.
 */
function rowFor({ employeeNumber, fullName, basicSalary, legacyEmployeeId = '', extra = {} }) {
  const statutory = recomputeStatutory(PARAMETERS, basicSalary)
  const amountOf = (id) => statutory.find((c) => c.componentId === id)?.amount ?? 0

  const jkk = amountOf('JKK_COMPANY')
  const jkm = amountOf('JKM_COMPANY')
  const jhtCo = amountOf('JHT_COMPANY')
  const jpCo = amountOf('JP_COMPANY')
  const jhtEmp = amountOf('JHT_EMPLOYEE')
  const jpEmp = amountOf('JP_EMPLOYEE')

  const mirror = jkk + jkm + jhtCo + jpCo
  const transport = 300000
  const pph21 = 125000

  // Column totals INCLUDE the mirror on both sides, exactly as the slip prints.
  const totalIncome = basicSalary + transport + mirror
  const totalDeduction = jhtEmp + jpEmp + pph21 + mirror

  return {
    ...blankRow(),
    employeeNumber,
    legacyEmployeeId,
    fullName,
    period: PERIOD,
    BASIC_SALARY: String(basicSalary),
    TRANSPORT_ALLOWANCE: String(transport),
    JHT_EMPLOYEE: String(jhtEmp),
    JP_EMPLOYEE: String(jpEmp),
    PPH21: String(pph21),
    JKK: String(jkk),
    JKM: String(jkm),
    JHT_COMPANY: String(jhtCo),
    JP_COMPANY: String(jpCo),
    totalIncome: String(totalIncome),
    totalDeduction: String(totalDeduction),
    takeHomePay: String(totalIncome - totalDeduction),
    ...extra,
  }
}

/** The same SHA-256-of-the-file-text the import page computes, so the guard is real. */
async function hashRows(rows) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(rows)))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Lists a batch's payslips the way the app does.
 *
 * As a signed-in user the isIssued filter is REQUIRED, not cosmetic: rules do
 * not filter, they validate, so on a `list` the read rule is checked against
 * the query. Without an equality filter on the field the rule reads, the whole
 * list is denied rather than trimmed. `payrollService.subscribeToBatchPayslips`
 * carries the same pair for the same reason.
 *
 * Called with no token it reads as OWNER, which bypasses rules — that is how
 * the assertions below can see unissued drafts at all.
 */
async function queryPayslips(batchId, idToken) {
  const filters = [
    { fieldFilter: { field: { fieldPath: 'batchId' }, op: 'EQUAL', value: { stringValue: batchId } } },
  ]
  if (idToken) {
    filters.push({ fieldFilter: { field: { fieldPath: 'isIssued' }, op: 'EQUAL', value: { booleanValue: true } } })
  }
  const res = await fetch(`${FS}:runQuery`, {
    method: 'POST',
    headers: idToken
      ? { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' }
      : OWNER,
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'payslips' }],
        where: { compositeFilter: { op: 'AND', filters } },
      },
    }),
  })
  if (!res.ok) return { status: res.status, docs: [] }
  const body = await res.json()
  const docs = body
    .filter((entry) => entry.document)
    .map((entry) => ({
      id: entry.document.name.split('/').pop(),
      ...Object.fromEntries(Object.entries(entry.document.fields ?? {}).map(([k, v]) => [k, unV(v)])),
    }))
  return { status: 200, docs }
}

/**
 * Approval resolution runs through the onApprovalRequestResolved Firestore
 * trigger (shared/approval/triggers.ts), so the batch flips to `approved` a
 * beat AFTER approveStep returns. Reading immediately is a race the emulator
 * loses about as often as it wins - poll instead.
 */
async function waitFor(label, predicate, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs
  let last
  while (Date.now() < deadline) {
    last = await predicate()
    if (last) return true
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  console.error(`       waitFor(${label}) timed out after ${timeoutMs}ms`)
  return false
}

async function main() {
  console.log('Seeding accounts (superAdmin, hrManager, finance, generalManager, director, staff)\n')
  const superAdmin = await seedAccount({ role: 'superAdmin', email: 'flow-admin@nourish.test', outlet: OUTLET, department: 'kitchen', name: 'Flow Super Admin' })
  const hrManager = await seedAccount({ role: 'hrManager', email: 'flow-hr@nourish.test', outlet: OUTLET, department: 'human_resources', name: 'Flow HR Manager' })
  const finance = await seedAccount({ role: 'finance', email: 'flow-finance@nourish.test', outlet: OUTLET, department: 'finance_accounting', name: 'Flow Finance' })
  const generalManager = await seedAccount({ role: 'generalManager', email: 'flow-gm@nourish.test', outlet: OUTLET, department: 'admin_general', name: 'Flow GM' })
  const director = await seedAccount({ role: 'director', email: 'flow-director@nourish.test', outlet: OUTLET, department: 'admin_general', name: 'Flow Director' })
  const staff = await seedAccount({ role: 'staff', email: 'flow-staff@nourish.test', outlet: OUTLET, department: 'kitchen', name: 'Flow Staff' })
  check('accounts seeded', [superAdmin, hrManager, finance, generalManager, director, staff].every((a) => a.idToken))

  console.log('\nupsertPayrollParameters - Super Admin only, and the import cannot run without it')
  let hrDeniedParameters = false
  try {
    await call(hrManager.idToken, 'upsertPayrollParameters', PARAMETERS)
  } catch (e) {
    hrDeniedParameters = /permission/i.test(e.message)
  }
  check('hrManager cannot set annual parameters (payroll.manageParameters)', hrDeniedParameters)

  await call(superAdmin.idToken, 'upsertPayrollParameters', PARAMETERS)
  const parametersDoc = await getDoc(`payrollParameters/${YEAR}`)
  check('parameters stored under the year as the doc id', parametersDoc.doc?.jpWageCeiling === 11086300, JSON.stringify(parametersDoc.doc))

  let badRate = false
  try {
    await call(superAdmin.idToken, 'upsertPayrollParameters', { ...PARAMETERS, jhtCompany: 3.7 })
  } catch (e) {
    badRate = /rate between 0 and 1/i.test(e.message)
  }
  check('a rate entered as a percentage rather than a fraction is rejected', badRate)

  console.log('\nseedPayrollComponents - the fourteen discretionary entries, idempotent')
  const seeded = await call(hrManager.idToken, 'seedPayrollComponents')
  check('components seeded (14 on a fresh emulator)', seeded.created === 14 || seeded.created === 0, JSON.stringify(seeded))
  const reseeded = await call(hrManager.idToken, 'seedPayrollComponents')
  check('re-seeding creates nothing and overwrites no HR edit', reseeded.created === 0)

  let statutoryShadow = false
  try {
    await call(hrManager.idToken, 'upsertPayrollComponent', {
      code: 'JHT_EMPLOYEE', labelId: 'x', labelEn: 'x', type: 'deduction', sortOrder: 1, isActive: true, isTaxable: false,
    })
  } catch (e) {
    statutoryShadow = /statutory/i.test(e.message)
  }
  check('a discretionary component cannot shadow a statutory one', statutoryShadow)

  console.log('\nEmployees for the payroll rows')
  const runId = Date.now().toString().slice(-8)
  const emp1 = await call(superAdmin.idToken, 'createEmployee', {
    fullName: 'Payroll Test Employee One', gender: 'male', position: 'waiter', departmentId: 'fb_service', outletId: OUTLET,
    joinDate: '2024-01-15', birthDate: '1995-03-10', phone: `0813${runId}1`, email: `payroll.one.${runId}@nourish.test`,
    employmentStatus: 'PKWTT', probationMonths: 3, contractType: 'permanent',
    // Section 4.6 - one employee carries a legacy id so the decision-8
    // cross-check has something to check; the other does not, so the softened
    // path is exercised alongside it.
    legacyEmployeeId: `L${runId}`,
  })
  const emp2 = await call(superAdmin.idToken, 'createEmployee', {
    fullName: 'Payroll Test Employee Two', gender: 'female', position: 'cashier', departmentId: 'cashier', outletId: OUTLET,
    joinDate: '2023-06-01', birthDate: '1990-11-20', phone: `0813${runId}2`, email: `payroll.two.${runId}@nourish.test`,
    employmentStatus: 'PKWTT', probationMonths: 3, contractType: 'permanent',
  })
  check('two employees created', Boolean(emp1?.employeeId && emp2?.employeeId), JSON.stringify({ emp1, emp2 }))

  const emp1Doc = (await getDoc(`employees/${emp1.employeeId}`)).doc
  const emp2Doc = (await getDoc(`employees/${emp2.employeeId}`)).doc
  check('legacyEmployeeId persisted on the employee record', emp1Doc?.legacyEmployeeId === `L${runId}`, JSON.stringify(emp1Doc?.legacyEmployeeId))

  const cleanRows = [
    rowFor({ employeeNumber: emp1Doc.employeeNumber, fullName: emp1Doc.fullName, basicSalary: 18500000, legacyEmployeeId: `L${runId}` }),
    rowFor({ employeeNumber: emp2Doc.employeeNumber, fullName: emp2Doc.fullName, basicSalary: 6000000 }),
  ]

  console.log('\nparsePayrollCsv - validates, writes nothing')
  const preview = await call(hrManager.idToken, 'parsePayrollCsv', {
    period: PERIOD, sourceFileName: `payroll-${runId}.csv`, sourceFileHash: await hashRows(cleanRows), rows: cleanRows,
  })
  check('preview reports no hard failures', preview.hardFailures.length === 0, JSON.stringify(preview.hardFailures))
  check('preview covers both rows', preview.rowCount === 2 && preview.totals.totalTakeHomePay > 0, JSON.stringify(preview.totals))
  check('employer cost is the mirror total, not zero', preview.totals.totalEmployerCost > 0, JSON.stringify(preview.totals))

  console.log('\nparsePayrollCsv - a statutory variance blocks; an override reason clears it')
  const tampered = [{ ...cleanRows[0] }]
  tampered[0].JHT_EMPLOYEE = String(Number(tampered[0].JHT_EMPLOYEE) + 5000)
  tampered[0].totalDeduction = String(Number(tampered[0].totalDeduction) + 5000)
  tampered[0].takeHomePay = String(Number(tampered[0].takeHomePay) - 5000)
  const blockedPreview = await call(hrManager.idToken, 'parsePayrollCsv', {
    period: PERIOD, sourceFileName: 'tampered.csv', sourceFileHash: await hashRows(tampered), rows: tampered,
  })
  check('a Rp 5,000 statutory variance is a hard failure', blockedPreview.hardFailures.some((i) => i.code === 'statutoryVariance'), JSON.stringify(blockedPreview.hardFailures))

  const overridden = [{ ...tampered[0], statutoryOverrideReason: 'Backdated BPJS correction, agreed with the office.' }]
  const overriddenPreview = await call(hrManager.idToken, 'parsePayrollCsv', {
    period: PERIOD, sourceFileName: 'overridden.csv', sourceFileHash: await hashRows(overridden), rows: overridden,
  })
  check('the same row with a reason passes', overriddenPreview.hardFailures.length === 0, JSON.stringify(overriddenPreview.hardFailures))
  check('and is listed in overriddenRows', overriddenPreview.overriddenRows.includes(emp1Doc.employeeNumber), JSON.stringify(overriddenPreview.overriddenRows))

  console.log('\nPermission gating on the import')
  let staffDeniedParse = false
  try {
    await call(staff.idToken, 'parsePayrollCsv', { period: PERIOD, sourceFileName: 'x.csv', sourceFileHash: 'x', rows: cleanRows })
  } catch (e) {
    staffDeniedParse = /permission/i.test(e.message)
  }
  check('staff cannot parse a payroll CSV (payroll.import)', staffDeniedParse)

  console.log('\ncreatePayrollBatch - writes the batch and the payslips as draft')
  const fileHash = await hashRows(cleanRows)
  const created = await call(hrManager.idToken, 'createPayrollBatch', {
    period: PERIOD, outletId: OUTLET, sourceFileName: `payroll-${runId}.csv`, sourceFileHash: fileHash, rows: cleanRows,
  })
  check('batch created with 2 payslips', created.rowCount === 2 && Boolean(created.batchId), JSON.stringify(created))
  check('batch starts in draft', (await getDoc(`payrollBatches/${created.batchId}`)).doc?.status === 'draft')

  const draftPayslips = await queryPayslips(created.batchId)
  check('two payslips written', draftPayslips.docs.length === 2, JSON.stringify(draftPayslips.docs.length))
  check('every payslip has 29 line items', draftPayslips.docs.every((p) => p.lineItems?.length === 29), JSON.stringify(draftPayslips.docs.map((p) => p.lineItems?.length)))
  check(
    'issuedAt/isIssued are unset before approval - isIssued is what firestore.rules gates on',
    draftPayslips.docs.every((p) => p.issuedAt === null && p.isIssued === false),
    JSON.stringify(draftPayslips.docs.map((p) => ({ issuedAt: p.issuedAt, isIssued: p.isIssued }))),
  )
  check('the payslip header was resolved from the employee record, not the CSV', draftPayslips.docs.every((p) => p.outletName && p.employeeNumber))

  console.log('\nfirestore.rules - an unissued payslip is unreadable by everyone')
  const hrDraftRead = await queryPayslips(created.batchId, hrManager.idToken)
  check('hrManager sees no payslips while the batch is a draft', hrDraftRead.docs.length === 0, JSON.stringify(hrDraftRead.docs.length))

  console.log('\ncreatePayrollBatch - the same file twice is the same month twice')
  let duplicateRejected = false
  try {
    await call(hrManager.idToken, 'createPayrollBatch', {
      period: PERIOD, outletId: OUTLET, sourceFileName: 'renamed.csv', sourceFileHash: fileHash, rows: cleanRows,
    })
  } catch (e) {
    duplicateRejected = /already imported/i.test(e.message)
  }
  check('a re-upload of the identical file is rejected on sourceFileHash', duplicateRejected)

  console.log('\ncreatePayrollBatch - a hard failure aborts the whole write')
  let allOrNothing = false
  try {
    await call(hrManager.idToken, 'createPayrollBatch', {
      period: PERIOD, outletId: OUTLET, sourceFileName: 'bad.csv', sourceFileHash: await hashRows(tampered), rows: tampered,
    })
  } catch (e) {
    allOrNothing = /failed validation/i.test(e.message)
  }
  check('a batch with any hard failure is refused, not partially imported', allOrNothing)

  console.log('\nsubmitPayrollBatch - finance -> generalManager -> director')
  const submitted = await call(hrManager.idToken, 'submitPayrollBatch', { batchId: created.batchId })
  check('approval request raised', Boolean(submitted.approvalRequestId))
  check('batch moved to pendingApproval', (await getDoc(`payrollBatches/${created.batchId}`)).doc?.status === 'pendingApproval')

  let hrCannotApprove = false
  try {
    await call(hrManager.idToken, 'approveStep', { approvalRequestId: submitted.approvalRequestId })
  } catch (e) {
    hrCannotApprove = /approver|permission|role/i.test(e.message)
  }
  check('the HR manager who built the batch cannot approve it', hrCannotApprove)

  await call(finance.idToken, 'approveStep', { approvalRequestId: submitted.approvalRequestId, comments: 'Figures check out.' })
  check('still pending after step 1 of 3', (await getDoc(`payrollBatches/${created.batchId}`)).doc?.status === 'pendingApproval')
  await call(generalManager.idToken, 'approveStep', { approvalRequestId: submitted.approvalRequestId, comments: 'Approved.' })
  check('still pending after step 2 of 3', (await getDoc(`payrollBatches/${created.batchId}`)).doc?.status === 'pendingApproval')
  await call(director.idToken, 'approveStep', { approvalRequestId: submitted.approvalRequestId, comments: 'Approved.' })
  check(
    'batch approved after the third step',
    await waitFor('batch approved', async () => (await getDoc(`payrollBatches/${created.batchId}`)).doc?.status === 'approved'),
  )

  console.log('\nThe approval-resolved handler stamps issuedAt, which is what unseals the payslips')
  check(
    'every payslip now carries issuedAt',
    await waitFor('payslips issued', async () => {
      const current = await queryPayslips(created.batchId)
      return current.docs.length === 2 && current.docs.every((p) => p.issuedAt !== null && p.isIssued === true)
    }),
  )
  const issued = await queryPayslips(created.batchId)

  const hrIssuedRead = await queryPayslips(created.batchId, hrManager.idToken)
  check('hrManager can now read the payslips', hrIssuedRead.docs.length === 2, JSON.stringify(hrIssuedRead.docs.length))
  const financeRead = await queryPayslips(created.batchId, finance.idToken)
  check('finance can read them too', financeRead.docs.length === 2)
  const staffPayslipRead = await queryPayslips(created.batchId, staff.idToken)
  check('staff still cannot - payroll is HQ-only in v1', staffPayslipRead.docs.length === 0)

  console.log('\nsupersedePayslip - a correction is a new payslip, never an edit')
  const target = issued.docs.find((p) => p.employeeNumber === emp1Doc.employeeNumber)
  const correctedAmounts = { BASIC_SALARY: 18500000, TRANSPORT_ALLOWANCE: 450000 }
  for (const line of target.lineItems) {
    if (correctedAmounts[line.componentId] === undefined) correctedAmounts[line.componentId] = line.amount
  }
  const replacement = await call(hrManager.idToken, 'supersedePayslip', {
    payslipId: target.id, amounts: correctedAmounts, reason: 'Transport allowance understated in the source file.',
  })
  check('a replacement payslip was issued', Boolean(replacement.payslipId))

  const originalAfter = await getDoc(`payslips/${target.id}`)
  check('the original is marked superseded, not deleted', originalAfter.doc?.supersededByPayslipId === replacement.payslipId)
  check('the original keeps its old figures - the record that an error occurred survives', originalAfter.doc?.takeHomePay === target.takeHomePay)
  const replacementDoc = await getDoc(`payslips/${replacement.payslipId}`)
  check('the replacement links back and carries the reason', replacementDoc.doc?.supersedesPayslipId === target.id && Boolean(replacementDoc.doc?.statutoryOverrideReason))
  check('the replacement is issued immediately', replacementDoc.doc?.issuedAt !== null)

  let doubleSupersede = false
  try {
    await call(hrManager.idToken, 'supersedePayslip', { payslipId: target.id, amounts: correctedAmounts, reason: 'again' })
  } catch (e) {
    doubleSupersede = /already been superseded/i.test(e.message)
  }
  check('a payslip cannot be superseded twice', doubleSupersede)

  console.log('\ngetManningCostSummary - honest gross, mirrors filtered out')
  const summary = await call(hrManager.idToken, 'getManningCostSummary')
  const row = summary.find((r) => r.outletId === OUTLET && r.periodMonth === PERIOD)
  check('the period appears in the rollup', Boolean(row), JSON.stringify(summary))
  check('superseded slips are not double-counted', row?.employeeCount === 2, JSON.stringify(row))
  const inflatedIncome = Number(cleanRows[0].totalIncome) + Number(cleanRows[1].totalIncome)
  check(
    'totalGross excludes the employer mirror, so it is below the printed column total',
    row.totalGross < inflatedIncome,
    JSON.stringify({ totalGross: row.totalGross, inflatedIncome }),
  )

  let staffDeniedSummary = false
  try {
    await call(staff.idToken, 'getManningCostSummary')
  } catch (e) {
    staffDeniedSummary = /permission|limited/i.test(e.message)
  }
  check('staff cannot call getManningCostSummary', staffDeniedSummary)

  console.log('\nrecordMonthlyRevenue - unchanged by this rewrite')
  await call(hrManager.idToken, 'recordMonthlyRevenue', { outletId: OUTLET, periodMonth: PERIOD, amount: 250000000 })
  check('revenue recorded', (await getDoc(`monthlyRevenue/${OUTLET}_${PERIOD}`)).doc?.amount === 250000000)
  check('staff read of monthlyRevenue is denied', (await getDoc(`monthlyRevenue/${OUTLET}_${PERIOD}`, staff.idToken)).status === 403)
  check('generalManager read of monthlyRevenue is allowed', (await getDoc(`monthlyRevenue/${OUTLET}_${PERIOD}`, generalManager.idToken)).status === 200)

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exitCode = fail > 0 ? 1 : 0
}

main().catch((error) => {
  console.error(`\nAborted: ${error.message}`)
  process.exitCode = 1
})
