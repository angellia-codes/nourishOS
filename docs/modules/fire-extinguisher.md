# NourishOS — Fire Extinguisher (APAR) Management

Version: 1.1
Status: Core shipped 2026-08-26 (register, monthly rounds, expiry monitoring). Usage report, compliance dashboard and overdue-round escalation deferred — see §15.
Module: Security → Fire Extinguishers (`/security/fire-extinguishers`; the design's `/operations/apar` was superseded by the 2026-08-25 nav restructure)
Source policy: `HR-P&P-03 — Fire Extinguisher Checking`, effective 13 May 2025
Repo path: `docs/modules/fire-extinguisher.md`

Collections: `fireExtinguishers` (shipped), `fireExtinguisherInspections` (shipped), `fireExtinguisherUsages` (deferred), `incidentReports` (extension deferred)
Depends on: Task Engine, Notification Engine, Audit Log, File Storage, Work Orders (Approval Engine only for the deferred usage report)

---

## 1. Purpose

Digitize `HR-P&P-03` end to end: the unit register, the monthly inspection, and the post-discharge usage report. Replaces two paper artefacts (Attachment I — Fire Extinguisher Usage Report; Attachment II — Monthly Fire Extinguisher Inspection Checklist) with an auditable, multi-outlet, mobile-first system.

The policy exists to satisfy regulatory audit. Every design decision below privileges **retrievable per-unit history** over convenience.

### 1.1 What the policy requires

| Policy clause | System obligation |
| --- | --- |
| §Kebijakan 1 — monthly inspection, annual maintenance | Recurring inspection cycle + annual service record |
| §Kebijakan 2 — trained personnel or Security Guard | RBAC gate on `apar.inspect` |
| §Kebijakan 3 — damaged/expired replaced or serviced **immediately** | Work Order fires on submission, never gated behind approval |
| §Kebijakan 4 — records documented and retained for audit | Immutable inspection history, no deletes, 12-month export |
| §Prosedur Setelah APAR Digunakan | Usage report → incident case file → HR/Safety investigation |
| §Dokumentasi 2–3 — employee training, refresher | **Out of scope** — Training module owns this |

---

## 2. Architecture Decisions

Decisions taken during design, with the reasoning that produced them. Each was an explicit fork, not a default.

### 2.1 One document = one physical cylinder

The original field request included `Qty`. `Qty` is incompatible with everything else the policy requires: Attachment II tracks **one unit across twelve months**, and expiry, hydrostatic test, and refill dates are per-cylinder facts. A grouped row ("3 × 6kg, Kitchen") cannot answer *which* cylinder failed or *which* expires first — the exact question a regulatory audit asks.

**`qty` is not a stored field anywhere in this module.** Counts are derived (`where outletId == X && isArchived == false`). Every cylinder carries an immutable, human-readable `assetCode`.

Cost accepted: a one-time registration walk-through per outlet. See §11.

### 2.2 Dedicated collections, migration-shaped

`collections.ts` declares `EQUIPMENT` and `EQUIPMENT_INSPECTIONS`, but **neither is built** — no schema, no functions, no module doc. "Reusing" them would mean designing a polymorphic asset schema *and* a per-type inspection-template engine before a single extinguisher could be inspected. A coffee machine checklist and an APAR checklist share no items. That converts a safety-compliance build into a foundational asset-management module, which is not scheduled until Phase 2.

Dedicated collections ship now. To keep future absorption cheap, the following field names are **reserved** and must match whatever a generic `equipment` module would use:

```
assetCode · outletId · departmentId · locationLabel · status
lastInspectedAt · nextInspectionDue · isArchived
+ BaseDocument (id, createdAt, updatedAt, createdBy, updatedBy)
```

APAR-specific fields sit *alongside*, not inside, that set. Absorption later is a collection move, not a rewrite.

### 2.3 Usage report = incident case file + per-unit usage record

Strip the APAR-specific rows from Attachment I and it is, field for field, an incident report. `incidentReports` already ships the lifecycle, attachments, `linkedTaskId`, `linkedWorkOrderId`, and the auto-create-Work-Order-on-equipment-failure pattern documented in `incident-report.md` §6.

A standalone usage collection would re-implement all of it *and* keep fire incidents out of the GM's "Open Incidents" widget — two places to look for "what went wrong this month." Rejected.

But putting extinguisher post-use state on the incident document is also wrong: that is **asset** state on an **incident** record, and a multi-cylinder discharge (plausible in a kitchen grease fire) forces an array onto the incident while the unit's own history page has to reverse-query incidents.

Resolution: `incidentReports` owns the narrative, severity, injuries, investigation, and sign-off. A thin `fireExtinguisherUsages` record joins each discharged cylinder to that incident. Multi-unit discharges work; the unit timeline reads its own history directly.

### 2.4 Submission is the Security signature

Attachment I carries three signatures: Security Officer, HRD Representative, Department Head.

An authenticated submission with `submittedByUid` + server timestamp is the audit-grade equivalent of the guard's signature — arguably stronger than ink. Making the guard *also* approve step 1 would be self-approval, the pattern flagged as a vulnerability in the Approval Engine audit.

Approval chain is therefore **HR Manager → General Manager** (two steps), with submission standing as the Security signature.

**Deviation from source policy, recorded deliberately:** Attachment I's third signatory is *Kepala Departemen* (Department Head), on the reasoning that the area owner signs because the incident occurred in their area. GM replaces that slot for executive oversight. Department Head is retained as a **notified party with acknowledgement** — visible on the record, non-blocking. Area accountability is preserved through notification and the corrective-action task, not through an approval gate.

### 2.5 Remediation is not gated behind approval

Policy §Kebijakan 3 requires damaged or discharged units be serviced *immediately*. An empty cylinder on a wall awaiting a GM signature is a live safety gap.

The refill/replace Work Order fires on **submission**. The approval chain governs the *incident record* (investigation, injury findings, corrective action); it does not gate *asset remediation*. Same separation as §2.6.

### 2.6 Security inspects, Engineering services

Fire extinguishers are Security-inspected (policy §Kebijakan 2) but Engineering/Maintenance-serviced (policy §Pelaporan — Restaurant & Maintenance Manager owns replacement and refill). This split holds across every workflow: the *inspection* is a Security action, the *refill/replacement* is a Work Order.

It also drives RBAC: **Security does not hold `apar.manage`.** Letting the inspector edit expiry dates on units they inspect is a segregation-of-duties failure in a compliance system.

---

## 3. Canonical Monthly Checklist — and the SOP conflict it resolves

`HR-P&P-03` disagrees with itself. Procedure §Pemeriksaan Bulanan and Attachment II specify different checks:

| Check | Procedure §Monthly | Attachment II columns |
| --- | :---: | :---: |
| Location & Accessibility | ✅ | ❌ |
| Physical Condition (dents/corrosion/leaks) | ✅ | as "Body & Handle" |
| Pressure Gauge | ✅ | ✅ |
| Tamper Seal & Pin | ✅ | ✅ |
| Label & Instructions | ✅ | as "Inspection Tag" |
| Nozzle | ❌ | ✅ |

Attachment II drops the accessibility check — the single most common real-world APAR failure in an F&B outlet. A cylinder boxed in by stock deliveries, a prep table, or stacked chairs passes every physical check and is useless in a fire.

**Canonical list — union of both, 6 items:**

| Key | Label (EN) | Label (ID) |
| --- | --- | --- |
| `accessibility` | Location & Accessibility | Lokasi & Aksesibilitas |
| `bodyHandle` | Body & Handle | Bodi & Pegangan |
| `pressureGauge` | Pressure Gauge | Indikator Tekanan |
| `sealPin` | Seal & Pin | Segel & Pin Pengaman |
| `nozzle` | Nozzle | Nozzle / Selang |
| `labelTag` | Label & Inspection Tag | Label & Kartu Pemeriksaan |

Each recorded as `pass` / `fail` / `notApplicable`, preserving Attachment II's existing **V / X / N/A** legend so the guard's mental model transfers unchanged.

**Consequence, not optional:** shipping a checklist that does not match the governing SOP creates the exact audit gap the policy exists to close. `HR-P&P-03` currently reads `Revision: N/A` and requires a revision bump. Listed as a deliverable in §11.

---

## 4. Data Model

### 4.1 Collection map

| Collection | New? | Owns |
| --- | --- | --- |
| `fireExtinguishers` | New | Unit register — one doc per cylinder |
| `fireExtinguisherInspections` | New | One doc per unit per month |
| `fireExtinguisherUsages` | New | One doc per discharged unit per incident |
| `incidentReports` | **Extend** | Adds `incidentType: 'fire'` — the usage case file |
| `tasks` | Reuse | Monthly round (recurring, per outlet) |
| `workOrders` | Reuse | Refill / replace / service |
| `approvalRequests` | Reuse | HR Manager → GM chain |

### 4.2 `fireExtinguishers/{id}`

```ts
interface FireExtinguisher {
  // ── Migration-shaped shared fields (reserved names — must not diverge) ──
  assetCode: string              // 'APAR-ULU-014' — immutable, server-generated
  outletId: string
  departmentId: string           // area owner: kitchen | bar | floor | ...
  locationLabel: string          // 'Kitchen — beside walk-in chiller'
  status: 'active' | 'needsService' | 'discharged' | 'expired' | 'retired'
  lastInspectedAt: Timestamp | null
  nextInspectionDue: Timestamp
  isArchived: boolean
  // + BaseDocument (id, createdAt, updatedAt, createdBy, updatedBy)

  // ── APAR-specific ──
  extinguisherType: 'powder' | 'co2' | 'foam' | 'wetChemical'
  weightKg: number               // "Size" — 3 | 6 | 9 etc.
  serialNumber: string | null
  manufactureDate: Timestamp | null
  installedAt: Timestamp
  expiryDate: Timestamp
  lastRefillDate: Timestamp | null
  nextHydrostaticTestDate: Timestamp | null
  photoFileId: string | null     // in-situ photo, so a guard can locate it
  qrCode: string | null          // reserved — QR scanning is out of MVP (§12)
}
```

**Requested field mapping:** Type → `extinguisherType` · Size → `weightKg` · Location → `locationLabel` + `departmentId` · Outlet → `outletId` · Qty → derived count (§2.1).

**Asset code scheme:** `APAR-<OUTLET>-<NNN>`, sequential per outlet, generated server-side inside a transaction, immutable after creation. Rendered in IBM Plex Mono per the design system's ID convention.

### 4.3 `fireExtinguisherInspections/{id}`

```ts
interface FireExtinguisherInspection {
  extinguisherId: string
  roundTaskId: string            // the monthly round this was completed under
  outletId: string
  periodMonth: string            // '2026-08' — uniqueness key
  inspectedByUid: string
  inspectedAt: Timestamp
  items: {
    key: 'accessibility' | 'bodyHandle' | 'pressureGauge'
       | 'sealPin' | 'nozzle' | 'labelTag'
    result: 'pass' | 'fail' | 'notApplicable'        // V / X / N/A
    note: string | null                               // mandatory when fail
    photoFileId: string | null                        // mandatory when fail
    resolution: 'resolvedOnSpot' | 'needsService' | null
  }[]
  overallResult: 'pass' | 'failResolved' | 'failNeedsService'
  workOrderId: string | null
  remarks: string | null
  // + BaseDocument
}
```

`(extinguisherId, periodMonth)` is unique — enforced in the Cloud Function, not by security rules.

### 4.4 `fireExtinguisherUsages/{id}`

```ts
interface FireExtinguisherUsage {
  extinguisherId: string
  incidentReportId: string
  outletId: string
  dischargedAt: Timestamp
  dischargedByUid: string
  durationSeconds: number | null                       // 'Durasi Penggunaan'
  postUseStatus: 'empty' | 'damaged' | 'stillPressurised'
  refillWorkOrderId: string
  // + BaseDocument
}
```

### 4.5 `incidentReports` extension

Two additive fields, populated only when `incidentType == 'fire'`:

```ts
fireExtinguished: boolean | null    // 'Apakah Api Berhasil Dipadamkan?'
fireCause: string | null            // 'Alasan Penggunaan'
```

`incidentType` gains the `'fire'` member. Injuries and property damage reuse the existing sensitive-field restriction from `incident-report.md` §7 (`incidents.view_sensitive` — HR Manager, GM, Super Admin) — no new mechanism.

### 4.6 Failure-handling rules

Not every failure is the same kind of problem. An accessibility fail is fixed by the guard in 30 seconds; raising a Work Order for it generates noise, and a maintenance queue full of noise gets ignored.

On any `fail`, `note` and `photoFileId` are **mandatory**, then:

| Failed item | Resolution options |
| --- | --- |
| `pressureGauge`, `sealPin` | **`needsService` forced** — no self-resolution permitted |
| `accessibility`, `bodyHandle`, `nozzle`, `labelTag` | Guard chooses `resolvedOnSpot` or `needsService` |

Gauge and seal/pin failures mean the cylinder will not discharge. No amount of on-site tidying fixes that, so the option is removed rather than left to judgement.

**Self-resolved fails are still recorded as `fail`.** The unit's compliance record shows what went wrong, not merely that it ended up fine.

`needsService` → Work Order created, unit `status` → `needsService`.

### 4.7 Expiry monitoring is not a checklist concern

A unit expiring next month passes all six checks. Expiry and hydrostatic dates are monitored by a scheduled function reading the register directly:

- Alerts at **T-90 / T-30 / T-7** days before `expiryDate` or `nextHydrostaticTestDate`
- At T-0 the unit auto-flips to `status: 'expired'` and stops counting as coverage

### 4.8 State ownership

All `fireExtinguishers.status` transitions are **server-owned**, executed inside `db.runTransaction`. No client writes to `fireExtinguishers` under any circumstance.

---

## 5. Workflows

### 5.1 Monthly inspection round

```text
1st of month, 06:00 WITA — scheduled function
        ↓
generateMonthlyAparRounds()  → one task per outlet with ≥1 active unit
        ↓
Guard opens round → unit list reads register LIVE
                    (mid-month additions appear in an existing round)
        ↓
Per unit: 6 items → V / X / N/A
        ↓
   fail? → note + photo mandatory
           gauge / seal-pin → 'needsService' forced
           others           → guard picks resolvedOnSpot | needsService
        ↓
submitAparInspection(unit)  ← per unit, not per round
        ↓
   needsService → Work Order created, unit.status = 'needsService'
        ↓
All active units recorded → round task auto-completes
        ↓
Not complete by month-end → overdue → notify GM + HR Manager
```

**Round granularity:** one task per outlet, not per unit. Uluwatu may hold 14 units; the guard walks the building once. Fourteen near-identical tasks in a queue, each needing an open-close cycle on a mid-range Android in an outdoor corridor, is a system that fights its user. The round is the container; the record is still per-unit — every inspection document carries its own `extinguisherId`, `inspectedByUid`, and timestamp, so accountability is not lost.

**Per-unit submission is deliberate.** A 14-unit round that only writes at the end loses everything on a dropped connection.

**Live register read:** the round does not snapshot a unit list at creation, so a unit registered on the 8th appears in the round generated on the 1st.

### 5.2 Discharge and usage report

```text
APAR used (any staff, any department)
        ↓
Staff reports to Security immediately (policy §Tindakan oleh Kitchen)
        ↓
Guard files report → creates:
   • incidentReports (incidentType: 'fire')  ← case file
   • fireExtinguisherUsages                  ← one per discharged unit
   • workOrders (refill/replace)             ← FIRES NOW, not on approval
   • unit.status = 'discharged'              ← drops out of coverage + rounds
        ↓
Submission = Security signature (submittedByUid + server timestamp)
        ↓
approvalRequests → HR Manager → General Manager
        ↓
Department Head notified + acknowledges (non-blocking)
        ↓
Incident: reported → underReview → investigating → resolved → closed
        ↓
Refilled unit → reinstateExtinguisher() → status back to 'active'
```

`reinstateExtinguisher` is blocked until the linked Work Order reaches `completed`.

---

## 6. Cloud Functions

| Function | Trigger | RBAC | Notes |
| --- | --- | --- | --- |
| `registerFireExtinguisher` | Callable | `apar.manage` | **Shipped.** Generates `assetCode` in a transaction |
| `updateFireExtinguisher` | Callable | `apar.manage` | **Shipped.** Audit-logs before/after values |
| `retireFireExtinguisher` | Callable | `apar.manage` | **Shipped.** Sets `isArchived`; requires reason; history preserved |
| `generateMonthlyAparRounds` | Scheduled, monthly | system | **Shipped** (1st, 06:00 WITA). Skips outlets with zero active units |
| `submitAparInspection` | Callable | `apar.inspect` | **Shipped.** Validates 6 items, enforces §4.6 rules, creates WO, updates unit, auto-completes the round |
| `submitAparUsageReport` | Callable | `apar.reportUsage` | Deferred (§15) |
| `reinstateExtinguisher` | Callable | `apar.manage` | Deferred (§15) |
| `checkAparExpiry` | Scheduled, daily | system | **Shipped** (06:30 WITA). 90/30/7-day alerts; auto-`expired` at T-0 |
| `checkOverdueAparRounds` | Scheduled, daily | system | Deferred (§15) |

Nine functions, each single-purpose. Nothing bypasses the Approval, Task, Notification, Audit, or File Storage services.

**Shipped deviation:** `submitAparInspection` is not one transaction. The Work Order (`createWorkOrderInternal`), the inspection document and the unit update are three sequential writes, because the Work Order has to be raised through the shared engine — which owns its own audit entry and cannot join a caller's transaction. Uniqueness, the invariant a transaction was there to protect, is instead enforced by the deterministic document id `${extinguisherId}__${periodMonth}` plus `.create()`, so two guards submitting the same unit at once still cannot both win.

---

## 7. RBAC

New permissions: `apar.view` · `apar.manage` · `apar.inspect` · `apar.reportUsage` · `apar.viewAllOutlets`

**Shipped: two of the five.** `apar.manage` and `apar.inspect` are the only strings with an enforcement point. Reads are gated by `firestore.rules` (signed-in, cross-outlet by design — Engineering services units everywhere), which is where `lostFound` already draws the same line, so `apar.view`/`apar.viewAllOutlets` would have been permission strings nothing checks. `apar.reportUsage` ships with the usage report (§15). Granted in `ROLE_PERMISSIONS`: `apar.inspect` → `security`, `engineering`; `apar.manage` → `hrManager`, `engineering`, `generalManager`. Live `roles/{roleId}` documents need them added by hand — `node functions/tools/sync-role-permissions.mjs --prefix apar. --apply`.

| Action | Security Guard | HR Manager | Engineering | Outlet Manager | GM | Super Admin |
| --- | :---: | :---: | :---: | :---: | :---: | :---: |
| View register (own outlet) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View register (all outlets) | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Register / edit / retire unit | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Perform inspection | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Submit usage report | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Approve usage report | ❌ | ✅ (step 1) | ❌ | ❌ | ✅ (step 2) | ✅ |
| Service / close Work Order | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Compliance dashboard | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |

### 7.1 Decisions behind this matrix

1. **Security does not hold `apar.manage`.** The policy assigns Security to *inspect*; it does not assign them ownership of the asset register. Letting the inspector edit expiry dates on units they inspect is a segregation-of-duties failure.
2. **Register ownership is Engineering + HR only.** Outlet Manager was granted `apar.manage` during design and then revoked: narrower write access on a compliance register is the safer default, and Outlet Manager loses nothing needed day-to-day (they retain usage reporting and dashboard view). HR holds it because `HR-P&P-03` is an HR-issued policy and HR owns compliance documentation; Engineering holds it because Engineering services the units.
3. **Outlet Manager can file a usage report.** Policy §Tindakan oleh Kitchen assumes Security is always reachable. At 23:00 in Berawa they may not be. This removes "we couldn't file it" as an outcome.
4. **`apar.inspect` includes Engineering** so annual maintenance (policy §Pemeliharaan Tahunan) is recordable by the servicing party. Monthly rounds remain with Security.

### 7.2 Accepted residual risk

HR Manager is both step-1 approver on usage reports and able to edit unit records. Low risk — HR neither inspects nor services — but recorded here rather than discovered during an audit.

---

## 8. Notifications

| Event | Recipients | Priority |
| --- | --- | --- |
| Round due | Assigned guard | medium |
| Round overdue | Guard → GM + HR Manager | high |
| Inspection fail (`needsService`) | Engineering + Outlet Manager | high |
| Expiry / hydrostatic T-90 | Outlet Manager + Engineering | medium |
| Expiry / hydrostatic T-30, T-7 | Outlet Manager + Engineering | high |
| Unit auto-expired (T-0) | + GM | **critical** |
| APAR discharged | HR Manager, GM, Engineering, Department Head | **critical** |
| Usage report awaiting approval | Current approver | high |
| Usage report approved / rejected | Submitter + Department Head | medium |

All notification copy uses bilingual `{id, en}` label pairs per system convention.

---

## 9. UI Surfaces

Routes moved to `/security/fire-extinguishers` when the module shipped: the 2026-08-25 nav restructure had already stubbed that path, Security owns the inspection (§2.6), and the `/security` subtree is open to every signed-in user, which is what a guard on a round needs.

| Screen | Route | Primary user | Device |
| --- | --- | --- | --- |
| Register list | `/security/fire-extinguishers` | Engineering, HR | Both |
| Unit detail + timeline | `/security/fire-extinguishers/:extinguisherId` | All viewers | Both |
| Register / edit unit | `/security/fire-extinguishers/new`, `/:extinguisherId/edit` | Engineering, HR | Both |
| **Monthly round** | `/security/fire-extinguishers/rounds/:taskId` | Security Guard | **Mobile-only design target** |
| Usage report form | — | Guard, Outlet Manager | Deferred (§15) |
| Compliance dashboard | — | HR, GM, Outlet Manager | Deferred (§15) |

### 9.1 Monthly round screen — the screen that decides whether this module succeeds

Non-negotiable constraints:

- Single scrolling list of units; each collapses to the 6-item form
- V / X / N/A as three large tap targets, **min 44px** — gloved or wet hands, outdoor glare
- Night Pass dark palette available for closing-shift rounds
- Per-unit save on collapse
- Persistent progress indicator ("9 of 14 recorded")
- Sync-state banner when offline (see §10)

### 9.2 Unit detail timeline

Chronological merge of inspections, discharges, work orders, refills, and status changes. One view answers "what has happened to this cylinder" — the question an auditor asks.

### 9.3 Responsive obligations created by the "Both" device targets

- Register / edit form carries 10+ fields including three dates and a photo upload. A mobile layout is a real responsive-design task, not a free toggle.
- Compliance dashboard stacks widgets single-column below 768px.

### 9.4 Compliance dashboard widgets

Coverage by outlet (active / needsService / discharged / expired) · Rounds completed this month · Units overdue for inspection · Expiring within 90 days · Hydrostatic tests due · Open APAR work orders · Discharge events (12-month trend)

### 9.5 Bilingual sizing

Full bilingual coverage throughout. Indonesian strings run longer than English — the 6-item form is designed for `Lokasi & Aksesibilitas` fitting on one line at 360px.

---

## 10. Offline Capture — Ship Blocker

The round screen assumes the guard's phone can write while they are in the walk-in chiller or a back corridor. Frequently it cannot.

This module is the worst-case instance of the open **D3 offline queue UX** decision: a multi-step form with mandatory photo capture on failures, completed while walking a building, on mid-range hardware, by staff who will not diagnose a sync failure. A round that submits into a void produces a compliance record worse than the paper form it replaces.

**Requirement (dependent on D3):**

- Round state persists locally and survives app close
- Queued submissions flush on reconnect
- Explicit, non-dismissable sync-state indicator ("3 units pending sync")
- No silent success state

**Decision recorded:** this module does **not** implement a module-local offline queue. Doing so would set a precedent D3 may later contradict and leave two queue implementations to reconcile.

**Superseded on 2026-08-26 — the module shipped online-only rather than staying blocked.** The requirement above is unchanged and unmet; what changed is the judgement that blocking on it left the outlets on the paper form indefinitely. Per-unit submission (§5.1) is what makes that acceptable: each recorded unit is durable server-side the moment it is saved, so a connection loss costs the one unit in hand, and the guard is told immediately — there is no silent success state and nothing queued into a void. Acceptance criterion 3 ("partial round progress survives app close and connection loss") is therefore **not met** and stays open against D3; it is the one criterion this build does not satisfy.

---

## 11. Deliverables

### 11.1 System

- 3 new collections + 2 additive fields on `incidentReports`
- 9 Cloud Functions
- 5 permissions
- 6 screens + compliance dashboard
- Firestore security rules for 3 new collections
- Composite indexes: `outletId + status` · `extinguisherId + periodMonth` · `outletId + nextInspectionDue`

### 11.2 Non-system

Listed explicitly so they are not discovered late:

- **`HR-P&P-03` revision bump.** Procedure §Pemeriksaan Bulanan rewritten to the canonical 6 items (§3); Attachment II marked superseded by NourishOS; `Revision: N/A` → `Rev. 1`; `Supersedes` updated.
- **Initial register walk-through.** One pass per outlet logging every cylinder with type, weight, location, expiry, and serial number. Cannot be skipped — nothing in this module functions without it.
- **Guard briefing** on the round screen and the `resolvedOnSpot` / `needsService` distinction.

---

## 12. Out of Scope

- QR / barcode scanning on unit tags — listed as a future enhancement in `operations.md`; `qrCode` field reserved, guards select from the round list in MVP
- Vendor contract and service-provider tracking
- Fire-safety training completion and refresher scheduling (policy §Dokumentasi 2–3) — Training module owns this
- IoT pressure monitoring
- Automatic photo-based failure detection
- Non-APAR safety equipment (hydrants, alarms, emergency lighting, first-aid) — absorbed later via the generic `equipment` module (§2.2)

---

## 13. Dependencies & Blockers

| Dependency | Status | Impact |
| --- | --- | --- |
| **D3 — offline queue UX** | Open | Shipped without it (§10) — AC-3 remains unmet |
| `firestore.rules` conflict (Phase 0) | Resolved | Blocks were added for both shipped collections |
| `equipment` module | Phase 2 | No impact now — shared field names reserved for absorption |

---

## 14. Acceptance Criteria

The module is complete when:

1. Every cylinder in every outlet is registered with a unique, immutable asset code; counts are derived, never stored.
2. A guard completes a 14-unit round on a mid-range Android in under 10 minutes, through one task and one submission flow.
3. Partial round progress survives app close and connection loss.
4. A Pressure Gauge or Seal & Pin failure cannot be self-resolved and always produces a Work Order.
5. Every failure carries a note and photo; self-resolved failures still appear as failures in unit history.
6. A discharge produces one incident, one usage record per discharged unit, one Work Order, and an immediate `discharged` status — before any approval step.
7. Usage reports route HR Manager → GM; Department Head is notified and acknowledges without blocking.
8. Expiry and hydrostatic alerts fire at 90/30/7 days independently of inspection activity.
9. Every create, update, and status change writes an audit log entry.
10. Full bilingual coverage with no Indonesian string overflow at 360px.
11. Twelve months of inspection history for any unit exports for regulatory audit.

---

## 15. Deferred from the first build (2026-08-26)

Scope confirmed before the build, not discovered during it. Everything here is designed above and unimplemented; nothing about the shipped half forecloses it.

| Deferred | Why | What fills the gap today |
| --- | --- | --- |
| Usage / discharge report (§5.2) — `fireExtinguisherUsages`, `incidentReports.incidentType: 'fire'` plus its two additive fields, `submitAparUsageReport`, `reinstateExtinguisher`, the HR Manager → GM approval route, `apar.reportUsage` | The largest single slice, and the one with a working substitute | A discharge is filed as an Incident Report plus a Work Order — both already ship, both already notify. The unit's own status is corrected from the register in the meantime |
| Compliance dashboard (§9.4) | Seven widgets over data the register has to accumulate first | The register list carries status and expiry per unit; coverage is the filtered count |
| `checkOverdueAparRounds` (§5.1's month-end escalation) | The round task carries a real `dueDate`, so it already surfaces as overdue in the task engine | Task overdue surfacing; no GM/HR escalation fires |
| Acceptance criteria not met | AC-3 (offline survival, §10), AC-6 and AC-7 (both discharge-path), AC-11 (12-month export — the history is queryable and indexed, but nothing renders or exports it) | — |

Two things the shipped half deliberately keeps cheap for these: `assetCode`/`outletId`/`status` are already the migration-shaped names §2.2 reserves, and the `apar` permission namespace exists, so the deferred work adds strings rather than reshaping the ones in use.
