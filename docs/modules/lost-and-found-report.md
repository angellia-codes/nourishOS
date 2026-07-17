# NourishOS — Lost & Found Item Report

Version: 1.0
Module: Operations (light CRM touchpoint — see §2)
Collection: `lostFoundItems` (new)
Depends on: File Storage, Notification Engine, Audit Log; optionally Task Engine, CRM (`customers`), Security (`incidentReports`)

---

## 1. Purpose

Log items found on-premises, track them through storage and claim verification, and enforce a retention/disposal policy — replacing the notebook-at-the-host-stand approach with a searchable, auditable record. Also gives staff a way to check "has anyone turned this in?" against found items when a customer reports something missing.

---

## 2. Architecture Decision — New Module, No Existing Spec to Reconcile

Unlike the last few templates, Lost & Found doesn't appear anywhere in the existing docs — not in `operations.md`, not in the Firestore structure list, not in any module's Cloud Functions list. This is a clean new build, not a reuse/extend/conflict call.

**Placement:** Operations, not CRM. It's fundamentally a physical-premises log (an item, a location, a staff member, a storage bin) — the same shape as Incident Reports or Daily Reports. CRM involvement is optional and shallow: if the claimant is a known repeat customer, `claimedBy.customerId` can link to the existing `customers` collection for continuity, but this module doesn't require or create CRM records. Don't build a parallel customer-intake flow here.

**No separate "Lost Item Inquiry" collection.** When a customer asks whether something they lost has turned up, staff search the existing `lostFoundItems` log (by category, date range, outlet, description keywords via Search Service) rather than logging the inquiry itself as a new document type. A parallel "inquiries" collection would just be a second place the same match has to be reconciled against — same reasoning as not forking `dailyUpdates` from `dailyReports`.

---

## 3. Found Item Form Template

### Section A — Item Details
| Field | Type | Required |
| --- | --- | --- |
| Item Description | Textarea | Yes |
| Category | Select: Electronics / Wallet / Bag / Clothing / Jewelry / Documents / Keys / Eyewear / Other | Yes |
| Estimated Value Tier | Select: Low / Medium / High | Yes — drives extra visibility, not an appraised amount |
| Photo | Required upload | Yes — identification and dispute protection; reuse the timestamp-stamping utility already built for Security Patrol/Incident evidence |

### Section B — Found Context
| Field | Type | Required |
| --- | --- | --- |
| Found Location | Text | Yes | e.g. "Table 12", "Restroom", "Parking area" |
| Date/Time Found | Datetime | Yes | Defaults to now |
| Found By | Auto-filled | — | Staff submitting |
| Storage Location | Text | Yes | Where it's being kept — front desk drawer, manager's safe for high-value items |
| Related to a reported incident? | Optional link to `incidentReports` | No | e.g. found during a theft investigation walkthrough |

### Section C — Claim (filled when someone comes to collect it)
| Field | Type | Required |
| --- | --- | --- |
| Claimant Name | Text | Yes, on claim |
| Claimant Phone/Email | Text | At least one |
| Existing Customer? | Optional link to `customers` | No |
| Identifying Details Given | Textarea | Yes — what they described before staff confirmed the match |
| ID Verified | Boolean | Yes, for Medium/High value tier |
| Released By | Auto-filled | Staff processing return |

---

## 4. Firestore Schema

```typescript
// lostFoundItems/{itemId}
interface LostFoundItem extends BaseDocument {
  itemNumber: string               // LF-2026-0001

  itemDescription: string
  category: 'electronics' | 'wallet' | 'bag' | 'clothing' | 'jewelry'
          | 'documents' | 'keys' | 'eyewear' | 'other'
  valueTier: 'low' | 'medium' | 'high'

  foundLocation: string
  foundAt: Timestamp
  foundBy: string                  // uid
  storageLocation: string
  linkedIncidentId?: string        // FK → incidentReports, optional

  status: 'logged' | 'claimPending' | 'returned' | 'unclaimed' | 'disposed' | 'donated'

  claimedBy?: {
    name: string
    phone?: string
    email?: string
    customerId?: string            // FK → customers, optional
  }
  identifyingDetailsGiven?: string
  idVerified?: boolean
  returnedAt?: Timestamp
  returnedBy?: string               // uid

  retentionExpiresAt: Timestamp    // foundAt + category-based hold period, see §5
  disposalMethod?: 'donated' | 'discarded' | 'handedToAuthorities'
  disposedAt?: Timestamp
  disposedBy?: string

  attachments: string[]            // File IDs — item photo mandatory

  // BaseDocument: id, createdAt, updatedAt, createdBy, updatedBy,
  // outletId, departmentId, isArchived
}
```

---

## 5. Retention Policy — Flagging, Not Assuming

No retention period for unclaimed items is documented anywhere in the existing PRDs, and this isn't something to guess at — it's a business/legal call (Indonesian consumer or lost-property norms aren't something I'd assert without you confirming actual company policy). Suggested defaults below are a starting point for you to approve or override, not a decision already made:

| Category | Suggested Hold | Notes |
| --- | --- | --- |
| Documents (ID, passport, cards) | 90 days, or hand to authorities sooner | Identity documents often have separate local handling norms — confirm |
| Electronics, jewelry, wallets (cash) | 60 days | High-value tier |
| Bags, clothing, eyewear, keys | 30 days | |
| Other / low value | 14 days | |

`retentionExpiresAt` is set on creation from this table. A scheduled function (§7) flags items approaching or past expiry for a manager decision — it does not auto-dispose anything.

---

## 6. Workflow

```text
Item found → logged (photo mandatory, retentionExpiresAt calculated)
  ↓
High/Medium value → notify Outlet Manager + GM immediately (visibility, not approval-gated)
  ↓
Claimant appears → claimPending (identifying details captured)
  ↓ match confirmed                          ↓ no match / suspicious
returned (ID verified for Medium/High)      remains logged, notes added
  ↓
Retention period passes, unclaimed
  ↓
Manager decides: unclaimed → disposed / donated / handedToAuthorities
```

No Approval Engine involvement — this is a single-owner operational log (whichever staff member is handling the item at each step), same reasoning as Incident Reports: routing by context, not a fixed sequential sign-off chain.

---

## 7. Cloud Functions

| Function | Purpose | RBAC check |
| --- | --- | --- |
| `createLostFoundItem` | Validate (photo required), generate item number, calculate `retentionExpiresAt`, notify on high/medium value | `lostFound.create` |
| `claimLostFoundItem` | Capture claimant + verification, transition to `returned`, audit log | `lostFound.manage` |
| `disposeLostFoundItem` | Transition `unclaimed` → `disposed`/`donated`/`handedToAuthorities`, requires method + notes | `lostFound.manage` |
| `checkLostFoundRetention` | Scheduled, daily. Flags items within 7 days of `retentionExpiresAt` or past it; notifies Outlet Manager — mirrors `checkOverdueCheckpoints`'s cooldown pattern so it doesn't re-notify every run | server-side |

### Permissions (need to be added — new module)
`lostFound.create`, `lostFound.view`, `lostFound.view_all`, `lostFound.manage`

| Role | create | view (own outlet) | view_all | manage |
| --- | --- | --- | --- | --- |
| Floor Leader / Department Leader | ✅ | ✅ | — | — |
| Outlet Manager | ✅ | ✅ | — | ✅ (own outlet) |
| Security | ✅ | ✅ | — | — |
| General Manager | — | — | ✅ | ✅ |
| Super Admin | ✅ | ✅ | ✅ | ✅ |

---

## 8. Notification Matrix

| Event | Recipient | Timing |
| --- | --- | --- |
| High/Medium value item logged | Outlet Manager + GM | Immediate |
| Item claimed and returned | Outlet Manager | On return |
| Retention expiring (7 days out) | Outlet Manager | Once, via scheduled check |
| Retention expired, still unclaimed | Outlet Manager + GM | Once, via scheduled check |

---

## 9. Dashboard Hooks (new — not in existing `dashboard.md`)

| Widget | Source |
| --- | --- |
| Operations Dashboard — "Unclaimed Items Nearing Disposal" | `lostFoundItems` where `status == 'logged' AND retentionExpiresAt <= now + 7d` |
| Operations Dashboard — "Items Logged (30 days)" | Count, informational |

---

## 10. Acceptance Criteria

1. A photo attachment is mandatory before an item can be logged
2. `retentionExpiresAt` is set automatically from category at creation, never left blank
3. Medium/High value items trigger an immediate notification to Outlet Manager and GM
4. Returning an item requires claimant name plus at least one contact method; ID verification is mandatory for Medium/High value before release
5. Items cannot move to `disposed`/`donated`/`handedToAuthorities` before `retentionExpiresAt`, without manager override + reason logged
6. Retention-check notifications fire once per threshold per item — not repeated daily
7. Every status transition (log, claim, return, dispose) produces an audit log entry
8. Staff can search prior found items by category, date range, and outlet to answer a customer inquiry without a separate inquiry record existing
