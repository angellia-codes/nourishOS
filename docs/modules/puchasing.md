# NourishOS Purchasing Module

Version: 1.0
Module: Business Module - Purchasing

---

# 1. Overview

The Purchasing Module manages all procurement activities across NourishOS outlets and headquarters.

It standardizes the entire procurement lifecycle—from purchase request to supplier management, quotation comparison, approval workflows, purchase orders, and delivery tracking.

This module ensures cost control, transparency, and accountability across all purchasing activities.

---

# 2. Objectives

- Centralize procurement process
- Standardize purchasing workflow
- Enforce approval controls
- Improve supplier management
- Track procurement costs
- Ensure budget compliance
- Integrate with Finance and Inventory
- Reduce manual purchasing processes

---

# 3. Scope

```text
Purchasing Module
│
├── Purchase Requests (PR)
├── Purchase Orders (PO)
├── Supplier Management
├── Quotation Requests (RFQ)
├── Price Comparison
├── Goods Receiving
├── Purchase History
├── Budget Tracking
└── Reporting
```

---

# 4. User Roles

- Requester (Staff)
- Outlet Manager
- Purchasing Officer
- Finance Manager
- General Manager
- Director
- Supplier (External - future portal)

---

# 5. Core Workflow

## Standard Procurement Flow

```text
Purchase Request (PR)

↓

Approval Engine

↓

Quotation Request (RFQ)

↓

Supplier Submission

↓

Price Comparison

↓

Approval (Finance / GM / Director)

↓

Purchase Order (PO)

↓

Goods Delivery

↓

Goods Received Note (GRN)

↓

Finance Payment
```

---

# 6. Purchase Request (PR)

## Purpose

Initiates procurement needs from any department.

## Fields

- PR ID
- Requester
- Department
- Outlet
- Item Name
- Quantity
- Estimated Price
- Justification
- Priority
- Required Date
- Attachments
- Status

## Status

```text
Draft

Submitted

Approved

Rejected

Cancelled
```

---

# 7. Approval Flow

PRs are processed through the **Approval Engine**.

Typical flow:

```text
Requester

↓

Outlet Manager

↓

Purchasing Officer

↓

Finance Manager (if budget-related)

↓

General Manager

↓

Director (high value)
```

Approval steps depend on:

- Amount threshold
- Category
- Outlet
- Department

---

# 8. Quotation Management (RFQ)

## Purpose

Request pricing from multiple suppliers.

## Features

- Multi-supplier RFQ
- Deadline tracking
- Supplier comparison
- Attachment support
- Auto reminders

## Fields

- RFQ ID
- Linked PR ID
- Supplier List
- Items
- Submission Deadline
- Status

---

# 9. Supplier Management

## Supplier Profile

- Supplier ID
- Company Name
- Contact Person
- Phone / Email
- Address
- Category (Food, Equipment, Maintenance, etc.)
- Payment Terms
- Rating
- Active Status

## Features

- Supplier performance tracking
- Purchase history per supplier
- Preferred supplier tagging
- Blacklist management

---

# 10. Purchase Order (PO)

## Purpose

Formal authorization to purchase goods.

## Fields

- PO ID
- Linked PR ID
- Linked RFQ ID
- Supplier ID
- Items
- Unit Price
- Total Amount
- Tax
- Delivery Date
- Status

## Status

```text
Draft

Issued

Accepted

Delivered

Partially Delivered

Cancelled
```

---

# 11. Goods Receiving (GRN)

## Purpose

Confirms delivered goods.

## Fields

- GRN ID
- PO ID
- Received By
- Received Date
- Items Received
- Quantity Variance
- Condition Notes
- Attachments (Photos)

## Features

- Partial receiving support
- Damage reporting
- Discrepancy tracking

---

# 12. Budget Control

Integrates with Finance module.

Checks:

- Available budget
- Department allocation
- Outlet budget limits

Blocks or escalates requests exceeding budget.

---

# 13. Task Engine Integration

Automatically generates tasks:

Examples:

- Request approval task
- RFQ follow-up task
- Goods receiving task
- Supplier evaluation task
- Payment processing task

---

# 14. Notification Integration

Triggers notifications:

- PR submitted
- PR approved/rejected
- RFQ response received
- PO issued
- Goods delivered
- Payment pending

---

# 15. File Storage Integration

Used for:

- Supplier quotations
- Invoices
- Delivery notes
- Purchase contracts
- GRN photos

Stored via **File Storage Service**

---

# 16. Audit Logging

Tracks:

- PR creation
- Approval actions
- RFQ updates
- PO issuance
- GRN confirmation
- Supplier changes
- Price updates

Ensures full procurement traceability.

---

# 17. Search Integration

Searchable fields:

- PR ID
- PO ID
- Supplier Name
- Item Name
- Category
- Status
- Outlet
- Department

---

# 18. Firestore Collections

```text
purchaseRequests

purchaseOrders

rfqs

suppliers

grns

supplierRatings

purchaseHistory
```

---

# 19. Cloud Functions

```text
createPurchaseRequest()

submitPurchaseRequest()

approvePurchaseRequest()

createRFQ()

submitRFQResponse()

compareQuotations()

createPurchaseOrder()

receiveGoods()

updateSupplier()

calculateBudgetUsage()

generatePurchaseReport()
```

---

# 20. Reporting

## Reports

- Monthly spending
- Supplier performance
- Price comparison reports
- Budget utilization
- Outlet-wise procurement
- Category-wise purchases

---

# 21. Analytics

Tracks:

- Average approval time
- Supplier response time
- Price variance
- Purchase frequency
- Budget overruns
- Procurement cycle time

---

# 22. RBAC

| Role               |      PR       | RFQ  |   PO    | GRN  | Supplier Mgmt |
| ------------------ | :-----------: | :--: | :-----: | :--: | :-----------: |
| Staff              |    Create     |  ❌  |   ❌    |  ❌  |      ❌       |
| Outlet Manager     |    Approve    |  ❌  |   ❌    |  ❌  |      ❌       |
| Purchasing Officer |     Full      | Full |  Full   | Full |    Limited    |
| Finance Manager    | View/Approve  | View | Approve | View |     View      |
| GM                 |    Approve    | View | Approve | View |     View      |
| Director           | Full Override | Full |  Full   | Full |     Full      |
| Super Admin        |     Full      | Full |  Full   | Full |     Full      |

---

# 23. Security

- RBAC enforced on all procurement actions
- Supplier data access restricted
- Financial thresholds protected
- Immutable PO records after issuance
- Audit logging for all changes
- Secure file attachments via File Storage Service

---

# 24. Performance Targets

- PR creation ≤ 500 ms
- Approval actions ≤ 1 second
- RFQ processing async
- PO generation ≤ 1 second
- Reporting ≤ 3 seconds

---

# 25. Future Enhancements

## Supplier Portal

- Supplier self-registration
- RFQ submission portal
- Invoice submission

## Automation

- Auto-suggest suppliers
- AI price comparison
- Auto PO generation
- Smart reordering

## Integration

- Inventory system (real-time stock)
- Accounting software
- Bank payment systems
- E-invoicing APIs

---

# 26. Acceptance Criteria

The Purchasing Module is complete when:

- Purchase Requests can be created, approved, and tracked.
- RFQs can be sent and compared across suppliers.
- Purchase Orders are generated from approved requests.
- Goods Receiving is recorded accurately.
- Budget controls are enforced via Finance integration.
- Notifications and tasks are automatically generated.
- Audit logs capture all procurement actions.
- RBAC restricts access appropriately.
- The module integrates seamlessly with Approval Engine, Task Engine, Notification Engine, and File Storage Service.
