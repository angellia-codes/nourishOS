# Recruitment

Guidance for `src/features/recruitment/` and its backend in `functions/src/recruitment/`. The repo-root `CLAUDE.md` still applies on top of this.

## What exists

Requisitions (approval-routed), the ST-01…ST-08 candidate pipeline, interviews with a six-criterion scorecard, onboarding checklists — and, since 2026-08-19, the **Candidate Portal**: a public careers app that feeds the same `candidates` collection.

## Candidate Portal (2026-08-19)

Built from `docs/modules/candidate_portal.md` and `docs/modules/employment-application-form.md`. Four decisions deviate from the blueprint deliberately, all confirmed before implementation:

1. **No candidate accounts.** The doc assumes Firebase Auth for candidates (§4). There is none. `startApplication` mints a 32-byte token, stores only its SHA-256 hash on the candidate (`portalTokenHash`, 30-day `portalTokenExpiresAt`), and WhatsApps the link. `functions/src/recruitment/portal/token.ts` is the whole trust boundary — `resolveCandidateByToken` is the portal's `requireActiveUser`, and `resolveCandidateForEdit` additionally refuses once the candidate is past ST-01, because a submitted application belongs to HR.
2. **The shipped data model wins.** The doc's `applications`, `employment_forms`, `interview_scores` and `hiring_decisions` collections were **not** created. The employment form is an embedded `applicationForm` object on `candidates/{id}` (which is what employment-application-form.md §4 specifies anyway), the scorecard is fields on `interviews/{id}`, and the hiring decision is the existing stage move to ST-05/ST-06. Only `discResults/{candidateId}` is genuinely new, because §25 wants it read-restricted beyond the candidate record itself.
3. **Sensitive answers live in a sub-document.** `candidates/{id}/confidential/application` holds the F010 health, criminal-record and previous-salary answers, gated by `hasAnyRole(['hrManager','superAdmin'])` in `firestore.rules`. Field-level rules do not exist in Firestore; this mirrors `recruitments/{id}/confidential/compensation`. The permission string is `recruitment.viewSensitive` (the doc calls it `candidates.view_sensitive`).
4. **One hire path, not two.** A `createEmployeeFromCandidate` callable was written and then deleted: `createEmployeeInternal` already stamps `employeeId` back onto the candidate and its checklist when `candidateId` is passed, and `EmployeeFormPage` opens pre-filled from `/hr/employees/new?candidateId=…`. Instead that form now prefills from `applicationForm` (name, contact, birth details, addresses) and `createEmployeeInternal` marks onboarding checklist **item 19** as verified-not-collected (employment-application-form.md §7 AC-5). Contract type, probation months and reporting line stay HR's decision and are still typed in.

### DISC

`functions/src/recruitment/portal/discQuestions.ts` — 24 forced-choice items, ours, not a licensed instrument (§10 warns about this explicitly). A constant, not a collection: nothing edits them. `getDiscQuestions` strips the dimension mapping before it reaches the browser, `submitDiscAssessment` scores server-side, `discResults` is write-denied to every client, and the result never goes back to the candidate (§16). The primary/secondary pair is denormalised onto the candidate as `discSummary` ("D/C") so the pipeline board needs no extra read — the board's audience is wider than `discResults`' read rule.

Interview focus hints (§20) are a pure lookup in `recruitmentFormat.ts`'s `discInterviewFocus`, not stored — they are an opinion about how to spend interview time, and they change when the wording changes, not when the candidate does.

### Uploads

`uploadCandidateDocument` takes the file base64 **inside the callable**. A candidate has no Auth session, so `storage.rules` has no way to recognise them; routing the bytes through the callable keeps the token as the only credential and reuses `validateFile`/`createFileMetadataInternal`. Ceiling: ~8MB per file (`guard.ts`), noted with a `ponytail:` comment — swap to a signed PUT URL if that ever bites.

### Known gap

**No App Check.** Every portal callable is unauthenticated, and the only rate limit is the 30-day same-phone/same-vacancy duplicate check in `guard.ts`. Turn on App Check + reCAPTCHA before `careers.nourishgroup.id` is announced publicly.

## Running it

```
npm run dev:portal            # http://localhost:5174, live project
npm run dev:portal:emulator   # against the Emulator Suite
npm run build:portal          # → dist-portal/
node functions/test/portal-flow.mjs   # end-to-end smoke test, emulator must be up
```

The portal is a separate app (own entry, own bundle, own hosting target) but **not** a separate npm package — it shares the repo's `node_modules`, the root `tailwind.config.ts` and `src/styles/globals.css`. That stylesheet is the only thing it imports from `src/`; it has no access to NourishOS's services, stores or components, and must not gain any. `PORTAL_BASE_URL` (a plain env var on the functions side, not a secret) is what goes into the WhatsApp link.
