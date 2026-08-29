# NourishOS — Deploy Checklist

**Target repo path:** `docs/platform/deploy-checklist.md`
**Version:** 1.1 (2026-08-28)
**Scope:** Firebase (Firestore rules + indexes, Cloud Functions, Storage rules) for the backend, plus Vercel for the frontend SPA. The frontend does **not** deploy through Firebase Hosting — `firebase.json` has no `hosting` block and never has; the SPA ships via `vercel.json` (project `angellia-okta/nourish-os`). Don't add a Firebase Hosting step; add a Vercel one.

> Verify against the live repo before first use. `CLAUDE.md`'s tree state is stamped **2026-08-28** and may already be stale by the time you read this — re-check it, don't trust this line's date.

---

## 0. Release header

| Field | Value |
|---|---|
| Release name / tag | |
| Date | |
| Deployer | |
| Deploy type | ☐ First production deploy ☐ Functions only ☐ Rules only ☐ Frontend only ☐ Full |
| Modules touched | |
| Scheduled functions changed? | ☐ Yes ☐ No |
| Firestore rules changed? | ☐ Yes ☐ No |
| New composite indexes? | ☐ Yes ☐ No |
| Rollback owner (if not deployer) | |

---

## 1. Blockers — must be cleared before any production deploy

These are not checklist items. Nothing ships until each is closed or explicitly waived in writing by Angel.

- [x] **B1 — Frontend deploy target confirmed: Vercel, not Firebase Hosting.** `firebase.json` has no `hosting` block (verified — deliberately absent), so `firebase deploy --only hosting` is a no-op you should never run here. The SPA deploys via `vercel.json` (SPA rewrite `**` → `/index.html`) to Vercel project `angellia-okta/nourish-os`. Confirm the checkout is linked (`.vercel/project.json` present, or run `vercel link`) before deploying the frontend.
- [x] **B2 — Deploy working directory confirmed.** `firebase.json` is at repo root (verified) — matches CLI defaults and every doc example. No action needed; this was previously mis-stated as sitting under `src/`.
- [x] **B3 — Global Search closed, not blocked.** `searchService.ts`'s `searchAll` fires five independent client-side Firestore prefix-match queries directly (Employees, SOPs, Job Descriptions, Announcements, Tasks) — it was never meant to be a set of callables, and `search`/`advancedSearch`/`saveSearch`/`deleteSavedSearch`/`getRecentSearches` were never real requirements. Global Search is shipped and works; nothing to close here. (Previously mis-stated as a runtime-throw blocker — verify this against `src/services/shared/searchService.ts` if in doubt.)
- [ ] **B4 — `markAllNotificationsRead` batched.** Still unbatched as of 2026-08-28 (`functions/src/shared/notifications/notifications.ts`) — a single `db.batch()` over every unread notification, no chunking to Firestore's 500-write limit and no `BulkWriter`. Only a hard blocker if any user can reach 500 unread, which the ~17 scheduled functions (§4) make plausible within weeks. Re-verify against the live file before waiving.
- [x] **B5 — `firestore.rules` single-canonical-file confirmed.** Exactly one `firestore.rules` exists, at repo root, and `firebase.json` points at it. (A historical `src/firestore.rules` existed before an earlier Firebase migration and was removed then — there is no live conflict today.) No action needed; this was previously an open item, now closed.
- [ ] **B6 — Quality gate defined in place of CI.** No test runner and no ESLint exist. The gate is: `npm run build` green at repo root (tsc + vite) **and** green in `functions/`. Record both outputs in §3.

---

## 2. Pre-deploy — code and config

- [ ] `git status` clean; deploying a tagged commit, not a dirty working tree
- [ ] Release diff reviewed; no debug logging, no hardcoded UIDs, no commented-out RBAC checks
- [ ] `npm run build` green at repo root — **paste the tail of the output into the release notes**
- [ ] `npm run build` green in `functions/` — same
- [ ] No new `src/**` file writes to Firestore directly (all writes go through `src/services/` → callable)
- [ ] Every new callable calls `requireActiveUser` + `requirePermission` before any read/write
- [ ] Every new state transition writes an audit event via `recordAuditEvent`
- [ ] `functions/src/lib/collections.ts` and `src/constants/collections.ts` are in sync (known manual-sync tech debt — diff them by hand)
- [ ] `.env.local` is **not** committed and `VITE_USE_FIREBASE_EMULATOR` is absent or not the literal string `'true'` in the production build environment. A leaked `'true'` points production at localhost and the app silently shows nothing.
- [ ] All `VITE_FIREBASE_*` vars present in the build environment and pointing at the production project

---

## 3. Pre-deploy — data and rules

- [ ] Firestore rules dry-run passes:
      `firebase deploy --only firestore:rules --dry-run`
- [ ] Every collection touched by this release has an explicit rules block. The default-deny fallthrough means a missing block = total lockout, not an open door — silent breakage, not a breach.
- [ ] Storage rules reviewed if any new upload path was added (current rules are a permissive 25 MB starter — any-authenticated read/write)
- [ ] New composite indexes listed in `firestore.indexes.json` and **deployed first, separately, before the functions that query them**. Index builds are async; queries fail until the build completes. Check build status in the console before proceeding.
- [ ] `syncUserClaims` has run for every user who will log in on day one. Firestore rules read `role` / `departmentId` / `outletId` from the auth token, not from Firestore. A user without synced claims is denied everything and it looks like a broken app, not a permissions problem.
- [ ] Any data backfill required by this release is complete and spot-checked (e.g. `legacyEmployeeId`, outlet enum normalisation)
- [ ] Firestore export taken as a pre-deploy snapshot if this release migrates or rewrites existing documents

---

## 4. Pre-deploy — scheduled functions

Applies whenever **any** `onSchedule` function is added or changed. As of 2026-08-28 that's 17: `carryForwardDailyTasks`, `checkAparExpiry`, `checkDailyTaskEscalations`, `checkLostFoundRetention`, `checkOverdueCheckpoints`, `checkWorkOrderEscalations`, `contractAlerts`, `expireCommunicationRecords`, `generateMonthlyAparRounds`, `milestoneAnnouncements`, `remindAttendanceImport`, `scheduleAppraisalCycles`, `sendComplianceAlerts`, `sendDailyDigest`, `sendFlashReport`, `sendInterviewReminders`, `syncCalendarEvents`. **This list drifts every time a module ships a scheduler — don't trust it as exhaustive.** Get the live count instead: `grep -rl "onSchedule(" functions/src --include="*.ts"`.

- [ ] Blaze billing active (Cloud Scheduler is not on Spark)
- [ ] Decision recorded: do these fire on day one, or are they deployed dormant? Deploying provisions the Scheduler job and it starts running on its own cadence immediately.
- [ ] If firing on day one: recipients briefed. `notifyUsersByRole('generalManager', …)` sends a real alert to a real GM who has not been trained on the system yet.
- [ ] Cooldown / dedupe logic verified for anything that could fan out (e.g. `lastAlertedAt` on overdue checkpoints)
- [ ] Schedule times checked against **Asia/Makassar** (WITA), not UTC. A "daily digest" that lands at 3am is a rollback in practice even if it's technically working.

---

## 5. Deploy

No staging project exists today, so the sequence below is the substitute. Order matters — rules and indexes before the code that depends on them.

- [ ] Verify emulators pass the affected flow first (`firebase emulators:start`, `VITE_USE_FIREBASE_EMULATOR=true`)
- [ ] `firebase deploy --only firestore:indexes` — wait for builds to finish
- [ ] `firebase deploy --only firestore:rules`
- [ ] `firebase deploy --only storage`
- [ ] `firebase deploy --only functions:<explicit,function,names>` — **name the functions**. A bare `--only functions` redeploys everything and can resurrect or re-provision things you didn't intend.
- [ ] Frontend: `vercel deploy --prod` (or push to the branch Vercel tracks for production) — **not** `firebase deploy --only hosting`; there is no `hosting` block in `firebase.json` and that command is a no-op here.
- [ ] Deploy window is outside peak service hours (avoid 11:00–14:00 and 18:00–21:00 WITA)

---

## 6. Smoke test — post-deploy, production

Run on a real mid-range Android over outlet wifi/4G, not on a desktop. That is the actual deployment target.

- [ ] Google login succeeds; correct role and outlet resolve in the UI
- [ ] RBAC negative test: a Staff-role account cannot see HR or Finance nav items **and** the corresponding callable rejects a direct invocation
- [ ] One approval submitted end to end → step advances → notification lands → audit entry written
- [ ] One employee record reads and writes (HR)
- [ ] One patrol log submits (Security)
- [ ] One incident report submits and routes to the right role (Operations)
- [ ] File upload + download round-trips through Storage
- [ ] Notification bell loads and "mark all read" completes without error
- [ ] Global search returns results — type a query and confirm hits come back across Employees/SOPs/Job Descriptions/Announcements/Tasks (a collection the searcher lacks read access to should contribute zero results, not an error)
- [ ] Cloud Functions logs clean for 15 minutes: no unhandled exceptions, no permission-denied spikes
- [ ] Firestore usage graph shows no runaway read loop

---

## 7. Post-deploy

- [ ] Function error rate nominal in the Firebase console after 30 min
- [ ] Release notes updated with what shipped and both build outputs
- [ ] `CLAUDE.md` "Current state of the tree" section updated **in the same commit** if any fact there changed
- [ ] Affected department leaders notified of what is now live
- [ ] Any newly enabled scheduled function watched through its first full cycle
- [ ] Related module spec open items closed or re-flagged

---

## 8. Rollback

**Roll back when any of these are true:**

- Any user role cannot log in, or logs in with the wrong outlet/permissions
- Cloud Function error rate above ~2% of invocations, or any unhandled exception recurring on a core flow (auth, approval, employee read)
- Firestore permission-denied errors on a flow that worked before this deploy
- Any approval, payslip, appraisal, or audit record written incorrectly — data corruption outranks downtime, roll back immediately rather than investigating live
- A scheduled function is sending duplicate or wrong-recipient notifications to staff
- Firestore read volume more than ~3× the pre-deploy baseline (runaway listener or query loop)

**Rollback procedure by surface — they are not equally reversible:**

| Surface | Procedure | Reversible? |
|---|---|---|
| Frontend (Vercel) | Promote the previous deployment to production from the Vercel dashboard/CLI (`vercel rollback`), or re-run `vercel deploy --prod` from the previous-good commit | Yes — fast, seconds |
| Cloud Functions | Re-deploy the previous commit's functions by explicit name | Yes — minutes |
| Firestore rules | Re-deploy the previous `firestore.rules` from the last good commit. Keep a copy of it on disk **before** deploying. | Yes — but only if you kept the old file |
| Firestore indexes | Not rolled back. Extra indexes are harmless; leave them. | N/A |
| Firestore **data** | **No automatic rollback.** Restore from the pre-deploy export (§3). Anything written between deploy and rollback is lost or must be reconciled by hand. | **No** |
| Scheduled functions | Delete the Cloud Scheduler job in the console — redeploying alone does not stop an in-flight schedule | Yes — manual |

- [ ] Previous-good commit SHA recorded here before deploying: `________`
- [ ] Previous `firestore.rules` saved to disk before deploying
- [ ] Rollback decision-maker named and reachable during the deploy window

---

## 9. Known limitations to state plainly, not paper over

- **No PWA.** No service worker, no `vite-plugin-pwa`, no offline capability. Do not tell floor staff the app works offline. It does not.
- **No CI.** Nothing prevents a broken commit reaching production except this checklist being run by a human.
- **No staging.** Production is the first environment any change meets outside emulators.
- **No test suite.** "Verified" means the build typechecks and the flow was exercised by hand.
- **One module is a stub, not "most."** As of 2026-08-28, `/engineering/preventive-maintenance` is the only real `<ModulePlaceholder>` route left in the nav. Finance (Expense Requests), Documents, Communications, Reports, and Settings are all fully shipped — real money, records, and role/permission changes flow through them today. **There is no Purchasing, Inventory, or CRM module in any form** — all three were cut from scope on 2026-08-15 (not stubs; the routes, nav entries, and docs were deleted). Re-verify this list against `CLAUDE.md`'s "Current state of the tree" before relying on it — it will drift as modules ship.
