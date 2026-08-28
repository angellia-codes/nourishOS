/**
 * Pins the milestone date matcher — no emulator, same shape as
 * communication-steps.mjs and timestamps.mjs.
 *
 *   npm --prefix functions run build
 *   node functions/test/milestone-match.mjs
 */
import assert from 'node:assert/strict'
import { milestonesFor, yearsOfService } from '../lib/communications/milestoneMatch.js'

const TODAY = '2026-08-25'

const active = (extra) => ({ status: 'active', birthDate: '1990-01-02', joinDate: '2020-03-04', ...extra })

// Birthday matches on month-day regardless of year, and only on the day itself.
assert.deepEqual(milestonesFor(active({ birthDate: '1990-08-25' }), TODAY), ['birthday'])
assert.deepEqual(milestonesFor(active({ birthDate: '1990-08-24' }), TODAY), [])
assert.deepEqual(milestonesFor(active({ birthDate: '1990-01-02' }), '2026-01-03'), [])

// The hire day is a new hire, never a year-0 anniversary.
assert.deepEqual(milestonesFor(active({ joinDate: TODAY }), TODAY), ['newHire'])
assert.deepEqual(milestonesFor(active({ joinDate: '2023-08-25' }), TODAY), ['anniversary'])
assert.equal(yearsOfService('2023-08-25', TODAY), 3)

// Both can land on one day.
assert.deepEqual(milestonesFor(active({ birthDate: '1990-08-25', joinDate: '2019-08-25' }), TODAY), [
  'birthday',
  'anniversary',
])

// An inactive employee gets no birthday, but still gets a farewell — archiveEmployee
// flips status to inactive days before the last working day.
assert.deepEqual(milestonesFor({ status: 'inactive', birthDate: '1990-08-25' }, TODAY), [])
assert.deepEqual(milestonesFor({ status: 'inactive', lastWorkingDate: TODAY }, TODAY), ['farewell'])

// A termination gets no send-off.
assert.deepEqual(
  milestonesFor({ status: 'inactive', lastWorkingDate: TODAY, disciplinaryType: 'termination' }, TODAY),
  [],
)
assert.deepEqual(milestonesFor({ status: 'inactive', lastWorkingDate: TODAY, disciplinaryType: 'SP3' }, TODAY), [
  'farewell',
])

// Missing dates are not a crash.
assert.deepEqual(milestonesFor({ status: 'active' }, TODAY), [])
assert.deepEqual(milestonesFor({ status: 'active', birthDate: null, joinDate: null }, TODAY), [])

console.log('milestone-match: all assertions passed')
