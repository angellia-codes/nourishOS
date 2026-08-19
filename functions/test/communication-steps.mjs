// Pins the Employee Communication approval chain in
// src/hr/employees/communicationSteps.ts (employee_communication.md §17).
//
//   npm --prefix functions run build
//   node functions/test/communication-steps.mjs
//
// No emulator needed — buildCommunicationApprovalSteps is pure. What is worth
// asserting is not the happy path but the three corrections: a requester who is
// their own approver, a duplicated role, and a chain that empties.
import { createRequire } from 'module'
import assert from 'assert'

const require = createRequire(import.meta.url)
const { buildCommunicationApprovalSteps } = require('../lib/hr/employees/communicationSteps.js')

let failures = 0
function check(label, context, expectedRoles) {
  const actual = buildCommunicationApprovalSteps(context).map((step) => step.approverRole)
  try {
    assert.deepStrictEqual(actual, expectedRoles)
    console.log(`  ok   ${label}`)
  } catch {
    failures += 1
    console.error(`  FAIL ${label}\n       expected ${JSON.stringify(expectedRoles)}\n       actual   ${JSON.stringify(actual)}`)
  }
}

console.log('buildCommunicationApprovalSteps')

// The spec's baseline: Department Head -> HR -> GM.
check(
  'GM filing on a kitchen employee gets the full chain minus their own step',
  { departmentId: 'kitchen', requesterRoleId: 'generalManager' },
  ['kitchenLeader', 'hrManager'],
)
check(
  'an unrelated role filing on a bar employee gets all three steps',
  { departmentId: 'bar', requesterRoleId: 'restaurantManager' },
  ['barLeader', 'hrManager', 'generalManager'],
)

// Correction 1 — the requester is never left as their own approver.
check(
  'a kitchen leader filing on their own team drops their own step',
  { departmentId: 'kitchen', requesterRoleId: 'kitchenLeader' },
  ['hrManager', 'generalManager'],
)

// Correction 2 — human_resources' leader role IS hrManager, so it must not appear twice.
check(
  'an HR employee filed on by a third party asks hrManager once, not twice',
  { departmentId: 'human_resources', requesterRoleId: 'director' },
  ['hrManager', 'generalManager'],
)
check(
  'HR filing on one of their own drops the duplicate and their own step',
  { departmentId: 'human_resources', requesterRoleId: 'hrManager' },
  ['generalManager'],
)

// Correction 3 — a department with no DEPARTMENT_ROLES entry still yields a chain.
check(
  'an unknown department still routes through HR and the GM',
  { departmentId: 'not_a_department', requesterRoleId: 'staff' },
  ['hrManager', 'generalManager'],
)
check(
  'a missing department is treated the same as an unknown one',
  { requesterRoleId: 'staff' },
  ['hrManager', 'generalManager'],
)

// housekeeping's only role is `staff`, which is its own leader — the one case
// where the leader lookup returns a role that is not a leader at all.
check(
  'housekeeping resolves its leader to staff, and drops it when staff files',
  { departmentId: 'housekeeping', requesterRoleId: 'staff' },
  ['hrManager', 'generalManager'],
)

// Sequences must be 1..n with no gaps, or approveStep's step lookup misses.
const sequences = buildCommunicationApprovalSteps({ departmentId: 'bar', requesterRoleId: 'staff' }).map(
  (step) => step.sequence,
)
try {
  assert.deepStrictEqual(sequences, [1, 2, 3])
  console.log('  ok   sequences are contiguous from 1')
} catch {
  failures += 1
  console.error(`  FAIL sequences are contiguous from 1\n       actual ${JSON.stringify(sequences)}`)
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll checks passed.')
