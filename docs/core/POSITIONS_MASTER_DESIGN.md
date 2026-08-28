# Positions Master — Design Spec

**Module:** HR / Positions
**Date:** 2026-08-24
**Status:** Design approved, pending spec review
**Depends on:** Phase 0 `firestore.rules` conflict resolved
**Blocks:** Appraisal v2, Job Description module, `employee.positionId` migration

---

## 1. Purpose

`positions` is the canonical catalogue of every job at Nourish Group Indonesia — one document per role, independent of whether anyone occupies it. It carries the full Job Description content, the grade/tier, the reporting line, and the appraisal scorer assignment.

It resolves three standing problems:

1. `src/constants/positions.ts` is a hardcoded 5-item starter set (`waiter, barista, cook, cashier, outletLeader`). The organisation has ~37 appraisable positions with live headcount and ~66 in the org ladder.
2. `employee.position` shipped as free-text `string`, not a foreign key — flagged as a silent resolution with downstream payroll and tax-reporting consequences.
3. Job Descriptions live as 40+ Word documents in Google Drive with no system of record.

**Out of scope:** appraisal templates and scoring (Appraisal v2), headcount planning, recruitment requisitions.

---

## 2. Architecture decisions

### 2.1 Positions are org-wide; outlet lives on the employee

`outletId` is `null` on every position document. A Cook is a Cook at Ungasan, Uluwatu, and Berawa. Confirmed by the July 2026 manning guide: Restaurant Manager appears at Uluwatu (1) and Berawa (1) as the same role, and Security Guard spans all three outlets.

`BaseDocument` permits null `outletId` ("if applicable"), but the consequence must be explicit: **the outlet-scoping pattern used elsewhere in Security Rules does not apply to this collection.** Access is permission-based only.

### 2.2 Vacancy is a headcount fact, not a position fact

Positions exist whether or not filled. A vacant Sous Chef Baker still needs a JD, a grade, and an appraisal template. `isActive` marks a role the company no longer uses — not an unfilled seat.

### 2.3 `responsibilityId` stability is load-bearing

Appraisal template criteria reference `keyResponsibilities[].responsibilityId` for provenance. If a JD edit regenerates these IDs, every template's provenance chain breaks silently.

- Editing a responsibility mutates `text` in place; the ID never changes.
- Genuinely new responsibilities get new IDs.
- Removed responsibilities are tombstoned (`isRemoved: true`), never spliced out.

### 2.4 Firestore becomes the source of truth after seeding

The Drive `.docx` library is parsed **once** at seed time. After that, HR edits positions in-app and Word documents are *generated from* positions, not parsed into them. Continuing to edit the Drive files post-launch recreates the dual-source-of-truth problem this module exists to solve.

### 2.5 Explicit appraisal scorer — no inference

`appraisalScorerPositionId` is set explicitly per position by HR. The system never walks the reporting chain to find a scorer at runtime.

Rationale: the manning guide shows the ladder is too sparse to walk. Kitchen Uluwatu has no Head Chef; Wholefoods Uluwatu and Berawa have no Manager or Supervisor; Bar Berawa has no Bar Manager. A scoring instrument that drives PIP and increment decisions must not have an inferred scorer.

Unset scorer → position flags `scorerUnassigned` on the HR dashboard, and Appraisal v2's `createAppraisal` throws `failed-precondition`. Visible failure, not silent.

---

## 3. Tier ladder (seeded constant, not parsed)

JDs embed the tier as free text ("Level VII — Rank & File I / Senior Staff"), which drifts. Canonical source is a typed constant.

| Level | Class |
|---|---|
| 0 | Executive Board — Top Corporate Governance (CEO / Director / Group GM) |
| I | Executive Committee — Division Head / Top Strategic Leadership |
| II | Department Head / Senior Manager |
| III | Assistant Department / Manager |
| IV | Assistant Manager |
| V | Supervisor I / Senior Supervisor |
| VI | Supervisor II / Junior Supervisor |
| VII | Rank & File I / Senior Staff |
| VIII | Rank & File II / Junior Staff |

**Trainee, Daily Worker (DW), and OJT are not tiers.** They are employment classifications outside the ladder, carried on `employmentType`, with `isAppraisable: false`.

---

## 4. Schema

```ts
type PositionLevel = '0' | 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII'
type Bilingual = { id: string; en: string }

interface PositionResponsibility {
  responsibilityId: string        // stable — appraisal criteria reference these
  text: Bilingual
  order: number
  isRemoved: boolean              // tombstone, never spliced
}

interface Position extends BaseDocument {
  positionId: string              // slug, = doc ID, never regenerated
  title: Bilingual
  departmentId: string
  divisionId: string | null       // see Open Inputs §11.3
  level: PositionLevel
  levelLabel: Bilingual           // from the tier constant, not the JD text
  reportsToPositionId: string | null
  supervisesPositionIds: string[] // [] = individual contributor
  supervisesNote: Bilingual | null

  appraisalScorerPositionId: string | null  // §2.5 — explicit, no inference
  isAppraisable: boolean

  employmentType: EmploymentType
  jobOverview: Bilingual
  keyResponsibilities: PositionResponsibility[]
  authority: Bilingual[]
  workingRelationships: { internal: Bilingual[]; external: Bilingual[] }
  qualifications: {
    education: Bilingual
    experience: Bilingual
    certification: Bilingual
    language: Bilingual
    computerSkills: Bilingual
  }
  knowledge: Bilingual[]
  skills: { soft: Bilingual[]; hard: Bilingual[] }
  competencies: Bilingual[]
  performanceExpectations: Bilingual

  positionStatus: 'draft' | 'active'  // 'draft' = no JD content yet (§7)
  revision: number                // JD "Revision / Revisi"
  effectiveDate: Timestamp | null
  sourceFileId: string | null     // Drive provenance
  isActive: boolean
  outletId: null                  // always — §2.1
}
```

**Note on JD content quality.** Analysis of two JDs across tiers (Cook, Level VII; Cost Control, Level V) shows `competencies`, `performanceExpectations`, `knowledge`, and `skills` are tier-templated boilerplate, not role-specific. `keyResponsibilities` and `authority` are the only hand-written per-role sections. They are stored for completeness but **only `keyResponsibilities` is a valid criteria source** for Appraisal v2.

---

## 5. Department Head mapping (seed data)

`appraisalScorerPositionId` for each subordinate position:

| Department | Department Head | Scores |
|---|---|---|
| Culinary | Head Chef | Sous Chef, Chef de Partie, Demi Chef, Cook, Cook Helper, Steward |
| Bakery | Chief Baker | Chef de Partie Baker/Pastry, Cook Baker/Pastry |
| Bar | Bar Manager | Bar Supervisor, Bar Captain, Barista/Bartender |
| Wholefood | Wholefood Manager | Wholefood Supervisor, Wholefood Cashier |
| F&B Service | Restaurant Manager | Restaurant Supervisor, Restaurant Captain, Waiter/Waitress |
| Cashier | Chief Accountant | Cashier Supervisor, Cashier |
| Finance & Accounting | Chief Accountant | AP & GC, AR & IA, Accounting Admin |
| Purchasing & Logistics | Purchasing Manager | Purchasing Supervisor, Receiving & Storekeeper, Driver Leader, Driver |
| Engineering | Restaurant & Maintenance Manager | Engineer (Civil/MEP) |
| Sales & Marketing | Creative & Marketing Manager | Jr. Graphic Designer |
| HR & Security | Group HR Manager | Group HR Admin, Security Supervisor, Security Guard |

Every Department Head sits at Level I–III, so every DH is itself GM-scored under Appraisal v2's `soloScorer` model. The two models nest with no orphans — no DH requires a DH.

**Cost Control** (Level V, Finance, 0 high-season headcount) is not in the mapping. Non-blocking; HR assigns in-app if the seat is filled.

**`Creative & Marketing Manager` has 0 high-season headcount.** The filled Sales & Marketing seat is `Digital Marketing Manager`. Jr. Graphic Designer's appraisals will block on `failed-precondition` until either the DH seat is filled or HR reassigns.

---

## 6. Canonical position names

Three naming systems disagree (org ladder / manning guide / JD filenames). Confirmed canonical forms:

| Canonical | Also appears as |
|---|---|
| Engineer (Civil/MEP) | Engineer (Civil), Engineer (MEP), Engineering |
| AR & IA | Income Audit & AR, Accounts Receivable & Income Audit |
| AP & GC | General Cashier & AP, Accounts Payable & General Cashier |
| Accounting Admin | Admin Accountant |
| Demi Chef | Demi Chef de Partie, Demi Chef Baker |
| Barista/Bartender | Bartender / Barista |
| Chef de Partie Baker / Pastry | CDP Pastry, CDP Bakery |
| Cook Baker / Pastry | Cook/Baker, Commis Pastry, Commis Bakery |
| Chief Accountant | Chief Accounting |

`Chief Accountant` diverges from the spelling used in the JD documents and org ladder (`Chief Accounting`). Confirmed deliberate; the JD library should be revised to match.

Seeding uses an **HR-reviewed mapping table**, not fuzzy matching.

---

## 7. Ingestion path

Drive access is a chat/authoring tool, not production infrastructure. No runtime Drive integration. Same pattern as the shipped `appraisalTemplateSeeds.ts`.

1. **Extract** — script parses the `.docx` library into typed `positionSeeds.ts`, preserving both language columns.
2. **Review** — the seed file goes through code review before touching Firestore. Parsing bilingual Word tables is lossy; this is the gate.
3. **Seed** — `seedPositions` Cloud Function consumes the array. Idempotent on `positionId`. Super Admin only. Safe to re-run.
4. **Maintain** — Firestore is authoritative thereafter (§2.4).

**JD coverage gap:** the ladder has ~66 positions; the Drive library has fewer. Positions with no JD seed with empty `keyResponsibilities[]` and `positionStatus: 'draft'`. Module A becomes the tool that closes its own gap — HR fills them in-app. Draft positions cannot generate appraisal templates.

---

## 8. Cloud Functions

| Function | Purpose |
|---|---|
| `seedPositions` | Idempotent bulk seed from `positionSeeds.ts`. Super Admin. |
| `createPosition` | New position. Routes through Approval Engine. |
| `updatePosition` | Edit. Approved content change increments `revision` and emits `PositionRevised`. |
| `archivePosition` | Soft delete (`isActive: false`). Blocked if employees are assigned. |
| `setAppraisalScorer` | Assign/clear `appraisalScorerPositionId`. HR Manager. |
| `migrateEmployeePositions` | One-time `employee.position` → `positionId`. |

All follow the standard pattern: `onCall({ region: REGION })`, `requireActiveUser`, `requirePermission`, `newDocumentBaseFields`/`updatedFields`, `recordAuditEvent`, `AppError`, `handleError`, `successResponse`. Exported from `functions/src/index.ts`.

### 8.1 Approval chain

Position create/edit reuses the chain already printed on every JD document:

> **Prepared by** HR Manager → **Reviewed by** Department Head → **Approved by** General Manager

Registered as an Approval Engine route (`hr/position`). Server-owned registry, not client-supplied steps. Approval resolution increments `revision` and emits `PositionRevised`.

### 8.2 `PositionRevised` event

Positions must **not** write into `appraisalTemplates` — that is a cross-module write. Instead it emits an event; Appraisal v2 registers a handler, reusing the pattern in `functions/src/hr/appraisal/index.ts` (`registerApprovalResolvedHandler`).

Dependency arrow points one way: **Appraisal → Positions.** Positions has no knowledge that Appraisal exists.

---

## 9. Employee migration

`employee.position: string` → `employee.positionId: string`.

- Match existing free-text values against seeded titles using the §6 mapping table.
- Write `positionId` on match; report unmatched for manual HR resolution.
- **Retain the original string as `legacyPositionText`.** Do not delete. Payroll and tax reporting may reference it, and the `position` vs `positionId` resolution is flagged as unconfirmed. Nothing is dropped until explicitly signed off.
- Migration is idempotent and re-runnable.

---

## 10. RBAC

| Permission | Roles |
|---|---|
| `positions.read` | All authenticated |
| `positions.create` | HR Manager, Super Admin |
| `positions.update` | HR Manager, Super Admin |
| `positions.archive` | HR Manager, Super Admin |
| `positions.setScorer` | HR Manager, Super Admin |
| `positions.seed` | Super Admin |

Client-side checks are UX only. Every Cloud Function calls `requirePermission`.

**Security Rules:** `positions` is org-wide — no `outletId` scoping clause. Read for any authenticated active user; all writes denied to clients (Cloud Functions only).

---

## 11. Open inputs

1. **Seven scorer assignments** are seeded from §5. Cost Control and any position added later default to `null` → `scorerUnassigned`.
2. **Creative & Marketing Manager vacancy** — DH seat has no occupant; Jr. Graphic Designer appraisals blocked until resolved.
3. **`divisionId`** — F009 and the Disciplinary Action form treat Divisi and Departemen as separate fields; the JDs carry only Departemen. Stubbed nullable. Working hypothesis, unconfirmed: *Department* is the functional reporting line (who scores you) and *Division* is the operational grouping (where you work) — consistent with Cashier reporting to Chief Accountant while working across three outlets.
4. **`legacyPositionText` retention** — pending payroll/tax sign-off before removal.
5. **JD coverage gap** — positions without a Drive JD seed as `draft`.

---

## 12. Acceptance criteria

- [ ] `positions` collection exists; `POSITIONS` hardcoded constant is removed and all references migrated.
- [ ] Tier ladder seeded as a typed constant with bilingual labels.
- [ ] All ~66 ladder positions seeded; those with JDs carry full content, those without are `draft`.
- [ ] Every position carries `outletId: null`.
- [ ] `responsibilityId` values are stable across an edit-and-reapprove cycle (regression test).
- [ ] Removing a responsibility tombstones it rather than deleting.
- [ ] §5 DH mapping is seeded; unmapped positions flag `scorerUnassigned`.
- [ ] Trainee, DW, and OJT positions carry `isAppraisable: false`; Level 0 likewise.
- [ ] Position create/edit routes through the HR Manager → DH → GM Approval Engine chain.
- [ ] Approved content edit increments `revision` and emits `PositionRevised`.
- [ ] Positions never writes to any Appraisal collection.
- [ ] `migrateEmployeePositions` populates `positionId`, retains `legacyPositionText`, reports unmatched.
- [ ] Compensation and other sensitive employee fields are untouched by this module.
- [ ] Every mutation writes an audit event.
