# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

NourishOS is an internal operational platform for Nourish Group Indonesia, a multi-outlet F&B company — a React SPA frontend backed by **Firebase** (Auth, Firestore, Cloud Functions, Storage). It is in early milestone development. Implemented today: **HR appraisal** (including AI insights), **HR employee database**, **Security patrol/checkpoints**, **Operations** (Lost & Found, Incident Reports, Daily Updates), and the **executive Calendar** — frontend pages plus their Cloud Functions. Every other module (Finance, Purchasing, Inventory, CRM, Documents, Communications, Reports, Settings) is mounted as a `<ModulePlaceholder>` route stub.

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

Cloud Functions live in `functions/`, a separate npm package with its own build and emulator commands — see [functions/CLAUDE.md](functions/CLAUDE.md).

There is **no test runner configured** for the frontend — do not assume `npm test` exists or invent test commands. Verification means: `npm run build` passes at the root, and you exercised the affected flow in `npm run dev`.

Copy `.env.example` → `.env.local` and fill in the `VITE_FIREBASE_*` values from your Firebase project. [src/services/firebase/config.ts](src/services/firebase/config.ts) validates them at module load and throws listing exactly which are missing, so a misconfigured deployment fails loudly rather than deep inside the auth flow. Set `VITE_USE_FIREBASE_EMULATOR=true` to point the app at the local Emulator Suite instead of the live project.

## Current state of the tree (last verified 2026-08-12)

These are facts, not standards — the standards are in "Definition of done". **If your change alters any fact here, update this section in the same commit.**

- **Documents reach the app as ISO strings, not `Timestamp`s.** `queryDocuments`/`subscribeToCollection` take genuine `QueryConstraint`s, so `where`/`orderBy`/`limit` are pushed down to the server instead of filtering a whole fetched collection client-side. [src/services/firestore/normalize.ts](src/services/firestore/normalize.ts) converts `Timestamp` → ISO string at the single read boundary (recursively, for timestamps nested in maps/arrays), which is why `BaseDocument.createdAt` and friends are still typed `string` rather than reverting to `Timestamp` — components, format helpers, and `src/utils/date.ts` never see a `firebase/firestore` type. Cloud Functions still write real `serverTimestamp()`s.
- **`Employee` in `src/types/employee.types.ts` is the shipped shape** (mirrors what the old, now-unported `createEmployee` action used to write: `position`, `employmentStatus`, ISO-string dates). The PRD §12.1 schema (`TaxStatus`, `EmployeeCompensation`, etc.) sits below it in a clearly-marked PLANNED section — do not use those in shipped code paths yet.
- **Vite warns that the main JS chunk is >500 kB** — a warning, not a failure. Code-splitting is future work; don't treat the warning as a regression you introduced.
- **Design tokens migrated to v3 ("Basalt") on 2026-08-11.** `src/styles/globals.css` and `tailwind.config.ts` now carry the Basalt palette (Pandan `#0E4F47` primary, cool paper `#F4F5F3` bg, status colors = workflow ramp: success `#15803D`/warning `#B45309`/error `#B91C1C`/info `#1D4ED8`, radii unchanged 4/8/12/12, shadows re-tinted neutral cool instead of warm), fonts Archivo Variable + IBM Plex Mono via Google Fonts `<link>` in `index.html` (self-hosting via `@fontsource` deferred — no service worker exists yet to justify it, see `ponytail:` comment there), `Button`'s secondary variant is now bordered/sunken neutral (dropped filled Deep Olive — two filled brand-ish buttons per screen violated Basalt's rationing rule), default `Button` height bumped 44px→48px (universal touch minimum). **`StatusPill` is built** (`src/components/ui/status-pill.tsx`) — generic, takes `{tone, icon, label}`, not coupled to any one status enum, so each module owns its own status→tone/icon mapping (`AppraisalStatusBadge` for `ApprovalStatus`; `INCIDENT_STATUS_TONE`/`_ICON` in `incidentFormat.ts` for `IncidentStatus`; `LOST_FOUND_STATUS_TONE`/`_ICON` in `lostFoundFormat.ts` for `LostFoundStatus`). Wired into HR appraisal, both Operations Incidents pages, both Lost & Found pages, and the Daily Updates task-aging badge, replacing the old `Badge`-based status rendering there (severity/value-tier badges are untouched — those aren't lifecycle state). **Not yet migrated**: the field/desk density switch (`data-density` attribute, viewport-auto per D1) doesn't exist in code — components are still single-density; `ApprovalCard`/`AuditTimeline`/`TaskRow`/`MetricTile`/`OutletBadge`/`QueueBanner` (STYLE_GUIDE.md § Shared components) are still unbuilt; the offline queue UX (D3) has no implementation. Dark mode (`.dark` class in globals.css) has Night pass hex values wired but no role-based-default trigger (D2) implemented — it's manual-toggle-only today. See `docs/core/STYLE_GUIDE.md` v3 and `docs/2026-08-11-nourishos-design-system.md` for full spec and signed-off decisions.
- **`src/components/ui/` primitives are native-HTML, never Radix** — `Select`/`Input`/`Checkbox`/`Switch`/`Tabs`/`Tooltip` etc. style native elements rather than pulling in a headless-component dependency. Match that convention when adding one.
- **Operations is shipped end to end.** Real pages under `src/features/operations/*/pages/` are mounted at `/operations/lost-found`, `/operations/incidents`, and `/operations` (Daily Updates feed), backed by `functions/src/operations/{lostFound,incidentReports,dailyUpdates}/` and their `firestore.rules` blocks. Three deliberate deviations from `docs/modules/{lost-and-found-report,incident-report,daily-updates}.md` carry over conceptually into whatever ports these next, made for consistency with what was already shipped rather than gaps: (1) none of the three store an `attachments: string[]` array inline — they follow the existing convention (Employee/Appraisal/PatrolLog) of querying `files` by `resourceType`/`resourceId` instead; (2) Incident Reports routes by `assignedToRole` (a role string) rather than an arbitrary uid picked from that role, and equipment-failure incidents get a `workOrders` doc written inline rather than a full Work Orders module being built for one field; (3) Daily Updates tags Task docs (`tags: ['dailyUpdate']`) instead of adding `TASK_TYPE.DAILY_UPDATE` to the shared enum, matching the "no module-specific task types" rule `src/types/task.types.ts` already documents — `daysOpen`/`escalationLevel`/`carryForwardFromTaskId` were added to `Task` as optional fields only. WhatsApp (Fonnte) notifications from the daily-updates.md notification matrix are out of scope — everything routes through the existing in-app `notifications` collection.
- **There are no `/demo/*` preview routes** — unbuilt modules are `<ModulePlaceholder>` stubs only. Two constants the old demo data owned live in the shipped format modules: `RETENTION_DAYS` in `lostFoundFormat.ts`, `INCIDENT_ROUTING` in `incidentFormat.ts`.
- **`docs/core/HR_OPERATIONS.md` is the HR & Ops PRD (v2.0.0)** — code cites its §9.x/§12.x numbering.
- **The executive Calendar is shipped, and its backend was written fresh (2026-08-13).** `src/features/calendar/` was built during the Apps Script era, so `createCalendarEvent`/`cancelCalendarEvent` never existed as Cloud Functions and `calendarEvents` had no rules block. Both callables now live in [functions/src/shared/calendar/events.ts](functions/src/shared/calendar/events.ts) — the path `calendar.types.ts` already pointed at. Notes: `startAt`/`endAt` are stored as Firestore `Timestamp`s (the client sends ISO strings; the read layer converts back), conflict detection filters the `endAt` side in memory because Firestore allows only one range-filtered field per query, and every event is written `syncStatus: 'skipped'` since Google Calendar push-sync (HR_OPERATIONS.md §14.4) isn't provisioned — a permanently-`pending` row would read as a stuck job.
- **The backend runs on WITA (`Asia/Makassar`, UTC+8), declared explicitly — never inherited.** **Never use `new Date().toISOString().slice(0, 10)` for "today"** — it is always UTC regardless of `TZ`, so between 00:00 and 08:00 WITA it silently returns yesterday and mis-files the day's records. Use the helpers in `functions/src/lib/timestamps.ts`; full rules in [functions/CLAUDE.md](functions/CLAUDE.md).
- **Docs mark unshipped functions/collections/components as "Planned"** and describe the Firebase design, which is what runs. One stale detail: they place Firebase config under `src/`, and it's at the repo root now.

## Documentation is the source of truth

`docs/` (core/, modules/, platform/) holds the authoritative product/architecture specs, and the code is written to trace back to them. Comments cite sections directly, e.g. `// API.md §7`, `// DATABASE.md §23`, `// RBAC.md §4`. **Before changing behavior in a module, read its doc** — and when code and doc disagree, the doc usually reflects intent while the code reflects what's actually shipped.

Docs like `docs/core/ARCHITECTURE.md`, `API.md`, and `RBAC.md` describe the Firebase design (Firestore, Cloud Functions, custom claims, security rules), which is what's actually running. The one stale detail to watch: they place `firebase.json`/`firestore.rules`/`storage.rules` under `src/`, and those now live at the repo root.

If a doc and `package.json` ever disagree, trust `package.json` and this file.

## Architecture

### Client reads, actions write

The single most important rule: **clients never write to Firestore directly.** Every mutation goes through a named Cloud Function; `firestore.rules` enforces this literally — every collection is `allow write: if false`, so the only writer is the Admin SDK. Clients read Firestore directly, governed by the read half of those rules (API.md §19).

- **Frontend → backend:** call callables via `callFunction<TResponse>(name, payload)` ([src/services/api/callFunction.ts](src/services/api/callFunction.ts)), which wraps `httpsCallable` and converts failures into `ApiError` ([src/services/api/errors.ts](src/services/api/errors.ts)) so callers never handle a raw `FunctionsError`. Reads go through [src/services/firestore/queries.ts](src/services/firestore/queries.ts) (`getDocument`/`queryDocuments`) and `subscriptions.ts` (`subscribeToDocument`/`subscribeToCollection`, real `onSnapshot` listeners). Both map snapshots through `normalizeTimestamps`, so every document arrives with ISO-string dates.
- **Backend callable shape:** every callable follows one skeleton — auth check, permission check, validate, mutate, audit, respond. Written out in [functions/CLAUDE.md](functions/CLAUDE.md).
- **`REGION` is `asia-southeast2` (Jakarta)** — set in both `functions/src/lib/admin.ts` and [src/services/firebase/functions.ts](src/services/firebase/functions.ts). These must match or every call fails with `NOT_FOUND`.

### RBAC

Three layers, and they are not interchangeable:

1. **Cloud Functions are the enforcement layer.** `requireActiveUser` re-reads `users/{uid}` and `roles/{roleId}` on every call, so permissions come from live Firestore, never from the caller's token. `requirePermission`/`requireAnyPermission` gate the rest.
2. **`firestore.rules` gates reads only** (every collection is write-denied). Rules read `request.auth.token.role/departmentId/outletId` — custom claims kept in sync with the user doc by `functions/src/auth/syncUserClaims.ts`. Reading claims off the token rather than a `get()` keeps rule evaluation cheap, but it means a role change only reaches the rules after the claim syncs and the client refreshes its token.
3. **The client is UX only.** `AuthProvider` ([src/contexts/AuthProvider.tsx](src/contexts/AuthProvider.tsx)) listens via `onAuthStateChanged`, then holds a live `subscribeToDocument` on `users/{uid}` and loads `roles/{roleId}.permissions` into the Zustand auth store. `ProtectedRoute`/`RoleRoute` ([src/routes/](src/routes/)) and `PermissionGuard` read from that store — they hide UI, they don't secure anything.

### Shared "engines"

`functions/src/shared/` holds the cross-module engines every feature builds on: **approval** (`submitApproval`, `approveStep`, `rejectStep`, `returnForRevision`, `cancelApproval`, plus the `onApprovalRequestResolved` trigger), **tasks** (`createTaskInternal` and its callables), **notifications** (`sendNotificationInternal`, `notifyUsersByRole`), **file storage** (`createFileMetadata`/`deleteFile`, soft-delete only), and **calendar**. Prefer calling the `*Internal` helpers from another function over duplicating their logic — they own the audit and notification side effects.

### Frontend structure

Feature-first under [src/features/](src/features/)`<module>/` (pages, components, hooks, services per feature). The router ([src/routes/routes.tsx](src/routes/routes.tsx)) mounts unbuilt modules as `<ModulePlaceholder>`. `src/components/ui/` is a small shadcn-style primitive set (`components.json`, `class-variance-authority`, `tailwind-merge`); `src/components/shared/` is app-level shared components. Global state is Zustand stores in [src/store/](src/store/) (`authStore`, `themeStore`, `toastStore`, `uiStore`). Path alias `@/` → `src/` (configured in both `vite.config.ts` and `tsconfig.json`).

### Intentional duplication

`functions/` is a separate npm package with its own `tsconfig.json`, so it cannot import from `src/`. `functions/src/lib/collections.ts` and `functions/src/lib/permissions.ts` are hand-mirrored subsets of `src/constants/collections.ts` and `src/constants/permissions.ts`; both files say so in their header comments. Role→permission rows live in Firestore `roles/{roleId}` docs, not in any repo constant. When you change a collection name or permission string, **update both copies** — and remember `firestore.rules` hardcodes collection names and role names a third time.

### Frontend conventions worth keeping in mind

- UI is built from the primitives in `src/components/ui/` plus `src/components/shared/EmptyState`. **There is no Dialog/Modal** — multi-step or confirm flows are separate routed pages, not modals. `Button` has no `asChild`/Slot support — use `useNavigate()` + `onClick`, not `<Button asChild><Link>`.
- Static `/new`-style routes must be registered before `/:id` param routes in the same children array to avoid the param route swallowing them.
- Gotcha: a `const` narrowed by an early-return guard (`if (!source) return ...`) does **not** stay narrowed inside a closure (event handler, callback) defined later in the same component when the variable came from `useState` or `.find()` — TS re-widens it to possibly-`undefined` inside the closure. Extract a plain local (`const id = source.id`) right after the guard and reference that inside the closure instead of the original variable.

## Definition of done

A change is finished only when all of these hold:

1. `npm run build` passes at the root with **zero errors**. The tree is green; keep it green.
2. If you touched `functions/`: `npm --prefix functions run build` passes. It is outside the root `tsc` project, so a root build being green says **nothing** about whether `functions/` compiles.
3. If you added or renamed a collection or permission: update both `src/constants/` and the mirror in `functions/src/lib/`, and add the collection's `firestore.rules` block — a new collection with no rules block falls through to the deny-all match and reads silently fail.
4. Any new callable follows the canonical skeleton — `requireActiveUser` → `requirePermission` → validate (`AppError`) → mutate with `newDocumentBaseFields`/`updatedFields` → `recordAuditEvent` → `successResponse`, wrapped in `try/catch (error) { handleError(error) }` — is exported from `functions/src/index.ts`, and the client reaches it only through `callFunction`.
5. Behavior implemented from a spec carries a doc-section citation comment (`// API.md §7` style), matching the existing convention.
6. Any new query with an equality filter plus a range or `orderBy` on a different field has a matching entry in `firestore.indexes.json`. Firestore fails these at runtime, not build time, so the typecheck will not catch it.
7. You exercised the affected flow — `firebase emulators:start` plus `npm run dev` with `VITE_USE_FIREBASE_EMULATOR=true` is the safe way; there is no frontend test suite to lean on.
8. This file's "Current state" section is updated if your change altered any fact in it.
9. Commit messages follow Conventional Commits going forward: `type(scope): summary` (e.g. `feat(hr): ...`, `fix(approval): ...`, `docs: ...`). History before July 2026 is mixed — match the convention, not the history.

## Gotchas

- **A new collection with no `firestore.rules` block is unreadable, not open.** The deny-all `match /{document=**}` at the bottom catches anything that falls through, so the symptom is an empty list or a permission error in the console, not a security hole.
- **Missing composite indexes fail at runtime only.** Firestore rejects an unindexed equality+range/orderBy query with an error containing a URL that creates the index — but add it to `firestore.indexes.json` rather than clicking through, or it won't exist in the next environment.
- **`REGION` must match on both sides.** `functions/src/lib/admin.ts` and `src/services/firebase/functions.ts` both hardcode `asia-southeast2`; a mismatch surfaces as every callable failing with `NOT_FOUND`, which reads like a missing function rather than a config error.
- **Custom claims lag the user doc.** `syncUserClaims` updates the token claims `firestore.rules` reads, but an already-issued ID token keeps its old claims until it refreshes (~1h, or on a forced refresh). Cloud Functions are unaffected — `requireActiveUser` re-reads Firestore every call — so a role change takes effect for writes immediately but for reads only after the token turns over.
- Missing `VITE_FIREBASE_*` vars throw at module load from [src/services/firebase/config.ts](src/services/firebase/config.ts), listing exactly which are absent. If a deployed build fails on sign-in, check the deployment's env vars (e.g. Vercel project settings), not just `.env.local`.
- `strict` TypeScript is on for both the frontend and `functions/`; both builds fail on any type error.
- `npm run lint` fails with "eslint is not recognized" — eslint is not in `devDependencies` and there is no config file, even though the `lint` script itself references real eslint flags. `npm run build` (tsc + vite) is the quality gate until lint is actually scaffolded.
- `generateAppraisalInsights` needs an `ANTHROPIC_API_KEY` secret (`functions/src/lib/secrets.ts`, set via `firebase functions:secrets:set`). Without it the callable deploys but fails at call time.
