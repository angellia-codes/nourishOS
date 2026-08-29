// Pins the org role ladder — src/constants/organization.ts and its backend
// mirror, plus the outlet narrowing inside `kitchen` and `wholefood_retail`.
//
//   npm --prefix functions run build
//   npm test
//
// No emulator needed. The frontend copy is read as text (it is TSX-adjacent TS
// the functions build never compiles) and compared against the compiled mirror,
// which is the pair `npm run check` cannot compare directly: the frontend
// spells its lists as ROLES.* references, not quoted strings.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { DEPARTMENT_ROLES, OUTLET_ONLY_ROLES, ROLE_PERMISSIONS, OUTLET_DEPARTMENTS, rolesFor } =
  require('../lib/lib/organization.js')

const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
const feRolesSrc = readFileSync(`${repoRoot}src/constants/roles.ts`, 'utf8')
const feOrgSrc = readFileSync(`${repoRoot}src/constants/organization.ts`, 'utf8')

/** ROLES.SOUS_CHEF -> 'sousChef', from the frontend enum. */
const ROLE_BY_KEY = Object.fromEntries(
  [...feRolesSrc.matchAll(/^\s{2}([A-Z0-9_]+):\s*'([^']+)',$/gm)].map((m) => [m[1], m[2]]),
)

/** Module-level `const NAME = ['a', 'b']` arrays, so a map entry can reference one. */
const FE_ARRAY_CONSTS = Object.fromEntries(
  [...feOrgSrc.matchAll(/^const ([A-Z0-9_]+) = \[([^\]]*)\]/gm)].map(([, name, values]) => [
    name,
    [...values.matchAll(/'([^']+)'/g)].map((m) => m[1]),
  ]),
)

function frontendMap(constName) {
  const body = feOrgSrc.slice(feOrgSrc.indexOf(`export const ${constName}`))
  const map = {}
  for (const [, key, literal, ident] of body
    .slice(0, body.indexOf('\n}'))
    .matchAll(/^ {2}([a-z_]\w*): (?:\[([^\]]*)\]|([A-Z0-9_]+)),$/gms)) {
    map[key] = ident
      ? FE_ARRAY_CONSTS[ident]
      : [...literal.matchAll(/ROLES\.([A-Z0-9_]+)|'([^']+)'/g)].map((m) => (m[1] ? ROLE_BY_KEY[m[1]] : m[2]))
    assert.ok(map[key], `${constName}.${key} did not resolve`)
  }
  return map
}

describe('org role ladder', () => {
  test('the frontend enum parsed', () => {
    assert.ok(Object.keys(ROLE_BY_KEY).length > 30, `parsed only ${Object.keys(ROLE_BY_KEY).length} roles`)
    assert.equal(ROLE_BY_KEY.SOUS_CHEF, 'sousChef')
  })

  test('DEPARTMENT_ROLES matches between the two hand-mirrored copies', () => {
    const fe = frontendMap('DEPARTMENT_ROLES')
    assert.deepEqual(Object.keys(fe).sort(), Object.keys(DEPARTMENT_ROLES).sort())
    for (const [department, roles] of Object.entries(DEPARTMENT_ROLES)) {
      assert.deepEqual(fe[department], [...roles], `${department} differs`)
    }
  })

  test('OUTLET_ONLY_ROLES matches between the two copies', () => {
    const fe = frontendMap('OUTLET_ONLY_ROLES')
    assert.deepEqual(Object.keys(fe).sort(), Object.keys(OUTLET_ONLY_ROLES).sort())
    for (const [role, outlets] of Object.entries(OUTLET_ONLY_ROLES)) {
      assert.deepEqual(fe[role], [...outlets], `${role} differs`)
    }
  })

  // The standing gotcha: registerUser refuses to seed roles/{roleId} for a role
  // with no permission set, so an offered role without one cannot register.
  test('every offered role has a ROLE_PERMISSIONS set', () => {
    const missing = [...new Set(Object.values(DEPARTMENT_ROLES).flat())].filter((r) => !ROLE_PERMISSIONS[r])
    assert.deepEqual(missing, [], `offered but unpermissioned: ${missing.join(', ')}`)
  })

  test('every outlet-restricted role is actually offered by some department', () => {
    const offered = new Set(Object.values(DEPARTMENT_ROLES).flat())
    const orphans = Object.keys(OUTLET_ONLY_ROLES).filter((r) => !offered.has(r))
    assert.deepEqual(orphans, [], `restricted but never offered: ${orphans.join(', ')}`)
  })

  test('every outlet+department pair offers at least one role', () => {
    for (const [outletId, departments] of Object.entries(OUTLET_DEPARTMENTS)) {
      for (const departmentId of departments) {
        assert.ok(rolesFor(outletId, departmentId).length > 0, `${outletId}/${departmentId} offers nothing`)
      }
    }
  })

  test('kitchen splits along the bakery/restaurant line', () => {
    assert.deepEqual(rolesFor('the_bakery_kitchen', 'kitchen'), [
      'chiefBaker',
      'chefDePartieBaker',
      'cookBaker',
    ])
    assert.deepEqual(rolesFor('nourish_uluwatu', 'kitchen'), [
      'headChef',
      'sousChef',
      'chefDePartie',
      'cook',
      'cookHelper',
      'steward',
    ])
  })

  test('only Wholefood Ungasan carries a Manager and Supervisor', () => {
    assert.deepEqual(rolesFor('wholefood_ungasan', 'wholefood_retail'), [
      'wholefoodLeader',
      'wholefoodSupervisor',
      'wholefoodCashier',
    ])
    for (const outletId of ['wholefood_uluwatu', 'wholefood_berawa']) {
      assert.deepEqual(rolesFor(outletId, 'wholefood_retail'), ['wholefoodCashier'], outletId)
    }
  })

  test('an unknown outlet or department offers nothing rather than throwing', () => {
    assert.deepEqual(rolesFor('nowhere', 'kitchen'), [])
    assert.deepEqual(rolesFor('nourish_uluwatu', 'nowhere'), [])
  })
})
