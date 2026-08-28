// Pins the expense approval chain in src/finance/expenseSteps.ts
// (expense-request.md §3, approval_engine.md §6).
//
//   npm --prefix functions run build
//   npm test
//
// No emulator needed — buildExpenseApprovalSteps is pure. What is worth
// asserting is not the happy path but the three corrections: a requester who is
// their own approver, a duplicated role, and a chain that empties.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { buildExpenseApprovalSteps, EXPENSE_APPROVAL_THRESHOLD_IDR } = require('../lib/finance/expenseSteps.js')

const rolesFor = (context) => buildExpenseApprovalSteps(context).map((step) => step.approverRole)

describe('buildExpenseApprovalSteps', () => {
  test('kitchen staff, under threshold', () => {
    assert.deepEqual(rolesFor({ totalAmount: 3_000_000, departmentId: 'kitchen', requesterRoleId: 'staff' }), [
      'kitchenLeader',
      'finance',
    ])
  })

  test('kitchen staff, over threshold', () => {
    assert.deepEqual(rolesFor({ totalAmount: 10_000_000, departmentId: 'kitchen', requesterRoleId: 'staff' }), [
      'kitchenLeader',
      'finance',
      'generalManager',
      'director',
    ])
  })

  test('exactly at the threshold stays short', () => {
    // The boundary is exclusive: exactly 5,000,000 is still the short chain.
    assert.deepEqual(
      rolesFor({ totalAmount: EXPENSE_APPROVAL_THRESHOLD_IDR, departmentId: 'bar', requesterRoleId: 'staff' }),
      ['barLeader', 'finance'],
    )
  })

  test('the department leader filing their own expense skips their own step', () => {
    assert.deepEqual(rolesFor({ totalAmount: 3_000_000, departmentId: 'kitchen', requesterRoleId: 'kitchenLeader' }), [
      'finance',
    ])
  })

  // finance_accounting's leader role IS finance — without the dedupe this asks
  // the same role to approve twice.
  test('finance_accounting staff, deduped', () => {
    assert.deepEqual(
      rolesFor({ totalAmount: 3_000_000, departmentId: 'finance_accounting', requesterRoleId: 'staff' }),
      ['finance'],
    )
  })

  // ...and once the requester is finance, that chain empties and has to floor.
  test('a finance user under threshold falls back to the GM', () => {
    assert.deepEqual(
      rolesFor({ totalAmount: 3_000_000, departmentId: 'finance_accounting', requesterRoleId: 'finance' }),
      ['generalManager'],
    )
  })

  test('a finance user over threshold keeps the upper chain', () => {
    assert.deepEqual(
      rolesFor({ totalAmount: 10_000_000, departmentId: 'finance_accounting', requesterRoleId: 'finance' }),
      ['generalManager', 'director'],
    )
  })

  test('a GM over threshold does not approve their own request', () => {
    assert.deepEqual(
      rolesFor({ totalAmount: 10_000_000, departmentId: 'admin_general', requesterRoleId: 'generalManager' }),
      ['finance', 'director'],
    )
  })

  test('an unknown department still routes to finance', () => {
    assert.deepEqual(rolesFor({ totalAmount: 1_000_000, departmentId: 'not_a_department', requesterRoleId: 'staff' }), [
      'finance',
    ])
  })

  test('an empty context still yields a usable chain', () => {
    assert.deepEqual(rolesFor({}), ['finance'])
  })

  test('sequences are renumbered after filtering', () => {
    const sequences = buildExpenseApprovalSteps({
      totalAmount: 10_000_000,
      departmentId: 'kitchen',
      requesterRoleId: 'staff',
    }).map((step) => step.sequence)
    assert.deepEqual(sequences, [1, 2, 3, 4])
  })
})
