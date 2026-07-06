# NourishOS Firestore Schema

Version: 1.0  
Database: Cloud Firestore  
Architecture: Firebase Serverless

---

# 1. Overview

This document defines the Firestore database schema for NourishOS.

Goals:

- Scalable
- Secure
- Real-time
- Multi-outlet
- Offline-friendly
- Optimized for Firestore queries

Firestore is **NoSQL**, therefore collections are designed around application query patterns rather than relational joins.

---

# 2. Firestore Structure

```text
Firestore
│
├── users
├── roles
├── permissions
├── departments
├── outlets
│
├── employees
├── recruitments
├── candidates
├── contracts
├── performances
├── disciplinaryActions
├── trainings
├── employeeAssets
├── employeeActivities
│
├── sops
├── documents
├── templates
├── trainingModules
│
├── openingChecklists
├── closingChecklists
├── dailyReports
├── incidentReports
├── workOrders
│
├── expenseRequests
├── pettyCash
├── budgets
│
├── announcements
├── tasks
├── chats
├── notifications
│
├── approvalFlows
├── auditLogs
│
└── settings
```

---

# 3. Shared Fields

Every operational document should include:

```typescript
{
  createdAt: Timestamp,
  createdBy: string,
  updatedAt: Timestamp,
  updatedBy: string,

  outletId: string,
  departmentId: string,

  status: string,

  isArchived: boolean
}
```

---

# 4. users

Document ID

```text
uid
```

Example

```typescript
{
  email: "",
  displayName: "",
  photoURL: "",

  employeeId: "",

  roleId: "",

  departmentId: "",

  outletId: "",

  status: "active",

  lastLogin: Timestamp,

  createdAt: Timestamp
}
```

---

# 5. roles

```typescript
{
  name: "HR Manager",

  description: "",

  permissions: [
      "employees.read",
      "employees.update"
  ]
}
```

---

# 6. permissions

```typescript
{
  module: "employees",

  action: "read",

  description: ""
}
```

---

# 7. departments

```typescript
{
  code: "HR",

  name: "Human Resources",

  description: ""
}
```

---

# 8. outlets

```typescript
{
  code: "HQ",

  name: "Headquarters",

  type: "Head Office",

  address: "",

  status: "active"
}
```

---

# 9. employees

```typescript
{
  employeeNumber: "",

  fullName: "",

  firstName: "",

  lastName: "",

  email: "",

  phone: "",

  position: "",

  departmentId: "",

  outletId: "",

  managerId: "",

  employmentType: "",

  joinDate: Timestamp,

  status: "active"
}
```

---

# 10. recruitments

```typescript
{
  title: "",

  departmentId: "",

  recruiterId: "",

  vacancies: 1,

  status: "open"
}
```

---

# 11. candidates

```typescript
{
  recruitmentId: "",

  fullName: "",

  email: "",

  phone: "",

  stage: "Interview",

  status: "Active"
}
```

---

# 12. contracts

```typescript
{
  employeeId: "",

  contractType: "",

  startDate: Timestamp,

  endDate: Timestamp,

  documentUrl: ""
}
```

---

# 13. performances

```typescript
{
  employeeId: "",

  reviewerId: "",

  score: 95,

  comments: ""
}
```

---

# 14. disciplinaryActions

```typescript
{
  employeeId: "",

  type: "Warning",

  description: "",

  issuedBy: ""
}
```

---

# 15. trainings

```typescript
{
  employeeId: "",

  trainingModuleId: "",

  completed: false,

  completedAt: null
}
```

---

# 16. employeeAssets

```typescript
{
  employeeId: "",

  assetName: "",

  serialNumber: "",

  assignedDate: Timestamp
}
```

---

# 17. employeeActivities

```typescript
{
  employeeId: "",

  activity: "",

  performedBy: "",

  performedAt: Timestamp
}
```

---

# 18. sops

```typescript
{
  code: "HR SOP 001",

  title: "",

  departmentId: "",

  version: "1.0",

  fileUrl: "",

  status: "Published"
}
```

---

# 19. documents

```typescript
{
  title: "",

  category: "",

  fileUrl: "",

  version: "",

  published: true
}
```

---

# 20. templates

```typescript
{
  title: "",

  category: "",

  fileUrl: ""
}
```

---

# 21. trainingModules

```typescript
{
  title: "",

  duration: 60,

  fileUrl: ""
}
```

---

# 22. openingChecklists

```typescript
{
  outletId: "",

  departmentId: "",

  date: Timestamp,

  completedBy: "",

  status: "Completed"
}
```

---

# 23. closingChecklists

Structure identical to openingChecklists.

---

# 24. dailyReports

```typescript
{
  date: Timestamp,

  summary: "",

  submittedBy: "",

  attachments: [],

  status: "Submitted"
}
```

---

# 25. incidentReports

```typescript
{
  title: "",

  description: "",

  severity: "Medium",

  reportedBy: "",

  status: "Open"
}
```

---

# 26. workOrders

```typescript
{
  title: "",

  description: "",

  priority: "High",

  assignedTo: "",

  dueDate: Timestamp,

  status: "Open"
}
```

---

# 27. expenseRequests

```typescript
{
  amount: 0,

  currency: "IDR",

  purpose: "",

  requestedBy: "",

  approvalId: "",

  status: "Pending"
}
```

---

# 28. pettyCash

```typescript
{
  amount: 0,

  category: "",

  description: "",

  createdBy: ""
}
```

---

# 29. budgets

```typescript
{
  year: 2026,

  departmentId: "",

  allocated: 0,

  used: 0
}
```

---

# 30. announcements

```typescript
{
  title: "",

  content: "",

  audience: "All",

  publishedAt: Timestamp
}
```

---

# 31. tasks

```typescript
{
  title: "",

  assignedTo: "",

  assignedBy: "",

  priority: "Normal",

  dueDate: Timestamp,

  status: "Open"
}
```

---

# 32. chats

```typescript
{
  senderId: "",

  receiverId: "",

  message: "",

  createdAt: Timestamp
}
```

---

# 33. notifications

```typescript
{
  userId: "",

  title: "",

  message: "",

  type: "",

  isRead: false
}
```

---

# 34. approvalFlows

```typescript
{
  documentType: "",

  documentId: "",

  currentStep: 2,

  status: "Pending",

  steps: []
}
```

---

# 35. auditLogs

```typescript
{
  collection: "",

  documentId: "",

  action: "UPDATE",

  userId: "",

  timestamp: Timestamp
}
```

This collection should be **append-only** and written exclusively by Cloud Functions.

---

# 36. settings

```typescript
{
  companyName: "Nourish",

  timezone: "Asia/Makassar",

  currency: "IDR",

  language: "en"
}
```

---

# 37. Recommended Subcollections

Use subcollections only when child records are tightly coupled to a parent document.

Examples:

```text
employees/{employeeId}/notes

employees/{employeeId}/files

tasks/{taskId}/comments

workOrders/{workOrderId}/comments

approvalFlows/{approvalId}/history
```

Avoid deeply nested subcollections beyond one level.

---

# 38. Recommended Composite Indexes

Create indexes for frequent queries such as:

| Collection | Fields |
|------------|--------|
| employees | outletId + departmentId + status |
| dailyReports | outletId + date |
| workOrders | assignedTo + status |
| tasks | assignedTo + dueDate |
| expenseRequests | status + createdAt |
| notifications | userId + isRead + createdAt |
| announcements | publishedAt + audience |

Monitor Firestore console suggestions to add indexes for new query patterns.

---

# 39. Document Relationships

```text
users
│
└── employeeId
        │
        ▼
employees
        │
        ├── departmentId
        │
        ├── outletId
        │
        └── managerId

tasks
│
├── assignedBy
└── assignedTo

expenseRequests
│
└── approvalId
        │
        ▼
approvalFlows
```

Relationships are maintained through document IDs rather than joins.

---

# 40. Data Retention

- Operational records use soft deletion (`isArchived`).
- Critical records (approvals, audits) remain permanently unless retention policies require archival.
- Archived data should remain queryable by authorized roles.

---

# 41. Security Considerations

- Use Firebase Authentication for identity.
- Restrict reads and writes through Firestore Security Rules.
- Perform privileged operations (approvals, role changes, audit logging) through Cloud Functions.
- Store files in Cloud Storage and keep only metadata in Firestore.

---

# 42. Schema Evolution

When introducing new collections:

1. Follow the shared field conventions.
2. Use camelCase field names.
3. Add required composite indexes.
4. Update Firestore Security Rules.
5. Extend RBAC permissions.
6. Document the new schema in this file.

Schema changes should be version-controlled and reviewed before deployment.