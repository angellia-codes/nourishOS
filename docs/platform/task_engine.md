# NourishOS Task Engine

Version: 1.0
Module: Shared Services - Task Engine

---

# 1. Overview

The Task Engine is a shared platform service that manages all actionable work within NourishOS.

Rather than each module implementing its own task management, every module creates tasks through this centralized engine.

Examples:

- HR onboarding tasks
- Finance approval tasks
- Kitchen opening checklist items
- Engineering work orders
- SOP review assignments
- Training assignments
- Asset return reminders

Every task follows the same lifecycle, permission model, notification system, and reporting framework.

---

# 2. Objectives

- Centralize task management
- Standardize task lifecycle
- Improve accountability
- Support cross-department collaboration
- Enable real-time tracking
- Reduce duplicated functionality
- Support future workflow automation

---

# 3. Supported Modules

```text
HR

Operations

Finance

Documents

Communications

Engineering

Security

Purchasing (Future)

Inventory (Future)

CRM (Future)
```

---

# 4. Task Types

Examples

```text
Approval

Checklist

Reminder

Follow-up

Training

Inspection

Maintenance

Document Review

Recruitment

Performance Review

Asset Assignment

Custom
```

---

# 5. Task Structure

Each task contains:

- Task ID
- Title
- Description
- Task Type
- Source Module
- Reference ID
- Assigned To
- Assigned By
- Department
- Outlet
- Priority
- Status
- Due Date
- Created Date
- Completed Date
- Estimated Duration
- Attachments
- Comments
- Tags

---

# 6. Task Lifecycle

```text
Draft

↓

Assigned

↓

Accepted (Optional)

↓

In Progress

↓

Waiting

↓

Completed

↓

Verified (Optional)

↓

Closed
```

Alternative outcomes

```text
Cancelled

Overdue

Archived
```

---

# 7. Task Priorities

```text
Critical

High

Medium

Low
```

Priority influences:

- Notification urgency
- Dashboard order
- Escalation timing
- SLA calculations

---

# 8. Task Status

```text
Draft

Assigned

In Progress

Waiting

Completed

Verified

Closed

Cancelled

Overdue
```

---

# 9. Assignment

Tasks can be assigned to:

- Individual employee
- Position
- Department
- Outlet
- Multiple users (optional)
- Role (future)

Reassignment is permitted only for authorized users.

---

# 10. Due Dates & SLAs

Tasks support:

- Due date
- Due time
- Estimated duration
- Completion SLA

Examples

```text
Opening Checklist

Due: 08:00

Work Order

SLA: 4 Hours

Performance Review

Due: 7 Days
```

---

# 11. Recurring Tasks

Supported schedules

- Daily
- Weekly
- Monthly
- Quarterly
- Yearly
- Custom interval

Examples

- Daily opening checklist
- Weekly stock inspection
- Monthly preventive maintenance
- Quarterly policy review

Recurring instances are generated automatically.

---

# 12. Dependencies

Tasks may depend on other tasks.

Example

```text
Install Equipment

↓

Electrical Inspection

↓

Equipment Testing

↓

Operational Approval
```

Dependent tasks cannot start until prerequisite tasks are completed (where configured).

---

# 13. Checklist Support

Tasks may include checklist items.

Example

Kitchen Opening

- Turn on equipment
- Check refrigerator temperature
- Prepare ingredients
- Verify cleanliness

Progress is calculated based on checklist completion.

---

# 14. Comments

Supports:

- Text comments
- Mentions
- Attachments
- Activity history

Future

- Threaded discussions
- Emoji reactions

---

# 15. Attachments

Supported formats

- PDF
- DOCX
- XLSX
- PPTX
- JPG
- PNG

Stored in Firebase Cloud Storage.

---

# 16. Notifications

Automatically notify:

- Assignee
- Assigner
- Manager (optional)

Events

- Task assigned
- Task accepted
- Task updated
- Due reminder
- Overdue
- Completed
- Verified

---

# 17. Dashboard Integration

Widgets

- My Tasks
- Overdue Tasks
- Tasks Due Today
- Department Tasks
- Completed This Week
- High Priority Tasks
- Task Completion Rate

---

# 18. Search & Filters

Search by

- Task title
- Assignee
- Department
- Outlet
- Module
- Tags

Filters

- Status
- Priority
- Due date
- Task type
- Assigned by
- Source module

---

# 19. Firestore Collections

```text
tasks

taskAssignments

taskComments

taskChecklists

taskTemplates

taskRecurrence

taskHistory
```

---

# 20. Cloud Functions

```text
createTask()

assignTask()

updateTask()

completeTask()

verifyTask()

closeTask()

cancelTask()

generateRecurringTasks()

sendTaskReminder()

markTaskOverdue()
```

---

# 21. Task Templates

Reusable templates standardize recurring work.

Examples

- Employee Onboarding
- Outlet Opening Checklist
- Outlet Closing Checklist
- Preventive Maintenance
- New SOP Review
- Monthly Inventory Audit

Templates define:

- Title
- Description
- Checklist
- Priority
- Default assignee
- Due rules

---

# 22. Automation

Examples

Employee hired

↓

Generate onboarding tasks

---

Expense approved

↓

Generate payment task

---

Work order created

↓

Assign engineering task

---

SOP published

↓

Assign review task

Automation is handled by Cloud Functions.

---

# 23. RBAC Integration

Task visibility is controlled by:

- Authentication
- Role
- Department
- Outlet
- Assignment
- Source module permissions

Users only see tasks they are authorized to access.

---

# 24. Audit Logging

Record:

- Task created
- Task assigned
- Status changed
- Due date changed
- Completed
- Verified
- Reassigned
- Cancelled

Each entry includes:

- User
- Timestamp
- Action
- Previous value
- New value

---

# 25. Performance Targets

- Task creation ≤ 500 ms
- Task updates in real time
- Reminder generation asynchronous
- Dashboard aggregation ≤ 2 seconds
- Search response ≤ 1 second

---

# 26. Security

- Validate authentication before every action.
- Enforce RBAC for viewing and updating tasks.
- Prevent unauthorized reassignment.
- Restrict status transitions based on workflow rules.
- Store attachments securely in Firebase Cloud Storage.
- Log all task lifecycle events.

---

# 27. Future Enhancements

## Collaboration

- Shared task boards
- Kanban view
- Calendar view
- Timeline/Gantt view
- Team workload visualization

## Automation

- AI task prioritization
- Smart due-date suggestions
- Auto-assignment rules
- Escalation workflows
- Workflow automation builder

## Integrations

- Google Calendar
- Outlook Calendar
- WhatsApp reminders
- Email reminders
- QR code task completion
- Barcode scanning

---

# 28. Acceptance Criteria

The Task Engine is complete when:

- All modules create and manage tasks through the shared engine.
- Tasks support assignment, prioritization, due dates, and lifecycle tracking.
- Recurring tasks generate automatically.
- Checklist-based tasks calculate progress accurately.
- Notifications are triggered for key task events.
- Task templates support standardized operational processes.
- RBAC governs task visibility and actions.
- Audit logs capture all task lifecycle events.
- The engine performs consistently across desktop, tablet, and mobile devices.
