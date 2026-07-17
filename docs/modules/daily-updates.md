# NourishOS — Daily Updates System

Version: 1.0
Module: Operations (cross-references HR Homepage/Command Center)
Collection: `dailyReports` (existing, extended — see §2)
Depends on: Task Engine, Notification Engine, Audit Log, Reports & Analytics

---

## 1. Purpose

Structured daily operational report submitted by each Head of Department (HOD) per outlet — staffing, achievements, challenges, and open tasks — replacing the WhatsApp-based reporting habit. Feeds the GM/HR Homepage Command Center (Section 2 Updates Feed, Section 3 Issues Board, Section 4 Escalation Center) in real time.

---

## 2. Architecture Decision — Reuse `dailyReports`, Don't Fork a New Collection

`FIRESTORE_SCHEMA.md` §24 and `DATABASE.md` §12 already scaffold a `dailyReports` collection (`date`, `summary`, `submittedBy`, `attachments`, `status`) under Operations. The HR_OPERATIONS.md §9.12 spec describes a richer "Daily Updates System" with staffing/achievements/challenges sections and structured, trackable tasks.

**Decision: Extend `dailyReports`, do not create a parallel `dailyUpdates` collection.** Same concept (HOD submits a structured daily record), same shared-service dependencies (Task Engine, Notification Engine). Forking a second collection would duplicate the exact anti-pattern the architecture rules prohibit (§5, no parallel systems). The placeholder schema in FIRESTORE_SCHEMA.md was never built against — extending it now is a schema addition, not a breaking change.

**Second decision: open tasks are NOT stored inline on the report.** They are created as real `Task` documents in the existing `tasks` collection (`taskType: 'dailyUpdate'`, `sourceModule: 'dailyReports'`, `referenceId: dailyReportId`). This is what lets the Task Engine's own assignment, status lifecycle, and (once extended) aging/escalation logic drive the Outstanding Issues Board and GM Escalation Center — instead of a second bespoke task tracker living inside the report document. This matches roadmap item #6 ("Task Engine extended with `dailyUpdate` task type + carry-forward/escalation Cloud Functions").

**Required Task Engine extension (flagging explicitly, not silently assuming):** the current `Task` interface (`task.types.ts`) and `TASK_TYPE` enum have no `dailyUpdate` value and no aging fields. Two additions needed:
1. `TASK_TYPE.DAILY_UPDATE = 'dailyUpdate'`
2. Optional aging fields on `Task`: `daysOpen`, `escalationLevel`, `carryForwardFromTaskId` — kept optional/generic so any long-lived task type can use them later, not hardcoded to Daily Updates only.

---

## 3. Daily Update Submission Form Template

### Section A — Header (auto-filled)
| Field | Source |
| --- | --- |
| Date | Today, locked |
| Outlet | Submitter's assigned outlet |
| Department | Submitter's department |
| Submitted By | Auth context (HOD) |

### Section B — Carried-Forward Review (blocking — E10-US02, M17-F10)
Cannot proceed to Section C until every carried-forward task from previous days has a status update.

| Field | Type |
| --- | --- |
| Task title | Display only |
| Days open | Auto, with aging color badge |
| Current status | Editable (Task Engine statuses) |
| Update comment | Required if status unchanged |

### Section C — Staffing
| Field | Type | Required |
| --- | --- | --- |
| Staff Scheduled | Number | Yes |
| Staff Present | Number | Yes |
| Absences (name + reason) | Repeatable | If Present < Scheduled |
| Late Arrivals | Repeatable | No |

### Section D — Achievements
| Field | Type | Required |
| --- | --- | --- |
| Key Achievements Today | Textarea, multi-entry | No |

### Section E — Challenges / Issues
| Field | Type | Required |
| --- | --- | --- |
| Challenge Description | Textarea | If any logged |
| Category | Select: Staffing / Equipment / Supplier / Customer / Facility / Other | Yes (per entry) |
| Severity | Select: Low / Medium / High | Yes (per entry) |
| Requires Follow-up Task? | Boolean | Yes |

### Section F — New Open Tasks
Repeatable block; each entry creates a `Task` (not stored inline):

| Field | Type | Required |
| --- | --- | --- |
| Title | Text | Yes |
| Description | Textarea | No |
| Assigned To | Employee picker | Yes |
| Priority | Critical / High / Medium / Low | Yes |
| Due Date | Date | No — defaults to +1 day if blank |

### Section G — Attachments
Photos, documents — via File Storage Service.

---

## 4. Firestore Schema

```typescript
// dailyReports/{reportId} — extends existing placeholder schema
interface DailyReport {
  id: string
  date: Timestamp                 // report date, one per outlet+department+date
  outletId: string
  departmentId: string
  submittedBy: string              // uid

  staffScheduled: number
  staffPresent: number
  absences: { employeeId: string; reason: string }[]
  lateArrivals: { employeeId: string; minutesLate: number }[]

  achievements: string[]

  challenges: {
    description: string
    category: 'staffing' | 'equipment' | 'supplier' | 'customer' | 'facility' | 'other'
    severity: 'low' | 'medium' | 'high'
    taskId?: string                // set if a follow-up Task was created
  }[]

  newTaskIds: string[]             // Tasks created from Section F
  carriedForwardTaskIds: string[]  // Tasks reviewed this submission (snapshot, not source of truth)

  attachments: string[]            // File IDs
  status: 'submitted'              // single-state; not a workflow (no approval required)

  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
}
```

```typescript
// tasks/{taskId} — extension to existing Task interface (task.types.ts)
interface Task extends BaseDocument {
  // ...existing fields unchanged (title, description, taskType, sourceModule,
  // referenceId, assignedTo, assignedBy, priority, taskStatus, dueDate,
  // estimatedDurationMinutes, tags)

  // NEW — optional, generic aging support:
  daysOpen?: number                    // recalculated by carry-forward function
  escalationLevel?: 0 | 1 | 2 | 3 | 4   // 0 = none
  carryForwardFromTaskId?: string       // points to yesterday's instance of this task
}
```

For `taskType: 'dailyUpdate'` tasks: `sourceModule = 'dailyReports'`, `referenceId = dailyReportId` (the report that originally raised it). `carryForwardFromTaskId` provides the day-to-day chain rather than creating a new document each day.

---

## 5. Task Aging & Escalation (per HR_OPERATIONS.md §9.12, §14.2–14.3)

### Aging indicator
| Days Open | Label | Color |
| --- | --- | --- |
| 1–3 | Normal | Green |
| 4–7 | Warning | Yellow |
| 8–14 | High Attention | Orange |
| 15+ | Critical | Red |

> Demo note: the `/demo` preview maps both Warning and High Attention to the shared `warning` Badge variant — the primitive Badge set has no orange yet. Labels stay distinct; the color split lands when an orange variant is added.

### Escalation trigger
| Days Open | Level | Recipient | Dashboard Flag |
| --- | --- | --- | --- |
| D+2 | 1 | Department Manager | Warning (Yellow) |
| D+3 | 2 | HR Admin + HR Manager | High Attention (Orange) |
| D+5 | 3 | General Manager | Critical (Red), Escalation Center |
| D+14 | 4 | GM (full summary) | Critical + Escalated flag |

Escalation only applies to `taskType: 'dailyUpdate'` tasks not in `completed`/`cancelled`/`closed` status. Fires once per level per task — idempotent via `escalationLevel`: only escalate when `daysOpen` crosses a threshold AND `escalationLevel` is below the corresponding level.

---

## 6. Scheduled Cloud Functions

| Function | Schedule | Logic |
| --- | --- | --- |
| `carryForwardDailyTasks` | 00:01 daily | Query `tasks` where `taskType == 'dailyUpdate' AND taskStatus NOT IN (completed, cancelled, closed)`. Increment `daysOpen` on each — same document, no duplicate row per day |
| `checkDailyTaskEscalations` | 07:00 daily, after carry-forward | Compare `daysOpen` to thresholds above; dispatch Notification Engine event + WhatsApp (Fonnte) at matching level; update `escalationLevel` |
| `sendComplianceAlerts` | 17:00 daily | For each outlet/department with no `dailyReports` doc for today's date, notify Department Manager (M17-F11) |
| `sendDailyDigest` | 08:00 daily | Aggregate submission compliance %, escalated task count, open issues — WhatsApp + in-app to GM and HR (M17-F07) |
| `submitDailyReport` | on-demand (callable) | Validates carried-forward review is complete before accepting submission; creates `Task` docs from Section F; creates follow-up `Task` for challenges flagged `requiresFollowUp`; writes report; audit log |

Business rule enforced server-side, not just UI: `submitDailyReport` rejects if any assigned open `dailyUpdate` task for that outlet+department lacks a status update dated today — mirrors E10-US01's "cannot submit without reviewing all carried-forward tasks."

---

## 7. RBAC / Permissions

| Role | Submit | View Own Outlet | View All Outlets | Manage Escalations |
| --- | --- | --- | --- | --- |
| Department Leader / HOD | ✅ | ✅ | — | — |
| Outlet Manager | ✅ | ✅ | — | — |
| HR Manager | — | — | ✅ | ✅ |
| General Manager | — | — | ✅ | ✅ (view + intervene) |
| Director | — | — | ✅ (read) | — |
| Super Admin | — | — | ✅ | ✅ |

Permission strings: `dailyReport.submit`, `dailyReport.view`, `dailyReport.view_all`, `task.escalation.manage` — verify against actual `permissions.ts`; not confirmed present in project files.

---

## 8. Notification Matrix

| Event | Recipient | Channel | Timing |
| --- | --- | --- | --- |
| Report submitted | HR Admin | UI + WA | On submit |
| Compliance missing | Department Manager | WA | 17:00 |
| Escalation L1 | Department Manager | WA | D+2, 07:00 |
| Escalation L2 | HR Admin + HR Manager | WA | D+3, 07:00 |
| Escalation L3 | General Manager | WA | D+5, 07:00 |
| Escalation L4 | GM (full summary) | WA + in-app | D+14, 07:00 |
| Daily digest | GM, HR Manager | WA + in-app | 08:00 |

---

## 9. Homepage / Command Center Hooks

| Homepage Section | Query |
| --- | --- |
| Section 2 — Daily Outlet Updates Feed | `dailyReports` ordered by `createdAt desc`, real-time subscription |
| Section 3 — Outstanding Issues Board (Kanban) | `tasks` where `taskType == 'dailyUpdate'`, grouped by `taskStatus` |
| Section 4 — Escalation Center | `tasks` where `taskType == 'dailyUpdate' AND escalationLevel >= 1`, color-banded by level |
| Submission Compliance widget | `dailyReports` today vs. active outlet/department count — red if < 80% |

---

## 10. Acceptance Criteria

1. Submission blocked until every carried-forward `dailyUpdate` task has a status update timestamped today
2. `carryForwardDailyTasks` runs at 00:01 and increments `daysOpen` on all open `dailyUpdate` tasks without creating duplicate task documents
3. Escalation notifications fire exactly once per level per task, verified via `escalationLevel`
4. Compliance alert fires only for outlets/departments with zero submissions for the current date
5. Daily digest reflects same-day data and sends by 08:05 at the latest
6. Every report submission and task creation produces an audit log entry
7. Homepage Escalation Center reflects a D+5 task within one dashboard refresh cycle of `checkDailyTaskEscalations` running
