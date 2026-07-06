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

```text
functions/

auth/
hr/
operations/
finance/
documents/
communication/
notifications/
settings/
shared/
```

Each module owns its business logic.

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

# 9. Authentication API

## getCurrentUser

Returns

- User profile
- Role
- Department
- Outlet
- Permissions

---

## updateProfile

Updates

- Display name
- Phone
- Photo

---

# 10. HR APIs

## createEmployee

Creates employee profile.

Permission

HR Manager

---

## updateEmployee

Updates employee information.

Permission

HR Manager

---

## archiveEmployee

Soft deletes employee.

Permission

HR Manager

---

## createRecruitment

Creates recruitment record.

---

## updateRecruitment

Updates recruitment status.

---

## onboardEmployee

Creates employee account.

Assigns:

- Role
- Department
- Outlet

---

## createTraining

Creates training module.

---

## assignTraining

Assigns training to employees.

---

## recordPerformance

Creates performance review.

---

## issueDisciplinaryAction

Creates disciplinary record.

---

# 11. Operations APIs

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

# 12. Finance APIs

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

# 13. Documents APIs

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

# 14. Communication APIs

## createAnnouncement

Creates announcement.

---

## publishAnnouncement

Publishes announcement.

---

## assignTask

Creates task.

---

## updateTask

Updates task.

---

## completeTask

Completes task.

---

## sendChatMessage

Stores message.

---

# 15. Notification APIs

## createNotification

Internal use.

---

## markNotificationRead

Updates notification.

---

## sendPushNotification

Future.

FCM.

---

# 16. Approval APIs

## submitApproval

Starts workflow.

---

## approveDocument

Approves current step.

---

## rejectDocument

Rejects workflow.

---

## returnForRevision

Returns to previous user.

---

## getApprovalHistory

Returns approval timeline.

---

# 17. File APIs

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