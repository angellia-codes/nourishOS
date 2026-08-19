# hr

HR domain UI: employees, recruitment, training, performance, assets, disciplinary actions.

`/hr` is a hub (`pages/HrHomePage.tsx`) with a card per sub-module.

## Built

- **`pages/`** — the employee register (`/hr/employees`), profile, form, and the appraisal review page.
- **`recruitment/`** — the hiring pipeline, four stages chained end to end:
  - **Requisitions** (`/recruitment/requisitions`) — manpower requests. Draft → HR Manager → GM; the vacancy only
    opens once the Approval Engine resolves the request (`hr/requisition` route).
  - **Candidates** (`/recruitment/candidates`) — the board, ST-01 Applied through ST-08 Withdrawn. Every candidate
    belongs to an approved requisition. Stage moves happen on the candidate page, not by dragging.
  - **Interviews** — scheduled from a candidate; each writes a `calendarEvents` doc and a task for the
    interviewer, and its 1–5 score mirrors onto the candidate.
  - **Onboarding** (`/recruitment/onboarding`) — the F01 document checklist, generated when a candidate is hired.
    Required items block completion, follow-up and optional items don't.

Not built: the compensation subdocument on a requisition, the conditional Director step for unbudgeted
requests, WhatsApp automation (no Fonnte adapter exists), and the exit/offboarding checklist. See
`docs/modules/employee-requisition.md`, `docs/core/HR_OPERATIONS.md` §9.4 and
`docs/modules/employee-onboarding-exit-checklist.md`.
