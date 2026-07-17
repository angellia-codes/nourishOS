# NourishOS — Employee Requisition (Manpower Request)

Version: 1.0
Module: HR → Recruitment
Collection: `recruitments`
Depends on: Approval Engine, Task Engine, Notification Engine, Audit Log, Calendar Service (interviews, later stage)

---

## 1. Purpose

Formal, approved request to hire before any vacancy is opened or candidate is contacted. Replaces WhatsApp/verbal hiring requests with a structured Draft → Approval → Open Vacancy flow. Every candidate in the pipeline must trace back to an approved requisition.

---

## 2. Architecture Decision — Two Status Fields, Not One

The existing `docs/modules/hr.md` recruitment stage list (Draft → Open → Screening → ... → Closed) mixes two lifecycles. This spec separates them:

| Field | Lifecycle | Owned by |
| --- | --- | --- |
| `status` | Draft → Submitted → Pending Approval → Approved / Rejected → Completed (filled) / Cancelled | Approval Engine (global workflow standard) |
| `vacancyStage` | Open → Sourcing → Interviewing → Offering → Filled → Closed | Recruitment module (only exists after `status = approved`) |

A requisition cannot be "Open" before it is approved. Candidates (`candidates` collection) reference `requisitionId` and move through their own pipeline stages (ST-01…ST-08 per HR_OPERATIONS.md §9.4) — candidate stages are per-candidate, vacancy stage is per-requisition.

---

## 3. Requisition Form Template (UI Fields)

### Section A — Request Details
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| Requisition No. | Auto | — | `REQ-[YEAR]-[SEQ]`, generated server-side on submit |
| Requested By | Auto | — | From auth context |
| Outlet | Select | Yes | From `outlets`; defaults to requester's outlet |
| Department | Select | Yes | From `departments` |
| Position | Select | Yes | From `positions`; free-text fallback flagged for HR review |
| Number of Openings | Number | Yes | ≥ 1 |
| Employment Type | Select | Yes | FT / FL / DW / OJT / Fixed-Term |
| Contract Duration | Number (months) | Conditional | Required if Fixed-Term |
| Requisition Type | Select | Yes | New Position / Replacement / Seasonal-Event |
| Replacing Employee | Employee picker | Conditional | Required if Replacement; FK → `employees` |
| Target Join Date | Date | Yes | Drives urgency ranking on HR dashboard |
| Urgency | Select | Yes | Normal / Urgent / Critical |

### Section B — Justification
| Field | Type | Required |
| --- | --- | --- |
| Business Justification | Textarea | Yes |
| Key Responsibilities | Textarea | Yes (prefilled from position template if available) |
| Requirements (skills, experience, certs — e.g. food safety) | Textarea | Yes |
| Work Schedule / Shift Pattern | Text | Yes |

### Section C — Compensation (restricted visibility)
| Field | Type | Required | Visibility |
| --- | --- | --- | --- |
| Salary Range (min–max, IDR) | Number pair | Yes | HR Manager, GM, Director, Super Admin only |
| Allowances (position/phone/transport) | Number(s) | No | Same restriction |
| Budgeted? | Boolean | Yes | If No → approval chain extends to Director |

Compensation fields live in a subdocument (`recruitments/{id}/confidential/compensation`) mirroring the `employees/{id}/compensation` pattern, enforced by Security Rules — never in the parent doc.

### Section D — Attachments
Org chart excerpt, workload evidence, event brief (seasonal) — via File Storage Service (`fileIds[]`).

---

## 4. Firestore Schema

```typescript
// recruitments/{requisitionId}
interface Requisition {
  id: string
  requisitionNumber: string          // REQ-2026-0042
  outletId: string
  departmentId: string
  positionId: string
  positionTitleFallback?: string     // if position not in master list
  openings: number
  employmentType: 'ft' | 'fl' | 'dw' | 'ojt' | 'fixed_term'
  contractMonths?: number
  requisitionType: 'new_position' | 'replacement' | 'seasonal'
  replacingEmployeeId?: string
  targetJoinDate: string             // ISO date
  urgency: 'normal' | 'urgent' | 'critical'
  justification: string
  responsibilities: string
  requirements: string
  workSchedule: string
  budgeted: boolean
  fileIds: string[]

  status: 'draft' | 'submitted' | 'pending_approval' | 'approved'
        | 'rejected' | 'completed' | 'cancelled'
  vacancyStage?: 'open' | 'sourcing' | 'interviewing' | 'offering'
              | 'filled' | 'closed'   // null until approved
  approvalId?: string                 // FK → approvals (Approval Engine)
  hiredCandidateIds: string[]         // filled as offers are accepted
  filledCount: number                 // completed when filledCount === openings

  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string                   // uid
}

// recruitments/{id}/confidential/compensation
interface RequisitionCompensation {
  salaryMin: number
  salaryMax: number
  positionAllowance?: number
  phoneAllowance?: number
  transportationAllowance?: number
  updatedAt: Timestamp
  updatedBy: string
}
```

---

## 5. Approval Chain (Approval Engine Configuration)

| Condition | Chain | SLA per step |
| --- | --- | --- |
| Budgeted, replacement | Dept Leader/Outlet Manager → HR Manager → GM | 48h |
| Budgeted, new position | Dept Leader/Outlet Manager → HR Manager → GM | 48h |
| **Not budgeted** (any type) | ... → GM → **Director** | 48h |
| Requested by HR Manager directly | GM (single step; +Director if unbudgeted) | 48h |

Sequential multi-step via existing Approval Engine — same pattern as Performance Appraisal (HR Manager → GM). No new approval logic; this is workflow definition config only (roadmap item #9).

On each step: Notification Engine event to next approver (UI + WhatsApp via Fonnte adapter once live). SLA breach → Task Engine escalation task to HR Manager.

---

## 6. Workflow & Shared Services Integration

```text
Draft (requester edits freely)
  ↓ submitRequisition()
Submitted → Approval Engine creates approval doc → Pending Approval
  ↓ approved                          ↓ rejected
status = approved                   status = rejected
vacancyStage = open                 notify requester (reason required)
  ↓
Task Engine: auto-task to HR Admin — "Open vacancy REQ-2026-0042"
Notification: HR team + requester
Audit Log: every transition (immutable)
  ↓
Candidates hired against requisition → filledCount++
  ↓ filledCount === openings
status = completed, vacancyStage = filled → closed
```

Cancellation: requester or HR Manager may cancel at any status except `completed`; cancelling an approved requisition with active candidates requires HR Manager confirmation and notifies all interviewers with scheduled events.

---

## 7. Cloud Functions

| Function | Purpose | RBAC check |
| --- | --- | --- |
| `createRequisition` | Create draft, validate outlet/department/position FKs | `recruitment.create` |
| `submitRequisition` | Generate requisition number, invoke Approval Engine, lock edits | `recruitment.create` (own) |
| `updateRequisition` | Draft-only edits | owner or `recruitment.manage` |
| `cancelRequisition` | Cancel + cascade notifications | owner (pre-approval) or `recruitment.manage` |
| `onRequisitionApproved` | Firestore trigger on approval completion → set status/vacancyStage, create tasks, notify | server-side |

All RBAC validated at Cloud Function level. Outlet scoping: Dept Leaders/Outlet Managers create only for own outlet; HR Manager/GM cross-outlet.

### Permissions (add to `permissions.ts` if not already scaffolded)
`recruitment.create`, `recruitment.view`, `recruitment.approve`, `recruitment.manage`, `recruitment.view_compensation`

| Role | create | view | approve | manage | view_compensation |
| --- | --- | --- | --- | --- | --- |
| Dept Leader / Outlet Manager | ✅ (own outlet) | own outlet | step 1 | — | — |
| HR Manager | ✅ | all | step 2 | ✅ | ✅ |
| GM | — | all | step 3 | — | ✅ |
| Director | — | all | conditional step | — | ✅ |
| Super Admin | ✅ | all | — | ✅ | ✅ |

---

## 8. Notifications (Notification Engine Events)

| Event | Recipients | Channel |
| --- | --- | --- |
| Submitted | First approver | UI + WA |
| Step approved | Next approver | UI + WA |
| Fully approved | Requester, HR team | UI + WA |
| Rejected | Requester (with reason) | UI + WA |
| SLA breach (48h) | HR Manager + pending approver | UI + WA |
| Requisition filled | Requester, GM | UI |

---

## 9. Dashboard Hooks

- HR Dashboard "Open Positions" widget: `recruitments where status == 'approved' && vacancyStage in ['open','sourcing','interviewing','offering']` — replaces the current `RECRUITMENT.stage = open` definition
- GM Dashboard "Pending Approvals": already covered by Approval Engine widget, no new work
- Time-to-fill metric: `approvedAt → last hiredCandidate acceptedAt`

---

## 10. Acceptance Criteria

1. Requisition cannot reach `vacancyStage = open` without completed approval chain
2. Unbudgeted requisitions always include Director in chain
3. Compensation subdocument unreadable by roles without `recruitment.view_compensation` (Security Rules test)
4. Every status transition produces an audit log entry with actor + timestamp
5. Requisition number unique, sequential per year
6. Candidate records cannot be created without an `approved` requisitionId
7. Filling final opening auto-completes the requisition and notifies requester
