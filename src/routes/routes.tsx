import { createBrowserRouter } from 'react-router-dom'
import { AuthLayout, DashboardLayout } from '@/layouts'
import { ProtectedRoute } from './ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { UnauthorizedPage } from '@/features/auth/UnauthorizedPage'
import { NotFoundPage } from '@/features/auth/NotFoundPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { AppraisalReviewPage } from '@/features/hr/pages/AppraisalReviewPage'
import { AppraisalDemoPage } from '@/features/hr/pages/AppraisalDemoPage'
import { EmployeeListPage } from '@/features/hr/pages/EmployeeListPage'
import { EmployeeFormPage } from '@/features/hr/pages/EmployeeFormPage'
import { EmployeeProfilePage } from '@/features/hr/pages/EmployeeProfilePage'
import { ModulePlaceholder } from '@/components/shared/ModulePlaceholder'
import { CheckpointListPage } from '@/features/security/pages/CheckpointListPage'
import { PatrolCapturePage } from '@/features/security/pages/PatrolCapturePage'
import { ROUTES } from '@/constants'

export const router = createBrowserRouter([
  // ---- Public ----
  {
    element: <AuthLayout />,
    children: [
      { path: ROUTES.LOGIN, element: <LoginPage /> },
      { path: ROUTES.UNAUTHORIZED, element: <UnauthorizedPage /> },
      { path: '/demo/appraisal', element: <AppraisalDemoPage /> },
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
          { path: 'operations', element: <ModulePlaceholder title="Operations" /> },
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
