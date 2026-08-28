import { createBrowserRouter, Navigate, useParams } from 'react-router-dom'
import { AuthLayout, DashboardLayout } from '@/layouts'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleRoute } from './RoleRoute'
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
import { RecruitmentHomePage } from '@/features/recruitment/pages/RecruitmentHomePage'
import { RequisitionListPage } from '@/features/recruitment/pages/RequisitionListPage'
import { RequisitionFormPage } from '@/features/recruitment/pages/RequisitionFormPage'
import { RequisitionDetailPage } from '@/features/recruitment/pages/RequisitionDetailPage'
import { CandidatePipelinePage } from '@/features/recruitment/pages/CandidatePipelinePage'
import { CandidateFormPage } from '@/features/recruitment/pages/CandidateFormPage'
import { CandidateDetailPage } from '@/features/recruitment/pages/CandidateDetailPage'
import { InterviewFormPage } from '@/features/recruitment/pages/InterviewFormPage'
import { OnboardingListPage } from '@/features/recruitment/pages/OnboardingListPage'
import { OnboardingChecklistPage } from '@/features/recruitment/pages/OnboardingChecklistPage'
import { OffboardingListPage } from '@/features/hr/offboarding/pages/OffboardingListPage'
import { OffboardingChecklistPage } from '@/features/hr/offboarding/pages/OffboardingChecklistPage'
import { ClearanceStatementPage } from '@/features/hr/offboarding/pages/ClearanceStatementPage'
import { ExitInterviewFormPage } from '@/features/hr/offboarding/pages/ExitInterviewFormPage'
import { InventoryItemListPage } from '@/features/hr/inventory/pages/InventoryItemListPage'
import { InventoryItemFormPage } from '@/features/hr/inventory/pages/InventoryItemFormPage'
import { InventoryItemDetailPage } from '@/features/hr/inventory/pages/InventoryItemDetailPage'
import { StockMovementFormPage } from '@/features/hr/inventory/pages/StockMovementFormPage'
import { EngagementListPage } from '@/features/hr/engagement/pages/EngagementListPage'
import { EngagementFormPage } from '@/features/hr/engagement/pages/EngagementFormPage'
import { EngagementDetailPage } from '@/features/hr/engagement/pages/EngagementDetailPage'
import { HrReportsPage } from '@/features/hr/reports/pages/HrReportsPage'
import { ActiveEmployeeReportPage } from '@/features/hr/reports/pages/ActiveEmployeeReportPage'
import { ResignedEmployeeReportPage } from '@/features/hr/reports/pages/ResignedEmployeeReportPage'
import { EmployeeTurnoverReportPage } from '@/features/hr/reports/pages/EmployeeTurnoverReportPage'
import { ManningBudgetReportPage } from '@/features/hr/reports/pages/ManningBudgetReportPage'
import { EmployeeActivityReportPage } from '@/features/hr/reports/pages/EmployeeActivityReportPage'
import { TrainingHoursReportPage } from '@/features/hr/reports/pages/TrainingHoursReportPage'
import { AttendanceReportPage } from '@/features/hr/reports/pages/AttendanceReportPage'
import { InventoryCostReportPage } from '@/features/hr/reports/pages/InventoryCostReportPage'
import { UpcomingActivityBudgetReportPage } from '@/features/hr/reports/pages/UpcomingActivityBudgetReportPage'
import { RecruitmentFunnelReportPage } from '@/features/hr/reports/pages/RecruitmentFunnelReportPage'
import { ExitInterviewInsightsReportPage } from '@/features/hr/reports/pages/ExitInterviewInsightsReportPage'
import { PayrollBatchListPage } from '@/features/hr/payroll/pages/PayrollBatchListPage'
import { PayrollBatchDetailPage } from '@/features/hr/payroll/pages/PayrollBatchDetailPage'
import { PayrollImportPage } from '@/features/hr/payroll/pages/PayrollImportPage'
import { PayslipViewPage } from '@/features/hr/payroll/pages/PayslipViewPage'
import { PayrollComponentsPage } from '@/features/hr/payroll/pages/PayrollComponentsPage'
import { PayrollParametersPage } from '@/features/hr/payroll/pages/PayrollParametersPage'
import { MonthlyRevenueListPage } from '@/features/hr/payroll/pages/MonthlyRevenueListPage'
import { AttendancePeriodListPage } from '@/features/hr/attendance/pages/AttendancePeriodListPage'
import { AttendanceImportPage } from '@/features/hr/attendance/pages/AttendanceImportPage'
import { AttendancePeriodDetailPage } from '@/features/hr/attendance/pages/AttendancePeriodDetailPage'
import { ModulePlaceholder } from '@/components/shared/ModulePlaceholder'
import { CheckpointListPage } from '@/features/security/pages/CheckpointListPage'
import { CheckpointFormPage } from '@/features/security/pages/CheckpointFormPage'
import { PatrolCapturePage } from '@/features/security/pages/PatrolCapturePage'
import { ExtinguisherListPage } from '@/features/security/fireExtinguishers/pages/ExtinguisherListPage'
import { ExtinguisherFormPage } from '@/features/security/fireExtinguishers/pages/ExtinguisherFormPage'
import { ExtinguisherDetailPage } from '@/features/security/fireExtinguishers/pages/ExtinguisherDetailPage'
import { InspectionRoundPage } from '@/features/security/fireExtinguishers/pages/InspectionRoundPage'
import { LostFoundListPage } from '@/features/operations/lostFound/pages/LostFoundListPage'
import { LostFoundFormPage } from '@/features/operations/lostFound/pages/LostFoundFormPage'
import { LostFoundDetailPage } from '@/features/operations/lostFound/pages/LostFoundDetailPage'
import { IncidentListPage } from '@/features/operations/incidents/pages/IncidentListPage'
import { IncidentReportFormPage } from '@/features/operations/incidents/pages/IncidentReportFormPage'
import { IncidentDetailPage } from '@/features/operations/incidents/pages/IncidentDetailPage'
import { DailyUpdatesFeedPage } from '@/features/operations/dailyUpdates/pages/DailyUpdatesFeedPage'
import { DailyUpdateFormPage } from '@/features/operations/dailyUpdates/pages/DailyUpdateFormPage'
import { DailyUpdateDetailPage } from '@/features/operations/dailyUpdates/pages/DailyUpdateDetailPage'
import { OperationsHomePage } from '@/features/operations/pages/OperationsHomePage'
import { EngineeringHomePage } from '@/features/engineering/pages/EngineeringHomePage'
import { WorkOrderListPage } from '@/features/engineering/workOrders/pages/WorkOrderListPage'
import { ProjectBoardPage } from '@/features/operations/projects/pages/ProjectBoardPage'
import { ProjectDetailPage } from '@/features/operations/projects/pages/ProjectDetailPage'
import { ProjectFormPage } from '@/features/operations/projects/pages/ProjectFormPage'
import { FlashReportPage } from '@/features/reports/pages/FlashReportPage'
import { WorkOrderFormPage } from '@/features/engineering/workOrders/pages/WorkOrderFormPage'
import { WorkOrderDetailPage } from '@/features/engineering/workOrders/pages/WorkOrderDetailPage'
import { EquipmentListPage } from '@/features/engineering/equipment/pages/EquipmentListPage'
import { EquipmentDetailPage } from '@/features/engineering/equipment/pages/EquipmentDetailPage'
import { EquipmentFormPage } from '@/features/engineering/equipment/pages/EquipmentFormPage'
import { EquipmentImportPage } from '@/features/engineering/equipment/pages/EquipmentImportPage'
import { ShiftReportsFeedPage } from '@/features/operations/shiftReports/pages/ShiftReportsFeedPage'
import { ShiftReportFormPage } from '@/features/operations/shiftReports/pages/ShiftReportFormPage'
import { ShiftReportDetailPage } from '@/features/operations/shiftReports/pages/ShiftReportDetailPage'
import { JobDescriptionListPage } from '@/features/documents/jobDescriptions/pages/JobDescriptionListPage'
import { JobDescriptionFormPage } from '@/features/documents/jobDescriptions/pages/JobDescriptionFormPage'
import { JobDescriptionAccessPage } from '@/features/documents/jobDescriptions/pages/JobDescriptionAccessPage'
import { DocumentsHomePage } from '@/features/documents/pages/DocumentsHomePage'
import { SopListPage } from '@/features/documents/sopLibrary/pages/SopListPage'
import { SopFormPage } from '@/features/documents/sopLibrary/pages/SopFormPage'
import { SopAccessPage } from '@/features/documents/sopLibrary/pages/SopAccessPage'
import { CompanyFormListPage } from '@/features/documents/companyForms/pages/CompanyFormListPage'
import { CompanyFormFormPage } from '@/features/documents/companyForms/pages/CompanyFormFormPage'
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
import { CommunicationRecordListPage } from '@/features/communications/employeeCommunication/pages/CommunicationRecordListPage'
import { CommunicationRecordFormPage } from '@/features/communications/employeeCommunication/pages/CommunicationRecordFormPage'
import { CommunicationRecordDetailPage } from '@/features/communications/employeeCommunication/pages/CommunicationRecordDetailPage'
import { ChatChannelFormPage } from '@/features/communications/chat/pages/ChatChannelFormPage'
import { ChatChannelPage } from '@/features/communications/chat/pages/ChatChannelPage'
import { CommunicationSettingsPage } from '@/features/settings/pages/CommunicationSettingsPage'
import { CalendarAgendaPage } from '@/features/calendar/pages/CalendarAgendaPage'
import { CalendarEventFormPage } from '@/features/calendar/pages/CalendarEventFormPage'
import { RolePermissionsPage } from '@/features/settings/pages/RolePermissionsPage'
import { ContractRenewPage } from '@/features/hr/contracts/pages/ContractRenewPage'
import { ContractTerminatePage } from '@/features/hr/contracts/pages/ContractTerminatePage'
import { PositionListPage } from '@/features/hr/positions/pages/PositionListPage'
import { PositionDetailPage } from '@/features/hr/positions/pages/PositionDetailPage'
import { PositionFormPage } from '@/features/hr/positions/pages/PositionFormPage'
import { AppraisalTemplateListPage } from '@/features/hr/appraisal/pages/AppraisalTemplateListPage'
import { AppraisalTemplateReviewPage } from '@/features/hr/appraisal/pages/AppraisalTemplateReviewPage'
import { TrainingCataloguePage } from '@/features/hr/training/pages/TrainingCataloguePage'
import { MyTrainingPage } from '@/features/hr/training/pages/MyTrainingPage'
import { TeamTrainingPage } from '@/features/hr/training/pages/TeamTrainingPage'
import { SearchResultsPage } from '@/features/search/SearchResultsPage'
import { ROUTES, ROLES, HR_REPORT_ROLES } from '@/constants'

/**
 * Work Orders left /operations for /engineering (2026-08-25). Rewriting the tail
 * rather than dropping to the list keeps a deep link to one work order intact.
 */
function WorkOrderRedirect() {
  const rest = useParams()['*'] ?? ''
  return <Navigate to={`/engineering/work-orders/${rest}`} replace />
}

/** HR module allow-list — everyone else does not see /hr at all. */
const HR_MODULE_ROLES: string[] = [...HR_REPORT_ROLES]

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
            // The employee register and everything hanging off it is HR's own
            // module — GM/Director/HR/superAdmin only (2026-08-19). Recruitment
            // moved out to /recruitment precisely because department heads need
            // that half and not this one.
            element: <RoleRoute roles={HR_MODULE_ROLES} />,
            children: [
              {
                // Static segments before the :id route in each group, or the
                // param route swallows them.
                path: 'hr',
                children: [
              { index: true, element: <HrHomePage /> },
              { path: 'employees', element: <EmployeeListPage /> },
              { path: 'employees/new', element: <EmployeeFormPage /> },
              { path: 'employees/import', element: <EmployeeImportPage /> },
              { path: 'employees/:employeeId', element: <EmployeeProfilePage /> },
              { path: 'employees/:employeeId/edit', element: <EmployeeFormPage /> },
              { path: 'appraisals/:appraisalId', element: <AppraisalReviewPage /> },
              { path: 'appraisal-templates', element: <AppraisalTemplateListPage /> },
              { path: 'appraisal-templates/:templateId', element: <AppraisalTemplateReviewPage /> },
              { path: 'employees/:employeeId/contracts/renew', element: <ContractRenewPage /> },
              { path: 'employees/:employeeId/contracts/terminate', element: <ContractTerminatePage /> },
              { path: 'offboarding', element: <OffboardingListPage /> },
              { path: 'offboarding/:checklistId', element: <OffboardingChecklistPage /> },
              { path: 'offboarding/:checklistId/statement', element: <ClearanceStatementPage /> },
              { path: 'offboarding/:checklistId/exit-interview', element: <ExitInterviewFormPage /> },
              { path: 'inventory', element: <InventoryItemListPage /> },
              { path: 'inventory/new', element: <InventoryItemFormPage /> },
              { path: 'inventory/:itemId', element: <InventoryItemDetailPage /> },
              { path: 'inventory/:itemId/edit', element: <InventoryItemFormPage /> },
              { path: 'inventory/:itemId/receive', element: <StockMovementFormPage /> },
              { path: 'inventory/:itemId/issue', element: <StockMovementFormPage /> },
              { path: 'inventory/:itemId/transfer', element: <StockMovementFormPage /> },
              // training-module-spec-v1.0.md §9 — the HR-facing catalogue. The
              // trainee queue and the verification queue are mounted at
              // /training, outside this RoleRoute (see below). The flat
              // catalogue CRUD routes this replaced are gone with their pages.
              { path: 'training', element: <TrainingCataloguePage /> },
              { path: 'engagement', element: <EngagementListPage /> },
              { path: 'engagement/new', element: <EngagementFormPage /> },
              { path: 'engagement/:engagementId', element: <EngagementDetailPage /> },
              { path: 'engagement/:engagementId/edit', element: <EngagementFormPage /> },
              // Static paths before the param routes, or ':batchId' swallows them.
              { path: 'payroll', element: <PayrollBatchListPage /> },
              { path: 'payroll/import', element: <PayrollImportPage /> },
              { path: 'payroll/revenue', element: <MonthlyRevenueListPage /> },
              { path: 'payroll/components', element: <PayrollComponentsPage /> },
              { path: 'payroll/parameters', element: <PayrollParametersPage /> },
              { path: 'payroll/batches/:batchId', element: <PayrollBatchDetailPage /> },
              { path: 'payroll/payslips/:payslipId', element: <PayslipViewPage /> },
              // Static paths before ':periodId', same reason payroll/batches/:batchId sits after its siblings.
              { path: 'attendance', element: <AttendancePeriodListPage /> },
              { path: 'attendance/import', element: <AttendanceImportPage /> },
              { path: 'attendance/periods/:periodId', element: <AttendancePeriodDetailPage /> },
              { path: 'reports', element: <HrReportsPage /> },
              { path: 'reports/active-employees', element: <ActiveEmployeeReportPage /> },
              { path: 'reports/resigned-employees', element: <ResignedEmployeeReportPage /> },
              { path: 'reports/turnover', element: <EmployeeTurnoverReportPage /> },
              { path: 'reports/manning-budget', element: <ManningBudgetReportPage /> },
              { path: 'reports/employee-activity', element: <EmployeeActivityReportPage /> },
              { path: 'reports/training-hours', element: <TrainingHoursReportPage /> },
              { path: 'reports/inventory-cost', element: <InventoryCostReportPage /> },
              { path: 'reports/upcoming-activity-budget', element: <UpcomingActivityBudgetReportPage /> },
              { path: 'reports/recruitment-funnel', element: <RecruitmentFunnelReportPage /> },
              { path: 'reports/exit-interview-insights', element: <ExitInterviewInsightsReportPage /> },
              { path: 'reports/attendance', element: <AttendanceReportPage /> },
                ],
              },
            ],
          },
          {
            // §5's "All staff — own assignments only" cannot live under the
            // HR_MODULE_ROLES gate: every trainee reads their own queue, and
            // department heads verify their own team without holding HR's
            // module access. Same reasoning that keeps /positions out.
            path: 'training',
            children: [
              { index: true, element: <MyTrainingPage /> },
              { path: 'me', element: <MyTrainingPage /> },
              { path: 'team', element: <TeamTrainingPage /> },
            ],
          },
          {
            // Positions Master is org-wide infrastructure (positions.read = all
            // authenticated), not HR-employee-record-scoped — same reasoning
            // that put Recruitment at its own top level rather than under the
            // HR_MODULE_ROLES-gated /hr tree.
            path: 'positions',
            children: [
              { index: true, element: <PositionListPage /> },
              { path: 'new', element: <PositionFormPage /> },
              { path: ':positionId', element: <PositionDetailPage /> },
              { path: ':positionId/edit', element: <PositionFormPage /> },
            ],
          },
          {
            // Recruitment is its own module rather than an HR sub-page: every
            // department head raises requisitions, and the hiring pipeline has
            // a different audience from the employee register.
            path: 'recruitment',
            children: [
              { index: true, element: <RecruitmentHomePage /> },
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
            // Operations became a hub once Work Orders and Shift Reports landed
            // alongside the existing three — same "index becomes a hub" precedent
            // as HR and Documents. Daily Updates moved off the bare index.
            path: 'operations',
            children: [
              { index: true, element: <OperationsHomePage /> },
              { path: 'daily-updates', element: <DailyUpdatesFeedPage /> },
              { path: 'daily-updates/new', element: <DailyUpdateFormPage /> },
              { path: 'daily-updates/:reportId', element: <DailyUpdateDetailPage /> },
              { path: 'lost-found', element: <LostFoundListPage /> },
              { path: 'lost-found/new', element: <LostFoundFormPage /> },
              { path: 'lost-found/:itemId', element: <LostFoundDetailPage /> },
              { path: 'incidents', element: <IncidentListPage /> },
              { path: 'incidents/new', element: <IncidentReportFormPage /> },
              { path: 'incidents/:incidentId', element: <IncidentDetailPage /> },
              // Work Orders moved to /engineering (2026-08-25). Bookmarks and the
              // deep links already sitting in sent notifications keep working.
              { path: 'work-orders/*', element: <WorkOrderRedirect /> },
              { path: 'shift-reports', element: <ShiftReportsFeedPage /> },
              // Static segment before the :reportId param route, or the param swallows it.
              { path: 'shift-reports/new/:type', element: <ShiftReportFormPage /> },
              { path: 'shift-reports/:reportId', element: <ShiftReportDetailPage /> },
              { path: 'projects', element: <ProjectBoardPage /> },
              { path: 'projects/new', element: <ProjectFormPage /> },
              { path: 'projects/:projectId', element: <ProjectDetailPage /> },
              { path: 'projects/:projectId/edit', element: <ProjectFormPage /> },
            ],
          },
          {
            // Engineering owns maintenance work: Work Orders moved here out of
            // Operations, and two sub-modules are placeholders until they ship.
            path: 'engineering',
            children: [
              { index: true, element: <EngineeringHomePage /> },
              // Static segment before the :workOrderId route, or the param swallows it.
              { path: 'work-orders', element: <WorkOrderListPage /> },
              { path: 'work-orders/new', element: <WorkOrderFormPage /> },
              { path: 'work-orders/:workOrderId', element: <WorkOrderDetailPage /> },
              {
                path: 'preventive-maintenance',
                element: (
                  <ModulePlaceholder
                    title="Preventive Maintenance"
                    description="Scheduled equipment servicing and inspection rounds. Not built yet — raise ad-hoc work through Work Orders in the meantime."
                  />
                ),
              },
              // equipment-master-design.md — Equipment Master (Module A). Static
              // segments (new/import) before :equipmentId, or the param route
              // swallows them.
              { path: 'assets', element: <EquipmentListPage /> },
              { path: 'assets/new', element: <EquipmentFormPage /> },
              { path: 'assets/import', element: <EquipmentImportPage /> },
              { path: 'assets/:equipmentId', element: <EquipmentDetailPage /> },
              { path: 'assets/:equipmentId/edit', element: <EquipmentFormPage /> },
            ],
          },
          {
            path: 'security',
            children: [
              { index: true, element: <CheckpointListPage /> },
              // Static segment before the :checkpointId routes, or the param route swallows it.
              { path: 'checkpoints/new', element: <CheckpointFormPage /> },
              { path: 'checkpoints/:checkpointId/edit', element: <CheckpointFormPage /> },
              { path: 'checkpoints/:checkpointId/patrol', element: <PatrolCapturePage /> },
              // fire-extinguisher.md — the doc places these at /operations/apar;
              // they live here because the nav stub, Security's ownership of
              // the inspection (§2.6) and this subtree's open access all point
              // the same way. Static segments before the :extinguisherId route.
              { path: 'fire-extinguishers', element: <ExtinguisherListPage /> },
              { path: 'fire-extinguishers/new', element: <ExtinguisherFormPage /> },
              { path: 'fire-extinguishers/rounds/:taskId', element: <InspectionRoundPage /> },
              { path: 'fire-extinguishers/:extinguisherId', element: <ExtinguisherDetailPage /> },
              { path: 'fire-extinguishers/:extinguisherId/edit', element: <ExtinguisherFormPage /> },
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
              { path: 'employee', element: <CommunicationRecordListPage /> },
              { path: 'employee/new', element: <CommunicationRecordFormPage /> },
              { path: 'employee/:recordId', element: <CommunicationRecordDetailPage /> },
              { path: 'employee/:recordId/edit', element: <CommunicationRecordFormPage /> },
              { path: 'chat/new', element: <ChatChannelFormPage /> },
              { path: 'chat/:channelId', element: <ChatChannelPage /> },
            ],
          },
          { path: 'reports', element: <FlashReportPage /> },
          { path: 'settings', element: <RolePermissionsPage /> },
          { path: 'settings/communications', element: <CommunicationSettingsPage /> },
          { path: 'search', element: <SearchResultsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
