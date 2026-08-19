// Pins the expense approval chain in src/finance/expenseSteps.ts
// (expense-request.md §3, approval_engine.md §6).
//
//   npm --prefix functions run build
//   node functions/test/expense-steps.mjs
//
// No emulator needed — buildExpenseApprovalSteps is pure. What is worth
// asserting is not the happy path but the three corrections: a requester who is
// their own approver, a duplicated role, and a chain that empties.
import { createRequire } from 'module'
import assert from 'assert'

const require = createRequire(import.meta.url)
const { buildExpenseApprovalSteps, EXPENSE_APPROVAL_THRESHOLD_IDR } = require('../lib/finance/expenseSteps.js')

let failures = 0
function check(label, context, expectedRoles) {
  const actual = buildExpenseApprovalSteps(context).map((step) => step.approverRole)
  try {
    assert.deepStrictEqual(actual, expectedRoles)
    console.log(`✓ ${label}`)
  } catch {
    failures += 1
    console.error(`✗ ${label} — expected [${expectedRoles}], got [${actual}]`)
  }
}

check(
  'kitchen staff, under threshold',
  { totalAmount: 3_000_000, departmentId: 'kitchen', requesterRoleId: 'staff' },
  ['kitchenLeader', 'finance'],
)

check(
  'kitchen staff, over threshold',
  { totalAmount: 10_000_000, departmentId: 'kitchen', requesterRoleId: 'staff' },
  ['kitchenLeader', 'finance', 'generalManager', 'director'],
)

// The boundary is exclusive: exactly 5,000,000 is still the short chain.
check(
  'exactly at the threshold stays short',
  { totalAmount: EXPENSE_APPROVAL_THRESHOLD_IDR, departmentId: 'bar', requesterRoleId: 'staff' },
  ['barLeader', 'finance'],
)

check(
  'the department leader filing their own expense skips their own step',
  { totalAmount: 3_000_000, departmentId: 'kitchen', requesterRoleId: 'kitchenLeader' },
  ['finance'],
)

// finance_accounting's leader role IS finance — without the dedupe this asks
// the same role to approve twice.
check(
  'finance_accounting staff, deduped',
  { totalAmount: 3_000_000, departmentId: 'finance_accounting', requesterRoleId: 'staff' },
  ['finance'],
)

// ...and once the requester is finance, that chain empties and has to floor.
check(
  'a finance user under threshold falls back to the GM',
  { totalAmount: 3_000_000, departmentId: 'finance_accounting', requesterRoleId: 'finance' },
  ['generalManager'],
)

check(
  'a finance user over threshold keeps the upper chain',
  { totalAmount: 10_000_000, departmentId: 'finance_accounting', requesterRoleId: 'finance' },
  ['generalManager', 'director'],
)

check(
  'a GM over threshold does not approve their own request',
  { totalAmount: 10_000_000, departmentId: 'admin_general', requesterRoleId: 'generalManager' },
  ['finance', 'director'],
)

check(
  'an unknown department still routes to finance',
  { totalAmount: 1_000_000, departmentId: 'not_a_department', requesterRoleId: 'staff' },
  ['finance'],
)

check('an empty context still yields a usable chain', {}, ['finance'])

const sequences = buildExpenseApprovalSteps({
  totalAmount: 10_000_000,
  departmentId: 'kitchen',
  requesterRoleId: 'staff',
}).map((step) => step.sequence)
try {
  assert.deepStrictEqual(sequences, [1, 2, 3, 4])
  console.log('✓ sequences are renumbered after filtering')
} catch {
  failures += 1
  console.error(`✗ sequences are renumbered after filtering — got [${sequences}]`)
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll expense approval chain checks passed.')
