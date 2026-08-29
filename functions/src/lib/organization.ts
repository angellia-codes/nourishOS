/**
 * Known duplication (see collections.ts) — mirrors src/constants/organization.ts
 * so registerUser can validate an outlet/department/role triple without
 * trusting whatever the client posted. Keep both copies in step.
 *
 * ROLE_PERMISSIONS has no client-side twin on purpose: the browser reads
 * permissions from roles/{roleId} in Firestore, and this map is only what
 * seeds those documents the first time a role is claimed.
 */

/**
 * OUTLETS_DEPARTMENTS.md §1/§2 — see the client mirror for how this was
 * derived. Admin & General (§2: "HQ / Outlet Management") is HQ-only — it
 * staffs boh_nourish_group and nowhere else.
 */
/**
 * Display names for the nine outlets — mirrors src/constants/organization.ts's
 * OUTLETS list. Added for payroll: a payslip freezes `outletName` at issue
 * (payroll-components-payslip-design.md §4.5), so the server has to resolve it
 * rather than leaving the client to label a stored id.
 */
export const OUTLET_NAMES: Record<string, string> = {
  nourish_ungasan: 'Nourish Ungasan',
  nourish_uluwatu: 'Nourish Uluwatu',
  nourish_berawa: 'Nourish Berawa',
  the_bakery_uluwatu: 'The Bakery Uluwatu',
  the_bakery_kitchen: 'The Bakery Kitchen',
  wholefood_ungasan: 'Wholefood Ungasan',
  wholefood_uluwatu: 'Wholefood Uluwatu',
  wholefood_berawa: 'Wholefood Berawa',
  boh_nourish_group: 'BOH Nourish Group',
}

export const OUTLET_DEPARTMENTS: Record<string, readonly string[]> = {
  // OUTLETS_DEPARTMENTS.md §2-06 — Ungasan staffs the Production Hub, so it is
  // the one outlet carrying central_kitchen. The frontend copy has always had
  // it; this mirror had not, so registerUser rejected every candidate who
  // picked the department its own dropdown offered them.
  nourish_ungasan: ['cashier', 'fb_service', 'bar', 'kitchen', 'central_kitchen', 'security', 'engineering_pomec'],
  nourish_uluwatu: ['cashier', 'fb_service', 'bar', 'kitchen', 'security', 'engineering_pomec'],
  nourish_berawa: ['cashier', 'fb_service', 'bar', 'kitchen', 'security', 'engineering_pomec'],
  the_bakery_uluwatu: ['cashier', 'bar'],
  the_bakery_kitchen: ['kitchen'],
  wholefood_ungasan: ['wholefood_retail'],
  wholefood_uluwatu: ['wholefood_retail'],
  wholefood_berawa: ['wholefood_retail'],
  boh_nourish_group: [
    'admin_general',
    'sales_marketing',
    'human_resources',
    'finance_accounting',
    'driver',
    'engineering_pomec',
  ],
}

/**
 * Per-outlet area lists — mirrors src/constants/organization.ts's OUTLET_AREAS.
 * equipment-master-design.md §3.1/§4.1: import validation checks a row's
 * `area` against this map (via OUTLET_CODES-resolved outlet), server-side.
 */
export const OUTLET_AREAS: Record<string, readonly string[]> = {
  nourish_ungasan: ['kitchen', 'bar', 'dining', 'coldStorage', 'backOfHouse', 'exterior'],
  nourish_uluwatu: ['kitchen', 'bar', 'dining', 'coldStorage', 'backOfHouse', 'exterior'],
  nourish_berawa: ['kitchen', 'bar', 'dining', 'coldStorage', 'backOfHouse', 'exterior'],
  the_bakery_uluwatu: ['bakery', 'retail', 'bar', 'coldStorage', 'backOfHouse'],
  the_bakery_kitchen: ['bakery', 'kitchen', 'coldStorage', 'backOfHouse', 'exterior'],
  wholefood_ungasan: ['retail', 'coldStorage', 'backOfHouse', 'exterior'],
  wholefood_uluwatu: ['retail', 'coldStorage', 'backOfHouse', 'exterior'],
  wholefood_berawa: ['retail', 'coldStorage', 'backOfHouse', 'exterior'],
  boh_nourish_group: ['office', 'warehouse', 'backOfHouse', 'exterior'],
}

/**
 * Three-letter outlet codes — mirrors src/constants/organization.ts's
 * OUTLET_CODES. Feeds equipment-master-design.md §3.5's assetCode generation
 * and CSV import's `outletCode` column resolution.
 */
export const OUTLET_CODES: Record<string, string> = {
  nourish_ungasan: 'NUN',
  nourish_uluwatu: 'NUL',
  nourish_berawa: 'NBR',
  the_bakery_uluwatu: 'BKU',
  the_bakery_kitchen: 'BKK',
  wholefood_ungasan: 'WFN',
  wholefood_uluwatu: 'WFU',
  wholefood_berawa: 'WFB',
  boh_nourish_group: 'BOH',
}

/**
 * Roles scoped by department — mirrors src/constants/organization.ts's
 * DEPARTMENT_ROLES, which is the org role ladder HR issued on 2026-08-29 (one
 * role per job title). superAdmin is deliberately absent — bootstrap-only.
 */
export const DEPARTMENT_ROLES: Record<string, readonly string[]> = {
  admin_general: ['generalManager', 'director'],
  cashier: ['cashierSupervisor', 'cashier'],
  fb_service: ['restaurantManager', 'restaurantSupervisor', 'restaurantCaptain', 'waiter'],
  bar: ['barManager', 'barSupervisor', 'barCaptain', 'barista'],
  kitchen: [
    'headChef',
    'sousChef',
    'chefDePartie',
    'cook',
    'cookHelper',
    'steward',
    'chiefBaker',
    'chefDePartieBaker',
    'cookBaker',
  ],
  central_kitchen: ['demiChef', 'cookHelper', 'steward'],
  sales_marketing: ['marketing', 'juniorGraphicDesigner'],
  security: ['security', 'securityGuard'],
  engineering_pomec: ['restaurantMaintenanceManager', 'engineering'],
  human_resources: ['hrManager', 'hrGeneralAdmin'],
  finance_accounting: [
    'finance',
    'purchasing',
    'purchasingSupervisor',
    'generalCashierAp',
    'arIncomeAudit',
    'receivingStorekeeper',
  ],
  driver: ['driverLeader', 'driver'],
  // `staff` was housekeeping's only role and is removed with no replacement
  // yet — nobody currently holds it. Add a real housekeeping role here first.
  housekeeping: [],
  wholefood_retail: ['wholefoodLeader', 'wholefoodSupervisor', 'wholefoodCashier'],
}

/** Mirrors src/constants/organization.ts — see that file for why `kitchen` and `wholefood_retail` need outlet scoping. */
const STANDARD_RESTAURANT_OUTLET_IDS = ['nourish_ungasan', 'nourish_uluwatu', 'nourish_berawa']

export const OUTLET_ONLY_ROLES: Record<string, readonly string[]> = {
  chiefBaker: ['the_bakery_kitchen'],
  chefDePartieBaker: ['the_bakery_kitchen'],
  cookBaker: ['the_bakery_kitchen'],
  headChef: STANDARD_RESTAURANT_OUTLET_IDS,
  sousChef: STANDARD_RESTAURANT_OUTLET_IDS,
  chefDePartie: STANDARD_RESTAURANT_OUTLET_IDS,
  cook: STANDARD_RESTAURANT_OUTLET_IDS,
  cookHelper: STANDARD_RESTAURANT_OUTLET_IDS,
  steward: STANDARD_RESTAURANT_OUTLET_IDS,
  wholefoodLeader: ['wholefood_ungasan'],
  wholefoodSupervisor: ['wholefood_ungasan'],
}

/**
 * The one role that speaks for a whole outlet — what `outletManager` used to
 * be before it was removed (2026-08-29 role-id migration; mirrors
 * src/constants/organization.ts's comment). Used wherever logic needs "the
 * outlet's own lead" rather than one department's leader: equipment
 * decommission approval (approverOutletId makes the role+outlet pairing
 * exact), and as the replacement for the bare 'outletManager' string
 * incident-routing/escalation/lost-found notify used to carry.
 */
export const OUTLET_LEAD_ROLE: Record<string, string> = {
  nourish_ungasan: 'restaurantManager',
  nourish_uluwatu: 'restaurantManager',
  nourish_berawa: 'restaurantManager',
  // No fb_service department here — bar is the more senior of its two
  // departments (cashier, bar), so it stands in for "the outlet's lead".
  the_bakery_uluwatu: 'barManager',
  the_bakery_kitchen: 'chiefBaker',
  wholefood_ungasan: 'wholefoodLeader',
  // wholefoodLeader is only ever assigned at wholefood_ungasan
  // (OUTLET_ONLY_ROLES above) — these two are cashier/supervisor-only.
  wholefood_uluwatu: 'wholefoodSupervisor',
  wholefood_berawa: 'wholefoodSupervisor',
  boh_nourish_group: 'generalManager',
}

/** What registerUser accepts for an outlet+department pair — mirrors the client's `rolesFor`. */
export function rolesFor(outletId: string, departmentId: string): readonly string[] {
  return (DEPARTMENT_ROLES[departmentId] ?? []).filter((role) => {
    const restriction = OUTLET_ONLY_ROLES[role]
    return !restriction || restriction.includes(outletId)
  })
}

/** Granted to every role — the shell everyone needs to see anything at all (RBAC.md §5, Dashboard/Tasks/Notifications rows). */
const BASE = ['dashboard.read', 'tasks.complete', 'documents.read', 'sops.read', 'calendar.read', 'chat.send']

/** Outlet leaders share one operational core; §5 then adds each one's ✅ columns on top. */
const LEADER = [
  ...BASE,
  // employee_communication.md §5.4: a department head raises communications for
  // their own team — the Dept Head → HR → GM chain is what gates them, and they
  // never get employees.update, so they cannot edit the employee record itself.
  'employees.communicate',
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
  // appraisal-v2-design.md §10 — v1's blanket appraisals.create/appraisals.submit
  // are gone (v2 has no leader-facing "create"; creation is scheduler/HR-driven,
  // §7). scorePrimary/acknowledge are resource-scoped inside the callable
  // itself (must be the appraisal's own primaryScorerUid / the subject's own
  // department), same trust level a bare 'appraisals.read' grant already implied.
  'appraisals.read',
  'appraisals.scorePrimary',
  'appraisals.acknowledge',
  'training.read',
  // training-module-spec-v1.0.md §5: "Department Heads hold verify, not
  // manage" — a leader signs off their own team's training but never edits the
  // catalogue. Scoped to their own outlet+department inside the callable.
  'training.verify',
  // attendance.md §8 — department heads see their own outlet's
  // approved attendance records only, resolved against outletIdSnapshot.
  'attendance.viewOwnOutlet',
  'tasks.assign',
  'expenseRequests.submit',
  // communications.md §19: Leader is "Limited" on Create Announcement and ❌ on
  // Publish — they draft for their outlet, a manager or above publishes it.
  'announcements.create',
  // Leaders run their own outlet's uniform/asset stock day to day; item-master
  // curation (hrInventory.manage) stays HR's.
  'hrInventory.record',
  // Opening/closing shift reports are filed by whoever runs the outlet's shift
  // (opening_closing_shift_report_template.md); the old standalone checklist
  // permission was absorbed with the feature.
  'shiftReports.submit',
  'shiftReports.read',
  // communications.md §7: creating/archiving a chat channel, same trust
  // level as assigning a task — Leader and above.
  'chat.manageChannels',
  // HR_OPERATIONS.md §7.2: outlet leaders get "Own Projects" on Project
  // Management — they raise and read, GM approval (§9.10) opens the project.
  'projects.read',
  'projects.create',
  // Whoever runs the floor raises the maintenance request; engineering still
  // owns assign/update/complete, so raising one grants no power over it.
  'workOrders.create',
]

/**
 * Supervisor tier (POSITIONS.md §2 Level V-VI) — runs a shift, does not own the
 * department. Deliberately narrower than LEADER: no employees.communicate, no
 * appraisal scoring, no recruitment.
 *
 * `incidents.read` is deliberately absent even though a supervisor files
 * incidents: firestore.rules gates /incidentReports on a hardcoded leader role
 * list, so the string would grant a page that then reads nothing. A supervisor
 * still reads the incidents they reported (`reportedBy == uid`).
 */
const SUPERVISOR = [
  ...BASE,
  'dailyUpdates.submit',
  'dailyUpdates.read',
  'incidents.create',
  'lostFound.create',
  'lostFound.read',
  'shiftReports.submit',
  'shiftReports.read',
  'training.read',
  'tasks.assign',
  'workOrders.create',
]

/** Rank & file (Level VII-VIII) — the set `staff` carried before its 2026-08-29 removal. */
const RANK_FILE = [...BASE, 'dailyUpdates.submit', 'dailyUpdates.read', 'incidents.create', 'lostFound.create']

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
    'workOrders.create',
    ...BASE,
    'employees.read',
    'recruitment.read',
    'recruitment.viewCompensation',
    'appraisals.read',
    // appraisal-v2-design.md §10 — reopenAppraisal is Super Admin/Director
    // only (superAdmin bypasses requirePermission entirely).
    'appraisals.readRecommendation',
    'appraisals.reopen',
    'training.read',
    'reports.read',
    'reports.create',
    // payroll-components-payslip-design.md §8 — payroll is a disbursement
    // authorisation, so the approval chain is finance -> GM -> director.
    'payroll.read',
    'payroll.approve',
    // attendance.md §8 — Director is unscoped-read/export, same audience as
    // Finance and GM (canReadPayroll's role set doubles as this one).
    'attendance.viewAllOutlets',
    'attendance.export',
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
    'shiftReports.readAll',
    'projects.read',
    // §7.3: contracts.sign is gated to generalManager and director — the two
    // signature steps on §9.14's chain.
    'contracts.sign',
    'tasks.assign',
    'chat.manageChannels',
  ],
  generalManager: [
    'workOrders.create',
    ...BASE,
    'employees.read',
    'recruitment.read',
    'recruitment.viewCompensation',
    'appraisals.read',
    // appraisal-v2-design.md §2.3 — GM is the sole (100%) primary scorer for
    // every soloScorer (Level I-III) appraisal. Approval itself is gated by
    // the Approval Engine's approverRole check on 'hr/appraisalV2', not a
    // permission string (same as v1) — v2 dropped the dead
    // appraisals.approve/appraisals.reject strings accordingly.
    'appraisals.scorePrimary',
    'appraisals.readRecommendation',
    'training.read',
    'reports.read',
    'reports.create',
    // §8 — the second signature on a payroll batch.
    'payroll.read',
    'payroll.approve',
    // attendance.md §6.1/§8 — GM is step 2 on 'people/attendancePeriod', and
    // unscoped-read/export like the rest of the executive audience.
    'attendance.approve',
    'attendance.viewAllOutlets',
    'attendance.export',
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
    'shiftReports.readAll',
    'calendar.create',
    'calendar.manage',
    'projects.read',
    'projects.create',
    'projects.manage',
    'contracts.sign',
    'tasks.assign',
    'chat.manageChannels',
    // fire-extinguisher.md §7 — executive oversight of the compliance register.
    'apar.manage',
  ],
  hrManager: [
    'workOrders.create',
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
    'recruitment.viewCompensation',
    // employment-application-form.md §6: F010's health, criminal-record and
    // previous-salary answers — HR Manager and superAdmin only.
    'recruitment.viewSensitive',
    'appraisals.read',
    // appraisal-v2-design.md §10 — HR scores the 40% (scoreSecondary), reads
    // the confidential recommendation, acts as device operator for
    // on-device acknowledgement, and owns the template generate/approve gate.
    'appraisals.scoreSecondary',
    'appraisals.readRecommendation',
    'appraisals.acknowledge',
    'appraisals.generateInsights',
    'appraisalTemplates.generate',
    'appraisalTemplates.approve',
    'training.read',
    'training.assign',
    // training-module-spec-v1.0.md §5 — HR owns the catalogue, campaigns and
    // the D6 gate override, and can verify anywhere (unscoped, unlike a leader).
    'training.manage',
    'training.verify',
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
    'shiftReports.submit',
    'shiftReports.read',
    'shiftReports.readAll',
    // security-control-point.md §6: registering, editing and retiring patrol
    // control points is an administrative act, not a guard's — the `security`
    // role logs patrols against these points and never defines them. Until now
    // this string was granted to no role at all, so only superAdmin (which
    // bypasses requirePermission) could create one.
    'security.manageCheckpoints',
    'chat.manageChannels',
    'projects.read',
    'projects.create',
    'projects.manage',
    // exit-interview.md §4: gates both reading exitInterviews records and
    // conducting/submitting one.
    'exitInterviews.view',
    // POSITIONS_MASTER_DESIGN.md §10 — positions.read needs no permission
    // string (all authenticated), so only the write actions are granted here.
    'positions.create',
    'positions.update',
    'positions.archive',
    'positions.setScorer',
    // fire-extinguisher.md §7.1 — HR-P&P-03 is an HR-issued policy and HR owns
    // the compliance documentation, so HR owns the register alongside Engineering.
    'apar.manage',
    // payroll-components-payslip-design.md §8 — HR runs the import and curates
    // the discretionary component registry. It deliberately does NOT hold
    // payroll.approve: whoever assembles the batch cannot also authorise it.
    'payroll.read',
    'payroll.import',
    'payroll.manageComponents',
    'employeeEngagement.manage',
    // attendance.md §5/§6/§8 — HR runs the import and is step 1 on the
    // 'people/attendancePeriod' approval chain; unscoped read/export.
    'attendance.import',
    'attendance.approve',
    'attendance.viewAllOutlets',
    'attendance.export',
  ],
  finance: [
    'recruitment.read',
    'recruitment.create',
    'workOrders.create',
    ...BASE,
    'expenseRequests.submit',
    'expenseRequests.approve',
    'expenseRequests.reject',
    // expense-request.md §7: paying is Finance-only, and deliberately not
    // implied by approve — a GM who approved cannot also disburse.
    'expenseRequests.pay',
    'reports.read',
    'reports.create',
    // §8 — the spec's "Finance Manager"; no financeManager role exists. First
    // step on the 'hr/payrollBatch' chain.
    'payroll.read',
    'payroll.approve',
    // attendance.md §8 — the same "Finance Manager" resolution: unscoped
    // read/export, no approval step on 'people/attendancePeriod'.
    'attendance.viewAllOutlets',
    'attendance.export',
    'employees.read',
    'tasks.assign',
  ],
  purchasing: [
    ...BASE,
    'expenseRequests.submit',
    'reports.read',
    'tasks.assign',
    'workOrders.create',
    'workOrders.update',
    'recruitment.read',
    'recruitment.create',
  ],
  headChef: LEADER,
  chiefBaker: LEADER,
  wholefoodLeader: LEADER,
  barManager: [...LEADER, 'workOrders.update'],
  // §5 gives Restaurant Supervisor ✅ on Incident Reports — they own the guest-facing incidents.
  restaurantSupervisor: [...LEADER, 'incidents.manage', 'lostFound.manage'],
  security: [
    'recruitment.read',
    'recruitment.create',
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
    // fire-extinguisher.md §7.1 — Security inspects but deliberately does NOT
    // hold apar.manage: letting the inspector edit expiry dates on the units
    // they inspect is a segregation-of-duties failure in a compliance system.
    'apar.inspect',
  ],
  engineering: [
    'recruitment.read',
    'recruitment.create',
    'workOrders.create',
    ...BASE,
    'workOrders.assign',
    'workOrders.update',
    'workOrders.complete',
    'incidents.create',
    'incidents.read',
    'dailyUpdates.submit',
    'dailyUpdates.read',
    // §7.1 — Engineering services the units, so it owns the register and can
    // also record the annual maintenance inspection (§Pemeliharaan Tahunan).
    'apar.manage',
    'apar.inspect',
    // equipment-master-design.md §6.2 — Engineering owns the equipment
    // register end to end: create/edit/status/transfer, bulk import, and
    // submitting a decommission request (approval itself is the outlet's own
    // lead per OUTLET_LEAD_ROLE, not a permission grant).
    'equipment.manage',
    'equipment.import',
    'equipment.decommission',
  ],
  // POSITIONS.md §3 Level III — runs one restaurant outlet end to end.
  // outletManager (removed 2026-08-29) carried this identical set.
  restaurantManager: [
    ...LEADER,
    'incidents.manage',
    'lostFound.manage',
    'dailyUpdates.readAll',
    'shiftReports.readAll',
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
  marketing: [
    ...BASE,
    'announcements.create',
    'announcements.publish',
    'documents.publish',
    'reports.read',
    'recruitment.read',
    'recruitment.create',
  ],
  // --------------------------------------------------------------------------
  // Org role ladder, 2026-08-29. Every role below is a job title HR issues; the
  // tiers above (LEADER / SUPERVISOR / RANK_FILE) are what each one resolves to.
  // --------------------------------------------------------------------------

  // Engineering/POMEC department head — the `engineering` set plus the leader
  // core, since it owns the department rather than working a queue in it.
  restaurantMaintenanceManager: [
    ...LEADER,
    'workOrders.assign',
    'workOrders.update',
    'workOrders.complete',
    'apar.manage',
    'apar.inspect',
    'equipment.manage',
    'equipment.import',
    'equipment.decommission',
    'reports.read',
  ],
  // HR clerical support. Deliberately no employees.read: firestore.rules gates
  // /employees on a hardcoded role list, so the string alone would grant a page
  // that reads nothing. Add the role there first if HR wants directory access.
  hrGeneralAdmin: [
    ...BASE,
    'recruitment.read',
    'recruitment.create',
    'training.read',
    'hrInventory.record',
    'tasks.assign',
    'calendar.create',
  ],
  juniorGraphicDesigner: [...RANK_FILE, 'announcements.create'],
  purchasingSupervisor: [...SUPERVISOR, 'expenseRequests.submit', 'reports.read', 'workOrders.update'],
  // General Cashier & Accounts Payable — disburses, never approves.
  generalCashierAp: [...BASE, 'expenseRequests.submit', 'expenseRequests.pay', 'reports.read'],
  arIncomeAudit: [...BASE, 'reports.read', 'reports.create'],
  receivingStorekeeper: [...RANK_FILE, 'hrInventory.record'],
  driverLeader: [...SUPERVISOR, 'expenseRequests.submit'],
  driver: RANK_FILE,
  cashierSupervisor: [...SUPERVISOR, 'expenseRequests.submit', 'reports.read'],
  cashier: RANK_FILE,
  restaurantCaptain: SUPERVISOR,
  waiter: RANK_FILE,
  barSupervisor: SUPERVISOR,
  barCaptain: SUPERVISOR,
  barista: RANK_FILE,
  sousChef: SUPERVISOR,
  chefDePartie: SUPERVISOR,
  demiChef: SUPERVISOR,
  cook: RANK_FILE,
  cookHelper: RANK_FILE,
  steward: RANK_FILE,
  chefDePartieBaker: SUPERVISOR,
  cookBaker: RANK_FILE,
  wholefoodSupervisor: [...SUPERVISOR, 'hrInventory.record'],
  // fire-extinguisher.md §7.1 — the guard runs the monthly round; editing the
  // register stays with the Supervisor/Engineering (segregation of duties).
  securityGuard: [...RANK_FILE, 'security.create', 'security.read', 'apar.inspect'],
}
