// Pins the Employee Communication approval chain in
// src/hr/employees/communicationSteps.ts (employee_communication.md §17).
//
//   npm --prefix functions run build
//   npm test
//
// No emulator needed — buildCommunicationApprovalSteps is pure. What is worth
// asserting is not the happy path but the three corrections: a requester who is
// their own approver, a duplicated role, and a chain that empties.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { buildCommunicationApprovalSteps } = require('../lib/hr/employees/communicationSteps.js')

const rolesFor = (context) => buildCommunicationApprovalSteps(context).map((step) => step.approverRole)

describe('buildCommunicationApprovalSteps', () => {
  // The spec's baseline: Department Head -> HR -> GM.
  test('a GM filing on a kitchen employee gets the full chain minus their own step', () => {
    assert.deepEqual(rolesFor({ departmentId: 'kitchen', requesterRoleId: 'generalManager' }), [
      'headChef',
      'hrManager',
    ])
  })

  test('an unrelated role filing on a bar employee gets all three steps', () => {
    assert.deepEqual(rolesFor({ departmentId: 'bar', requesterRoleId: 'restaurantManager' }), [
      'barManager',
      'hrManager',
      'generalManager',
    ])
  })

  // Correction 1 — the requester is never left as their own approver.
  test('a kitchen leader filing on their own team drops their own step', () => {
    assert.deepEqual(rolesFor({ departmentId: 'kitchen', requesterRoleId: 'headChef' }), [
      'hrManager',
      'generalManager',
    ])
  })

  // Correction 2 — human_resources' leader role IS hrManager, so it must not appear twice.
  test('an HR employee filed on by a third party asks hrManager once, not twice', () => {
    assert.deepEqual(rolesFor({ departmentId: 'human_resources', requesterRoleId: 'director' }), [
      'hrManager',
      'generalManager',
    ])
  })

  test('HR filing on one of their own drops the duplicate and their own step', () => {
    assert.deepEqual(rolesFor({ departmentId: 'human_resources', requesterRoleId: 'hrManager' }), ['generalManager'])
  })

  // Correction 3 — a department with no DEPARTMENT_ROLES entry still yields a chain.
  test('an unknown department still routes through HR and the GM', () => {
    assert.deepEqual(rolesFor({ departmentId: 'not_a_department', requesterRoleId: 'staff' }), [
      'hrManager',
      'generalManager',
    ])
  })

  test('a missing department is treated the same as an unknown one', () => {
    assert.deepEqual(rolesFor({ requesterRoleId: 'staff' }), ['hrManager', 'generalManager'])
  })

  // housekeeping's only role (`staff`) was removed 2026-08-29 with no
  // replacement — DEPARTMENT_ROLES['housekeeping'] is now empty, so this
  // department has no resolvable leader at all, same shape as an unknown one.
  test('housekeeping has no leader to resolve, same as an unknown department', () => {
    assert.deepEqual(rolesFor({ departmentId: 'housekeeping', requesterRoleId: 'staff' }), [
      'hrManager',
      'generalManager',
    ])
  })

  test('sequences are contiguous from 1', () => {
    // Or approveStep's step lookup misses.
    const sequences = buildCommunicationApprovalSteps({ departmentId: 'bar', requesterRoleId: 'staff' }).map(
      (step) => step.sequence,
    )
    assert.deepEqual(sequences, [1, 2, 3])
  })
})
