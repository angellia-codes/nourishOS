/**
 * Appraisal v2 end-to-end smoke test — hand-run against the emulator:
 *
 *   firebase emulators:start --project demo-nourishos
 *   npm --prefix functions run build
 *   node functions/test/appraisal-v2-flow.mjs
 *
 * Self-contained — seeds its own three accounts (superAdmin, hrManager, and
 * a kitchenLeader linked to the "headChef" employee it creates) rather than
 * requiring seed-emulator-user.mjs to be run first, since the accounts
 * needed here are specific to this flow. Walks: seedPositions -> a position
 * content edit through the full HR Manager -> Dept Head -> GM approval
 * chain (superAdmin overrides every step, same override the app itself
 * grants that role) -> generateAppraisalTemplate -> approveAppraisalTemplate
 * -> createAppraisal -> submitPrimaryScores (as the real Dept Head account,
 * ownership-checked, no override exists for this) -> submitSecondaryScores
 * (as the real HR Manager account) -> the GM approval step -> acknowledgeAppraisal.
 *
 * Bare global fetch, no dependencies, same shape as communication-flow.mjs /
 * seed-demo-data.mjs.
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

/** Partial-field patch — used to link a user to an employee without clobbering the rest of the doc. */
async function patchField(path_, field, value) {
  const res = await fetch(`${FS}/${path_}?updateMask.fieldPaths=${field}`, {
    method: 'PATCH',
    headers: OWNER,
    body: JSON.stringify({ fields: { [field]: V(value) } }),
  })
  if (!res.ok) throw new Error(`patch ${path_}.${field}: ${res.status} ${await res.text()}`)
}

async function getDoc(path_) {
  const res = await fetch(`${FS}/${path_}`, { headers: OWNER })
  if (!res.ok) return null
  const body = await res.json()
  return Object.fromEntries(Object.entries(body.fields ?? {}).map(([k, v]) => [k, unV(v)]))
}

async function runQuery(collection, wheres, idToken) {
  const res = await fetch(`${FS}:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: wheres.map((w) => ({
              fieldFilter: { field: { fieldPath: w.field }, op: w.op, value: V(w.value) },
            })),
          },
        },
      },
    }),
  })
  const rows = await res.json()
  return rows
    .filter((r) => r.document)
    .map((r) => ({
      id: r.document.name.split('/').pop(),
      ...Object.fromEntries(Object.entries(r.document.fields ?? {}).map(([k, v]) => [k, unV(v)])),
    }))
}

function permissionsFor(roleId) {
  return roleId === 'superAdmin' ? Object.values(PERMISSIONS) : ROLE_PERMISSIONS[roleId]
}

/** Same account-seeding shape as seed-emulator-user.mjs, inlined so this script is self-contained. */
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
    body: JSON.stringify({
      localId: uid,
      displayName: name,
      customAttributes: JSON.stringify({ role, departmentId: department, outletId: outlet }),
    }),
  })

  const now = new Date().toISOString()
  const permissions = permissionsFor(role)
  await seedDoc(`roles/${role}`, {
    name: role,
    description: 'Seeded for appraisal-v2-flow test.',
    permissions,
    status: 'active',
    isArchived: false,
    createdAt: now,
    createdBy: 'seed',
    updatedAt: now,
    updatedBy: 'seed',
  })
  await seedDoc(`users/${uid}`, {
    email,
    displayName: name,
    roleId: role,
    departmentId: department,
    outletId: outlet,
    status: 'active',
    isArchived: false,
    createdAt: now,
    createdBy: 'seed',
    updatedAt: now,
    updatedBy: 'seed',
  })

  // Re-sign-in to get a token carrying the claims just set.
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

/** Firestore triggers (onApprovalRequestResolved -> the position/appraisal resolved handlers) run asynchronously in the emulator — poll rather than assume the write already landed. */
async function waitFor(fn, { timeoutMs = 15000, intervalMs = 300 } = {}) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const result = await fn()
    if (result) return result
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  return null
}

/** One retry on a transport-level failure (the local JVM Firestore emulator has been observed to hiccup under sustained load) — not a retry on a real AppError, which fails immediately. */
async function call(idToken, name, data, { retried = false } = {}) {
  let res
  try {
    res = await fetch(`${FN}/${name}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    })
  } catch (error) {
    if (retried) throw error
    console.log(`       (transport error calling ${name}, retrying once: ${error.message})`)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    return call(idToken, name, data, { retried: true })
  }
  const body = await res.json().catch(() => ({}))
  if ((!res.ok && res.status >= 500) || (body.error && !res.ok && res.status >= 500)) {
    if (retried) throw new Error(`${name}: ${body.error?.message ?? `HTTP ${res.status}`}`)
    console.log(`       (HTTP ${res.status} calling ${name}, retrying once)`)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    return call(idToken, name, data, { retried: true })
  }
  if (!res.ok || body.error) {
    throw new Error(`${name}: ${body.error?.message ?? `HTTP ${res.status}`}`)
  }
  return body.result?.data
}

const OUTLET = 'nourish_uluwatu'
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' })
const daysFromNow = (n) => {
  const d = new Date(`${today}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

async function main() {
  console.log('Seeding accounts (superAdmin, hrManager, kitchenLeader)\n')
  const superAdmin = await seedAccount({
    role: 'superAdmin',
    email: 'flow-admin@nourish.test',
    outlet: OUTLET,
    department: 'kitchen',
    name: 'Flow Super Admin',
  })
  const hrManager = await seedAccount({
    role: 'hrManager',
    email: 'flow-hr@nourish.test',
    outlet: OUTLET,
    department: 'human_resources',
    name: 'Flow HR Manager',
  })
  const kitchenLeader = await seedAccount({
    role: 'kitchenLeader',
    email: 'flow-headchef@nourish.test',
    outlet: OUTLET,
    department: 'kitchen',
    name: 'Flow Head Chef',
  })
  check('accounts seeded', Boolean(superAdmin.idToken && hrManager.idToken && kitchenLeader.idToken))

  console.log('\nPositions Master — seed + content edit through approval')
  const seedResult = await call(superAdmin.idToken, 'seedPositions', {})
  check('seedPositions ran', seedResult.created + seedResult.skipped > 0, JSON.stringify(seedResult))

  const headChefEmployee = await call(superAdmin.idToken, 'createEmployee', {
    fullName: 'Flow Head Chef Employee',
    gender: 'male',
    position: 'headChef',
    departmentId: 'kitchen',
    outletId: OUTLET,
    joinDate: daysFromNow(-1000),
    birthDate: '1985-01-01',
    phone: '081200000001',
    email: 'flow.headchef.employee@nourish.test',
    employmentStatus: 'PKWTT',
    probationMonths: 3,
    contractType: 'permanent',
  })
  check('headChef employee created', Boolean(headChefEmployee?.employeeId), JSON.stringify(headChefEmployee))

  // Link the kitchenLeader account to this employee so createAppraisal's
  // resolveOccupantUid -> resolveEmployeeUid chain finds a real scorer uid.
  await patchField(`users/${kitchenLeader.uid}`, 'employeeId', headChefEmployee.employeeId)
  check('kitchenLeader linked to headChef employee', true)

  const cookEmployee = await call(superAdmin.idToken, 'createEmployee', {
    fullName: 'Flow Cook Employee',
    gender: 'female',
    position: 'cook',
    departmentId: 'kitchen',
    outletId: OUTLET,
    joinDate: daysFromNow(-400),
    birthDate: '1998-06-15',
    phone: '081200000002',
    email: 'flow.cook.employee@nourish.test',
    employmentStatus: 'PKWTT',
    probationMonths: 3,
    contractType: 'permanent',
  })
  check('cook (subject) employee created', Boolean(cookEmployee?.employeeId), JSON.stringify(cookEmployee))

  // 'cook' ships with empty keyResponsibilities per the thin-seed design —
  // stage an edit and drive it through the full HR Manager -> Dept Head -> GM
  // chain. superAdmin overrides every step (approveStep.ts's OVERRIDE_ROLES),
  // same override the app itself grants that role — no separate GM account needed.
  await call(superAdmin.idToken, 'updatePosition', {
    positionId: 'cook',
    keyResponsibilities: [
      { responsibilityId: 'r1', text: { en: 'Prepare menu items to recipe spec during service.', id: 'r1-id' }, order: 0, isRemoved: false },
      { responsibilityId: 'r2', text: { en: 'Maintain food safety and hygiene standards on the line.', id: 'r2-id' }, order: 1, isRemoved: false },
      { responsibilityId: 'r3', text: { en: 'Coordinate with service staff on ticket timing.', id: 'r3-id' }, order: 2, isRemoved: false },
    ],
  })
  const pendingRequests = await runQuery(
    'approvalRequests',
    [
      { field: 'module', op: 'EQUAL', value: 'hr' },
      { field: 'resourceType', op: 'EQUAL', value: 'position' },
      { field: 'resourceId', op: 'EQUAL', value: 'cook' },
    ],
    superAdmin.idToken,
  )
  const positionApprovalRequest = pendingRequests.find((r) => r.approvalStatus === 'pending')
  check('position edit approval request created', Boolean(positionApprovalRequest), JSON.stringify(pendingRequests))

  for (let i = 0; i < 3; i++) {
    const requestNow = await getDoc(`approvalRequests/${positionApprovalRequest.id}`)
    if (requestNow?.approvalStatus === 'approved') break
    await call(superAdmin.idToken, 'approveStep', { approvalRequestId: positionApprovalRequest.id })
  }
  // approveStep's write triggers onApprovalRequestResolved asynchronously —
  // the position-merge handler may not have run yet by the time the last
  // approveStep HTTP call returns, so poll rather than check immediately.
  const positionAfterApproval = await waitFor(async () => {
    const doc = await getDoc(`positions/cook`)
    return doc?.status === 'active' ? doc : null
  })
  check(
    'cook position approved, keyResponsibilities applied, revision bumped',
    positionAfterApproval?.status === 'active' &&
      Array.isArray(positionAfterApproval?.keyResponsibilities) &&
      positionAfterApproval.keyResponsibilities.length === 3 &&
      positionAfterApproval.revision === 2,
    JSON.stringify({ status: positionAfterApproval?.status, revision: positionAfterApproval?.revision }),
  )

  console.log('\nAppraisal template — approve (generation itself needs a real ANTHROPIC_API_KEY, not provisioned in this environment, so a draft is seeded directly and approveAppraisalTemplate is exercised for real)')
  const now = new Date().toISOString()
  await seedDoc('appraisalTemplates/flow-test-template', {
    positionId: 'cook',
    sourcePositionRevision: 2,
    criteria: [
      { criterionId: 'c1', label: { en: 'Recipe accuracy', id: 'c1-id' }, description: { en: 'Prepares menu items to spec.', id: 'c1-id' }, sourceResponsibilityIds: ['r1'], isLeadershipCriterion: false, order: 0 },
      { criterionId: 'c2', label: { en: 'Food safety', id: 'c2-id' }, description: { en: 'Maintains hygiene standards on the line.', id: 'c2-id' }, sourceResponsibilityIds: ['r2'], isLeadershipCriterion: false, order: 1 },
      { criterionId: 'c3', label: { en: 'Ticket coordination', id: 'c3-id' }, description: { en: 'Coordinates with service on timing.', id: 'c3-id' }, sourceResponsibilityIds: ['r3'], isLeadershipCriterion: false, order: 2 },
    ],
    scoringModelVersion: 2,
    generationMethod: 'manual',
    generatedAt: null,
    templateStatus: 'draft',
    approvedByUid: null,
    approvedAt: null,
    version: 1,
    outletId: null,
    createdAt: now,
    createdBy: 'seed',
    updatedAt: now,
    updatedBy: 'seed',
    status: 'active',
    isArchived: false,
  })

  await call(superAdmin.idToken, 'approveAppraisalTemplate', { templateId: 'flow-test-template' })
  const approvedTemplate = await getDoc(`appraisalTemplates/flow-test-template`)
  check('template approved', approvedTemplate?.templateStatus === 'approved' && Boolean(approvedTemplate?.approvedAt))

  console.log('\ncreateAppraisal')
  const appraisal = await call(superAdmin.idToken, 'createAppraisal', {
    employeeId: cookEmployee.employeeId,
    reviewType: 'annual',
    periodLabel: 'FY2026-flow-test',
    periodStart: today,
    periodEnd: daysFromNow(90),
  })
  check('appraisal created', Boolean(appraisal?.appraisalId), JSON.stringify(appraisal))

  let duplicateRejected = false
  try {
    await call(superAdmin.idToken, 'createAppraisal', {
      employeeId: cookEmployee.employeeId,
      reviewType: 'annual',
      periodLabel: 'FY2026-flow-test',
      periodStart: today,
      periodEnd: daysFromNow(90),
    })
  } catch (e) {
    duplicateRejected = /already exists/i.test(e.message)
  }
  check('duplicate-guard rejects same employeeId+reviewType+periodLabel', duplicateRejected)

  const appraisalDoc = await getDoc(`appraisals/${appraisal.appraisalId}`)
  check(
    'scorerModel dualScorer, primaryScorerUid resolved to the linked headChef account, secondaryScorerUid resolved to hrManager',
    appraisalDoc?.scorerModel === 'dualScorer' &&
      appraisalDoc?.primaryScorerUid === kitchenLeader.uid &&
      appraisalDoc?.secondaryScorerUid === hrManager.uid,
    JSON.stringify({ scorerModel: appraisalDoc?.scorerModel, primaryScorerUid: appraisalDoc?.primaryScorerUid, secondaryScorerUid: appraisalDoc?.secondaryScorerUid, expectedPrimary: kitchenLeader.uid, expectedSecondary: hrManager.uid }),
  )

  const criterionIds = (appraisalDoc.criterionScores ?? []).map((c) => c.criterionId)

  console.log('\nPrimary scoring (Dept Head, real account, ownership-checked — no override exists)')
  const lowScores = criterionIds.map((criterionId, i) => ({ criterionId, score: i === 0 ? 3 : 4 })) // deliberately low, to exercise the <60 consequence path
  await call(kitchenLeader.idToken, 'submitPrimaryScores', {
    appraisalId: appraisal.appraisalId,
    criterionScores: lowScores,
    overallComment: 'Solid fundamentals, needs more consistency under pressure.',
  })
  const afterPrimary = await getDoc(`appraisals/${appraisal.appraisalId}`)
  check('status submitted after primary scoring (dualScorer, not approved yet)', afterPrimary?.status === 'submitted')
  check(
    'primary scores locked, secondary scores still null (HR view must not see them pre-submission)',
    afterPrimary.criterionScores.every((c) => typeof c.primaryScore === 'number' && c.secondaryScore === null),
  )

  let wrongScorerRejected = false
  try {
    await call(superAdmin.idToken, 'submitPrimaryScores', {
      appraisalId: appraisal.appraisalId,
      criterionScores: lowScores,
    })
  } catch (e) {
    wrongScorerRejected = /assigned primary scorer/i.test(e.message)
  }
  check('a non-scorer (even superAdmin) cannot submit primary scores — ownership check has no override', wrongScorerRejected)

  console.log('\nSecondary scoring (HR Manager, real account)')
  const secondaryScores = criterionIds.map((criterionId) => ({ criterionId, score: 3 }))
  await call(hrManager.idToken, 'submitSecondaryScores', { appraisalId: appraisal.appraisalId, criterionScores: secondaryScores })
  const afterSecondary = await getDoc(`appraisals/${appraisal.appraisalId}`)
  check('status pending after secondary scoring, weighted scores computed', afterSecondary?.status === 'pending')
  check('finalScore computed, band assigned', typeof afterSecondary.finalScore === 'number' && Boolean(afterSecondary.ratingBand))
  console.log(`       finalScore=${afterSecondary.finalScore?.toFixed(2)} ratingBand=${afterSecondary.ratingBand}`)

  console.log('\nGM approval step (superAdmin overrides the approverRole check)')
  const appraisalApprovalRequests = await runQuery(
    'approvalRequests',
    [
      { field: 'module', op: 'EQUAL', value: 'hr' },
      { field: 'resourceType', op: 'EQUAL', value: 'appraisalV2' },
      { field: 'resourceId', op: 'EQUAL', value: appraisal.appraisalId },
    ],
    superAdmin.idToken,
  )
  check('hr/appraisalV2 approval request created', appraisalApprovalRequests.length > 0)
  await call(superAdmin.idToken, 'approveStep', { approvalRequestId: appraisalApprovalRequests[0].id })

  // Same async-trigger lag as the position approval above — the resolved
  // handler (status flip, then the §9 consequence write as a SEPARATE later
  // update within the same handler invocation) runs after this HTTP call
  // returns. If the score is <60, wait for consequenceTaskId too, or a poll
  // landing between the two writes reports a false negative.
  const willHaveConsequence = afterSecondary.finalScore < 60
  const afterApproval = await waitFor(async () => {
    const doc = await getDoc(`appraisals/${appraisal.appraisalId}`)
    if (doc?.status !== 'approved') return null
    if (willHaveConsequence && !doc.consequenceTaskId) return null
    return doc
  })
  check('status approved', afterApproval?.status === 'approved')

  if (afterApproval.finalScore < 60) {
    console.log('\n§9 consequence — finalScore < 60, expect a confidential recommendation and a Task Engine task')
    check('consequenceTaskId set on the appraisal', Boolean(afterApproval.consequenceTaskId))
    const recommendation = await getDoc(`appraisals/${appraisal.appraisalId}/confidential/recommendation`)
    check('confidential recommendation populated', Boolean(recommendation?.recommendation))
    check('recommendation text never says "Issue SP1"', !/issue sp1/i.test(recommendation?.recommendation ?? ''))

    // Self-exclusion (§2.6) isn't reachable here without linking hrManager's
    // account as the appraisal subject — this confirms the non-subject happy
    // path works; getAppraisalRecommendation.ts's own self-check is what the
    // Function-side half of that acceptance criterion relies on.
    const recommendationViaCallable = await call(hrManager.idToken, 'getAppraisalRecommendation', { appraisalId: appraisal.appraisalId })
    check('getAppraisalRecommendation works for a non-subject HR Manager', Boolean(recommendationViaCallable?.recommendation))

    if (afterApproval.consequenceTaskId) {
      const task = await getDoc(`tasks/${afterApproval.consequenceTaskId}`)
      check(
        'task wording is the fixed §9 text, routed to HR Manager (dualScorer)',
        task?.title === 'Review and determine whether formal action is warranted.' && task?.assignedTo?.includes(hrManager.uid),
        JSON.stringify(task),
      )
    }
  } else {
    check('finalScore >= 60 — no consequence expected, consequenceTaskId is null', afterApproval.consequenceTaskId === null)
  }

  console.log('\nAcknowledgement (device operator path — no users.employeeId link for the cook, so self-ack never fires, as designed)')
  await call(superAdmin.idToken, 'acknowledgeAppraisal', {
    appraisalId: appraisal.appraisalId,
    signatureFileId: 'test-signature-file-id',
  })
  const afterAck = await getDoc(`appraisals/${appraisal.appraisalId}`)
  check(
    'status completed, acknowledgement recorded as onDeviceSignature with a device operator, not a verified subject identity',
    afterAck?.status === 'completed' && afterAck?.acknowledgement?.method === 'onDeviceSignature' && Boolean(afterAck?.acknowledgement?.deviceOperatorUid),
    JSON.stringify(afterAck?.acknowledgement),
  )

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exitCode = fail > 0 ? 1 : 0
}

main().catch((error) => {
  console.error(`\nAborted: ${error.message}`)
  process.exitCode = 1
})
