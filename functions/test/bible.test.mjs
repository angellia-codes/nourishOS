/**
 * Nourish's Bible — pure logic, no emulator.
 *
 *   npm --prefix functions run build
 *   npm test
 *
 * Pins nourish-bible.md §8.2's access groups (including the Phase 1
 * unlinked-user deviation), §5.1's seed counts, and §6.1's size guard.
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveBibleAccess } from '../lib/documents/bible/access.js'
import { buildEdition, expandMenuSeed, EDITION_MAX_BYTES } from '../lib/documents/bible/edition.js'
import { MENU_SEED } from '../lib/documents/bible/menuSeed.js'

const user = (roleId, departmentId, outletId) => ({ roleId, departmentId, outletId })
const permanent = { employmentStatus: 'PKWTT', position: 'demiChef' }

describe('resolveBibleAccess — §8.2', () => {
  test('leadership sees every recipe, even unlinked', () => {
    for (const role of ['restaurantManager', 'hrManager', 'generalManager', 'director', 'superAdmin']) {
      assert.deepEqual(resolveBibleAccess(user(role, null, null), null), { menuOnly: false, recipeOwners: ['kitchen', 'bar', 'bakery'] })
    }
  })

  test('a cook at a restaurant gets Kitchen only', () => {
    assert.deepEqual(resolveBibleAccess(user('demiChef', 'kitchen', 'nourish_uluwatu'), permanent).recipeOwners, ['kitchen'])
  })

  test('kitchen at The Bakery Kitchen is Bakery, not Kitchen', () => {
    assert.deepEqual(resolveBibleAccess(user('baker', 'kitchen', 'the_bakery_kitchen'), permanent).recipeOwners, ['bakery'])
  })

  test('Central Kitchen sits under Kitchen (D14)', () => {
    assert.deepEqual(resolveBibleAccess(user('cookHelper', 'central_kitchen', 'nourish_ungasan'), permanent).recipeOwners, ['kitchen'])
  })

  test('bar staff get Bar at any outlet', () => {
    assert.deepEqual(resolveBibleAccess(user('barista', 'bar', 'the_bakery_uluwatu'), permanent).recipeOwners, ['bar'])
  })

  test('floor staff get no recipes but are not menu-only', () => {
    assert.deepEqual(resolveBibleAccess(user('waiter', 'fb_service', 'nourish_berawa'), permanent), { menuOnly: false, recipeOwners: [] })
  })

  test('a Daily Worker in Kitchen is menu-only with no recipes (D9)', () => {
    const dw = { employmentStatus: 'dailyWorker', position: 'dailyWorker' }
    assert.deepEqual(resolveBibleAccess(user('cookHelper', 'kitchen', 'nourish_uluwatu'), dw), { menuOnly: true, recipeOwners: [] })
  })

  test('OJT status or a trainee position is menu-only', () => {
    assert.equal(resolveBibleAccess(user('waiter', 'fb_service', 'nourish_berawa'), { employmentStatus: 'ojt', position: 'waiter' }).menuOnly, true)
    assert.equal(resolveBibleAccess(user('barista', 'bar', 'nourish_berawa'), { employmentStatus: 'PKWT', position: 'trainee' }).menuOnly, true)
  })

  test('an unlinked non-leader is full staff but gets no recipes (Phase 1 deviation)', () => {
    assert.deepEqual(resolveBibleAccess(user('demiChef', 'kitchen', 'nourish_uluwatu'), null), { menuOnly: false, recipeOwners: [] })
  })
})

describe('MENU_SEED — §5.1', () => {
  const { categories, items } = expandMenuSeed(MENU_SEED)
  const count = (owner) => items.filter((item) => item.owner === owner).length

  test('29 categories and 233 items', () => {
    assert.equal(categories.length, 29)
    assert.equal(items.length, 233)
  })

  test('per-owner totals: Kitchen 71, Bar 129, Bakery 33', () => {
    assert.equal(count('kitchen'), 71)
    assert.equal(count('bar'), 129)
    assert.equal(count('bakery'), 33)
  })

  test('codes run without gaps per owner', () => {
    for (const [owner, prefix, total] of [['kitchen', 'KIT', 71], ['bar', 'BAR', 129], ['bakery', 'TBK', 33]]) {
      const codes = items.filter((item) => item.owner === owner).map((item) => item.itemCode).sort()
      assert.deepEqual(codes, Array.from({ length: total }, (_, i) => `${prefix}-${String(i + 1).padStart(3, '0')}`))
    }
  })

  test('pizzas are Small/Large in whole rupiah; wine doubles stay unlabelled (D7)', () => {
    const margherita = items.find((item) => item.itemCode === 'KIT-062')
    assert.deepEqual(margherita.prices, [{ label: 'Small', amount: 60000 }, { label: 'Large', amount: 85000 }])
    const wine = items.find((item) => item.itemCode === 'BAR-104')
    assert.deepEqual(wine.prices.map((p) => p.label), [null, null])
  })

  test('a code that does not match its owner is rejected', () => {
    assert.throws(
      () => expandMenuSeed([{ id: 'x', label: 'X', group: 'food', owner: 'bar', servingHours: null, note: null, items: [{ code: 'KIT-001', name: 'x', price: 1 }] }]),
      /BAR-NNN/,
    )
  })
})

describe('buildEdition — §6.1', () => {
  test('the real menu compiles well under the limit', () => {
    const { categories, items } = expandMenuSeed(MENU_SEED)
    const body = buildEdition({ categories, items, content: [], editionNumber: 1, publishedBy: 'test' })
    assert.ok(Buffer.byteLength(JSON.stringify(body)) < EDITION_MAX_BYTES / 4)
  })

  test('an oversized edition fails and names the size', () => {
    const { categories, items } = expandMenuSeed(MENU_SEED)
    const padded = items.map((item) => ({ ...item, description: 'x'.repeat(5000) }))
    assert.throws(() => buildEdition({ categories, items: padded, content: [], editionNumber: 2, publishedBy: 'test' }), /KB, over the 900 KB limit/)
  })
})
