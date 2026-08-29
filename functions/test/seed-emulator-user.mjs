/**
 * Seed one sign-in-able account into the Auth + Firestore emulators — hand-run:
 *
 *   firebase emulators:start --project demo-nourishos
 *   npm --prefix functions run build      # this reads the compiled ROLE_PERMISSIONS
 *   node functions/test/seed-emulator-user.mjs
 *   node functions/test/seed-emulator-user.mjs --role hrManager --outlet boh_nourish_group --department human_resources
 *
 * The emulator's Firestore starts empty, so `npm run dev:emulator` gives you an
 * app you cannot sign into. This is the missing step.
 *
 * Two things make it less obvious than it looks:
 *
 *   1. The app's only sign-in path is signInWithPopup + GoogleAuthProvider
 *      (src/hooks/useAuth.ts), and the Auth emulator's account chooser lists
 *      ONLY google.com-provider accounts. An account created the usual way with
 *      accounts:signUp is a password-provider account and is invisible to the
 *      popup — so this uses accounts:signInWithIdp with a deterministic `sub`,
 *      which also means re-running reuses the same uid instead of piling up
 *      duplicates.
 *
 *   2. firestore.rules reads {role, departmentId, outletId} off the ID token,
 *      not off the user document, so the custom claims have to be set too —
 *      seeding users/{uid} alone leaves every read denied.
 *
 * Permissions come from the compiled ROLE_PERMISSIONS rather than a list copied
 * into this file, so a seeded role can never drift from what the callables
 * actually enforce. That is also why the build has to run first.
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

/**
 * superAdmin is absent from ROLE_PERMISSIONS by design (it is seeded once during
 * bootstrap, and re-deriving it risks silently narrowing the one account that
 * can fix everything else), but it is exactly the account you want when walking
 * the whole app: it bypasses requirePermission server-side, AuthProvider grants
 * it every permission client-side, and firestore.rules includes it everywhere.
 * So it is special-cased here, filled from the server's PERMISSIONS mirror —
 * which is a subset of the client's list, and only ever read for display, since
 * nothing actually enforces against this document.
 */
function permissionsFor(roleId) {
  return roleId === 'superAdmin' ? Object.values(PERMISSIONS) : ROLE_PERMISSIONS[roleId]
}

const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1'
const AUTH_ADMIN = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-nourishos'
const FIRESTORE = 'http://127.0.0.1:8080/v1/projects/demo-nourishos/databases/(default)/documents'
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }

function parseArgs(argv) {
  const args = {
    email: 'manager@nourish.test',
    role: 'restaurantManager',
    outlet: 'nourish_uluwatu',
    department: 'fb_service',
    name: null,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--email') args.email = argv[++i]
    else if (arg === '--role') args.role = argv[++i]
    else if (arg === '--outlet') args.outlet = argv[++i]
    else if (arg === '--department') args.department = argv[++i]
    else if (arg === '--name') args.name = argv[++i]
    else {
      console.error(`Unknown argument: ${arg}`)
      console.error('Usage: --email <e> --role <roleId> --outlet <outletId> --department <departmentId> --name <display>')
      process.exit(2)
    }
  }
  args.name = args.name ?? `${args.role} (emulator)`
  return args
}

const args = parseArgs(process.argv.slice(2))

if (!permissionsFor(args.role)) {
  console.error(`Unknown role "${args.role}". Known roles: ${['superAdmin', ...Object.keys(ROLE_PERMISSIONS)].sort().join(', ')}`)
  process.exit(2)
}

const V = (v) => {
  if (v === null) return { nullValue: null }
  if (typeof v === 'string') return { stringValue: v }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(V) } }
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, V(x)])) } }
}

async function seed(docPath, data) {
  const res = await fetch(`${FIRESTORE}/${docPath}`, {
    method: 'PATCH',
    headers: OWNER,
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, V(v)])) }),
  })
  if (!res.ok) throw new Error(`seed ${docPath}: ${res.status} ${await res.text()}`)
}

async function main() {
  // Deterministic sub -> same uid every run, and a google.com provider account
  // so signInWithPopup's chooser actually lists it.
  const sub = `seed-${args.role}-${args.outlet}`
  const idp = await fetch(`${AUTH}/accounts:signInWithIdp?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      postBody:
        `id_token=${JSON.stringify({ sub, email: args.email, email_verified: true, name: args.name })}` +
        '&providerId=google.com',
      requestUri: 'http://localhost',
      returnIdpCredential: true,
      returnSecureToken: true,
    }),
  }).then((r) => r.json())
  if (!idp.localId) throw new Error(`signInWithIdp: ${JSON.stringify(idp)}`)
  const uid = idp.localId

  // firestore.rules reads these off the token — without them every read is denied.
  const claimed = await fetch(`${AUTH_ADMIN}/accounts:update`, {
    method: 'POST',
    headers: OWNER,
    body: JSON.stringify({
      localId: uid,
      displayName: args.name,
      customAttributes: JSON.stringify({ role: args.role, departmentId: args.department, outletId: args.outlet }),
    }),
  })
  if (!claimed.ok) throw new Error(`claims: ${claimed.status} ${await claimed.text()}`)

  const permissions = permissionsFor(args.role)
  const now = new Date().toISOString()

  await seed(`roles/${args.role}`, {
    name: args.role,
    description: 'Seeded for emulator testing.',
    permissions,
    status: 'active',
    isArchived: false,
    createdAt: now,
    createdBy: 'seed',
    updatedAt: now,
    updatedBy: 'seed',
  })

  await seed(`users/${uid}`, {
    email: args.email,
    displayName: args.name,
    roleId: args.role,
    departmentId: args.department,
    outletId: args.outlet,
    status: 'active',
    isArchived: false,
    createdAt: now,
    createdBy: 'seed',
    updatedAt: now,
    updatedBy: 'seed',
  })

  // Prove the claims actually reached a token — a silent claim failure would
  // otherwise show up much later as "everything is denied and I don't know why".
  const check = await fetch(`${AUTH}/accounts:signInWithIdp?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      postBody: `id_token=${JSON.stringify({ sub, email: args.email, email_verified: true })}&providerId=google.com`,
      requestUri: 'http://localhost',
      returnIdpCredential: true,
      returnSecureToken: true,
    }),
  }).then((r) => r.json())
  const claims = JSON.parse(Buffer.from(check.idToken.split('.')[1], 'base64').toString())
  if (claims.role !== args.role) {
    throw new Error(`claims did not stick: ${JSON.stringify({ role: claims.role, outletId: claims.outletId })}`)
  }

  console.log(`uid          ${uid}`)
  console.log(`email        ${args.email}`)
  console.log(`role         ${args.role} (${permissions.length} permissions)`)
  console.log(`scope        ${args.outlet} / ${args.department}`)
  console.log(`claims       role=${claims.role} outletId=${claims.outletId} departmentId=${claims.departmentId}`)
  console.log('\nSign in at http://localhost:5173/ (npm run dev:emulator) and pick this account in the Google popup.')
}

main().catch((error) => {
  console.error(`\nFailed: ${error.message}`)
  console.error('Is the emulator running? firebase emulators:start --project demo-nourishos')
  process.exitCode = 1
})
