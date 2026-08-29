/**
 * migrate-role-ids — one-time fixup for the 2026-08-29 role-id rename/removal.
 *
 * Renamed (id changed, permission set unchanged): floorLeader->restaurantSupervisor,
 * barLeader->barManager, kitchenLeader->headChef, bakeryLeader->chiefBaker.
 * Removed entirely (no department offered either any more): outletManager, staff.
 *
 * Why this exists: role ids are the primary key for `roles/{roleId}` documents
 * and the value custom claims + `users/{uid}.roleId` carry. Renaming ROLES in
 * code (src/constants/roles.ts, functions/src/lib/organization.ts) does
 * nothing to documents already written with the old id — this is that data
 * migration, the same shape as migrate-checklists.mjs.
 *
 * For the two RENAMES:
 *   - users/{uid} with the old roleId get the new one, plus custom claims
 *     re-set (role/departmentId/outletId — the same shape syncUserClaims.ts
 *     writes) so firestore.rules sees the new id immediately.
 *   - roles/{oldId} is copied to roles/{newId} (preserving any hand-edited
 *     permissions from Settings > Roles & Permissions, not reset to the
 *     compiled ROLE_PERMISSIONS default) and then the old document deleted —
 *     but only once the new one is written, and never if roles/{newId}
 *     already exists with different content (reported as a conflict instead).
 *
 * For the two REMOVALS, this script NEVER writes anything — reassigning a
 * real employee's job role is an HR decision, not something a migration
 * script should guess. It only reports who still holds outletManager/staff so
 * a human can move them to a real role by hand. Their roles/{roleId}
 * documents are left in place too, so they keep working (whatever
 * permissions were seeded) until reassigned.
 *
 * Usage (from the repo root, PowerShell):
 *   npm --prefix functions run build
 *   node functions/tools/migrate-role-ids.mjs --key C:\path\to\sa.json
 *   node functions/tools/migrate-role-ids.mjs --key C:\path\to\sa.json --apply
 *
 * Against the emulator (no credentials needed):
 *   $env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
 *   node functions/tools/migrate-role-ids.mjs --project demo-nourishos --apply
 *
 * Idempotent: re-running after --apply finds no more users/documents on the
 * old ids and reports nothing to do.
 */

import { readFileSync } from 'node:fs'
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

const RENAMES = {
  floorLeader: 'restaurantSupervisor',
  barLeader: 'barManager',
  kitchenLeader: 'headChef',
  bakeryLeader: 'chiefBaker',
}
const REMOVED = ['outletManager', 'staff']

function parseArgs(argv) {
  const args = { apply: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--apply') args.apply = true
    else if (arg === '--key') args.key = argv[++i]
    else if (arg === '--project') args.project = argv[++i]
    else {
      console.error(`Unknown argument: ${arg}`)
      process.exit(2)
    }
  }
  return args
}

const args = parseArgs(process.argv.slice(2))

const keyPath = args.key ?? process.env.GOOGLE_APPLICATION_CREDENTIALS
let projectId = args.project

try {
  if (keyPath) {
    const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'))
    projectId = projectId ?? serviceAccount.project_id
    initializeApp({ credential: cert(serviceAccount), projectId })
  } else if (process.env.FIRESTORE_EMULATOR_HOST) {
    initializeApp({ projectId: projectId ?? 'demo-nourishos' })
  } else {
    initializeApp({ credential: applicationDefault(), projectId })
  }
} catch (error) {
  console.error('Could not initialise the Admin SDK.')
  console.error(error.message)
  console.error('\nPass --key <path-to-service-account.json> (Console > Project settings > Service accounts).')
  process.exit(1)
}

const db = getFirestore()
const auth = getAuth()

async function migrateRoleDoc(oldId, newId) {
  const oldRef = db.collection('roles').doc(oldId)
  const newRef = db.collection('roles').doc(newId)
  const [oldSnap, newSnap] = await Promise.all([oldRef.get(), newRef.get()])

  if (!oldSnap.exists) return { oldId, newId, status: 'no-old-doc' }
  if (newSnap.exists) return { oldId, newId, status: 'conflict', oldData: oldSnap.data(), newData: newSnap.data() }
  return { oldId, newId, status: 'migrate', data: oldSnap.data() }
}

async function main() {
  console.log(`migrate-role-ids — ${args.apply ? 'APPLY' : 'DRY RUN'} against project "${projectId}"\n`)

  // ---- users/{uid} on a renamed id ----
  const userMigrations = []
  for (const [oldRole, newRole] of Object.entries(RENAMES)) {
    const snap = await db.collection('users').where('roleId', '==', oldRole).get()
    snap.docs.forEach((doc) => userMigrations.push({ doc, oldRole, newRole }))
  }

  console.log(`Users on a renamed role id: ${userMigrations.length}`)
  for (const { doc, oldRole, newRole } of userMigrations) {
    const data = doc.data()
    console.log(`  ${doc.id}  ${data.displayName ?? data.email ?? '(no name)'}  ${oldRole} -> ${newRole}`)
  }

  // ---- roles/{roleId} docs for the renamed ids ----
  const roleDocPlans = await Promise.all(Object.entries(RENAMES).map(([o, n]) => migrateRoleDoc(o, n)))
  const toMigrate = roleDocPlans.filter((p) => p.status === 'migrate')
  const conflicts = roleDocPlans.filter((p) => p.status === 'conflict')

  console.log(`\nRole documents to copy old id -> new id: ${toMigrate.length}`)
  toMigrate.forEach((p) => console.log(`  roles/${p.oldId} -> roles/${p.newId} (${p.data.permissions?.length ?? 0} permissions)`))

  if (conflicts.length > 0) {
    console.log(`\nCONFLICTS — roles/{newId} already exists with its own content, left both alone:`)
    conflicts.forEach((p) => console.log(`  ${p.oldId} / ${p.newId} — resolve by hand`))
  }

  // ---- users/{uid} on a removed id — report only, never reassigned ----
  const strandedUsers = []
  for (const roleId of REMOVED) {
    const snap = await db.collection('users').where('roleId', '==', roleId).get()
    snap.docs.forEach((doc) => strandedUsers.push({ doc, roleId }))
  }

  if (strandedUsers.length > 0) {
    console.log(`\nSTILL ON A REMOVED ROLE — needs a human to pick a real role, never auto-reassigned:`)
    for (const { doc, roleId } of strandedUsers) {
      const data = doc.data()
      console.log(
        `  ${doc.id}  ${data.displayName ?? data.email ?? '(no name)'}  role=${roleId}` +
          `  outlet=${data.outletId ?? '?'}  department=${data.departmentId ?? '?'}`,
      )
    }
  } else {
    console.log('\nNo users on a removed role (outletManager/staff) — nothing to flag.')
  }

  if (!args.apply) {
    const total = userMigrations.length + toMigrate.length
    console.log(total > 0 ? `\n${total} change(s) would be made. Re-run with --apply to write.` : '\nNothing to do.')
    return
  }

  for (const p of toMigrate) {
    await db.collection('roles').doc(p.newId).set(p.data)
    await db.collection('roles').doc(p.oldId).delete()
    console.log(`migrated roles/${p.oldId} -> roles/${p.newId}`)
  }

  for (const { doc, oldRole, newRole } of userMigrations) {
    const data = doc.data()
    await doc.ref.update({ roleId: newRole, updatedAt: FieldValue.serverTimestamp() })
    await auth.setCustomUserClaims(doc.id, {
      role: newRole,
      departmentId: data.departmentId ?? null,
      outletId: data.outletId ?? null,
    })
    console.log(`migrated users/${doc.id}  ${oldRole} -> ${newRole}`)
  }

  console.log(`\nDone. ${userMigrations.length} user(s), ${toMigrate.length} role document(s) migrated.`)
  if (strandedUsers.length > 0) {
    console.log(`${strandedUsers.length} user(s) still need a human to assign a real role (see above).`)
  }
}

main().catch((error) => {
  console.error(`\nFailed: ${error.message}`)
  process.exitCode = 1
})
