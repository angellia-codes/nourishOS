import { todayIso, addDaysIso } from '../../lib'

/**
 * training-module-spec-v1.0.md — the pure half of the module: taxonomy
 * mapping, the §6.1 gate, and due-date arithmetic. Kept free of Firestore so
 * `node functions/test/training-gate.mjs` can assert it without an emulator.
 */

export type TrainingPhase = 'onboarding' | 'upskilling'
export type RecurrenceType = 'none' | 'interval' | 'manual'
export type AssignmentStatus = 'locked' | 'assigned' | 'completed' | 'cancelled'

export interface TrainingBindingLike {
  topicId: string
  departmentId: string
  sequence: number
  prerequisiteTopicIds: string[]
  minTenureMonths: number | null
  allCoreTopics: boolean
  recurrence: { type: RecurrenceType; intervalMonths: number | null; recurrenceNote: string }
}

/**
 * §D3/O5 — the master sheet's 11 departments are a different vocabulary from
 * the app's own 14 (`src/constants/organization.ts`, mirrored in
 * lib/organization.ts), which every employee record, form and security rule
 * already validates against. Rather than migrate that, the sheet's taxonomy is
 * seeded as-is and reached through this map.
 *
 * Three app departments have no training set in the sheet at all
 * (admin_general, sales_marketing, housekeeping) and map to null: no
 * assignments are generated, which is honest, rather than borrowing another
 * department's sequence.
 */
export const TRAINING_DEPARTMENT_BY_ORG: Record<string, string | null> = {
  bar: 'dept-bar',
  fb_service: 'dept-fandb-service',
  kitchen: 'dept-kitchen',
  cashier: 'dept-cashier',
  wholefood_retail: 'dept-wholesale',
  security: 'dept-security',
  human_resources: 'dept-human-resources',
  finance_accounting: 'dept-finance-and-accounting',
  driver: 'dept-driver',
  engineering_pomec: 'dept-engineering',
  // The app has no Bakery department — bakery production staff are `kitchen`
  // at a bakery outlet — while the sheet ships 21 bakery-specific bindings.
  // central_kitchen is the app's other production-kitchen concept and is
  // staffed by no outlet today, so it points at the same set.
  central_kitchen: 'dept-bakery-kitchen',
  admin_general: null,
  sales_marketing: null,
  housekeeping: null,
}

/** The one outlet where `kitchen` means bakery production, not restaurant kitchen. */
const BAKERY_KITCHEN_OUTLET = 'the_bakery_kitchen'

/**
 * Which delivery sequence an employee is trained against. Outlet matters for
 * exactly one case: the same `kitchen` department id means restaurant kitchen
 * at a Nourish outlet and bakery production at The Bakery Kitchen, and the two
 * sheets share almost no topics.
 */
export function resolveTrainingDepartment(departmentId: string, outletId: string): string | null {
  if (departmentId === 'kitchen' && outletId === BAKERY_KITCHEN_OUTLET) return 'dept-bakery-kitchen'
  return TRAINING_DEPARTMENT_BY_ORG[departmentId] ?? null
}

export interface GateInput {
  binding: Pick<TrainingBindingLike, 'prerequisiteTopicIds' | 'minTenureMonths' | 'allCoreTopics'>
  /** Canonical topic ids this employee has already completed — any department. */
  completedTopicIds: Set<string> | string[]
  tenureMonths: number
  /** Every onboarding topic bound to this employee's department, resolved at evaluation time (§4.3). */
  deptOnboardingTopicIds: string[]
}

/**
 * §6.1 step 4. All three gate kinds must pass; a binding with none of them
 * (120 of 217) is open immediately.
 *
 * `allCoreTopics` is checked against the department's onboarding topics as
 * they are *now*, not against a list frozen at import — so adding a topic to a
 * department correctly re-locks the upskilling work behind it.
 */
export function evaluateGate({ binding, completedTopicIds, tenureMonths, deptOnboardingTopicIds }: GateInput): boolean {
  const completed = completedTopicIds instanceof Set ? completedTopicIds : new Set(completedTopicIds)

  if (binding.prerequisiteTopicIds.some((topicId) => !completed.has(topicId))) return false
  if (binding.minTenureMonths !== null && tenureMonths < binding.minTenureMonths) return false
  if (binding.allCoreTopics && deptOnboardingTopicIds.some((topicId) => !completed.has(topicId))) return false

  return true
}

/** Whole months between a 'YYYY-MM-DD' hire date and today (WITA), floored at 0. */
export function tenureMonthsSince(joinDate: string | null | undefined, from = todayIso()): number {
  if (!joinDate || !/^\d{4}-\d{2}-\d{2}$/.test(joinDate)) return 0
  const [joinYear, joinMonth, joinDay] = joinDate.split('-').map(Number)
  const [year, month, day] = from.split('-').map(Number)

  let months = (year - joinYear) * 12 + (month - joinMonth)
  if (day < joinDay) months -= 1 // the anniversary day has not come round yet
  return Math.max(0, months)
}

/**
 * How long a newly issued assignment gets. The spec says "set from
 * `recurrence`" without naming a figure; 30 days is the induction window HR
 * already works to, and `manual` bindings get no date at all — §3's
 * operational consequence is that those 31 never surface as overdue.
 */
export const ASSIGNMENT_DUE_DAYS = 30

export function dueDateFor(recurrenceType: RecurrenceType, from = todayIso()): string | null {
  return recurrenceType === 'manual' ? null : addDaysIso(ASSIGNMENT_DUE_DAYS, from)
}

/**
 * One assignment per employee per canonical topic. Deterministic so
 * re-running generation is idempotent without a query, and so a transfer
 * cannot produce a second row for a topic already completed elsewhere.
 */
export function assignmentId(employeeId: string, topicId: string): string {
  return `${employeeId}__${topicId}`
}
