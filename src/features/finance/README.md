# finance

Finance domain UI: expenses, petty cash, budgets, payment requests.

## Built

- **`expenses/`** — Expense Requests (`docs/modules/expense-request.md`). `/finance` is the register itself
  rather than a hub, since one sub-module ships; `expenses/new`, `expenses/:expenseRequestId` and
  `.../edit` sit beneath it. Backed by five callables in `functions/src/finance/`.

The lifecycle is draft → attach receipts → submit → *(approval engine)* → approved → paid → closed. Receipts
have to be attached on the detail page rather than the form, because `createFileMetadata` needs an existing
`resourceId`.

### Things worth knowing before touching it

- **`totalAmount` is always computed server-side from `items`.** It is not just a validation rule: the total
  is what decides how long the approval chain is, so a client that could name its own total could route a
  50,000,000 request through the 5,000,000 chain.
- **This is the first conditional approval route.** `APPROVAL_ROUTES` in `functions/src/shared/approval/routes.ts`
  now accepts a `(context) => steps` function, and `finance/expenseRequest` is one — see
  `functions/src/finance/expenseSteps.ts`, whose behaviour is pinned by `functions/test/expense-steps.mjs`
  (no emulator needed). The context is assembled by `submitExpenseRequest` from the stored document, never
  from `request.data`.
- **Step 1 is the requester's department leader**, resolved through `DEPARTMENT_ROLES` — "Department Manager"
  is not a role that exists. The chain then drops the requester's own role (self-approval is blocked by uid,
  so a lone kitchenLeader would otherwise stall their own request), dedupes, and floors at `generalManager`.
- **Paying is gated on `expenseRequests.pay`, not on approve** — a GM who approved cannot disburse.
- Items are embedded on the request; `expenseItems` stays unused. Receipts are `files` documents queried by
  `resourceType`/`resourceId`, not a `receiptFileIds` array.

## Planned

Petty cash, budget plans and requests, payment requests, cost centres and vendors — `docs/modules/finance.md`
is the spec. Their collections are declared in `src/constants/collections.ts` but have no `firestore.rules`
block, so they are denied rather than open.
