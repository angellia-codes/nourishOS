# NourishOS — Expense Request

Version: 1.0
Module: Finance
Collection: `expenseRequests` (existing placeholder — schema not yet built against)
Depends on: Approval Engine (generic, already built), Notification Engine, Audit Log, File Storage

---

## 1. Status Check

Like Incident Reports and Lost & Found, `expenseRequests` exists only as a name in `finance.md`, `FIRESTORE_SCHEMA.md`, and `API.md` — no `functions/src/finance/` implementation, no `ExpenseRequest` type, `src/features/finance/README.md` is a one-line stub. This is a new build.

Good news: the **generic Approval Engine machinery is already built and working** — `submitApprovalInternal()` and `registerApprovalResolvedHandler()` (used by the Appraisal module) are exactly the shared-service pattern this needs. This spec wires Expense Requests into that existing engine rather than writing bespoke approval logic — the same "no module owns its own approval logic" principle already proven out elsewhere in the codebase.

---

## 2. Flag — Conflicting Approval Chain in the Docs

Two different chains exist for the same workflow:
- `finance.md` §5/§14: Employee → Manager → **Finance** → GM → Director (if required)
- `FEATURE_SPECIFICATIONS.md` Module 6: Employee → Manager → **HR** → GM → Director

HR has no obvious role in expense approval — this reads like a copy-paste artifact from the HR module's template. `approval_engine.md` §6's own concrete configuration example uses the Finance chain with a monetary threshold, which is also the more operationally sensible version. **This spec follows `finance.md`'s Finance-review chain; treat `FEATURE_SPECIFICATIONS.md`'s HR step as a documentation error to fix, not a second valid path.**

---

## 3. Approval Routing (per `approval_engine.md` §6 — already documented, not invented here)

| Total Amount | Chain |
| --- | --- |
| ≤ IDR 5,000,000 | Requester → Department Manager → Finance |
| > IDR 5,000,000 | Requester → Department Manager → Finance → General Manager → Director |

`submitExpenseRequest` builds the `steps` array from this threshold and calls `submitApprovalInternal({ module: 'finance', resourceType: 'expenseRequest', resourceId, requestedBy, steps })` — the same call shape the Appraisal module already uses. No new approval logic to write, only the step-building and a resolved-handler registration.

---

## 4. Expense Request Form Template

### Section A — Request Details
| Field | Type | Required |
| --- | --- | --- |
| Purpose / Justification | Textarea | Yes |
| Category | Select: Office Supplies / Utilities / Maintenance / Marketing / Transportation / Training / Staff Welfare / Food & Beverage / Other | Yes |
| Department | Auto-filled | Yes |
| Outlet | Auto-filled | Yes |
| Cost Center | Select | No | FK → `costCenters`, if applicable |
| Expense Date | Date | Yes | Cannot be in the future |

### Section B — Expense Items (repeatable)
| Field | Type | Required |
| --- | --- | --- |
| Item Description | Text | Yes |
| Amount | Number (IDR) | Yes |
| Category | Select | No | Can differ per item within one request |

Total is calculated from items, not entered separately — matches the existing validation rule "total amount must equal sum of items" by construction rather than requiring a separate check.

### Section C — Attachments
| Field | Type | Required |
| --- | --- | --- |
| Receipt(s) | File upload | Yes, at least one — matches existing validation rule |

---

## 5. Architecture Decision — Embed Items, Don't Split Into a Second Collection

`finance.md`'s Firestore Collections list (§16) shows `expenseRequests` and `expenseItems` as two separate top-level collections. **Recommend embedding items as an array on the parent document instead** — they're always read and written together, never queried independently across requests (per `FIRESTORE_SCHEMA.md` §37: "use subcollections only when child records are tightly coupled to a parent document," and this is about as tightly coupled as it gets). A separate collection means two writes per submission and a join on every read for no query benefit. Category-level reporting granularity (needed for "Category-wise" dashboard breakdowns) is still achievable by aggregating the embedded array in the Reports Cloud Function aggregator — same pattern already used elsewhere in `reports.md` §9.

Flagging this as a deviation from the documented schema, not silently changing it — confirm before implementation if there's a reason for the split I'm not seeing (e.g. a planned per-item approval step), otherwise recommend embedding.

---

## 6. Firestore Schema

```typescript
// expenseRequests/{requestId}
interface ExpenseRequest extends BaseDocument {
  requestNumber: string             // EXP-2026-0001

  requestedBy: string                // uid
  purpose: string
  category: 'officeSupplies' | 'utilities' | 'maintenance' | 'marketing'
          | 'transportation' | 'training' | 'staffWelfare' | 'foodBeverage' | 'other'
  costCenterId?: string
  expenseDate: string                // ISO date, cannot be future

  items: {
    description: string
    amount: number
    category?: ExpenseRequest['category']
  }[]
  totalAmount: number                 // derived from items, stored for query/display

  receiptFileIds: string[]            // at least one required

  /** Overrides BaseDocument's generic status — approval-phase values mirror
   *  Approval Engine's own status set; paid/closed are Finance-specific
   *  post-approval states the Approval Engine doesn't manage. */
  status: 'draft' | 'submitted' | 'pendingApproval' | 'approved'
        | 'rejected' | 'returnedForRevision' | 'cancelled' | 'paid' | 'closed'
  approvalRequestId?: string          // FK → approvalRequests

  paidAt?: Timestamp
  paidBy?: string
  paymentReference?: string

  // BaseDocument: id, createdAt, updatedAt, createdBy, updatedBy,
  // outletId, departmentId, isArchived
}
```

---

## 7. Cloud Functions

| Function | Purpose | RBAC check |
| --- | --- | --- |
| `createExpenseRequest` | Draft only — validate items non-empty, receipt attached, `expenseDate` not future, `totalAmount` = sum of items | Owner-scoped, no dedicated permission (matches the existing pattern where draft creation of one's own record doesn't require a distinct permission — only `submit` does) |
| `updateExpenseRequest` | Draft-only edits | Owner |
| `submitExpenseRequest` | Build threshold-based steps (§3), call `submitApprovalInternal`, set `status: 'pendingApproval'` | `EXPENSE_REQUESTS_SUBMIT` (existing permission) |
| `onExpenseRequestApprovalResolved` | Registered via `registerApprovalResolvedHandler('expenseRequest', ...)` — sets `status: 'approved'` or `'rejected'`, notifies requester + Finance | server-side, triggered by Approval Engine resolution |
| `markExpensePaid` | `approved` → `paid`, records payment reference | New permission needed — see §8 |
| `closeExpenseRequest` | `paid` → `closed` | Finance or auto after N days |

Note: `approveExpenseRequest`/`rejectExpenseRequest` from the documented Cloud Functions list (`finance.md` §17) aren't needed as separate functions — the generic Approval Engine's own `approveDocument`/`rejectDocument` calls already handle step resolution, same as Appraisal. Writing module-specific approve/reject functions would duplicate what the shared engine does.

### Permissions
`EXPENSE_REQUESTS_SUBMIT`, `EXPENSE_REQUESTS_APPROVE`, `EXPENSE_REQUESTS_REJECT` already exist in `permissions.ts` — reuse, don't recreate. One gap: **no payment-execution permission exists.** Approving an expense and disbursing the money are different actions with different risk profiles (approval is authorization, payment is money actually moving) and arguably should not share a permission. Recommend adding `EXPENSE_REQUESTS_PAY` (`expenseRequests.pay`), scoped to Finance role only — flagging this as a new addition, not assuming `APPROVE` covers it.

| Role | Create (own) | Submit | Approve (Approval Engine step) | Pay | View |
| --- | --- | --- | --- | --- | --- |
| Staff / Department Leader | ✅ | ✅ | — | — | own |
| Department Manager | ✅ | ✅ | ✅ (step 1) | — | team |
| Finance | ✅ | ✅ | ✅ (step 2) | ✅ | all |
| General Manager | ✅ | ✅ | ✅ (step 3, if >5M) | — | all |
| Director | ✅ | ✅ | ✅ (step 4, if >5M) | — | all |
| Super Admin | ✅ | ✅ | ✅ | ✅ | all |

---

## 8. Notification Matrix

| Event | Recipient | Timing |
| --- | --- | --- |
| Submitted | First approver (Department Manager) | Immediate — handled by Approval Engine's existing `notifyStepApprovers` |
| Each step approved | Next approver | Immediate |
| Fully approved | Requester + Finance | On resolution |
| Rejected / returned for revision | Requester (with comments) | On resolution |
| Paid | Requester | On payment |

---

## 9. Dashboard Hooks

| Widget (`finance.md` §11, already specified) | Source |
| --- | --- |
| Pending Approvals | `approvalRequests` where `resourceType == 'expenseRequest' AND approvalStatus == 'pending'` |
| Monthly Expenses | `expenseRequests` where `status IN ('approved','paid','closed')`, grouped by month |
| Department Spending | Same, grouped by `departmentId` |
| Outlet Spending | Same, grouped by `outletId` |

---

## 10. Acceptance Criteria

1. Cannot submit without at least one item, at least one receipt attachment, and `expenseDate` ≤ today — matches `finance.md` §19 exactly
2. `totalAmount` is always the sum of `items[].amount` — enforced by computing it server-side, not trusting client input
3. Requests ≤ IDR 5,000,000 route through 2 approval steps; requests above route through 4 — verified against `approval_engine.md` §6's documented example
4. `onExpenseRequestApprovalResolved` correctly updates `status` and notifies the requester within the same transaction as the Approval Engine's resolution
5. `markExpensePaid` requires the new `EXPENSE_REQUESTS_PAY` permission — a GM or Director who approved the request cannot also mark it paid unless they separately hold that permission
6. Every status transition produces an audit log entry
7. Dashboard "Pending Approvals" widget reflects a new submission within one refresh cycle, sourced from `approvalRequests`, not a duplicated status field on `expenseRequests`
