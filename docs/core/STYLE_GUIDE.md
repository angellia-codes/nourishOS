# NourishOS Style Guide

Version: 3.0
Product: Nourish Operational System (NourishOS)

**Supersedes v2 ("Warm Utilitarian").** Incorporates the Basalt spec ([docs/2026-08-11-nourishos-design-system.md](../2026-08-11-nourishos-design-system.md), signed off 2026-08-11) as the governing color, typography, interaction, and motion system. Sections with no Basalt equivalent (spacing, radius, layout, breakpoints, naming) carry over from v2 unchanged or re-tokened.

**Migration status:** doc-only as of 3.0. Shipped code (`src/styles/globals.css`, `Button`, Google Fonts `<link>`) still implements v2 Warm Utilitarian tokens. This doc states intent; code has not migrated. See `CLAUDE.md` "Current state" for what's actually shipped.

---

# Brand Personality

NourishOS is an **expo pass, not a lifestyle product.** Glanceable, status-driven, dense where it needs to be, legible under a service light.

Primary users are floor staff on mid-range Android devices, frequently in direct sun, with wet or gloved hands, on unreliable connections. Secondary users are HQ staff on desktop working dense financial and inventory grids. One component library serves both — no forking per module.

**Governing principle: Neutral chrome. Rationed brand. Loud status.**

The workflow lifecycle (`Draft → Submitted → Pending Approval → Approved → Rejected → Completed`) appears in every module. It is the real palette and receives the strongest colour treatment in the system. Brand colour is rationed to at most two appearances per screen.

### Explicitly rejected

| Rejected | Reason |
|---|---|
| Cream + terracotta + sage ("organic wholefood") | Warm-neutral UI loses contrast in direct sun; cream reads as grease on a kitchen tablet; it's also the default F&B aesthetic — no differentiation. This was v2's direction. |
| Brand-colour-everywhere chrome | Status pills end up fighting the chrome. State must be the loudest signal on screen. |
| Green as brand primary confusable with Approved | Non-negotiable — a green primary button next to a green "Approved" pill trains users to misread state. |
| Inverted light theme as dark mode | Produces grey-on-grey status pills. Fails night security patrol and closing shift. |

---

# Design Principles

## 1. Simplicity First

Every screen has a single primary purpose. Avoid decoration. Less interface, more content.

## 2. Consistency

Every module looks and behaves the same. Users never relearn navigation. One component library, no per-module forks.

## 3. Functional Beauty

Every visual element improves usability. No decorative UI that distracts from work.

## 4. Calm, Legible Interface

Employees spend hours in this system — at a desk all day, or on a shared tablet mid-shift, in direct sun. Avoid visual noise. Use whitespace generously. Status must read at a glance under glare.

---

# Visual Direction

Keywords: Neutral, Dense-where-needed, Legible, Status-driven, Utilitarian, Glanceable, Disciplined.

Avoid:

- Neon colors, heavy gradients, glassmorphism, excessive animations, comic illustrations, bright saturated colors
- Generic enterprise blue/indigo as a *primary brand* color (semantic blue for the Submitted status is fine — that's state, not brand)
- Inter as the primary typeface
- A second brand colour or any gradient anywhere in the system
- Status colours used for chrome, branding, or decoration
- Colour-only state indication anywhere

---

# Color Palette — Basalt

## Chrome

| Token | Hex | Role |
|---|---|---|
| Page canvas | `#F4F5F3` | Cool paper — not cream |
| Card surface | `#FFFFFF` | Raised content |
| Sunken surface (inputs, nested panels, alt rows) | `#EDEFEB` | |
| Border | `#DDE1DE` | Hairline dividers |
| Text primary (Ink) | `#12161A` | |
| Text secondary | `#5A646E` | Supporting text, labels |
| Primary — Pandan | `#0E4F47` | Nav active + at most one filled button per screen |
| Danger | `#B91C1C` | Destructive actions, muted — never bright red |

## Workflow status ramp

Every state carries **fill + icon + shape**, never colour alone (colourblind staff, glare, cheap LCD gamma are all real conditions in the outlets).

| State | Fill | Foreground | Shape | Icon |
|---|---|---|---|---|
| Draft | none | `#64748B` | Dashed outline pill | pencil |
| Submitted | `#E8EEFB` | `#1D4ED8` | Solid pill | send |
| Pending approval | `#FDF3E0` | `#B45309` | Solid pill + pulsing dot | clock |
| Approved | `#E6F4EA` | `#15803D` | Solid pill | check |
| Rejected | `#FBEAEA` | `#B91C1C` | Solid pill | x |
| Completed | `#334155` | `#FFFFFF` | Filled dark pill | double-check |

Draft is the only state with no fill — unfinished should look unfinished. Completed is the only inverted pill — finished should read closed and recede.

## Dark mode — Night pass

Purpose-built palette, not an inversion of the light chrome.

| Token | Hex |
|---|---|
| Background | `#0E1214` |
| Surface | `#171C1F` |
| Border | `#2A3338` |
| Primary (lifted for dark legibility) | `#35D0A5` |
| Text | `#E8EDEA` |
| Text secondary | `#93A0A3` |

Status ramp in dark mode: keep each state's foreground hue, replace `-bg` with a 12–15% lightness tint of the same hue. Never reuse light-mode `-bg` values — they blow out against near-black.

Token layer (CSS variables, shadcn HSL format) lives in [docs/2026-08-11-nourishos-design-system.md](../2026-08-11-nourishos-design-system.md) §2.3 — copy from there when migrating `src/styles/globals.css`, don't hand-convert hexes again.

## Rules

1. `--primary` at most **twice** per screen: active nav item + one filled button. A screen needing two primary buttons has two jobs and must be split.
2. Status colours never used for chrome, branding, or decoration.
3. No colour-only state indication anywhere.
4. Never hardcode hex in components — resolve through the token layer.

---

# Typography

## Faces

| Role | Face | Rationale |
|---|---|---|
| UI + body | **Archivo Variable** | Grotesque, squarish counters — instrument panel, not lifestyle brand. Variable = single file. Deliberately not Inter. |
| Dense tables (HQ) | **Archivo Narrow** | Same family, ~18% more columns per row on desktop finance/inventory grids. |
| IDs, codes, timestamps, audit log | **IBM Plex Mono** | `PR-2026-0142`, `outletId`, patrol checkpoint codes — monospace makes transposition errors visible. |

Two families maximum. Self-host via `@fontsource-variable/archivo` and `@fontsource/ibm-plex-mono`, not the Google Fonts CDN — removes a DNS round-trip on mobile networks, and the PWA service worker (once built) needs fonts cached regardless.

```css
body { font-family: 'Archivo Variable', system-ui, sans-serif; }
code, .mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
.tabular { font-variant-numeric: tabular-nums; }
```

## Tabular figures — mandatory

Apply `.tabular` to **every** rupiah amount, stock quantity, percentage, and countdown. Proportional figures misalign column totals — precisely where finance stops trusting a system.

## Scale — two densities

Switched on `<html data-density="field|desk">`. Auto (viewport-based, see Responsive Breakpoints below) — no per-user override in v1 (signed off, see Basalt doc §10 D1).

| Token | Field (mobile / outlet) | Desk (HQ) |
|---|---|---|
| Body | 16px / 1.5 | 14px / 1.5 |
| Label | 14px, 500 | 12px, 500 |
| Section heading | 18px, 500 | 16px, 500 |
| Metric | 28px, 500, tabular | 24px, 500, tabular |
| Control height (buttons, inputs, table rows use their own below) | 48px | 36px |
| Row height | 56px | 40px |
| Card padding | 16px | 12px |

**16px minimum on any input.** Below that, iOS Safari zooms on focus and staff lose their place mid-checklist.

Display/heading sizes for marketing-adjacent or onboarding surfaces (if any) may still use a larger display cut, but forms and tables always follow the density table above — no separate 48px Display/36px H1 scale from v2 carries forward.

---

# Spacing System

8-point grid. Values: 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96. Never use arbitrary spacing.

---

# Border Radius

| Use | Radius |
|---|---|
| Small | 4px |
| Medium | 8px |
| Large | 12px |
| Cards | 12px |
| Buttons | 8px |
| Dialogs | 12px |
| Pills / Avatars / Badges | 9999px (full) |

No change from v2 — Basalt doesn't redefine radius, and the disciplined (not "bubbly SaaS") scale already fits the instrument-panel direction.

---

# Shadows

Neutral cool-tinted (not warm — the warm rgba tint tracked the old terracotta ink, which is gone).

| Use | Value |
|---|---|
| Cards | `0 2px 10px rgba(15,23,32,.08)` |
| Dialogs | `0 12px 40px rgba(15,23,32,.16)` |

---

# Layout

Maximum content width: 1440px. Dashboard: 12-column grid. Page padding: 32px desktop / 24px tablet / 16px mobile.

---

# Navigation

Nav is **RBAC output, not a static list** — Staff and Finance Manager do not see the same shell.

| | Desktop | Mobile |
|---|---|---|
| Structure | Collapsible left rail + top header + content | Bottom navigation, max 5 tabs, overflow under "More"; hamburger for the rest |
| Extras | — | Floating Action Button when appropriate |

---

# Interaction rules

## Touch and reach

- 48px minimum touch target everywhere (supersedes v2's two-tier 44/48px — one number, always met).
- 8px minimum gap between adjacent targets.
- Primary action lives in a **sticky bottom bar**, never top-right — unreachable one-handed on a 6.5" phone.
- Destructive and primary actions never adjacent without a visual separator.

## Approvals

**No swipe-to-approve.** Approvals write transactionally to the Approval Engine and are hard to reverse; a gesture that fires on an accidental scroll generates approvals nobody made, and the Audit Log faithfully records them as intentional.

- Explicit tap only.
- Rejection requires a reason before the button enables.
- Desktop supports bulk approve with an explicit count confirmation ("Approve 12 requests").
- Approval buttons disable optimistically on tap to prevent double-submit.

## Status presentation

Every list row carries a 3px `border-left` in the status colour, in addition to the pill — survives glare when the pill doesn't.

## Offline

All writes route through Cloud Functions — no free Firestore offline persistence to fall back on. Signed off (Basalt doc §10 D3): **full queue, retry/discard**, not block-on-offline.

- Queued-writes indicator: persistent thin `QueueBanner` when queue is non-empty.
- Optimistic row state with a "Queued" chip.
- Explicit retry and discard actions on the queue.

This must land before/with Task Engine UI — retrofitting means touching every submit button in the system.

## Capture

Incident reports and security patrols open the **camera directly**, not a picker sheet. Attach-then-describe — staff photograph the problem standing in front of it.

## Feedback

- Skeletons match the shape of the content they replace. No spinners on list loads.
- Toasts confirm in past tense using the same verb as the button: "Approve" → "Approved".
- Empty states are an invitation with a verb CTA, not an apology.
- Errors state what happened and what to do. No raw exception strings, no "Error:" prefix.

---

# Bilingual constraints

Indonesian runs 15–25% longer than English.

- No fixed-width buttons.
- No single-line-only chips or badges.
- No truncation on primary labels or status pills.
- Test every screen against the **Indonesian** string, not English. Worst case is `Menunggu persetujuan`, not `Pending`.
- All user-facing labels remain `{id, en}` pairs per existing convention.

---

# Shared components (build once, reuse everywhere)

| Component | Used by | Notes |
|---|---|---|
| `StatusPill` | All modules | Single source of truth for the workflow ramp — lifecycle state in, fill + icon + shape out. |
| `ApprovalCard` | Approval Engine consumers | Header, meta line, status pill, sticky action row. |
| `AuditTimeline` | Approvals, tasks, incidents, employees | One component, one vertical rule, mono timestamps. |
| `TaskRow` | Task Engine consumers | 56px field / 40px desk. Checkbox at 48px hit area. |
| `MetricTile` | Reports & Analytics | Tabular figures mandatory. |
| `OutletBadge` | All modules | Outlet identity always visible in multi-outlet contexts. |
| `QueueBanner` | App shell | Offline write queue state. |

No module ships without `StatusPill` and `AuditTimeline`.

---

# Buttons

| Variant | Style |
|---|---|
| Primary | Filled Pandan (`#0E4F47`), white text. At most one per screen (plus active nav). |
| Secondary | Bordered/ghost, neutral chrome — no second brand colour. (v2's filled Deep Olive secondary is dropped; two filled brand-adjacent buttons per screen contradicts the rationing rule.) |
| Ghost | Bordered, transparent fill, text-only emphasis. |
| Danger | Muted red (`#B91C1C`). Never bright red. Never adjacent to primary without a separator. |

Height: follows density scale — 48px field, 36px desk; 48px minimum always on tablet/shared-device controls. Minimum width 120px carries over from v2 unless bilingual label length forces wider (see Bilingual constraints — no fixed-width buttons).

---

# Cards

Pure white surface on the `#F4F5F3` canvas. 12px radius. Border `#DDE1DE`. Shadow per Shadows section. Internal padding follows density: 16px field / 12px desk.

---

# Forms

Rounded inputs, height follows density scale (48px field / 36px desk, 16px minimum font to avoid iOS zoom). Sunken surface background `#EDEFEB`. Clear labels. Always validate. Show helpful error messages, no raw exception strings (see Feedback).

---

# Tables

Row height follows density: 56px field / 40px desk. Sticky headers, search, sorting, pagination, column visibility, export.

---

# Icons

Library: Lucide React. Style: outline, 2px stroke, consistent sizing. Status-ramp icons (pencil/send/clock/check/x/double-check, see Color Palette) sourced from the same set.

---

# Illustrations & Photography

Secondary surfaces only (marketing, onboarding) — not primary operational UI. An expo-pass tool doesn't lean on lifestyle imagery for its working screens.

- Illustration style, if used: minimal, flat, earth tones, no cartoon.
- Photography, if used: real (food, people, craftsmanship, ingredients, hospitality, natural light), never stock-looking.

---

# Motion

Restrained — state transitions and orientation, not delight. No page-load choreography; staff open this app fifty times a shift. Respect `prefers-reduced-motion`.

| Moment | Treatment |
|---|---|
| Status change | 150ms fill cross-fade on the pill |
| Pending approval | Slow pulse on the indicator dot only |
| Row enter/exit | 120ms fade, no slide |
| Bottom sheet | 200ms ease-out translate |
| Everything else | None |

---

# Notifications

Colors resolve through the workflow status ramp — no separate notification palette.

| Semantic | Color |
|---|---|
| Success | `#15803D` (Approved) |
| Warning | `#B45309` (Pending) |
| Error | `#B91C1C` (Rejected) |
| Information | `#1D4ED8` (Submitted) |

Toasts confirm in past tense using the same verb as the triggering action (see Feedback). Notifications never interrupt work unnecessarily.

---

# Charts

Minimal, no heavy gridlines, rounded bars, accessible contrast. Colors drawn from chrome + status ramp only — no separate chart palette, no default chart-library blues. Same rationing rule as buttons: brand colour used sparingly, state colour carries the meaning.

---

# Accessibility

- WCAG AA contrast on all text and status pills, verified in both modes.
- Visible keyboard focus ring (`--ring`, Pandan) on all interactive elements.
- `prefers-reduced-motion` respected.
- All icon-only buttons carry `aria-label`.
- Status never communicated by colour alone.
- Touch targets: 48px minimum everywhere (see Interaction rules).

---

# Responsive Breakpoints

| Breakpoint | Width |
|---|---|
| Mobile | <640px |
| Tablet | 640px |
| Laptop | 1024px |
| Desktop | 1280px |
| Wide | 1536px |

Density mapping (auto, viewport-based per D1): mobile + tablet → `field`; laptop and above → `desk`.

---

# Dark mode trigger

Role-based default + manual override (signed off, Basalt doc §10 D2): Security role defaults to Night pass dark mode; any user can override manually. Adds one settings surface, operationally correct for night patrol and closing shift.

---

# Naming Convention

| | Convention |
|---|---|
| Modules | PascalCase |
| Components | PascalCase |
| Hooks | useCamelCase |
| Functions | camelCase |
| Constants | UPPER_SNAKE_CASE |
| Collections | camelCase |

---

# Anti-patterns

Do not:

- Introduce a second brand colour or a gradient anywhere in the system.
- Use status colours for non-status purposes.
- Place primary actions in the top-right on mobile.
- Fork the component library for a module.
- Add a third font family.
- Hardcode hex values in components.
- Use proportional figures in any numeric column.
- Ship a module without `StatusPill` and `AuditTimeline`.
- Use swipe gestures for approvals.

---

# Overall Experience

NourishOS should feel: glanceable, legible under a service light, dense where it needs to be, calm where it doesn't. Every interaction — back-office desktop or shared outlet tablet — reinforces confidence and speed. State is the loudest thing on screen; brand is rationed, not chrome.
