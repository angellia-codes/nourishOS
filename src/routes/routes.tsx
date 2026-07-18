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
import { EmployeeListDemoPage } from '@/features/hr/pages/EmployeeListDemoPage'
import { EmployeeProfileDemoPage } from '@/features/hr/pages/EmployeeProfileDemoPage'
import { EmployeeFormPage } from '@/features/hr/pages/EmployeeFormPage'
import { EmployeeProfilePage } from '@/features/hr/pages/EmployeeProfilePage'
import { ModulePlaceholder } from '@/components/shared/ModulePlaceholder'
import { CheckpointListPage } from '@/features/security/pages/CheckpointListPage'
import { CheckpointListDemoPage } from '@/features/security/pages/CheckpointListDemoPage'
import { PatrolCapturePage } from '@/features/security/pages/PatrolCapturePage'
import { DailyUpdatesFeedDemoPage } from '@/features/operations/dailyUpdates/DailyUpdatesFeedDemoPage'
import { DailyUpdateFormDemoPage } from '@/features/operations/dailyUpdates/DailyUpdateFormDemoPage'
import { RequisitionListDemoPage } from '@/features/hr/recruitment/RequisitionListDemoPage'
import { RequisitionDetailDemoPage } from '@/features/hr/recruitment/RequisitionDetailDemoPage'
import { RequisitionFormDemoPage } from '@/features/hr/recruitment/RequisitionFormDemoPage'
import { RecruitmentPipelineDemoPage } from '@/features/hr/recruitment/RecruitmentPipelineDemoPage'
import { CandidateDetailDemoPage } from '@/features/hr/recruitment/CandidateDetailDemoPage'
import { CandidateFormDemoPage } from '@/features/hr/recruitment/CandidateFormDemoPage'
import { OnboardingListDemoPage } from '@/features/hr/onboarding/OnboardingListDemoPage'
import { OnboardingChecklistDetailDemoPage } from '@/features/hr/onboarding/OnboardingChecklistDetailDemoPage'
import { OffboardingListDemoPage } from '@/features/hr/offboarding/OffboardingListDemoPage'
import { OffboardingChecklistDetailDemoPage } from '@/features/hr/offboarding/OffboardingChecklistDetailDemoPage'
import { ExitInterviewFormDemoPage } from '@/features/hr/offboarding/ExitInterviewFormDemoPage'
import { EmploymentApplicationFormDemoPage } from '@/features/hr/recruitment/EmploymentApplicationFormDemoPage'
import { CheckpointRegistrationDemoPage } from '@/features/security/pages/CheckpointRegistrationDemoPage'
import { IncidentListDemoPage } from '@/features/operations/incidents/IncidentListDemoPage'
import { IncidentDetailDemoPage } from '@/features/operations/incidents/IncidentDetailDemoPage'
import { IncidentReportFormDemoPage } from '@/features/operations/incidents/IncidentReportFormDemoPage'
import { LostFoundListDemoPage } from '@/features/operations/lostFound/LostFoundListDemoPage'
import { LostFoundFormDemoPage } from '@/features/operations/lostFound/LostFoundFormDemoPage'
import { LostFoundListPage } from '@/features/operations/lostFound/pages/LostFoundListPage'
import { LostFoundFormPage } from '@/features/operations/lostFound/pages/LostFoundFormPage'
import { LostFoundDetailPage } from '@/features/operations/lostFound/pages/LostFoundDetailPage'
import { IncidentListPage } from '@/features/operations/incidents/pages/IncidentListPage'
import { IncidentReportFormPage } from '@/features/operations/incidents/pages/IncidentReportFormPage'
import { IncidentDetailPage } from '@/features/operations/incidents/pages/IncidentDetailPage'
import { DailyUpdatesFeedPage } from '@/features/operations/dailyUpdates/pages/DailyUpdatesFeedPage'
import { DailyUpdateFormPage } from '@/features/operations/dailyUpdates/pages/DailyUpdateFormPage'
import { DemoHubPage } from '@/features/demo/DemoHubPage'
import { DashboardDemoPage } from '@/features/dashboard/DashboardDemoPage'
import { ExpenseRequestListDemoPage } from '@/features/finance/ExpenseRequestListDemoPage'
import { ExpenseRequestDetailDemoPage } from '@/features/finance/ExpenseRequestDetailDemoPage'
import { ExpenseRequestFormDemoPage } from '@/features/finance/ExpenseRequestFormDemoPage'
import { ExpenseRequestListPage } from '@/features/finance/pages/ExpenseRequestListPage'
import { ExpenseRequestFormPage } from '@/features/finance/pages/ExpenseRequestFormPage'
import { ExpenseRequestDetailPage } from '@/features/finance/pages/ExpenseRequestDetailPage'
import { RequisitionListPage } from '@/features/hr/recruitment/pages/RequisitionListPage'
import { RequisitionFormPage } from '@/features/hr/recruitment/pages/RequisitionFormPage'
import { RequisitionDetailPage } from '@/features/hr/recruitment/pages/RequisitionDetailPage'
import { DisciplinaryListPage } from '@/features/hr/disciplinary/pages/DisciplinaryListPage'
import { DisciplinaryFormPage } from '@/features/hr/disciplinary/pages/DisciplinaryFormPage'
import { DisciplinaryDetailPage } from '@/features/hr/disciplinary/pages/DisciplinaryDetailPage'
import { StockLevelListDemoPage } from '@/features/inventory/StockLevelListDemoPage'
import { StockMovementFormDemoPage } from '@/features/inventory/StockMovementFormDemoPage'
import { SopLibraryListDemoPage } from '@/features/documents/SopLibraryListDemoPage'
import { SopDetailDemoPage } from '@/features/documents/SopDetailDemoPage'
import { AnnouncementListDemoPage } from '@/features/communications/AnnouncementListDemoPage'
import { AnnouncementFormDemoPage } from '@/features/communications/AnnouncementFormDemoPage'
import { ExecutiveDashboardDemoPage } from '@/features/reports/ExecutiveDashboardDemoPage'
import { ROUTES } from '@/constants'

export const router = createBrowserRouter([
  // ---- Public ----
  {
    element: <AuthLayout />,
    children: [
      { path: ROUTES.LOGIN, element: <LoginPage /> },
      { path: ROUTES.UNAUTHORIZED, element: <UnauthorizedPage /> },
      { path: '/demo', element: <DemoHubPage /> },
      { path: '/demo/dashboard', element: <DashboardDemoPage /> },
      { path: '/demo/appraisal', element: <AppraisalDemoPage /> },
      { path: '/demo/hr/employees', element: <EmployeeListDemoPage /> },
      { path: '/demo/hr/employees/:employeeId', element: <EmployeeProfileDemoPage /> },
      { path: '/demo/hr/requisitions', element: <RequisitionListDemoPage /> },
      { path: '/demo/hr/requisitions/new', element: <RequisitionFormDemoPage /> },
      { path: '/demo/hr/requisitions/:requisitionId', element: <RequisitionDetailDemoPage /> },
      { path: '/demo/hr/pipeline', element: <RecruitmentPipelineDemoPage /> },
      { path: '/demo/hr/pipeline/new', element: <CandidateFormDemoPage /> },
      { path: '/demo/hr/pipeline/apply', element: <EmploymentApplicationFormDemoPage /> },
      { path: '/demo/hr/pipeline/:candidateId', element: <CandidateDetailDemoPage /> },
      { path: '/demo/hr/onboarding', element: <OnboardingListDemoPage /> },
      { path: '/demo/hr/onboarding/:checklistId', element: <OnboardingChecklistDetailDemoPage /> },
      { path: '/demo/hr/offboarding', element: <OffboardingListDemoPage /> },
      { path: '/demo/hr/offboarding/:checklistId', element: <OffboardingChecklistDetailDemoPage /> },
      { path: '/demo/hr/exit-interview', element: <ExitInterviewFormDemoPage /> },
      { path: '/demo/security', element: <CheckpointListDemoPage /> },
      { path: '/demo/security/checkpoints/new', element: <CheckpointRegistrationDemoPage /> },
      { path: '/demo/operations', element: <DailyUpdatesFeedDemoPage /> },
      { path: '/demo/operations/daily-updates/new', element: <DailyUpdateFormDemoPage /> },
      { path: '/demo/operations/incidents', element: <IncidentListDemoPage /> },
      { path: '/demo/operations/incidents/new', element: <IncidentReportFormDemoPage /> },
      { path: '/demo/operations/incidents/:incidentId', element: <IncidentDetailDemoPage /> },
      { path: '/demo/operations/lost-found', element: <LostFoundListDemoPage /> },
      { path: '/demo/operations/lost-found/new', element: <LostFoundFormDemoPage /> },
      { path: '/demo/finance', element: <ExpenseRequestListDemoPage /> },
      { path: '/demo/finance/expenses/new', element: <ExpenseRequestFormDemoPage /> },
      { path: '/demo/finance/expenses/:expenseId', element: <ExpenseRequestDetailDemoPage /> },
      { path: '/demo/purchasing', element: <ModulePlaceholder title="Purchasing" /> },
      { path: '/demo/inventory', element: <StockLevelListDemoPage /> },
      { path: '/demo/inventory/movements/new', element: <StockMovementFormDemoPage /> },
      { path: '/demo/crm', element: <ModulePlaceholder title="CRM" /> },
      { path: '/demo/documents', element: <SopLibraryListDemoPage /> },
      { path: '/demo/documents/:documentId', element: <SopDetailDemoPage /> },
      { path: '/demo/communications', element: <AnnouncementListDemoPage /> },
      { path: '/demo/communications/new', element: <AnnouncementFormDemoPage /> },
      { path: '/demo/reports', element: <ExecutiveDashboardDemoPage /> },
      { path: '/demo/settings', element: <ModulePlaceholder title="Settings" /> },
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
              { path: 'recruitment', element: <RequisitionListPage /> },
              { path: 'recruitment/new', element: <RequisitionFormPage /> },
              { path: 'recruitment/:requisitionId', element: <RequisitionDetailPage /> },
              { path: 'disciplinary', element: <DisciplinaryListPage /> },
              { path: 'disciplinary/new', element: <DisciplinaryFormPage /> },
              { path: 'disciplinary/:actionId', element: <DisciplinaryDetailPage /> },
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
          {
            path: 'finance',
            children: [
              { index: true, element: <ExpenseRequestListPage /> },
              { path: 'expenses/new', element: <ExpenseRequestFormPage /> },
              { path: 'expenses/:expenseId', element: <ExpenseRequestDetailPage /> },
            ],
          },
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
