import { Link } from 'react-router-dom'
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui'

const MODULES: { title: string; description: string; to: string }[] = [
  {
    title: 'Dashboard',
    description: 'Role-aware home dashboard — KPIs, quick actions, approvals, tasks, notifications, activity feed. Switch role to preview.',
    to: '/demo/dashboard',
  },
  {
    title: 'HR — Employee Database',
    description: 'Employee list with search/filter/sort/export and a profile with documents, mock data.',
    to: '/demo/hr/employees',
  },
  { title: 'HR — Appraisal', description: 'Appraisal review form with mock AI insights.', to: '/demo/appraisal' },
  {
    title: 'HR — Employee Requisition',
    description: 'Requisition list, detail with approval chain, and submission form, mock data.',
    to: '/demo/hr/requisitions',
  },
  {
    title: 'HR — Recruitment Pipeline',
    description: 'Candidate Kanban board (ST-01..ST-08), stage-move with simulated WhatsApp notify, add candidate.',
    to: '/demo/hr/pipeline',
  },
  {
    title: 'HR — Employment Application (F010)',
    description: 'Full-time candidate intake form — education, languages, work history, sensitive-field gating, declaration.',
    to: '/demo/hr/pipeline/apply',
  },
  {
    title: 'HR — Employee Onboarding',
    description: 'Tiered document checklist per new hire (mandatory/follow-up/optional), blocking rule, pending-documents widget.',
    to: '/demo/hr/onboarding',
  },
  {
    title: 'HR — Employee Offboarding',
    description: 'Exit checklist per departing employee — document handover, conditional Handover List, simulated Clearance Statement generation.',
    to: '/demo/hr/offboarding',
  },
  {
    title: 'HR — Exit Interview (F009)',
    description: 'Structured, HR-confidential exit survey — join/exit reasons, three 1–4 rating blocks, dual acknowledgment.',
    to: '/demo/hr/exit-interview',
  },
  {
    title: 'Security — Patrol Checkpoints',
    description: 'Checkpoint list plus the supervisor Control Point registration form (geofence + interval guidance).',
    to: '/demo/security',
  },
  {
    title: 'Operations — Daily Updates',
    description: 'HOD daily report feed, compliance widget, and the submission form, mock data.',
    to: '/demo/operations',
  },
  {
    title: 'Operations — Incident Reports',
    description: 'Incident log with type-based routing, severity escalation, case detail, and the report form.',
    to: '/demo/operations/incidents',
  },
  {
    title: 'Operations — Lost & Found',
    description: 'Found-item log with retention holds, claim & return flow, and the found-item form.',
    to: '/demo/operations/lost-found',
  },
  {
    title: 'Finance — Expense Requests',
    description: 'Expense request list with approval chain, item breakdown, and submission form, mock data.',
    to: '/demo/finance',
  },
  { title: 'Purchasing', description: 'Not yet built.', to: '/demo/purchasing' },
  {
    title: 'Inventory — Stock Levels',
    description: 'Stock level list with reorder alerts, and a stock movement logging form, mock data.',
    to: '/demo/inventory',
  },
  { title: 'CRM', description: 'Not yet built.', to: '/demo/crm' },
  {
    title: 'Documents — SOP Library',
    description: 'SOP list filtered by department, and a document detail with metadata and version history, mock data.',
    to: '/demo/documents',
  },
  {
    title: 'Communications — Announcements',
    description: 'Company announcements feed with category/audience badges, and a composition form, mock data.',
    to: '/demo/communications',
  },
  {
    title: 'Reports — Executive Dashboard',
    description: 'Company-wide KPI cards, outlet checklist compliance, and a report export list, mock data.',
    to: '/demo/reports',
  },
  { title: 'Settings', description: 'Not yet built.', to: '/demo/settings' },
]

/**
 * Public, unauthenticated index of every module's frontend, each backed by
 * static mock data instead of Firestore/Cloud Functions — no backend needed.
 */
export function DemoHubPage() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
          Demo — mock data, no Firebase calls. Every module's frontend, no backend required.
        </div>

        <h1 className="mb-6 text-xl font-semibold text-foreground">NourishOS — Module Previews</h1>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MODULES.map((module) => (
            <Link key={module.to} to={module.to}>
              <Card className="h-full cursor-pointer transition-colors duration-150 hover:border-primary/40">
                <CardContent className="p-4">
                  <CardTitle className="text-base">{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
