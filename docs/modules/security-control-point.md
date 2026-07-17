# NourishOS — Security Control Point (Checkpoint) Registration

Version: 1.0
Module: Security → Patrol
Collection: `checkpoints` (existing)
Depends on: File Storage (photo evidence, downstream), Notification Engine, Audit Log

---

## 1. Purpose

Admin form to register a "Security Control Point" — the fixed patrol point a guard checks into (`Checkpoint` in the existing schema). This closes a known gap: `createCheckpoint` and `checkOverdueCheckpoints` Cloud Functions are fully built and live, but there is no admin screen for them yet — `securityService.createCheckpoint()` currently ships with the comment *"checkpoint registration doesn't have an admin UI yet; call this from the emulator shell or a future Settings screen."* This template is that screen.

---

## 2. Architecture Decision — This Is a UI Build, Not a Backend Build

No new collection, Cloud Function, or schema is needed for **creating** a checkpoint — `createCheckpoint` already validates input, writes to `checkpoints`, and audit-logs the action. Scope here is strictly:
1. The registration form (this doc)
2. Two backend gaps this surfaces that do need building (flagged, not silently assumed):
   - **No `updateCheckpoint` function exists.** Editing a checkpoint's name, radius, or interval after creation isn't currently possible.
   - **No `archiveCheckpoint` function exists.** `checkpoints` documents carry `isArchived` (referenced by `checkOverdueCheckpoints` and `getActiveCheckpoints`'s query), but nothing sets it — a checkpoint can be created but never decommissioned. Both are Approval-Engine-free, single-step Cloud Functions consistent with `createCheckpoint`'s existing pattern; small addition, not a redesign.

Everything below assumes those two functions get built alongside the UI — the form has no purpose if a mis-entered checkpoint can never be corrected or retired.

---

## 3. Registration Form Template

Matches `CreateCheckpointInput` exactly — no new fields invented.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| Control Point Name | Text | Yes | e.g. "Kitchen Rear Entrance", "Bar Storage", "Perimeter Gate 2" |
| Description | Textarea | No | Landmark/context for the guard (e.g. "Behind the walk-in chiller") |
| Outlet | Select | Yes* | *Not in current `Checkpoint` schema — flagged in §4 |
| Location (lat/long) | Map picker | Yes | Pin-drop on map preferred over manual entry; auto-fills from device GPS with manual override for indoor points |
| Geofence Radius (meters) | Number | Yes | Must be > 0. See §5 for F&B-specific guidance |
| Patrol Interval (minutes) | Number | Yes | Must be > 0. Drives the overdue-alert scheduler |

### Suggested UX
- Map picker over raw lat/long text entry — supervisors registering points are on-site with the app, same as the guard's patrol capture flow; reuse `getCurrentPosition()` already built for `PatrolCapturePage`
- Live preview of the geofence radius as a circle overlay on the map, so the supervisor can visually confirm it covers the intended area without swallowing a neighboring checkpoint
- Inline validation matching backend rules (radius/interval > 0) before submit, to avoid a round-trip rejection

---

## 4. Flag — Outlet Scoping Is Missing From the Schema

`Checkpoint` (types/security.types.ts) has no `outletId` field, and `getActiveCheckpoints()` / `subscribeToActiveCheckpoints()` fetch all active checkpoints company-wide with no outlet filter. For a single-outlet pilot this is invisible; for Nourish's multi-outlet footprint it means every guard sees every checkpoint across every outlet in the picker, and Outlet Manager-scoped RBAC (per RBAC.md §7, "Standard users access only their outlet") has nothing to enforce against here.

**Recommendation:** add `outletId: string` to `Checkpoint`, filter `getActiveCheckpoints` by the guard's outlet, and require it in the registration form above. This is an additive field, not a breaking change — flagging now before the admin UI ships a form that would otherwise need to be reworked immediately after.

---

## 5. Geofence & Interval Guidance (F&B Multi-Outlet Context)

| Point Type | Suggested Radius | Suggested Interval | Rationale |
| --- | --- | --- | --- |
| Outdoor perimeter / gate | 15–25m | 60–120 min | Open sky, accurate GPS; tighter radius meaningful |
| Parking / loading area | 20–30m | 60–120 min | Open-air, moderate accuracy |
| Indoor kitchen / storage / walk-in | 40–60m | 30–60 min | GPS drift indoors is significant (per `createPatrolLog`'s existing flag-not-reject design) — a tight radius here just generates false flags |
| Bar / floor / dining area | 30–50m | 60–90 min | Mixed indoor/outdoor signal depending on layout |
| High-risk (cash office, liquor storage) | 20–40m | 30 min | Tighter interval regardless of radius — frequency matters more than precision here |

This mirrors the existing `createPatrolLog` design decision to flag-not-reject out-of-range submissions — radius should be set generously enough that legitimate visits aren't routinely flagged, since the flagging mechanism (not a hard boundary) is what actually catches genuine misses.

---

## 6. RBAC

| Role | Register/Edit Checkpoint | Archive Checkpoint | View Checkpoints | Log Patrol |
| --- | --- | --- | --- | --- |
| Security (guard) | — | — | ✅ (own outlet, once §4 is implemented) | ✅ |
| Security Supervisor* | ✅ | ✅ | ✅ | ✅ |
| General Manager | ✅ | ✅ | ✅ (all outlets) | — |
| Super Admin | ✅ | ✅ | ✅ | — |

*Permission `CHECKPOINTS_MANAGE` exists (`security.manageCheckpoints`) and its code comment confirms intent — "registering/editing checkpoints themselves is a supervisor action" — but no distinct "Security Supervisor" role currently appears in `roles.ts`/RBAC.md's role list (only "Security"). Verify whether `CHECKPOINTS_MANAGE` is granted to the Security role itself or reserved for GM/Super Admin before wiring the form's permission guard — don't assume.

---

## 7. Workflow

```text
Supervisor opens "Add Control Point" (Settings → Security, or Security module directly)
  ↓
Fill form (§3), confirm pin + radius on map
  ↓
createCheckpoint() — Cloud Function validates, writes, audit-logs
  ↓
Checkpoint appears in guard's active list (CheckpointListPage) immediately (real-time subscription already built)
  ↓
checkOverdueCheckpoints (existing, every 15 min) starts monitoring against scheduleIntervalMinutes
```

Edit flow (once `updateCheckpoint` exists): same form pre-filled, PATCH-style update, new audit log entry with before/after values (matches `recordAuditEvent` pattern already used elsewhere).

Archive flow (once `archiveCheckpoint` exists): confirmation dialog (irreversible-feeling action, though `isArchived` can be manually reverted server-side) — sets `isArchived: true`, removes from `getActiveCheckpoints` results, does not delete `patrolLogs` history.

---

## 8. Acceptance Criteria

1. Form submits only when name, radius (>0), and interval (>0) are present — matches backend validation exactly, no silent mismatch
2. New checkpoint appears in the guard-facing `CheckpointListPage` list without a page refresh (existing `subscribeToActiveCheckpoints`)
3. Map pin location and manually-verified lat/long match within the tool's own precision (no separate manual-entry path that could diverge from the pin)
4. Audit log entry recorded for every create/edit/archive action
5. Archived checkpoints stop appearing in the guard's active list but remain queryable (their `patrolLogs` history is untouched)
6. If §4's outlet scoping is implemented: a guard assigned to Outlet A cannot see or select Outlet B's checkpoints
