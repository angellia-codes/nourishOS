/**
 * Pins the join-date appraisal cycle (hr/appraisal/cycles.ts) and the
 * role-based primary scorer rule (hr/appraisal/scorers.ts) — no emulator.
 *
 *   npm --prefix functions run build
 *   npm test
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { cycleFor, nextCycleWithin, reminderStage, stagesThrough } from '../lib/hr/appraisal/cycles.js'
import { canActAsPrimaryScorer, scorerRoleFor } from '../lib/hr/appraisal/scorers.js'

const JOIN = '2026-09-24'

describe('cycleFor — every 90 days from the join date', () => {
  test("HR's worked example: join 24 Sep 2026", () => {
    assert.deepEqual(
      [1, 2, 3, 4].map((k) => [cycleFor(JOIN, k).reviewType, cycleFor(JOIN, k).dueDate]),
      [
        ['probation', '2026-12-23'], // +90
        ['quarterly', '2027-03-23'], // +180
        ['quarterly', '2027-06-21'], // +270
        ['annual', '2027-09-19'], // +360
      ],
    )
  })

  test('year 2 repeats: three quarterlies then an annual', () => {
    assert.deepEqual(
      [5, 6, 7, 8].map((k) => [cycleFor(JOIN, k).reviewType, cycleFor(JOIN, k).dueDate]),
      [
        ['quarterly', '2027-12-18'], // +450
        ['quarterly', '2028-03-17'], // +540
        ['quarterly', '2028-06-15'], // +630
        ['annual', '2028-09-13'], // +720
      ],
    )
    assert.equal(cycleFor(JOIN, 5).periodLabel, 'Quarterly · Year 2 Q1 · due 2027-12-18')
    assert.equal(cycleFor(JOIN, 8).periodLabel, 'Annual · Year 2 · due 2028-09-13')
  })

  test("probation uses the employee's probationEndDate when set", () => {
    assert.equal(cycleFor(JOIN, 1, '2027-01-22').dueDate, '2027-01-22')
    assert.equal(cycleFor(JOIN, 1, null).dueDate, '2026-12-23')
  })
})

describe('nextCycleWithin — create 30 days ahead, next cycle only', () => {
  test('nothing until D-30, then the cycle', () => {
    assert.equal(nextCycleWithin(JOIN, null, '2026-11-22'), null) // D-31
    assert.equal(nextCycleWithin(JOIN, null, '2026-11-23')?.dueDate, '2026-12-23') // D-30
    assert.equal(nextCycleWithin(JOIN, null, '2026-12-23')?.reviewType, 'probation') // D-day itself
  })

  test('a long-tenured employee gets their next cycle, never a missed past one', () => {
    // joined 2020-01-01; cycles fall every 90 days — the next one after 2026-09-24
    const next = nextCycleWithin('2020-01-01', null, '2026-09-24', 400)
    assert.ok(next && next.dueDate >= '2026-09-24')
    assert.equal(nextCycleWithin('2020-01-01', null, '2026-09-24', 400)?.dueDate, next.dueDate)
    const previous = cycleFor('2020-01-01', next.cycleIndex - 1)
    assert.ok(previous.dueDate < '2026-09-24')
  })

  test('a probation longer than 180 days pushes out the quarterly it overlaps', () => {
    // probation ends 2027-04-01, after the day-180 quarterly (2027-03-23)
    const next = nextCycleWithin(JOIN, '2027-04-01', '2027-04-02', 400)
    assert.equal(next?.dueDate, '2027-06-21')
  })
})

describe('reminderStage — D-14, D-7, overdue, each once', () => {
  const DUE = '2026-12-23'
  test('stages by days left', () => {
    assert.equal(reminderStage(DUE, '2026-12-08', []), null) // D-15
    assert.equal(reminderStage(DUE, '2026-12-09', []), 'd14')
    assert.equal(reminderStage(DUE, '2026-12-16', ['d14']), 'd7')
    assert.equal(reminderStage(DUE, '2026-12-23', ['d14', 'd7']), null) // D-day, nothing new
    assert.equal(reminderStage(DUE, '2026-12-24', ['d14', 'd7']), 'overdue')
  })

  test('never double-sends', () => {
    assert.equal(reminderStage(DUE, '2026-12-10', ['d14']), null)
    assert.equal(reminderStage(DUE, '2026-12-30', ['d14', 'd7', 'overdue']), null)
  })

  test('a missed run jumps to the most urgent stage and records the earlier ones', () => {
    assert.equal(reminderStage(DUE, '2026-12-18', []), 'd7')
    assert.deepEqual(stagesThrough('d7'), ['d14', 'd7'])
    assert.deepEqual(stagesThrough('overdue'), ['d14', 'd7', 'overdue'])
  })
})

describe('canActAsPrimaryScorer — role + outlet, no account link needed', () => {
  const pinned = { primaryScorerUid: 'hint', primaryScorerRoleId: 'headChef', primaryScorerOutletId: 'nourish_ungasan' }
  test('the role holder at the pinned outlet may score', () => {
    assert.equal(canActAsPrimaryScorer(pinned, { uid: 'u2', roleId: 'headChef', outletId: 'nourish_ungasan' }), true)
  })
  test('the same role at another outlet may not', () => {
    assert.equal(canActAsPrimaryScorer(pinned, { uid: 'u3', roleId: 'headChef', outletId: 'nourish_berawa' }), false)
  })
  test('an unpinned (fallback) appraisal accepts any holder of the role', () => {
    const any = { ...pinned, primaryScorerOutletId: null }
    assert.equal(canActAsPrimaryScorer(any, { uid: 'u3', roleId: 'headChef', outletId: 'nourish_berawa' }), true)
  })
  test('a different role may not; a pre-2026-09-24 appraisal stays uid-only', () => {
    assert.equal(canActAsPrimaryScorer(pinned, { uid: 'u4', roleId: 'sousChef', outletId: 'nourish_ungasan' }), false)
    const legacy = { primaryScorerUid: 'owner' }
    assert.equal(canActAsPrimaryScorer(legacy, { uid: 'owner', roleId: 'x', outletId: null }), true)
    assert.equal(canActAsPrimaryScorer(legacy, { uid: 'other', roleId: 'headChef', outletId: null }), false)
  })
  test('scorer positions map to RBAC roles', () => {
    assert.equal(scorerRoleFor('headChef'), 'headChef')
    assert.equal(scorerRoleFor('wholefoodManager'), 'wholefoodLeader')
    assert.equal(scorerRoleFor('chiefAccounting'), 'finance')
  })
})
