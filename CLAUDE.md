# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

NourishOS is an internal operational platform for Nourish Group Indonesia, a multi-outlet F&B company — a React SPA frontend backed by Firebase (Auth, Firestore, Cloud Functions, Storage). It is in early milestone development. Implemented today: **HR appraisal** (including an AI-insights UI), **HR employee database**, **Security patrol/checkpoints**, and **Operations** (Lost & Found, Incident Reports, Daily Updates). Every other module (Finance, Purchasing, Inventory, CRM, Documents, Communications, Reports, Settings) is mounted as a `<ModulePlaceholder>` route stub.

PWA support (manifest, service worker) is **planned but not built** — there is no `vite-plugin-pwa` yet. Treat it as a plain Vite SPA today; don't claim or rely on offline/installable behavior until that lands.

## Environment

Development happens on Windows 11 with PowerShell as the shell. Write commands in PowerShell syntax (`;` chaining, `$env:VAR`, no heredocs into bash).

## Commands

Frontend (repo root):

```
npm run dev      # Vite dev server on http://localhost:5173
npm run build    # tsc (typecheck) then vite build — fails on any type error
npm run preview  # serve the production build
npm run lint     # ASPIRATIONAL — eslint is not installed and has no config; this fails today
```

Functions (`functions/`, Node 20, firebase-functions v6 / firebase-admin v12 / @anthropic-ai/sdk):

```
npm run build    # tsc → lib/
npm run serve    # build + functions emulator
npm run deploy   # firebase deploy --only functions
```

There is **no test runner configured** — do not assume `npm test` exists or invent test commands. Verification means: typecheck/build passes, and you exercised the affected flow in the dev server (against emulators where a backend is involved).

Firebase emulators are configured (`src/firebase.json`): auth 9099, functions 5001, firestore 8080, storage 9199, UI 4000. Set `VITE_USE_FIREBASE_EMULATOR=true` in `.env.local` to point the app at them (`src/services/firebase/config.ts` reads it; must be the literal string `'true'`). Copy `.env.example` → `.env.local` for the `VITE_FIREBASE_*` config.

## Current state of the tree (last verified 2026-07-18)

These are facts, not standards — the standards are in "Definition of done". **If your change alters any fact here, update this section in the same commit.**

- **Both builds are green**: `npm run build` at the root (tsc + vite) and `npm run build` inside `functions/` both pass with zero errors.
- **Approval routes are server-owned.** The approval engine was rewritten (July 2026): routes live only in [functions/src/shared/approval/routes.ts](functions/src/shared/approval/routes.ts), clients submit a resource identity only (never a `steps` array), self-approval is blocked (approval_engine.md §23, superAdmin override is audit-logged as `approve_override`), and every state change (approve/reject/return/cancel) runs in a Firestore transaction that also closes out the live `approvalSteps` doc. Adding a new approvable resource = adding a route entry + registering a resolved-handler (see `hr/appraisal/index.ts`).
- **`Employee` in `src/types/employee.types.ts` is the shipped shape** (mirrors what `createEmployee` writes: `position`, `employmentStatus`, ISO-string dates). The PRD §12.1 schema (`TaxStatus`, `EmployeeCompensation`, etc.) sits below it in a clearly-marked PLANNED section — do not use those in shipped code paths yet.
- **Vite warns that the main JS chunk is >500 kB** — a warning, not a failure. Code-splitting is future work; don't treat the warning as a regression you introduced.
- **Design tokens migrated to v3 ("Basalt") on 2026-08-11.** `src/styles/globals.css` and `tailwind.config.ts` now carry the Basalt palette (Pandan `#0E4F47` primary, cool paper `#F4F5F3` bg, status colors = workflow ramp: success `#15803D`/warning `#B45309`/error `#B91C1C`/info `#1D4ED8`, radii unchanged 4/8/12/12, shadows re-tinted neutral cool instead of warm), fonts Archivo Variable + IBM Plex Mono via Google Fonts `<link>` in `index.html` (self-hosting via `@fontsource` deferred — no service worker exists yet to justify it, see `ponytail:` comment there), `Button`'s secondary variant is now bordered/sunken neutral (dropped filled Deep Olive — two filled brand-ish buttons per screen violated Basalt's rationing rule), default `Button` height bumped 44px→48px (universal touch minimum). **`StatusPill` is built** (`src/components/ui/status-pill.tsx`) — generic, takes `{tone, icon, label}`, not coupled to any one status enum, so each module owns its own status→tone/icon mapping (`AppraisalStatusBadge` for `ApprovalStatus`; `INCIDENT_STATUS_TONE`/`_ICON` in `incidentFormat.ts` for `IncidentStatus`; `LOST_FOUND_STATUS_TONE`/`_ICON` in `lostFoundFormat.ts` for `LostFoundStatus`). Wired into HR appraisal, both Operations Incidents pages, both Lost & Found pages, and the Daily Updates task-aging badge, replacing the old `Badge`-based status rendering there (severity/value-tier badges are untouched — those aren't lifecycle state). **Not yet migrated**: the field/desk density switch (`data-density` attribute, viewport-auto per D1) doesn't exist in code — components are still single-density; `ApprovalCard`/`AuditTimeline`/`TaskRow`/`MetricTile`/`OutletBadge`/`QueueBanner` (STYLE_GUIDE.md § Shared components) are still unbuilt; the offline queue UX (D3) has no implementation. Dark mode (`.dark` class in globals.css) has Night pass hex values wired but no role-based-default trigger (D2) implemented — it's manual-toggle-only today. See `docs/core/STYLE_GUIDE.md` v3 and `docs/2026-08-11-nourishos-design-system.md` for full spec and signed-off decisions.
- **`src/components/ui/` gained Avatar, Checkbox, Radio, Switch, Breadcrumb, Tooltip, Timeline, and Tabs** (2026-07-18) — all native-HTML, no new dependency (matches the existing `Select`/`Input` convention of styling native elements over pulling in Radix). `EmployeeListPage`/`EmployeeProfilePage` now use `Avatar` for the person-initials circle, and `EmployeeProfilePage`'s activity feed uses `Timeline`, replacing hand-rolled duplicates. `DESIGN.md` §27 / `COMPONENT_LIBRARY.md` §9 no longer list these as planned.
- **Operations is shipped** (2026-07-18): `functions/src/operations/{lostFound,incidentReports,dailyUpdates}/` are real Cloud Functions with matching `src/firestore.rules` blocks and real (non-demo) pages under `src/features/operations/*/pages/`, mounted at `/operations/lost-found`, `/operations/incidents`, and `/operations` (Daily Updates feed, replacing the old flat `ModulePlaceholder`). Three deliberate deviations from `docs/modules/{lost-and-found-report,incident-report,daily-updates}.md`, made for consistency with what's already shipped rather than gaps: (1) none of the three store an `attachments: string[]` array inline — they follow the existing convention (Employee/Appraisal/PatrolLog) of querying `files` by `resourceType`/`resourceId` instead; (2) Incident Reports routes by `assignedToRole` (a role string) rather than an arbitrary uid picked from that role, and equipment-failure incidents get a `workOrders` doc written inline rather than a full Work Orders module being built for one field; (3) Daily Updates tags Task docs (`tags: ['dailyUpdate']`) instead of adding `TASK_TYPE.DAILY_UPDATE` to the shared enum, matching the "no module-specific task types" rule `src/types/task.types.ts` already documents — `daysOpen`/`escalationLevel`/`carryForwardFromTaskId` were added to `Task` as optional fields only. WhatsApp (Fonnte) notifications from the daily-updates.md notification matrix are out of scope — everything routes through the existing in-app `notifications` collection.
- **The `/demo/*` mock-up previews were removed** (2026-07-28): every `*Demo*` page/data/format file, `src/features/demo/`, and all `/demo` routes are gone. Unbuilt modules are `<ModulePlaceholder>` stubs only. Two constants the demo data owned moved to the shipped format modules — `RETENTION_DAYS` → `lostFoundFormat.ts`, `INCIDENT_ROUTING` → `incidentFormat.ts`.
- **`docs/core/HR_OPERATIONS.md` is the refined HR & Ops PRD (v2.0.0)** — it replaced its own v1 draft; code cites its §9.x/§12.x numbering. The one-off `docs/core/PRD v2.md` file no longer exists.
- **Docs were reality-audited July 2026**: platform/core docs mark unshipped functions/collections/components as "Planned"; `docs/CLAUDE` deleted; `docs/modules/puchasing.md` renamed to `purchasing.md`; `src/firestore.rules` read-grants fixed (`finance` role can read approvalRequests, bakery/wholefood leaders can read their department's employees).

## Documentation is the source of truth

`docs/` (core/, modules/, platform/) holds the authoritative product/architecture specs, and the code is written to trace back to them. Comments cite sections directly, e.g. `// API.md §7`, `// DATABASE.md §23`, `// RBAC.md §4`. **Before changing behavior in a module, read its doc** — and when code and doc disagree, the doc usually reflects intent while the code reflects what's actually shipped.

The docs were reality-audited in July 2026: stack claims now match `package.json`, unshipped functions/collections/components are explicitly marked "Planned", and the old misleading pair is gone (`docs/README.md` was rewritten to the real stack; `docs/CLAUDE`, the superseded extensionless guidelines doc, was deleted — git history keeps it). If a doc and `package.json` ever disagree again, trust `package.json` and this file.

## Architecture

### Client reads, Functions write

The single most important rule: **clients never write to Firestore directly.** Every `match` in `firestore.rules` is `allow write: if false`, with a default-deny catch-all at the bottom. All mutations go through Cloud Functions. Clients read Firestore directly, gated by RBAC conditions in the rules.

- **Frontend → backend:** call functions via `callFunction<TResponse>(name, payload)` ([src/services/api/callFunction.ts](src/services/api/callFunction.ts)), never `httpsCallable` directly. It unwraps the `{success, message, data}` success envelope and normalizes all failures to a thrown `ApiError`.
- **Backend function shape:** every callable in [functions/src/](functions/src/) follows the same skeleton — `onCall({ region: REGION }, ...)`, body wrapped in `try/catch`, `requireActiveUser(request)` + `requirePermission(user, PERMISSIONS.X)` for RBAC, mutate, `recordAuditEvent(...)`, return `successResponse(data, message)`; the `catch` calls `handleError(error)`. Throw `AppError(code, message)` for failures (it maps to `HttpsError`). See [functions/src/hr/appraisal/submitAppraisal.ts](functions/src/hr/appraisal/submitAppraisal.ts) as the canonical example.
- All shared function helpers are re-exported from [functions/src/lib/index.ts](functions/src/lib/index.ts) (`db`, `COLLECTIONS`, `REGION`, RBAC guards, `AppError`, `handleError`, `successResponse`, `recordAuditEvent`, `newDocumentBaseFields`/`updatedFields`, etc.). Import from `'../../lib'`, not individual files.

### RBAC

Authorization rides on Firebase custom claims `{role, departmentId, outletId}`, kept in sync with the `users/{uid}` doc by `syncUserClaims`. Firestore rules read the claim off the token (no cross-document `get()`) for speed. On the client, `AuthProvider` ([src/contexts/AuthProvider.tsx](src/contexts/AuthProvider.tsx)) subscribes to the user profile live, loads the permission array from `roles/{roleId}`, and pushes both into the Zustand auth store. Route protection is `ProtectedRoute` + `RoleRoute` under [src/routes/](src/routes/); component-level gating uses `PermissionGuard`.

### Shared "engines"

Cross-module backend capabilities live under [functions/src/shared/](functions/src/shared/) and are meant to be reused, not reimplemented per module: **approval engine**, **task engine**, **notifications**, **file storage**. Example: HR appraisal submission validates its own scores, then calls `submitApprovalInternal(...)`, which resolves the server-owned route for `hr/appraisal` (routes.ts) and drives a sequential role-based approval (HR Manager → GM). Internal (non-callable) entry points exist for cross-function use: `submitApprovalInternal`, `createTaskInternal`, `sendNotificationInternal`, `notifyUsersByRole`. When adding a module that needs approvals/tasks/notifications, wire into these rather than writing new flows.

### Frontend structure

Feature-first under [src/features/](src/features/)`<module>/` (pages, components, hooks, services per feature). The router ([src/routes/routes.tsx](src/routes/routes.tsx)) mounts unbuilt modules as `<ModulePlaceholder>`. `src/components/ui/` is a small shadcn-style primitive set (`components.json`, `class-variance-authority`, `tailwind-merge`); `src/components/shared/` is app-level shared components. Global state is Zustand stores in [src/store/](src/store/) (`authStore`, `themeStore`, `toastStore`, `uiStore`). Path alias `@/` → `src/` (configured in both `vite.config.ts` and `tsconfig.json`).

### Intentional duplication

`src/constants/` (e.g. `collections.ts`, `permissions.ts`, `roles.ts`) is mirrored by a subset in `functions/src/lib/` because frontend and functions are separate TypeScript projects that can't share imports. This duplication is deliberate and flagged in code comments — when you change a collection name, permission string, or role, **update both sides.**

Firestore rules live in **one place only**: `src/firestore.rules` (`src/firebase.json` resolves paths relative to `src/`, so that copy is what a deploy consumes). A root-level duplicate used to exist and was deleted — don't recreate it.

### Frontend conventions worth keeping in mind

- UI is built from the primitives in `src/components/ui/` plus `src/components/shared/EmptyState`. **There is no Dialog/Modal** — multi-step or confirm flows are separate routed pages, not modals. `Button` has no `asChild`/Slot support — use `useNavigate()` + `onClick`, not `<Button asChild><Link>`.
- Static `/new`-style routes must be registered before `/:id` param routes in the same children array to avoid the param route swallowing them.
- Gotcha: a `const` narrowed by an early-return guard (`if (!source) return ...`) does **not** stay narrowed inside a closure (event handler, callback) defined later in the same component when the variable came from `useState` or `.find()` — TS re-widens it to possibly-`undefined` inside the closure. Extract a plain local (`const id = source.id`) right after the guard and reference that inside the closure instead of the original variable.

## Definition of done

A change is finished only when all of these hold:

1. `npm run build` passes at the root with **zero errors**. The tree is green; keep it green.
2. If you touched `functions/`: `npm run build` inside `functions/` also passes with zero errors.
3. If you added or renamed a collection, permission, or role: both `src/constants/` and `functions/src/lib/` are updated, and every touched collection has a `match` block with `allow write: if false` in `src/firestore.rules`.
4. Any new callable follows the canonical skeleton (RBAC guard → mutate → audit → `successResponse`), is exported from `functions/src/index.ts`, and the client reaches it only through `callFunction`.
5. Behavior implemented from a spec carries a doc-section citation comment (`// API.md §7` style), matching the existing convention.
6. You exercised the affected flow in `npm run dev` (against emulators when a backend is involved) — there is no test suite to lean on.
7. This file's "Current state" section is updated if your change altered any fact in it.
8. Commit messages follow Conventional Commits going forward: `type(scope): summary` (e.g. `feat(hr): ...`, `fix(approval): ...`, `docs: ...`). History before July 2026 is mixed — match the convention, not the history.

## Gotchas

- Firebase config lives at `src/firebase.json`, so its relative paths resolve against `src/` — `src/firestore.rules`, `src/storage.rules`, and `src/firestore.indexes.json` are the deployed ones. (A root `firestore.indexes.json` also exists; the `src/` copy wins for deploys driven by `src/firebase.json`.)
- `strict` TypeScript is on in both projects; the build fails on any type error.
- `npm run lint` fails with "eslint is not recognized" — eslint is not in `devDependencies` and there is no config file. `npm run build` (tsc + vite) is the quality gate until lint is scaffolded.
- `generateAppraisalInsights` calls the Anthropic API (`@anthropic-ai/sdk`, model `claude-opus-4-8`) using the `ANTHROPIC_API_KEY` Firebase Functions secret ([functions/src/lib/secrets.ts](functions/src/lib/secrets.ts)). Provision it with `firebase functions:secrets:set ANTHROPIC_API_KEY` before deploying; never hardcode keys, and any callable using it must declare `secrets: [ANTHROPIC_API_KEY]` in its `onCall` options.
- Firestore custom claims lag: `syncUserClaims` updates the Auth token claims when `users/{uid}` changes, but an already-signed-in user keeps old claims until their ID token refreshes (~1h). Cloud Functions are unaffected — `requireActiveUser` reads the live profile doc.
