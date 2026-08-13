// End-to-end smoke test of the Operations callables against the emulator suite.
// There is no test runner in this repo (CLAUDE.md) — this is an ad-hoc script
// you run by hand against a running emulator suite. See test/README.md.
//
//   node functions/test/emulator-callables.mjs
//
// Requires: the emulator suite up (auth + functions + firestore) and the
// functions built (npm --prefix functions run build). Node 18+ for global fetch.
import { createRequire } from 'module'
const require = createRequire(import.meta.url) // resolves firebase-admin from functions/node_modules
const admin = require('firebase-admin')

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
const PROJECT = 'demo-nourishos'
const REGION = 'asia-southeast2'
const FN = (name) => `http://127.0.0.1:5001/${PROJECT}/${REGION}/${name}`

admin.initializeApp({ projectId: PROJECT })
const db = admin.firestore()

// Unique per run so re-runs don't collide with persisted emulator auth users
// or the once-per-outlet+department+day daily-report guard.
const RUN = Date.now()
const OUTLET = `outlet-${RUN}`

let pass = 0
let fail = 0
function check(label, cond, detail = '') {
  if (cond) {
    console.log(`  ✓ ${label}`)
    pass++
  } else {
    console.log(`  ✗ ${label} ${detail}`)
    fail++
  }
}

async function signUp(email) {
  const res = await fetch(
    `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123', returnSecureToken: true }),
    },
  )
  const json = await res.json()
  if (!json.idToken) throw new Error('signUp failed: ' + JSON.stringify(json))
  return { idToken: json.idToken, uid: json.localId }
}

async function callFn(name, data, idToken) {
  const res = await fetch(FN(name), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ data }),
  })
  const json = await res.json()
  return { status: res.status, json }
}

async function main() {
  // ---- Seed role + user (outlet manager with all Operations permissions) ----
  await db.collection('roles').doc('outletManager').set({
    permissions: [
      'lostFound.create',
      'lostFound.manage',
      'incidents.create',
      'incidents.manage',
      'dailyUpdates.submit',
    ],
  })

  const mgr = await signUp(`manager-${RUN}@test.local`)
  await db.collection('users').doc(mgr.uid).set({
    status: 'active',
    roleId: 'outletManager',
    displayName: 'Test Manager',
    email: `manager-${RUN}@test.local`,
    outletId: OUTLET,
    departmentId: 'fnb',
  })

  // An engineering user so incident routing to 'engineering' has a real assignee.
  await db.collection('roles').doc('engineering').set({ permissions: ['incidents.manage'] })
  const eng = await signUp(`eng-${RUN}@test.local`)
  await db.collection('users').doc(eng.uid).set({
    status: 'active',
    roleId: 'engineering',
    displayName: 'Test Engineer',
    email: `eng-${RUN}@test.local`,
    outletId: OUTLET,
    departmentId: 'engineering',
  })

  console.log('\n=== Lost & Found ===')
  const lf = await callFn(
    'createLostFoundItem',
    {
      itemDescription: 'Blue backpack with laptop',
      category: 'bag',
      valueTier: 'high',
      foundLocation: 'Table 5',
      foundAt: '2026-07-18',
      storageLocation: "Manager's safe",
    },
    mgr.idToken,
  )
  check('createLostFoundItem returns 200', lf.status === 200, JSON.stringify(lf.json))
  const itemId = lf.json?.result?.data?.itemId
  const itemNumber = lf.json?.result?.data?.itemNumber
  check('itemNumber allocated (LF-YYYY-####)', /^LF-\d{4}-\d{4}$/.test(itemNumber || ''), itemNumber)
  const itemDoc = itemId ? (await db.collection('lostFoundItems').doc(itemId).get()).data() : null
  check('lostFoundItems doc written with status=logged', itemDoc?.status === 'logged')
  check('retentionExpiresAt = foundAt + 30d (bag)', itemDoc?.retentionExpiresAt === '2026-08-17', itemDoc?.retentionExpiresAt)

  // Claim it (medium/high requires idVerified)
  const claimNoId = await callFn(
    'claimLostFoundItem',
    { itemId, claimantName: 'Jane', claimantPhone: '0811', identifyingDetailsGiven: 'blue bag', idVerified: false },
    mgr.idToken,
  )
  check('claim without idVerified rejected for high-value', claimNoId.status !== 200, JSON.stringify(claimNoId.json))
  const claimOk = await callFn(
    'claimLostFoundItem',
    { itemId, claimantName: 'Jane', claimantPhone: '0811', identifyingDetailsGiven: 'blue bag', idVerified: true },
    mgr.idToken,
  )
  check('claim with idVerified returns 200', claimOk.status === 200, JSON.stringify(claimOk.json))
  const claimed = (await db.collection('lostFoundItems').doc(itemId).get()).data()
  check('item status -> returned', claimed?.status === 'returned')

  console.log('\n=== Incident Reports ===')
  const inc = await callFn(
    'createIncidentReport',
    {
      title: 'Walk-in chiller failure',
      description: 'Compressor not cycling',
      incidentType: 'equipmentFailure',
      severity: 'critical',
      location: 'Kitchen',
      occurredAt: '2026-07-18T06:30',
      immediateActionTaken: 'Moved stock to backup',
    },
    mgr.idToken,
  )
  check('createIncidentReport returns 200', inc.status === 200, JSON.stringify(inc.json))
  const incidentId = inc.json?.result?.data?.incidentId
  const incData = incidentId ? (await db.collection('incidentReports').doc(incidentId).get()).data() : null
  check('incidentNumber allocated (INC-YYYY-####)', /^INC-\d{4}-\d{4}$/.test(inc.json?.result?.data?.incidentNumber || ''))
  check('routed to engineering (assignedToRole)', incData?.assignedToRole === 'engineering', incData?.assignedToRole)
  check('equipmentFailure auto-created linked work order', !!inc.json?.result?.data?.linkedWorkOrderId)
  const woId = inc.json?.result?.data?.linkedWorkOrderId
  const wo = woId ? (await db.collection('workOrders').doc(woId).get()).data() : null
  check('workOrders doc exists with sourceIncidentId', wo?.sourceIncidentId === incidentId)
  check('investigation task created (assigned to engineer)', !!incData?.investigationTaskId)
  const invTask = incData?.investigationTaskId ? (await db.collection('tasks').doc(incData.investigationTaskId).get()).data() : null
  check("investigation task tagged ['incident']", Array.isArray(invTask?.tags) && invTask.tags.includes('incident'), JSON.stringify(invTask?.tags))
  check('investigation task assigned to engineer uid', Array.isArray(invTask?.assignedTo) && invTask.assignedTo.includes(eng.uid))

  // Status transition: reported -> underReview (manager has incidents.manage)
  const badResolve = await callFn('updateIncidentStatus', { incidentId, status: 'resolved' }, mgr.idToken)
  check('cannot jump reported -> resolved', badResolve.status !== 200, JSON.stringify(badResolve.json))
  const step1 = await callFn('updateIncidentStatus', { incidentId, status: 'underReview' }, mgr.idToken)
  check('reported -> underReview returns 200', step1.status === 200, JSON.stringify(step1.json))

  console.log('\n=== Daily Updates ===')
  // Seed an open dailyUpdate task assigned to the manager, to exercise the
  // carried-forward blocking rule.
  const openTask = await db.collection('tasks').add({
    title: 'Fix wobbly chair',
    taskType: 'custom',
    sourceModule: 'dailyReports',
    assignedTo: [mgr.uid],
    assignedBy: mgr.uid,
    priority: 'medium',
    taskStatus: 'assigned',
    tags: ['dailyUpdate'],
    daysOpen: 4,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: mgr.uid,
    updatedBy: mgr.uid,
    status: 'active',
    isArchived: false,
  })

  const blocked = await callFn(
    'submitDailyReport',
    { staffScheduled: 10, staffPresent: 10 },
    mgr.idToken,
  )
  check(
    'submit blocked (failed-precondition, not a crash) while carried-forward task unreviewed',
    blocked.status !== 200 && /reviewed|carried-forward/i.test(blocked.json?.error?.message || ''),
    JSON.stringify(blocked.json),
  )
  check('carried-forward task IS found via tag+assignee filter (regression: no double array-contains crash)', blocked.json?.error?.status !== 'INTERNAL', JSON.stringify(blocked.json))

  const submitted = await callFn(
    'submitDailyReport',
    {
      staffScheduled: 10,
      staffPresent: 10,
      carriedForwardReviews: [{ taskId: openTask.id, status: 'completed', comment: 'done' }],
      challenges: [{ description: 'Late delivery', category: 'supplier', severity: 'high', requiresFollowUp: true }],
      newTasks: [{ title: 'Order more milk', assignedTo: mgr.uid, priority: 'high' }],
    },
    mgr.idToken,
  )
  check('submitDailyReport returns 200 after review', submitted.status === 200, JSON.stringify(submitted.json))
  const reportId = submitted.json?.result?.data?.reportId
  const report = reportId ? (await db.collection('dailyReports').doc(reportId).get()).data() : null
  check('dailyReports doc written (status=submitted)', report?.status === 'submitted')
  check('carried-forward task status updated to completed', (await db.collection('tasks').doc(openTask.id).get()).data()?.taskStatus === 'completed')
  check('new task created from Section F', Array.isArray(report?.newTaskIds) && report.newTaskIds.length === 1)
  check('follow-up task created for flagged challenge', report?.challenges?.[0]?.taskId != null)

  // Duplicate submission same day is blocked
  const dup = await callFn(
    'submitDailyReport',
    { staffScheduled: 10, staffPresent: 10, carriedForwardReviews: [] },
    mgr.idToken,
  )
  check('duplicate same-day submission blocked', dup.status !== 200, JSON.stringify(dup.json))

  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
