/**
 * Seed the whole sign-in cast into the Auth + Firestore emulators — hand-run:
 *
 *   firebase emulators:start --project demo-nourishos
 *   npm --prefix functions run build     # seed-emulator-user.mjs reads the compiled ROLE_PERMISSIONS
 *   node functions/test/seed-accounts.mjs
 *
 * seed-emulator-user.mjs seeds ONE account and is the single source of the
 * seeding logic (deterministic google.com sub, custom claims, role document).
 * This walks the cast and calls it once per person, so there is no second copy
 * of that logic to drift.
 *
 * Every account signs in through the app's Google popup with no password. Pick
 * whichever one the flow under test needs from the emulator's account chooser.
 *
 * Two things the cast is deliberately built around:
 *
 *   1. `sub` is derived from role + outlet, so two people sharing a role must
 *      sit at different outlets or the second overwrites the first. The three
 *      kitchen leaders and two bar leaders are spread across outlets for that
 *      reason as much as for realism.
 *
 *   2. The payroll batch approval chain is finance -> generalManager ->
 *      director (shared/approval/routes.ts), so all three have to exist before
 *      a month can be walked end to end. Director is easy to leave out of a
 *      cast list and then discover missing halfway through an approval.
 *
 * Position titles below are labels for the human running the seed — users/{uid}
 * carries role, outlet and department only. The position lives on the employee
 * record, which seed-demo-data.mjs creates separately.
 */

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const SEED_ONE = path.join(here, 'seed-emulator-user.mjs')

/** name, email, role, outlet, department — outlet/department pairs match OUTLET_DEPARTMENTS. */
const CAST = [
  // --- HQ (BOH Nourish Group) ---------------------------------------------
  ['Super Admin', 'admin@nourish.test', 'superAdmin', 'boh_nourish_group', 'admin_general'],
  ['Director', 'director@nourish.test', 'director', 'boh_nourish_group', 'admin_general'],
  ['General Manager', 'gm@nourish.test', 'generalManager', 'boh_nourish_group', 'admin_general'],
  ['HR Manager', 'hr@nourish.test', 'hrManager', 'boh_nourish_group', 'human_resources'],
  // "Chief Accountant" is the position; `finance` is the role that carries it,
  // and it is the FIRST approver on a payroll batch.
  ['Chief Accountant', 'finance@nourish.test', 'finance', 'boh_nourish_group', 'finance_accounting'],

  // --- Department heads ----------------------------------------------------
  ['Restaurant Manager', 'restaurant.manager@nourish.test', 'restaurantManager', 'nourish_uluwatu', 'fb_service'],
  ['Head Chef', 'head.chef@nourish.test', 'kitchenLeader', 'nourish_uluwatu', 'kitchen'],

  // --- Outlet leaders ------------------------------------------------------
  ['Sous Chef', 'sous.chef@nourish.test', 'kitchenLeader', 'nourish_ungasan', 'kitchen'],
  ['Chef de Partie', 'chef.de.partie@nourish.test', 'kitchenLeader', 'nourish_berawa', 'kitchen'],
  ['Bar Supervisor', 'bar.supervisor@nourish.test', 'barLeader', 'nourish_uluwatu', 'bar'],
  ['Bar Captain', 'bar.captain@nourish.test', 'barLeader', 'nourish_ungasan', 'bar'],

  // --- Staff ---------------------------------------------------------------
  ['Waiter', 'waiter@nourish.test', 'staff', 'nourish_uluwatu', 'fb_service'],
  ['Bartender', 'bartender@nourish.test', 'staff', 'nourish_ungasan', 'bar'],
  ['Barista', 'barista@nourish.test', 'staff', 'the_bakery_uluwatu', 'bar'],
]

let seeded = 0
let failed = 0

for (const [name, email, role, outlet, department] of CAST) {
  const result = spawnSync(
    process.execPath,
    [SEED_ONE, '--name', name, '--email', email, '--role', role, '--outlet', outlet, '--department', department],
    { encoding: 'utf8' },
  )

  if (result.status === 0) {
    seeded += 1
    console.log(`✓ ${name.padEnd(20)} ${role.padEnd(18)} ${email}`)
  } else {
    failed += 1
    console.error(`✗ ${name.padEnd(20)} ${role.padEnd(18)} ${email}`)
    // The child prints the real reason (emulator down, unknown role, bad
    // outlet/department pair); surface it rather than just a failure count.
    const detail = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
    if (detail) console.error(`  ${detail.split('\n').join('\n  ')}`)
  }
}

console.log(`\n${seeded} account(s) seeded, ${failed} failed.`)
if (failed > 0) {
  console.error('Is the emulator running, and has `npm --prefix functions run build` been run?')
  process.exit(1)
}
console.log('Sign in at http://localhost:5173 with `npm run dev:emulator` and pick an account from the chooser.')
