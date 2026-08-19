/**
 * sync-role-permissions — reconcile live `roles/{roleId}` documents against
 * ROLE_PERMISSIONS, adding permission strings the code grants but the documents
 * are missing.
 *
 * Why this exists: ROLE_PERMISSIONS (functions/src/lib/organization.ts) only
 * seeds a role document the FIRST time that role is claimed. Every permission
 * string added by every module since then never reaches the documents already
 * in Firestore, so the feature ships, the callable enforces a string nobody
 * holds, and the module is invisible to everyone with no error to point at.
 * Every module in this repo has hit this; the per-module CLAUDE.md files record
 * it as a standing caveat rather than something anyone automated. This is the
 * automation.
 *
 * It only ever ADDS. Permissions present on a live document but absent from
 * ROLE_PERMISSIONS are reported and left alone — they may have been granted
 * deliberately through Settings > Roles & Permissions, and silently reverting a
 * human's decision is worse than the drift.
 *
 * superAdmin is skipped: it is deliberately absent from ROLE_PERMISSIONS, and
 * since 2026-08-15 requirePermission/requireAnyPermission return early for it
 * anyway, so its document is for visibility and audit, not enforcement.
 *
 * Usage (from the repo root, PowerShell):
 *   npm --prefix functions run build          # this reads the compiled map
 *   node functions/tools/sync-role-permissions.mjs --key C:\path\to\sa.json
 *   node functions/tools/sync-role-permissions.mjs --key C:\path\to\sa.json --apply
 *
 * Narrow it to one module's strings while a feature is being rolled out:
 *   node functions/tools/sync-role-permissions.mjs --key <sa.json> --prefix shiftReports.
 *
 * Against the emulator (no credentials needed):
 *   $env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
 *   node functions/tools/sync-role-permissions.mjs --project demo-nourishos --apply
 *
 * Credentials: the key file is a root credential for the whole project — keep
 * it out of the repo and delete it when done.
 *
 * Note for reads: firestore.rules gates client reads on custom claims, and this
 * writes the documents the CLIENT reads to build its permission list. Cloud
 * Functions re-read roles/{roleId} on every call so they see a change
 * immediately; a signed-in browser picks it up when AuthProvider's listener
 * fires, which is immediate for the document itself.
 */

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const require = createRequire(import.meta.url)
const here = path.dirname(fileURLToPath(import.meta.url))

let ROLE_PERMISSIONS
try {
  ;({ ROLE_PERMISSIONS } = require(path.join(here, '..', 'lib', 'lib', 'organization.js')))
} catch {
  console.error('Could not load functions/lib/lib/organization.js — run `npm --prefix functions run build` first.')
  process.exit(1)
}

function parseArgs(argv) {
  const args = { apply: false, prefix: null }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--apply') args.apply = true
    else if (arg === '--key') args.key = argv[++i]
    else if (arg === '--project') args.project = argv[++i]
    else if (arg === '--prefix') args.prefix = argv[++i]
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

async function main() {
  console.log(`sync-role-permissions — ${args.apply ? 'APPLY' : 'DRY RUN'} against project "${projectId}"`)
  if (args.prefix) console.log(`filtered to permissions starting "${args.prefix}"`)
  console.log('')

  const planned = []
  const clean = []
  const missingDocs = []
  const extras = []

  for (const [roleId, expected] of Object.entries(ROLE_PERMISSIONS)) {
    const ref = db.collection('roles').doc(roleId)
    const snap = await ref.get()

    if (!snap.exists) {
      // Not an error: a role nobody has claimed yet has no document, and
      // registerUser seeds it correctly on first claim.
      missingDocs.push(roleId)
      continue
    }

    const live = new Set(snap.data().permissions ?? [])
    const wanted = args.prefix ? expected.filter((p) => p.startsWith(args.prefix)) : expected

    const toAdd = wanted.filter((p) => !live.has(p))
    const expectedSet = new Set(expected)
    const onlyLive = [...live].filter((p) => !expectedSet.has(p))

    if (onlyLive.length > 0) extras.push({ roleId, onlyLive })
    if (toAdd.length === 0) {
      clean.push(roleId)
      continue
    }
    planned.push({ roleId, ref, toAdd, liveCount: live.size })
  }

  for (const entry of planned) {
    console.log(`  ${entry.roleId}  (${entry.liveCount} -> ${entry.liveCount + entry.toAdd.length})`)
    entry.toAdd.forEach((p) => console.log(`      + ${p}`))
  }

  if (clean.length > 0) console.log(`\nAlready up to date: ${clean.join(', ')}`)
  if (missingDocs.length > 0) {
    console.log(`\nNo roles/{roleId} document yet (seeded on first claim, nothing to do): ${missingDocs.join(', ')}`)
  }
  if (extras.length > 0) {
    console.log('\nOn the live document but not in ROLE_PERMISSIONS — LEFT ALONE, never removed:')
    extras.forEach(({ roleId, onlyLive }) => console.log(`  ${roleId}: ${onlyLive.join(', ')}`))
    console.log('  These may have been granted by hand in Settings > Roles & Permissions.')
  }

  if (planned.length === 0) {
    console.log('\nNothing to add.')
    return
  }

  if (!args.apply) {
    console.log(`\n${planned.length} role document(s) would change. Re-run with --apply to write.`)
    return
  }

  for (const entry of planned) {
    await entry.ref.update({
      permissions: FieldValue.arrayUnion(...entry.toAdd),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: 'sync-role-permissions',
    })
    console.log(`updated roles/${entry.roleId}`)
  }
  console.log(`\nUpdated ${planned.length} role document(s).`)
}

main().catch((error) => {
  console.error(`\nFailed: ${error.message}`)
  process.exitCode = 1
})
