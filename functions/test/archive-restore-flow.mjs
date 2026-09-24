/**
 * Archive / restore smoke test for positions and appraisal templates
 * (2026-09-24) — hand-run against the emulator, same tier and helpers as
 * appraisal-v2-flow.mjs:
 *
 *   firebase emulators:start --project demo-nourishos
 *   npm --prefix functions run build
 *   node functions/test/archive-restore-flow.mjs
 *
 * Seeds one HR Manager account, two positions and three templates directly,
 * then walks archive -> view -> restore, including the pendingGm blocks and
 * "restoring a template under an archived position is refused".
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
    description: 'Seeded for archive-restore-flow test.',
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

async function expectError(label, promise, fragment) {
  try {
    await promise
    check(label, false, 'expected an error, got success')
  } catch (error) {
    check(label, error.message.includes(fragment), error.message)
  }
}

const now = new Date().toISOString()
const base = { createdAt: now, createdBy: 'seed', updatedAt: now, updatedBy: 'seed', isArchived: false }
const template = (positionId, version, templateStatus) => ({
  ...base,
  positionId,
  version,
  templateStatus,
  scoringModelVersion: 2,
  criteria: [{ criterionId: 'c1', order: 0 }],
})

const hr = await seedAccount({
  role: 'hrManager',
  email: 'hr-archive@example.test',
  outlet: 'boh_nourish_group',
  department: 'human_resources',
  name: 'HR Archive Tester',
})

await seedDoc('positions/archTestA', { ...base, positionId: 'archTestA', isActive: true, title: { en: 'Archive Test A', id: 'A' } })
await seedDoc('positions/archTestB', { ...base, positionId: 'archTestB', isActive: true, title: { en: 'Archive Test B', id: 'B' } })
await seedDoc('appraisalTemplates/archA-approved', template('archTestA', 1, 'approved'))
await seedDoc('appraisalTemplates/archA-draft', template('archTestA', 2, 'draft'))
await seedDoc('appraisalTemplates/archB-pending', template('archTestB', 1, 'pendingGm'))

console.log('pendingGm blocks')
await expectError('a pendingGm template cannot be archived', call(hr.idToken, 'archiveAppraisalTemplate', { templateId: 'archB-pending' }), 'waiting for the GM')
await expectError('a position with a pendingGm template cannot be archived', call(hr.idToken, 'archivePosition', { positionId: 'archTestB' }), 'waiting for the GM')

console.log('archive a position')
await call(hr.idToken, 'archivePosition', { positionId: 'archTestA' })
check('position is archived', (await getDoc('positions/archTestA'))?.isActive === false)
const approvedAfter = await getDoc('appraisalTemplates/archA-approved')
const draftAfter = await getDoc('appraisalTemplates/archA-draft')
check('its approved template is archived, remembering "approved"', approvedAfter?.templateStatus === 'archived' && approvedAfter?.archivedFromStatus === 'approved')
check('its draft template is archived, remembering "draft"', draftAfter?.templateStatus === 'archived' && draftAfter?.archivedFromStatus === 'draft')

console.log('restore order')
await expectError('a template under an archived position cannot be restored', call(hr.idToken, 'restoreAppraisalTemplate', { templateId: 'archA-approved' }), 'Restore the position first')
await call(hr.idToken, 'restorePosition', { positionId: 'archTestA' })
check('position is active again', (await getDoc('positions/archTestA'))?.isActive === true)
check('its templates stay archived', (await getDoc('appraisalTemplates/archA-approved'))?.templateStatus === 'archived')
const restored = await call(hr.idToken, 'restoreAppraisalTemplate', { templateId: 'archA-approved' })
check('restoring the template returns "approved"', restored?.templateStatus === 'approved', JSON.stringify(restored))
const approvedBack = await getDoc('appraisalTemplates/archA-approved')
check('it is approved again with the archive fields cleared', approvedBack?.templateStatus === 'approved' && approvedBack?.archivedFromStatus === undefined)

console.log('archive / restore a single live template')
await call(hr.idToken, 'archiveAppraisalTemplate', { templateId: 'archA-approved' })
check('archived', (await getDoc('appraisalTemplates/archA-approved'))?.templateStatus === 'archived')
await expectError('archiving it twice is refused', call(hr.idToken, 'archiveAppraisalTemplate', { templateId: 'archA-approved' }), 'already archived')
await call(hr.idToken, 'restoreAppraisalTemplate', { templateId: 'archA-approved' })
check('restored to approved', (await getDoc('appraisalTemplates/archA-approved'))?.templateStatus === 'approved')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail > 0 ? 1 : 0)
