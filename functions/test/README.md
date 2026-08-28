# Tests

Two tiers, distinguished by filename:

| Filename | Tier | Needs | Runner |
| --- | --- | --- | --- |
| `*.test.mjs` | Pure unit tests | a `functions/` build | `npm test` |
| `invariants.mjs` | Static invariant checks | nothing | `npm run check` |
| `*.mjs` (everything else) | Emulator flows and seed scripts | the Emulator Suite (JVM) | run by hand, one at a time |

There is still no test *framework* here — the pure tier is Node's own
`node:test` (built in since Node 18, no dependency), and the emulator tier is
plain scripts using global `fetch`.

## `npm test` — the pure tier

```
npm test
```

Builds `functions/` and then runs `node --test "functions/test/*.test.mjs"`.
152 tests, ~26s, no emulator and no JVM. One exit code.

The glob is deliberate: it keeps the emulator and seed scripts out. Do not
replace it with the directory form — those scripts would be loaded as tests and
sit there failing to reach an emulator that isn't running.

| File | Covers |
| --- | --- |
| `apar-inspection.test.mjs` | Fire extinguisher §4.6 failure handling, period-key arithmetic, round reference ids. |
| `attendance-import.test.mjs` | Attendance CSV taxonomy, legacy alias folding (§2.2 D4), the §5.1 hard rules. |
| `communication-steps.test.mjs` | The Employee Communication approval chain and its three corrections (§17). |
| `expense-steps.test.mjs` | The expense approval chain, threshold boundary, dedupe and floor (§3). |
| `gap-pass.test.mjs` | Fonnte adapter retry/response handling, milestone parser, flash-report formatter. **~15s — real 5s backoffs, on purpose.** |
| `hr-inventory-stock.test.mjs` | `applyDelta`, plus transfer composed the way `transferStock.ts` composes it. |
| `milestone-match.test.mjs` | Birthday / anniversary / new-hire / farewell date matching. |
| `payroll-statutory.test.mjs` | The statutory engine and CSV validator against §3's verified reference slip; every §6.2 hard failure. |
| `portal-form-gate.test.mjs` | The F010 save gate against the exact payload `portal/src/pages/FormPage.tsx` posts. |
| `timestamps.test.mjs` | The WITA (`Asia/Makassar`) date-key helpers. |
| `training-gate.test.mjs` | The prerequisite gate, department mapping, due-date rule, and seed-data integrity. |

Everything in this tier is pure by construction: each module under test takes
its lookups (employees, rosters, existing records) as arguments, so the same
code that backs the callable runs here unchanged. When a module mixes pure
validation with `db` access, split the pure half out — `hr/attendance/validate.ts`
is the pattern.

## `npm run check` — static invariants

```
npm run check
```

`invariants.mjs`, described in the root `CLAUDE.md`. Reads the `.ts` sources as
text, so unlike everything else here it needs no build at all.

## The emulator tier

These are hand-run scripts that exercise the Cloud Functions end to end against
the Firebase Emulator Suite and assert the resulting Firestore writes. They are
not in `npm test` and have no shared runner.

| Script | Covers |
| --- | --- |
| `emulator-callables.mjs` | Lost & Found, Incident Reports (routing, auto work order, investigation task), Daily Updates (carry-forward, duplicate-day guard). |
| `emulator-scheduled.mjs` | `carryForwardDailyTasks`, `checkDailyTaskEscalations`, `checkLostFoundRetention`, `sendComplianceAlerts`, `sendDailyDigest`. |
| `appraisal-v2-flow.mjs` | Appraisal v2 template generation, dual scoring, acknowledgement. |
| `checkpoint-flow.mjs` | Security patrol checkpoints. |
| `communication-flow.mjs` | Employee Communication end to end. |
| `payroll-flow.mjs` | Payroll batch import and the approval chain. |
| `portal-flow.mjs` | The candidate portal's unauthenticated callables. |
| `shift-report-flow.mjs` | Opening/closing shift reports. |
| `hr-reports-seed.mjs`, `portal-seed.mjs`, `seed-accounts.mjs`, `seed-demo-data.mjs`, `seed-emulator-user.mjs` | Seeding, not assertions. |

### Running them

1. **Build the functions** (the scripts load compiled handlers from `lib/`):

   ```
   npm --prefix functions run build
   ```

2. **Start the emulator suite.** Firebase config lives at the repo root, so
   `functions.source` resolves and no throwaway config is needed:

   ```
   firebase emulators:start --project demo-nourishos
   ```

   The emulators need a JVM (Firestore/Auth/Storage are JVM-based). Add
   `"pubsub": { "port": 8085 }` to `firebase.json`'s `emulators` block if you
   want to drive the scheduled functions through pub/sub — see the note below
   for why the script doesn't.

3. **Run a script** in another shell:

   ```
   node functions/test/emulator-callables.mjs
   ```

   Each prints per-assertion ✓/✗ and exits non-zero on any failure.

### Why `emulator-scheduled.mjs` doesn't publish to Pub/Sub

`onSchedule` functions are backed by pub/sub topics (`firebase-schedule-<fn>`).
On Windows the Functions emulator **consumes and acks** a published schedule
message but never invokes the handler — its background-trigger invocation over
Windows named pipes fails silently (`connect ENOENT \\?\pipe\fire_emu_…`). So
the script invokes the real shipped handlers directly via firebase-functions
v2 `.run()` against the live Firestore emulator. That runs the identical
handler code; only Firebase's own pub/sub→handler delivery is bypassed. On a
non-Windows host you can instead publish to the topic to drive the full path.
