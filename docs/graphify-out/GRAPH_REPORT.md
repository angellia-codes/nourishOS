# Graph Report - .  (2026-07-21)

## Corpus Check
- Corpus is ~10,416 words - fits in a single context window. You may not need a graph.

## Summary
- 84 nodes · 85 edges · 18 communities (10 shown, 8 thin omitted)
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.9)
- Token cost: 143,409 input · 0 output

## Community Hubs (Navigation)
- Candidate Portal Submission Flow
- Portal Plan & Design Docs
- Invite Creation & Token Lifecycle
- Application Form Steps
- Token Validation & Submission Errors
- DISC Assessment Scoring
- HR-Side Review UI (Application + DISC)
- Draft Progress Persistence
- Validation Error Types
- Firebase Functions Client Init
- i18n Labels
- i18n Language Provider
- Invite Status Check Helper
- DISC Group Type
- DISC Answers Schema
- Invite Status Type

## God Nodes (most connected - your core abstractions)
1. `PortalFlow component (validate→welcome→form→disc→review→submit→thankyou)` - 13 edges
2. `scoreDisc() pure scoring function` - 7 edges
3. `Field primitives (TextField/SelectField/YesNoField/TextAreaField/RepeatableRows)` - 7 edges
4. `Candidate Application Portal (F010 + DISC) Implementation Plan` - 6 edges
5. `Candidate Application Portal Design Spec (Approach A)` - 6 edges
6. `Invite & Token Lifecycle` - 4 edges
7. `ApplicationInvite interface` - 4 edges
8. `DISC_ITEM_BANK data (24 groups x 4 adjectives)` - 4 edges
9. `createApplicationInvite callable (authenticated, candidates.manage)` - 4 edges
10. `submitTx() — transactional submission + idempotency` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Candidate Application Portal Design Spec (Approach A)` --references--> `MAX_REPEATABLE_ROWS = 10 constant`  [INFERRED]
  specs/candidate-application-portal-design.md → plans/candidate-application-portal.md
- `DISC Questionnaire & Scoring Design` --references--> `scoreDisc() pure scoring function`  [INFERRED]
  specs/candidate-application-portal-design.md → plans/candidate-application-portal.md
- `Candidate Application Portal (F010 + DISC) Implementation Plan` --references--> `Employment Application Form Spec (F010)`  [EXTRACTED]
  plans/candidate-application-portal.md → specs/candidate-application-portal-design.md
- `Candidate Application Portal (F010 + DISC) Implementation Plan` --references--> `Acceptance Criteria (§10)`  [EXTRACTED]
  plans/candidate-application-portal.md → specs/candidate-application-portal-design.md
- `Candidate Application Portal (F010 + DISC) Implementation Plan` --references--> `Invite & Token Lifecycle`  [EXTRACTED]
  plans/candidate-application-portal.md → specs/candidate-application-portal-design.md

## Hyperedges (group relationships)
- **Invite token lifecycle: create/validate/submit callables + InviteStatus** — functions_src_recruitment_createapplicationinvite_createapplicationinvite, functions_src_recruitment_validateapplicationtoken_validateapplicationtoken, functions_src_recruitment_submitapplication_submitapplication, shared_types_applicationinvite_invitestatus [INFERRED 0.85]
- **Candidate portal submission pipeline: PortalFlow -> portalApi -> submitApplication -> submitTx** — careers_src_portalflow_portalflow, careers_src_services_portalapi_portalapi, functions_src_recruitment_submitapplication_submitapplication, functions_src_recruitment_submitapplication_submittx, shared_types_applicationform_portalsubmissionschema [INFERRED 0.85]
- **DISC item bank, scoring, and result display form one coherent behavioral-assessment concept** — shared_disc_itembank_disc_item_bank, functions_src_recruitment_discscoring_scoredisc, shared_types_discassessment_discassessment, src_features_hr_recruitment_discresultpanel_discresultpanel [INFERRED 0.85]

## Communities (18 total, 8 thin omitted)

### Community 0 - "Candidate Portal Submission Flow"
Cohesion: 0.18
Nodes (8): PortalFlow component (validate→welcome→form→disc→review→submit→thankyou), ReviewScreen, SubmitErrorScreen, ThankYouScreen, WelcomeScreen, portalApi service (validate/submit callable wrappers), PortalSubmission type (z.infer), portalSubmissionSchema (Zod)

### Community 1 - "Portal Plan & Design Docs"
Cohesion: 0.20
Nodes (11): careers App shell (routing: /:token, catch-all not-found), Employee Onboarding & Exit Checklist Spec, Employment Application Form Spec (F010), Recruitment Pipeline Spec (ST-01..ST-08 stages, candidate cards), careers Hosting target config (firebase.json / .firebaserc), Candidate Application Portal (F010 + DISC) Implementation Plan, Candidate Application Portal Design Spec (Approach A), Acceptance Criteria (§10) (+3 more)

### Community 2 - "Invite Creation & Token Lifecycle"
Cohesion: 0.22
Nodes (11): applicationInvites Firestore rules match block (server-write-only), createApplicationInvite callable (authenticated, candidates.manage), createInviteTx() — transactional invite creation, revokes prior pending, generateToken() — 32-byte base64url token + SHA-256 hash, portal-e2e-checklist.md manual verification checklist, ApplicationInvite interface, Invite & Token Lifecycle, SendApplicationLinkDialog (+3 more)

### Community 3 - "Application Form Steps"
Cohesion: 0.22
Nodes (9): Field primitives (TextField/SelectField/YesNoField/TextAreaField/RepeatableRows), DeclarationsStep, EducationStep, LanguagesStep, PersonalStep, ReferencesStep, VacancyStep, WorkExperienceStep (+1 more)

### Community 4 - "Token Validation & Submission Errors"
Cohesion: 0.25
Nodes (9): InactiveLinkScreen, submitApplication callable (public, token-gated), submitTx() — transactional submission + idempotency, hashToken() — SHA-256 hex, InviteNotActiveError class ('invite/not-active'), validateApplicationToken callable (public, token-gated), validateTokenTx() — token lookup + status/expiry check, Global Constraints (server-only writes, DISC scoring server-side, token security, bilingual labels) (+1 more)

### Community 5 - "DISC Assessment Scoring"
Cohesion: 0.29
Nodes (8): useLang() hook, DiscStep component (one group per screen), scoreDisc() pure scoring function, ADJECTIVE_DIMENSION flat lookup, DISC_ITEM_BANK data (24 groups x 4 adjectives), DiscDimension type ('D'|'I'|'S'|'C'), DiscScores interface, DISC Questionnaire & Scoring Design

### Community 6 - "HR-Side Review UI (Application + DISC)"
Cohesion: 0.33
Nodes (7): shared/index.ts barrel export, ApplicationFormPayload type (z.infer), DiscAssessment interface, DISC interpretation boundary: no hiring recommendations or fit scores, ApplicationFormView component (sensitive-field gating), DiscResultPanel component, STYLE_DESCRIPTIONS constant

### Community 7 - "Draft Progress Persistence"
Cohesion: 0.33
Nodes (6): F010_STEPS ordered step array, Draft type (client-side localStorage form state), applicationFormSchema (Zod, mirrors F010 §4), MAX_REPEATABLE_ROWS = 10 constant, DiscAnswer interface, localStorage-only draft persistence trade-off (no server draft-write surface)

## Knowledge Gaps
- **36 isolated node(s):** `Acceptance Criteria (§10)`, `Employee Onboarding & Exit Checklist Spec`, `Recruitment Pipeline Spec (ST-01..ST-08 stages, candidate cards)`, `superpowers:subagent-driven-development skill`, `superpowers:executing-plans skill` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PortalFlow component (validate→welcome→form→disc→review→submit→thankyou)` connect `Candidate Portal Submission Flow` to `Invite Creation & Token Lifecycle`, `Token Validation & Submission Errors`, `Draft Progress Persistence`?**
  _High betweenness centrality (0.217) - this node is a cross-community bridge._
- **Why does `scoreDisc() pure scoring function` connect `DISC Assessment Scoring` to `Token Validation & Submission Errors`, `Draft Progress Persistence`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **Why does `Invite & Token Lifecycle` connect `Invite Creation & Token Lifecycle` to `Portal Plan & Design Docs`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `Field primitives (TextField/SelectField/YesNoField/TextAreaField/RepeatableRows)` (e.g. with `DeclarationsStep` and `EducationStep`) actually correct?**
  _`Field primitives (TextField/SelectField/YesNoField/TextAreaField/RepeatableRows)` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Acceptance Criteria (§10)`, `Employee Onboarding & Exit Checklist Spec`, `Recruitment Pipeline Spec (ST-01..ST-08 stages, candidate cards)` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._