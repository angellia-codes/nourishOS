# Cloud Functions

Guidance for `functions/`. Loads only when working under this directory — the repo-root `CLAUDE.md` still applies on top of it.

## Commands

`functions/` is its own npm package with its own `tsconfig.json`. It is **not** part of the root `tsc` project, so a green root `npm run build` says nothing about whether this package compiles.

```
npm --prefix functions install   # one-time
npm --prefix functions run build # tsc — the only typecheck functions/ gets
firebase deploy --only functions
firebase deploy --only firestore:rules,firestore:indexes,storage
firebase emulators:start          # auth 9099, functions 5001, firestore 8080, storage 9199, UI 4000
```

Firebase config lives at the **repo root** (`firebase.json`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`) so the CLI resolves `functions.source` correctly — run every `firebase` command from the root. These files used to sit under `src/`, where `"source": "functions"` resolved to the non-existent `src/functions` and broke the emulator.

`functions/test/` holds two emulator smoke scripts (`emulator-callables.mjs`, `emulator-scheduled.mjs`) run by hand against `firebase emulators:start`, plus `timestamps.mjs`, which pins the timezone boundary below and needs no emulator. None of them is a suite.

## Callable shape

```
onCall({ region: REGION }, async (request) => { try { … } catch (error) { handleError(error) } })
```

Inside: `requireActiveUser(request)` (re-reads `users/{uid}` + `roles/{roleId}` every call, so a stale token can't outrun a suspension) → `requirePermission(user, PERMISSIONS.X)` → validate input, throwing `AppError(code, message, details)` → mutate via the Admin SDK, spreading `newDocumentBaseFields(uid)` / `updatedFields(uid)` → `recordAuditEvent(...)` → `successResponse(data, message)`.

`handleError` passes `AppError`/`HttpsError` through with their code and collapses everything else to a generic `internal`, logged with its stack. [src/shared/calendar/events.ts](src/shared/calendar/events.ts) is the newest end-to-end example.

Every new callable must be exported from [src/index.ts](src/index.ts), and the client reaches it only through `callFunction`.

## Time zone: WITA, declared explicitly — never inherited

Cloud Functions run with `TZ` unset, so the runtime clock is UTC. The business runs on `Asia/Makassar` (UTC+8).

`BUSINESS_TIME_ZONE`, `todayIso()`, `addDaysIso()` and `currentBusinessYear()` in [src/lib/timestamps.ts](src/lib/timestamps.ts) are the only sanctioned way to derive a date key or a year. All five wall-clock `onSchedule` jobs pass `timeZone: BUSINESS_TIME_ZONE` (`checkOverdueCheckpoints` is an interval, so it has none).

**Never use `new Date().toISOString().slice(0, 10)` for "today."** `toISOString()` is always UTC regardless of `TZ`, so between 00:00 and 08:00 WITA it silently returns yesterday and mis-files the day's records.

The deploy region (`asia-southeast2`, Jakarta) is unrelated to this and sets no clock. Calendar arithmetic anchored at `T00:00:00Z` on a `YYYY-MM-DD` string — `calculateProbationEndDate`, `calculateRetentionExpiresAt` — is deliberately UTC and correct as-is; don't "fix" it.
