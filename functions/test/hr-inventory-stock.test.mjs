// Pins applyDelta in src/hr/inventory/helpers.ts — the one piece of real
// logic every hrInventory callable (receiveStock/issueStock/transferStock)
// runs inside its transaction.
//
//   npm --prefix functions run build
//   npm test
//
// No emulator needed — applyDelta is pure (current, delta) -> next. Transfer
// is exercised as two applyDelta calls, the same way transferStock.ts composes
// them, to confirm the total across both outlets never changes.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { applyDelta, mergeLevelDeltas } = require('../lib/hr/inventory/helpers.js')

const isFailedPrecondition = (error) => error.code === 'failed-precondition'

describe('applyDelta', () => {
  test('receive increases stock from 0', () => {
    assert.equal(applyDelta(0, 20), 20)
  })

  test('issue below on-hand succeeds', () => {
    assert.equal(applyDelta(15, -5), 10)
  })

  test('issue exactly to 0 succeeds', () => {
    assert.equal(applyDelta(5, -5), 0)
  })

  test('issue beyond on-hand throws failed-precondition', () => {
    assert.throws(() => applyDelta(5, -999), isFailedPrecondition)
  })
})

describe('transfer, composed the way transferStock.ts composes it', () => {
  test('moves quantity between two outlets and preserves the total', () => {
    const sourceBefore = 20
    const destBefore = 5
    const quantity = 10

    const sourceAfter = applyDelta(sourceBefore, -quantity)
    const destAfter = applyDelta(destBefore, quantity)

    assert.equal(sourceAfter, 10)
    assert.equal(destAfter, 15)
    assert.equal(sourceBefore + destBefore, sourceAfter + destAfter)
  })

  test('an outlet with insufficient stock throws before either side is written', () => {
    assert.throws(() => applyDelta(3, -10), isFailedPrecondition)
  })
})

// mergeLevelDeltas is what lets updateStockMovement reverse the old effect and
// apply the new one in a single transaction: Firestore forbids reading a doc
// after writing it, so two deltas on the same (item, outlet, size) must collapse
// to one read and one write before either touches the level.
describe('mergeLevelDeltas', () => {
  const at = (sizeVariant, delta) => ({ itemId: 'i1', outletId: 'hr_store', sizeVariant, delta })

  test('collapses two deltas on the same level into their net', () => {
    // Edit: an 8-unit receive corrected to 5, same size.
    const merged = mergeLevelDeltas([at('M', -8), at('M', 5)])
    assert.equal(merged.length, 1)
    assert.equal(merged[0].delta, -3)
  })

  test('keeps deltas on different sizes apart', () => {
    // Edit: 8 units received under M actually belong under L.
    const merged = mergeLevelDeltas([at('M', -8), at('L', 8)])
    assert.equal(merged.length, 2)
    assert.deepEqual(
      merged.map((entry) => [entry.sizeVariant, entry.delta]),
      [['M', -8], ['L', 8]],
    )
  })

  test('an unsized item is its own bucket, distinct from any size label', () => {
    const merged = mergeLevelDeltas([at(null, -3), at('M', 3)])
    assert.equal(merged.length, 2)
  })

  test('keeps deltas on different outlets apart', () => {
    // Void of a paired transfer: both legs reverse, at opposite ends.
    const merged = mergeLevelDeltas([
      { itemId: 'i1', outletId: 'hr_store', sizeVariant: 'M', delta: 5 },
      { itemId: 'i1', outletId: 'nourish_uluwatu', sizeVariant: 'M', delta: -5 },
    ])
    assert.equal(merged.length, 2)
  })

  test('a no-op edit nets to zero rather than dropping the entry', () => {
    const merged = mergeLevelDeltas([at('M', -5), at('M', 5)])
    assert.equal(merged.length, 1)
    assert.equal(merged[0].delta, 0)
  })
})

// A void reverses quantityDelta; applyDelta is what stops it going negative.
describe('void, composed the way voidStockMovement.ts composes it', () => {
  test('reversing a receive removes exactly what it added', () => {
    assert.equal(applyDelta(applyDelta(0, 20), -20), 0)
  })

  test('reversing an issue puts the stock back', () => {
    assert.equal(applyDelta(10, 4), 14)
  })

  test('reversing a transferIn whose stock was issued onward throws', () => {
    // 5 transferred in, 3 issued out at the destination, then the transfer voided.
    assert.throws(() => applyDelta(2, -5), isFailedPrecondition)
  })
})
