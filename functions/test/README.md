# Operations emulator smoke tests

There is no automated test runner in this repo (see root `CLAUDE.md`). These
are ad-hoc scripts that exercise the Operations Cloud Functions end-to-end
against the Firebase Emulator Suite and assert the resulting Firestore writes.
They are plain Node (18+) scripts using global `fetch` — no framework, no deps
beyond `firebase-admin` (already in `functions/node_modules`).

| Script | Covers |
| --- | --- |
| `emulator-callables.mjs` | The HTTP callables: `createLostFoundItem` / `claimLostFoundItem` (Lost & Found), `createIncidentReport` / `updateIncidentStatus` (Incident Reports incl. type routing + auto work order + investigation task), `submitDailyReport` (Daily Updates incl. carried-forward blocking + task creation + duplicate-day guard). |
| `emulator-scheduled.mjs` | The `onSchedule` functions: `carryForwardDailyTasks`, `checkDailyTaskEscalations`, `checkLostFoundRetention`, `sendComplianceAlerts`, `sendDailyDigest`. |

## Running

1. **Build the functions** (the scripts load compiled handlers from `lib/`):

   ```
   npm --prefix functions run build
   ```

2. **Start the emulator suite.** The repo's Firebase config lives at
   `src/firebase.json`, whose `functions.source` doesn't resolve when the CLI
   treats `src/` as the project dir — so start the suite with a config whose
   paths resolve from the repo root, e.g. a throwaway `firebase.emulator.json`:

   ```json
   {
     "functions": { "source": "functions", "runtime": "nodejs20" },
     "firestore": { "rules": "src/firestore.rules", "indexes": "src/firestore.indexes.json" },
     "storage": { "rules": "src/storage.rules" },
     "emulators": {
       "auth": { "port": 9099 }, "functions": { "port": 5001 },
       "firestore": { "port": 8080 }, "storage": { "port": 9199 },
       "pubsub": { "port": 8085 }, "ui": { "port": 4000 }, "singleProjectMode": true
     }
   }
   ```

   ```
   firebase emulators:start --config firebase.emulator.json --project demo-nourishos
   ```

   The emulators need a JVM (Firestore/Auth/Storage are JVM-based).

3. **Run a script** in another shell:

   ```
   node functions/test/emulator-callables.mjs
   node functions/test/emulator-scheduled.mjs
   ```

   Each prints per-assertion ✓/✗ and exits non-zero on any failure.

## Why `emulator-scheduled.mjs` doesn't publish to Pub/Sub

`onSchedule` functions are backed by pub/sub topics (`firebase-schedule-<fn>`).
On Windows the Functions emulator **consumes and acks** a published schedule
message but never invokes the handler — its background-trigger invocation over
Windows named pipes fails silently (`connect ENOENT \\?\pipe\fire_emu_…`). So
the script invokes the real shipped handlers directly via firebase-functions
v2 `.run()` against the live Firestore emulator. That runs the identical
handler code; only Firebase's own pub/sub→handler delivery is bypassed. On a
non-Windows host you can instead publish to the topic to drive the full path.
