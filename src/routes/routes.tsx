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
import { EmployeeImportPage } from '@/features/hr/pages/EmployeeImportPage'
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
import { HrReportsPage } from '@/features/hr/reports/pages/HrReportsPage'
import { ActiveEmployeeReportPage } from '@/features/hr/reports/pages/ActiveEmployeeReportPage'
import { ResignedEmployeeReportPage } from '@/features/hr/reports/pages/ResignedEmployeeReportPage'
import { EmployeeTurnoverReportPage } from '@/features/hr/reports/pages/EmployeeTurnoverReportPage'
import { ManningBudgetReportPage } from '@/features/hr/reports/pages/ManningBudgetReportPage'
import { ManningCostReportPage } from '@/features/hr/reports/pages/ManningCostReportPage'
import { EmployeeActivityReportPage } from '@/features/hr/reports/pages/EmployeeActivityReportPage'
import { BudgetAndCostReportPage } from '@/features/hr/reports/pages/BudgetAndCostReportPage'
import { UpcomingActivityBudgetReportPage } from '@/features/hr/reports/pages/UpcomingActivityBudgetReportPage'
import { RecruitmentFunnelReportPage } from '@/features/hr/reports/pages/RecruitmentFunnelReportPage'
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
import { OperationsHomePage } from '@/features/operations/pages/OperationsHomePage'
import { WorkOrderListPage } from '@/features/operations/workOrders/pages/WorkOrderListPage'
import { WorkOrderFormPage } from '@/features/operations/workOrders/pages/WorkOrderFormPage'
import { WorkOrderDetailPage } from '@/features/operations/workOrders/pages/WorkOrderDetailPage'
import { ChecklistPage } from '@/features/operations/checklists/ChecklistPage'
import { JobDescriptionListPage } from '@/features/documents/jobDescriptions/pages/JobDescriptionListPage'
import { JobDescriptionFormPage } from '@/features/documents/jobDescriptions/pages/JobDescriptionFormPage'
import { JobDescriptionAccessPage } from '@/features/documents/jobDescriptions/pages/JobDescriptionAccessPage'
import { DocumentsHomePage } from '@/features/documents/pages/DocumentsHomePage'
import { SopListPage } from '@/features/documents/sopLibrary/pages/SopListPage'
import { SopFormPage } from '@/features/documents/sopLibrary/pages/SopFormPage'
import { SopAccessPage } from '@/features/documents/sopLibrary/pages/SopAccessPage'
import { CompanyFormListPage } from '@/features/documents/companyForms/pages/CompanyFormListPage'
import { CompanyFormFormPage } from '@/features/documents/companyForms/pages/CompanyFormFormPage'
import { TemplateListPage } from '@/features/documents/templates/pages/TemplateListPage'
import { TemplateFormPage } from '@/features/documents/templates/pages/TemplateFormPage'
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
import { RolePermissionsPage } from '@/features/settings/pages/RolePermissionsPage'
import { DisciplinaryRecordFormPage } from '@/features/hr/disciplinary/pages/DisciplinaryRecordFormPage'
import { DisciplinaryRecordDetailPage } from '@/features/hr/disciplinary/pages/DisciplinaryRecordDetailPage'
import { ContractRenewPage } from '@/features/hr/contracts/pages/ContractRenewPage'
import { ContractTerminatePage } from '@/features/hr/contracts/pages/ContractTerminatePage'
import { TrainingCatalogListPage } from '@/features/hr/training/pages/TrainingCatalogListPage'
import { TrainingFormPage } from '@/features/hr/training/pages/TrainingFormPage'
import { TrainingDetailPage } from '@/features/hr/training/pages/TrainingDetailPage'
import { SearchResultsPage } from '@/features/search/SearchResultsPage'
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
              { path: 'employees/import', element: <EmployeeImportPage /> },
              { path: 'employees/:employeeId', element: <EmployeeProfilePage /> },
              { path: 'employees/:employeeId/edit', element: <EmployeeFormPage /> },
              { path: 'appraisals/:appraisalId', element: <AppraisalReviewPage /> },
              { path: 'requisitions', element: <RequisitionListPage /> },
              { path: 'requisitions/new', element: <RequisitionFormPage /> },
              { path: 'requisitions/:requisitionId', element: <RequisitionDetailPage /> },
              { path: 'requisitions/:requisitionId/edit', element: <RequisitionFormPage /> },
              { path: 'employees/:employeeId/disciplinary/new', element: <DisciplinaryRecordFormPage /> },
              { path: 'employees/:employeeId/disciplinary/:recordId', element: <DisciplinaryRecordDetailPage /> },
              { path: 'employees/:employeeId/contracts/renew', element: <ContractRenewPage /> },
              { path: 'employees/:employeeId/contracts/terminate', element: <ContractTerminatePage /> },
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
              { path: 'training', element: <TrainingCatalogListPage /> },
              { path: 'training/new', element: <TrainingFormPage /> },
              { path: 'training/:trainingId', element: <TrainingDetailPage /> },
              { path: 'training/:trainingId/edit', element: <TrainingFormPage /> },
              { path: 'reports', element: <HrReportsPage /> },
              { path: 'reports/active-employees', element: <ActiveEmployeeReportPage /> },
              { path: 'reports/resigned-employees', element: <ResignedEmployeeReportPage /> },
              { path: 'reports/turnover', element: <EmployeeTurnoverReportPage /> },
              { path: 'reports/manning-budget', element: <ManningBudgetReportPage /> },
              { path: 'reports/manning-cost', element: <ManningCostReportPage /> },
              { path: 'reports/employee-activity', element: <EmployeeActivityReportPage /> },
              { path: 'reports/budget-and-cost', element: <BudgetAndCostReportPage /> },
              { path: 'reports/upcoming-activity-budget', element: <UpcomingActivityBudgetReportPage /> },
              { path: 'reports/recruitment-funnel', element: <RecruitmentFunnelReportPage /> },
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
            // Operations became a hub once Work Orders and Checklists landed
            // alongside the existing three — same "index becomes a hub" precedent
            // as HR and Documents. Daily Updates moved off the bare index.
            path: 'operations',
            children: [
              { index: true, element: <OperationsHomePage /> },
              { path: 'daily-updates', element: <DailyUpdatesFeedPage /> },
              { path: 'daily-updates/new', element: <DailyUpdateFormPage /> },
              { path: 'lost-found', element: <LostFoundListPage /> },
              { path: 'lost-found/new', element: <LostFoundFormPage /> },
              { path: 'lost-found/:itemId', element: <LostFoundDetailPage /> },
              { path: 'incidents', element: <IncidentListPage /> },
              { path: 'incidents/new', element: <IncidentReportFormPage /> },
              { path: 'incidents/:incidentId', element: <IncidentDetailPage /> },
              { path: 'work-orders', element: <WorkOrderListPage /> },
              { path: 'work-orders/new', element: <WorkOrderFormPage /> },
              { path: 'work-orders/:workOrderId', element: <WorkOrderDetailPage /> },
              { path: 'checklists/:type', element: <ChecklistPage /> },
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
              { path: 'company-forms', element: <CompanyFormListPage /> },
              { path: 'company-forms/new', element: <CompanyFormFormPage /> },
              { path: 'company-forms/:companyFormId/edit', element: <CompanyFormFormPage /> },
              { path: 'templates', element: <TemplateListPage /> },
              { path: 'templates/new', element: <TemplateFormPage /> },
              { path: 'templates/:templateId/edit', element: <TemplateFormPage /> },
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
          { path: 'settings', element: <RolePermissionsPage /> },
          { path: 'search', element: <SearchResultsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
