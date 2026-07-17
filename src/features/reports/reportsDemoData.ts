export type KpiIcon = 'users' | 'wallet' | 'clipboardList' | 'package' | 'trendingUp' | 'alertTriangle'
export type KpiColor = 'primary' | 'success' | 'warning' | 'destructive' | 'info'

export interface MockKpiCard {
  title: string
  value: string
  icon: KpiIcon
  color: KpiColor
  trend?: { direction: 'up' | 'down'; label: string }
}

/** reports.md §6 "Core KPI Categories" — HR, Finance, Operations, Inventory. */
export const MOCK_EXECUTIVE_KPIS: MockKpiCard[] = [
  { title: 'Employee Turnover Rate', value: '4.2%', icon: 'users', color: 'info', trend: { direction: 'down', label: '0.6pt vs last month' } },
  { title: 'Monthly Operating Expenses', value: 'Rp 412.6M', icon: 'wallet', color: 'warning', trend: { direction: 'up', label: '3.1% vs last month' } },
  { title: 'Task Completion Rate', value: '91%', icon: 'clipboardList', color: 'success', trend: { direction: 'up', label: '2pt vs last week' } },
  { title: 'Inventory Value', value: 'Rp 186.3M', icon: 'package', color: 'primary' },
  { title: 'Budget Utilization', value: '68%', icon: 'trendingUp', color: 'info' },
  { title: 'Open Incidents', value: '2', icon: 'alertTriangle', color: 'destructive' },
]

export interface MockReportRow {
  id: string
  name: string
  category: string
  lastGenerated: string
  format: string
}

/** reports.md §7 "Report Types" — a sample of Standard/Operational/Financial/Inventory/HR reports. */
export const MOCK_REPORTS: MockReportRow[] = [
  { id: 'rpt-1', name: 'Weekly Report — All Outlets', category: 'Standard', lastGenerated: '2026-07-13', format: 'PDF' },
  { id: 'rpt-2', name: 'Task Performance Report', category: 'Operational', lastGenerated: '2026-07-16', format: 'Excel' },
  { id: 'rpt-3', name: 'Expense Summary', category: 'Financial', lastGenerated: '2026-07-15', format: 'PDF' },
  { id: 'rpt-4', name: 'Stock Valuation Report', category: 'Inventory', lastGenerated: '2026-07-14', format: 'Excel' },
  { id: 'rpt-5', name: 'Attendance Report', category: 'HR', lastGenerated: '2026-07-12', format: 'PDF' },
]

/** reports.md §6 "Operations KPIs" — checklist compliance by outlet, for the Operational Dashboard widget. */
export const MOCK_OUTLET_COMPLIANCE = [
  { outlet: 'Sanur', compliance: 96 },
  { outlet: 'Canggu', compliance: 84 },
  { outlet: 'Ubud', compliance: 100 },
]
