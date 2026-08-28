# NourishOS — Training Management Module

**Version:** 1.0
**Date:** 2026-08-26
**Status:** Design locked — ready for implementation planning
**Supersedes:** Training module design session, 2026-07-28 (unspecced)
**Source data:** `NGI - Training Topic Master Sheet — Master Topic List` (217 rows, 11 departments)

---

## 1. Purpose

Manage the full training lifecycle for NGI staff: a canonical catalogue of 197 training
topics, department-scoped delivery sequences, prerequisite-gated assignment, trainer-verified
completion, and recurring refresher campaigns.

Replaces spreadsheet-based training tracking and undocumented on-the-job sign-off.

---

## 2. Decisions locked

| # | Decision | Resolution |
|---|---|---|
| D1 | Delivery model | **Per-topic `deliveryMode`** — `trainer` (default, all 197 on import) or `digital`. Both write an identical completion shape. |
| D2 | Topic ownership | **Canonical topic + department binding.** Content is canonical; sequence, prerequisites and trainer are binding-local. Completion records against the canonical topic so it survives transfers. |
| D3 | Department vocabulary | **Shared `departments` collection**, seeded from the 11 sheet departments as the canonical group-wide taxonomy. Positions Master (Module A) adopts the same collection. |
| D4 | Recurrence | **Time-based intervals + manual campaigns.** No event-bus integration. Re-issue and refresher are one mechanism (`trainingCampaign`) with `trigger: scheduled \| manual`. |
| D5 | Verification authority | **Manager-tier**, scoped to own outlet/department. `suggestedTrainer` displayed but advisory; `requiredTrainerRoleId` reserved, null on import. |
| D6 | Prerequisites | **Gated assignment with HR override.** `prerequisiteTopicIds[] + minTenureMonths + allCoreTopics`. Override requires `training.manage` and a logged reason. |
| D7 | Delete semantics | **Tiered by reference state.** Hard delete if never assigned; archive if assigned; completion records immutable always. Archiving a binding cancels in-flight assignments with notification. |
| D8 | Assessment | **Outcome recorded at sign-off.** Unified `assessmentResult` across both delivery modes. Score optional. |

### Deferred from 2026-07-28

| Item | Resolution |
|---|---|
| Quiz retry policy | Unlimited immediate retries. Only affects `deliveryMode: digital` — currently zero topics. Revisit when digital content exists. |
| Overdue escalation depth | **L1 (employee) + L2 (manager) only** for MVP. L3/L4 deferred. |
| `managerTier` canonical roles | **Still open** — see §9. |

---

## 3. Source data normalisation

Ingestion of the 217-row master sheet produced:

| Output | Count |
|---|---|
| Departments | 11 |
| Canonical topics | **197** (20 rows deduplicated) |
| Department bindings | 217 |
| Unresolved prerequisite references | **0** |
| Field conflicts requiring resolution | 1 |

### Deduplication

Only three titles appear in more than one department, all correctly flagged `Universal Topic`:

| Topic | Departments |
|---|---|
| Nourish Group Company Values, Vision & Culture | 11 |
| Workplace Safety & Emergency Procedures | 8 |
| Personal Grooming & Uniform Standards | 4 |

The remaining `Universal Topic`-flagged rows are **department-specific variants with distinct
titles** (Kitchen Hygiene / Retail Presentation / Bakery Hygiene / Safety Workwear grooming
standards; burns and oven-safety workplace safety variants). These are **not** merged — they
are genuinely different sessions. The `Universal Topic` column is therefore treated as a
**scheduling hint** ("deliver at shared induction"), not a deduplication instruction.

### Conflict resolved during ingestion

| Topic | Field | Values | Resolution |
|---|---|---|---|
| Workplace Safety & Emergency Procedures | `sourceMaterial` | `Emergency response SOP, fire drill record` / `Emergency response SOP` | Longest retained |

Trainer wording variants (`HR / People Lead` vs `HR Lead / People Lead`; `Outlet Manager / HR`
vs `Security Supervisor/HR`) required no resolution — trainer is a binding-level field.

### Collapsed columns

`Phase`, `Mandatory / Optional`, `Upskilling Only` and `Assessment Required` were verified
**perfectly collinear across all 217 rows (zero violations)**. They collapse to a single
`phase` field:

- `phase: 'onboarding'` → mandatory, assessment required (184 topics)
- `phase: 'upskilling'` → optional, no assessment required (13 topics)

Storing all four independently would guarantee drift on first edit.

### Recurrence classification

| `recurrence.type` | Bindings | Derived from |
|---|---|---|
| `none` | 120 | `Once`, `Once – Induction` |
| `interval` | 66 | `Once + Annual` (12mo), `Once + Quarterly` (3mo), `Once + Monthly` (1mo), `Semi-annual` (6mo) |
| `manual` | 31 | Event-triggered (`Each menu update`, `Before peak seasons`) and ad hoc (`As needed`, `Spot checks`) |

Original frequency strings are preserved verbatim in `recurrence.recurrenceNote` so
operational intent is not lost.

> **Operational consequence:** the 31 `manual` bindings have no automatic due date and will
> **never surface as overdue**. They are issued only when HR runs a campaign.

---

## 4. Data model

All documents carry the standard envelope: `id`, `createdAt`, `updatedAt`, `createdBy`,
`status`, and `outletId` where applicable.

### 4.1 `departments`

Canonical group-wide taxonomy. Owned jointly with Positions Master.

```ts
{
  id: string;                    // 'dept-bar'
  sourceKey: string;             // 'BAR' — provenance from master sheet
  name: { en: string; id: string };
  sortOrder: number;
  status: 'active' | 'archived';
}
```

### 4.2 `trainingTopics`

Canonical content. Department-agnostic.

```ts
{
  id: string;                    // 'trn-espresso-brewing-standards-and-calibration'
  title: { en: string; id: string | null };
  phase: 'onboarding' | 'upskilling';
  durationMinutes: 30 | 45 | 60 | 90 | 120;
  deliveryMode: 'trainer' | 'digital';
  assessmentRequired: boolean;
  sourceMaterial: string;
  sharedAcrossDepartments: boolean;
  contentRef: string | null;     // File Storage / Documents ref — digital mode only
  status: 'active' | 'archived';
}
```

### 4.3 `trainingBindings`

Places a canonical topic into a department's delivery sequence.

```ts
{
  id: string;                    // 'tb-bar-06'
  departmentId: string;
  topicId: string;
  sequence: number;              // dept-local order, from sheet '#'
  prerequisiteTopicIds: string[];// resolved from dept-local ordinals at ingestion
  minTenureMonths: number | null;
  allCoreTopics: boolean;        // resolves dynamically to all onboarding topics in dept
  suggestedTrainer: string;      // advisory display text
  requiredTrainerRoleId: string | null;  // reserved — null on import
  recurrence: {
    type: 'none' | 'interval' | 'manual';
    intervalMonths: number | null;
    recurrenceNote: string;      // original sheet value
  };
  sourceNotes: string | null;
  status: 'active' | 'archived';
}
```

`allCoreTopics: true` deliberately resolves at evaluation time rather than enumerating topic
IDs, so the gate stays correct when topics are added to a department later.

### 4.4 `trainingAssignments`

Per-employee instance. The compliance record.

```ts
{
  id: string;
  employeeId: string;
  departmentId: string;
  outletId: string;
  topicId: string;               // canonical — survives dept transfer
  bindingId: string;             // provenance
  campaignId: string | null;
  status: 'locked' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  assignedAt: Timestamp | null;
  dueAt: Timestamp | null;       // null when recurrence.type === 'manual'
  completedAt: Timestamp | null;
  verifiedByUid: string | null;
  assessmentResult: {
    passed: boolean;
    score: number | null;        // 1–10, optional
    notes: string | null;
    method: 'trainer' | 'quiz';
  } | null;
  overrideReason: string | null; // set when force-assigned past a gate
  overrideByUid: string | null;
}
```

### 4.5 `trainingCampaigns`

Bulk issue — covers both scheduled refreshers and manual re-issues.

```ts
{
  id: string;
  trigger: 'scheduled' | 'manual';
  topicId: string;
  departmentIds: string[];
  outletIds: string[] | null;    // null = all outlets
  reason: string;
  issuedByUid: string | null;    // null when scheduled
  issuedAt: Timestamp;
  assignmentCount: number;
  status: 'active' | 'completed';
}
```

---

## 5. RBAC

| Permission | Roles | Scope | Covers |
|---|---|---|---|
| `training.manage` | Super Admin, HR Manager | Group-wide | Create/edit/archive/delete topics, bindings, campaigns; force-assign override |
| `training.verify` | Manager tier and above | Own outlet + department | Mark trainees complete, record assessment outcome |
| `training.view` | All staff | Own assignments only | Read own queue and history |

Department Heads hold `verify`, **not** `manage`.

All three enforced at Cloud Function level. Firestore rules mirror but do not substitute.

---

## 6. Workflows

### 6.1 Assignment generation

Triggered on hire, on department transfer, and on campaign issue.

1. Resolve employee's `departmentId`.
2. Fetch active `trainingBindings` for that department.
3. For each binding, check for an existing `completed` assignment **on the canonical
   `topicId`** — this is what makes transfers non-destructive.
4. Evaluate the gate: all `prerequisiteTopicIds` completed, `minTenureMonths` satisfied
   against hire date, and if `allCoreTopics`, all onboarding topics in the department complete.
5. Gate satisfied → create assignment as `assigned`. Gate unsatisfied → create as `locked`.
6. `dueAt` set from `recurrence`; null for `manual`.

**Expected shape for a new Bar hire:** 3 topics immediately `assigned`, 17 `locked`,
2 upskilling topics locked behind a 3-month tenure gate.

### 6.2 Completion (trainer mode)

1. Manager with `training.verify` opens the trainee's queue.
2. Records `passed`, optional `score` (1–10), optional `notes`.
3. Cloud Function transaction: set `completed`, write `verifiedByUid`, write
   `assessmentResult` with `method: 'trainer'`.
4. Post-commit: unlock evaluation on dependent assignments; audit log; notification to
   employee.

### 6.3 Completion (digital mode)

Identical, except `method: 'quiz'` and `verifiedByUid` is the system. Unlimited retries.

### 6.4 Campaign issue

- **Scheduled:** nightly function finds `recurrence.type === 'interval'` bindings where the
  last completion is older than `intervalMonths`; issues a campaign.
- **Manual:** HR selects topic + departments + optional outlets, supplies a reason.

Both create `trainingAssignments` in `assigned` and notify affected employees.

### 6.5 Overdue escalation

Nightly. `dueAt < now` and status not `completed`:

- **L1** — notify employee (day 1 overdue, then weekly)
- **L2** — notify department manager (day 7 overdue, then weekly)

No L3/L4 in MVP.

### 6.6 Archive cascade

Archiving a `trainingBinding`:

1. `status: 'archived'`, removed from active views.
2. In-flight assignments (`locked`, `assigned`, `in_progress`) → `cancelled`.
3. `completed` assignments untouched — compliance evidence.
4. Notification to each affected employee **and their manager** stating the topic was
   withdrawn.
5. Audit log entry.

### 6.7 Delete tiering

| Target | Never assigned | Has assignments |
|---|---|---|
| `trainingBinding` | Hard delete | Archive + cascade (§6.6) |
| `trainingTopic` | Hard delete | Archive; blocked while any active binding references it |
| `trainingAssignment` (completed) | — | **Immutable. No delete path exists.** |

Reference check is a count query against `trainingAssignments` before the destructive action
is offered. UI presents different confirmation copy per tier.

---

## 7. Shared Services integration

| Service | Usage |
|---|---|
| **Task Engine** | Each `assigned` assignment generates a task for the employee; each pending verification generates a task for the manager |
| **Notification Engine** | Assignment issued, due soon, overdue L1/L2, completion confirmed, topic withdrawn |
| **Audit Log** | All CRUD on topics/bindings/campaigns; every completion with `verifiedByUid`; every gate override with reason |
| **File Storage** | `contentRef` for digital-mode material; `sourceMaterial` documents |
| **Approval Engine** | **Not used.** Training completion is a verification, not a multi-step approval. Documented deviation from §11 — see §9. |
| **Search** | Topics and bindings indexed by title, department, phase |

---

## 8. Out of scope (v1)

- Event-bus recurrence (menu/POS/product update triggers) — D4
- Position-level binding granularity — source data is department-granular only
- External trainer accounts (8 rows reference `External` / `Vendor` / `Tax Advisor`)
- Certificate generation
- Digital content authoring — all 197 topics import as `trainer` mode
- L3/L4 escalation

---

## 9. Open items — resolve before implementation

| # | Item | Impact | Owner |
|---|---|---|---|
| **O1** | **`firestore.rules` conflict** — two conflicting files; `firebase.json` in `src/` points at `src/firestore.rules` | **Hard blocker.** No module may add rules until resolved. | Phase 0 |
| **O2** | **Does `employee.departmentId` exist**, or is department inferred from the `position` string? | If inferred, a migration is on this module's critical path. Verify in repo. | Angel |
| **O3** | **`managerTier` canonical roles** — which roles hold `training.verify` | Blocks RBAC implementation. Carried over unresolved from 2026-07-28. | Angel |
| **O4** | **Indonesian titles absent** — all 197 `title.id` are null | Violates the bilingual system convention. Needs a translation pass before UI ships. | HR |
| **O5** | **Department taxonomy sign-off** — the 11 names become canonical group-wide | If Finance/Ops expect a different breakdown (e.g. Wholesale splitting), better resolved before seeding. | Angel / GM |
| **O6** | **Approval Engine deviation** — §11 mandates every module integrate the Approval Engine; this module does not | Needs explicit architectural sign-off or a rationale recorded in the ADR. | Angel |
| **O7** | **Verification integrity gap** — under D5 a manager can sign off training they did not witness | Accepted for v1. Mitigated by audit log, not prevented. Revisit when `requiredTrainerRoleId` is populated post-Module A. | Accepted |

---

## 10. Sequencing

1. Resolve **O1** (Phase 0 blocker)
2. Confirm **O2**, **O3**, **O5**
3. Seed `departments`, `trainingTopics`, `trainingBindings` from
   `2026-08-26-training-seed-data.json`
4. Cloud Functions: assignment generation, completion, campaign, overdue scheduler
5. Firestore rules
6. UI: employee queue (mobile-first), manager verification, HR catalogue management
7. **O4** translation pass before UI release
