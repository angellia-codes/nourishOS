# NourishOS Shared Services

Version: 1.0
Module: Shared Platform Services

---

# 1. Overview

Shared Services provide reusable platform capabilities that can be consumed by every module within NourishOS.

Instead of each module implementing its own:

- Tasks
- Notifications
- Approvals
- Comments
- Attachments

they all use one centralized service.

Benefits:

- Less duplicated code
- Easier maintenance
- Consistent user experience
- Lower Firestore reads
- Better scalability

---

# 2. Architecture

```text
                 HR
                  │
                  │
Finance ──────────┼────────── Operations
                  │
                  │
Documents ────────┼────────── Communications
                  │
                  ▼

        Shared Platform Services

    • Authentication
    • Users
    • RBAC
    • Tasks
    • Approval Engine
    • Notifications
    • Activity Feed
    • Comments
    • Attachments
    • Search
    • Audit Logs
    • Dashboard
```

---

# 3. Services

```text
Shared Services
│
├── Authentication
├── User Profile
├── RBAC
├── Approval Engine
├── Task Engine
├── Notification Engine
├── Activity Feed
├── Comments
├── Attachments
├── Search
├── Dashboard Aggregator
├── Audit Logging
├── File Storage
├── Settings
├── Metadata
└── Analytics
```

---

# 4. Authentication Service

Responsible for:

- Firebase Authentication
- Google Sign-In
- Session validation
- Token refresh
- Custom Claims
- Route protection

Future

- MFA
- Microsoft Login
- Apple Login

---

# 5. User Profile Service

Provides

- Profile
- Department
- Position
- Outlet
- Avatar
- Contact Information

Referenced by all modules.

---

# 6. RBAC Service

Provides

- Roles
- Permissions
- Module Access
- Outlet Scope
- Department Scope
- Approval Permissions

Every screen checks RBAC before rendering.

---

# 7. Approval Engine

Universal approval system.

Supports

- Expense Requests
- Budget Requests
- SOP Approval
- Documents
- Contracts
- Work Orders
- Recruitment
- Asset Requests

Workflow

```text
Request

↓

Approver 1

↓

Approver 2

↓

Approver 3

↓

Completed
```

Workflow is configurable.

---

# 8. Task Engine

Centralized task management.

Tasks may originate from any module.

Examples

HR

- Complete onboarding

Finance

- Approve expense

Operations

- Complete opening checklist

Engineering

- Repair equipment

Documents

- Review SOP

Fields

- Title
- Description
- Module
- Reference ID
- Assigned To
- Due Date
- Priority
- Status

---

# 9. Notification Engine

Provides

- Real-time notifications
- Badge counts
- Read status
- Delivery history

Notification Types

- Task
- Approval
- Reminder
- Announcement
- Alert
- System

Future

- Push
- WhatsApp
- Email

---

# 10. Activity Feed

Tracks system events.

Examples

- Employee created
- SOP published
- Expense approved
- Checklist completed
- Work order closed

---

# 11. Comments Service

Reusable commenting system.

Supports

- Tasks
- Employees
- Work Orders
- Reports
- Documents

Features

- Rich text
- Mentions
- Attachments
- Threaded replies (future)

---

# 12. Attachments Service

Central file management.

Supports

- PDF
- DOCX
- XLSX
- PPTX
- PNG
- JPG

Stored in

Firebase Cloud Storage

Metadata

Firestore

---

# 13. Search Service

Global search.

Supports

- Employees
- Documents
- SOPs
- Tasks
- Reports
- Incidents
- Work Orders
- Announcements

Future

AI semantic search.

---

# 14. Dashboard Aggregator

Generates dashboard data.

Instead of every widget querying Firestore separately,

Dashboard

↓

Cloud Function

↓

Aggregated Response

↓

Dashboard

Benefits

- Faster loading
- Fewer reads
- Lower costs

---

# 15. Audit Logging

Automatically records

- Create
- Update
- Delete
- Approval
- Login
- Logout
- Permission changes

Fields

- User
- Module
- Timestamp
- Action
- Target
- Previous Value
- New Value

---

# 16. File Storage

Storage Provider

Firebase Cloud Storage

Folder Structure

```text
employees/

documents/

training/

expenses/

workorders/

incidents/

avatars/

temporary/
```

---

# 17. Metadata Service

Reusable lookup values.

Examples

Departments

Outlets

Categories

Expense Types

Incident Types

Task Priorities

Statuses

Languages

Currencies

Avoids hardcoded dropdowns.

---

# 18. Analytics Service

Provides

- Dashboard KPIs
- Charts
- Trends
- Monthly Reports

Future

- AI Insights
- Predictions

---

# 19. Firestore Collections

Real names per `src/constants/collections.ts` (shipped shared-service collections marked):

```text
users                                            (shipped)

roles

permissions

tasks                                            (shipped)

approvalRequests / approvalSteps / approvalHistory   (shipped)

notifications                                    (shipped)

files                                            (shipped)

auditLogs                                        (shipped)

systemSettings

searchIndex                                      (planned — Search Service not built)
```

---

# 20. Cloud Functions

Shipped (real names):

```text
createTask()  assignTask()  completeTask()  cancelTask()      (+ createTaskInternal)

submitApproval()  approveStep()  rejectStep()  returnForRevision()  cancelApproval()

sendNotificationInternal()  notifyUsersByRole()               (internal senders)

markNotificationRead()  markAllNotificationsRead()

createFileMetadata()  deleteFile()

recordAuditEvent()                                            (internal — not a callable)
```

Planned:

```text
createComment()

recordActivity()

globalSearch()

getDashboardSummary()
```

---

# 21. Event Flow

Example

Expense Request

↓

Expense Module

↓

Approval Engine

↓

Task Engine

↓

Notification Engine

↓

Activity Feed

↓

Dashboard

↓

Audit Log

Every module follows the same pattern.

---

# 22. Permissions

Shared services always inherit permissions from:

- User
- Role
- Department
- Outlet

No service bypasses RBAC.

---

# 23. Performance Targets

Notification delivery

≤ 1 second

Dashboard aggregation

≤ 2 seconds

Task updates

Real time

Search

≤ 1 second

Approval updates

Real time

---

# 24. Future Services

- AI Assistant
- Workflow Builder
- OCR Service
- QR Code Service
- Barcode Service
- Calendar Service
- Scheduling Engine
- Digital Signature
- Translation Service
- Reporting Engine
- Offline Synchronization
- Webhook Service
- Automation Rules

---

# 25. Acceptance Criteria

The Shared Services layer is complete when:

- Authentication is centralized.
- RBAC is enforced consistently.
- All modules use the same approval engine.
- Tasks are created and managed by a shared task engine.
- Notifications are delivered through a unified notification engine.
- Comments and attachments are reusable across modules.
- Dashboard data is aggregated efficiently.
- Search indexes all supported resources.
- Audit logs capture platform-wide events.
- Shared services are reusable, secure, and independently extensible.
