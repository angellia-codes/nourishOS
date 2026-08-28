// Pins the fire-extinguisher §4.6 failure-handling rules and the period-key
// arithmetic in src/security/fireExtinguishers/helpers.ts.
//
//   npm --prefix functions run build
//   node functions/test/apar-inspection.mjs
//
// No emulator needed — validateInspectionItems / overallResultFor /
// nextInspectionDueAfter / parseRoundReferenceId are all pure. What is worth
// asserting is not the clean pass but the four rules a guard could otherwise
// walk around: a forced gauge/seal-pin service, a fail with no evidence, a
// short or duplicated item set, and a self-resolved fail still counting as a
// failure in the unit's history.
import { createRequire } from 'module'
import assert from 'assert'

const require = createRequire(import.meta.url)
const {
  APAR_CHECKLIST_ITEMS,
  validateInspectionItems,
  overallResultFor,
  nextInspectionDueAfter,
  periodMonthEnd,
  parseRoundReferenceId,
  roundReferenceId,
} = require('../lib/security/fireExtinguishers/helpers.js')

let failures = 0
function check(label, fn) {
  try {
    fn()
    console.log(`  ok   ${label}`)
  } catch (error) {
    failures += 1
    console.error(`  FAIL ${label}\n       ${error.message}`)
  }
}

/** A full six-item payload, all passing, with `overrides` applied by key. */
function payload(overrides = {}) {
  return APAR_CHECKLIST_ITEMS.map(({ key }) => ({ key, result: 'pass', ...(overrides[key] ?? {}) }))
}

console.log('validateInspectionItems (§4.6)')

check('a clean round returns all six items with null note/photo/resolution', () => {
  const items = validateInspectionItems(payload())
  assert.strictEqual(items.length, 6)
  assert.ok(items.every((item) => item.note === null && item.photoFileId === null && item.resolution === null))
  assert.strictEqual(overallResultFor(items), 'pass')
})

check('a pass cannot smuggle a resolution through', () => {
  const items = validateInspectionItems(payload({ nozzle: { result: 'pass', resolution: 'needsService', note: 'x' } }))
  const nozzle = items.find((item) => item.key === 'nozzle')
  assert.strictEqual(nozzle.resolution, null)
  assert.strictEqual(nozzle.note, null)
})

check('a gauge failure is forced to needsService even when the client asks to self-resolve', () => {
  const items = validateInspectionItems(
    payload({ pressureGauge: { result: 'fail', note: 'Needle in the red', photoFileId: 'file1', resolution: 'resolvedOnSpot' } }),
  )
  assert.strictEqual(items.find((item) => item.key === 'pressureGauge').resolution, 'needsService')
  assert.strictEqual(overallResultFor(items), 'failNeedsService')
})

check('a seal & pin failure is forced the same way', () => {
  const items = validateInspectionItems(
    payload({ sealPin: { result: 'fail', note: 'Seal broken', photoFileId: 'file1', resolution: 'resolvedOnSpot' } }),
  )
  assert.strictEqual(items.find((item) => item.key === 'sealPin').resolution, 'needsService')
})

check('an accessibility failure may be resolved on the spot — and still reads as a failure', () => {
  const items = validateInspectionItems(
    payload({ accessibility: { result: 'fail', note: 'Boxed in by crates', photoFileId: 'file1', resolution: 'resolvedOnSpot' } }),
  )
  assert.strictEqual(items.find((item) => item.key === 'accessibility').resolution, 'resolvedOnSpot')
  assert.strictEqual(overallResultFor(items), 'failResolved')
})

check('a failure with no note is rejected', () => {
  assert.throws(
    () => validateInspectionItems(payload({ nozzle: { result: 'fail', note: '  ', photoFileId: 'file1' } })),
    (error) => error.code === 'invalid-argument',
  )
})

check('a failure with no photo is rejected', () => {
  assert.throws(
    () => validateInspectionItems(payload({ nozzle: { result: 'fail', note: 'Cracked hose' } })),
    (error) => error.code === 'invalid-argument',
  )
})

check('a non-forced failure with no resolution is rejected', () => {
  assert.throws(
    () => validateInspectionItems(payload({ bodyHandle: { result: 'fail', note: 'Dented', photoFileId: 'file1' } })),
    (error) => error.code === 'invalid-argument',
  )
})

check('a short item set is rejected', () => {
  assert.throws(
    () => validateInspectionItems(payload().slice(0, 5)),
    (error) => error.code === 'invalid-argument',
  )
})

check('a duplicated item is rejected even at the right length', () => {
  const items = payload()
  items[5] = { key: items[0].key, result: 'pass' }
  assert.throws(
    () => validateInspectionItems(items),
    (error) => error.code === 'invalid-argument',
  )
})

check('an unknown item key is rejected', () => {
  const items = payload()
  items[3] = { key: 'hydrostaticStamp', result: 'pass' }
  assert.throws(
    () => validateInspectionItems(items),
    (error) => error.code === 'invalid-argument',
  )
})

check('an unknown result value is rejected', () => {
  assert.throws(
    () => validateInspectionItems(payload({ nozzle: { result: 'maybe' } })),
    (error) => error.code === 'invalid-argument',
  )
})

console.log('\nperiod keys')

check('the next inspection is due at the end of the following month', () => {
  assert.strictEqual(nextInspectionDueAfter('2026-08'), '2026-09-30')
  assert.strictEqual(nextInspectionDueAfter('2026-01'), '2026-02-28')
})

check('December rolls into the next year rather than month 13', () => {
  assert.strictEqual(nextInspectionDueAfter('2026-12'), '2027-01-31')
})

check('a leap February is 29 days', () => {
  assert.strictEqual(periodMonthEnd('2028-02'), '2028-02-29')
})

check('a round reference id round-trips', () => {
  const reference = roundReferenceId('nourish_uluwatu', '2026-08')
  assert.deepStrictEqual(parseRoundReferenceId(reference), { outletId: 'nourish_uluwatu', periodMonth: '2026-08' })
})

check('a task that is not a round is rejected rather than half-parsed', () => {
  assert.throws(
    () => parseRoundReferenceId('some-incident-id'),
    (error) => error.code === 'failed-precondition',
  )
  assert.throws(
    () => parseRoundReferenceId('not_an_outlet__2026-08'),
    (error) => error.code === 'failed-precondition',
  )
})

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll APAR inspection checks passed.')
