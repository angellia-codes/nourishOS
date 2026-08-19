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

`functions/test/` holds two emulator smoke scripts (`emulator-callables.mjs`, `emulator-scheduled.mjs`) run by hand against `firebase emulators:start`, `communication-flow.mjs` (the Employee Communication lifecycle end to end as six signed-in users, so `firestore.rules` is actually enforced), `shift-report-flow.mjs` (`submitShiftReport` as three signed-in users — validation, the once-per-outlet-per-day rule, the closing→opening link, and the rules block; it clears its own deterministic doc ids first so it re-runs within a day), plus four that need no emulator: `communication-steps.mjs` (the Dept Head → HR → GM chain), `timestamps.mjs` (pins the timezone boundary below), `hr-inventory-stock.mjs` (`applyDelta`), and `gap-pass.mjs` (the Fonnte retry/response handling with `fetch` stubbed, the project milestone parser, the flash-report formatter — one case sleeps through a single 5s backoff, which is §13.1's retry policy, not a hang). None of them is a suite; run them with `node functions/test/<name>.mjs` after `npm --prefix functions run build`.

Two of the scripts there seed rather than assert. `portal-seed.mjs` fills the Candidate Portal with demo vacancies and applications. **`seed-emulator-user.mjs` is the one to reach for first** — the emulator's Firestore starts empty, so `npm run dev:emulator` otherwise gives you an app you cannot sign into. It defaults to an `outletManager` at `nourish_uluwatu` and takes `--role`/`--outlet`/`--department`/`--email`/`--name`. Two non-obvious things it handles: the app signs in with `signInWithPopup` + `GoogleAuthProvider` and the Auth emulator's chooser lists **only** google.com-provider accounts, so an `accounts:signUp` (password) account is invisible to the popup; and `firestore.rules` reads `{role, departmentId, outletId}` off the **token**, so seeding `users/{uid}` without setting custom claims leaves every read denied. The `sub` is deterministic, so re-running reuses the uid instead of piling up accounts, and permissions come from the compiled `ROLE_PERMISSIONS` (hence the build first) so a seeded role cannot drift from what the callables enforce.

`functions/tools/migrate-checklists.mjs` is a hand-run Admin SDK script that carries the retired `openingChecklists`/`closingChecklists` documents forward into `shiftHandovers` (see `src/features/operations/CLAUDE.md`). Dry run by default, `--apply` to write; idempotent, and it never overwrites a target id that already holds a shift report. Sources are left in place unless `--delete-migrated` is passed, which removes only those whose target both exists **and** carries the migration marker in its `otherNotes` — existence alone is not enough, since that is exactly the case where a checklist's id collided with a real report and was never carried across. Anything it refuses to delete is printed under "Kept — NOT safe to delete"; that list is the actionable one, because nothing else holds that data. The flag obeys `--apply` like every other write, and runs whether or not the same invocation migrated anything, so the intended order is `--apply`, check, then `--delete-migrated --apply` later. Same credential story as `user-doctor.mjs` below, plus an emulator path: set `FIRESTORE_EMULATOR_HOST` and pass `--project demo-nourishos` for no credentials at all.

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
