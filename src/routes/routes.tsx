import { createBrowserRouter } from 'react-router-dom'
import { AuthLayout, DashboardLayout } from '@/layouts'
import { ProtectedRoute } from './ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { UnauthorizedPage } from '@/features/auth/UnauthorizedPage'
import { NotFoundPage } from '@/features/auth/NotFoundPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { AppraisalReviewPage } from '@/features/hr/pages/AppraisalReviewPage'
import { EmployeeListPage } from '@/features/hr/pages/EmployeeListPage'
import { EmployeeFormPage } from '@/features/hr/pages/EmployeeFormPage'
import { EmployeeProfilePage } from '@/features/hr/pages/EmployeeProfilePage'
import { HrHomePage } from '@/features/hr/pages/HrHomePage'
import { RequisitionListPage } from '@/features/hr/recruitment/pages/RequisitionListPage'
import { RequisitionFormPage } from '@/features/hr/recruitment/pages/RequisitionFormPage'
import { RequisitionDetailPage } from '@/features/hr/recruitment/pages/RequisitionDetailPage'
import { CandidatePipelinePage } from '@/features/hr/recruitment/pages/CandidatePipelinePage'
import { CandidateFormPage } from '@/features/hr/recruitment/pages/CandidateFormPage'
import { CandidateDetailPage } from '@/features/hr/recruitment/pages/CandidateDetailPage'
import { InterviewFormPage } from '@/features/hr/recruitment/pages/InterviewFormPage'
import { OnboardingListPage } from '@/features/hr/recruitment/pages/OnboardingListPage'
import { OnboardingChecklistPage } from '@/features/hr/recruitment/pages/OnboardingChecklistPage'
import { InventoryItemListPage } from '@/features/hr/inventory/pages/InventoryItemListPage'
import { InventoryItemFormPage } from '@/features/hr/inventory/pages/InventoryItemFormPage'
import { InventoryItemDetailPage } from '@/features/hr/inventory/pages/InventoryItemDetailPage'
import { StockMovementFormPage } from '@/features/hr/inventory/pages/StockMovementFormPage'
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
import { JobDescriptionListPage } from '@/features/documents/jobDescriptions/pages/JobDescriptionListPage'
import { JobDescriptionFormPage } from '@/features/documents/jobDescriptions/pages/JobDescriptionFormPage'
import { JobDescriptionAccessPage } from '@/features/documents/jobDescriptions/pages/JobDescriptionAccessPage'
import { DocumentsHomePage } from '@/features/documents/pages/DocumentsHomePage'
import { SopListPage } from '@/features/documents/sopLibrary/pages/SopListPage'
import { SopFormPage } from '@/features/documents/sopLibrary/pages/SopFormPage'
import { SopAccessPage } from '@/features/documents/sopLibrary/pages/SopAccessPage'
import { ExpenseListPage } from '@/features/finance/expenses/pages/ExpenseListPage'
import { ExpenseFormPage } from '@/features/finance/expenses/pages/ExpenseFormPage'
import { ExpenseDetailPage } from '@/features/finance/expenses/pages/ExpenseDetailPage'
import { CommunicationsHomePage } from '@/features/communications/pages/CommunicationsHomePage'
import { AnnouncementListPage } from '@/features/communications/announcements/pages/AnnouncementListPage'
import { AnnouncementFormPage } from '@/features/communications/announcements/pages/AnnouncementFormPage'
import { AnnouncementDetailPage } from '@/features/communications/announcements/pages/AnnouncementDetailPage'
import { TaskListPage } from '@/features/communications/tasks/pages/TaskListPage'
import { TaskFormPage } from '@/features/communications/tasks/pages/TaskFormPage'
import { TaskDetailPage } from '@/features/communications/tasks/pages/TaskDetailPage'
import { CalendarAgendaPage } from '@/features/calendar/pages/CalendarAgendaPage'
import { CalendarEventFormPage } from '@/features/calendar/pages/CalendarEventFormPage'
import { ROUTES } from '@/constants'

export const router = createBrowserRouter([
  // ---- Public ----
  {
    element: <AuthLayout />,
    children: [
      { path: ROUTES.LOGIN, element: <LoginPage /> },
      { path: ROUTES.REGISTER, element: <RegisterPage /> },
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
            // Four sub-modules now (employees + the recruitment pipeline), so
            // the index is a hub. Static segments before the :id route in each
            // group, or the param route swallows them.
            path: 'hr',
            children: [
              { index: true, element: <HrHomePage /> },
              { path: 'employees', element: <EmployeeListPage /> },
              { path: 'employees/new', element: <EmployeeFormPage /> },
              { path: 'employees/:employeeId', element: <EmployeeProfilePage /> },
              { path: 'employees/:employeeId/edit', element: <EmployeeFormPage /> },
              { path: 'appraisals/:appraisalId', element: <AppraisalReviewPage /> },
              { path: 'requisitions', element: <RequisitionListPage /> },
              { path: 'requisitions/new', element: <RequisitionFormPage /> },
              { path: 'requisitions/:requisitionId', element: <RequisitionDetailPage /> },
              { path: 'requisitions/:requisitionId/edit', element: <RequisitionFormPage /> },
              { path: 'candidates', element: <CandidatePipelinePage /> },
              { path: 'candidates/new', element: <CandidateFormPage /> },
              { path: 'candidates/:candidateId', element: <CandidateDetailPage /> },
              { path: 'candidates/:candidateId/edit', element: <CandidateFormPage /> },
              { path: 'candidates/:candidateId/interviews/new', element: <InterviewFormPage /> },
              { path: 'onboarding', element: <OnboardingListPage /> },
              { path: 'onboarding/:checklistId', element: <OnboardingChecklistPage /> },
              { path: 'inventory', element: <InventoryItemListPage /> },
              { path: 'inventory/new', element: <InventoryItemFormPage /> },
              { path: 'inventory/:itemId', element: <InventoryItemDetailPage /> },
              { path: 'inventory/:itemId/edit', element: <InventoryItemFormPage /> },
              { path: 'inventory/:itemId/receive', element: <StockMovementFormPage /> },
              { path: 'inventory/:itemId/issue', element: <StockMovementFormPage /> },
              { path: 'inventory/:itemId/transfer', element: <StockMovementFormPage /> },
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
          {
            // One sub-module ships, so the index is the register itself rather
            // than a hub — same shape as /operations being the Daily Updates
            // feed. Static segments before the :id route.
            path: 'finance',
            children: [
              { index: true, element: <ExpenseListPage /> },
              { path: 'expenses/new', element: <ExpenseFormPage /> },
              { path: 'expenses/:expenseRequestId', element: <ExpenseDetailPage /> },
              { path: 'expenses/:expenseRequestId/edit', element: <ExpenseFormPage /> },
            ],
          },
          { path: 'purchasing', element: <ModulePlaceholder title="Purchasing" /> },
          { path: 'inventory', element: <ModulePlaceholder title="Inventory" /> },
          { path: 'crm', element: <ModulePlaceholder title="CRM" /> },
          {
            // Two sub-modules ship, so the index is a hub rather than either
            // register. Static segments before the :id route in each group, or
            // the param route swallows them.
            path: 'documents',
            children: [
              { index: true, element: <DocumentsHomePage /> },
              { path: 'job-descriptions', element: <JobDescriptionListPage /> },
              { path: 'job-descriptions/new', element: <JobDescriptionFormPage /> },
              { path: 'job-descriptions/access', element: <JobDescriptionAccessPage /> },
              { path: 'job-descriptions/:jobDescriptionId/edit', element: <JobDescriptionFormPage /> },
              { path: 'sop-library', element: <SopListPage /> },
              { path: 'sop-library/new', element: <SopFormPage /> },
              { path: 'sop-library/access', element: <SopAccessPage /> },
              { path: 'sop-library/:sopId/edit', element: <SopFormPage /> },
            ],
          },
          {
            // Announcements and Tasks ship, so the index is a hub. Static
            // segments before the :id route in each group, or the param route
            // swallows them.
            path: 'communications',
            children: [
              { index: true, element: <CommunicationsHomePage /> },
              { path: 'announcements', element: <AnnouncementListPage /> },
              { path: 'announcements/new', element: <AnnouncementFormPage /> },
              { path: 'announcements/:announcementId', element: <AnnouncementDetailPage /> },
              { path: 'announcements/:announcementId/edit', element: <AnnouncementFormPage /> },
              { path: 'tasks', element: <TaskListPage /> },
              { path: 'tasks/new', element: <TaskFormPage /> },
              { path: 'tasks/:taskId', element: <TaskDetailPage /> },
            ],
          },
          { path: 'reports', element: <ModulePlaceholder title="Reports" /> },
          { path: 'settings', element: <ModulePlaceholder title="Settings" /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
