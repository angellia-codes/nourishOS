/**
 * Known duplication (see collections.ts) — mirrors src/constants/organization.ts
 * so registerUser can validate an outlet/department/role triple without
 * trusting whatever the client posted. Keep both copies in step.
 *
 * ROLE_PERMISSIONS has no client-side twin on purpose: the browser reads
 * permissions from roles/{roleId} in Firestore, and this map is only what
 * seeds those documents the first time a role is claimed.
 */

const SHARED_DEPARTMENTS = ['admin_general']

/** OUTLETS_DEPARTMENTS.md §1/§2 — see the client mirror for how this was derived. */
export const OUTLET_DEPARTMENTS: Record<string, readonly string[]> = {
  nourish_ungasan: [...SHARED_DEPARTMENTS, 'cashier', 'fb_service', 'bar', 'kitchen', 'security'],
  nourish_uluwatu: [...SHARED_DEPARTMENTS, 'cashier', 'fb_service', 'bar', 'kitchen', 'security'],
  nourish_berawa: [...SHARED_DEPARTMENTS, 'cashier', 'fb_service', 'bar', 'kitchen', 'security'],
  the_bakery_uluwatu: [...SHARED_DEPARTMENTS, 'cashier', 'bar'],
  the_bakery_kitchen: [...SHARED_DEPARTMENTS, 'kitchen'],
  wholefood_ungasan: [...SHARED_DEPARTMENTS, 'cashier', 'wholefood_retail'],
  wholefood_uluwatu: [...SHARED_DEPARTMENTS, 'cashier', 'wholefood_retail'],
  wholefood_berawa: [...SHARED_DEPARTMENTS, 'cashier', 'wholefood_retail'],
  boh_nourish_group: [
    ...SHARED_DEPARTMENTS,
    'sales_marketing',
    'human_resources',
    'finance_accounting',
    'driver',
    'engineering_pomec',
  ],
}

/** RBAC.md §4 roles, scoped by department. superAdmin is deliberately absent — bootstrap-only. */
export const DEPARTMENT_ROLES: Record<string, readonly string[]> = {
  admin_general: ['generalManager', 'director'],
  cashier: ['finance', 'staff'],
  fb_service: ['restaurantManager', 'floorLeader', 'staff'],
  bar: ['barLeader', 'staff'],
  kitchen: ['kitchenLeader', 'bakeryLeader', 'staff'],
  central_kitchen: ['kitchenLeader', 'staff'],
  sales_marketing: ['marketing', 'staff'],
  security: ['security', 'staff'],
  engineering_pomec: ['engineering', 'staff'],
  human_resources: ['hrManager', 'staff'],
  finance_accounting: ['finance', 'purchasing', 'staff'],
  driver: ['purchasing', 'staff'],
  housekeeping: ['staff'],
  wholefood_retail: ['wholefoodLeader', 'wholefoodCashier', 'staff'],
}

/** Granted to every role — the shell everyone needs to see anything at all (RBAC.md §5, Dashboard/Tasks/Notifications rows). */
const BASE = ['dashboard.read', 'tasks.complete', 'documents.read', 'sops.read', 'calendar.read']

/** Outlet leaders share one operational core; §5 then adds each one's ✅ columns on top. */
const LEADER = [
  ...BASE,
  // employee-requisition.md §7: department leaders and outlet managers raise
  // requisitions for their own outlet; the approval chain (hrManager → GM) is
  // what gates them, so they get create/read but never approve.
  'recruitment.read',
  'recruitment.create',
  'dailyUpdates.submit',
  'dailyUpdates.read',
  'incidents.create',
  'incidents.read',
  'lostFound.create',
  'lostFound.read',
  'appraisals.read',
  'appraisals.create',
  'appraisals.submit',
  'training.read',
  'tasks.assign',
  'expenseRequests.submit',
  // communications.md §19: Leader is "Limited" on Create Announcement and ❌ on
  // Publish — they draft for their outlet, a manager or above publishes it.
  'announcements.create',
  // Leaders run their own outlet's uniform/asset stock day to day; item-master
  // curation (hrInventory.manage) stays HR's.
  'hrInventory.record',
]

/**
 * Permission set per role, read off the RBAC.md §5 matrix (✅ = full, 👁 = read)
 * and the §4 responsibility lists, using the strings enumerated in §16.
 *
 * superAdmin is omitted: it is seeded once during bootstrap with the full
 * permission list, and re-deriving it here would risk silently narrowing the
 * one account that can fix everything else.
 */
export const ROLE_PERMISSIONS: Record<string, readonly string[]> = {
  director: [
    ...BASE,
    'employees.read',
    'recruitment.read',
    'appraisals.read',
    'training.read',
    'reports.read',
    'reports.create',
    'expenseRequests.approve',
    'expenseRequests.reject',
    'announcements.create',
    'announcements.publish',
    // communications.md §19: Broadcast Messages are GM/Director/Super Admin only.
    'announcements.broadcast',
    'incidents.read',
    'lostFound.read',
    'dailyUpdates.read',
    'dailyUpdates.readAll',
    'tasks.assign',
  ],
  generalManager: [
    ...BASE,
    'employees.read',
    'recruitment.read',
    'appraisals.read',
    'appraisals.approve',
    'appraisals.reject',
    'training.read',
    'reports.read',
    'reports.create',
    'expenseRequests.approve',
    'expenseRequests.reject',
    'announcements.create',
    'announcements.publish',
    'announcements.broadcast',
    'incidents.read',
    'lostFound.read',
    'dailyUpdates.submit',
    'dailyUpdates.read',
    'dailyUpdates.readAll',
    'calendar.create',
    'calendar.manage',
    'tasks.assign',
  ],
  hrManager: [
    ...BASE,
    'employees.read',
    'employees.create',
    'employees.update',
    'employees.delete',
    'employees.export',
    'employees.readSensitive',
    'recruitment.read',
    'recruitment.create',
    'recruitment.update',
    'recruitment.approve',
    'appraisals.read',
    'appraisals.create',
    'appraisals.submit',
    'appraisals.generateInsights',
    'appraisals.manageTemplates',
    'training.read',
    'training.assign',
    'documents.publish',
    'reports.read',
    'reports.create',
    'announcements.create',
    'announcements.publish',
    'expenseRequests.submit',
    'incidents.read',
    'incidents.readSensitive',
    'dailyUpdates.read',
    'calendar.create',
    'calendar.manage',
    'tasks.assign',
    'hrInventory.manage',
    'hrInventory.record',
  ],
  finance: [
    ...BASE,
    'expenseRequests.submit',
    'expenseRequests.approve',
    'expenseRequests.reject',
    // expense-request.md §7: paying is Finance-only, and deliberately not
    // implied by approve — a GM who approved cannot also disburse.
    'expenseRequests.pay',
    'reports.read',
    'reports.create',
    'employees.read',
    'tasks.assign',
  ],
  purchasing: [...BASE, 'expenseRequests.submit', 'reports.read', 'tasks.assign'],
  kitchenLeader: LEADER,
  bakeryLeader: LEADER,
  wholefoodLeader: LEADER,
  barLeader: [...LEADER, 'workOrders.update'],
  // §5 gives Floor Leader ✅ on Incident Reports — they own the guest-facing incidents.
  floorLeader: [...LEADER, 'incidents.manage', 'lostFound.manage'],
  security: [
    ...BASE,
    'security.create',
    'security.read',
    'incidents.create',
    'incidents.read',
    'incidents.manage',
    'lostFound.create',
    'lostFound.read',
    'lostFound.manage',
    'dailyUpdates.submit',
    'dailyUpdates.read',
  ],
  engineering: [
    ...BASE,
    'workOrders.assign',
    'workOrders.update',
    'workOrders.complete',
    'incidents.create',
    'incidents.read',
    'dailyUpdates.submit',
    'dailyUpdates.read',
  ],
  outletManager: [
    ...LEADER,
    'incidents.manage',
    'lostFound.manage',
    'dailyUpdates.readAll',
    'reports.read',
    'calendar.create',
    // §19 gives Manager "Limited" on Publish — scoped in practice by the
    // audience they can pick, not by a second permission string.
    'announcements.publish',
  ],
  // POSITIONS.md §3 Level III — runs one restaurant outlet end to end, so it
  // carries the same set outletManager did before it left the form.
  restaurantManager: [
    ...LEADER,
    'incidents.manage',
    'lostFound.manage',
    'dailyUpdates.readAll',
    'reports.read',
    'calendar.create',
    // §19 gives Manager "Limited" on Publish — scoped in practice by the
    // audience they can pick, not by a second permission string.
    'announcements.publish',
  ],
  // POSITIONS.md §3 Level VIII — rank & file, so the baseline staff set.
  wholefoodCashier: [
    ...BASE,
    'dailyUpdates.submit',
    'dailyUpdates.read',
    'incidents.create',
    'lostFound.create',
  ],
  marketing: [...BASE, 'announcements.create', 'announcements.publish', 'documents.publish', 'reports.read'],
  staff: [...BASE, 'dailyUpdates.submit', 'dailyUpdates.read', 'incidents.create', 'lostFound.create'],
}
