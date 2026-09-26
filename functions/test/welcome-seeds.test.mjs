/**
 * Pins the welcome-content seed data — no emulator, same shape as
 * milestone-match.test.mjs.
 *
 *   npm --prefix functions run build
 *   npm test
 *
 * welcomeSeeds.ts is content, so tsc can only see that the shapes are right.
 * What it cannot see is a missing Indonesian string: §7.4 requires every label
 * to be an {id, en} pair, and a blank `id` renders as empty space for exactly
 * the audience most of these hires belong to. These assertions are what makes
 * editing the copy safe.
 */
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { WELCOME_CONTENT_SEEDS } from '../lib/hr/welcome/welcomeSeeds.js'
import { WELCOME_SECTIONS } from '../lib/hr/welcome/content.js'

const bilingual = (pair, where) => {
  assert.equal(typeof pair?.en, 'string', `${where}: en must be a string`)
  assert.equal(typeof pair?.id, 'string', `${where}: id must be a string`)
  assert.ok(pair.en.trim().length > 0, `${where}: en is empty`)
  assert.ok(pair.id.trim().length > 0, `${where}: id is empty`)
}

describe('WELCOME_CONTENT_SEEDS', () => {
  test('covers exactly the four HR-editable sections', () => {
    assert.deepEqual(Object.keys(WELCOME_CONTENT_SEEDS).sort(), [...WELCOME_SECTIONS].sort())
  })

  test('every guide block is bilingual', () => {
    for (const section of ['attendanceGuide', 'dosAndDonts']) {
      const { blocks } = WELCOME_CONTENT_SEEDS[section]
      assert.ok(blocks.length > 0, `${section} has no blocks`)
      blocks.forEach((block, index) => {
        bilingual(block.heading, `${section}.blocks[${index}].heading`)
        bilingual(block.body, `${section}.blocks[${index}].body`)
      })
    }
  })

  test('every attendance code in the taxonomy is explained', () => {
    const codes = ['WD', 'DO', 'PH', 'DP', 'AL', 'MC', 'EO', 'SL', 'UL']
    const body = WELCOME_CONTENT_SEEDS.attendanceGuide.blocks.map((block) => block.body.en).join('\n')
    for (const code of codes) {
      assert.match(body, new RegExp(`\\b${code} —`), `attendance guide never explains ${code}`)
    }
  })

  test('menu categories are bilingual, and carry no invented item', () => {
    const { categories } = WELCOME_CONTENT_SEEDS.menu
    assert.ok(categories.length > 0)
    categories.forEach((category, index) => {
      bilingual(category.title, `menu.categories[${index}].title`)
      assert.deepEqual(category.items, [], `menu.categories[${index}] must ship empty — see welcomeSeeds.ts`)
    })
  })

  test('the org chart seeds a caption and a real image url', () => {
    bilingual(WELCOME_CONTENT_SEEDS.orgChart.caption, 'orgChart.caption')
    assert.ok(WELCOME_CONTENT_SEEDS.orgChart.imageUrl.trim().length > 0, 'orgChart.imageUrl is empty')
  })
})
