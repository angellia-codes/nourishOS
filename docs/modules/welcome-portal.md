# NourishOS — New-Hire Welcome Portal — Design Spec

**Version:** 1.6 (built)
**Date:** 2026-09-25
**Status:** **Shipped 2026-09-25**, with four confirmed deviations recorded in §18 and the Feedback half (§8) deliberately deferred. Sections below are the design as approved; where the build differs, §18 says so and the build is what runs.
**Owner:** Angel
**Depends on:** Employee Master Database (build-order #1), Fonnte WhatsApp adapter, Shared Services (Approval Engine, Task Engine, Notification Engine, Audit Log, File Storage)

---

## 1. Purpose

A separate, mobile-first, glassmorphism landing site that a new hire opens from a WhatsApp link. It does four jobs:

1. Collects the hire's own personal, contact, statutory-ID and bank data, with document uploads (file picker, gallery or camera), and writes it into the existing employee record.
2. Greets the hire with a "Welcome to Nourish, {fullName}" banner once the form is submitted.
3. Serves as an orientation reference: Company Profile, Core Values, Grooming Standard, Menu, Organization Chart, Attendance Guide, Do's & Don'ts.
4. Collects the hire's feedback about joining Nourish.

## 2. Decisions locked in brainstorming

| # | Decision | Chosen |
|---|---|---|
| D1 | How hire data reaches the Employee module | HR creates a **draft employee**, sends a magic link. The hire fills only whitelisted fields. HR verifies. No direct write path that bypasses HR. |
| D2 | Departure from Basalt design system | **Full glass, gradients and rich animation**, scoped to this app only (Section 9). AA contrast and reduced-motion are held. |
| D3 | Data the hire enters | Core personal and contact data, NIK, NPWP, BPJS TK / Kesehatan, KTP / KK scans, **and** bank account details (revised 2026-09-24 — bank details were originally scoped to HR; see §4.2). |
| D4 | Content location | **Hybrid.** Company Profile, Core Values, Grooming are static in the bundle. Menu, Org Chart, Attendance Guide (incl. holidays), Do's & Don'ts are HR-editable and served by a read-only callable. |
| D5 | Feedback handling | **Named to HR, aggregated for leadership.** HR sees names and comments. GM and Director see only aggregates (Section 8). |
| D6 | Link lifecycle | **30-day token. Form locks on submit.** Welcome banner and content stay open until the token expires. HR can re-issue. |
| D7 | Where it lives | **Third Vite app `welcome/`**, own hosting target, own bundle. Not an extension of `portal/`. |

## 3. Architecture

### 3.1 App shell

- `welcome/` — own entry, `vite.welcome.config.ts`, dev port 5175, build output `dist-welcome/`, hosting target `welcome`.
- Shares the repo's `node_modules` and Basalt tokens in `src/styles/globals.css`, exactly as `portal/` does. Adds its own `welcome/src/glass.css`.
- Imports nothing else from `src/`. **No Firestore or Storage client SDK use.** All traffic goes through `httpsCallable`.
- Every portal callable is unauthenticated. The magic-link token is the credential, and `resolveWelcomeInvite(token)` is the trust boundary, as `requireActiveUser` is elsewhere.

### 3.2 Shared token library (prerequisite refactor)

`issueToken`, hashing and constant-time compare currently live in `functions/src/recruitment/portal/token.ts`. Importing that from an HR-module function would be cross-module coupling. Extract to `functions/src/lib/magicLink.ts` (parameterised TTL), repoint the recruitment portal at it, and confirm `node functions/test/portal-flow.mjs` still passes unchanged. The welcome invite uses `magicLink` with `ttlDays = 30`.

### 3.3 Lifecycle

1. A candidate reaches **Hired** in the Recruitment pipeline (Candidates tab). This already creates the employee draft automatically — `employeeNumber`, outlet, department and position come from the job requisition. `fullName` is left blank; the hire enters it in Step 1 of the form, and HR checks it against the contract at verification. The hire then appears in the **Onboarding tab** (Recruitment → Onboarding), alongside every other hired-not-yet-complete candidate.
2. From the Onboarding tab, HR clicks **Send welcome link** — a new button beside the existing **Open** button on each row — which calls `issueWelcomeInvite`. The token hash is stored on `onboardingInvites/{inviteId}` (never on the employee document). The raw token is returned once and sent by WhatsApp through the Fonnte adapter using `WELCOME_BASE_URL`. On success, `issueWelcomeInvite` also marks the tab's existing checklist item **"Send welcome link"** complete, so it counts against the "X required outstanding" number — this item is now required, not decorative; the hire's onboarding can't reach the tab's "complete" state without it. Once sent, the button becomes **Resend welcome link**, so a lost message or an expired 30-day token can be reissued without re-triggering the checklist item a second time. **Open** is a separate action — reviewing the record, including verification (step 7), not sending the link.
3. The hire opens the link → `getWelcomeSession` returns outlet, brand, `onboardingStatus`, and any saved draft values (including a partially entered name, once the hire has typed one). Nothing else — there is no HR-set name to return before the hire's first save.
4. The hire completes five steps (Section 7.1). Progress autosaves via `saveWelcomeDraft`.
5. Uploads: `requestUploadUrl` → client PUT → `finalizeUpload` (Section 6).
6. `submitWelcomeForm` validates, writes the whitelisted fields to the employee, locks the invite, sets `onboardingStatus = 'submitted'`, writes an Audit entry, notifies HR and creates a Task Engine item **"Verify onboarding data"**.
7. HR verifies from the **Open** view. This runs through the Approval Engine as a single-step route `hr/onboardingVerification` (HR Manager). Approved → `onboardingStatus = 'verified'`.

**Resolved 2026-09-25:** sending the welcome link is a **required** item on the Onboarding tab's existing checklist, not a separate action outside it (reverses the "not counted by default" note in v1.4). Two things this doesn't yet settle: (a) the checklist's own storage — a subcollection, a denormalised array, something else — isn't visible from the screenshots, so `issueWelcomeInvite` writing to it is described here by behaviour, not by an exact path; confirm the write target against the existing implementation before building. (b) This instruction covered *sending* the link specifically. The separate **"Verify onboarding data"** Task Engine item (step 6) isn't mentioned — treated as staying a Task Engine item only, not itself a second counted checklist entry, unless told otherwise.

### 3.4 Status mapping to the global workflow

| Global state | `onboardingStatus` | Set by |
|---|---|---|
| Draft | `invited` | `issueWelcomeInvite` |
| Submitted | `submitted` | `submitWelcomeForm` |
| Pending Approval | `pendingVerification` | Approval Engine on request creation (immediately after submit) |
| Approved | `verified` | `hr/onboardingVerification` approval |
| Rejected | `invited` (unlocked, with `rejectionReason`) | Rejection re-opens the invite for correction. HR re-issues the link if it has expired. |

## 4. Data model

### 4.1 Employee document — additions

`onboardingStatus`, `onboardingSubmittedAt`, `onboardingVerifiedAt`, `onboardingVerifiedBy`, `onboardingRejectionReason?`. All other base fields per `BaseDocument`.

### 4.2 Fields the hire may write (whitelist)

Enforced server-side in `submitWelcomeForm` and `saveWelcomeDraft`. Any key outside this list is rejected, not ignored.

| Group | Fields |
|---|---|
| Personal | `fullName` (text — checked against the contract at verification), `placeOfBirth` (text), `birthDate` (date), `gender` (dropdown), `religion` (dropdown), `maritalStatus` (dropdown), `bloodType` (dropdown, illustrative: A/B/AB/O, Rh optional), `tshirtSize` (dropdown, illustrative: S–XXL), `motherName` (text) |
| Contact | `phone` (num, normalised to `62…`), `personalEmail` (email), `permanentAddressKtp` (text), `domicileAddress` (text) |
| Emergency contact | `emergencyContactName` (text), `emergencyContactPhone` (num, normalised to `62…`), `emergencyContactAddress` (text), `emergencyContactRelationship` (dropdown: spouse / parents / siblings / friends / children / other), `emergencyContactRelationshipOther` (text, required only when relationship = other) |
| Identity (confidential) | `nik` (num, 16 digits), `npwp` (num, 15–16 digits), `bpjsTk` (num), `bpjsKesehatan` (num) |
| Financial (confidential) | `bankAccountName` (text, server-uppercases on save), `bankAccountNumber` (num, exactly 10 digits — BCA only, per current policy; the bank itself is a fixed label, not a field, until NGI pays through more than one bank) |
| Files | `photoFileId`, `ktpFileId`, `kkFileId`, `supportingFileIds[]` |

Read-only to the hire: `employeeNumber`, `outletId`, `departmentId`, `position`, `joinDate`, `status`, `salary` and all other compensation fields, all `onboarding*` fields.

`preferredName` was in the v1.0 whitelist but isn't in the confirmed field list above — dropped here; say so if you want it kept alongside `fullName`.

### 4.3 Confidential sub-collections

Two confidential sub-documents, both readable only with `employees.readSensitive`:

- `employees/{id}/confidential/identity` — `nik`, `npwp`, `bpjsTk`, `bpjsKesehatan`, `ktpFileId`, `kkFileId`.
- `employees/{id}/confidential/compensation` — `bankAccountName`, `bankAccountNumber`. This mirrors where salary already lives per the Employee Master plan, so bank details join an existing pattern rather than starting a new one.

This **deviates from the Employee Master plan**, which places `nik`, `npwp` and BPJS on the main document where outlet-scoped leaders can read them. **Requires sign-off (Open item M2).**

### 4.4 New collections

| Collection | Purpose | Client access |
|---|---|---|
| `onboardingInvites` | token hash, expiry, `employeeId`, `lockedAt`, `revokedAt` | none |
| `onboardingFeedback` | `employeeId`, `outletId`, `rating` (1–5), `tags[]`, `comment?` (≤1000 chars), `submittedAt` | none |
| `onboardingFeedbackSummary` | aggregates, no names (Section 8) | GM / Director / HR via callable |
| `welcomeContent` | HR-editable sections, `{id, en}` pairs, `draft` / `published` | none |

All new collections are added to `src/constants/collections.ts`. Firestore rules deny all direct client reads and writes on them. Every document carries the standard base fields.

## 5. Callable inventory

### 5.1 Authenticated (main app)

| Callable | Permission | Notes |
|---|---|---|
| `issueWelcomeInvite` | `employees.invite` (new → hrManager, superAdmin) | Draft employee only. Sends WhatsApp. Marks the Onboarding tab's "Send welcome link" checklist item complete. Audit. |
| `reissueWelcomeInvite` | `employees.invite` | Revokes the previous invite, issues a new token. |
| `revokeWelcomeInvite` | `employees.invite` | Sets `revokedAt`. |
| `updateWelcomeContent` / `publishWelcomeContent` | `welcome.manageContent` (new → hrManager) | Draft/publish, audited. Editor lives under `/documents/welcome`. |
| `listOnboardingFeedback` | `onboarding.readFeedback` (new → hrManager) | Named entries and comments. |
| `getOnboardingFeedbackSummary` | `onboarding.readSummary` (new → hrManager, GM, director, superAdmin) | Aggregates only. |
| `hr/onboardingVerification` | Approval Engine route, HR Manager | Single step. Rejection requires a reason. |

Each calls `requirePermission`, writes `recordAuditEvent`, and is wrapped in `try / catch (handleError)` per the global rules. Each is exported from `functions/src/index.ts`.

### 5.2 Unauthenticated (portal, token-gated)

`getWelcomeSession`, `saveWelcomeDraft`, `requestUploadUrl`, `finalizeUpload`, `submitWelcomeForm`, `getWelcomeContent`, `submitWelcomeFeedback`.

Every one begins with `resolveWelcomeInvite(token)`, which returns a uniform `permission-denied` for malformed, unknown, expired, revoked or (for write callables) locked tokens. The audit actor is `portal:{employeeId}`.

### 5.3 Scheduled

`aggregateOnboardingFeedback` — recomputes `onboardingFeedbackSummary`.

## 6. Uploads

- Slots: **photo** (image only), **KTP** (required), **KK** (required), **supporting** (optional, up to 2).
- **Undecided:** the bank account number is now self-reported and unverified at submission. Recommend a fifth optional slot — a photo of the ATM card or bank book — so HR can visually confirm it at verification, since a wrong digit here means a failed payroll run. Not built into this spec yet; treated as declined by default until you confirm (see Open item M10).
- Accepted: PDF, JPEG, PNG, HEIC/HEIF. Max 8 MB per file.
- `requestUploadUrl` returns a v4 signed URL scoped to `onboarding/{employeeId}/{slot}/{uuid}`, with the content type and a `content-length-range` constraint.
- `finalizeUpload` re-checks size and content type server-side, then registers the file through the **File Storage Service**.
- The camera and gallery buttons are separate controls on each slot (`<input type="file" accept capture>` for camera). Images are compressed client-side to about 2000 px before upload.
- Storage rules deny all direct client access. HR opens files through signed read URLs.

## 7. Experience

### 7.1 Form

Five steps, up from four in v1.0 — the field count roughly doubled with the confirmed list: **Personal** (name, place/date of birth, gender, religion, marital status, blood type, t-shirt size, mother's name) → **Contact** (phone, email, permanent/KTP and domicile address) → **Identity & Financial** (NIK, NPWP, BPJS, bank account) → **Emergency Contact** (name, phone, address, relationship) → **Documents**. Then a review screen. The primary action sits in a **sticky bottom bar**. Numeric IDs use IBM Plex Mono, tabular figures and a numeric keypad. Progress autosaves through `saveWelcomeDraft` and is cached locally. Offline, submit is blocked with a clear message (deliberate departure from the D3 offline-queue rule, Section 12).

### 7.2 Welcome banner

After submit (and on every return visit while the token is valid): **"Welcome to Nourish, {fullName}"** / **"Selamat datang di Nourish, {fullName}"**. A status chip carries icon and shape as well as colour: *Submitted — HR is checking your details* / *Verified*.

The first reveal is framed as an envelope-opening interaction, not a plain modal: tap to unseal a kraft envelope, a ticket-shaped glass card rises out, the headline enters word by word, then the chip settles in. **Assumption, not yet confirmed:** the open ceremony plays once, on first arrival after submit; return visits within the 30-day window show the card already open, so checking status doesn't mean re-tapping an envelope every time. A working reference of the entrance choreography (vanilla HTML/CSS/JS, not the production component) is prototyped at https://claude.ai/artifact/5ZHQcaRSaHMNsgTPLAgyLd.

### 7.3 Home and navigation

Home order: banner → "Your first week" checklist → section cards → **Feedback (last block)**.

Mobile bottom bar (five tabs, glass): **Home · About** (Profile, Values, Org Chart) **· Standards** (Grooming, Do's & Don'ts, Attendance) **· Menu · Feedback**. Desktop: a glass side rail lists all seven sections plus Feedback. The Feedback tab scrolls to the bottom block on Home.

### 7.4 Content sections

| Section | Source | Notes |
|---|---|---|
| Company Profile | static | From the Company Profile PDF. Contact block reads from editable content, not hardcoded. |
| Core Values | static | INSPIRE, bilingual, as in the Core Value PDF. |
| Grooming Standard | static | From the Grooming Standard deck: definition, hygiene, name tag, aprons, hairstyles, make-up, nails, uniform by department. |
| Menu | HR-editable | Structured data (category, item, price, dietary tags GF / V / VO / VG). One-time seed from the five menu PDFs. **Must render** "prices exclusive of 10% government tax + 6% service charge" and the allergen notice. |
| Org Chart | HR-editable | Image with pinch-zoom (the chart is too wide for a phone otherwise). |
| Attendance Guide | HR-editable | Drafted from `docs/modules/attendance.md`. Includes the 2026 public-holiday calendar, ordered by the hire's own recorded religion (Hindu / Non-Hindu lists). |
| Do's & Don'ts | HR-editable | Drafted from the grooming standard, Core Values and attendance rules. |

All labels are `{id, en}` pairs. The default language follows `navigator.language`, with an EN/ID toggle. Every screen is tested against the Indonesian string.

## 8. Feedback

- The hire gives a **rating (1–5)**, picks **theme tags** (Onboarding clarity · Team welcome · Training · Uniform & tools · Schedule) and can add an optional **comment**. One submission per hire, idempotent.
- **HR** sees who wrote each entry and the comment, and follows up. Each new entry sends HR a Notification and writes an Audit entry.
- **Leadership (GM, Director)** see only `onboardingFeedbackSummary`: average rating and tag counts, per outlet per calendar quarter, plus an all-outlet rollup. **A slice with fewer than 5 responses is suppressed** so a small intake cannot be identified. Comments never appear in the summary.

## 9. Visual system — scoped Basalt exception

This app deliberately departs from `2026-08-11-nourishos-design-system.md`. The departure is recorded as **v1.1, scoped to `welcome/` only**, in that document's change log so it is not read as drift.

**Departures (this app only)**

- Gradients, and a palette extended with the brand colours from the company decks (deep teal `#1D4244`, amber `#FFCC80`, olive) on top of Pandan `#0E4F47`. Tokens are defined in `glass.css`, never hardcoded in components.
- Glassmorphism: translucent surfaces with backdrop blur over outlet photography and gradient fields.
- Page-load and step-transition choreography.

**Held constraints**

- **WCAG AA contrast** on all text over glass. Any glass carrying text uses a dark tint at ≥55% opacity. Verified on every glass state.
- **`prefers-reduced-motion`** replaces all movement with opacity fades. `prefers-reduced-transparency` and browsers without `backdrop-filter` fall back to solid tints.
- 16 px minimum on inputs, 48 px touch targets, 8 px gaps. Primary action in a sticky bottom bar.
- Status never conveyed by colour alone (icon + shape + text).
- Archivo Variable + IBM Plex Mono only, self-hosted.
- Indonesian-length strings: no fixed-width buttons, no truncation of primary labels.

**Performance guardrails (mid-range Android)**

- Blur radius 12–16 px on mobile. At most **three** blurred layers in any viewport.
- Animate only `transform` and `opacity`. Pause the background drift when the tab is hidden.

**Motion inventory**

Staggered section reveals · sliding step transitions (200–280 ms) · word-by-word banner entrance · slow drifting background field · drawn checkmark on submit and feedback success.

## 10. Security

1. **App Check enforced** on all portal callables. **Launch blocker.** The Candidate Portal shipped without it (known gap); this portal handles NIK and identity scans.
2. Uniform "link not valid" error for every token failure. Constant-time hash comparison. 43-character base64url tokens.
3. Cap `maxInstances` on portal callables to bound abuse cost on the Blaze plan.
4. Whitelist enforcement: attempts to write `outletId`, `status`, `salary` or any `onboarding*` field are rejected. `bankAccountName`/`bankAccountNumber` are the only financial fields accepted, and only into the compensation sub-collection (§4.3) via the dedicated write path — never onto the main document.
5. A token authorises exactly one employee.
6. **Duplicate NIK** is detected server-side and surfaced only on HR's verify task. The hire is never told.
7. All Firestore and Storage access to new collections and paths is denied to clients.
8. Identity data and scans are confidential (Section 4.3). Access to them is audited.

## 11. Failure handling

| Case | Behaviour |
|---|---|
| Bad, expired, revoked or locked link | One screen: "This link isn't valid. Ask HR for a new one." HR contact comes from editable content. |
| Field validation | Server is authoritative: NIK 16 digits, NPWP 15 or 16 digits, BPJS numeric, bank account number exactly 10 digits, phone normalised to `62…`, DOB plausible. Errors are per field and say what to fix. |
| Upload failure | Per-file retry. Failed files never block already-uploaded ones. |
| Double submit / double feedback | Idempotent. No duplicates. |
| Offline | Drafts cached locally. Submit blocked with a plain message. |

## 12. Deviations to record

| Deviation | From | Why |
|---|---|---|
| Glass, gradients, extended palette, motion | Design system §2, §8, §9 | New hire sees this a handful of times, not fifty per shift. Scoped and versioned. |
| Block-on-offline for submit | Design system D3 | Hires complete this once, at home. Draft is cached. |
| Identity fields in a confidential sub-collection | Employee Master plan (fields on main doc) | Outlet-scoped leaders can read the main document. |
| Token library extracted to `lib/` | Recruitment module owning it | Avoids cross-module coupling. |

## 13. Testing

- **Emulator smoke test** `functions/test/welcome-flow.mjs`, modelled on `portal-flow.mjs`: issue invite → session → upload → submit → locked → feedback → verify → aggregate suppression under 5. The existing `portal-flow.mjs` must still pass after the token refactor.
- **Security cases:** identical errors for token probing; whitelist rejection; one token cannot touch another employee; direct client reads and writes are denied; expired and revoked links; duplicate-NIK handling.
- **Unit:** validators, phone normalisation, aggregation and suppression logic.
- **UI:** form steps (React Testing Library); Playwright at 360 px width, reduced-motion, and Indonesian strings; contrast check across glass states; Lighthouse budget on a low-end Android profile.

## 14. Acceptance criteria

1. HR can create a draft employee and send a working welcome link by WhatsApp.
2. The hire can complete all five steps, upload each document by file picker, gallery and camera, and submit. The form is then read-only.
3. Submit writes only whitelisted fields. Identity data lands in `employees/{id}/confidential/identity`; bank details land in `employees/{id}/confidential/compensation`.
4. Submit produces an Audit entry, a Notification to HR, and a Task Engine item. A verification approval request appears for HR Manager.
5. The banner shows the correct full name in the correct language on submit and on every later visit within 30 days.
6. All seven content sections render. The four HR-editable sections update without a redeploy.
7. Feedback is stored named for HR. Leadership sees only aggregates, suppressed below 5.
8. Every token failure returns the identical message.
9. Text over glass passes WCAG AA. Reduced-motion disables all movement. The app is usable at 360 px width.
10. `portal-flow.mjs` and `welcome-flow.mjs` both pass.

## 15. Open items

### Resolved during the build (2026-09-25)

| # | Item | Outcome |
|---|---|---|
| M1 | `firestore.rules` file conflict | **Stale.** There is exactly one `firestore.rules`, at the repo root. The historical `src/` copy was removed in an earlier migration. |
| M2 | Sign-off on the confidential sub-collections | **Declined for identity, already true for bank.** See §18 deviation 2. |
| M3 | Employee Master Database ships first | **Met.** It shipped long before this. |
| M4 | App Check enabled | **Not done.** See §18 deviation 5 — still a launch item. |
| M5 | `firebase.json` resides in `src/` | **Stale.** It is at the repo root. There is also no Firebase Hosting in this repo at all — see §18 deviation 6. |
| M6 | Field mapping | **Resolved.** `nik`→`nationalId`, `npwp`→`taxNumber`, `placeOfBirth`→`birthPlace`, `personalEmail`→`email`, `permanentAddressKtp`→`permanentAddress` all already existed. Genuinely new: `emergencyContactAddress`, `emergencyContactRelationship`(+`Other`), `photoFileId`, `ktpFileId`, `kkFileId`, `supportingFileIds`, and the five `onboarding*` status fields. The whole map lives in `functions/src/hr/welcome/whitelist.ts`. |
| M8 | HR contact conflict | **Sidestepped, not resolved.** No HR name or number is printed anywhere in the app. The invalid-link screen deliberately says nothing about who to contact rather than guessing. Still worth settling. |
| M9 | Record the Basalt exception | **Done**, as **v1.2** — v1.1 was already taken (2026-08-11, the D1–D3 sign-off). |
| M10 | Optional bank-proof upload | **Not built**, as the spec's own default said. The `supporting` slot takes two files, so a hire can attach a bank book there if HR asks. |
| M11 | Onboarding checklist storage | **Resolved.** It is an embedded `documentChecklist` array on `onboardingChecklists/{id}`, keyed by `itemNumber`. "Send welcome link" is new item **31**, tier `mandatory`, treatment `generate`. See §18 deviation 4 for what that does and does not cover. |

### Still open

| # | Item |
|---|---|
| M4 | **App Check.** Unchanged launch blocker in this spec's own §10.1, and still not enabled — see §18 deviation 5. |
| M7 | **Content review.** The Attendance Guide and Do's & Don'ts are HR-editable and start empty; Company Profile, Core Values and Grooming are a first-pass draft in `welcome/src/content/static.ts` and need an owner read-through. |
| M8 | **HR contact.** Company Profile vs Org Chart still disagree. |

### Can defer

| # | Item |
|---|---|
| F1 | Outlet-specific welcome variants. |
| F2 | PDF copy of the submitted form for the hire. |
| F3 | **Full automation** — auto-issuing the invite the moment a candidate reaches Hired, with no HR click. §3.3 step 2 gives the manual trigger (Send welcome link, in the Onboarding tab) a confirmed home; this item is only about removing that click entirely. |

## 16. Out of scope

Tax status, education (collected by HR). Contract signing (covered by the e-signature module). Any hire access to NourishOS itself.

## 18. What actually shipped (2026-09-25)

Six places where the build differs from the design above. Each was confirmed before building. Where they disagree, **the build is what runs**.

**1. Reaching "Hired" does not create the employee draft, so "Send welcome link" is gated on one existing.**
§3.3 step 1 says the draft appears automatically. It does not: `functions/src/recruitment/candidates.ts` refuses on purpose, because candidate data carries no NIK, contract type or probation, and a second hire path was written and deleted once already. HR creates the employee record from the Onboarding checklist's existing **Create employee record** button — which back-stamps `employeeId` onto the checklist — and only then is **Send welcome link** enabled. `issueWelcomeInvite` enforces the same precondition with a `failed-precondition` that says what to do. D1's "HR creates a draft employee, sends a magic link" is satisfied; only the claim that the draft creates itself was wrong.

**2. Identity fields stay on the main employee document; bank details use the sub-collection that already exists.**
§4.3 wanted `nik`/`npwp`/BPJS moved into a new `employees/{id}/confidential/identity`. Declined: those fields have been on the employee document since it was written (as `nationalId`/`taxNumber`/`bpjsTk`/`bpjsKesehatan`), and moving them would rewrite `EmployeeFormPage`, `EmployeeProfilePage`, `importEmployees`, `updateEmployee`'s whitelist, payroll's context loader and several reports, plus the rules — for no new capability, since the portal writes them either way. `bankAccountName`/`bankAccountNumber` go to **`employees/{id}/compensation/current`**, which is the sub-collection §4.3 was describing: it already exists, and it is already `hrManager`/`hrGeneralAdmin`/`superAdmin`-only, narrower than the employee document. A new `setEmployeeBankDetailsInternal` writes them with `{merge: true}` — the existing `setEmployeeCompensationInternal` requires `basicSalary` and rewrites the whole document, so calling it from the portal would have wiped salary and every allowance.

**3. Uploads go base64 through one callable, not a v4 signed URL.**
§6 specifies `requestUploadUrl` → client PUT → `finalizeUpload`. There is no signed-URL code anywhere in this repo, `storage.rules` requires an authenticated caller (which a new hire is not), signing needs a Service Account Token Creator IAM grant this project does not have, and the Storage emulator does not serve v4 signed URLs — so the upload leg could not be covered by `welcome-flow.mjs`. `uploadWelcomeDocument` is instead the exact shape `uploadCandidateDocument` already ships for the same reason, at the same ~8MB ceiling §6 already specifies. Images are compressed client-side to ~2000px first (`welcome/src/compress.ts`), so the ceiling is generous rather than tight. `validateFile` gained `heic`/`heif`.

**4. "Send welcome link" is checklist item 31, and only on checklists created from now on.**
`onboardingChecklists` holds its checklist as an embedded array, and each document keeps a frozen copy taken when it was generated. Item 31 therefore appears only on checklists created after this shipped; a hire already halfway through onboarding can still close without it. That is correct — a requirement added today cannot be imposed retroactively — not a gap. `issueWelcomeInvite` marks it received; `reissueWelcomeInvite` deliberately does not touch it again, because sending a link twice is not two completions of one step. The checklist also gained a denormalised `welcomeInviteSentAt`, which is what lets the Onboarding tab label the button "Resend" without reading `onboardingInvites` — a collection no client may read at all.

**5. App Check is still not enabled (M4), and the portal callables are capped instead.**
The Candidate Portal has run without it since 2026-08-19; enabling it on these five callables alone while that one stays open would be theatre, and turning it on is console plus reCAPTCHA provisioning rather than code. What did ship from §10.3 is `maxInstances: 10` on every unauthenticated callable, bounding abuse cost. **This remains this spec's own §10.1 launch blocker.**

**6. There is no Firebase Hosting target, because this repo has no Firebase Hosting.**
`firebase.json` has no `hosting` key and `.firebaserc` has no targets; the frontend deploys to Vercel. "Own hosting target" means a second Vercel project pointed at `dist-welcome/` — deployment configuration, not repo code.

**Deferred entirely: the Feedback half (§8).** `onboardingFeedback`, `onboardingFeedbackSummary`, `aggregateOnboardingFeedback`, `listOnboardingFeedback`, `getOnboardingFeedbackSummary`, the Feedback tab and the fewer-than-5 suppression rule are all out of this pass. Nothing else depends on them, and the mobile bottom bar is four tabs rather than §7.3's five as a result.

### Acceptance criteria status

1–6 and 8–9 are built. **7 is deferred** (Feedback). **10**: `portal-flow.mjs` still passes unchanged after the token refactor; `welcome-flow.mjs` is written but **was not run** — no JRE in the build environment, so no emulator. Run both before treating this as production-ready, along with the two things `welcome-flow.mjs` itself prints as uncovered: the `hr/onboardingVerification` approve **and reject** round trip, and the WhatsApp leg.

### Before it is live

- `firebase deploy --only functions,firestore:rules,firestore:indexes` **by hand** — CI still fails on the malformed `FIREBASE_SERVICE_ACCOUNT` secret, and skipping this surfaces as every new callable returning `NOT_FOUND`.
- Grant `employees.invite` and `welcome.manageContent` on the live `roles/hrManager` document — through Settings > Roles & Permissions, or `node functions/tools/sync-role-permissions.mjs --prefix employees.invite --apply` and `--prefix welcome. --apply`.
- Set `WELCOME_BASE_URL` on the functions side (a plain env var, not a secret — it is a public URL). Without it links point at the `https://welcome.nourishgroup.id` default.
- Confirm `FONNTE_TOKEN` is provisioned, or the link is created and never sent — the callable reports `delivered: false` and the UI says so, but nothing throws.
- Point a second Vercel project at `dist-welcome/`.

## 17. Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-09-24 | Initial design, approved section by section in brainstorming. |
| 1.1 | 2026-09-24 | Data model replaced with the owner's confirmed field list. `fullName` moved from HR-prefilled/read-only to hire-writable (verified at HR's check step). Bank account name/number added as hire-writable, reversing D3, routed to a new `confidential/compensation` sub-document. Marital status, blood type, t-shirt size, mother's name, place of birth, domicile address and full emergency-contact detail (address, relationship dropdown) added. `preferredName` dropped (not in the confirmed list). Form steps went from four to five. |
| 1.2 | 2026-09-24 | Fixed a leftover inconsistency from 1.1: the banner and two other spots (§1, acceptance criteria) still referenced `{firstName}`, a field that no longer exists now that `fullName` is hire-entered directly. All three now use `{fullName}`. |
| 1.3 | 2026-09-25 | §7.2: documented the envelope-opening reveal (kraft envelope → ticket-shaped card → word-by-word headline → chip), linked the working prototype, and flagged the once-per-submission-vs-every-visit replay behaviour as an unconfirmed assumption. Considered adding hire-editable Outlet/Department dropdowns to the form; declined — HR already sets both when it creates the draft (§3.3 step 1), so §4.2's read-only list stands unchanged. |
| 1.4 | 2026-09-25 | Rewrote §3.3 steps 1–2 against screenshots of the live build: the employee draft is created automatically when a candidate reaches Hired in Recruitment (not a separate manual HR action as previously written), and the hire then appears in an existing **Onboarding tab**. Specified **Send welcome link** as a new button beside the existing **Open** button on that tab, becoming **Resend welcome link** once issued. Flagged, not resolved: whether the welcome-link step counts toward the tab's existing "X required outstanding" checklist. F3 narrowed to mean full automation only, now that the manual trigger has a confirmed home. Fixed two leftover "four steps" references missed in 1.1's step-count change. |
| 1.5 | 2026-09-25 | Resolved the flag from 1.4: sending the welcome link is now a **required** Onboarding checklist item — `issueWelcomeInvite` marks it complete on success (§3.3, §5.1). The exact checklist storage to write to isn't visible from the screenshots; added as M11. Verification (the separate Task Engine item, §3.3 step 6) is explicitly *not* included in this — noted as an assumption, since the instruction only covered sending the link. |
| 1.6 | 2026-09-25 | **Built.** Added §18 recording the six confirmed deviations and the deferred Feedback half, rewrote §15's open items against what the codebase actually turned out to hold (M1/M3/M5 were stale, M2/M6/M9/M10/M11 resolved, M4/M7/M8 still open), and moved this document to its suggested location. §17 numbering left as-is so existing `// welcome-portal.md §x` citations in the code still resolve. |
