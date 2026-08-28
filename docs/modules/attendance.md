# NourishOS — Attendance Module

Version: 1.0
Module: People → Attendance
Repo path: `docs/modules/attendance.md`
Status: Design locked, pending implementation plan
Date: 2026-08-28

---

## 1. Overview

The Attendance module is a **monthly aggregate ledger**. It ingests one row per employee per month via CSV, validates it hard, locks it behind an approval chain, and exposes a filterable People Report covering total attendance, leave utilisation, and punctuality.

It is deliberately **not** a time-and-attendance system. It records no clock-in times, no daily grid, no shift assignment, and no leave request workflow.

### 1.1 Why this grain

Attendance data at Nourish Group is currently produced in Google Sheets, downstream of a weekly roster export from an external scheduling application. That export carries no punch times — its only punctuality signal is a manually-set `Status` flag. The monthly recap tab is the artifact HR actually works from and the one Finance reads.

This module digitises **that artifact**, at that grain. Building a daily or real-time attendance system would require a data source that does not currently exist.

### 1.2 Explicitly out of scope

| Excluded | Why | Where it goes |
|---|---|---|
| Daily attendance grid (per-employee × per-day) | Source data is reconciled monthly; per-day cells conflate "which outlet worked" with "was late" | Future, if a real time clock is adopted |
| Clock-in / clock-out, biometric, GPS, selfie | No punch times exist in any current source | Future module |
| Leave **request** workflow (submit → approve → deduct) | Separate subsystem with its own approval chain and statutory rules | **Leave Management module** — separate spec |
| Leave **balance** ledger (Opening / GET / TAKEN / BALANCE) | Existing sheet tracks only PH/DP/AL, is 20 months stale, contains `#REF!` errors and negative balances | **Leave Management module** |
| Service charge allocation by outlet-worked | Requires per-day outlet attribution, only available in the daily grid | Future, gated on daily grid |
| Overtime (OT) hours | Not reliably captured in source | Future |
| Meal allowance count | Currently derived as `= WD`; no independent value | Derive in Payroll if needed |
| Employee self-service view of own attendance | Mirrors the reserved-but-ungranted `payroll.readOwn` pattern | Future milestone |

---

## 2. Code Taxonomy

Nine codes. Every code belongs to exactly one class, and class determines its treatment in every metric.

| Code | Label (EN) | Label (ID) | Class | Paid | In attendance denominator |
|---|---|---|---|---|---|
| `WD` | Working Days | Hari Kerja | `worked` | ✅ | ✅ |
| `DO` | Day Off | Libur | `rest` | ✅ | ❌ |
| `PH` | Public Holiday | Libur Nasional | `rest` | ✅ | ❌ |
| `DP` | Day Payment | Day Payment | `leaveEntitled` | ✅ | ❌ |
| `AL` | Annual Leave | Cuti Tahunan | `leaveEntitled` | ✅ | ❌ |
| `MC` | Medical Certificate | Cuti Sakit | `leaveEntitled` | ✅ | ❌ |
| `EO` | Extra Off | Extra Off | `leaveEntitled` | ✅ | ❌ |
| `SL` | Special Leave | Cuti Khusus | `leaveEntitled` | ✅ | ❌ |
| `UL` | Unpaid Leave | Cuti Tanpa Gaji | `leaveUnpaid` | ❌ | ✅ |

**Decision D2 (locked):** `MC` and `EO` are entitled leave, not absenteeism. Absenteeism is therefore `UL` only.

### 2.1 Class definitions

```ts
export type AttendanceCodeClass =
  | 'worked'         // employee was at work
  | 'rest'           // scheduled non-working day, not consumed from any entitlement
  | 'leaveEntitled'  // paid absence drawn against an entitlement
  | 'leaveUnpaid'    // unpaid absence — the only absenteeism input
```

Statutory Indonesian leave names (`Cuti Tahunan`, `Cuti Sakit`, `Cuti Tanpa Gaji`, `Libur Nasional`) retain their official Indonesian forms in the ID locale. Non-statutory labels (`Day Payment`, `Extra Off`) are used as-is in both locales — they are internal Nourish terms with no Indonesian equivalent in use.

### 2.2 Legacy code aliases

**Decision D4 (locked).** These codes appear in historical sheet data and are normalised at import time. The raw column names encountered are preserved in `rawCodesSeen` for audit; the normalised values drive all counts.

Because the CSV is **column-based** (§4.1), aliases are resolved at the **column-header level**: an incoming column named `NPL` is folded into `UL` by adding its values to the `UL` column. If both the alias column and its target column are present, the values are summed.

| Alias column in source | Folded into | Notes |
|---|---|---|
| `NPL` | `UL` | "No Pay Leave" |
| `DPH` | `DP` | Day Payment — holiday variant |
| `DPN` | `DP` | Day Payment — normal variant |
| `OFF` | `DO` | Sheet literal for Day Off |

Any column not in the nine-code enum, not in this alias table, and not one of the four identity columns is a **hard import failure** (rule V6). This is the mechanism that stops undefined codes entering the system silently, which is how `DPH`/`DPN`/`NPL` accumulated in the spreadsheet in the first place.

Note that V1 (exact header match) and V6 are in tension by design: V1 is the strict path for the canonical header, and a file whose header differs *only* by the presence of alias columns falls through to V6 for folding rather than being rejected outright. Any other header deviation fails V1.

---

## 3. Data Model

### 3.1 `attendancePeriods/{periodId}`

One document per calendar month, **company-wide** (Decision D3).

```ts
interface AttendancePeriod {
  id: string                      // "YYYY-MM", e.g. "2026-07"
  year: number
  month: number                   // 1–12
  daysInMonth: number             // reconciliation target for V5
  status: AttendancePeriodStatus
  recordCount: number
  importedAt?: Timestamp
  importedBy?: string             // uid
  importFileName?: string
  importFileId?: string           // File Storage Service reference to the source CSV
  supersedesPeriodId?: string     // set on correction re-imports
  supersededByPeriodId?: string   // set on the original when superseded
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
}

type AttendancePeriodStatus =
  | 'draft' | 'submitted' | 'pendingApproval'
  | 'approved' | 'rejected' | 'closed'
```

`outletId` is intentionally absent — periods are company-wide. Per-outlet scoping happens at query time via the record's `outletIdSnapshot`.

### 3.2 `attendanceRecords/{recordId}`

One document per employee per period. Immutable once the parent period is `approved`.

```ts
interface AttendanceRecord {
  id: string
  periodId: string                // → attendancePeriods
  employeeId: string              // → employees, resolved at import
  employeeNumber: string          // "N0001" — the CSV match key

  // --- Snapshot block ---------------------------------------------------
  // Denormalised deliberately. A July report must not change because an
  // employee transferred outlet or changed department in September.
  employeeNameSnapshot: string
  departmentSnapshot: string
  outletIdSnapshot: OutletId
  employmentStatusSnapshot: EmploymentStatus
  // ---------------------------------------------------------------------

  days: AttendanceDayCounts
  rawCodesSeen: string[]          // pre-normalisation codes, audit only
  lateCount: number               // punctuality — incident count, NOT minutes

  totalDays: number               // Σ days.* — must equal period.daysInMonth
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
}

interface AttendanceDayCounts {
  WD: number; PH: number; DP: number; AL: number; MC: number
  EO: number; SL: number; DO: number; UL: number
}
```

### 3.3 What is not stored

There is **no `attendanceSummaries` collection.** Department and outlet rollups are computed on read.

Justification: 161 employees × 12 months ≈ 1,900 documents per year. A single period query returns ~161 documents — well within one Firestore query and trivial to aggregate client-side in the service layer. A pre-aggregation Cloud Function would add a consistency surface for no measurable gain at this scale.

**Revisit threshold:** if record count exceeds ~10,000 (roughly 5 years of data at current headcount, or headcount above 400), introduce a `attendanceSummaries` collection written by a Cloud Function on period approval.

---

## 4. CSV Import Contract

### 4.1 File shape

One row per employee per month. Header row is fixed and validated byte-for-byte after trimming.

```csv
employee_number,employee_name,department,outlet,WD,PH,DP,AL,MC,EO,SL,DO,UL,late_count
N0001,Yulius Umbu Japa,Floor,Nourish Uluwatu,26,0,0,0,0,0,0,5,0,0
N0003,Aristarkus Rawang,Bar,Nourish Ungasan,27,0,0,0,0,0,0,4,0,1
N0015,Kadek Riska Dewi,Cashier,The Bakery Uluwatu,25,0,0,0,0,1,0,5,0,0
```

### 4.2 Match key

`employee_number` is the sole match key. `employee_name` is imported as a display snapshot and cross-checked, never matched on.

This is not a preference. The current roster contains `I Made Suriana`, `I Made Sukarma`, and `I Made Suardana Yasa`; name-based matching would mismatch silently and corrupt an approved, immutable record.

### 4.3 Period selection

The target period is chosen in the UI before upload, not parsed from the file. The file carries no date column, and inferring a month from a filename is fragile.

---

## 5. Import Validation

Import is a three-phase flow: **validate → preview → commit**. Nothing is written to Firestore until the entire file passes every hard rule.

### 5.1 Hard failures (block commit)

| # | Rule | Scope |
|---|---|---|
| V1 | Header matches §4.1 exactly (order and spelling) | File |
| V2 | Every `employee_number` resolves to an employee record | Row |
| V3 | No duplicate `employee_number` within the file | File |
| V4 | All day values and `late_count` are non-negative integers | Row |
| V5 | `Σ days = period.daysInMonth` | Row |
| V6 | No unrecognised code column; no unrecognised code value after alias normalisation | File |
| V7 | `late_count ≤ WD` | Row |
| V8 | Target period is not already `approved` or `closed` (unless this is a declared correction, §6.2) | File |
| V9 | File contains at least one data row | File |

**V5 note:** this is the sheet's existing `TRUE/FALSE` checksum column, promoted from an advisory formula to an enforced gate. It is the single most effective integrity rule available at this grain.

### 5.2 Warnings (surfaced in preview, do not block)

| # | Rule | Behaviour |
|---|---|---|
| W1 | `employee_name` differs from the employee record | Warn; snapshot uses the CSV value |
| W2 | `department` or `outlet` differs from the employee record | Warn; snapshot uses the CSV value |
| W3 | Employee is `active` during the period but absent from the file | Warn; list all missing employees |
| W4 | `employee_number` resolves to an inactive/archived employee | Warn; import proceeds (covers mid-month leavers) |
| W5 | `lateCount > 0` for an employee with `WD = 0` | Warn |
| W6 | A legacy alias was normalised (§2.2) | Warn; list every substitution made |

W2 exists because the source sheet mixes department and outlet into single fields (e.g. `Wholefood/Retail Ungasan`). The snapshot wins so historical reports stay stable, but HR sees every divergence.

### 5.3 Preview screen

Before commit, HR sees:

- Row counts: total, valid, failed, warned
- Every hard failure with row number, column, and the offending value
- Every warning, grouped by rule
- Aggregate preview: headcount, total WD, total leave days by code, total late incidents
- A diff against the previous period's aggregates, so an order-of-magnitude error is visible before it is committed

Commit is disabled while any hard failure exists.

### 5.4 Commit

A single callable Cloud Function (`importAttendancePeriod`) writes all records plus the period document inside one `db.runTransaction`. Server-side only; the client never writes to `attendanceRecords`.

For files exceeding Firestore's 500-operation transaction limit (i.e. >~490 employees), the function chunks into sequential batched writes within an idempotency guard keyed on `periodId` + file hash. At current headcount (161) a single transaction suffices.

On success the period lands in `submitted` and the source CSV is archived to the File Storage Service, referenced by `importFileId`.

---

## 6. Lifecycle & Approval

### 6.1 Standard flow

Follows the global workflow standard. Uses the **Approval Engine** — no module-specific approval logic.

```
draft → submitted → pendingApproval → approved → closed
                          ↓
                       rejected → (re-import)
```

Approval route registry entry, keyed `people/attendancePeriod`:

| Step | Role | Action |
|---|---|---|
| 1 | HR Manager | Review aggregates and warnings, approve or reject with reason |
| 2 | GM | Final approval |

Steps are server-owned in the route registry, never client-supplied — per the corrected `submitApproval` pattern.

Every transition:
- writes an immutable **Audit Log** entry
- fires a **Notification Engine** event to the next approver
- is executed inside `db.runTransaction`

### 6.2 Corrections — supersede, never edit

Records are immutable once the period is `approved`. A correction is a new import:

1. HR imports a corrected file against the same month, passing `isCorrection: true` as a parameter to `importAttendancePeriod` (a request flag, not a stored field — the resulting linkage is recorded in `supersedesPeriodId` / `supersededByPeriodId`)
2. A new `attendancePeriod` is created with `supersedesPeriodId` pointing at the original
3. The original is set to `closed` with `supersededByPeriodId` set
4. Both periods and both record sets are retained permanently
5. Reports read the **latest non-superseded** period for any given month

This mirrors the immutable payslip-correction pattern. No in-place edits, ever.

---

## 7. People Report

Single page under People → Reports → Attendance.

### 7.1 Filters

Sticky filter bar, all dropdowns:

| Filter | Options | Default |
|---|---|---|
| Period | All approved periods, newest first | Most recent approved |
| Outlet | All 7 outlets + "All outlets" | All outlets |
| Department | Distinct `departmentSnapshot` values in the period + "All departments" | All departments |
| Employment status | `PKWT`, `PKWTT`, `dailyWorker`, `freelance`, `bod`, `ojt` + "All" | All |
| Group by | Department / Outlet / Employee | Department |

Department options are derived from the data in the selected period, not from a fixed enum — see §10 O2.

### 7.2 Metrics

| Metric | Formula | Format |
|---|---|---|
| Headcount | `count(records)` | integer |
| Total working days | `Σ WD` | integer, tabular |
| Attendance rate | `Σ WD ÷ (Σ WD + Σ UL)` | 1 dp %, tabular |
| Unpaid leave days | `Σ UL` | integer, tabular |
| Entitled leave days | `Σ (PH + DP + AL + MC + EO + SL)` | integer, tabular |
| Late incidents | `Σ lateCount` | integer, tabular |
| Punctuality rate | `1 − (Σ lateCount ÷ Σ WD)` | 1 dp %, tabular |

**Absenteeism rate is not shipped as a separate metric.** Under the locked D2 classification it is the exact complement of attendance rate (`UL ÷ (WD + UL)`) and carries no additional information. Absenteeism is surfaced as the absolute `Unpaid leave days` figure instead.

### 7.3 Views

**Summary view** — one row per group (department, outlet, or employee), showing every metric in §7.2. Sortable on any column.

**Detail view** — one row per employee: name, employee number, department, outlet, all nine code columns, `late_count`, `total`. Sortable, CSV-exportable.

**Leave breakdown** — stacked composition of entitled leave by code, so `MC` and `EO` are always visible separately rather than lumped into a single "leave" figure. A manager needs to distinguish 3 days sick from 2 days extra off; a combined number gets argued with rather than acted on.

### 7.4 Export

CSV export of the current filtered view, matching the on-screen columns exactly. No PDF in v1.

---

## 8. RBAC

| Permission | Roles |
|---|---|
| `attendance.import` | HR Manager, superAdmin |
| `attendance.approve` | HR Manager (step 1), GM (step 2) |
| `attendance.viewAllOutlets` | HR Manager, GM, Director, Finance Manager, superAdmin |
| `attendance.viewOwnOutlet` | outletManager, department heads |
| `attendance.export` | HR Manager, GM, Director, Finance Manager, superAdmin |
| `attendance.readOwn` | **Reserved, not granted in v1** — mirrors `payroll.readOwn` |

Every permission is validated at the Cloud Function level and mirrored in Firestore Security Rules. UI-level gating is presentation only and is never the enforcement point.

Outlet-scoped roles see only records whose `outletIdSnapshot` matches their assigned outlet. Attendance carries no compensation data, so no field-level split is required.

---

## 9. Integration Points

| Shared service | Usage |
|---|---|
| **Approval Engine** | Period approval chain (§6.1), server-owned route registry |
| **Audit Log** | Every import, approval transition, rejection, and supersede action |
| **Notification Engine** | Approver notifications; import-complete notification to initiator |
| **File Storage Service** | Source CSV archived and referenced by `importFileId` |
| **Task Engine** | Monthly recurring task: "Import attendance for {month}", assigned to HR Manager, generated on the 1st |
| **Search Service** | `attendanceRecords` indexed by `employeeNumber` and `employeeNameSnapshot` |

### 9.1 Downstream consumers

| Consumer | Dependency | Status |
|---|---|---|
| **Appraisal module** | Attendance is weighted 15% of the appraisal score ("punctuality and attendance compliance for the period"). Requires a per-employee, per-period figure. | Attendance exposes `attendanceRate` and `punctualityRate` per employee per period. Exact scoring conversion (rate → 1–5 scale) is owned by Appraisal, not here. |
| **Payroll module** | `Unpaid Basic` proration is an open Payroll item. `Σ UL` is the most likely input. | **Not wired in v1.** Payroll's computation stays in Excel. Flagged as O3. |
| **Operations — Daily Updates** | Already captures `staffScheduled`, `staffPresent`, `absences[]` per outlet per day. | **Deliberately not reconciled.** See §10 O1. |

---

## 10. Open Items

| # | Item | Severity | Owner |
|---|---|---|---|
| **O1** | **Duplicate absence capture.** Operations → Daily Updates already records `staffScheduled`, `staffPresent`, and an `absences[]` array per outlet per day. Attendance now records monthly absence counts from a different source. These two numbers will disagree, and nothing reconciles them. Decide: (a) accept as independent — Daily Updates is a real-time operational signal, Attendance is the payroll-grade record of truth; (b) reconcile with a variance report; (c) retire absence capture from Daily Updates. **Recommendation: (a), documented explicitly, so nobody mistakes one for the other.** | Medium | Angel |
| **O2** | **Department taxonomy.** The source sheet's `Section` column has 16 distinct values against the 11-department canonical list still awaiting sign-off (Training module O5). One value, `Wholefood/Retail Ungasan`, mixes department and outlet. Attendance imports department as a free-string snapshot so this does not block the build, but the report's department dropdown will show 16 options until the taxonomy is signed off. | Medium | Angel / HR |
| **O3** | **Payroll linkage.** `Σ UL` is the probable input to Payroll's undocumented `Unpaid Basic` proration. Not wired in v1. Confirm whether Payroll should read from `attendanceRecords` or continue taking the figure from Excel. | Medium | Angel / Finance |
| **O4** | **No unexcused-absence code.** The nine-code taxonomy has no code for *mangkir* / *alpha* — an employee who does not show up and did not request leave. Such cases will be recorded as `UL`, which semantically means *requested and approved* unpaid leave. This matters because SP1/SP2 disciplinary triggers normally key off unexcused absence. Options: add a tenth code `AB` (Absent Without Notice), or accept `UL` as a dual-purpose code and document it. | Medium | HR |
| **O5** | **`late_count` data quality.** July 2026 source data records **2 late incidents across 161 employees** over a full month. The number is not credible. The punctuality report will faithfully report whatever is in the CSV; if the underlying capture discipline does not improve, the report will be accurate and useless. This is a process problem, not a software problem — do not solve it by building more software. | High (to the report's usefulness, not the build) | HR / Outlet Managers |
| **O6** | **`firestore.rules` conflict.** Two conflicting `firestore.rules` files exist in different repo locations. **Hard blocker** — Attendance cannot ship security rules until resolved. Same blocker already flagged against Payroll, Training, Appraisal, and APAR. | **Blocker** | Angel (Claude Code) |
| **O7** | **Employment status mapping.** The source sheet's status column carries 8 values, 3 of which are not employment types: `Resign (One Month Notice)` (5), `New Hire` (4), `Villa Employee` (1). These do not map to `EMPLOYMENT_STATUSES`. Attendance snapshots the employee record's value rather than the CSV's, so it does not block import — but the master data itself needs cleaning. | Low (for this module) | HR |

---

## 11. Design System Compliance

- Basalt palette; Pandan `#0E4F47` primary, one filled primary button per screen
- Archivo Variable; **tabular numerals on every numeric column** in both report views
- 48px minimum touch targets — import, filter, and approve controls
- Sticky bottom-bar for the primary action on mobile (Commit Import / Approve)
- No swipe-to-approve
- Period status uses the standard workflow ramp (fill + icon + shape, never colour alone)
- Bilingual EN/ID; Indonesian strings run longer — the report's leave-code column headers use the code (`AL`, `MC`) with the full label in a tooltip, so column width is locale-stable

### 11.1 Mobile behaviour

- Summary view: metric cards stack vertically
- Detail view: horizontal scroll with the employee-name column frozen
- Import: desktop-only in v1 — file selection and a 161-row validation preview are not workable on a phone. The import route renders a "use a desktop" message on narrow viewports.

---

## 12. Acceptance Criteria

The module is complete when:

1. A valid CSV for 161 employees imports, validates, previews, and commits in a single transaction.
2. Every hard rule V1–V9 rejects a crafted bad file, with the failing row and column named.
3. `DPH`, `DPN`, `NPL`, and `OFF` normalise per §2.2, with every substitution listed as a W6 warning.
4. An unrecognised code (e.g. `XYZ`) triggers V6 and blocks commit.
5. A row where `Σ days ≠ daysInMonth` triggers V5 and blocks commit.
6. The approval chain routes HR Manager → GM via the Approval Engine, with audit entries and notifications at every transition.
7. Records are immutable once approved; a correction import supersedes rather than edits, and both versions are retained.
8. The People Report filters correctly by period, outlet, department, and employment status, and every metric in §7.2 computes correctly against a known fixture.
9. Outlet-scoped roles cannot read records outside their outlet — verified at the Cloud Function and Security Rule level, not the UI.
10. Reports read the latest non-superseded period for any given month.
11. CSV export matches the on-screen filtered view exactly.
12. All financial and count columns render with tabular numerals.

---

## 13. Decision Log

| # | Decision | Resolution | Date |
|---|---|---|---|
| D1 | Ship `late_count` column despite questionable source data quality | **Ship it.** Report accuracy is bounded by capture discipline; tracked as O5. | 2026-08-28 |
| D2 | Classification of `MC` and `EO` | **Entitled leave**, not absenteeism. Absenteeism = `UL` only. | 2026-08-28 |
| D3 | Period grain | **Company-wide**, one period per month. Not per-outlet. | 2026-08-28 |
| D4 | Legacy code handling | `NPL` → `UL`; `DPH` → `DP`; `DPN` → `DP`. Raw values retained for audit. | 2026-08-28 |
| D5 | Aggregation strategy | Compute on read; no `attendanceSummaries` collection below ~10k records. | 2026-08-28 |
| D6 | Absenteeism rate as a shipped metric | **Dropped** — exact complement of attendance rate under D2. Absolute `Σ UL` shipped instead. | 2026-08-28 |
