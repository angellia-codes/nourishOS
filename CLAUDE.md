# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

NourishOS is an internal operational platform for Nourish Group Indonesia — a React PWA frontend backed by Firebase (Auth, Firestore, Cloud Functions, Storage). It is in early milestone development: most feature modules are placeholder stubs, and only a few (HR appraisal, Security patrol) are actually implemented.

## Commands

```bash
npm run dev      # Vite dev server on http://localhost:5173
npm run build    # tsc (typecheck, noEmit) then vite build — build fails on any type error
npm run lint     # eslint on ts/tsx, --max-warnings 0 (zero-tolerance; a single warning fails)
npm run preview  # serve the production build
```

There is **no test runner configured** — do not assume `npm test` exists or invent test commands.

Firebase emulators are configured (`src/firebase.json`): auth 9099, functions 5001, firestore 8080, storage 9199, UI 4000. Set `VITE_USE_FIREBASE_EMULATOR=true` in `.env.local` to point the app at them. Copy `.env.example` → `.env.local` for the `VITE_FIREBASE_*` config.

## Documentation is the source of truth

`docs/` (core/, modules/, platform/) holds the authoritative product/architecture specs, and the code is written to trace back to them. Comments cite sections directly, e.g. `// API.md §7`, `// DATABASE.md §23`, `// RBAC.md §4`. **Before changing behavior in a module, read its doc** — and when code and doc disagree, the doc usually reflects intent while the code reflects what's actually shipped. Note the top-level `docs/README.md` lists an *aspirational* stack (MUI, React Hook Form, Zod) that the code does **not** use — trust `package.json` and the actual source over that list.

## Architecture

### Client reads, Functions write

The single most important rule: **clients never write to Firestore directly.** Every `match` in `firestore.rules` is `allow write: if false`, with a default-deny catch-all at the bottom. All mutations go through Cloud Functions. Clients read Firestore directly, gated by RBAC conditions in the rules.

- **Frontend → backend:** call functions via `callFunction<TResponse>(name, payload)` ([src/services/api/callFunction.ts](src/services/api/callFunction.ts)), never `httpsCallable` directly. It unwraps the `{success, message, data}` success envelope and normalizes all failures to a thrown `ApiError`.
- **Backend function shape:** every callable in [functions/src/](functions/src/) follows the same skeleton — `onCall({ region: REGION }, ...)`, body wrapped in `try/catch`, `requireActiveUser(request)` + `requirePermission(user, PERMISSIONS.X)` for RBAC, mutate, `recordAuditEvent(...)`, return `successResponse(data, message)`; the `catch` calls `handleError(error)`. Throw `AppError(code, message)` for failures (it maps to `HttpsError`). See [functions/src/hr/appraisal/submitAppraisal.ts](functions/src/hr/appraisal/submitAppraisal.ts) as the canonical example.
- All shared function helpers are re-exported from [functions/src/lib/index.ts](functions/src/lib/index.ts) (`db`, `COLLECTIONS`, `REGION`, RBAC guards, `AppError`, `handleError`, `successResponse`, `recordAuditEvent`, `newDocumentBaseFields`/`updatedFields`, etc.). Import from `'../../lib'`, not individual files.

### RBAC

Authorization rides on Firebase custom claims `{role, departmentId, outletId}`, kept in sync with the `users/{uid}` doc by `syncUserClaims`. Firestore rules read the claim off the token (no cross-document `get()`) for speed. On the client, `AuthProvider` ([src/contexts/AuthProvider.tsx](src/contexts/AuthProvider.tsx)) subscribes to the user profile live, loads the permission array from `roles/{roleId}`, and pushes both into the Zustand auth store. Route protection is `ProtectedRoute` + `RoleRoute` under [src/routes/](src/routes/); component-level gating uses `PermissionGuard`.

### Shared "engines"

Cross-module backend capabilities live under [functions/src/shared/](functions/src/shared/) and are meant to be reused, not reimplemented per module: **approval engine**, **task engine**, **notifications**, **file storage**. Example: HR appraisal submission validates its own scores, then calls `submitApprovalInternal(...)` to drive a sequential role-based approval route (HR Manager → GM). When adding a module that needs approvals/tasks/notifications, wire into these rather than writing new flows.

### Frontend structure

Feature-first under [src/features/](src/features/)`<module>/` (pages, components, hooks, services per feature). The router ([src/routes/routes.tsx](src/routes/routes.tsx)) mounts most modules as `<ModulePlaceholder>` until built. `src/components/ui/` is a small shadcn-style primitive set (`components.json`, `class-variance-authority`, `tailwind-merge`); `src/components/shared/` is app-level shared components. Global state is Zustand stores in [src/store/](src/store/). Path alias `@/` → `src/` (configured in both `vite.config.ts` and `tsconfig.json`).

### Intentional duplication

`src/constants/` (e.g. `collections.ts`, `permissions.ts`, `roles.ts`) is mirrored by a subset in `functions/src/lib/` because frontend and functions are separate TypeScript projects that can't share imports. This duplication is deliberate and flagged in code comments — when you change a collection name, permission string, or role, **update both sides.**

## Gotchas

- Firebase config files live under `src/` (`src/firebase.json`, `src/firestore.rules`, `src/storage.rules`), and there is also a root `firestore.rules`. Confirm which one a deploy actually consumes before editing rules.
- `functions/` currently contains only `src/` — there is no committed `functions/package.json`/`tsconfig`, so the functions project isn't buildable/deployable as-is yet. Don't assume you can `firebase deploy --only functions` without scaffolding that first.
- `strict` TypeScript is on and lint tolerates zero warnings; a build passes only if both `tsc` and eslint are clean.
- `npm run lint` currently fails with "eslint is not recognized": eslint is not in `devDependencies` and no eslint config file exists, so the lint script is aspirational until that's scaffolded. `npm run build` (tsc + vite) is the working quality gate.
