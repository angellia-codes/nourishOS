# Appraisal v2 — Design Spec

**Module:** HR / Appraisal
**Date:** 2026-08-24
**Status:** Design approved, pending spec review
**Depends on:** Positions Master (fully shipped, including employee migration); Phase 0 `firestore.rules` conflict resolved
**Supersedes:** the shipped 1–5 single-reviewer Appraisal module; `HR_OPERATIONS.md` §6.4 Option A/B; `HR_OPERATIONS.md` §9.6 weightedComponents

---

## 1. Purpose

Digitise form **F-HR-APR-001** as a per-position performance appraisal driving increment, PIP, and formal-action decisions across ~154 appraisable employees in ~37 positions.

**Resolving three competing scoring models.** Before this spec, three existed:

| Source | Scale | Scorers | Criteria |
|---|---|---|---|
| Shipped code | 1–5 | One (`reviewerId`) | Per-position, per-review-type |
| `HR_OPERATIONS.md` §9.6 | 1–5 | One | 5 fixed weighted components |
| F-HR-APR-001 v1.0 | 1–10 | Two (60/40) | 15 universal categories |

**Decision:** the spreadsheet's *mechanics* (1–10, dual scorer, /100, five bands) with **per-position criteria** derived from each JD's Key Responsibilities. The 15 universal categories are not used. This closes §6.4 — neither Option A nor Option B; a third path superseding both.

---

## 2. Architecture decisions

### 2.1 Criteria come from Key Responsibilities only

Cross-tier JD analysis (Cook, Level VII; Cost Control, Level V) established that `competencies`, `performanceExpectations`, `knowledge`, and `skills` are tier-templated boilerplate — "Customer Focus" appears on a cost accountant, "Staff scheduling" on a hard-skills list for a role that schedules no one. Deriving criteria from those sections would make every position's criteria near-identical, collapsing per-position scoring back into a universal form.

`keyResponsibilities` and `authority` are the only hand-written per-role sections. **Only `keyResponsibilities` is a valid criteria source.**

### 2.2 Review type is metadata, not a criteria axis

One template per position. `reviewType` (`probation` | `quarterly` | `annual`) changes only `periodLabel` and the cycle trigger.

Rationale: 37 positions × 3 review types = 111 templates, none hand-authorable. F-HR-APR-001 treats review type as a header field, not a different instrument. **This supersedes the shipped `appraisal.types.ts` comment asserting "no inheritance between review types."**

`midYear` is deliberately not implemented, though F-HR-APR-001 offers it. The form should be revised to v1.1 to match.

### 2.3 Two scorer models, derived from position level

| Model | Levels | Scoring | Approval |
|---|---|---|---|
| `dualScorer` | IV – VIII | Department Head 60% + HR Manager 40% | GM approves |
| `soloScorer` | I – III | General Manager 100% | **None** |
| — | 0 | not appraised | — |

Trainee, DW, OJT, and Level 0 all carry `isAppraisable: false`.

Primary scorer resolves from `position.appraisalScorerPositionId` (explicit, never inferred — Positions Master §2.5).

**Recorded as deliberate, with the trade-off stated plainly:** Levels I–III carry the largest compensation consequences and have both the least scoring input (no HR 40% calibration) and no approval oversight. `approvalModel: 'none'` and `approvalRequestId: null` are stored so nothing in the audit trail implies a GM signed off on a review they authored. For `soloScorer`, `approved` means "scoring closed," not "approved by a second party."

### 2.4 HR cannot see DH scores before submitting their own

`submitSecondaryScores` reads the DH scores server-side; the HR scoring view does not render them. Without this the 40% merely anchors on the 60% and the dual-scorer design buys nothing.

### 2.5 The leadership-criterion problem disappears

F-HR-APR-001's category 15 was conditional ("auto-included only when scores are entered"), making the denominator vary mid-form. Under per-position templates, leadership criteria are generated or not at *template* time based on `position.supervisesPositionIds`. Every appraisal has a fixed denominator.

### 2.6 Recommendations are gated two ways

- `ratingBand` is computed and stored for **every** appraisal — needed for calibration, reporting, and historical queries across versioned scoring models.
- `hrRecommendation` is populated **only when `finalScore < 60`**. At 60+ the field is `null`.
- It lives in a confidential subcollection, readable by HR Manager / GM / Director / Super Admin — **never by the subject.**

**Two consequences stated explicitly:**

1. NourishOS no longer outputs increment or promotion eligibility. F-HR-APR-001 assigns recommendations to all five bands, including "Eligible for Salary Increment" (75–89) and "Eligible for Promotion + Salary Increment" (90–100). Those are suppressed. The system is a remediation instrument, not a reward instrument. **The printed form must be revised to match** — the form and the system must not disagree about what a score entitles someone to.
2. Under the on-device acknowledgement model (§2.7), Firestore Rules cannot enforce the subject-visibility boundary: the logged-in device operator legitimately has read access. The boundary is enforced by a **distinct acknowledgement-mode view** that omits the recommendation. The subcollection protects data at rest; **the UI is the load-bearing control here.**

**Self-read exclusion:** a user can never read the confidential recommendation on their own appraisal, regardless of permission. This matters because the HR Manager holds `appraisals.readRecommendation` and is herself a subject (Level I), as is the GM. Enforced in both the Security Rule and the Cloud Function.

### 2.7 Acknowledgement

**Levels IV–VIII — supervised, on-device.** No employee account required. During the review conversation the DH or HR Manager opens the appraisal on their device; the employee reads it and signs on-screen.

Captured as: `signatureFileId` (canvas → File Storage), `acknowledgedAt`, `deviceOperatorUid`, `witnessedByUid`.

**This is weaker evidence than an authenticated action and the spec says so.** The audit log records *who held the device*, not a verified identity. The signature does not prove identity.

**Levels I–III — authenticated.** Senior staff have NourishOS accounts; acknowledgement is a real authenticated action.

### 2.8 Historical appraisals are frozen, never rescaled

Existing 1–5 appraisals and the 5 seeded templates get `scoringModelVersion: 1` and stay readable but immutable. **No rescaling to 1–10.** A 3/5 is not a 6/10; converting corrupts the record. New appraisals are `scoringModelVersion: 2`.

---

## 3. Schema

`Bilingual` (`{ id: string; en: string }`) is defined in the Positions Master spec §4 and reused here.

### 3.1 `appraisalTemplates`

```ts
interface AppraisalCriterion {
  criterionId: string
  label: Bilingual
  description: Bilingual              // = the form's "Assessment Criteria" column
  sourceResponsibilityIds: string[]   // ≥1, validated server-side
  isLeadershipCriterion: boolean
  order: number
}

interface AppraisalTemplate extends BaseDocument {
  positionId: string
  sourcePositionRevision: number
  criteria: AppraisalCriterion[]      // 1–8, hard cap
  scoringModelVersion: 2
  generationMethod: 'ai' | 'manual'
  generatedAt: Timestamp | null
  templateStatus: 'draft' | 'approved' | 'stale' | 'archived'
  approvedByUid: string | null
  approvedAt: Timestamp | null
  version: number
  outletId: null
}
```

One template per position. No `reviewType` field (§2.2).

### 3.2 `appraisals`

```ts
type ScorerModel = 'dualScorer' | 'soloScorer'
type RatingBand = 'outstanding' | 'excellent' | 'good' | 'needsImprovement' | 'unsatisfactory'

interface CriterionScore {
  criterionId: string
  primaryScore: number | null      // 1–10
  secondaryScore: number | null    // 1–10; null for soloScorer
  weightedScore: number | null     // server-computed, never client-set
  primaryNote: string | null
  secondaryNote: string | null
}

interface Acknowledgement {
  acknowledgedAt: Timestamp
  signatureFileId: string | null
  deviceOperatorUid: string | null
  witnessedByUid: string | null
  method: 'onDeviceSignature' | 'authenticated'
}

interface Appraisal extends BaseDocument {
  employeeId: string
  positionId: string
  templateId: string
  templateVersion: number
  scoringModelVersion: 2

  reviewType: 'probation' | 'quarterly' | 'annual'
  periodLabel: string
  periodStart: Timestamp
  periodEnd: Timestamp

  scorerModel: ScorerModel
  approvalModel: 'gm' | 'none'
  primaryScorerUid: string
  primaryScorerRole: 'departmentHead' | 'generalManager'
  secondaryScorerUid: string | null
  secondaryScorerRole: 'hrManager' | null

  criterionScores: CriterionScore[]
  primarySubmittedAt: Timestamp | null
  primarySubmittedBy: string | null
  secondarySubmittedAt: Timestamp | null
  secondarySubmittedBy: string | null

  primaryAverage: number | null    // /10
  secondaryAverage: number | null  // /10
  finalScore: number | null        // /100, stored unrounded
  ratingBand: RatingBand | null

  overallComment: string | null
  employeeSelfComment: string | null
  acknowledgement: Acknowledgement | null

  approvalRequestId: string | null
  consequenceTaskId: string | null
  aiInsights: AppraisalAIInsights | null
  status: ApprovalStatus
  outletId: string                 // inherited from employee — scoping applies here
}
```

`hrRecommendation` is **not** on this document. It lives at `appraisals/{id}/confidential/recommendation`.

---

## 4. Score computation

Server-side only, inside a transaction, in `submitSecondaryScores` (dualScorer) or `submitPrimaryScores` (soloScorer).

```
dualScorer:
  weighted[i] = (primary[i] × 0.6) + (secondary[i] × 0.4)
soloScorer:
  weighted[i] = primary[i]

primaryAverage   = mean(primary)     → display 1dp
secondaryAverage = mean(secondary)   → display 1dp
finalScore       = mean(weighted) × 10   → stored unrounded
```

### 4.1 Bands

Evaluated on the **unrounded** `finalScore` using `>=`:

| Condition | Band | Recommendation |
|---|---|---|
| `>= 90` | Outstanding | none |
| `>= 75` | Excellent | none |
| `>= 60` | Good | none |
| `>= 45` | Needs Improvement | populated, confidential |
| else | Unsatisfactory | populated, confidential |

F-HR-APR-001 states bands as integer ranges (75–89), leaving 89.1–89.9 undefined. This closes the gap: **89.6 is Excellent, not Outstanding.** This is a substantive rule, not a rounding detail — it decides increment eligibility.

---

## 5. Workflow

No new statuses. Maps onto the global standard.

| Status | Meaning | Exit |
|---|---|---|
| `draft` | Created by scheduler or HR. Primary scoring. | `submitPrimaryScores` |
| `submitted` | Primary done, scores locked. dualScorer only. | `submitSecondaryScores` |
| `pending` | Scored, final computed, band set. dualScorer only — Approval Engine engaged, GM sole approver. | GM decision |
| `approved` | Scoring closed. Consequence task fired if `<60`. Awaiting acknowledgement. | `acknowledgeAppraisal` |
| `rejected` | GM rejected → returns to `draft`, both score sets cleared, reason in approval history. | re-score |
| `completed` | Acknowledged. Immutable. | — |

`soloScorer` skips `submitted` and `pending`, moving `draft` → `approved` directly.

**No approval means no `rejected` path for senior appraisals**, so `reopenAppraisal` exists to correct a mis-scored one: Super Admin or Director only, pre-acknowledgement, mandatory reason, audited. Without it a typo in a GM's score is permanent.

---

## 6. Template generation

### 6.1 `generateAppraisalTemplate`

HR Manager only. Reads one position; writes a `draft` template. **Never writes `approved`.** Reuses the `ANTHROPIC_API_KEY` secret and structured-output pattern already shipped in `generateAppraisalInsights`.

**Input:** position title, level, level label, department, bilingual `keyResponsibilities[]` with IDs, `authority[]`, and whether the role supervises.
**Never input:** any employee data. The instrument is generated from the job, never from a person.

**Output contract, enforced by JSON schema:**

- 6–8 criteria, hard cap 8. Uniform denominator; mobile form stays under 16 inputs across both scorers.
- `label` and `description` in both languages. Indonesian is **generated, not translated** — it is the language scoring actually happens in on the floor.
- `description` written as observable behaviour, not task restatement. *"Prepare monthly COGS reports"* → *"Accuracy and timeliness of monthly COGS reporting."*
- `sourceResponsibilityIds[]` — **at least one, validated server-side.** A criterion the model cannot trace to a responsibility is rejected, not stored. This is what stops generation drifting into invented criteria.
- `isLeadershipCriterion` on at most one, and only when `supervisesPositionIds.length > 0`.

Rejects (`failed-precondition`) on non-appraisable positions and on `draft` positions with empty `keyResponsibilities[]`.

### 6.2 The HR approval gate

HR reviews in a side-by-side view: generated criterion left, the cited source responsibility text right. HR may edit, delete, reorder, or author their own (`generationMethod: 'manual'`), then approve.

Three properties enforced in Cloud Functions, not the UI:

1. `createAppraisal` rejects any template not `approved`. Cannot be bypassed by deep-link or a forgetful client.
2. Regeneration on an approved template creates version *n+1* as a new `draft`; the approved version stays live until the new one is approved. No silent swap of a live scoring instrument.
3. Approval audits as `AppraisalTemplateApproved` **with the full criteria snapshot**, so a disputed appraisal traces to exactly which instrument was approved, by whom, when.

### 6.3 Staleness

`PositionRevised` → handler marks affected templates `stale: true`, notifies HR Manager.

**Stale is a warning, not a block.** In-flight appraisals continue on their pinned `templateVersion`; new appraisals can be created off a stale template with a UI warning. Blocking would let a JD typo correction freeze a department's appraisals mid-cycle. HR decides whether a revision warrants regeneration.

### 6.4 Rollout

The ~37 appraisable positions (Level 0, Trainee, DW, and OJT are already excluded from that figure) each need one template. **~37 templates needing HR review**, landing entirely on one person. Budget 10–15 minutes each for genuine review.

| Wave | Scope | Coverage |
|---|---|---|
| 1 | Barista/Bartender (17), Waiter/Waitress (16), Cook Helper (15), Security Guard (12), Cashier (12), Cook Baker/Pastry (11), Wholefood Cashier (9), Steward (8), Cook (7) | **~107 of 154 (70%)** |
| 2 | Supervisory tiers IV–VI, where leadership criteria first appear | |
| 3 | Back-office and single-occupant roles | |

Generation is batchable per department; **review is not.**

**Named failure mode:** if HR rubber-stamps ~37 templates to clear a queue, the gate is theatre and an AI-authored instrument is driving PIP and warning decisions. Wave 1 exists so the first nine get real scrutiny and set the quality bar. If Wave 1 review shows generated criteria are consistently sound, later waves can move faster with a clear conscience. If not, that is a finding worth having early.

---

## 7. Cloud Functions

| Function | Purpose |
|---|---|
| `generateAppraisalTemplate` | AI draft from Key Responsibilities. HR Manager. |
| `approveAppraisalTemplate` | Mandatory gate. HR Manager. Audits full snapshot. |
| `createAppraisal` | Manual creation. Rejects unapproved template / unassigned scorer / non-appraisable position. |
| `submitPrimaryScores` | DH (dual) or GM (solo). Locks primary scores. Solo: computes and closes. |
| `submitSecondaryScores` | HR 40%. Computes final, sets band, engages Approval Engine. |
| `acknowledgeAppraisal` | Signature capture or authenticated acknowledgement. → `completed`. |
| `reopenAppraisal` | Pre-acknowledgement correction. Super Admin / Director. Reason mandatory. |
| `scheduleAppraisalCycles` | Daily 06:00 scheduled. |

Plus an extension to the existing `registerApprovalResolvedHandler('appraisal', …)` to fire the consequence task and populate the confidential recommendation on resolution.

---

## 8. Scheduled cycles

One function, 06:00 daily, matching the Contract Tracker pattern.

- **Probation** — day 75 of probation (15 days before the decision), from `employee.probationEndDate`
- **Quarterly** — quarter-end, all active appraisable employees past probation
- **Annual** — join anniversary

Creates `draft` appraisals against the position's `approved` template.

**Skips and logs** where: template is `draft`/`archived`/missing, `appraisalScorerPositionId` is null, scorer seat is vacant, position is `isAppraisable: false`, employee is inactive, or an open appraisal exists for that period.

A `stale` template **does not skip** — per §6.3, stale is a warning, not a block. The cycle proceeds and the digest notes it, so a JD typo correction never freezes a department's appraisal cycle.

Skips report to HR as a **single digest**, not 40 notifications.

Duplicate guard: composite key `employeeId + reviewType + periodLabel`.

---

## 9. Consequences

On `approved`, if `finalScore < 60`:

1. Populate `appraisals/{id}/confidential/recommendation`.
2. Task Engine task → HR Manager (`dualScorer`) or **Director** (`soloScorer`, since the HR Manager may be the subject).
3. Store `consequenceTaskId` on the appraisal.

**Task wording is fixed:** *"Review and determine whether formal action is warranted."* **Never** *"Issue SP1."*

Rationale — Indonesian labour law: a *surat peringatan* requires documented cause. Auto-generating a formal-warning directive from a composite algorithmic score creates real exposure. The task prompts human judgement; it does not substitute for it.

Disciplinary and PIP modules do not yet exist. `ratingBand`, `hrRecommendation`, and `consequenceTaskId` are persisted as first-class fields so the later upgrade is task-to-record, not a schema change — and so "everyone who scored below 60 in FY2026" is a query, not a client-side recomputation over appraisals whose scoring model has versioned.

---

## 10. RBAC

| Permission | Roles |
|---|---|
| `appraisals.read` | Subject's DH, HR Manager, GM, Director, Super Admin |
| `appraisals.scorePrimary` | Department Head (own dept), General Manager |
| `appraisals.scoreSecondary` | HR Manager |
| `appraisals.readRecommendation` | HR Manager, GM, Director, Super Admin — **minus self** (§2.6) |
| `appraisals.acknowledge` | Department Head, HR Manager (as device operator) |
| `appraisals.reopen` | Super Admin, Director |
| `appraisalTemplates.read` | All authenticated |
| `appraisalTemplates.generate` | HR Manager, Super Admin |
| `appraisalTemplates.approve` | HR Manager, Super Admin |

Outlet scoping applies to `appraisals` (via `employee.outletId`). It does **not** apply to `appraisalTemplates` — org-wide, `outletId: null`.

---

## 11. Notifications

Via Notification Engine. No WhatsApp — consistent with the manual-share pattern used elsewhere.

| Event | Recipient |
|---|---|
| Cycle created | HR Manager (single digest) |
| Awaiting primary score | Department Head / GM |
| Primary submitted | HR Manager |
| Awaiting GM approval | General Manager |
| Approval resolved | Primary scorer |
| Awaiting acknowledgement | Department Head |
| Scoring stage unstarted 14 days | Escalate to GM |
| Template stale | HR Manager |
| Template awaiting approval | HR Manager |

---

## 12. Dashboard hooks

- **HR Manager** — templates awaiting approval; positions with `scorerUnassigned`; appraisals awaiting HR score; cycle completion %; band distribution; `<60` count
- **Department Head** — awaiting my score; overdue; awaiting acknowledgement
- **GM / Director** — awaiting approval; band distribution by department and outlet; YoY trend

Band distribution is the calibration tool — it surfaces the DH who scores everyone 9.

---

## 13. Migration

| Item | Treatment |
|---|---|
| 5 seeded templates (`appraisalTemplateSeeds.ts`) | `scoringModelVersion: 1`, `templateStatus: 'archived'`. Readable, cannot create appraisals. |
| Existing 1–5 appraisals | `scoringModelVersion: 1`, immutable. **No rescaling** (§2.8). |
| `AppraisalDemoPage` | Update to v2 shape or remove. |
| `appraisal.types.ts` | Rewritten; the "no inheritance between review types" comment is removed as superseded. |

UI must render v1 and v2 appraisals distinguishably. A historical 3/5 must never display as 60/100.

---

## 14. Open inputs

1. **Seven scorer assignments** are seeded per Positions Master §5. Cost Control unassigned.
2. **Creative & Marketing Manager has no occupant** — Jr. Graphic Designer appraisals will block on `failed-precondition` until the seat is filled or HR reassigns.
3. **F-HR-APR-001 needs revision to v1.1** on two counts: `midYear` is not implemented, and recommendations for bands ≥60 are suppressed. The printed form currently promises increment eligibility the system will not produce.

---

## 15. Acceptance criteria

- [ ] One template per position; no `reviewType` on templates.
- [ ] Generation caps at 8 criteria and rejects any criterion with an empty `sourceResponsibilityIds[]`.
- [ ] Generation rejects non-appraisable and `draft` positions.
- [ ] `createAppraisal` rejects unapproved templates, unassigned scorers, and vacant scorer seats.
- [ ] Regeneration on an approved template creates a new draft; the live version is unchanged.
- [ ] Template approval audits the full criteria snapshot.
- [ ] `dualScorer` and `soloScorer` resolve correctly from `position.level` at creation.
- [ ] HR scoring view never renders DH scores before HR submission (§2.4).
- [ ] All score computation is server-side inside a transaction; no client-set `weightedScore` or `finalScore` is accepted.
- [ ] Band boundaries evaluate on the unrounded score: 89.6 → Excellent (regression test).
- [ ] `ratingBand` is stored for every scored appraisal; `hrRecommendation` only below 60.
- [ ] The subject cannot read their own confidential recommendation, in both the Rule and the Function.
- [ ] The acknowledgement-mode view omits the recommendation.
- [ ] Acknowledgement stores `deviceOperatorUid`; audit reflects device operator, not verified subject identity.
- [ ] `<60` fires exactly one Task Engine task, routed to Director for `soloScorer`.
- [ ] Consequence task text never directs issuing a *surat peringatan*.
- [ ] `soloScorer` appraisals store `approvalModel: 'none'` and `approvalRequestId: null`.
- [ ] `reopenAppraisal` works pre-acknowledgement only, requires a reason, and audits.
- [ ] Scheduled cycles skip-and-digest rather than failing or spamming.
- [ ] Duplicate guard prevents two open appraisals for the same `employeeId + reviewType + periodLabel`.
- [ ] v1 appraisals remain readable, are not rescaled, and render distinguishably from v2.
- [ ] Appraisal never writes to `positions`.
- [ ] Every state transition writes an audit event.
