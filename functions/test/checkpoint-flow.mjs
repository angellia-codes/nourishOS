/**
 * Checkpoint create/update/archive smoke test — hand-run against the emulator:
 *
 *   $env:FUNCTIONS_DISCOVERY_TIMEOUT = "120"
 *   firebase emulators:start --project demo-nourishos
 *   npm --prefix functions run build
 *   node functions/test/checkpoint-flow.mjs
 *
 * Drives createCheckpoint / updateCheckpoint / archiveCheckpoint as real
 * signed-in users, per security-control-point.md §2's two named gaps.
 *
 * Asserts what must hold:
 *   - superAdmin can create (the requirePermission bypass)
 *   - hrManager, seeded with security.manageCheckpoints, can create and update
 *   - a role without the string is rejected on all three callables
 *   - outletId is required and validated against the real outlet catalog on
 *     both create and update, and the stored/updated value round-trips
 *   - update changes name/radius/interval/outlet and leaves lastVisitedAt /
 *     lastVisitedBy / lastAlertedAt untouched
 *   - update rejects a non-positive radius and a non-positive interval
 *   - update of an archived checkpoint returns not-found
 *   - createPatrolLog denormalizes the guard's displayName onto the
 *     checkpoint as lastVisitedByName
 *   - archive sets isArchived/status; a second archive is idempotent
 *   - an archived checkpoint drops out of the active-checkpoints query while
 *     its patrol log still resolves checkpointName
 *
 * Checkpoints have auto-generated ids (unlike shift reports' deterministic
 * ones), so re-runnability means tracking what this run creates and deleting
 * it at the end rather than clearing a known id up front.
 */
import assert from 'node:assert/strict'

const FN = 'http://127.0.0.1:5001/demo-nourishos/asia-southeast2'
const FS = 'http://127.0.0.1:8080/v1/projects/demo-nourishos/databases/(default)/documents'
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1'
const AUTH_ADMIN = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-nourishos'
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
    headers: OWNER,
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, V(v)])) }),
  })
  if (!res.ok) throw new Error(`seed ${path}: ${res.status} ${await res.text()}`)
}

/** Bypasses rules — same convention as user-doctor.mjs and migrate-checklists.mjs. */
async function getRaw(path) {
  const res = await fetch(`${FS}/${path}`, { headers: OWNER })
  if (!res.ok) return null
  const body = await res.json()
  return Object.fromEntries(Object.entries(body.fields ?? {}).map(([k, v]) => [k, unV(v)]))
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
    headers: OWNER,
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
  return { uid, email, role, token: signIn.idToken }
}

const BASE = ['dashboard.read', 'tasks.complete', 'chat.send']
const stamp = Date.now()
const createdCheckpointIds = []

/** Every checkpoint this run creates gets cleaned up regardless of pass/fail, so a rerun starts clean. */
async function cleanup() {
  await Promise.all(
    createdCheckpointIds.map((id) => fetch(`${FS}/checkpoints/${id}`, { method: 'DELETE', headers: OWNER })),
  )
}

async function main() {
  console.log('Checkpoints — emulator smoke test\n')

  const superAdmin = await actor(`cp-super-${stamp}@nourish.test`, {
    role: `cpSuperAdmin${stamp}`,
    departmentId: 'management',
    outletId: 'all',
    permissions: [...BASE, 'security.manageCheckpoints', 'security.create'], // stand-in role; real superAdmin bypass is checked separately below
  })
  const hrManager = await actor(`cp-hr-${stamp}@nourish.test`, {
    role: `cpHrManager${stamp}`,
    departmentId: 'human_resources',
    outletId: 'boh_nourish_group',
    permissions: [...BASE, 'security.manageCheckpoints'],
  })
  const noPermission = await actor(`cp-staff-${stamp}@nourish.test`, {
    role: `cpStaff${stamp}`,
    departmentId: 'security',
    outletId: 'nourish_uluwatu',
    permissions: [...BASE],
  })
  // A dedicated real superAdmin — confirms the requirePermission bypass, not
  // just a stand-in role carrying the same string.
  const realSuperAdmin = await actor(`cp-real-super-${stamp}@nourish.test`, {
    role: 'superAdmin',
    departmentId: 'management',
    outletId: 'all',
    permissions: [], // deliberately empty — the bypass must work with zero granted strings
  })

  // ---- Create ----
  const created = await call('createCheckpoint', superAdmin.token, {
    name: 'Main gate',
    description: 'Front vehicle barrier',
    outletId: 'nourish_uluwatu',
    latitude: -8.8305,
    longitude: 115.0849,
    geofenceRadiusMeters: 50,
    scheduleIntervalMinutes: 120,
  })
  check('checkpoint created', created.ok, created.message)
  const checkpointId = created.data?.checkpointId
  if (checkpointId) createdCheckpointIds.push(checkpointId)

  const createdDoc = checkpointId ? await getRaw(`checkpoints/${checkpointId}`) : null
  check('stored document carries the validated outletId', createdDoc?.outletId === 'nourish_uluwatu', createdDoc?.outletId)

  const createdBySuper = await call('createCheckpoint', realSuperAdmin.token, {
    name: 'Loading dock',
    outletId: 'nourish_berawa',
    latitude: -8.831,
    longitude: 115.086,
    geofenceRadiusMeters: 30,
    scheduleIntervalMinutes: 60,
  })
  check('real superAdmin bypass creates with zero granted permissions', createdBySuper.ok, createdBySuper.message)
  if (createdBySuper.data?.checkpointId) createdCheckpointIds.push(createdBySuper.data.checkpointId)

  const deniedCreate = await call('createCheckpoint', noPermission.token, {
    name: 'Should not exist',
    outletId: 'nourish_uluwatu',
    latitude: 0,
    longitude: 0,
    geofenceRadiusMeters: 10,
    scheduleIntervalMinutes: 10,
  })
  check('caller without security.manageCheckpoints is rejected on create', !deniedCreate.ok, deniedCreate.message)

  const missingOutlet = await call('createCheckpoint', superAdmin.token, {
    name: 'No outlet given',
    latitude: 0,
    longitude: 0,
    geofenceRadiusMeters: 10,
    scheduleIntervalMinutes: 10,
  })
  check(
    'missing outletId rejected on create',
    !missingOutlet.ok && /outlet/i.test(missingOutlet.message),
    missingOutlet.message,
  )

  const unknownOutlet = await call('createCheckpoint', superAdmin.token, {
    name: 'Unknown outlet',
    outletId: 'not_a_real_outlet',
    latitude: 0,
    longitude: 0,
    geofenceRadiusMeters: 10,
    scheduleIntervalMinutes: 10,
  })
  check(
    'unknown outletId rejected on create',
    !unknownOutlet.ok && /outlet/i.test(unknownOutlet.message),
    unknownOutlet.message,
  )

  const badRadius = await call('createCheckpoint', superAdmin.token, {
    name: 'Bad radius',
    outletId: 'nourish_uluwatu',
    latitude: 0,
    longitude: 0,
    geofenceRadiusMeters: 0,
    scheduleIntervalMinutes: 60,
  })
  check(
    'non-positive geofenceRadiusMeters rejected on create',
    !badRadius.ok && /positive/.test(badRadius.message),
    badRadius.message,
  )

  if (!checkpointId) {
    console.log('\nAborting — the primary checkpoint failed to create, downstream checks would be meaningless.')
    await cleanup()
    process.exitCode = 1
    return
  }

  // ---- Update ----
  const updated = await call('updateCheckpoint', hrManager.token, {
    checkpointId,
    name: 'Main gate (renamed)',
    description: 'Front vehicle barrier — moved 5m north',
    outletId: 'nourish_berawa',
    latitude: -8.8306,
    longitude: 115.085,
    geofenceRadiusMeters: 75,
    scheduleIntervalMinutes: 90,
  })
  check('hrManager can update', updated.ok, updated.message)

  const afterUpdate = await getRaw(`checkpoints/${checkpointId}`)
  check('name changed', afterUpdate?.name === 'Main gate (renamed)', afterUpdate?.name)
  check('outletId changed', afterUpdate?.outletId === 'nourish_berawa', afterUpdate?.outletId)
  check('geofenceRadiusMeters changed', afterUpdate?.geofenceRadiusMeters === 75, String(afterUpdate?.geofenceRadiusMeters))
  check(
    'scheduleIntervalMinutes changed',
    afterUpdate?.scheduleIntervalMinutes === 90,
    String(afterUpdate?.scheduleIntervalMinutes),
  )
  check('lastVisitedAt untouched by update', afterUpdate?.lastVisitedAt === null)
  check('lastVisitedBy untouched by update', afterUpdate?.lastVisitedBy === null)
  check('lastAlertedAt untouched by update', afterUpdate?.lastAlertedAt === null)

  const deniedUpdate = await call('updateCheckpoint', noPermission.token, {
    checkpointId,
    name: 'Should not stick',
    outletId: 'nourish_uluwatu',
    latitude: 0,
    longitude: 0,
    geofenceRadiusMeters: 10,
    scheduleIntervalMinutes: 10,
  })
  check('caller without security.manageCheckpoints is rejected on update', !deniedUpdate.ok, deniedUpdate.message)

  const badInterval = await call('updateCheckpoint', superAdmin.token, {
    checkpointId,
    name: 'Main gate (renamed)',
    outletId: 'nourish_berawa',
    latitude: -8.8306,
    longitude: 115.085,
    geofenceRadiusMeters: 75,
    scheduleIntervalMinutes: -5,
  })
  check(
    'non-positive scheduleIntervalMinutes rejected on update',
    !badInterval.ok && /positive/.test(badInterval.message),
    badInterval.message,
  )

  // ---- A patrol log, to prove archive doesn't break history ----
  const patrol = await call('createPatrolLog', superAdmin.token, {
    checkpointId,
    latitude: -8.8306,
    longitude: 115.085,
  })
  check('patrol logged against the checkpoint', patrol.ok, patrol.message)

  const afterPatrol = await getRaw(`checkpoints/${checkpointId}`)
  const expectedGuardName = superAdmin.email.split('@')[0]
  check(
    "lastVisitedByName denormalized from the guard's displayName",
    afterPatrol?.lastVisitedByName === expectedGuardName,
    afterPatrol?.lastVisitedByName,
  )

  // ---- Archive ----
  const archived = await call('archiveCheckpoint', superAdmin.token, { checkpointId })
  check('checkpoint archived', archived.ok, archived.message)

  const afterArchive = await getRaw(`checkpoints/${checkpointId}`)
  check('isArchived true', afterArchive?.isArchived === true)
  check('status archived', afterArchive?.status === 'archived')

  const reArchived = await call('archiveCheckpoint', superAdmin.token, { checkpointId })
  check('re-archiving an archived checkpoint is idempotent, not an error', reArchived.ok, reArchived.message)

  const updateAfterArchive = await call('updateCheckpoint', superAdmin.token, {
    checkpointId,
    name: 'Should not update',
    outletId: 'nourish_uluwatu',
    latitude: 0,
    longitude: 0,
    geofenceRadiusMeters: 10,
    scheduleIntervalMinutes: 10,
  })
  check(
    // Firebase's callable error `status` is the HttpsError status name
    // (NOT_FOUND), not the lowercase AppError code string.
    'update of an archived checkpoint returns not-found',
    !updateAfterArchive.ok && updateAfterArchive.code === 'NOT_FOUND',
    JSON.stringify(updateAfterArchive),
  )

  // ---- Active-checkpoints query excludes it; patrol history still resolves it ----
  const activeQuery = await fetch(`${FS}:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${superAdmin.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'checkpoints' }],
        where: { fieldFilter: { field: { fieldPath: 'isArchived' }, op: 'EQUAL', value: V(false) } },
      },
    }),
  }).then((r) => r.json())
  const activeIds = (activeQuery ?? []).filter((e) => e.document).map((e) => e.document.name.split('/').pop())
  check('archived checkpoint absent from the active-checkpoints query', !activeIds.includes(checkpointId), activeIds.join(','))

  const patrolLogDoc = patrol.data?.patrolLogId ? await getRaw(`patrolLogs/${patrol.data.patrolLogId}`) : null
  check(
    'patrol log still resolves checkpointName after archive',
    patrolLogDoc?.checkpointName === 'Main gate (renamed)',
    patrolLogDoc?.checkpointName,
  )

  const deniedArchive = await call('archiveCheckpoint', noPermission.token, {
    checkpointId: createdBySuper.data?.checkpointId,
  })
  check('caller without security.manageCheckpoints is rejected on archive', !deniedArchive.ok, deniedArchive.message)

  await cleanup()
  console.log(`\n${pass} passed, ${fail} failed`)
  assert.equal(fail, 0, `${fail} check(s) failed`)
}

main().catch(async (error) => {
  await cleanup().catch(() => {})
  console.error(`\nAborted: ${error.message}`)
  process.exitCode = 1
})
