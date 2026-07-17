# NourishOS API Specification

Version: 1.0  
Product: Nourish Operational System (NourishOS)

Architecture: Firebase Serverless

---

# 1. Overview

NourishOS uses a hybrid architecture:

- Firebase Authentication
- Cloud Firestore
- Firebase Cloud Storage
- Firebase Cloud Functions

The frontend communicates with:

- Firestore (read operations)
- Cloud Functions (business logic)
- Cloud Storage (file uploads)

Business rules must never rely solely on frontend validation.

Sensitive operations must always execute through Cloud Functions.

---

# 2. API Principles

Every API must be:

- Secure
- Stateless
- Idempotent where applicable
- Role-aware
- Auditable
- Versionable

---

# 3. Authentication

Authentication Provider

Firebase Authentication

Supported Login

- Google Sign-In

Future

- Microsoft Login
- Email & Password

Authentication Flow

```text
User
↓

Google Authentication

↓

Firebase ID Token

↓

React Application

↓

Cloud Functions / Firestore
```

Every callable function validates:

- Authentication
- User role
- Outlet
- Permissions

---

# 4. Cloud Function Structure

Shipped layout (`functions/src/`):

```text
functions/src/

auth/                  (syncUserClaims trigger)
hr/
├── appraisal/
└── employees/
security/
shared/
├── approval/
├── tasks/
├── notifications/
└── fileStorage/
lib/                   (db, COLLECTIONS, RBAC guards, AppError, audit, response helpers)
index.ts               (every callable is exported here)
```

Future modules (operations/, finance/, documents/, communications/) follow the same per-module pattern. Each module owns its business logic; cross-module capabilities live in `shared/`.

---

# 5. Function Naming Convention

Use camelCase.

Examples

```text
createEmployee

updateEmployee

submitExpenseRequest

approveExpenseRequest

createAnnouncement

publishSOP

assignTask

createWorkOrder

completeChecklist
```

---

# 6. Common Request Pattern

```json
{
  "data": {}
}
```

---

# 7. Common Response Pattern

```json
{
  "success": true,
  "message": "Operation completed.",
  "data": {}
}
```

---

# 8. Error Response

```json
{
  "success": false,
  "code": "PERMISSION_DENIED",
  "message": "You do not have permission."
}
```

---

> **Implementation status (2026-07-17).** Shipped callables (all exported from `functions/src/index.ts`):
> `submitApproval`, `approveStep`, `rejectStep`, `returnForRevision`, `cancelApproval` · `createTask`, `assignTask`, `completeTask`, `cancelTask` · `markNotificationRead`, `markAllNotificationsRead` · `createFileMetadata`, `deleteFile` · `createCheckpoint`, `createPatrolLog`, `checkOverdueCheckpoints` · `seedAppraisalTemplates`, `createAppraisal`, `submitAppraisal`, `generateAppraisalInsights` · `createEmployee`, `updateEmployee`, `archiveEmployee` — plus the `syncUserClaims` Firestore trigger and the `onApprovalRequestResolved` trigger.
> Everything else in §9–§14 is **Planned** and documented here as the target API surface.

# 9. Authentication API (Planned)

The one shipped auth function is `syncUserClaims` — a Firestore **trigger** (not callable) that mirrors `users/{uid}` role/department/outlet changes into Auth custom claims. Profile data is read directly from Firestore by the client (§19).

## getCurrentUser (Planned)

Returns

- User profile
- Role
- Department
- Outlet
- Permissions

---

## updateProfile (Planned)

Updates

- Display name
- Phone
- Photo

---

# 10. HR APIs

## createEmployee — Shipped

Creates employee profile (server-generated employee number, probation auto-calc).

Permission

`employees.create` (HR Manager)

---

## updateEmployee — Shipped

Updates employee information (allow-listed fields only).

Permission

`employees.update` (HR Manager)

---

## archiveEmployee — Shipped

Soft deletes employee (mandatory reason).

Permission

`employees.delete` (HR Manager)

---

## seedAppraisalTemplates / createAppraisal / submitAppraisal / generateAppraisalInsights — Shipped

The HR Appraisal module: template seeding, appraisal creation, submission into the Approval Engine (`hr/appraisal` route), and on-demand AI insights (Anthropic API via the `ANTHROPIC_API_KEY` secret).

Permissions

`appraisals.*` (see `src/constants/permissions.ts`)

---

## createRecruitment (Planned)

Creates recruitment record.

---

## updateRecruitment (Planned)

Updates recruitment status.

---

## onboardEmployee (Planned)

Creates employee account.

Assigns:

- Role
- Department
- Outlet

---

## createTraining (Planned)

Creates training module.

---

## assignTraining (Planned)

Assigns training to employees.

---

## recordPerformance (Planned)

Creates performance review.

---

## issueDisciplinaryAction (Planned)

Creates disciplinary record.

---

# 10b. Security APIs — Shipped

## createCheckpoint

Registers a patrol checkpoint (geo-fenced).

## createPatrolLog

Records a patrol scan/log against a checkpoint.

## checkOverdueCheckpoints

Scheduled function flagging overdue patrols.

Permissions

`security.*` (see `src/constants/permissions.ts`)

---

# 11. Operations APIs (Planned)

## createDailyReport

Creates daily report.

---

## updateDailyReport

Updates report.

---

## submitDailyReport

Locks report.

Triggers notification.

---

## createOpeningChecklist

Creates checklist.

---

## completeOpeningChecklist

Marks checklist completed.

---

## createClosingChecklist

Creates checklist.

---

## completeClosingChecklist

Completes checklist.

---

## createIncidentReport

Creates incident report.

---

## createWorkOrder

Creates engineering request.

---

## assignWorkOrder

Assigns engineer.

---

## closeWorkOrder

Closes work order.

---

# 12. Finance APIs (Planned)

## createExpenseRequest

Creates expense request.

---

## updateExpenseRequest

Edits request.

---

## submitExpenseRequest

Starts approval workflow.

---

## approveExpenseRequest

Approves request.

---

## rejectExpenseRequest

Rejects request.

---

## createPettyCashEntry

Adds transaction.

---

## approveBudget

Budget approval.

---

# 13. Documents APIs (Planned)

## createDocument

Creates metadata.

---

## uploadDocument

Uploads file.

Cloud Storage.

---

## publishDocument

Publishes document.

---

## archiveDocument

Archives document.

---

## createSOP

Creates SOP.

---

## publishSOP

Publishes SOP.

---

# 14. Communication APIs (Planned)

Note: task callables already ship as **shared Task Engine** functions, not communication-module functions — `createTask`, `assignTask`, `completeTask`, `cancelTask` (see platform/task_engine.md). `updateTask` is planned.

## createAnnouncement (Planned)

Creates announcement.

---

## publishAnnouncement (Planned)

Publishes announcement.

---

## sendChatMessage (Planned)

Stores message.

---

# 15. Notification APIs

## sendNotificationInternal / notifyUsersByRole — Shipped (internal)

Not callables — internal functions other Cloud Functions call to write notifications.

---

## markNotificationRead — Shipped

Marks one notification read.

---

## markAllNotificationsRead — Shipped

Marks all of the caller's notifications read.

---

## sendPushNotification

Future.

FCM.

---

# 16. Approval APIs — Shipped

## submitApproval

Starts a workflow. Clients submit a resource identity only — the route (approver chain) is resolved server-side from `functions/src/shared/approval/routes.ts`.

---

## approveStep

Approves the current step (self-approval blocked; superAdmin override audit-logged).

---

## rejectStep

Rejects the workflow at the current step.

---

## returnForRevision

Sets the request to `returnedForRevision`. KNOWN GAP: no module currently reacts to this status downstream (`returnAndCancel.ts`) — the requester must resubmit manually.

---

## cancelApproval

Requester cancels a pending request.

---

## getApprovalHistory (Planned)

Approval timelines are currently read directly from the `approvalHistory` collection (rules-gated); a dedicated callable is planned.

---

# 17. File APIs — Shipped

## createFileMetadata

Registers an uploaded file's metadata in the `files` collection (upload itself goes to Cloud Storage).

## deleteFile

Soft-deletes a file (owner, or superAdmin/director/generalManager override).

Storage location

Firebase Cloud Storage

Supported

- PDF
- Images
- DOCX
- XLSX

Maximum size

Configured by storage rules.

Metadata stored in Firestore.

---

# 18. Audit APIs

Cloud Functions automatically create audit logs for:

- Create
- Update
- Delete
- Approve
- Reject
- Login
- Role changes

Audit endpoints are internal and not callable from the client.

---

# 19. Firestore Read Services

Frontend reads directly from Firestore using secure queries.

Examples

Employees

```typescript
employees
.where("status","==","Active")
```

Tasks

```typescript
tasks
.where("assignedTo","==",userId)
.where("status","==","Open")
```

Announcements

```typescript
announcements
.orderBy("publishedAt","desc")
.limit(10)
```

All queries must comply with Firestore Security Rules.

---

# 20. Validation

All Cloud Functions validate:

- Required fields
- Data types
- User permissions
- Outlet access
- Department access
- Business rules

Never trust frontend validation alone.

---

# 21. Security

Every Cloud Function checks:

Authentication

↓

Role

↓

Permission

↓

Outlet

↓

Department

↓

Business Rule

↓

Database Operation

---

# 22. Rate Limiting

Protect expensive functions:

Examples

- Login
- File uploads
- Notifications
- Announcement publishing

Rate limiting should be enforced where applicable through backend controls and Firebase platform capabilities.

---

# 23. Logging

Each function logs:

- User
- Timestamp
- Duration
- Errors
- Document ID
- Action

Logs are written to Cloud Logging.

---

# 24. Versioning

Use versioned function namespaces for breaking changes.

Example

```text
v1/createEmployee

v1/createAnnouncement

v2/createEmployee
```

This enables gradual migrations while maintaining backward compatibility.

---

# 25. API Response Times

Target

Read

<300ms

Writes

<500ms

Approval

<1 second

Dashboard

<2 seconds

---

# 26. Error Codes

```text
INVALID_ARGUMENT

UNAUTHENTICATED

PERMISSION_DENIED

NOT_FOUND

ALREADY_EXISTS

FAILED_PRECONDITION

RESOURCE_EXHAUSTED

INTERNAL

UNAVAILABLE
```

---

# 27. Future APIs

Future Cloud Functions

- generatePayroll
- syncESB
- sendWhatsApp
- generateAnalytics
- aiAssistant
- createDigitalSignature
- scheduleShift
- approveLeave
- importEmployees
- exportReports

These functions should follow the same naming conventions, request/response patterns, validation, and security model.

---

# 28. API Design Principles

- One responsibility per function.
- Keep Cloud Functions focused and reusable.
- Prefer composition over monolithic functions.
- Validate all inputs server-side.
- Record auditable actions.
- Enforce RBAC consistently.
- Minimize client-side business logic.
- Return clear, consistent responses.
- Design APIs to support future modules without breaking existing integrations.