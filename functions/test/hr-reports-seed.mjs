/**
 * Seeds representative data for the redesigned HR Reports — hand-run against
 * the emulator, after appraisal-v2-flow.mjs / payroll-flow.mjs or on its own:
 *
 *   firebase emulators:start --project demo-nourishos
 *   npm --prefix functions run build
 *   node functions/test/hr-reports-seed.mjs
 *
 * Unlike the other test scripts this one doesn't assert much — it exists to
 * put real, varied data behind each report page (Turnover, Manning Budget &
 * Cost, Training Hours, Inventory Cost) so they render something meaningful
 * in the browser rather than an empty state. Safe to re-run (unique emails/
 * phones per run via a runId suffix, same as payroll-flow.mjs).
 */

import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const here = path.dirname(fileURLToPath(import.meta.url))

let PERMISSIONS
try {
  ;({ PERMISSIONS } = require(path.join(here, '..', 'lib', 'lib', 'permissions.js')))
} catch {
  console.error('Could not load the compiled lib — run `npm --prefix functions run build` first.')
  process.exit(1)
}

const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1'
const AUTH_ADMIN = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-nourishos'
const FS = 'http://127.0.0.1:8080/v1/projects/demo-nourishos/databases/(default)/documents'
const FN = 'http://127.0.0.1:5001/demo-nourishos/asia-southeast2'
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }

let ok = 0
let failed = 0

const V = (v) => {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'string') return { stringValue: v }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(V) } }
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, V(x)])) } }
}

async function seedDoc(path_, data) {
  const res = await fetch(`${FS}/${path_}`, {
    method: 'PATCH', headers: OWNER,
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, V(v)])) }),
  })
  if (!res.ok) throw new Error(`seed ${path_}: ${res.status} ${await res.text()}`)
}

/** Same account-seeding shape as the other flow scripts — this one only ever needs superAdmin. */
async function seedAccount({ role, email, outlet, department, name }) {
  const sub = `flow-${role}`
  const idp = await fetch(`${AUTH}/accounts:signInWithIdp?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      postBody: `id_token=${JSON.stringify({ sub, email, email_verified: true, name })}&providerId=google.com`,
      requestUri: 'http://localhost', returnIdpCredential: true, returnSecureToken: true,
    }),
  }).then((r) => r.json())
  const uid = idp.localId
  await fetch(`${AUTH_ADMIN}/accounts:update`, {
    method: 'POST', headers: OWNER,
    body: JSON.stringify({ localId: uid, displayName: name, customAttributes: JSON.stringify({ role, departmentId: department, outletId: outlet }) }),
  })

  const now = new Date().toISOString()
  await seedDoc(`roles/${role}`, {
    name: role, description: 'Seeded for hr-reports-seed.', permissions: Object.values(PERMISSIONS), status: 'active', isArchived: false,
    createdAt: now, createdBy: 'seed', updatedAt: now, updatedBy: 'seed',
  })
  await seedDoc(`users/${uid}`, {
    email, displayName: name, roleId: role, departmentId: department, outletId: outlet, status: 'active', isArchived: false,
    createdAt: now, createdBy: 'seed', updatedAt: now, updatedBy: 'seed',
  })

  const reIdp = await fetch(`${AUTH}/accounts:signInWithIdp?key=fake-api-key`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postBody: `id_token=${JSON.stringify({ sub, email, email_verified: true })}&providerId=google.com`, requestUri: 'http://localhost', returnIdpCredential: true, returnSecureToken: true }),
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
    failed += 1
    console.log(`  --   ${name}: ${body.error?.message ?? `HTTP ${res.status}`}`)
    return null
  }
  ok += 1
  return body.result?.data
}

const OUTLET = 'nourish_uluwatu'
const runId = Date.now().toString().slice(-8)
const today = new Date()
const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
const isoDaysAgo = (n) => {
  const d = new Date(today)
  d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function main() {
  console.log('Seeding a superAdmin (or reusing one from a prior flow script)\n')
  const admin = await seedAccount({ role: 'superAdmin', email: 'flow-admin@nourish.test', outlet: OUTLET, department: 'kitchen', name: 'Flow Super Admin' })

  console.log('Employees — active + resigned this month + resigned earlier this year, across two departments')
  const employeeSpecs = [
    { fullName: 'Turnover Active One', gender: 'male', position: 'cook', departmentId: 'kitchen', joinDate: isoDaysAgo(500) },
    { fullName: 'Turnover Active Two', gender: 'female', position: 'cookHelper', departmentId: 'kitchen', joinDate: isoDaysAgo(300) },
    { fullName: 'Turnover Resigned MTD', gender: 'male', position: 'steward', departmentId: 'kitchen', joinDate: isoDaysAgo(400), resignAgo: 3 },
    { fullName: 'Turnover Resigned YTD', gender: 'female', position: 'cook', departmentId: 'kitchen', joinDate: isoDaysAgo(600), resignAgo: 100 },
    { fullName: 'Turnover FBService Active', gender: 'male', position: 'waiter', departmentId: 'fb_service', joinDate: isoDaysAgo(250) },
    { fullName: 'Turnover FBService Resigned MTD', gender: 'female', position: 'waiter', departmentId: 'fb_service', joinDate: isoDaysAgo(200), resignAgo: 5 },
  ]
  const employeeIds = []
  for (const [i, spec] of employeeSpecs.entries()) {
    const result = await call(admin.idToken, 'createEmployee', {
      fullName: spec.fullName, gender: spec.gender, position: spec.position, departmentId: spec.departmentId, outletId: OUTLET,
      joinDate: spec.joinDate, birthDate: '1993-05-01', phone: `0814${runId}${i}`, email: `reports.${i}.${runId}@nourish.test`,
      employmentStatus: 'PKWTT', probationMonths: 3, contractType: 'permanent',
    })
    if (result?.employeeId) {
      employeeIds.push(result.employeeId)
      console.log(`  ok   ${spec.fullName}`)
      if (spec.resignAgo) {
        const archived = await call(admin.idToken, 'archiveEmployee', {
          employeeId: result.employeeId,
          resignationDate: isoDaysAgo(spec.resignAgo),
          resignationReason: 'Seeded for reports testing',
          lastWorkingDate: isoDaysAgo(spec.resignAgo),
        })
        console.log(archived ? '       (resigned)' : '       (resign FAILED)')
      }
    }
  }

  // training-module-spec-v1.0.md superseded createTraining/assignTraining/
  // completeTraining (deleted) with the catalogue model: seed it once, then
  // generate + verify against real bindings.
  console.log('\nTraining catalog + completed assignments (Training Hours report)')
  await call(admin.idToken, 'seedTrainingCatalog', {})
  for (const employeeId of employeeIds) {
    await call(admin.idToken, 'generateTrainingAssignments', { employeeId })
  }
  if (employeeIds[0]) {
    const assignedQuery = await fetch(`${FS}:runQuery`, {
      method: 'POST',
      headers: OWNER,
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'trainingAssignments' }],
          where: {
            compositeFilter: {
              op: 'AND',
              filters: [
                { fieldFilter: { field: { fieldPath: 'employeeId' }, op: 'EQUAL', value: { stringValue: employeeIds[0] } } },
                { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'assigned' } } },
              ],
            },
          },
          limit: 2,
        },
      }),
    }).then((r) => r.json())
    const assignmentIds = (assignedQuery ?? [])
      .filter((row) => row.document)
      .map((row) => row.document.name.split('/').pop())
    for (const assignmentId of assignmentIds) {
      await call(admin.idToken, 'verifyTrainingCompletion', { assignmentId, assessment: { passed: true, score: 8 } })
    }
  }

  console.log('\nInventory — item + receive/issue movements across two months (Inventory Cost report)')
  const item = await call(admin.idToken, 'createInventoryItem', { name: `Kitchen Uniform Shirt ${runId}`, category: 'uniform', unitCost: 150000, hasSizes: true, sizes: ['M', 'L'] })
  if (item?.itemId) {
    await call(admin.idToken, 'receiveStock', { itemId: item.itemId, outletId: OUTLET, sizeVariant: 'M', quantity: 20, reasonCode: 'supplierReceipt' })
    await call(admin.idToken, 'receiveStock', { itemId: item.itemId, outletId: OUTLET, sizeVariant: 'L', quantity: 15, reasonCode: 'supplierReceipt' })
    if (employeeIds[0]) await call(admin.idToken, 'issueStock', { itemId: item.itemId, outletId: OUTLET, sizeVariant: 'M', quantity: 2, reasonCode: 'employeeIssue', employeeId: employeeIds[0] })
    if (employeeIds[1]) await call(admin.idToken, 'issueStock', { itemId: item.itemId, outletId: OUTLET, sizeVariant: 'L', quantity: 1, reasonCode: 'employeeIssue', employeeId: employeeIds[1] })
    if (employeeIds[4]) await call(admin.idToken, 'issueStock', { itemId: item.itemId, outletId: OUTLET, sizeVariant: 'M', quantity: 3, reasonCode: 'employeeIssue', employeeId: employeeIds[4] })
  }

  console.log('\nRequisition — budgeted, approved (Manning Budget)')
  const requisition = await call(admin.idToken, 'createRequisition', {
    outletId: OUTLET, departmentId: 'kitchen', position: 'cook', openings: 2, employmentType: 'ft', contractType: 'permanent',
    requisitionType: 'new_position', targetJoinDate: isoDaysAgo(-30), urgency: 'normal',
    justification: 'Seeded for reports testing', responsibilities: 'Line cooking', requirements: '2yr experience',
    workSchedule: 'Shift-based', budgeted: true,
  })
  if (requisition?.requisitionId) {
    await call(admin.idToken, 'submitRequisition', { requisitionId: requisition.requisitionId })
    const pendingReq = await fetch(`${FS}:runQuery`, {
      method: 'POST', headers: { Authorization: `Bearer ${admin.idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'approvalRequests' }], where: { compositeFilter: { op: 'AND', filters: [
        { fieldFilter: { field: { fieldPath: 'resourceType' }, op: 'EQUAL', value: { stringValue: 'requisition' } } },
        { fieldFilter: { field: { fieldPath: 'resourceId' }, op: 'EQUAL', value: { stringValue: requisition.requisitionId } } },
      ] } } } }),
    }).then((r) => r.json())
    const reqApprovalId = pendingReq.find((r) => r.document)?.document.name.split('/').pop()
    if (reqApprovalId) {
      await call(admin.idToken, 'approveStep', { approvalRequestId: reqApprovalId })
      await call(admin.idToken, 'approveStep', { approvalRequestId: reqApprovalId })
    }
  }

  console.log('\nMonthly revenue (Manning Cost vs Revenue)')
  await call(admin.idToken, 'recordMonthlyRevenue', { outletId: OUTLET, periodMonth: thisMonth, amount: 300000000 })

  console.log(`\n${ok} calls ok, ${failed} failed`)
  console.log('\nView the reports at http://localhost:5174/hr/reports (sign in as flow-admin@nourish.test in the Google popup).')
}

main().catch((error) => {
  console.error(`\nAborted: ${error.message}`)
  process.exitCode = 1
})
