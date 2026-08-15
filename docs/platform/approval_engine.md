# NourishOS Approval Engine

Version: 1.1
Module: Shared Services - Approval Engine

> **Shipped state (July 2026 rewrite).** Live today: server-owned routes in `functions/src/shared/approval/routes.ts` (`hr/appraisal` and `hr/contract`, each a fixed `hrManager → generalManager` chain); callables `submitApproval`, `approveStep`, `rejectStep`, `returnForRevision`, `cancelApproval` (+ `onApprovalRequestResolved` trigger and `submitApprovalInternal` for cross-function use); clients submit a resource identity only — never a steps array; self-approval blocked (§23); every state change runs in a Firestore transaction that also closes the live `approvalSteps` doc. **Planned, not shipped:** configurable routing (§6/§9), SLA/escalation/reminders (§13–§14), delegation (§12), queue bulk actions, and the §18 functions marked Planned. Lifecycle actually used: submit → `pending` → `approved` / `rejected` / `returnedForRevision` / `cancelled`.

---

# 1. Overview

The Approval Engine is a shared platform service responsible for managing approval workflows across all NourishOS modules.

Instead of each module implementing its own approval logic, every request requiring authorization passes through this centralized engine.

Supported modules include:

- HR
- Operations
- Finance
- Documents
- Communications

---

# 2. Objectives

- Centralize approval workflows
- Ensure consistent approval logic
- Enforce RBAC
- Maintain complete audit history
- Support configurable approval chains
- Enable future workflow automation

---

# 3. Supported Resources

```text
Approval Engine
│
├── Expense Requests
├── Employee Contracts
├── Recruitment Requests
├── Performance Reviews
├── SOPs
├── Company Policies
├── Work Orders
├── Asset Requests
├── Incident Closures
├── Document Publishing
└── Future Modules
```

---

# 4. Core Concepts

### Approval Request

A business object submitted for approval.

Examples:

- Expense Request
- SOP
- Contract
- Budget Request

---

### Workflow

A configurable sequence of approval steps.

Example

```text
Employee

↓

Department Manager

↓

Finance

↓

General Manager

↓

Director
```

---

### Approval Step

A single stage within a workflow.

Each step defines:

- Approver Role
- Sequence
- Conditions
- Status
- SLA

---

# 5. Approval Status

```text
Draft                  (defined, never set by shipped code)

Submitted              (defined, never set — submit writes straight to Pending)

Pending                (shipped)

Approved               (shipped — terminal; no separate "Completed" is set)

Rejected               (shipped)

Returned for Revision  (shipped — KNOWN GAP: no module reacts downstream yet)

Cancelled              (shipped)

Completed              (defined, never set)

Expired                (defined, never set — no SLA engine yet)
```

---

# 6. Workflow Configuration (Planned)

Shipped reality: routes are hardcoded in `functions/src/shared/approval/routes.ts` — adding an approvable resource means adding a route entry + registering a resolved-handler (see `hr/appraisal/index.ts`). The configurability below is the target model.

Workflows will be configurable by:

- Module
- Resource Type
- Department
- Outlet
- Monetary Threshold
- Employee Position

Example:

Expense ≤ IDR 5,000,000

```text
Requester

↓

Department Manager

↓

Finance
```

Expense > IDR 5,000,000

```text
Requester

↓

Department Manager

↓

Finance

↓

General Manager

```

---

# 7. Approval Actions

Approvers may:

- Approve
- Reject
- Return for Revision
- Reassign (Authorized Roles)
- Escalate
- Add Comments

---

# 8. Workflow Lifecycle

```text
Draft

↓

Submit

↓

Validation

↓

Approval Step 1

↓

Approval Step 2

↓

Approval Step N

↓

Completed
```

If rejected:

```text
Rejected

↓

Requester Revises

↓

Resubmit
```

---

# 9. Approval Conditions

Supported conditions include:

- Amount
- Department
- Outlet
- Role
- Position
- Resource Type
- Category
- Priority

Future:

- Dynamic expressions
- Scripted conditions

---

# 10. Approval Queue

Each approver has a personal approval queue.

Displays:

- Resource
- Requester
- Module
- Submitted Date
- Priority
- SLA
- Current Step

Supports:

- Search
- Filters
- Bulk approval (optional)
- Pagination

---

# 11. Approval History

Each approval records:

- Approver
- Action
- Timestamp
- Comments
- Previous Status
- New Status

History is immutable.

---

# 12. Delegation

Future capability.

Allows:

- Temporary approver delegation
- Vacation coverage
- Acting manager approvals

Delegation has:

- Start Date
- End Date
- Scope

---

# 13. SLA Management

Each approval step may define an SLA.

Example

```text
Manager

24 Hours

Finance

48 Hours

Director

72 Hours
```

Overdue approvals generate reminders.

---

# 14. Escalation Rules

If SLA expires:

```text
Reminder

↓

Second Reminder

↓

Escalate to Manager

↓

Escalate to GM

↓

Escalate to Director
```

Escalation rules are configurable.

---

# 15. Notifications

Automatically notify:

Requester

Approver

Manager

Examples

- Approval Required
- Approved
- Rejected
- Returned for Revision
- Escalated
- SLA Reminder

---

# 16. Dashboard Integration

Widgets include:

- Pending Approvals
- Approvals Due Today
- Overdue Approvals
- Average Approval Time
- Approval Volume
- Approval Success Rate

---

# 17. Firestore Collections

```text
approvalRequests       (shipped — written by the engine)

approvalSteps          (shipped — live step doc, closed out on resolution)

approvalHistory        (shipped — append-only)

approvalWorkflows      (declared in collections.ts, not yet written — routes are code-owned)

approvalDelegations    (declared in collections.ts, not yet written)

approvalTemplates      (planned — does not exist)

approvalEscalations    (planned — does not exist)
```

---

# 18. Cloud Functions

Shipped:

```text
submitApproval()          (also submitApprovalInternal for cross-function use)

approveStep()             (advances/completes the workflow inline — no separate advance/complete fn)

rejectStep()

returnForRevision()

cancelApproval()
```

Planned:

```text
advanceWorkflow()         (currently inline in approveStep)

escalateApproval()

sendApprovalReminder()

completeApproval()        (currently inline in approveStep)
```

---

# 19. Permissions

| Action              |        Requester        | Manager | Finance |   GM    | Director | Super Admin |
| ------------------- | :---------------------: | :-----: | :-----: | :-----: | :------: | :---------: |
| Submit              |           ✅            |   ✅    |   ✅    |   ✅    |    ✅    |     ✅      |
| Approve             |           ❌            | Limited | Limited | Limited | Limited  |  Override   |
| Reject              |           ❌            | Limited | Limited | Limited | Limited  |  Override   |
| Return for Revision |           ❌            | Limited | Limited | Limited | Limited  |  Override   |
| Cancel              | Owner (Before Approval) |   ❌    |   ❌    |   ❌    |    ❌    |  Override   |
| Configure Workflow  |           ❌            |   ❌    |   ❌    |   ❌    |    ❌    |     ✅      |

Workflow permissions are enforced through RBAC.

---

# 20. Validation Rules

- Workflow must contain at least one approval step.
- Each step must have a valid approver.
- Steps must follow sequential order.
- Completed approvals cannot be edited.
- Rejected requests require comments.
- Revision requests require comments.
- Monetary thresholds cannot overlap.

---

# 21. Audit Logging

Automatically record:

- Submission
- Approval
- Rejection
- Revision Request
- Escalation
- Delegation
- Workflow Completion
- Workflow Cancellation

Each audit entry includes:

- User
- Timestamp
- Action
- Workflow
- Resource
- Step
- Comments

---

# 22. Performance Targets

- Workflow validation ≤ 500 ms
- Approval action ≤ 1 second
- Queue refresh in real time
- Reminder processing asynchronous
- Dashboard metrics updated near real time

---

# 23. Security

- Validate authentication before processing.
- Verify RBAC at every approval step.
- Self-approval is blocked (shipped); a superAdmin may override, and the override is audit-logged as `approve_override`.
- Lock completed workflows.
- Ensure approval history is immutable.
- Log all administrative workflow changes.

---

# 24. Future Enhancements

## Workflow Builder

- Drag-and-drop workflow designer
- Conditional branches
- Parallel approvals
- Approval groups
- Dynamic routing

## Automation

- Auto-approval below thresholds
- AI approval recommendations
- SLA prediction
- Risk scoring

## Integrations

- Digital signatures
- WhatsApp approval actions
- Email approvals
- Calendar reminders
- External API workflows

---

# 25. Acceptance Criteria

The Approval Engine is complete when:

- All supported modules use the shared approval service.
- Workflows are configurable by resource type and business rules.
- Approval queues display pending actions accurately.
- SLA reminders and escalations function correctly.
- Approval history is immutable and auditable.
- Notifications are generated automatically.
- RBAC is enforced at every workflow step.
- Dashboard metrics reflect approval activity.
- The service is responsive and performs consistently across desktop, tablet, and mobile devices.
