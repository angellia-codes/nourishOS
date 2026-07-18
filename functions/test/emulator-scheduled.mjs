// Exercises the Operations onSchedule functions against the emulator suite.
//
//   node functions/test/emulator-scheduled.mjs
//
// NOTE: the Functions emulator on Windows does NOT deliver pull-subscription
// pub/sub messages to background handlers (the message is consumed/acked but
// the handler never runs — `connect ENOENT \\?\pipe\fire_emu_…`). So rather
// than publishing to `firebase-schedule-*` topics, this invokes the REAL
// shipped handlers via firebase-functions v2 `.run()` against the live
// Firestore emulator. Same handler code the scheduler would run — only
// Firebase's pub/sub->handler delivery is bypassed. See test/README.md.
//
// Requires: emulator suite up (firestore) and functions built
// (npm --prefix functions run build). Node 18+.
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
process.env.GCLOUD_PROJECT = 'demo-nourishos'

// Requiring the compiled lib initializes the admin app (guarded) against the
// emulator via the env vars above.
const admin = require('firebase-admin')
const { db } = require('../lib/lib/admin.js')
const FieldValue = admin.firestore.FieldValue

const { carryForwardDailyTasks } = require('../lib/operations/dailyUpdates/carryForwardDailyTasks.js')
const { checkDailyTaskEscalations } = require('../lib/operations/dailyUpdates/checkDailyTaskEscalations.js')
const { sendComplianceAlerts } = require('../lib/operations/dailyUpdates/sendComplianceAlerts.js')
const { sendDailyDigest } = require('../lib/operations/dailyUpdates/sendDailyDigest.js')
const { checkLostFoundRetention } = require('../lib/operations/lostFound/checkLostFoundRetention.js')

const RUN = Date.now()
let pass = 0, fail = 0
const check = (label, cond, detail = '') => {
  if (cond) { console.log(`  ✓ ${label}`); pass++ } else { console.log(`  ✗ ${label} ${detail}`); fail++ }
}

// v2 scheduled functions expose .run(); the handlers ignore the event arg.
async function trigger(fn) {
  if (typeof fn?.run === 'function') return fn.run({ scheduleTime: new Date().toISOString() })
  return fn({ scheduleTime: new Date().toISOString() }) // fallback
}

const isoOffset = (days) => {
  const d = new Date(); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10)
}
const notifsFor = async (uid) =>
  (await db.collection('notifications').where('recipientUid', '==', uid).get()).docs.map((d) => d.data())

async function main() {
  const users = { gm: `gm-${RUN}`, hr: `hr-${RUN}`, om: `om-${RUN}`, kl: `kl-${RUN}` }
  await db.collection('users').doc(users.gm).set({ status: 'active', roleId: 'generalManager', displayName: 'GM', outletId: `o-gm-${RUN}`, departmentId: 'management' })
  await db.collection('users').doc(users.hr).set({ status: 'active', roleId: 'hrManager', displayName: 'HR', outletId: `o-hr-${RUN}`, departmentId: 'hr' })
  await db.collection('users').doc(users.om).set({ status: 'active', roleId: 'outletManager', displayName: 'OM', outletId: `o-om-${RUN}`, departmentId: 'fnb' })
  await db.collection('users').doc(users.kl).set({ status: 'active', roleId: 'kitchenLeader', displayName: 'KL', outletId: `o-kl-${RUN}`, departmentId: 'kitchen' })

  // ---------- carryForwardDailyTasks ----------
  console.log('\n=== carryForwardDailyTasks (00:01) ===')
  const base = { assignedBy: users.om, taskType: 'custom', sourceModule: 'dailyReports', status: 'active', isArchived: false, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }
  const taskA = await db.collection('tasks').add({ title: `A-${RUN}`, tags: ['dailyUpdate'], taskStatus: 'assigned', daysOpen: 4, assignedTo: [users.om], priority: 'medium', ...base })
  const taskClosed = await db.collection('tasks').add({ title: `C-${RUN}`, tags: ['dailyUpdate'], taskStatus: 'completed', daysOpen: 10, assignedTo: [users.om], priority: 'low', ...base })
  const taskB = await db.collection('tasks').add({ title: `B-${RUN}`, tags: ['dailyUpdate'], taskStatus: 'assigned', daysOpen: 5, escalationLevel: 2, assignedTo: [users.om], priority: 'high', ...base })

  await trigger(carryForwardDailyTasks)
  check('open dailyUpdate task daysOpen 4 -> 5', (await taskA.get()).data().daysOpen === 5, `daysOpen=${(await taskA.get()).data().daysOpen}`)
  check('closed dailyUpdate task NOT incremented (stays 10)', (await taskClosed.get()).data().daysOpen === 10)
  check('escalation task also carried forward 5 -> 6', (await taskB.get()).data().daysOpen === 6)

  // ---------- checkDailyTaskEscalations ----------
  console.log('\n=== checkDailyTaskEscalations (07:00) ===')
  await trigger(checkDailyTaskEscalations)
  check('task at D+6/level2 escalates to level 3', (await taskB.get()).data().escalationLevel === 3, `level=${(await taskB.get()).data().escalationLevel}`)
  const gmNotifs = await notifsFor(users.gm)
  check('GM notified with a Level 3 escalation', gmNotifs.some((n) => /Level 3/.test(n.title || '')), JSON.stringify(gmNotifs.map((n) => n.title)))
  check('taskA escalates to level 1', (await taskA.get()).data().escalationLevel === 1, `level=${(await taskA.get()).data().escalationLevel}`)

  // ---------- checkLostFoundRetention ----------
  console.log('\n=== checkLostFoundRetention (09:00) ===')
  const lfBase = { retentionWarnedAt: null, outletId: `o-om-${RUN}`, isArchived: false, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }
  const itemPast = await db.collection('lostFoundItems').add({ itemNumber: `LF-${RUN}-p`, itemDescription: 'past', status: 'logged', retentionExpiresAt: isoOffset(-1), ...lfBase })
  const itemFar = await db.collection('lostFoundItems').add({ itemNumber: `LF-${RUN}-f`, itemDescription: 'far', status: 'logged', retentionExpiresAt: isoOffset(30), ...lfBase })
  await trigger(checkLostFoundRetention)
  const past = (await itemPast.get()).data()
  check('past-due item warned (retentionWarnedAt set)', past.retentionWarnedAt != null)
  check('past-due logged item flipped to unclaimed', past.status === 'unclaimed', past.status)
  check('far-off item untouched', (await itemFar.get()).data().retentionWarnedAt == null)
  const omNotifs = await notifsFor(users.om)
  check('outlet manager notified about retention', omNotifs.some((n) => /Retention|Nearing Disposal/i.test(n.title || '')), JSON.stringify(omNotifs.map((n) => n.title)))

  // ---------- sendComplianceAlerts ----------
  console.log('\n=== sendComplianceAlerts (17:00) ===')
  await trigger(sendComplianceAlerts)
  const klNotifs = await notifsFor(users.kl)
  check('leader with no report today gets compliance alert', klNotifs.some((n) => /Not Submitted/i.test(n.title || '')), JSON.stringify(klNotifs.map((n) => n.title)))

  // ---------- sendDailyDigest ----------
  console.log('\n=== sendDailyDigest (08:00) ===')
  await trigger(sendDailyDigest)
  check('GM receives daily digest', (await notifsFor(users.gm)).some((n) => /Daily Operations Digest/.test(n.title || '')))
  check('HR manager receives daily digest', (await notifsFor(users.hr)).some((n) => /Daily Operations Digest/.test(n.title || '')))

  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((err) => { console.error('FATAL', err); process.exit(1) })
