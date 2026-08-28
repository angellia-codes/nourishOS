// Pins the prerequisite gate, the department mapping and the due-date rule in
// src/hr/training/trainingCatalog.ts, plus the integrity of the seed data the
// whole module is built on (training-module-spec-v1.0.md §3, §6.1, §D3).
//
//   npm --prefix functions run build
//   node functions/test/training-gate.mjs
//
// No emulator needed — everything asserted here is pure. The seed checks are
// included because a broken prerequisite reference would surface as a topic
// nobody can ever unlock, months after import, with nothing to point at.
import { createRequire } from 'module'
import assert from 'assert'

const require = createRequire(import.meta.url)
const {
  evaluateGate,
  resolveTrainingDepartment,
  tenureMonthsSince,
  dueDateFor,
  assignmentId,
  TRAINING_DEPARTMENT_BY_ORG,
} = require('../lib/hr/training/trainingCatalog.js')
const seed = require('../lib/hr/training/seedData/training-seed-data.json')

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

const openBinding = { prerequisiteTopicIds: [], minTenureMonths: null, allCoreTopics: false }

console.log('evaluateGate (§6.1)')

check('a binding with no gate is open immediately', () => {
  assert.strictEqual(
    evaluateGate({ binding: openBinding, completedTopicIds: [], tenureMonths: 0, deptOnboardingTopicIds: ['a', 'b'] }),
    true,
  )
})

check('an unmet prerequisite keeps it locked', () => {
  const binding = { ...openBinding, prerequisiteTopicIds: ['trn-a', 'trn-b'] }
  assert.strictEqual(
    evaluateGate({ binding, completedTopicIds: ['trn-a'], tenureMonths: 99, deptOnboardingTopicIds: [] }),
    false,
  )
})

check('every prerequisite completed opens it', () => {
  const binding = { ...openBinding, prerequisiteTopicIds: ['trn-a', 'trn-b'] }
  assert.strictEqual(
    evaluateGate({ binding, completedTopicIds: ['trn-b', 'trn-a'], tenureMonths: 0, deptOnboardingTopicIds: [] }),
    true,
  )
})

check('a tenure gate holds until the month count is reached', () => {
  const binding = { ...openBinding, minTenureMonths: 3 }
  const args = { binding, completedTopicIds: [], deptOnboardingTopicIds: [] }
  assert.strictEqual(evaluateGate({ ...args, tenureMonths: 2 }), false)
  assert.strictEqual(evaluateGate({ ...args, tenureMonths: 3 }), true)
})

check('allCoreTopics needs every onboarding topic in the department, not just the prerequisites', () => {
  const binding = { ...openBinding, allCoreTopics: true }
  const deptOnboardingTopicIds = ['trn-a', 'trn-b', 'trn-c']
  assert.strictEqual(
    evaluateGate({ binding, completedTopicIds: ['trn-a', 'trn-b'], tenureMonths: 99, deptOnboardingTopicIds }),
    false,
  )
  assert.strictEqual(
    evaluateGate({ binding, completedTopicIds: deptOnboardingTopicIds, tenureMonths: 99, deptOnboardingTopicIds }),
    true,
  )
})

check('a Set and an array of completed ids behave identically', () => {
  const binding = { ...openBinding, prerequisiteTopicIds: ['trn-a'] }
  const args = { binding, tenureMonths: 0, deptOnboardingTopicIds: [] }
  assert.strictEqual(evaluateGate({ ...args, completedTopicIds: new Set(['trn-a']) }), true)
  assert.strictEqual(evaluateGate({ ...args, completedTopicIds: ['trn-a'] }), true)
})

console.log('\ndepartment mapping (§D3)')

check('the app taxonomy maps onto the sheet taxonomy', () => {
  assert.strictEqual(resolveTrainingDepartment('bar', 'nourish_uluwatu'), 'dept-bar')
  assert.strictEqual(resolveTrainingDepartment('fb_service', 'nourish_berawa'), 'dept-fandb-service')
  assert.strictEqual(resolveTrainingDepartment('wholefood_retail', 'wholefood_ungasan'), 'dept-wholesale')
})

check('kitchen resolves by outlet — restaurant kitchen vs bakery production', () => {
  assert.strictEqual(resolveTrainingDepartment('kitchen', 'nourish_ungasan'), 'dept-kitchen')
  assert.strictEqual(resolveTrainingDepartment('kitchen', 'the_bakery_kitchen'), 'dept-bakery-kitchen')
})

check('departments with no set in the sheet map to null rather than borrowing one', () => {
  for (const departmentId of ['admin_general', 'sales_marketing', 'housekeeping']) {
    assert.strictEqual(resolveTrainingDepartment(departmentId, 'boh_nourish_group'), null)
  }
  assert.strictEqual(resolveTrainingDepartment('not_a_department', 'nourish_uluwatu'), null)
})

check('every mapped target exists in the seeded departments', () => {
  const seeded = new Set(seed.departments.map((department) => department.id))
  for (const [orgId, trainingId] of Object.entries(TRAINING_DEPARTMENT_BY_ORG)) {
    if (trainingId === null) continue
    assert.ok(seeded.has(trainingId), `${orgId} maps to ${trainingId}, which is not seeded`)
  }
})

check('every seeded department is reachable from some app department', () => {
  const mapped = new Set(Object.values(TRAINING_DEPARTMENT_BY_ORG).filter(Boolean))
  for (const department of seed.departments) {
    assert.ok(mapped.has(department.id), `${department.id} has no app department pointing at it`)
  }
})

console.log('\ntenure and due dates')

check('tenure counts whole months and does not credit the part-month', () => {
  assert.strictEqual(tenureMonthsSince('2026-01-15', '2026-04-14'), 2)
  assert.strictEqual(tenureMonthsSince('2026-01-15', '2026-04-15'), 3)
  assert.strictEqual(tenureMonthsSince('2025-08-31', '2026-08-31'), 12)
})

check('a missing or malformed hire date is 0 months, never negative or NaN', () => {
  assert.strictEqual(tenureMonthsSince(undefined), 0)
  assert.strictEqual(tenureMonthsSince('not-a-date'), 0)
  assert.strictEqual(tenureMonthsSince('2027-01-01', '2026-01-01'), 0)
})

check('manual bindings get no due date — §3, they never surface as overdue', () => {
  assert.strictEqual(dueDateFor('manual', '2026-08-26'), null)
  assert.strictEqual(dueDateFor('none', '2026-08-26'), '2026-09-25')
  assert.strictEqual(dueDateFor('interval', '2026-12-20'), '2027-01-19')
})

check('assignment ids are deterministic per employee and canonical topic', () => {
  assert.strictEqual(assignmentId('emp1', 'trn-a'), 'emp1__trn-a')
})

console.log('\nseed data integrity (§3)')

check('the ingestion counts are what the spec claims', () => {
  assert.strictEqual(seed.departments.length, 11)
  assert.strictEqual(seed.trainingTopics.length, 197)
  assert.strictEqual(seed.trainingBindings.length, 217)
})

check('every binding resolves to a real topic and a real department', () => {
  const topicIds = new Set(seed.trainingTopics.map((topic) => topic.id))
  const departmentIds = new Set(seed.departments.map((department) => department.id))
  for (const binding of seed.trainingBindings) {
    assert.ok(topicIds.has(binding.topicId), `${binding.id} points at missing topic ${binding.topicId}`)
    assert.ok(departmentIds.has(binding.departmentId), `${binding.id} points at missing department ${binding.departmentId}`)
  }
})

check('every prerequisite resolves — an unresolvable one is a topic nobody could ever unlock', () => {
  const topicIds = new Set(seed.trainingTopics.map((topic) => topic.id))
  for (const binding of seed.trainingBindings) {
    for (const prerequisiteId of binding.prerequisiteTopicIds) {
      assert.ok(topicIds.has(prerequisiteId), `${binding.id} requires missing topic ${prerequisiteId}`)
    }
  }
})

check('no binding lists itself as its own prerequisite', () => {
  for (const binding of seed.trainingBindings) {
    assert.ok(!binding.prerequisiteTopicIds.includes(binding.topicId), `${binding.id} depends on itself`)
  }
})

check('a prerequisite is always bound to the same department, earlier in the sequence', () => {
  const byDepartment = new Map()
  for (const binding of seed.trainingBindings) {
    if (!byDepartment.has(binding.departmentId)) byDepartment.set(binding.departmentId, [])
    byDepartment.get(binding.departmentId).push(binding)
  }
  for (const [departmentId, bindings] of byDepartment) {
    const sequenceByTopic = new Map(bindings.map((binding) => [binding.topicId, binding.sequence]))
    for (const binding of bindings) {
      for (const prerequisiteId of binding.prerequisiteTopicIds) {
        const prerequisiteSequence = sequenceByTopic.get(prerequisiteId)
        assert.ok(
          prerequisiteSequence !== undefined,
          `${binding.id} requires ${prerequisiteId}, which ${departmentId} does not deliver`,
        )
        assert.ok(prerequisiteSequence < binding.sequence, `${binding.id} requires a topic delivered after it`)
      }
    }
  }
})

check('ids are unique in all three collections', () => {
  for (const [name, rows] of Object.entries(seed)) {
    assert.strictEqual(new Set(rows.map((row) => row.id)).size, rows.length, `${name} has duplicate ids`)
  }
})

check('phase and recurrence use only the values the model allows', () => {
  for (const topic of seed.trainingTopics) {
    assert.ok(['onboarding', 'upskilling'].includes(topic.phase), `${topic.id} has phase ${topic.phase}`)
    assert.ok(topic.durationMinutes > 0, `${topic.id} has no duration`)
  }
  for (const binding of seed.trainingBindings) {
    assert.ok(
      ['none', 'interval', 'manual'].includes(binding.recurrence.type),
      `${binding.id} has recurrence ${binding.recurrence.type}`,
    )
    if (binding.recurrence.type === 'interval') {
      assert.ok(binding.recurrence.intervalMonths > 0, `${binding.id} is interval with no intervalMonths`)
    }
  }
})

check('a new Bar hire opens exactly the topics with no gate (§6.1 expected shape)', () => {
  const barBindings = seed.trainingBindings.filter((binding) => binding.departmentId === 'dept-bar')
  const deptOnboardingTopicIds = barBindings
    .filter((binding) => seed.trainingTopics.find((topic) => topic.id === binding.topicId)?.phase === 'onboarding')
    .map((binding) => binding.topicId)

  const open = barBindings.filter((binding) =>
    evaluateGate({ binding, completedTopicIds: [], tenureMonths: 0, deptOnboardingTopicIds }),
  )
  assert.ok(open.length > 0 && open.length < barBindings.length, 'a fresh hire should have some open and some locked')
  assert.ok(
    open.every((binding) => binding.prerequisiteTopicIds.length === 0 && !binding.allCoreTopics && !binding.minTenureMonths),
    'only ungated bindings should open for a day-one hire',
  )
})

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`)
  process.exit(1)
}
console.log('\nAll training gate + seed checks passed.')
