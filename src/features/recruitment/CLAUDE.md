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

## GM Interview stage + interviewer role restriction (2026-08-28)

New optional pipeline stage, `ST-04B` "GM Interview", between User Interview (ST-04) and Offering (ST-05) — deliberately `ST-04B`, not a renumbered `ST-09`, so candidates already stored at ST-05..ST-08 keep their exact values, no migration. `ALLOWED_STAGE_TRANSITIONS` (`functions/src/recruitment/helpers.ts`, mirrored in `src/types/recruitment.types.ts` and, a third time, `CandidateDetailPage.tsx`'s own `NEXT_STAGES`) lets ST-04 go either straight to ST-05 (skip) or via ST-04B — that's what makes it optional, there's no separate "optional stage" flag anywhere. `Candidate.gmInterviewScore` is the third score field alongside `hrInterviewScore`/`userInterviewScore`, routed the same way in `recordInterviewOutcome`'s stage-to-field mapping. `notifyCandidateOfStage`'s WhatsApp switch needed no new case — its `default` already sends nothing for ST-03/ST-04, and ST-04B falls through the same way.

Also new: `scheduleInterview` now rejects any interviewer whose `users/{uid}.roleId` isn't in `INTERVIEWER_ROLES` (`src/constants/roles.ts`, mirrored as a plain string array in `functions/src/recruitment/helpers.ts` since the backend has no `ROLES` map to import from) — applies to **every** interview stage, not just the new one. `INTERVIEWER_ROLES` is a new combined "leader & manager" list (outlet leaders, outlet/restaurant manager, hrManager, generalManager, director, superAdmin); no such list existed before this — the nearest prior art, `LEADER_ROLES` duplicated in `flashReport.ts`/`sendDailyDigest.ts`/`sendComplianceAlerts.ts`, is narrower and already stale (missing `restaurantManager`), and wasn't reused. `InterviewFormPage.tsx`'s interviewer `<Select>` filters by the same list client-side (`where('roleId', 'in', INTERVIEWER_ROLES)` alongside the existing `where('status','==','active')`) — no composite index needed, two equality/`in` filters with no `orderBy`.

## Requisitions — Employment type vs Contract type (2026-08-27)

`Requisition.employmentType` used to include `fixed_term` as a fifth peer alongside `ft`/`fl`/`dw`/`ojt` — wrong, since a fixed-term contract is a duration modifier on a full-time hire, not a distinct employment type (a normal full-time employee is routinely also PKWT/fixed-term). `EMPLOYMENT_TYPES` (both `src/types/recruitment.types.ts` and `functions/src/recruitment/helpers.ts`) dropped `fixed_term`; a new `Requisition.contractType?: ContractType | null` field carries Permanent/Fixed-term, reusing the **existing** `ContractType`/`CONTRACT_TYPE_LABELS` from `src/constants/hr.ts` (the same type `Employee.contractType` already uses) rather than inventing a third enum — `functions/src/recruitment/helpers.ts` only mirrors the two values it needs (`CONTRACT_TYPES = ['permanent', 'fixedTerm']`, `daily` is already covered by the `dw` employment type). `contractType` is required, and shown, only when `employmentType === 'ft'`; "Contract duration (months)" now gates on `contractType === 'fixedTerm'` instead of the old `employmentType === 'fixed_term'`. No legacy-data migration — confirmed no real requisitions existed with the old value.

## F010 form revisions + progress visibility removed (2026-08-28)

Deviates from `employment-application-form.md` §4 on HR's explicit request, not a discovered gap: `personalData.maritalStatus`/`religion` and `workExperience[].companyType` went from free text to validated dropdowns (`optionalOneOf` against a new `MARITAL_STATUSES`/`RELIGIONS`/`BUSINESS_TYPES` const in `applicationForm.ts`, mirrored as `{value,label}[]` arrays in `portal/src/labels.ts`) — `RELIGIONS` reuses the internal app's own `RELIGION` enum's value tokens (`src/constants/hr.ts`) minus `other`, for free future consistency. `workExperience[].periodStart`/`periodEnd` moved from free-text `'YYYY-MM'` to a real `<input type="date">` full ISO date, validated with a new `optionalIsoDate` wrapper around `guard.ts`'s `portalIsoDate` (which has no built-in "blank is OK" mode). `workExperience[].superiorName` ("Supervisor's Name") is deleted outright — field, validation, and the `ApplicationForm` type (`src/types/recruitment.types.ts`) all dropped it; it was never read anywhere else. The format change required fixing `ApplicationFormPanel.tsx`'s `totalExperienceYears`, which used to append `-01` to parse the old month-only string — a full date fed through that suffix fails to parse, which would have silently zeroed the "Experience" summary on every future candidate's HR profile.

Also: a candidate can no longer see recruitment-pipeline progress once their application (employment form + DISC) is submitted. The portal's "My application" header link and the Done page's "Track my application" button are both gone — `/status` is reachable only via a candidate's own WhatsApp resume link (`ApplyPage.tsx`'s pre-existing token redirect), which is also the resume-a-draft flow and had to stay. `getApplicationStatus` now omits `stage`/`stageLabel`/`stageIndex`/`stages`/`closed` from its response entirely once `submittedAt` is set — enforced server-side, not just hidden in the UI, since the callable is unauthenticated and its JSON is inspectable. `StatusPage.tsx` shows a plain "submitted, thank you" message in that case instead of the stage list; the pre-submission "Still to do" / Continue Application card is unchanged.

## Running it

```
npm run dev:portal            # http://localhost:5174, live project
npm run dev:portal:emulator   # against the Emulator Suite
npm run build:portal          # → dist-portal/
node functions/test/portal-flow.mjs   # end-to-end smoke test, emulator must be up
```

The portal is a separate app (own entry, own bundle, own hosting target) but **not** a separate npm package — it shares the repo's `node_modules`, the root `tailwind.config.ts` and `src/styles/globals.css`. That stylesheet is the only thing it imports from `src/`; it has no access to NourishOS's services, stores or components, and must not gain any. `PORTAL_BASE_URL` (a plain env var on the functions side, not a secret) is what goes into the WhatsApp link.
