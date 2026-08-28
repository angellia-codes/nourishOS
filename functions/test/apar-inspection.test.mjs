// Pins the fire-extinguisher §4.6 failure-handling rules and the period-key
// arithmetic in src/security/fireExtinguishers/helpers.ts.
//
//   npm --prefix functions run build
//   npm test
//
// No emulator needed — validateInspectionItems / overallResultFor /
// nextInspectionDueAfter / parseRoundReferenceId are all pure. What is worth
// asserting is not the clean pass but the four rules a guard could otherwise
// walk around: a forced gauge/seal-pin service, a fail with no evidence, a
// short or duplicated item set, and a self-resolved fail still counting as a
// failure in the unit's history.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

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

const isInvalidArgument = (error) => error.code === 'invalid-argument'

/** A full six-item payload, all passing, with `overrides` applied by key. */
function payload(overrides = {}) {
  return APAR_CHECKLIST_ITEMS.map(({ key }) => ({ key, result: 'pass', ...(overrides[key] ?? {}) }))
}

describe('validateInspectionItems (§4.6)', () => {
  test('a clean round returns all six items with null note/photo/resolution', () => {
    const items = validateInspectionItems(payload())
    assert.equal(items.length, 6)
    assert.ok(items.every((item) => item.note === null && item.photoFileId === null && item.resolution === null))
    assert.equal(overallResultFor(items), 'pass')
  })

  test('a pass cannot smuggle a resolution through', () => {
    const items = validateInspectionItems(payload({ nozzle: { result: 'pass', resolution: 'needsService', note: 'x' } }))
    const nozzle = items.find((item) => item.key === 'nozzle')
    assert.equal(nozzle.resolution, null)
    assert.equal(nozzle.note, null)
  })

  test('a gauge failure is forced to needsService even when the client asks to self-resolve', () => {
    const items = validateInspectionItems(
      payload({
        pressureGauge: {
          result: 'fail',
          note: 'Needle in the red',
          photoFileId: 'file1',
          resolution: 'resolvedOnSpot',
        },
      }),
    )
    assert.equal(items.find((item) => item.key === 'pressureGauge').resolution, 'needsService')
    assert.equal(overallResultFor(items), 'failNeedsService')
  })

  test('a seal & pin failure is forced the same way', () => {
    const items = validateInspectionItems(
      payload({ sealPin: { result: 'fail', note: 'Seal broken', photoFileId: 'file1', resolution: 'resolvedOnSpot' } }),
    )
    assert.equal(items.find((item) => item.key === 'sealPin').resolution, 'needsService')
  })

  test('an accessibility failure may be resolved on the spot — and still reads as a failure', () => {
    const items = validateInspectionItems(
      payload({
        accessibility: {
          result: 'fail',
          note: 'Boxed in by crates',
          photoFileId: 'file1',
          resolution: 'resolvedOnSpot',
        },
      }),
    )
    assert.equal(items.find((item) => item.key === 'accessibility').resolution, 'resolvedOnSpot')
    assert.equal(overallResultFor(items), 'failResolved')
  })

  test('a failure with no note is rejected', () => {
    assert.throws(
      () => validateInspectionItems(payload({ nozzle: { result: 'fail', note: '  ', photoFileId: 'file1' } })),
      isInvalidArgument,
    )
  })

  test('a failure with no photo is rejected', () => {
    assert.throws(
      () => validateInspectionItems(payload({ nozzle: { result: 'fail', note: 'Cracked hose' } })),
      isInvalidArgument,
    )
  })

  test('a non-forced failure with no resolution is rejected', () => {
    assert.throws(
      () => validateInspectionItems(payload({ bodyHandle: { result: 'fail', note: 'Dented', photoFileId: 'file1' } })),
      isInvalidArgument,
    )
  })

  test('a short item set is rejected', () => {
    assert.throws(() => validateInspectionItems(payload().slice(0, 5)), isInvalidArgument)
  })

  test('a duplicated item is rejected even at the right length', () => {
    const items = payload()
    items[5] = { key: items[0].key, result: 'pass' }
    assert.throws(() => validateInspectionItems(items), isInvalidArgument)
  })

  test('an unknown item key is rejected', () => {
    const items = payload()
    items[3] = { key: 'hydrostaticStamp', result: 'pass' }
    assert.throws(() => validateInspectionItems(items), isInvalidArgument)
  })

  test('an unknown result value is rejected', () => {
    assert.throws(() => validateInspectionItems(payload({ nozzle: { result: 'maybe' } })), isInvalidArgument)
  })
})

describe('period keys', () => {
  test('the next inspection is due at the end of the following month', () => {
    assert.equal(nextInspectionDueAfter('2026-08'), '2026-09-30')
    assert.equal(nextInspectionDueAfter('2026-01'), '2026-02-28')
  })

  test('December rolls into the next year rather than month 13', () => {
    assert.equal(nextInspectionDueAfter('2026-12'), '2027-01-31')
  })

  test('a leap February is 29 days', () => {
    assert.equal(periodMonthEnd('2028-02'), '2028-02-29')
  })

  test('a round reference id round-trips', () => {
    const reference = roundReferenceId('nourish_uluwatu', '2026-08')
    assert.deepEqual(parseRoundReferenceId(reference), { outletId: 'nourish_uluwatu', periodMonth: '2026-08' })
  })

  test('a task that is not a round is rejected rather than half-parsed', () => {
    const isFailedPrecondition = (error) => error.code === 'failed-precondition'
    assert.throws(() => parseRoundReferenceId('some-incident-id'), isFailedPrecondition)
    assert.throws(() => parseRoundReferenceId('not_an_outlet__2026-08'), isFailedPrecondition)
  })
})
