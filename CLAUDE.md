# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

NourishOS is an internal operational platform for Nourish Group Indonesia, a multi-outlet F&B company — a React SPA frontend backed by **Firebase** (Auth, Firestore, Cloud Functions, Storage). It is in early milestone development. Two further public-facing apps ship from this same repo against the same Firebase project: the **Nourish Career Portal** (`portal/`, candidate intake — see `src/features/recruitment/CLAUDE.md`) and the **New-Hire Welcome Portal** (`welcome/`, magic-link onboarding intake — see `src/features/hr/CLAUDE.md`). Both are token-authenticated with no Firebase Auth account. Implemented today: **HR appraisal** (including AI insights), **HR employee database**, **HR recruitment**, **HR Inventory** (uniform & asset stock), **HR Employment Contracts** (versioned history plus GM→Director signing), **HR Training** (catalog, assignment, completion), **HR Employee Engagement** (company events/activities, cost and participants), **HR Offboarding & Exit Interviews** (exit checklist, clearance statement, F009 exit interview survey), **HR Reports**, **Security** (patrol/checkpoints, Fire Extinguishers), **Operations** (Lost & Found, Incident Reports, Daily Updates, Opening/Closing Shift Reports, Projects), **Engineering** (Work Orders, Equipment Master; Preventive Maintenance is a nav stub), **Documents** (Job Descriptions, SOP Library), **Communications** (Announcements, Tasks, Team Chat, Employee Communication), **Finance** (Expense Requests), the **executive Calendar** (with Google Calendar sync), **Reports** (GM Flash Report), **Settings** (Roles & Permissions, Communication Settings), and the **dashboard** — frontend pages plus their Cloud Functions. `<ModulePlaceholder>` is in use again as of the 2026-08-25 nav restructure — one stub route remains (`/engineering/preventive-maintenance`), listed under "Current state of the tree" below. **There is no top-level Purchasing, Inventory, CRM, or Departments module** — Purchasing/Inventory/CRM were cut from scope (2026-08-15); Departments > People shipped 2026-08-16 and was deleted again the same day (see "Current state of the tree"). HR Inventory at `/hr/inventory` is the only inventory concept in the app.

PWA support (manifest, service worker) is **planned but not built** — there is no `vite-plugin-pwa` yet. Treat it as a plain Vite SPA today; don't claim or rely on offline/installable behavior until that lands.

## Environment

Development happens on Windows 11 with PowerShell as the shell. Write commands in PowerShell syntax (`;` chaining, `$env:VAR`, no heredocs into bash).

## Commands

Frontend (repo root):

Standard Vite scripts (`dev`/`build`/`preview` — see `package.json`), plus:

```
npm test         # pure unit tests (node:test) — builds functions/, then runs functions/test/*.test.mjs
npm run test:rules  # firestore.rules tests — starts the Firestore emulator (needs JAVA_HOME), runs, tears down
npm run check    # static invariant checks — mirrors, rules blocks, indexes, region. No emulator, no build.
npm run lint     # ASPIRATIONAL — eslint is not installed and has no config; this fails today
```

Cloud Functions live in `functions/`, a separate npm package with its own build and emulator commands — see [functions/CLAUDE.md](functions/CLAUDE.md).

There is **no frontend test runner** — nothing renders a component or drives a page in this repo. `npm test` exists but covers the backend's pure logic only (see below). Verification means: `npm run build` passes at the root, `npm test` and `npm run check` pass, and you exercised the affected flow in `npm run dev`.

`npm test` builds `functions/` and runs `node --test "functions/test/*.test.mjs"` — pure logic only, no emulator or JVM, on Node's built-in runner (**no test framework was added and none should be**). Keep the glob, not the directory form: the bare `*.mjs` scripts in `functions/test/` are the emulator/seed tier, run by hand. When a module mixes pure validation with `db` access, split the pure half out the way `hr/attendance/validate.ts` does. `functions/test/README.md` has the per-file table.

`npm run check` (`functions/test/invariants.mjs`) reads the `.ts` sources as text and asserts what tsc cannot see: the hand-mirrored `src/constants/*` and `functions/src/lib/*` pairs agree, every queried collection has a `firestore.rules` block, every enforced permission string reaches a role in `ROLE_PERMISSIONS`, every equality+range/`orderBy` query has a `firestore.indexes.json` entry (definition of done #6), and `REGION` matches. Its parsers self-check, and a few call sites are not statically resolvable (it says so on every run), so coverage is partial by construction. **Index matching is shape-based**: the index must lead with the equality fields followed directly by the range/`orderBy` fields, and the scan walks each `.collection()` chain, not just `.orderBy(` calls. A missing index fails every call in production with `FAILED_PRECONDITION` (it once broke every candidate `startApplication`, and every Appraisal Template "Generate").

Copy `.env.example` → `.env.local` and fill in the `VITE_FIREBASE_*` values from your Firebase project. [src/services/firebase/config.ts](src/services/firebase/config.ts) validates them at module load and throws listing exactly which are missing, so a misconfigured deployment fails loudly rather than deep inside the auth flow. Set `VITE_USE_FIREBASE_EMULATOR=true` to point the app at the local Emulator Suite instead of the live project.

**Use `npm run dev:emulator` (not `npm run dev`) when working against the Emulator Suite.** It runs `vite --mode emulator`, which loads `.env.emulator.local` on top of `.env.local` and overrides `VITE_FIREBASE_PROJECT_ID` to `demo-nourishos` — matching `firebase emulators:start --project demo-nourishos`. Under plain `npm run dev` the project id stays `nourishos-prod` from `.env.local`, and since the functions emulator serves callables under a project-scoped path, **every callable fails with `NOT_FOUND`** while Firestore reads keep working (the Firestore emulator serves any project id, just in a separate namespace). That reads like a missing function rather than a config mismatch.

## Current state of the tree (last verified 2026-11-02)

Facts, not standards — the standards are in "Definition of done". **If your change alters one, update this section in the same commit.** Per-module history (what shipped when, and why it deviates from the PRDs) lives in `src/features/<module>/CLAUDE.md` and `git log`; only cross-cutting facts are kept here. Implemented modules: HR (appraisal v2, employee database, recruitment, inventory, contracts, training, engagement, offboarding, attendance, payroll, reports), Security, Operations, Engineering (Equipment Master; Preventive Maintenance is the one `<ModulePlaceholder>` stub, `/engineering/preventive-maintenance`), Documents (including Nourish's Bible Phase 1), Communications, Finance (expense requests), Calendar, Reports, Settings, Dashboard. There is no top-level Purchasing, Inventory, CRM or Departments module — HR Inventory at `/hr/inventory` is the only inventory concept. PWA support is **planned, not built** (no `vite-plugin-pwa`); don't rely on offline behavior.

**Navigation and routing**
- The sidebar has 11 top-level modules: Dashboard · People · Calendar · Operations · Engineering · Security · Finance · Documents · Communications · Reports · Settings. `NAV_ITEMS` in `src/components/layout/Sidebar.tsx` takes optional `children`; **role filtering lives on each nav child, not the group** (a group renders if the parent or any child passes). "People" is the HR group, and Positions / Recruitment / Employee Communication nest under it in the nav only — their URLs did not move and they are deliberately outside `/hr`'s `RoleRoute` gate.
- Work Orders moved to `/engineering/work-orders`; `/operations/work-orders/*` redirects via `WorkOrderRedirect`. The backend (`functions/src/operations/workOrders/`, `workOrders.*` permissions) did not move.
- Team Chat stays out of the nav (header `ChatBell`). The header search navigates to `/search?q=…` and fires five independent prefix queries (`searchService.ts`); Work Orders is not in the sweep.
- `/documents/bible` is the repo's first `React.lazy` route and the first rendered outside `DashboardLayout` while inside `ProtectedRoute` (an immersive reader). `/documents/company-forms` redirects into it; `new` and `:id/edit` stay.

**Data and UI conventions**
- Documents reach the app as ISO strings, not `Timestamp`s (`src/services/firestore/normalize.ts` converts at the single read boundary), which is why `BaseDocument.createdAt` is typed `string`.
- `src/components/ui/` primitives are native HTML, never Radix. There is no Dialog/Modal, no animation library, no PDF library, no spreadsheet parser, and no frontend test runner. Match these when adding UI.
- Design tokens are "Basalt" v3 (`docs/2026-08-11-nourishos-design-system.md`; Pandan `#0E4F47`, Archivo + IBM Plex Mono). **Scoped exceptions** to Basalt's no-gradient/no-motion rules exist only in `welcome/` (v1.2) and the Bible reader (v1.3); nowhere else. Not built: the `data-density` switch, `ApprovalCard`/`AuditTimeline`/`TaskRow`/`MetricTile`/`OutletBadge`/`QueueBanner`, offline queue UX, and role-based dark-mode default.
- **EN/ID language toggle (2026-11-04, HR_OPERATIONS.md §16.4)**: header button, `useLanguageStore` (`src/store/languageStore.ts`, browser localStorage `nourishos-lang`, no profile sync), helpers in `src/lib/i18n.ts` (`Lang`, `Pair`, `t`, `tOrEn`, `useLang`). No i18n library. Translated so far: header, sidebar (`NAV` in `src/constants/strings.ts`), dashboard widget titles/empty states/KPIs/greeting, the Bible reader (shares the toggle), and data already stored as `{en, id}` (positions, appraisal criteria, training titles — `tOrEn` falls back to English while `id` is null/empty — APAR checklist, attendance codes). **Every other module page is still English-only**; translate a module at a time with `const lang = useLang()` + `t(pair, lang)`. Read the language through `useLang()` in the component, never `getState()`, or the page won't re-render on toggle.
- The main JS chunk is >500 kB — a warning, not a regression you introduced.
- `docs/core/HR_OPERATIONS.md` is the HR & Ops PRD v2.0.0; code cites its §9.x/§12.x numbering.

**RBAC and rules**
- `superAdmin` bypasses every permission-string check (`requirePermission`/`requireAnyPermission` return early; `AuthProvider` mirrors it). It is absent from `ROLE_PERMISSIONS` by design, and `firestore.rules` role lists include it explicitly.
- **Standing gotcha — new permission strings never reach existing roles.** `ROLE_PERMISSIONS` only seeds a `roles/{roleId}` doc the first time the role is claimed, so every new string needs `node functions/tools/sync-role-permissions.mjs --prefix <module>. --apply` (or a hand edit in Settings > Roles & Permissions). The callable enforces a string nobody holds and the feature is invisible, with no error.
- The role set is the org role ladder (46 roles, outlet-scoped via `rolesFor(outletId, departmentId)`; detail in `src/features/auth/CLAUDE.md`). `outletManager` and `staff` were removed, and four leader ids were renamed (`floorLeader`→`restaurantSupervisor`, `barLeader`→`barManager`, `kitchenLeader`→`headChef`, `bakeryLeader`→`chiefBaker`); `OUTLET_LEAD_ROLE` in `functions/src/lib/organization.ts` resolves an outlet's own lead. `functions/tools/migrate-role-ids.mjs` is the live-data fixup and **has not been run against any real environment**.
- Module access for `/hr` is three separate hardcoded allow-lists (`HR_REPORT_ROLES` in `src/constants/roles.ts`, `isHrOrAbove()`, and the `employees`/`disciplinaryActions`/`exitInterviews` rules). Granting `employees.*` permissions alone does not open a page; a new HR role must be added to all of them.
- Group-level roles (`groupOperationalManager`, `groupBeverageManager`) read cross-outlet only through explicit `firestore.rules` branches — they are deliberately **not** in `CROSS_OUTLET_ROLES`/`isElevated()`/`isHrOrAbove()`; widening that means editing the rules branches in the same commit.

**Backend**
- The backend runs on WITA (`Asia/Makassar`) — see `functions/CLAUDE.md`. The Cloud Functions runtime is **Node 22** (`firebase.json` `nodejs22`, `functions/package.json` `engines.node: "22"`); Node 20 was decommissioned 2026-10-30.
- Secrets to provision with `firebase functions:secrets:set`: `ANTHROPIC_API_KEY`, `FONNTE_TOKEN`, `GOOGLE_CALENDAR_SA_KEY` (plus `integrations/fonnte` and `integrations/googleCalendar` config docs). Without them AI insights, WhatsApp and calendar sync are silent no-ops. `google-auth-library` is a direct dependency of `functions/`; **`googleapis` is deliberately not installed**.
- Approval Engine (`functions/src/shared/approval/`): 14 routes in `routes.ts`; `ApprovalStepDefinition.approverOutletId` scopes a step to one outlet's approvers. Approve/Reject lives on each routed record's detail page and on the dashboard's Pending Approvals widget (both gated by `approvalService.canActOnApprovalRequest`, UX only — the callable re-verifies). `hr/contract`, `hr/contractSigning` and `calendar/companyEvent` have no detail page, so the widget is their only decision point.
- Known launch-time gaps: nothing populates `users/{uid}.employeeId` (so on-account self-acknowledgement and several own-record paths fall back to on-device/HR actions, and Bible access treats every user as full staff); `migrateEmployeePositions` and `seedPositions` need running in each real environment; the appraisal and Bible flows were verified by builds and pure tests, not end-to-end against the emulator.

**Public portals and App Check**
- There are **three Vite apps**: the internal SPA, `portal/` (Candidate Career Portal) and `welcome/` (New-Hire Welcome Portal). The latter two share the root `node_modules`, `tailwind.config.ts` and `src/styles/globals.css`, import nothing else from `src/`, authenticate by a hashed magic-link token (no Firebase Auth account), and every callable they use is unauthenticated, so `resolveCandidateByToken` / `resolveWelcomeInvite` are the trust boundary. The shared crypto is `functions/src/lib/magicLink.ts`; **`node functions/test/portal-flow.mjs` is the regression gate** for it. Scripts: `dev:portal`/`build:portal`, `dev:welcome`/`build:welcome`. Both are deployed to Vercel (`ngi-career-portal`, `ngi-welcome-portal`).
- **App Check is wired client-side but NOT enforced (rolled back 2026-11-04).** Enforcement shipped in `485755b` and was deployed while the App Check app was still *Unregistered*: every portal call failed with `unauthenticated` and both portals showed "Unauthenticated" to every candidate and new hire. Both portals now use **`ReCaptchaEnterpriseProvider`** (Google Cloud Fraud Defense, formerly reCAPTCHA Enterprise — classic v3 is deprecated) with `VITE_RECAPTCHA_SITE_KEY` holding the Fraud Defense **Key ID** (a score-based Web key, registered under Firebase Console > App Check > Apps > NourishOS > Fraud Defense on 2026-11-04). None of the 13 portal callables sets `enforceAppCheck`. Re-add `enforceAppCheck: true` only after real portal traffic shows `jsonPayload.verifications.app="VALID"` in Cloud Logging (`resource.type="cloud_run_revision"`) — the App Check > APIs page has no Cloud Functions metrics, and its Storage/Firestore/Auth rows show the **internal SPA**, which has no App Check at all, so never press Enforce there.

**Deploys**
- `firebase deploy --only functions,firestore:rules,firestore:indexes` is run **by hand**. The CI workflow (`.github/workflows/deploy-firebase.yml`, Node 22 on the runner) runs `npm test` and `npm run check` but cannot authenticate: the `FIREBASE_SERVICE_ACCOUNT` secret does not hold valid JSON. Until it is the raw JSON key text, merging a backend change deploys nothing, and the symptom of skipping a manual deploy is every new callable failing with `NOT_FOUND` while the UI looks fine. Setting a callable's public invoker needs Owner or `roles/cloudfunctions.admin`.
- Per-module "still needs deploy / role sync / seed run" notes are in each `src/features/<module>/CLAUDE.md`.

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
2. **`firestore.rules` gates reads only** (every collection is write-denied). Rules read `request.auth.token.role/departmentId/outletId` — custom claims kept in sync with the user doc by `functions/src/auth/syncUserClaims.ts`. Reading claims off the token rather than a `get()` keeps rule evaluation cheap, but it means a role change only reaches the rules after the claim syncs and the client refreshes its token. **Covered by `npm run test:rules`** (`functions/test/rules.mjs`, added 2026-08-29): 86 tests over the sensitive branches — write-denial on every collection including for superAdmin, the `isIssued`/`isApproved` approval gates, the appraisal-recommendation self-exclusion, `disciplinaryActions`' three branches, and outlet/department scoping. It mints unsigned JWTs against the Firestore emulator's REST API rather than adding `@firebase/rules-unit-testing`, so it needs no dependency and no Auth emulator. If you change a read rule, run it.

**A `list` is not a batch of `get`s, and this is the most common way to break a page here.** On a query, rules are evaluated against the *query*, not each document: `resource.data.x == y` must be **provable** from the query's own constraints, so a query that omits the constraint is denied *outright* rather than returning the subset that would have passed. A service that fetches broadly and filters client-side against an outlet/department-scoped rule therefore returns nothing at all. `rules.mjs` covers this by issuing the exact queries `src/` services send, each paired with an assertion that the unconstrained form is still denied. **This layer found two live bugs when it was added on 2026-08-29, both now fixed**: `equipmentService.subscribeToRegister` sent only `orderBy('assetCode')` and filtered outlet client-side, so the register was denied outright for every non-elevated user (and silently — it passed no `onError`); and Employee Communication's own-record scope filtered `employeeUid` without `releasedToEmployee`, which the rule also requires, so an employee never saw their own released records. **When you write an outlet- or department-scoped service function, put the scoping filter on the query, not in a client-side `.filter()`.** The client-side pass is fine only for fields no rule mentions.
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
- **A hook that returns a fresh object literal must never appear in a dependency array.** `useToast()` did both for months (2026-09-08): its four `useCallback`s were stable but the object wrapping them was new every render, and seven edit forms across HR, Communications and Finance listed `toast` in their record-loading effect's deps. That effect therefore re-ran after every render — re-fetching the record and re-seeding the form from the server in an unbounded loop, so any field the user changed was reverted within one round trip. It surfaced as "the Size dropdown always jumps back to the first size" on Receive Stock, which reads like a `<Select>` bug rather than a hook-identity one. `useToast` now memoizes its return. `useAuth`/`usePermissions`/`useRole`/`useOutlet`/`useDepartment`/`useAsync` return unstable objects too — harmless only because nothing currently depends on their identity, so memoize before putting one in a dep array.
- `strict` TypeScript is on for both the frontend and `functions/`; both builds fail on any type error.
- `npm run lint` fails with "eslint is not recognized" — eslint is not in `devDependencies` and there is no config file, even though the `lint` script itself references real eslint flags. `npm run build` (tsc + vite) plus `npm run check` are the quality gate until lint is actually scaffolded.
- `generateAppraisalInsights` needs an `ANTHROPIC_API_KEY` secret (`functions/src/lib/secrets.ts`, set via `firebase functions:secrets:set`). Without it the callable deploys but fails at call time.
