// Pins the WITA (Asia/Makassar, UTC+8) date-key helpers in src/lib/timestamps.ts.
//
//   npm --prefix functions run build
//   npm test
//
// No emulator needed — these are pure functions. The case that matters is the
// 00:00–08:00 WITA window, where the UTC clock still reports the previous day:
// that is the bug this helper exists to prevent, so it is asserted directly.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { todayIso, addDaysIso, currentBusinessYear, BUSINESS_TIME_ZONE } = require('../lib/lib/timestamps.js')

describe('WITA date keys', () => {
  test('time zone is Makassar', () => {
    assert.equal(BUSINESS_TIME_ZONE, 'Asia/Makassar')
  })

  test('post-16:00 UTC rolls to the next WITA day', () => {
    // 16:30 UTC on the 13th is 00:30 WITA on the 14th — the whole point of the helper.
    assert.equal(todayIso(new Date('2026-08-13T16:30:00Z')), '2026-08-14')
  })

  test('pre-08:00 WITA still reports the WITA day', () => {
    // 23:00 UTC on the 12th is 07:00 WITA on the 13th — a morning daily report.
    assert.equal(todayIso(new Date('2026-08-12T23:00:00Z')), '2026-08-13')
  })

  test('last minute before the roll', () => {
    // 15:59 UTC is 23:59 WITA the same day.
    assert.equal(todayIso(new Date('2026-08-13T15:59:00Z')), '2026-08-13')
  })

  test('current year agrees with the WITA date key', () => {
    assert.equal(currentBusinessYear(), Number(todayIso().slice(0, 4)))
  })
})

describe('addDaysIso', () => {
  test('crosses a month end', () => {
    assert.equal(addDaysIso(1, '2026-08-31'), '2026-09-01')
  })

  test('crosses a year end', () => {
    assert.equal(addDaysIso(1, '2026-12-31'), '2027-01-01')
  })

  test('handles a leap day', () => {
    assert.equal(addDaysIso(1, '2028-02-28'), '2028-02-29')
  })

  test('the 7-day retention window', () => {
    assert.equal(addDaysIso(7, '2026-08-28'), '2026-09-04')
  })
})
