// Pins applyDelta in src/hr/inventory/helpers.ts — the one piece of real
// logic every hrInventory callable (receiveStock/issueStock/transferStock)
// runs inside its transaction.
//
//   npm --prefix functions run build
//   node functions/test/hr-inventory-stock.mjs
//
// No emulator needed — applyDelta is pure (current, delta) -> next. Transfer
// is exercised as two applyDelta calls, the same way transferStock.ts composes
// them, to confirm the total across both outlets never changes.
import { createRequire } from 'module'
import assert from 'assert'

const require = createRequire(import.meta.url)
const { applyDelta } = require('../lib/hr/inventory/helpers.js')

let failures = 0
function check(label, fn) {
  try {
    fn()
    console.log(`✓ ${label}`)
  } catch (error) {
    failures += 1
    console.error(`✗ ${label} — ${error.message}`)
  }
}

check('receive increases stock from 0', () => {
  assert.strictEqual(applyDelta(0, 20), 20)
})

check('issue below on-hand succeeds', () => {
  assert.strictEqual(applyDelta(15, -5), 10)
})

check('issue exactly to 0 succeeds', () => {
  assert.strictEqual(applyDelta(5, -5), 0)
})

check('issue beyond on-hand throws failed-precondition', () => {
  assert.throws(() => applyDelta(5, -999), (error) => error.code === 'failed-precondition')
})

check('transfer moves quantity between two outlets and preserves the total', () => {
  const sourceBefore = 20
  const destBefore = 5
  const quantity = 10

  const sourceAfter = applyDelta(sourceBefore, -quantity)
  const destAfter = applyDelta(destBefore, quantity)

  assert.strictEqual(sourceAfter, 10)
  assert.strictEqual(destAfter, 15)
  assert.strictEqual(sourceBefore + destBefore, sourceAfter + destAfter)
})

check('transfer from an outlet with insufficient stock throws before either side is written', () => {
  const sourceBefore = 3
  const quantity = 10
  assert.throws(() => applyDelta(sourceBefore, -quantity), (error) => error.code === 'failed-precondition')
})

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll HR inventory stock checks passed.')
