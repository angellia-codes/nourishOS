// Pins the WITA (Asia/Makassar, UTC+8) date-key helpers in src/lib/timestamps.ts.
//
//   npm --prefix functions run build
//   node functions/test/timestamps.mjs
//
// No emulator needed — these are pure functions. The case that matters is the
// 00:00–08:00 WITA window, where the UTC clock still reports the previous day:
// that is the bug this helper exists to prevent, so it is asserted directly.
import { createRequire } from 'module'
import assert from 'assert'

const require = createRequire(import.meta.url)
const { todayIso, addDaysIso, currentBusinessYear, BUSINESS_TIME_ZONE } = require('../lib/lib/timestamps.js')

let failures = 0
function check(label, actual, expected) {
  try {
    assert.strictEqual(actual, expected)
    console.log(`✓ ${label}`)
  } catch {
    failures += 1
    console.error(`✗ ${label} — expected ${expected}, got ${actual}`)
  }
}

check('time zone is Makassar', BUSINESS_TIME_ZONE, 'Asia/Makassar')

// 16:30 UTC on the 13th is 00:30 WITA on the 14th — the whole point of the helper.
check('post-16:00 UTC rolls to the next WITA day', todayIso(new Date('2026-08-13T16:30:00Z')), '2026-08-14')

// 23:00 UTC on the 12th is 07:00 WITA on the 13th — a morning daily report.
check('pre-08:00 WITA still reports the WITA day', todayIso(new Date('2026-08-12T23:00:00Z')), '2026-08-13')

// 15:59 UTC is 23:59 WITA the same day — the last minute before the roll.
check('last minute before the roll', todayIso(new Date('2026-08-13T15:59:00Z')), '2026-08-13')

check('current year agrees with the WITA date key', currentBusinessYear(), Number(todayIso().slice(0, 4)))
check('addDays crosses a month end', addDaysIso(1, '2026-08-31'), '2026-09-01')
check('addDays crosses a year end', addDaysIso(1, '2026-12-31'), '2027-01-01')
check('addDays handles a leap day', addDaysIso(1, '2028-02-28'), '2028-02-29')
check('addDays with the 7-day retention window', addDaysIso(7, '2026-08-28'), '2026-09-04')

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll timestamp checks passed.')
