# NourishOS Role-Based Access Control (RBAC)

Version: 1.0  
Product: Nourish Operational System (NourishOS)

---

# 1. Overview

NourishOS uses **Role-Based Access Control (RBAC)** to ensure users can only access the information and actions required for their responsibilities.

Authorization is enforced through:

- Firebase Authentication
- Firestore Security Rules
- Cloud Functions
- Client-side UI permissions (for usability only)

> **Important:** Client-side checks improve the user experience but are **not** a security boundary. All sensitive operations must be enforced by Firestore Security Rules and Cloud Functions.

---

# 2. Permission Model

Every permission follows this format:

```text
module.action
```

Example:

```text
employees.read
employees.create
employees.update
employees.delete

documents.publish

tasks.assign

expense.approve
```

---

# 3. Standard Actions

Every module may use one or more of the following actions.

| Action | Description |
|----------|-------------|
| read | View records |
| create | Create records |
| update | Edit records |
| delete | Archive/Delete records |
| approve | Approve workflow |
| reject | Reject workflow |
| submit | Submit for approval |
| publish | Publish content |
| assign | Assign tasks/work |
| export | Export data |
| manage | Full administration |

---

# 4. System Roles

## Super Admin

Full system administrator.

Responsibilities:

- Configure system
- Manage roles
- Manage permissions
- Manage outlets
- Manage departments
- Manage settings
- Access all modules

---

## Director

Executive oversight.

Responsibilities:

- Final approvals
- Strategic reporting
- Company-wide dashboard
- Budget approval
- Cross-outlet visibility

---

## General Manager

Operational management.

Responsibilities:

- Operational approvals
- Monitor all departments
- Company-wide reporting
- Staff performance oversight

---

## HR Manager

Responsibilities:

- Employee lifecycle
- Recruitment
- Contracts
- Training
- Performance
- Disciplinary actions
- Employee assets

---

## Finance

Responsibilities:

- Expense requests
- Budget approvals
- Petty cash
- Financial reports

---

## Purchasing

Responsibilities:

- Purchase requests
- Vendor documents
- Procurement workflow

---

## Kitchen Leader

Responsibilities:

- Kitchen operations
- SOP compliance
- Daily reports
- Opening & closing checklists

---

## Bar Leader

Responsibilities:

- Bar operations
- Daily reports
- Checklists
- Work orders

---

## Floor Leader

Responsibilities:

- Service operations
- Daily reports
- Incident reporting
- Staff task management

---

## Security

Responsibilities:

- Incident reports
- Security logs
- Visitor records
- Emergency reports

---

## Engineering

Responsibilities:

- Work orders
- Maintenance
- Preventive maintenance
- Equipment inspections

---

# 5. Permission Matrix

Legend:

- ✅ Full Access
- 👁 Read Only
- ❌ No Access

| Module | SA | Director | GM | HR | Finance | Purchasing | Kitchen | Bar | Floor | Security | Engineering |
|---------|:--:|:--------:|:--:|:--:|:-------:|:-----------:|:-------:|:---:|:------:|:---------:|:-----------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| HR | ✅ | 👁 | 👁 | ✅ | 👁 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Recruitment | ✅ | 👁 | 👁 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Employees | ✅ | 👁 | 👁 | ✅ | 👁 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Training | ✅ | 👁 | 👁 | ✅ | ❌ | ❌ | 👁 | 👁 | 👁 | 👁 | 👁 |
| SOP Library | ✅ | 👁 | 👁 | 👁 | 👁 | 👁 | 👁 | 👁 | 👁 | 👁 | 👁 |
| Documents | ✅ | 👁 | 👁 | ✅ | 👁 | 👁 | 👁 | 👁 | 👁 | 👁 | 👁 |
| Daily Reports | ✅ | 👁 | ✅ | 👁 | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Opening Checklist | ✅ | 👁 | 👁 | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Closing Checklist | ✅ | 👁 | 👁 | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Incident Reports | ✅ | 👁 | 👁 | 👁 | ❌ | ❌ | 👁 | 👁 | ✅ | ✅ | 👁 |
| Work Orders | ✅ | 👁 | 👁 | ❌ | ❌ | ❌ | 👁 | 👁 | 👁 | 👁 | ✅ |
| Expense Requests | ✅ | 👁 | 👁 | 👁 | ✅ | ❌ | 👁 | 👁 | 👁 | 👁 | 👁 |
| Petty Cash | ✅ | 👁 | 👁 | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Announcements | ✅ | ✅ | ✅ | ✅ | 👁 | 👁 | 👁 | 👁 | 👁 | 👁 | 👁 |
| Tasks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

# 6. Approval Authority

| Workflow | User | Manager | HR | GM | Director |
|----------|:----:|:-------:|:--:|:--:|:--------:|
| Expense Request | Submit | Review | Verify | Approve | Final (optional threshold) |
| Recruitment | Submit | Review | Approve | Approve | — |
| Employee Contract | Draft | Review | Approve | Approve | Final |
| SOP Publication | Draft | Review | Verify | Approve | — |
| Work Order | Submit | Assign | — | Escalate | — |
| Incident Report | Submit | Review | Review | Escalate | — |

Cloud Functions determine the next approver based on the workflow definition.

---

# 7. Outlet Access

Each user belongs to:

```text
Headquarters
or
One Outlet
```

Standard users can:

- View only their assigned outlet.
- Create records only for their outlet.
- Edit records within their permissions.

Cross-outlet access is granted only to authorized roles (for example, Super Admin, Director, and General Manager).

---

# 8. Department Access

Users are also assigned to a department.

Example:

```text
HR

Finance

Kitchen

Bar

Security

Engineering
```

Department-level access determines visibility of department-specific records in addition to role permissions.

---

# 9. Firestore User Document

```json
{
  "uid": "firebaseUserId",
  "displayName": "John Doe",
  "email": "john@nourish.id",
  "role": "hrManager",
  "departmentId": "hr",
  "outletId": "hq",
  "status": "active"
}
```

---

# 10. Permission Resolution

Authorization follows this order:

```text
Authenticated?

↓

Active User?

↓

Assigned Role?

↓

Permission Granted?

↓

Outlet Match?

↓

Department Match?

↓

Business Rule?

↓

Allow Operation
```

All conditions must pass before the requested action is permitted.

---

# 11. Client-Side Authorization

The React application should use permissions only to control the interface.

Examples:

- Hide buttons
- Hide menus
- Disable actions
- Filter navigation

The frontend must never assume access without backend enforcement.

---

# 12. Firestore Security Rules

Rules should verify:

- Authentication
- Active account
- Role
- Outlet
- Department
- Ownership (when applicable)

Sensitive updates (for example, approvals, role changes, audit logs) should only be performed through Cloud Functions.

---

# 13. Audit Requirements

The following events must be recorded:

- Login
- Logout
- Create
- Update
- Archive/Delete
- Approve
- Reject
- Publish
- Role change
- Permission change

Audit records should be immutable and generated server-side.

---

# 14. Future Roles

Potential future roles include:

- Store Manager
- Assistant Manager
- Cashier Leader
- Cashier
- Warehouse
- Marketing
- Sales
- Bakery Leader
- Wholefood Leader
- Inventory Controller
- IT Administrator
- External Auditor

New roles should reuse the same permission model and naming conventions.

---

# 15. RBAC Principles

- Least privilege by default.
- Permissions are granted to roles, not individual users.
- Roles should remain focused and business-oriented.
- Approval authority is determined by workflow, not UI.
- Firestore Security Rules and Cloud Functions are the authoritative enforcement layer.
- New modules must introduce explicit permissions before release.
- Changes to roles and permissions should be audited and version controlled.

---

# 16. Permission Naming Reference

Examples:

```text
dashboard.read

employees.read
employees.create
employees.update
employees.delete
employees.export

recruitment.read
recruitment.create
recruitment.update
recruitment.approve

training.read
training.assign

documents.read
documents.publish

sops.read
sops.publish

reports.read
reports.create

workOrders.assign
workOrders.update
workOrders.complete

expenseRequests.submit
expenseRequests.approve
expenseRequests.reject

announcements.publish

tasks.assign
tasks.complete

settings.manage

users.manage

roles.manage
```

This naming convention should be used consistently across Firestore documents, Cloud Functions, and React authorization checks.