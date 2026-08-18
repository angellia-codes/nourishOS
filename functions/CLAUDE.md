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

`functions/test/` holds two emulator smoke scripts (`emulator-callables.mjs`, `emulator-scheduled.mjs`) run by hand against `firebase emulators:start`, plus three that need no emulator: `timestamps.mjs` (pins the timezone boundary below), `hr-inventory-stock.mjs` (`applyDelta`), and `gap-pass.mjs` (the Fonnte retry/response handling with `fetch` stubbed, the project milestone parser, the flash-report formatter — one case sleeps through a single 5s backoff, which is §13.1's retry policy, not a hang). None of them is a suite; run them with `node functions/test/<name>.mjs` after `npm --prefix functions run build`.

`functions/tools/user-doctor.mjs` is a hand-run Admin SDK script that inspects one account across all three RBAC layers (`users/{uid}.status`/`roleId`, the `{role, departmentId, outletId}` custom claims, `roles/{roleId}`) and counts collections to tell an empty database apart from a rules-denied read. Read-only unless `--fix`. It needs a service account key via `--key` or `GOOGLE_APPLICATION_CREDENTIALS` — this machine has no gcloud/ADC.

## Callable shape

```
onCall({ region: REGION }, async (request) => { try { … } catch (error) { handleError(error) } })
```

Inside: `requireActiveUser(request)` (re-reads `users/{uid}` + `roles/{roleId}` every call, so a stale token can't outrun a suspension) → `requirePermission(user, PERMISSIONS.X)` → validate input, throwing `AppError(code, message, details)` → mutate via the Admin SDK, spreading `newDocumentBaseFields(uid)` / `updatedFields(uid)` → `recordAuditEvent(...)` → `successResponse(data, message)`.

`handleError` passes `AppError`/`HttpsError` through with their code and collapses everything else to a generic `internal`, logged with its stack. [src/shared/calendar/events.ts](src/shared/calendar/events.ts) is the newest end-to-end example.

Every new callable must be exported from [src/index.ts](src/index.ts), and the client reaches it only through `callFunction`.

## Secrets

Three, all provisioned with `firebase functions:secrets:set` and declared per function ([src/lib/secrets.ts](src/lib/secrets.ts)): `ANTHROPIC_API_KEY` (appraisal insights), `FONNTE_TOKEN` (WhatsApp), `GOOGLE_CALENDAR_SA_KEY` (the Google service-account JSON, as one string).

**A function only receives a secret it names in `secrets: [...]` on its `onCall`/`onSchedule` options.** Both the WhatsApp adapter and the calendar sync treat an empty value as "not provisioned" and skip silently rather than throwing — deliberate, so an unprovisioned environment still works — which means a forgotten `secrets:` entry looks like "the message just never sent," not like an error. Anything that sends WhatsApp or touches Google Calendar needs its declaration; grep for `FONNTE_TOKEN` / `GOOGLE_CALENDAR_SA_KEY` to see the current set. The non-secret half of both integrations (Fonnte's HR contact details, the target `calendarId`) lives in `integrations/{fonnte,googleCalendar}` Firestore docs.

## Time zone: WITA, declared explicitly — never inherited

Cloud Functions run with `TZ` unset, so the runtime clock is UTC. The business runs on `Asia/Makassar` (UTC+8).

`BUSINESS_TIME_ZONE`, `todayIso()`, `addDaysIso()` and `currentBusinessYear()` in [src/lib/timestamps.ts](src/lib/timestamps.ts) are the only sanctioned way to derive a date key or a year. Every wall-clock `onSchedule` job passes `timeZone: BUSINESS_TIME_ZONE` (`checkOverdueCheckpoints` is an interval, so it has none) — including the ones added in the 2026-08-18 pass: `sendInterviewReminders` (hourly), `syncCalendarEvents` (every 15 min) and `sendFlashReport` (Mondays 07:00).

**Never use `new Date().toISOString().slice(0, 10)` for "today."** `toISOString()` is always UTC regardless of `TZ`, so between 00:00 and 08:00 WITA it silently returns yesterday and mis-files the day's records.

The deploy region (`asia-southeast2`, Jakarta) is unrelated to this and sets no clock. Calendar arithmetic anchored at `T00:00:00Z` on a `YYYY-MM-DD` string — `calculateProbationEndDate`, `calculateRetentionExpiresAt` — is deliberately UTC and correct as-is; don't "fix" it.
