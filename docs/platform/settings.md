# NourishOS Settings & Administration Module

Version: 1.0
Module: Settings & Administration

---

# 1. Overview

The Settings module provides centralized configuration and administration for NourishOS.

It allows authorized users to manage company information, organizational structure, users, roles, permissions, system preferences, and integrations from a single location.

This module is primarily intended for Super Admins, Directors, HR, and General Managers, with access controlled through Role-Based Access Control (RBAC).

---

# 2. Objectives

- Centralize system administration
- Configure company structure
- Manage users and permissions
- Maintain master data
- Configure approval workflows
- Manage integrations
- Support multi-outlet operations
- Ensure platform security

---

# 3. Module Structure

```text
Settings
│
├── Company Profile
├── Outlets
├── Departments
├── Positions
├── Users
├── Roles
├── Permissions
├── Approval Workflows
├── Notification Settings
├── System Preferences
├── Integrations
├── Audit Logs
├── Backup & Restore
└── About System
```

---

# 4. Company Profile

## Purpose

Maintain company information.

### Features

- Company Name
- Legal Name
- Logo
- Brand Colors
- Address
- Phone
- Email
- Website
- Tax Information
- Business Registration

### Future

- Multiple Companies
- Multi-brand support

---

# 5. Outlets

## Purpose

Manage all company branches.

### Features

- Create outlet
- Edit outlet
- Archive outlet
- Assign manager
- Operating hours
- Address
- Contact information
- Status

### Example

```text
Headquarters

↓

Ungasan

↓

Uluwatu

↓

Berawa

↓

Future Outlets
```

---

# 6. Departments

Manage company departments.

Examples

- HR
- Finance
- Purchasing
- Kitchen
- Bar
- Floor
- Security
- Engineering
- Bakery
- Wholefood

### Features

- Create
- Edit
- Archive
- Assign manager

---

# 7. Positions

Manage organizational positions.

Examples

- Director
- General Manager
- HR Manager
- Finance Officer
- Kitchen Leader
- Bar Leader
- Floor Leader
- Engineer
- Security Officer

Each position may have a default role.

---

# 8. Users

Manage user accounts.

### Features

- Create user
- Activate
- Suspend
- Deactivate
- Assign employee
- Assign outlet
- Assign department
- Assign role
- Reset account (future)

### Status

- Pending
- Active
- Inactive
- Suspended
- Terminated

---

# 9. Roles

Manage RBAC roles.

Examples

- Super Admin
- Director
- General Manager
- HR Manager
- Finance
- Purchasing
- Kitchen Leader
- Bar Leader
- Floor Leader
- Security
- Engineering

### Features

- Create role
- Edit role
- Clone role
- Archive role

---

# 10. Permissions

Manage system permissions.

Permission groups

```text
Employees

Recruitment

Training

Performance

Finance

Operations

Documents

Communications

Reports

Settings
```

Permission types

- View
- Create
- Update
- Delete
- Approve
- Export
- Manage

---

# 11. Approval Workflows

Configure approval routes.

Supported Modules

- Expense Requests
- Budget Requests
- Documents
- SOPs
- Work Orders
- HR Requests

Workflow Builder

```text
Requester

↓

Manager

↓

Finance

↓

GM

↓

Director
```

Future

Visual drag-and-drop workflow builder.

---

# 12. Notification Settings

Configure

- In-App Notifications
- Email Notifications (Future)
- Push Notifications (Future)
- WhatsApp Notifications (Future)

Per-user preferences

- Tasks
- Approvals
- Announcements
- Reports
- System alerts

---

# 13. System Preferences

Global settings

- Theme
- Time Zone
- Language
- Date Format
- Currency
- Number Format
- Default Outlet
- Default Dashboard

Supported themes

- Light
- Dark
- System

---

# 14. Integrations

Current

- Firebase Authentication
- Cloud Firestore
- Cloud Storage

Future

- ESB
- Payroll
- POS
- WhatsApp Business API
- Google Calendar
- Digital Signature
- BI Platform

---

# 15. Audit Logs

Centralized audit history.

Record

- User login
- User logout
- User creation
- Role changes
- Permission changes
- Approval actions
- Settings changes
- System updates

Search

- User
- Module
- Date
- Action

---

# 16. Backup & Restore

Future capability.

Support

- Firestore backup
- Cloud Storage backup
- Restore configuration
- Scheduled backup

---

# 17. About System

Display

- Application Version
- Build Number
- Release Date
- Environment
- Firebase Project
- License
- Support Contact

---

# 18. Firestore Collections

```text
companies

outlets

departments

positions

roles

permissions

users

approvalWorkflows

systemSettings

notificationSettings

integrations

auditLogs
```

---

# 19. Cloud Functions

```text
createOutlet()

updateOutlet()

createDepartment()

createRole()

assignRole()

updatePermissions()

createApprovalWorkflow()

updateSystemSettings()

recordAuditLog()

syncUserClaims()

archiveOutlet()
```

---

# 20. Notifications

Examples

- New user created
- Role updated
- Permission changed
- Workflow updated
- System maintenance
- Integration connected
- Backup completed

---

# 21. Permissions

| Feature            | Super Admin | Director |   GM    |    HR    | Finance  |
| ------------------ | :---------: | :------: | :-----: | :------: | :------: |
| Company Profile    |     ✅      |   View   |  View   |    ❌    |    ❌    |
| Outlets            |     ✅      |   View   | Manage  |    ❌    |    ❌    |
| Departments        |     ✅      |   View   | Manage  | Limited  |    ❌    |
| Positions          |     ✅      |   View   | Manage  |  Manage  |    ❌    |
| Users              |     ✅      |   View   | Limited |  Manage  |    ❌    |
| Roles              |     ✅      |   View   |   ❌    |    ❌    |    ❌    |
| Permissions        |     ✅      |    ❌    |   ❌    |    ❌    |    ❌    |
| Approval Workflows |     ✅      |   View   | Manage  | Limited  | Limited  |
| System Preferences |     ✅      |   View   | Limited | Personal | Personal |
| Integrations       |     ✅      |   View   |   ❌    |    ❌    |    ❌    |
| Audit Logs         |     ✅      |   View   | Limited | Limited  | Limited  |

---

# 22. Validation Rules

Company

- Company name is required.
- Logo must be an approved file type.

Users

- Email must be unique.
- User must be linked to an employee.
- Role is required.
- Outlet is required.

Roles

- Role name must be unique.
- At least one permission must be assigned.

Approval Workflows

- At least one approval step required.
- Workflow cannot contain duplicate consecutive approvers.

---

# 23. Dashboard Widgets

Examples

- Active Users
- Pending Invitations
- Outlet Count
- Department Count
- Role Distribution
- Recent System Changes
- Audit Activity

---

# 24. Performance Targets

- Settings pages load ≤ 2 seconds
- User search ≤ 1 second
- Role updates reflected immediately
- Audit search supports pagination
- Configuration changes logged in real time

---

# 25. Future Enhancements

## Security

- Multi-Factor Authentication (MFA)
- Device Management
- Session Management
- IP Restrictions
- Passwordless Authentication

## Administration

- Organization Chart
- Delegated Administration
- Feature Flags
- Maintenance Mode
- Tenant Management

## Platform

- API Keys
- Webhooks
- Automation Rules
- Scheduled Jobs
- Custom Branding
- White-label Support

---

# 26. Acceptance Criteria

The Settings module is complete when:

- Company structure can be configured.
- Outlets, departments, and positions are manageable.
- Users, roles, and permissions are administered through RBAC.
- Approval workflows are configurable.
- System preferences support organization-wide and personal settings.
- Integrations can be configured where applicable.
- Audit logs capture all administrative actions.
- All settings changes are validated and secured through Cloud Functions.
- The module is fully responsive across desktop, tablet, and mobile devices.
