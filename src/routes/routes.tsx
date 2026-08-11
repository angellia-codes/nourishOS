import { createBrowserRouter } from 'react-router-dom'
import { AuthLayout, DashboardLayout } from '@/layouts'
import { ProtectedRoute } from './ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { UnauthorizedPage } from '@/features/auth/UnauthorizedPage'
import { NotFoundPage } from '@/features/auth/NotFoundPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { AppraisalReviewPage } from '@/features/hr/pages/AppraisalReviewPage'
import { EmployeeListPage } from '@/features/hr/pages/EmployeeListPage'
import { EmployeeFormPage } from '@/features/hr/pages/EmployeeFormPage'
import { EmployeeProfilePage } from '@/features/hr/pages/EmployeeProfilePage'
import { ModulePlaceholder } from '@/components/shared/ModulePlaceholder'
import { CheckpointListPage } from '@/features/security/pages/CheckpointListPage'
import { PatrolCapturePage } from '@/features/security/pages/PatrolCapturePage'
import { LostFoundListPage } from '@/features/operations/lostFound/pages/LostFoundListPage'
import { LostFoundFormPage } from '@/features/operations/lostFound/pages/LostFoundFormPage'
import { LostFoundDetailPage } from '@/features/operations/lostFound/pages/LostFoundDetailPage'
import { IncidentListPage } from '@/features/operations/incidents/pages/IncidentListPage'
import { IncidentReportFormPage } from '@/features/operations/incidents/pages/IncidentReportFormPage'
import { IncidentDetailPage } from '@/features/operations/incidents/pages/IncidentDetailPage'
import { DailyUpdatesFeedPage } from '@/features/operations/dailyUpdates/pages/DailyUpdatesFeedPage'
import { DailyUpdateFormPage } from '@/features/operations/dailyUpdates/pages/DailyUpdateFormPage'
import { CalendarAgendaPage } from '@/features/calendar/pages/CalendarAgendaPage'
import { CalendarEventFormPage } from '@/features/calendar/pages/CalendarEventFormPage'
import { ROUTES } from '@/constants'

export const router = createBrowserRouter([
  // ---- Public ----
  {
    element: <AuthLayout />,
    children: [
      { path: ROUTES.LOGIN, element: <LoginPage /> },
      { path: ROUTES.UNAUTHORIZED, element: <UnauthorizedPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },

  // ---- Protected ----
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          {
            path: 'hr',
            children: [
              { index: true, element: <EmployeeListPage /> },
              { path: 'employees/new', element: <EmployeeFormPage /> },
              { path: 'employees/:employeeId', element: <EmployeeProfilePage /> },
              { path: 'employees/:employeeId/edit', element: <EmployeeFormPage /> },
              { path: 'appraisals/:appraisalId', element: <AppraisalReviewPage /> },
            ],
          },
          {
            path: 'calendar',
            children: [
              { index: true, element: <CalendarAgendaPage /> },
              { path: 'new', element: <CalendarEventFormPage /> },
            ],
          },
          {
            path: 'operations',
            children: [
              { index: true, element: <DailyUpdatesFeedPage /> },
              { path: 'daily-updates/new', element: <DailyUpdateFormPage /> },
              { path: 'lost-found', element: <LostFoundListPage /> },
              { path: 'lost-found/new', element: <LostFoundFormPage /> },
              { path: 'lost-found/:itemId', element: <LostFoundDetailPage /> },
              { path: 'incidents', element: <IncidentListPage /> },
              { path: 'incidents/new', element: <IncidentReportFormPage /> },
              { path: 'incidents/:incidentId', element: <IncidentDetailPage /> },
            ],
          },
          {
            path: 'security',
            children: [
              { index: true, element: <CheckpointListPage /> },
              { path: 'checkpoints/:checkpointId/patrol', element: <PatrolCapturePage /> },
            ],
          },
          { path: 'finance', element: <ModulePlaceholder title="Finance" /> },
          { path: 'purchasing', element: <ModulePlaceholder title="Purchasing" /> },
          { path: 'inventory', element: <ModulePlaceholder title="Inventory" /> },
          { path: 'crm', element: <ModulePlaceholder title="CRM" /> },
          { path: 'documents', element: <ModulePlaceholder title="Documents" /> },
          { path: 'communications', element: <ModulePlaceholder title="Communications" /> },
          { path: 'reports', element: <ModulePlaceholder title="Reports" /> },
          { path: 'settings', element: <ModulePlaceholder title="Settings" /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
