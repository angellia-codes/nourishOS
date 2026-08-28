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
const { applyDelta } = require('../lib/hr/inventory/helpers.js')

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
