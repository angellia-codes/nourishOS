import { POSITIONS, POSITION_LABELS } from './positions'
import type { AppraisalReviewType, AppraisalSubject } from '@/types'

/**
 * Seed content for `appraisalTemplates`. Not written to Firestore by this
 * file directly — a Cloud Function seed script (Milestone 3) consumes this
 * array on first deploy. Kept here, typed, so the content itself can be
 * reviewed/edited in code review before anything touches the database.
 *
 * Each (positionId, reviewType) pair is authored independently — no
 * inheritance between probation/quarterly/annual, per the confirmed
 * decision that review types use genuinely different criteria:
 *   - probation  -> foundational/onboarding readiness
 *   - quarterly  -> day-to-day operational performance
 *   - annual     -> year-round consistency + growth/leadership potential
 */

export interface AppraisalTemplateSeed {
  positionId: (typeof POSITIONS)[keyof typeof POSITIONS]
  positionLabel: string
  reviewType: AppraisalReviewType
  subjects: AppraisalSubject[]
}

function subjects(list: [string, string][]): AppraisalSubject[] {
  return list.map(([subjectId, label]) => ({ subjectId, label }))
}

export const APPRAISAL_TEMPLATE_SEEDS: AppraisalTemplateSeed[] = [
  // ---------------------------------------------------------------- Waiter
  {
    positionId: POSITIONS.WAITER,
    positionLabel: POSITION_LABELS.waiter,
    reviewType: 'probation',
    subjects: subjects([
      ['grooming-punctuality', 'Grooming & Punctuality'],
      ['basic-product-knowledge', 'Basic Product Knowledge'],
      ['sop-compliance', 'SOP Compliance (Opening/Closing Checklist)'],
      ['guest-greeting', 'Guest Greeting & Basic Service'],
      ['pos-order-accuracy', 'POS Order Entry Accuracy'],
      ['teamwork-attitude', 'Teamwork & Attitude'],
      ['adaptability', 'Adaptability to Feedback'],
    ]),
  },
  {
    positionId: POSITIONS.WAITER,
    positionLabel: POSITION_LABELS.waiter,
    reviewType: 'quarterly',
    subjects: subjects([
      ['product-knowledge', 'Product Knowledge (Menu, Ingredients, Allergens)'],
      ['upselling-skill', 'Upselling & Suggestive Selling'],
      ['guest-service', 'Guest Service & Hospitality'],
      ['order-accuracy', 'Order Accuracy & POS Handling'],
      ['sop-compliance', 'SOP Compliance'],
      ['teamwork-communication', 'Teamwork & Communication'],
      ['complaint-handling', 'Complaint Handling'],
    ]),
  },
  {
    positionId: POSITIONS.WAITER,
    positionLabel: POSITION_LABELS.waiter,
    reviewType: 'annual',
    subjects: subjects([
      ['service-consistency', 'Consistency of Service Quality (Year-Round)'],
      ['revenue-contribution', 'Upselling & Revenue Contribution'],
      ['guest-relationship', 'Guest Relationship Building (Repeat Guests, VIP Handling)'],
      ['mentoring', 'Mentoring New Staff'],
      ['sop-audit-score', 'SOP Compliance & Audit Score'],
      ['initiative', 'Initiative & Problem Solving'],
      ['growth-potential', 'Readiness for Promotion / Growth Potential'],
    ]),
  },

  // --------------------------------------------------------------- Barista
  {
    positionId: POSITIONS.BARISTA,
    positionLabel: POSITION_LABELS.barista,
    reviewType: 'probation',
    subjects: subjects([
      ['grooming-punctuality', 'Grooming & Punctuality'],
      ['basic-recipe-execution', 'Basic Recipe Execution'],
      ['equipment-safety', 'Equipment Handling Safety'],
      ['sop-compliance', 'SOP Compliance'],
      ['guest-greeting', 'Guest Greeting'],
      ['adaptability', 'Adaptability to Feedback'],
    ]),
  },
  {
    positionId: POSITIONS.BARISTA,
    positionLabel: POSITION_LABELS.barista,
    reviewType: 'quarterly',
    subjects: subjects([
      ['product-knowledge', 'Product Knowledge (Recipes)'],
      ['beverage-consistency', 'Beverage Consistency & Quality'],
      ['speed-of-service', 'Speed of Service'],
      ['upselling-skill', 'Upselling Skill'],
      ['equipment-care', 'Equipment Care & Cleanliness'],
      ['guest-interaction', 'Guest Interaction'],
      ['sop-compliance', 'SOP Compliance'],
    ]),
  },
  {
    positionId: POSITIONS.BARISTA,
    positionLabel: POSITION_LABELS.barista,
    reviewType: 'annual',
    subjects: subjects([
      ['quality-consistency', 'Consistency of Beverage Quality (Year-Round)'],
      ['recipe-contribution', 'Recipe/Menu Innovation Contribution'],
      ['revenue-contribution', 'Upselling & Revenue Contribution'],
      ['equipment-ownership', 'Equipment Maintenance Ownership'],
      ['mentoring', 'Mentoring New Baristas'],
      ['growth-potential', 'Readiness for Promotion / Growth Potential'],
    ]),
  },

  // ------------------------------------------------------- Cook / Kitchen
  {
    positionId: POSITIONS.COOK,
    positionLabel: POSITION_LABELS.cook,
    reviewType: 'probation',
    subjects: subjects([
      ['food-safety-basics', 'Food Safety Basics'],
      ['recipe-accuracy', 'Recipe Following Accuracy'],
      ['punctuality-attendance', 'Punctuality & Attendance'],
      ['kitchen-sop', 'Kitchen SOP Compliance'],
      ['teamwork-supervised', 'Teamwork Under Supervision'],
      ['adaptability', 'Adaptability to Feedback'],
    ]),
  },
  {
    positionId: POSITIONS.COOK,
    positionLabel: POSITION_LABELS.cook,
    reviewType: 'quarterly',
    subjects: subjects([
      ['food-safety-hygiene', 'Food Safety & Hygiene'],
      ['recipe-consistency', 'Recipe Compliance & Consistency'],
      ['plating-presentation', 'Plating & Presentation'],
      ['speed-time-management', 'Speed & Time Management'],
      ['equipment-handling', 'Kitchen Equipment Handling'],
      ['waste-management', 'Waste Management'],
      ['teamwork-pressure', 'Teamwork Under Pressure'],
    ]),
  },
  {
    positionId: POSITIONS.COOK,
    positionLabel: POSITION_LABELS.cook,
    reviewType: 'annual',
    subjects: subjects([
      ['quality-consistency', 'Consistency of Food Quality (Year-Round)'],
      ['menu-contribution', 'Menu/Recipe Contribution'],
      ['waste-reduction', 'Waste Reduction Impact'],
      ['food-safety-audit', 'Food Safety Audit Score'],
      ['mentoring', 'Mentoring Junior Cooks'],
      ['growth-potential', 'Readiness for Promotion / Growth Potential'],
    ]),
  },

  // -------------------------------------------------------------- Cashier
  {
    positionId: POSITIONS.CASHIER,
    positionLabel: POSITION_LABELS.cashier,
    reviewType: 'probation',
    subjects: subjects([
      ['cash-handling-basics', 'Cash Handling Basics'],
      ['pos-familiarity', 'POS System Familiarity'],
      ['punctuality', 'Punctuality'],
      ['sop-compliance', 'SOP Compliance (Cash Reconciliation)'],
      ['guest-greeting', 'Guest Greeting'],
      ['adaptability', 'Adaptability to Feedback'],
    ]),
  },
  {
    positionId: POSITIONS.CASHIER,
    positionLabel: POSITION_LABELS.cashier,
    reviewType: 'quarterly',
    subjects: subjects([
      ['cash-handling-accuracy', 'Cash Handling Accuracy'],
      ['pos-proficiency', 'POS System Proficiency'],
      ['upselling-skill', 'Upselling Skill'],
      ['guest-service', 'Guest Service'],
      ['sop-compliance', 'SOP Compliance'],
      ['attention-to-detail', 'Attention to Detail'],
    ]),
  },
  {
    positionId: POSITIONS.CASHIER,
    positionLabel: POSITION_LABELS.cashier,
    reviewType: 'annual',
    subjects: subjects([
      ['accuracy-audit-record', 'Cash Handling Accuracy (Audit Record)'],
      ['discrepancy-rate', 'Discrepancy Rate (Year-Round)'],
      ['revenue-contribution', 'Upselling & Revenue Contribution'],
      ['sop-audit-score', 'SOP Compliance & Audit Score'],
      ['mentoring', 'Mentoring New Cashiers'],
      ['growth-potential', 'Readiness for Promotion / Growth Potential'],
    ]),
  },

  // --------------------------------------------------- Outlet/Dept Leader
  {
    positionId: POSITIONS.OUTLET_LEADER,
    positionLabel: POSITION_LABELS.outletLeader,
    reviewType: 'probation',
    subjects: subjects([
      ['sop-understanding', 'Understanding of SOPs & Standards'],
      ['basic-team-coordination', 'Basic Team Coordination'],
      ['communication-staff', 'Communication with Staff'],
      ['management-adaptability', 'Adaptability to Management Expectations'],
      ['punctuality-reliability', 'Punctuality & Reliability'],
    ]),
  },
  {
    positionId: POSITIONS.OUTLET_LEADER,
    positionLabel: POSITION_LABELS.outletLeader,
    reviewType: 'quarterly',
    subjects: subjects([
      ['team-leadership', 'Team Leadership & Coaching'],
      ['sop-enforcement', 'SOP Enforcement'],
      ['problem-solving', 'Problem Solving'],
      ['communication-management', 'Communication with Management'],
      ['staff-scheduling', 'Staff Scheduling & Resource Management'],
      ['kpi-achievement', 'Target/KPI Achievement'],
    ]),
  },
  {
    positionId: POSITIONS.OUTLET_LEADER,
    positionLabel: POSITION_LABELS.outletLeader,
    reviewType: 'annual',
    subjects: subjects([
      ['team-performance-retention', 'Team Performance & Retention'],
      ['sop-enforcement-consistency', 'SOP Enforcement Consistency (Year-Round)'],
      ['strategic-problem-solving', 'Strategic Problem Solving'],
      ['succession-planning', 'Staff Development & Succession Planning'],
      ['annual-kpi-achievement', 'Target/KPI Achievement (Annual)'],
      ['next-level-readiness', 'Readiness for Next-Level Role'],
    ]),
  },
]
