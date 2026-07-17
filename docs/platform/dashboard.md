# NourishOS Dashboard Specification

Version: 1.0  
Product: Nourish Operational System (NourishOS)

---

# 1. Overview

The Dashboard is the primary landing page after authentication.

It provides every user with:

- Personalized information
- Pending work
- Operational insights
- Notifications
- Department KPIs
- Quick actions

The dashboard is **role-aware**, **responsive**, and **real-time**.

---

# 2. Goals

The dashboard should enable users to:

- See what requires immediate attention.
- Monitor department performance.
- Access frequently used features.
- Receive company updates.
- Complete common tasks quickly.

---

# 3. Design Principles

The dashboard should be:

- Clean
- Minimal
- Fast
- Responsive
- Information-first
- Role-driven
- Customizable (future)

---

# 4. Dashboard Layout

```text
--------------------------------------------------------
 Header
--------------------------------------------------------
 Welcome Banner

 KPI Cards

 Quick Actions

 Pending Approvals | Assigned Tasks

 Announcements | Notifications

 Department Widgets

 Activity Feed
--------------------------------------------------------
 Footer
```

---

# 5. Header

Displays:

- Nourish logo
- Search
- Notification icon
- Theme switcher
- Outlet selector (authorized roles)
- User avatar
- User menu

---

# 6. Welcome Banner

Displays:

- Greeting
- User name
- Position
- Department
- Outlet
- Current date

Example:

```text
Good Morning,

Angel

HR Manager

Headquarters
```

---

# 7. KPI Cards

Each card displays:

- Icon
- Title
- Value
- Trend (optional)
- Color indicator

Examples:

HR

- Active Employees
- New Hires
- Trainings Due

Operations

- Daily Reports Submitted
- Open Incidents
- Open Work Orders

Finance

- Pending Expenses
- Budget Usage

Communication

- Unread Announcements
- Open Tasks

---

# 8. Quick Actions

Examples:

HR

- Add Employee
- Create Recruitment
- Assign Training

Operations

- Daily Report
- Opening Checklist
- Closing Checklist
- Report Incident

Finance

- New Expense Request
- Petty Cash Entry

Communication

- Create Announcement
- Create Task

Quick actions are shown according to RBAC permissions.

---

# 9. Pending Approvals Widget

Displays:

- Expense Requests
- SOP Approvals
- Documents
- Contracts
- Work Orders

Each item shows:

- Title
- Requestor
- Date
- Status
- Action button

---

# 10. Assigned Tasks Widget

Displays:

- Task title
- Due date
- Priority
- Progress
- Status

Supports:

- Filter
- Search
- Complete Task

---

# 11. Notifications Widget

Displays:

- New approvals
- Announcements
- Task reminders
- System alerts

Supports:

- Mark as read
- View all

---

# 12. Announcements Widget

Displays:

- Title
- Summary
- Author
- Publish date

Supports:

- Read more
- Pin important announcements (future)

---

# 13. Activity Feed

Displays recent activity:

Examples:

- Employee created
- SOP published
- Expense approved
- Daily report submitted
- Work order completed

Shows:

- User
- Action
- Timestamp

---

# 14. Department Widgets

Widgets are displayed based on the user's department.

## HR

- Employee Count
- Recruitment Pipeline
- Training Progress
- Contract Expiry
- Upcoming Reviews

## Finance

- Pending Expenses
- Budget Summary
- Petty Cash Balance

## Operations

- Daily Reports
- Checklist Completion
- Open Incidents
- Open Work Orders

## Engineering

- Active Work Orders
- Preventive Maintenance
- Equipment Status

## Security

- Incident Reports
- Visitor Logs
- Security Alerts

---

# 15. Dashboard by Role

## Super Admin

Full system overview.

Includes:

- Company KPIs
- User statistics
- System health
- Recent activity

---

## Director

Displays:

- Company performance
- Cross-outlet KPIs
- Pending executive approvals
- Budget overview

---

## General Manager

Displays:

- Outlet performance
- Operational metrics
- HR summary
- Finance summary

---

## HR Manager

Displays:

- Employee metrics
- Recruitment
- Training
- Performance
- Contract reminders

---

## Finance

Displays:

- Expenses
- Budgets
- Pending approvals

---

## Kitchen Leader

Displays:

- Opening Checklist
- Closing Checklist
- Daily Reports

---

## Bar Leader

Displays:

- Daily Reports
- Checklist Status

---

## Floor Leader

Displays:

- Daily Reports
- Incidents
- Tasks

---

## Engineering

Displays:

- Work Orders
- Maintenance Schedule

---

## Security

Displays:

- Incident Reports
- Security Logs

---

# 16. Firestore Collections

Dashboard data is aggregated from:

```text
users

employees

tasks

notifications

announcements

dailyReports

openingChecklists

closingChecklists

incidentReports

workOrders

expenseRequests

budgetPlans / budgetRequests

approvalRequests
```

---

# 17. Cloud Functions

Recommended:

```text
getDashboardSummary()

getPendingApprovals()

getDepartmentMetrics()

getRecentActivity()

getNotificationSummary()
```

Cloud Functions should aggregate data to reduce client-side reads.

---

# 18. Dashboard Refresh

Data sources:

- Real-time Firestore listeners for notifications and tasks.
- On-demand refresh for aggregated KPIs.
- Manual refresh option.

Future:

- Scheduled background refresh.

---

# 19. Search

Global search supports:

- Employees
- SOPs
- Documents
- Tasks
- Work Orders
- Reports
- Announcements

Results are filtered according to user permissions.

---

# 20. Responsive Layout

## Desktop

- Multi-column grid
- Full KPI cards
- Expanded widgets

## Tablet

- Two-column layout
- Collapsible sections

## Mobile

- Single-column layout
- Swipeable KPI cards
- Bottom navigation
- Floating quick action button

---

# 21. Loading States

Each widget should display:

- Skeleton loaders
- Empty states
- Retry options on failure

Avoid blocking the entire dashboard while individual widgets load.

---

# 22. Empty States

Examples:

Tasks

> No assigned tasks.

Approvals

> No pending approvals.

Announcements

> No announcements available.

Each empty state should include an appropriate illustration or icon and, where applicable, a call-to-action.

---

# 23. Permissions

Widgets are rendered based on:

- Authentication
- Role
- Department
- Outlet
- Assigned permissions

Users should never see data outside their authorized scope.

---

# 24. Performance Targets

- Initial dashboard load: ≤ 2 seconds (target)
- Widget refresh: ≤ 500 ms (target)
- Notifications: real-time
- Lazy-load non-critical widgets
- Minimize Firestore reads through aggregation

---

# 25. Accessibility

The dashboard must:

- Support keyboard navigation.
- Include visible focus states.
- Use semantic headings.
- Meet WCAG AA contrast requirements.
- Provide descriptive labels for icons and controls.

---

# 26. Future Enhancements

- Customizable widget layout
- Drag-and-drop dashboard personalization
- Saved dashboard preferences
- AI-generated daily summary
- Weather widget (for outlet operations)
- Company calendar
- Upcoming birthdays and anniversaries
- Goal tracking
- Voice commands
- Executive analytics dashboard

---

# 27. Acceptance Criteria

The Dashboard is complete when:

- Users are redirected to it after successful login.
- Widgets are displayed according to RBAC.
- KPIs reflect current data.
- Notifications update in real time.
- Quick actions navigate to the correct modules.
- Dashboard is fully responsive.
- Loading and empty states are implemented.
- Performance targets are met under normal operating conditions.
- All dashboard interactions are audited where required.
