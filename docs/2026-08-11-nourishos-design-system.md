# NourishOS — Design System Specification

**Version:** 1.1
**Date:** 2026-08-11
**Status:** Signed off — all decisions resolved (Section 10)
**Applies to:** All NourishOS frontend modules (React 18 + TypeScript + Vite + Tailwind + shadcn/ui)
**Owner:** Angel

---

## 1. Design thesis

NourishOS is an **expo pass**, not a lifestyle product. The interface is glanceable, status-driven, dense where it needs to be, and legible under a service light.

Primary users are floor staff on mid-range Android devices, frequently in direct sun (Uluwatu and Berawa terraces), with wet or gloved hands, on unreliable connections. Secondary users are HQ staff on desktop working dense financial and inventory grids. The system serves both without forking the component library.

### Explicitly rejected directions

| Rejected | Reason |
|---|---|
| Cream + terracotta + sage ("organic wholefood") | Warm-neutral UI loses contrast in direct sun. Cream reads as grease on a kitchen tablet. It is also the default aesthetic for every F&B brand — no differentiation. |
| Brand-colour-everywhere chrome | Status pills end up fighting the chrome. In an ops platform, state must be the loudest signal on screen. |
| Green as brand primary | Green is the approval semantic. A green primary button adjacent to a green "Approved" pill trains users to misread state at a glance. Non-negotiable. |
| Inverted light theme as dark mode | Produces grey-on-grey status pills. Fails for night security patrol and closing shift — a genuine use case, not a preference. |

### Governing principle

**Neutral chrome. Rationed brand. Loud status.**

The Section 6 workflow lifecycle (`Draft → Submitted → Pending Approval → Approved → Rejected → Completed`) appears in every module. It is therefore the real palette, and receives the strongest colour treatment in the system. Brand colour is rationed to at most two appearances per screen.

---

## 2. Colour — Basalt

### 2.1 Chrome

| Token | Hex | Role |
|---|---|---|
| Page canvas | `#F4F5F3` | Cool paper. Not cream. |
| Card surface | `#FFFFFF` | Raised content |
| Border | `#DDE1DE` | Hairline dividers |
| Ink | `#12161A` | Text primary |
| Ink secondary | `#5A646E` | Supporting text, labels |
| Pandan | `#0E4F47` | Brand primary — nav active + one filled button per screen |

### 2.2 Workflow status ramp

Every state carries **fill + icon + shape**. Never colour alone. This covers colourblind staff, glare, and cheap LCD panels with poor gamma — all three are real conditions in the outlets.

| State | Fill | Foreground | Shape | Icon |
|---|---|---|---|---|
| Draft | none | `#64748B` | Dashed outline pill | pencil |
| Submitted | `#E8EEFB` | `#1D4ED8` | Solid pill | send |
| Pending approval | `#FDF3E0` | `#B45309` | Solid pill + dot | clock |
| Approved | `#E6F4EA` | `#15803D` | Solid pill | check |
| Rejected | `#FBEAEA` | `#B91C1C` | Solid pill | x |
| Completed | `#334155` | `#FFFFFF` | Filled dark pill | double-check |

Draft is the only state with no fill — an unfinished thing should look unfinished. Completed is the only inverted pill — a finished thing should read as closed and recede.

### 2.3 Token layer — `index.css`

shadcn/ui expects space-separated HSL. Values below are converted from the hexes above.

```css
:root {
  --background: 90 9% 96%;         /* #F4F5F3 */
  --foreground: 210 18% 9%;        /* #12161A */
  --card: 0 0% 100%;
  --card-foreground: 210 18% 9%;
  --popover: 0 0% 100%;
  --popover-foreground: 210 18% 9%;

  --primary: 173 70% 18%;          /* #0E4F47 */
  --primary-foreground: 0 0% 100%;
  --secondary: 135 6% 87%;
  --secondary-foreground: 210 18% 9%;

  --muted: 100 8% 93%;             /* #EDEFEB */
  --muted-foreground: 210 10% 39%; /* #5A646E */
  --accent: 100 8% 93%;
  --accent-foreground: 210 18% 9%;

  --destructive: 0 74% 42%;        /* #B91C1C */
  --destructive-foreground: 0 0% 100%;

  --border: 135 6% 87%;            /* #DDE1DE */
  --input: 135 6% 87%;
  --ring: 173 70% 18%;
  --radius: 0.5rem;

  /* Workflow ramp — consumed by every module */
  --st-draft: 215 16% 47%;
  --st-draft-bg: 0 0% 100%;
  --st-submitted: 226 76% 48%;
  --st-submitted-bg: 219 71% 95%;
  --st-pending: 26 90% 37%;
  --st-pending-bg: 38 82% 93%;
  --st-approved: 142 72% 29%;
  --st-approved-bg: 137 33% 93%;
  --st-rejected: 0 74% 42%;
  --st-rejected-bg: 0 62% 95%;
  --st-completed: 215 25% 27%;
  --st-completed-bg: 215 25% 27%;
}
```

### 2.4 Dark mode — Night pass

Ships as a purpose-built palette, not an inversion of Basalt.

```css
.dark {
  --background: 195 16% 7%;        /* #0E1214 */
  --foreground: 150 12% 92%;       /* #E8EDEA */
  --card: 197 11% 11%;             /* #171C1F */
  --border: 200 14% 19%;           /* #2A3338 */
  --primary: 165 62% 51%;          /* #35D0A5 — lifted for dark legibility */
  --primary-foreground: 195 16% 7%;
  --muted-foreground: 190 7% 61%;  /* #93A0A3 */
}
```

**Status ramp in dark mode:** keep the foreground hue, replace each `-bg` with a 12–15% lightness tint of the same hue. Never reuse the light-mode `-bg` values — they blow out against a near-black surface.

### 2.5 Enforceable colour rules

1. `--primary` appears at most **twice** per screen: the active nav item and one filled button. If a screen requires two primary buttons, the screen has two jobs and must be split.
2. Status colours are never used for chrome, branding, or decoration.
3. No colour-only state indication anywhere in the system.
4. Never hardcode hex in components. All colour resolves through the token layer.

---

## 3. Typography

### 3.1 Faces

| Role | Face | Rationale |
|---|---|---|
| UI + body | **Archivo Variable** | Grotesque with squarish counters — reads as instrument panel, not lifestyle brand. Variable = single file. Deliberately not Inter (shadcn default, ubiquitous). |
| Dense tables (HQ) | **Archivo Narrow** | Same family. ~18% more columns per row on desktop finance and inventory grids. |
| IDs, codes, timestamps, audit log | **IBM Plex Mono** | `PR-2026-0142`, `outletId`, patrol checkpoint codes. Monospace makes transposition errors visible. |

Two families maximum. Self-host via `@fontsource-variable/archivo` and `@fontsource/ibm-plex-mono` rather than the Google Fonts CDN — removes a DNS round-trip on mobile networks, and the PWA service worker needs the fonts cached regardless.

```css
body { font-family: 'Archivo Variable', system-ui, sans-serif; }
code, .mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
.tabular { font-variant-numeric: tabular-nums; }
```

### 3.2 Tabular figures — mandatory

Apply `.tabular` to **every** rupiah amount, stock quantity, percentage, and countdown. Proportional figures cause column totals to misalign, which is precisely where finance stops trusting a system.

### 3.3 Scale — two densities

Switched on `<html data-density="field|desk">`.

| Token | Field (mobile / outlet) | Desk (HQ) |
|---|---|---|
| Body | 16px / 1.5 | 14px / 1.5 |
| Label | 14px, 500 | 12px, 500 |
| Section heading | 18px, 500 | 16px, 500 |
| Metric | 28px, 500, tabular | 24px, 500, tabular |
| Control height | 48px | 36px |
| Row height | 56px | 40px |
| Card padding | 16px | 12px |

**16px minimum on any input.** Below that, iOS Safari zooms on focus and staff lose their place mid-checklist.

---

## 4. Interaction rules

### 4.1 Touch and reach

- 48px minimum touch target, 8px minimum gap between adjacent targets.
- Primary action lives in a **sticky bottom bar**, never top-right. Top-right is unreachable one-handed on a 6.5" phone, which is how a barista holds it.
- Destructive and primary actions are never adjacent without a visual separator.

### 4.2 Approvals

**No swipe-to-approve.** Approvals write transactionally to the Approval Engine and are difficult to reverse. A gesture that can fire on an accidental scroll will generate approvals nobody made, and the Audit Log will faithfully record them as intentional.

- Explicit tap only.
- Rejection requires a reason before the button enables.
- Desktop supports bulk approve with an explicit count confirmation ("Approve 12 requests").
- Approval buttons disable optimistically on tap to prevent double-submit.

### 4.3 Status presentation

Every list row carries a 3px `border-left` in the status colour, in addition to the pill. On a glare-washed screen the left spine survives when the pill does not.

### 4.4 Offline

All writes route through Cloud Functions, so there is no free Firestore offline persistence to fall back on. Required:

- Queued-writes indicator (persistent thin banner when queue is non-empty).
- Optimistic row state with a "Queued" chip.
- Explicit retry and discard actions on the queue.

**This must be decided before Task Engine UI ships.** Retrofitting means touching every submit button in the system.

### 4.5 Capture

Incident reports and security patrols open the **camera directly**, not a picker sheet. Attach-then-describe, not describe-then-attach — staff photograph the problem while standing in front of it.

### 4.6 Navigation

- Nav is RBAC output, not a static list. Staff and Finance Manager do not see the same shell.
- Mobile: maximum 5 bottom tabs; overflow goes under "More".
- Desktop: collapsible left rail.

### 4.7 Feedback

- Skeletons match the shape of the content they replace. No spinners on list loads.
- Toasts confirm in past tense using the same verb as the button: "Approve" → "Approved".
- Empty states are an invitation with a verb CTA, not an apology.
- Errors state what happened and what to do. No raw exception strings, no "Error:" prefix.

---

## 5. Bilingual constraints

Indonesian runs 15–25% longer than English. Consequences:

- No fixed-width buttons.
- No single-line-only chips or badges.
- No truncation on primary labels or status pills.
- Test every screen against the **Indonesian** string, not the English one. Worst case is `Menunggu persetujuan`, not `Pending`.
- All user-facing labels remain `{id, en}` pairs per existing convention.

---

## 6. Shared components (build once, reuse everywhere)

| Component | Used by | Notes |
|---|---|---|
| `StatusPill` | All modules | Single source of truth for the workflow ramp. Takes lifecycle state, renders fill + icon + shape. |
| `ApprovalCard` | Approval Engine consumers | Header, meta line, status pill, sticky action row. |
| `AuditTimeline` | Approvals, tasks, incidents, employees | One component, one vertical rule, mono timestamps. Consistency here is what makes the Audit Log feel like a system rather than six logs. |
| `TaskRow` | Task Engine consumers | 56px field / 40px desk. Checkbox at 48px hit area. |
| `MetricTile` | Reports & Analytics | Tabular figures mandatory. |
| `OutletBadge` | All modules | Outlet identity is always visible in multi-outlet contexts. |
| `QueueBanner` | App shell | Offline write queue state. |

---

## 7. Accessibility floor

Not optional, not announced in the UI:

- WCAG AA contrast on all text and status pills, verified in both modes.
- Visible keyboard focus ring (`--ring`) on all interactive elements.
- `prefers-reduced-motion` respected.
- All icon-only buttons carry `aria-label`.
- Status never communicated by colour alone (already enforced by Section 2.2).

---

## 8. Motion

Restrained. Motion is used for state transitions and orientation, not delight.

| Moment | Treatment |
|---|---|
| Status change | 150ms fill cross-fade on the pill |
| Pending approval | Slow pulse on the indicator dot only |
| Row enter/exit | 120ms fade, no slide |
| Bottom sheet | 200ms ease-out translate |
| Everything else | None |

No page-load choreography. Staff open this app fifty times a shift.

---

## 9. Anti-patterns

Do not:

- Introduce a second brand colour or a gradient anywhere in the system.
- Use status colours for non-status purposes.
- Place primary actions in the top-right on mobile.
- Fork the component library for a module.
- Add a third font family.
- Hardcode hex values in components.
- Use proportional figures in any numeric column.
- Ship a module without `StatusPill` and `AuditTimeline`.

---

## 10. Decisions — signed off 2026-08-11

| # | Decision | Resolution | Blocks |
|---|---|---|---|
| D1 | Density switch scope | **Auto (viewport-based).** `data-density` flips off breakpoint alone, no per-user setting in v1. | App shell |
| D2 | Dark mode trigger | **Role-based default + manual override.** Security role defaults to Night pass; any user can toggle manually. | App shell |
| D3 | Offline queue UX | **Full queue, retry/discard.** Optimistic writes queue via `QueueBanner`; explicit retry/discard actions per §4.4. | Task Engine UI — now unblocked |

---

## 11. Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-08-11 | Initial specification. Basalt palette locked. Three decisions open. |
| 1.1 | 2026-08-11 | D1–D3 signed off: auto density, role-based dark mode default (Security) with manual override, full offline queue with retry/discard. Task Engine UI unblocked. |
