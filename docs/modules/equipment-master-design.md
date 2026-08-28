# Module A — Equipment Master

**Version:** 1.0
**Date:** 2026-08-28
**Module:** Operations → Engineering
**Repo path on merge:** `docs/modules/equipment-master.md`
**Status:** Design approved, pending spec review

---

## 1. Purpose & Scope

Equipment Master is the asset registry for PM-eligible operational equipment across all Nourish Group Indonesia outlets. It exists to give Preventive Maintenance (Module B) a stable, structured target to schedule against.

This module is **Module A of a two-module decomposition**:

| Module | Scope | Depends on |
| --- | --- | --- |
| **A — Equipment Master** (this spec) | Registry, bulk import, lifecycle, location, categorisation | `outlets`, `departments` |
| **B — Preventive Maintenance** | Schedules, occurrence generation, assignment, execution, findings, escalation | Module A |

Rationale for the split: equipment is slow-moving master data; PM occurrences are high-volume operational records. Different lifecycles, different owners, different change rates. Same pattern as Positions Master → Appraisal v2. Building B first would leave PM records pointing at free-text equipment names — the same schema debt as `employee.position` holding department strings.

Module A delivers standalone value: an asset register that does not exist today.

### 1.1 In scope

- `equipment` collection — schema, lifecycle, RBAC
- Bulk CSV import with two-phase dry-run preview
- Additive `areas` field on `outlets`, seeded for all outlets
- Single-record create/edit
- Status transitions (`active` ↔ `underRepair`), outlet transfer
- Decommission via Approval Engine
- CSV export (required for the safe re-import loop — see §4.6)
- List / detail / create / edit / import UI

### 1.2 Out of scope

Stated explicitly so it is not assumed present:

- PM schedules, templates, occurrence generation — Module B
- Maintenance execution, before/after photos, checklists, findings — Module B
- Escalation to Restaurant & Maintenance Manager → GM — Module B
- Fire extinguishers / APAR — owned by `docs/modules/fire-extinguisher.md`
- Furniture, fixtures, IT hardware, vehicles — not a fixed-asset register
- Depreciation, book value, any Finance integration
- Equipment photos via import (CSV cannot carry binaries — see §3.4)
- Vendor foreign key (`serviceVendorName` is free text — see §3.3)
- `employeeAssets` reconciliation (see §1.3)
- QR / barcode scanning — `operations.md` §22 future enhancement

### 1.3 Boundary: `equipment` vs `employeeAssets`

`COLLECTIONS.EMPLOYEE_ASSETS` already exists in HR and records **custody** — items issued to a named individual (laptop, phone, uniform, locker key), returned on offboarding.

`equipment` records **facility assets** — machines fixed to or operating within an outlet, maintained on a schedule, not issued to a person.

Boundary rule: **if the maintenance obligation follows the location, it is `equipment`. If the return obligation follows the person, it is `employeeAssets`.**

Ambiguous items (handheld POS terminals, engineers' power tools) resolve by that test. An item may legitimately appear in neither collection.

---

## 2. Design Decisions (locked)

| # | Decision | Chosen | Rejected alternatives |
| --- | --- | --- | --- |
| D1 | Module structure | Split A → B, sequential build | Single combined module |
| D2 | Registry scope | PM-eligible operational equipment only | All fixed + safety equipment (absorbs APAR); full fixed-asset register |
| D3 | Identity | System-generated `assetCode` + `serialNumber` as secondary natural key | Asset code alone; client-supplied tag as PK |
| D4 | Location | `outletId` + per-outlet `area` list + free-text `locationDetail` | `outletId` only; free text only; superset area enum |
| D5 | Categorisation | Fixed top-level enum + free-text `equipmentType` | Reference collection; flat enum only |
| D6 | Criticality | Derived from category, overridable per-equipment | Per-equipment only; defer to Module B |
| D7 | Import failure | Two-phase dry-run preview, then commit | All-or-nothing hard fail; blind partial commit |
| D8 | Lifecycle | Status field, Approval Engine on decommission only | No approval; approval on all transitions |
| D9 | RBAC | Engineering writes (all outlets), broad read | Engineering-only; outlet-scoped Engineering |

---

## 3. Data Model

### 3.1 Prerequisite — `outlets.areas`

Per-outlet area lists (D4) require a field that does not exist today. This is **task 1 in the build order**, not a footnote: import validation has nothing to check against until it lands.

```typescript
// outlets/{outletId} — additive change
interface Outlet {
  // ...existing fields unchanged
  areas: string[]   // e.g. ['kitchen','bar','dining','coldStorage','backOfHouse','exterior']
}
```

Areas differ materially by format — Restaurant, Bakery, and Wholefood outlets do not share a floor plan. Per-outlet lists were chosen over a superset enum for exactly this reason.

Seeding all outlets' area lists is an Engineering/Operations content task, not an engineering task. It must be complete before the first import run.

### 3.2 `equipment/{equipmentId}`

```typescript
interface Equipment extends BaseDocument {
  assetCode: string          // UNG-CHL-004 — system-generated, immutable, unique
  name: string               // "Walk-in Chiller — Main Kitchen"

  category: EquipmentCategory   // enum; drives PM templates (Module B) + criticality default
  equipmentType?: string        // free text, DESCRIPTIVE ONLY — never group or filter on this
  manufacturer?: string
  model?: string
  serialNumber?: string         // secondary natural key; unique across collection when present

  // Location
  outletId: string
  area: string                  // validated against outlets/{outletId}.areas
  locationDetail?: string       // free text, unvalidated — "under the pass, left side"
  departmentId?: string         // owning/using department — notified when down

  // Criticality
  criticality: 'critical' | 'high' | 'medium' | 'low'
  criticalityOverridden: boolean   // false = inherited from category default

  // Lifecycle — overrides BaseDocument's generic status
  status: 'active' | 'underRepair' | 'decommissioned'
  decommissionedAt?: Timestamp
  decommissionedBy?: string
  decommissionReason?: string
  decommissionApprovalRequestId?: string   // FK → approvalRequests

  // Optional context (consumed by Module B)
  installDate?: string          // ISO YYYY-MM-DD
  warrantyExpiryDate?: string   // ISO YYYY-MM-DD
  serviceVendorName?: string    // free text — see §3.3
  photoFileId?: string          // File Storage Service reference — see §3.4
  notes?: string

  // BaseDocument: id, createdAt, updatedAt, createdBy, updatedBy, isArchived
}
```

### 3.3 Deliberate deviations, flagged not hidden

**`status` overrides `BaseDocument.status`.** Same deviation `incident-report.md` already made. Consistent with precedent, but it means `BaseDocument.status` carries different semantics per collection. Noted, not resolved here.

**`criticalityOverridden` exists so category defaults stay changeable.** If `hvac` moves from `medium` to `high` later, every non-overridden asset can be re-derived without clobbering deliberate exceptions. Without this flag, an inherited value is indistinguishable from a chosen one.

**`serviceVendorName` is free text, and this is a shortcut.** `COLLECTIONS.VENDORS` exists and a proper FK is the correct model. Free text was chosen because a FK makes Module A depend on the vendor registry being populated, which it is not. Upgrade path: add `serviceVendorId`, backfill by name match. Flagged now so it is not discovered when Module B needs vendor-serviced PM routing.

### 3.4 `photoFileId` cannot be imported

CSV cannot carry binaries. Import populates every field except `photoFileId`; photos are attached individually via the detail screen afterward.

If a photo per asset is required at go-live, that is a manual pass over the full registry and must be planned as an operations task with its own timeline.

### 3.5 Asset code format

`{OUTLET}-{CAT}-{NNN}` — three-letter outlet code, three-letter category code, zero-padded sequence per outlet+category pair. Example: `UNG-CHL-004`.

Sequencing reuses the existing transactional counter pattern from `functions/src/hr/employees/employeeIdSequence.ts`. No new mechanism.

**Codes are immutable once issued.** An asset transferred between outlets keeps its original code.

Trade-off accepted: `UNG-CHL-004` physically sitting in Berawa reads as wrong. The alternative — reissuing on transfer — breaks every printed label and every historical PM record referencing the old code. Immutability is the lesser evil.

**Consequence, binding on all consumers:** the asset code is an identifier, not a location. Dashboards, filters, and reports must read `outletId`. Nothing may parse the code to determine outlet.

### 3.6 Category enum and criticality defaults

| Category | Code | Default criticality | Covers |
| --- | --- | --- | --- |
| `refrigeration` | CHL | critical | Walk-in chillers, freezers, undercounter units, display fridges |
| `electrical` | ELC | critical | Distribution boards, generators, UPS, power circuits |
| `cooking` | CKG | high | Heat-producing equipment: ranges, ovens, fryers, grills, salamanders |
| `coffeeBar` | CFB | high | Espresso machines, grinders, brewers, ice machines |
| `machinery` | MCH | high | Mechanically-driven production equipment: dishwashers, glasswashers, bakery mixers, dough sheeters, provers, slicers, blenders, food processors |
| `hvac` | HVC | medium | Air conditioning, air handling |
| `ventilation` | VNT | medium | Extraction hoods, exhaust fans, ducting |
| `plumbing` | PLM | medium | Water pumps, heaters, grease traps, drainage |
| `utility` | UTL | low | Miscellaneous supporting equipment |

**Open item — `electrical` defaults to `critical`,** covering both the main distribution board and a staff-room socket circuit. Either override at import on the genuinely critical assets, or split the category. Requires sign-off.

**Watch item — `machinery` is broad** and will attract anything that does not obviously fit elsewhere. `equipmentType` absorbs the specificity, so this is tolerable. If Module B finds itself writing four distinct PM templates for one category, that is the signal to split it.

---

## 4. Bulk Import Pipeline

### 4.1 CSV template

| Column | Required | Validation |
| --- | :--: | --- |
| `name` | ✅ | Non-empty, ≤ 120 characters |
| `category` | ✅ | Must match enum (case-insensitive) |
| `outletCode` | ✅ | Must resolve to an active outlet |
| `area` | ✅ | Must exist in that outlet's `areas` list |
| `equipmentType` | — | Free text |
| `manufacturer` | — | Free text |
| `model` | — | Free text |
| `serialNumber` | — | Unique across collection when present |
| `locationDetail` | — | Free text |
| `departmentCode` | — | Must resolve to a department |
| `criticality` | — | Enum; **blank inherits from category** |
| `installDate` | — | ISO `YYYY-MM-DD`, not future |
| `warrantyExpiryDate` | — | ISO `YYYY-MM-DD` |
| `serviceVendorName` | — | Free text |
| `assetCode` | — | **Only for updating existing records** |
| `notes` | — | Free text |

### 4.2 Two-phase flow

**Phase 1 — dry run.** `previewEquipmentImport` parses, validates every row, resolves the insert/update branch, and **writes nothing**. Returns a preview payload plus a token.

**Phase 2 — commit.** `commitEquipmentImport` takes the preview token, **re-validates server-side** (never trusts client-parsed rows), chunks writes at 450 per batch, generates asset codes transactionally, writes audit entries.

Firestore's 500-write batch limit makes chunking mandatory, not optional.

### 4.3 Row matching

```
serialNumber present AND matches existing  → UPDATE that record
serialNumber present, no match             → INSERT (generate assetCode)
no serialNumber, assetCode present         → UPDATE that record
no serialNumber, assetCode absent          → INSERT (generate assetCode)
```

### 4.4 Known failure mode

A machine **with no serial number**, re-imported **without its asset code**, silently becomes a duplicate. Nothing in the data can detect this — the system has no basis to know.

Two mitigations, both required:

1. **Preview warning.** Any INSERT whose `name` + `outletId` + `area` matches an existing active record is flagged as a warning (not an error): *"possible duplicate, review before committing."* Non-blocking by design — legitimate duplicates exist (four identical undercounter chillers in one kitchen).
2. **Export-first re-import loop.** See §4.6.

### 4.5 Preview payload

```typescript
interface EquipmentImportPreview {
  previewToken: string       // expires after 15 minutes
  fileName: string
  totalRows: number
  inserts: EquipmentImportRow[]
  updates: (EquipmentImportRow & { assetCode: string; changedFields: string[] })[]
  errors: { rowNumber: number; column: string; value: string; message: string }[]
  warnings: { rowNumber: number; message: string }[]
  canCommit: boolean         // false whenever errors.length > 0
}
```

**`canCommit` is false if any error exists.** This is stricter than pure partial-commit: the operator fixes the full error list in one pass rather than committing most rows and chasing stragglers across sessions. The preview screen is what makes this cheap — nothing is re-uploaded blind.

`changedFields` on updates means a re-import touching 200 records shows exactly what is about to change, rather than an opaque "200 updates".

### 4.6 Safe re-import loop

The correct iteration cycle is **export → edit → re-import**, not re-uploading the original sheet. Export emits `assetCode` on every row, which makes every subsequent import an unambiguous update.

This must be documented in the operations SOP, not only implemented in code. It is the primary defence against §4.4.

### 4.7 Error surfacing

Errors are itemised by row number and column, shown inline in the preview table with the offending cell highlighted, and downloadable as CSV.

**Row numbers reference the source file including its header row**, so the number on screen matches the row number in Excel. Trivial to specify, actively annoying to get wrong.

### 4.8 Audit

- **One** audit entry per import run (`equipment.import`) recording actor, filename, insert count, update count, timestamp.
- Per-record audit entries on each created or updated document.

Not one run-level entry per row — 200 rows would bury the audit log.

---

## 5. Lifecycle & Approval

### 5.1 Status transitions

| From | To | Mechanism | Approval |
| --- | --- | --- | :--: |
| `active` | `underRepair` | `updateEquipmentStatus` | — |
| `underRepair` | `active` | `updateEquipmentStatus` | — |
| `active` / `underRepair` | `decommissioned` | `requestEquipmentDecommission` → Approval Engine | ✅ |

Routine states change hour to hour in operational reality. Gating them behind approval would be compliance theatre — an engineer marking a chiller `underRepair` at 02:00 cannot wait for a manager.

Decommission is different: it ends the asset's PM obligation and removes it from scheduling. That warrants a name attached.

This is a **deliberate deviation from Architecture Rule §11** ("every module integrates with the Approval Engine, no exceptions"), argued openly rather than skipped quietly — same treatment as the Training module's single-actor verification deviation (O6).

### 5.2 Decommission chain

**Engineering head submits → Outlet Manager (asset's outlet) approves.** Single step.

Outlet Manager rather than GM, deliberately departing from APAR's HR Manager → GM two-step. Decommissioning a dead blender is not a GM-level event, and routing it there guarantees rubber-stamping — worse than not gating it at all.

**Open item:** if high-criticality assets warrant GM approval, that is a conditional route (`criticality IN ('critical','high')` → second step to GM). Not added without sign-off.

Requires a new entry in the server-owned route registry (`functions/src/shared/approval/routes.ts`) keyed `operations/equipmentDecommission`, plus a registered resolved-handler. No new approval logic — the shared engine handles the rest.

### 5.3 Retention

Decommissioned equipment is **never deleted**. It is excluded from PM scheduling and from default list views, but remains fully queryable. Consistent with the immutable-audit pattern used throughout NourishOS (supersede, do not destroy).

### 5.4 Outlet transfer

A separate transition from decommission — unapproved, but audit-logged.

`transferEquipmentOutlet` must **re-validate `area` against the target outlet's list**. The target may not contain the source area. Transfer either maps to a valid area in the destination or fails. Otherwise transfer produces records that violate the constraint import enforces.

Flagged because it is easy to miss and it breaks the "one asset, one outlet" assumption every dashboard will make.

---

## 6. RBAC

### 6.1 Permissions

| Permission | Grants |
| --- | --- |
| `equipment.view` | Read equipment within own outlet |
| `equipment.view_all` | Read across all outlets |
| `equipment.manage` | Create, edit, status change (`active` ↔ `underRepair`), outlet transfer |
| `equipment.import` | Run import preview and commit |
| `equipment.decommission` | Submit decommission approval request |

`equipment.import` is separate from `equipment.manage` because a bulk commit can rewrite the entire registry in one action while a single edit cannot. Different blast radius, different permission. The same actor holds both today; the separation matters the day data entry is delegated.

### 6.2 Role matrix

| Role | view | view_all | manage | import | decommission |
| --- | :--: | :--: | :--: | :--: | :--: |
| superAdmin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Director | ✅ | ✅ | — | — | — |
| General Manager | ✅ | ✅ | — | — | approver |
| Engineering head | ✅ | ✅ | ✅ | ✅ | ✅ |
| outletManager | ✅ | — | — | — | approver |
| Kitchen / Bar / Floor leader | ✅ | — | — | — | — |
| HR Manager | ✅ | — | — | — | — |
| Finance Manager | ✅ | — | — | — | — |
| Security | ✅ | — | — | — | — |
| Floor staff | — | — | — | — | — |

Broad read is deliberate. Equipment records carry no cost, compensation, or personal data. The cost of over-restricting is that Module B's fault reporting degrades — a leader who cannot identify a machine files a vaguer incident.

**Open item:** Engineering is granted all-outlet scope. This is the same unresolved question as APAR's `apar.viewAllOutlets`. If Engineering at Berawa should not see Ungasan's assets, that constraint must hold across both modules or it is not a real constraint. Resolving it here should resolve it for APAR too.

All permission checks execute at the Cloud Function level, never UI-only.

---

## 7. Cloud Functions

| Function | Type | Purpose | Permission |
| --- | --- | --- | --- |
| `previewEquipmentImport` | callable | Parse, validate, branch; write nothing; return preview + token | `equipment.import` |
| `commitEquipmentImport` | callable | Re-validate server-side, chunked batch write, generate codes, audit | `equipment.import` |
| `createEquipment` | callable | Single-record create | `equipment.manage` |
| `updateEquipment` | callable | Field edits; rejects any write to `assetCode` | `equipment.manage` |
| `updateEquipmentStatus` | callable | `active` ↔ `underRepair` only; rejects `decommissioned` | `equipment.manage` |
| `transferEquipmentOutlet` | callable | Outlet change; re-validates `area`; audit-logged | `equipment.manage` |
| `requestEquipmentDecommission` | callable | Builds approval request via shared engine | `equipment.decommission` |
| `onEquipmentDecommissionResolved` | trigger | Sets `decommissioned`, stamps actor/reason/timestamp | — |
| `equipmentCodeSequence` | internal | Transactional counter; mirrors `employeeIdSequence.ts` | — |

All business logic runs in Cloud Functions. No direct Firestore writes from the client.

---

## 8. Frontend

Routes under `/operations/equipment`:

| Screen | Contents |
| --- | --- |
| **List** | Table; filters (outlet, area, category, criticality, status); search on `name` / `assetCode` / `serialNumber`. Default filter excludes decommissioned |
| **Detail** | Read-only summary; edit for `equipment.manage`; status control; maintenance history panel (empty placeholder until Module B) |
| **Create / Edit** | Single-record form |
| **Import** | Upload → preview (three tabs: Inserts / Updates / Errors) → commit |
| **Export** | CSV including `assetCode` — see §4.6 |

Design system per `2026-08-11-nourishos-design-system.md`: Basalt palette (`#F4F5F3` canvas, `#0E4F47` Pandan primary), Archivo Variable, 48px minimum touch targets, sticky bottom-bar primary actions.

The list must be usable one-handed on a mid-range Android phone in a kitchen. That is the real usage context for Module B's execution flow, so the equipment list is built for it now rather than retrofitted.

All data access goes through a service layer. No direct Firestore calls from components.

---

## 9. Acceptance Criteria

1. `outlets.areas` is seeded for all outlets before any import runs
2. Asset codes are unique, well-formed, and sequential per outlet+category; immutable after issue
3. Re-importing an unchanged file containing serial numbers produces zero inserts and zero field changes
4. `previewEquipmentImport` writes nothing to Firestore — verified by write-count assertion
5. `canCommit` is `false` whenever any error exists
6. An import of more than 500 valid rows commits successfully (batch chunking verified)
7. Blank `criticality` inherits the category default and sets `criticalityOverridden: false`
8. An `area` value outside the target outlet's list fails validation, naming the row number and column
9. `decommissioned` cannot be set via `updateEquipmentStatus` — only through a resolved approval
10. Decommissioned equipment is excluded from default list views but remains queryable
11. Outlet transfer to an outlet lacking the source `area` fails rather than writing
12. A Kitchen leader can read equipment in their own outlet and cannot read another outlet's
13. Every create, update, status change, transfer, decommission, and import run produces an audit log entry
14. Preview flags `name` + `outletId` + `area` collisions as warnings without blocking commit

---

## 10. Open Items

Requiring sign-off before or during implementation.

| ID | Item | Severity |
| --- | --- | --- |
| A-O1 | **`firestore.rules` conflict** — two conflicting files in different locations. Module A adds rules and cannot ship until resolved | **Hard blocker** |
| A-O2 | **Outlet enum sign-off** — carried from the payroll spec, still unsigned. Both `outletCode` resolution and `areas` seeding depend on the canonical outlet list | **Blocker** |
| A-O3 | `outlets.areas` content — the actual area list per outlet is an Engineering/Operations content task, not engineering work. Must precede first import | Blocker for import |
| A-O4 | `electrical` defaulting to `critical` covers both main distribution boards and staff-room circuits. Split the category, or override per asset? | Decision |
| A-O5 | Decommission approver — Outlet Manager (as specced) vs. conditional second step to GM for `critical`/`high` assets | Decision |
| A-O6 | Engineering all-outlet scope vs. APAR's unresolved `apar.viewAllOutlets`. Must be answered consistently across both modules | Decision |
| A-O7 | `EQUIPMENT_INSPECTIONS` collection collision — both APAR and PM will want inspection records against a single reserved collection name. Deferred to Module B, recorded here so it is not discovered mid-build | Deferred |
| A-O8 | `serviceVendorName` free text vs. `serviceVendorId` FK to `vendors`. Revisit when Module B needs vendor-serviced PM routing | Deferred |
| A-O9 | Equipment photos cannot be imported. If required at go-live, plan a manual attachment pass as an operations task | Operations task |
| A-O10 | `machinery` breadth — split if Module B needs multiple distinct PM templates within it | Watch item |

---

## 11. Next Steps

1. Spec review and sign-off on §10 open items
2. Resolve A-O1 (`firestore.rules`) — prerequisite, handled in Claude Code
3. Implementation plan for Module A (`writing-plans`)
4. Module B — Preventive Maintenance design session, after Module A ships
