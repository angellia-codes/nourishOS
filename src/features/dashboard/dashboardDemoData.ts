/** dashboard.md §15 — one representative role per department/leadership tier. */
export type DemoRole =
  | 'superAdmin'
  | 'director'
  | 'generalManager'
  | 'hrManager'
  | 'finance'
  | 'kitchenLeader'
  | 'barLeader'
  | 'floorLeader'
  | 'engineering'
  | 'security'

export interface RoleProfile {
  role: DemoRole
  displayName: string
  firstName: string
  position: string
  department: string
  outlet: string
}

export const ROLE_PROFILES: Record<DemoRole, RoleProfile> = {
  superAdmin: { role: 'superAdmin', displayName: 'Angel Wijaya', firstName: 'Angel', position: 'Super Admin', department: 'Platform', outlet: 'Headquarters' },
  director: { role: 'director', displayName: 'Bram Santoso', firstName: 'Bram', position: 'Director', department: 'Executive', outlet: 'Headquarters' },
  generalManager: { role: 'generalManager', displayName: 'Citra Dewi', firstName: 'Citra', position: 'General Manager', department: 'Operations', outlet: 'Kemang' },
  hrManager: { role: 'hrManager', displayName: 'Angel', firstName: 'Angel', position: 'HR Manager', department: 'Human Resources', outlet: 'Headquarters' },
  finance: { role: 'finance', displayName: 'Dedi Kurniawan', firstName: 'Dedi', position: 'Finance Officer', department: 'Finance', outlet: 'Headquarters' },
  kitchenLeader: { role: 'kitchenLeader', displayName: 'Eka Putri', firstName: 'Eka', position: 'Kitchen Leader', department: 'Kitchen', outlet: 'Senopati' },
  barLeader: { role: 'barLeader', displayName: 'Fajar Ramadhan', firstName: 'Fajar', position: 'Bar Leader', department: 'Bar', outlet: 'Senopati' },
  floorLeader: { role: 'floorLeader', displayName: 'Gita Lestari', firstName: 'Gita', position: 'Floor Leader', department: 'Floor', outlet: 'Kemang' },
  engineering: { role: 'engineering', displayName: 'Hendra Saputra', firstName: 'Hendra', position: 'Engineering Lead', department: 'Engineering', outlet: 'Headquarters' },
  security: { role: 'security', displayName: 'Indra Gunawan', firstName: 'Indra', position: 'Security Officer', department: 'Security', outlet: 'Kemang' },
}

export type KpiIcon = 'users' | 'userPlus' | 'graduationCap' | 'clipboardList' | 'alertTriangle' | 'wrench' | 'receipt' | 'wallet' | 'megaphone' | 'checkSquare' | 'shieldAlert' | 'activity' | 'building'
export type KpiColor = 'primary' | 'success' | 'warning' | 'destructive' | 'info'

export interface KpiCard {
  icon: KpiIcon
  title: string
  value: string
  trend?: { direction: 'up' | 'down'; label: string }
  color: KpiColor
}

/** dashboard.md §7 KPI Cards — per role/department. */
export const KPI_CARDS_BY_ROLE: Record<DemoRole, KpiCard[]> = {
  superAdmin: [
    { icon: 'building', title: 'Active Outlets', value: '6', color: 'primary' },
    { icon: 'users', title: 'Total Users', value: '184', trend: { direction: 'up', label: '+5 this month' }, color: 'info' },
    { icon: 'activity', title: 'System Health', value: '99.8%', color: 'success' },
  ],
  director: [
    { icon: 'building', title: 'Outlet Performance', value: '92%', trend: { direction: 'up', label: '+3% vs last month' }, color: 'success' },
    { icon: 'wallet', title: 'Budget Overview', value: 'Rp 1.2B', color: 'info' },
    { icon: 'checkSquare', title: 'Executive Approvals', value: '4', color: 'warning' },
  ],
  generalManager: [
    { icon: 'building', title: 'Outlet Performance', value: '88%', trend: { direction: 'up', label: '+1% vs last week' }, color: 'success' },
    { icon: 'clipboardList', title: 'Daily Reports Submitted', value: '5/6', color: 'primary' },
    { icon: 'alertTriangle', title: 'Open Incidents', value: '1', color: 'destructive' },
  ],
  hrManager: [
    { icon: 'users', title: 'Active Employees', value: '142', color: 'primary' },
    { icon: 'userPlus', title: 'New Hires', value: '3', trend: { direction: 'up', label: 'this month' }, color: 'success' },
    { icon: 'graduationCap', title: 'Trainings Due', value: '6', color: 'warning' },
  ],
  finance: [
    { icon: 'receipt', title: 'Pending Expenses', value: '9', color: 'warning' },
    { icon: 'wallet', title: 'Budget Usage', value: '64%', color: 'info' },
  ],
  kitchenLeader: [
    { icon: 'clipboardList', title: 'Opening Checklist', value: 'Done', color: 'success' },
    { icon: 'clipboardList', title: 'Closing Checklist', value: 'Pending', color: 'warning' },
  ],
  barLeader: [
    { icon: 'clipboardList', title: 'Daily Reports', value: '1 submitted', color: 'primary' },
    { icon: 'checkSquare', title: 'Checklist Status', value: '3/4 complete', color: 'info' },
  ],
  floorLeader: [
    { icon: 'clipboardList', title: 'Daily Reports', value: '1 submitted', color: 'primary' },
    { icon: 'alertTriangle', title: 'Incidents', value: '0', color: 'success' },
    { icon: 'checkSquare', title: 'Open Tasks', value: '3', color: 'warning' },
  ],
  engineering: [
    { icon: 'wrench', title: 'Active Work Orders', value: '7', color: 'warning' },
    { icon: 'clipboardList', title: 'Preventive Maintenance', value: '2 due', color: 'info' },
  ],
  security: [
    { icon: 'shieldAlert', title: 'Incident Reports', value: '1 open', color: 'destructive' },
    { icon: 'clipboardList', title: 'Checkpoints Today', value: '18/20', color: 'primary' },
  ],
}

export interface QuickAction {
  label: string
  icon: KpiIcon
  to: string
}

/** dashboard.md §8 Quick Actions — filtered by role permissions in the real app. */
export const QUICK_ACTIONS_BY_ROLE: Record<DemoRole, QuickAction[]> = {
  superAdmin: [{ label: 'Module Previews', icon: 'building', to: '/demo' }],
  director: [{ label: 'Outlet Performance', icon: 'building', to: '/demo' }],
  generalManager: [
    { label: 'Daily Report', icon: 'clipboardList', to: '/demo/operations' },
    { label: 'Report Incident', icon: 'alertTriangle', to: '/demo/operations' },
  ],
  hrManager: [
    { label: 'Add Employee', icon: 'userPlus', to: '/demo/hr/employees' },
    { label: 'Create Recruitment', icon: 'users', to: '/demo/hr/pipeline' },
    { label: 'New Requisition', icon: 'clipboardList', to: '/demo/hr/requisitions' },
  ],
  finance: [{ label: 'New Expense Request', icon: 'receipt', to: '/demo/finance' }],
  kitchenLeader: [{ label: 'Opening Checklist', icon: 'clipboardList', to: '/demo/operations' }],
  barLeader: [{ label: 'Daily Report', icon: 'clipboardList', to: '/demo/operations' }],
  floorLeader: [
    { label: 'Daily Report', icon: 'clipboardList', to: '/demo/operations' },
    { label: 'Report Incident', icon: 'alertTriangle', to: '/demo/operations' },
  ],
  engineering: [{ label: 'Log Work Order', icon: 'wrench', to: '/demo' }],
  security: [{ label: 'Start Patrol', icon: 'shieldAlert', to: '/demo/security' }],
}

export interface DepartmentWidgetItem {
  label: string
  value: string
}

export interface DepartmentWidgetGroup {
  title: string
  items: DepartmentWidgetItem[]
}

/** dashboard.md §14 Department Widgets. */
export const DEPARTMENT_WIDGETS_BY_ROLE: Record<DemoRole, DepartmentWidgetGroup> = {
  superAdmin: { title: 'Company', items: [{ label: 'Active Outlets', value: '6' }, { label: 'Total Users', value: '184' }, { label: 'System Health', value: '99.8%' }] },
  director: { title: 'Executive', items: [{ label: 'Company Performance', value: '92%' }, { label: 'Cross-outlet KPIs', value: '5 tracked' }, { label: 'Budget Overview', value: 'Rp 1.2B' }] },
  generalManager: { title: 'Outlet — Kemang', items: [{ label: 'Operational Metrics', value: '88%' }, { label: 'HR Summary', value: '38 employees' }, { label: 'Finance Summary', value: 'Rp 42M spent MTD' }] },
  hrManager: { title: 'HR', items: [{ label: 'Employee Count', value: '142' }, { label: 'Recruitment Pipeline', value: '11 candidates' }, { label: 'Training Progress', value: '68%' }, { label: 'Contract Expiry', value: '2 within 30 days' }, { label: 'Upcoming Reviews', value: '5 this month' }] },
  finance: { title: 'Finance', items: [{ label: 'Pending Expenses', value: '9' }, { label: 'Budget Summary', value: '64% used' }, { label: 'Petty Cash Balance', value: 'Rp 3.2M' }] },
  kitchenLeader: { title: 'Operations', items: [{ label: 'Daily Reports', value: '1 submitted' }, { label: 'Checklist Completion', value: '92%' }, { label: 'Open Incidents', value: '0' }, { label: 'Open Work Orders', value: '1' }] },
  barLeader: { title: 'Operations', items: [{ label: 'Daily Reports', value: '1 submitted' }, { label: 'Checklist Completion', value: '75%' }, { label: 'Open Incidents', value: '0' }, { label: 'Open Work Orders', value: '0' }] },
  floorLeader: { title: 'Operations', items: [{ label: 'Daily Reports', value: '1 submitted' }, { label: 'Checklist Completion', value: '88%' }, { label: 'Open Incidents', value: '0' }, { label: 'Open Work Orders', value: '2' }] },
  engineering: { title: 'Engineering', items: [{ label: 'Active Work Orders', value: '7' }, { label: 'Preventive Maintenance', value: '2 due' }, { label: 'Equipment Status', value: '1 flagged' }] },
  security: { title: 'Security', items: [{ label: 'Incident Reports', value: '1 open' }, { label: 'Visitor Logs', value: '14 today' }, { label: 'Security Alerts', value: '0' }] },
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface PendingApproval {
  id: string
  title: string
  requestor: string
  date: string
  status: ApprovalStatus
}

/** dashboard.md §9 Pending Approvals Widget. */
export const MOCK_PENDING_APPROVALS: PendingApproval[] = [
  { id: 'appr-1', title: 'Expense Request — Kitchen supplies', requestor: 'Eka Putri', date: '2026-07-16', status: 'pending' },
  { id: 'appr-2', title: 'SOP Approval — Closing Checklist v2', requestor: 'Gita Lestari', date: '2026-07-15', status: 'pending' },
  { id: 'appr-3', title: 'Employee Requisition — Barista, Senopati', requestor: 'Angel', date: '2026-07-14', status: 'pending' },
]

export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'notStarted' | 'inProgress' | 'done'

export interface AssignedTask {
  id: string
  title: string
  dueDate: string
  priority: TaskPriority
  progress: number
  status: TaskStatus
}

/** dashboard.md §10 Assigned Tasks Widget. */
export const MOCK_ASSIGNED_TASKS: AssignedTask[] = [
  { id: 'task-1', title: 'Review onboarding checklist for demo-3', dueDate: '2026-07-18', priority: 'high', progress: 40, status: 'inProgress' },
  { id: 'task-2', title: 'Finalize Q3 training schedule', dueDate: '2026-07-20', priority: 'medium', progress: 10, status: 'inProgress' },
  { id: 'task-3', title: 'Submit weekly compliance summary', dueDate: '2026-07-17', priority: 'low', progress: 100, status: 'done' },
]

export interface NotificationItem {
  id: string
  message: string
  time: string
  read: boolean
}

/** dashboard.md §11 Notifications Widget. */
export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  { id: 'notif-1', message: 'New approval assigned: Expense Request — Kitchen supplies', time: '10 minutes ago', read: false },
  { id: 'notif-2', message: 'Reminder: Trainings due for 6 employees this week', time: '2 hours ago', read: false },
  { id: 'notif-3', message: 'Daily report submitted for Senopati outlet', time: 'Yesterday', read: true },
]

export interface Announcement {
  id: string
  title: string
  summary: string
  author: string
  date: string
}

/** dashboard.md §12 Announcements Widget. */
export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  { id: 'ann-1', title: 'Updated Closing Checklist rollout', summary: 'All outlets move to the revised closing checklist starting next Monday.', author: 'Operations Team', date: '2026-07-15' },
  { id: 'ann-2', title: 'Company town hall — August', summary: 'Save the date for the quarterly town hall, details to follow.', author: 'Bram Santoso', date: '2026-07-12' },
]

export interface ActivityFeedItem {
  id: string
  user: string
  action: string
  timestamp: string
}

/** dashboard.md §13 Activity Feed. */
export const MOCK_ACTIVITY_FEED: ActivityFeedItem[] = [
  { id: 'act-1', user: 'Angel', action: 'created a new employee record for demo-4', timestamp: '35 minutes ago' },
  { id: 'act-2', user: 'Gita Lestari', action: 'submitted a daily report for Kemang', timestamp: '1 hour ago' },
  { id: 'act-3', user: 'Dedi Kurniawan', action: 'approved an expense request', timestamp: '3 hours ago' },
  { id: 'act-4', user: 'Indra Gunawan', action: 'completed a security patrol at Kemang', timestamp: '5 hours ago' },
]
