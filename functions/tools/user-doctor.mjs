 /**
 * user-doctor — inspect (and optionally repair) one account across all three
 * RBAC layers, using the Admin SDK so it sees what firestore.rules hides.
 *
 * The three layers, per the root CLAUDE.md § RBAC:
 *   1. Cloud Functions  — requireActiveUser reads users/{uid}.status + roleId.
 *                         A doc missing `status: 'active'` fails EVERY write
 *                         while reads keep working, which looks like "I can
 *                         see things but can't save anything".
 *   2. firestore.rules  — reads gate on the custom claims {role, departmentId,
 *                         outletId}. syncUserClaims only fires on a write that
 *                         CHANGES one of those three (syncUserClaims.ts:32),
 *                         so a doc seeded before that trigger was deployed
 *                         never got claims and re-saving it does nothing.
 *   3. The client       — AuthProvider grants superAdmin every permission
 *                         string, so it is never the thing blocking you.
 *
 * Collection counts run last because an empty prod database and a
 * rules-denied read are indistinguishable from inside the app: both render
 * as an empty list. The Admin SDK bypasses rules, so a 0 here is a real 0.
 *
 * Read-only unless --fix is passed.
 *
 * Usage (from the repo root, PowerShell):
 *   node functions/tools/user-doctor.mjs --user angelliaokta@gmail.com --key C:\path\to\sa.json
 *   node functions/tools/user-doctor.mjs --user <uid> --key <sa.json> --fix
 *   node functions/tools/user-doctor.mjs --user <uid> --key <sa.json> --fix --revoke
 *
 * Credentials: this machine has neither gcloud nor application-default
 * credentials, so pass --key with a service account JSON from
 * Console > Project settings > Service accounts > Generate new private key,
 * or set GOOGLE_APPLICATION_CREDENTIALS. The key file is a root credential
 * for the whole project — keep it out of the repo and delete it when done.
 */

import { readFileSync } from 'node:fs'
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

// Mirrors functions/src/lib/collections.ts. Only the collections a person
// actually browses — counters and settings docs would just be noise.
const COUNTED_COLLECTIONS = [
  'users',
  'roles',
  'employees',
  'contracts',
  'disciplinaryActions',
  'appraisals',
  'appraisalTemplates',
  'trainings',
  'trainingAssignments',
  'hrInventoryItems',
  'recruitments',
  'candidates',
  'tasks',
  'approvalRequests',
  'announcements',
  'calendarEvents',
  'jobDescriptions',
  'sops',
  'companyForms',
  'templates',
  'checkpoints',
  'patrolLogs',
  'incidentReports',
  'workOrders',
  'lostFoundItems',
  'dailyReports',
  'expenseRequests',
]

function parseArgs(argv) {
  const args = { fix: false, revoke: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--fix') args.fix = true
    else if (arg === '--revoke') args.revoke = true
    else if (arg === '--user') args.user = argv[++i]
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

if (!args.user) {
  console.error('Required: --user <email|uid>   (add --fix to apply repairs, --key <sa.json> for credentials)')
  process.exit(2)
}

const keyPath = args.key ?? process.env.GOOGLE_APPLICATION_CREDENTIALS
let projectId = args.project

try {
  if (keyPath) {
    const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'))
    projectId = projectId ?? serviceAccount.project_id
    initializeApp({ credential: cert(serviceAccount), projectId })
  } else {
    initializeApp({ credential: applicationDefault(), projectId })
  }
} catch (error) {
  console.error('Could not initialise the Admin SDK.')
  console.error(error.message)
  console.error('\nPass --key <path-to-service-account.json> (Console > Project settings > Service accounts).')
  process.exit(1)
}

const auth = getAuth()
const db = getFirestore()

const problems = []
const repairs = []

function ok(label, detail) {
  console.log(`  [ok]   ${label}${detail ? ` — ${detail}` : ''}`)
}
function bad(label, detail) {
  console.log(`  [FAIL] ${label}${detail ? ` — ${detail}` : ''}`)
  problems.push(label)
}
function warn(label, detail) {
  console.log(`  [warn] ${label}${detail ? ` — ${detail}` : ''}`)
}

async function main() {
  console.log(`\nProject: ${projectId ?? '(from credentials)'}`)
  console.log(args.fix ? 'Mode:    FIX (writes enabled)\n' : 'Mode:    inspect only (pass --fix to repair)\n')

  // ---- Layer 0: the Auth account itself ----
  console.log('Firebase Auth account')
  const authUser = args.user.includes('@')
    ? await auth.getUserByEmail(args.user).catch(() => null)
    : await auth.getUser(args.user).catch(() => null)

  if (!authUser) {
    bad('account not found', `no Auth user matches "${args.user}"`)
    console.log('\nNothing else can be checked without an account. Stopping.')
    process.exit(1)
  }

  console.log(`  uid:      ${authUser.uid}`)
  console.log(`  email:    ${authUser.email ?? '(none)'}`)
  if (authUser.disabled) bad('account is disabled', 'sign-in is blocked entirely')
  else ok('account enabled')

  const claims = authUser.customClaims ?? {}
  console.log(`  claims:   ${JSON.stringify(claims)}`)

  // ---- Layer 1: the profile document (gates every Cloud Function) ----
  console.log('\nusers/{uid} document — gates every write (rbac.ts requireActiveUser)')
  const userRef = db.collection('users').doc(authUser.uid)
  const userSnap = await userRef.get()

  if (!userSnap.exists) {
    bad('profile document missing', `users/${authUser.uid} does not exist`)
    console.log('\n  Every callable rejects with "Your account is not authorized."')
    console.log('  This script will not create a superAdmin profile from nothing — that is a')
    console.log('  decision to make deliberately in the Console, not a repair.')
    process.exit(1)
  }

  const profile = userSnap.data()
  console.log(`  fields:   ${JSON.stringify(profile, null, 2).split('\n').join('\n            ')}`)

  if (profile.status === 'active') ok('status', 'active')
  else {
    bad('status', `"${profile.status ?? '(missing)'}" — requireActiveUser rejects every callable`)
    repairs.push({ label: 'set status = "active"', apply: () => userRef.update({ status: 'active' }) })
  }

  if (profile.isArchived === true) {
    bad('isArchived', 'true')
    repairs.push({ label: 'set isArchived = false', apply: () => userRef.update({ isArchived: false }) })
  }

  if (profile.roleId) ok('roleId', profile.roleId)
  else bad('roleId', 'missing — requireActiveUser rejects every callable')

  if (profile.roleId === 'superAdmin') {
    ok('superAdmin', 'bypasses requirePermission (rbac.ts:75) and every client permission check')
  }

  // ---- Layer 2: custom claims vs the profile (gates every read) ----
  console.log('\nCustom claims vs profile — gates every read (firestore.rules)')
  const expected = {
    role: profile.roleId ?? null,
    departmentId: profile.departmentId ?? null,
    outletId: profile.outletId ?? null,
  }
  const drifted = Object.entries(expected).filter(([key, value]) => claims[key] !== value)

  if (drifted.length === 0) {
    ok('claims match the profile', JSON.stringify(expected))
  } else {
    for (const [key, value] of drifted) {
      bad(`claim "${key}"`, `token has ${JSON.stringify(claims[key])}, profile says ${JSON.stringify(value)}`)
    }
  }

  // Offered even when the claims match: re-setting them is harmless, and it is
  // the only way past syncUserClaims' no-op guard when they don't.
  repairs.push({
    label: `set custom claims to ${JSON.stringify(expected)}`,
    apply: () => auth.setCustomUserClaims(authUser.uid, expected),
    optional: drifted.length === 0,
  })

  // ---- Layer 3: the role document ----
  console.log('\nroles/{roleId} document')
  if (profile.roleId) {
    const roleSnap = await db.collection('roles').doc(profile.roleId).get()
    if (!roleSnap.exists) {
      const detail = `roles/${profile.roleId} does not exist`
      if (profile.roleId === 'superAdmin') warn('role document missing', `${detail} — harmless, superAdmin bypasses it`)
      else bad('role document missing', `${detail} — permissions resolve to []`)
    } else {
      const permissions = roleSnap.data()?.permissions ?? []
      ok('role document', `${permissions.length} permission(s)`)
      if (profile.roleId === 'superAdmin') {
        console.log('         (not what enforcement reads — superAdmin bypasses both requirePermission and AuthProvider)')
      }
    }
  }

  // ---- Is there anything to read at all? ----
  console.log('\nCollection counts (Admin SDK — bypasses rules, so 0 here means genuinely empty)')
  const counts = await Promise.all(
    COUNTED_COLLECTIONS.map(async (name) => {
      try {
        const snap = await db.collection(name).count().get()
        return [name, snap.data().count]
      } catch (error) {
        return [name, `error: ${error.message}`]
      }
    }),
  )
  const populated = counts.filter(([, count]) => count !== 0)
  const empty = counts.filter(([, count]) => count === 0).map(([name]) => name)

  for (const [name, count] of populated) console.log(`  ${name.padEnd(22)} ${count}`)
  if (empty.length) console.log(`\n  empty: ${empty.join(', ')}`)

  // ---- Verdict ----
  console.log('\n' + '-'.repeat(70))
  if (problems.length === 0) {
    console.log('No account-level problem found. All three RBAC layers agree.')
    if (empty.length) {
      console.log('The empty collections above are empty in the database itself, not hidden')
      console.log('from you — a blank list on those pages is the data, not a permission.')
    }
  } else {
    console.log(`${problems.length} problem(s): ${problems.join('; ')}`)
  }

  const applicable = repairs.filter((repair) => !repair.optional)
  if (!args.fix) {
    if (applicable.length) {
      console.log('\nRepairs available (re-run with --fix):')
      for (const repair of applicable) console.log(`  - ${repair.label}`)
    }
    console.log('\nInspect only — nothing was written.')
    return
  }

  console.log('\nApplying repairs:')
  for (const repair of repairs) {
    // The claims re-set runs even when it is a no-op: it is the documented way
    // around syncUserClaims' unchanged-triple early return.
    await repair.apply()
    console.log(`  done: ${repair.label}`)
  }
  if (!repairs.length) console.log('  (nothing to do)')

  if (args.revoke) {
    await auth.revokeRefreshTokens(authUser.uid)
    console.log('  done: revoked refresh tokens')
  }

  console.log('\nSign out and back in to pick up the new token — an already-issued')
  console.log('ID token keeps its old claims for up to an hour otherwise.')
}

main().catch((error) => {
  console.error('\nFailed:', error.message)
  process.exit(1)
})
