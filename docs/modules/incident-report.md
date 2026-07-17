# NourishOS — Incident Report

Version: 1.0
Module: Operations
Collection: `incidentReports` (existing placeholder — schema not yet built against)
Depends on: Task Engine, Notification Engine, Audit Log, File Storage; conditionally Work Order (Engineering)

---

## 1. Purpose

Structured capture of operational incidents — customer complaints, food safety events, workplace injuries, equipment failures, theft, security incidents, utility failures, near misses — replacing verbal/WhatsApp incident reporting with a trackable record from report through investigation to closure.

---

## 2. Status Check — This Is a New Build, Not a Gap-Fill

Unlike the Security Control Point template, nothing here is implemented yet. `incidentReports` and `createIncidentReport`/`createIncident` appear only as names in `docs/modules/operations.md`, `API.md`, and the Firestore structure list — no `functions/src/operations/` implementation, no `IncidentReport` type, no `INCIDENTS_*` permissions in `permissions.ts`. This spec is the first real design pass, not a UI layer on an existing backend.

---

## 3. Architecture Decision — Task Engine for Investigation, Not Approval Engine

The documented workflow (Report → Manager Review → Investigation → Resolution → Closed) looks like a sequential approval chain but isn't one: there's no fixed approver sequence — who handles it depends on **incident type**, not a standing role hierarchy. A theft report routes to Security; an equipment failure routes to Engineering; a workplace injury routes to HR. This is single-assignee case management, not multi-step sign-off.

**Decision:** model this as a status-driven record (`status` field, not an Approval Engine workflow) with investigation ownership delegated to a **Task Engine** task (`assignedTo` = routed owner). This matches the same pattern already used for Security Patrol's flag-and-notify design and avoids forcing a case-management problem into an approval-chain shape it doesn't fit.

### Type-based routing
| Incident Type | Routed To | Notes |
| --- | --- | --- |
| Customer Complaint | Outlet/Department Leader | |
| Food Safety | Department Leader + HR (cc) | |
| Workplace Injury | HR Manager | Sensitive — see §7 |
| Equipment Failure | Engineering | Auto-creates linked Work Order — see §6 |
| Theft | Security | |
| Security Incident | Security | |
| Utility Failure | Engineering | |
| Near Miss | Department Leader | Lower urgency, still logged |

Severity (`critical`/`high`/`medium`/`low` — reusing the existing shared `Priority` type, not inventing a parallel enum) overrides routing for urgency: any `critical` incident notifies GM immediately regardless of type.

---

## 4. Incident Report Form Template

### Section A — What Happened
| Field | Type | Required |
| --- | --- | --- |
| Title | Text | Yes |
| Incident Type | Select (table above) | Yes |
| Severity | Critical / High / Medium / Low | Yes |
| Description | Textarea | Yes |
| Date/Time Occurred | Datetime | Yes — may differ from report submission time |
| Location | Text | Yes | e.g. "Kitchen — walk-in chiller", "Front entrance" |
| Outlet / Department | Auto-filled | — | From submitter, editable if reporting on behalf of another outlet |

### Section B — People Involved
| Field | Type | Required |
| --- | --- | --- |
| People Involved | Repeatable: name, role (employee/customer/vendor/other), employee picker if applicable | If any |
| Witnesses | Repeatable: name, contact | No |

### Section C — Immediate Response
| Field | Type | Required |
| --- | --- | --- |
| Immediate Action Taken | Textarea | Yes |
| First Aid / Emergency Services Called? | Boolean + notes | Required for Workplace Injury |

### Section D — Attachments
Photos, documents — via File Storage Service (`module: 'operations', resourceType: 'incidentReport'`). Recommend reusing the existing timestamp/location photo-stamping utility (`stampImage`, built for Security Patrol) for incident photos — same tamper-evidence value applies to theft, equipment damage, and injury documentation, and it's already built.

---

## 5. Firestore Schema

```typescript
// incidentReports/{incidentId}
interface IncidentReport extends BaseDocument {
  incidentNumber: string          // INC-2026-0001

  title: string
  description: string
  incidentType: 'customerComplaint' | 'foodSafety' | 'workplaceInjury' | 'equipmentFailure'
              | 'theft' | 'securityIncident' | 'utilityFailure' | 'nearMiss'
  severity: Priority               // reuses existing critical/high/medium/low
  location: string
  occurredAt: Timestamp            // when it happened, distinct from createdAt (when reported)

  peopleInvolved: { name: string; role: 'employee' | 'customer' | 'vendor' | 'other'; employeeId?: string }[]
  witnesses: { name: string; contact?: string }[]
  immediateActionTaken: string
  emergencyServicesCalled: boolean

  reportedBy: string               // uid
  assignedTo?: string              // uid — routed per §3 table
  investigationTaskId?: string     // FK → tasks, if investigation task created
  linkedWorkOrderId?: string       // FK → workOrders, if incidentType == 'equipmentFailure'

  /** Overrides BaseDocument's generic status with this module's specific lifecycle. */
  status: 'reported' | 'underReview' | 'investigating' | 'resolved' | 'closed' | 'reopened'
  resolutionSummary?: string
  resolvedAt?: Timestamp
  resolvedBy?: string

  attachments: string[]            // File IDs

  // BaseDocument: id, createdAt, updatedAt, createdBy, updatedBy,
  // outletId, departmentId, isArchived
}
```

---

## 6. Equipment Failure → Work Order Auto-Link

Rather than requiring a manager to manually re-enter an equipment failure as a separate Work Order, `createIncidentReport` should call the existing Work Order creation path internally when `incidentType == 'equipmentFailure'`, pre-filled from the incident (title, description, location, priority mapped from severity), and store the resulting ID in `linkedWorkOrderId`. Same "extend, don't duplicate" reasoning as Daily Updates → Task Engine: one source of truth for the actual repair work, the incident record stays the case file.

---

## 7. Flag — Workplace Injury Sensitivity

Workplace injury incidents may contain health information (injury description, first aid given, medical follow-up). Per the confidential-subdocument pattern already used for Requisition compensation and Employee compensation, **injury detail fields should not be broadly readable** through the standard `incidentReports.view` permission. Recommend:
- Base incident record (type, severity, status, location) visible per §8's normal RBAC
- Injury-specific narrative fields restricted to `incidents.view_sensitive` (HR Manager, GM, Super Admin only) — mirrors the compensation-subdocument approach rather than gating the entire incident record

This wasn't in the original operations.md spec — flagging it now since workplace injury is explicitly listed as an incident type and the module doc's permission table only distinguishes "Create/View/Manage/None," not sensitive-field-level access.

---

## 8. Cloud Functions

| Function | Purpose | RBAC check |
| --- | --- | --- |
| `createIncidentReport` | Validate, generate incident number, route `assignedTo` by type, create investigation Task, auto-create linked Work Order if equipment failure, notify | `incidents.create` |
| `updateIncidentStatus` | Transition status (reported → underReview → investigating → resolved → closed); requires `resolutionSummary` before `resolved` | `incidents.manage` or assigned owner |
| `reopenIncident` | Closed → reopened, requires reason | `incidents.manage` |
| `addIncidentAttachment` | Attach file post-creation (e.g. photos added after initial report) | reporter or assigned owner |

Investigation tasks use `TASK_TYPE.CUSTOM` with `tags: ['incident']` rather than a new dedicated task type — lighter-weight than extending the shared `TaskType` enum (as was necessary for Daily Updates), since incident investigation doesn't need first-class dashboard treatment inside the Task Engine itself; the Operations Dashboard queries `incidentReports` directly by `status`, not through tasks.

### Permissions (need to be added to `permissions.ts` — not present)
`incidents.create`, `incidents.view`, `incidents.view_all`, `incidents.view_sensitive`, `incidents.manage`

| Role | create | view (own outlet) | view_all | view_sensitive | manage |
| --- | --- | --- | --- | --- | --- |
| Department Leader | ✅ | ✅ | — | — | — |
| Outlet Manager | ✅ | ✅ | — | — | — |
| Engineering | — | ✅ (equipment type) | — | — | ✅ (equipment type) |
| Security | — | ✅ (theft/security type) | — | — | ✅ (theft/security type) |
| HR Manager | — | ✅ | ✅ | ✅ | ✅ (workplace injury) |
| General Manager | — | — | ✅ | ✅ | ✅ (critical severity, any type) |
| Super Admin | ✅ | ✅ | ✅ | ✅ | ✅ |

This is close to but more granular than the `Leader: Create / GM: View / Engineering: View / Security: Manage / HR: View` matrix in `docs/modules/operations.md` §19 — that table doesn't account for type-based routing or severity escalation, which this spec adds. Worth reconciling the two before build.

---

## 9. Notification Matrix

| Event | Recipient | Timing |
| --- | --- | --- |
| Incident reported | Routed owner (per §3) | Immediate |
| Critical severity reported | GM + HR (in addition to routed owner) | Immediate |
| Status changed | Reporter | On each transition |
| Investigation task assigned | Assignee | On assignment |
| Resolved | Reporter, routed owner | On resolution |
| Reopened | Original assignee, GM | On reopen |

---

## 10. Dashboard Hooks

| Widget | Source |
| --- | --- |
| Operations Dashboard "Open Incidents" | `incidentReports` where `status NOT IN ('resolved','closed')` |
| GM Executive Dashboard "Critical Open Tasks" | Include `incidentReports` where `severity == 'critical' AND status NOT IN ('resolved','closed')` alongside existing task-based critical items |
| Reports → Operational → Incident Report Summary | Aggregate by type/severity/outlet/resolution time, per existing `reports.md` §7 spec |

---

## 11. Acceptance Criteria

1. Every incident report requires a severity level (blocks submission without one — matches existing validation rule in operations.md §20)
2. `assignedTo` is set automatically per the type-routing table; no incident goes unassigned
3. Critical-severity incidents notify GM within the same Cloud Function call that creates the report — not on a delayed batch
4. Equipment Failure incidents produce a linked Work Order with matching title/location/priority; no duplicate manual entry required
5. `status` cannot move to `resolved` without a non-empty `resolutionSummary`
6. Workplace injury narrative fields are unreadable by roles without `incidents.view_sensitive` (Security Rules test)
7. Every status transition and attachment addition produces an audit log entry
8. Reopening a closed incident requires a reason and notifies the original assignee + GM
