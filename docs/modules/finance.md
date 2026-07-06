# NourishOS Finance & Accounting Module

Version: 1.0
Module: Finance & Accounting

---

# 1. Overview

The Finance & Accounting module centralizes financial requests, approvals, budgeting, petty cash, and financial documentation across Headquarters and all Nourish outlets.

The module emphasizes:

- Digital approvals
- Financial transparency
- Standardized workflows
- Multi-outlet management
- Real-time financial visibility
- Audit compliance

This module does **not** replace a full accounting system in the initial release. Instead, it digitizes operational finance workflows and prepares for future accounting and payroll integrations.

---

# 2. Objectives

- Eliminate paper-based finance forms
- Digitize approval workflows
- Improve expense tracking
- Standardize budget requests
- Improve accountability
- Reduce approval time
- Support future accounting integrations

---

# 3. Supported Departments

- Finance & Accounting
- General Manager
- Director
- HR
- Purchasing
- Operations
- Kitchen
- Bar
- Floor
- Engineering

---

# 4. Module Structure

```text
Finance
│
├── Expense Requests
├── Petty Cash
├── Budget Management
├── Budget Requests
├── Payment Requests
├── Approval Center
├── Financial Dashboard
├── Reports
├── Financial Documents
└── Audit Logs
```

---

# 5. Expense Requests

## Purpose

Allow employees to request reimbursement for approved business expenses.

### Features

- Create request
- Attach receipts
- Multiple expense items
- Cost center
- Department
- Outlet
- Status tracking
- Approval workflow
- History

### Expense Categories

- Office Supplies
- Utilities
- Maintenance
- Marketing
- Transportation
- Training
- Staff Welfare
- Food & Beverage
- Other

### Workflow

```text
Employee

↓

Submit

↓

Manager Review

↓

Finance Review

↓

General Manager Approval

↓

Director Approval (if required)

↓

Approved

↓

Payment

↓

Completed
```

---

# 6. Petty Cash

## Purpose

Manage outlet petty cash digitally.

### Features

- Opening balance
- Cash in
- Cash out
- Daily reconciliation
- Closing balance
- Receipt upload
- Transaction history

### Transaction Types

- Purchase
- Reimbursement
- Cash Deposit
- Cash Withdrawal
- Adjustment

---

# 7. Budget Management

## Features

- Annual Budget
- Monthly Budget
- Department Budget
- Outlet Budget
- Budget Allocation
- Budget Utilization

### Budget Levels

Company

↓

Outlet

↓

Department

↓

Category

---

# 8. Budget Requests

## Features

- Request additional budget
- Supporting documents
- Justification
- Approval workflow
- Budget impact

### Workflow

```text
Department

↓

Manager

↓

Finance

↓

GM

↓

Director

↓

Approved
```

---

# 9. Payment Requests

## Purpose

Digitize payment requests to vendors or employees.

### Features

- Vendor selection
- Payment amount
- Invoice upload
- Due date
- Payment method
- Approval workflow

### Payment Methods

- Bank Transfer
- Cash
- Virtual Account
- QRIS
- Other

---

# 10. Approval Center

Central approval queue for Finance.

Supports

- Expense Requests
- Budget Requests
- Payment Requests
- Purchase Requests (Future)

### Status

- Draft
- Submitted
- Pending Review
- Approved
- Rejected
- Returned for Revision
- Paid
- Closed

---

# 11. Financial Dashboard

## Widgets

- Pending Approvals
- Monthly Expenses
- Budget Utilization
- Petty Cash Balance
- Outstanding Payments
- Department Spending
- Outlet Spending
- Approval Statistics

---

# 12. Reports

Standard reports include:

- Expense Report
- Budget Report
- Petty Cash Report
- Payment Report
- Approval Report
- Department Spending
- Outlet Spending
- Monthly Summary
- Yearly Summary

Supports

- Search
- Filters
- Export (PDF, Excel)
- Print

---

# 13. Financial Documents

Store

- Receipts
- Invoices
- Quotations
- Budget Files
- Payment Proof
- Supporting Documents

Storage

Firebase Cloud Storage

Metadata

Firestore

---

# 14. Approval Workflow

Standard workflow

```text
Employee

↓

Manager

↓

Finance

↓

General Manager

↓

Director

↓

Completed
```

Approval levels should be configurable by document type and monetary threshold.

---

# 15. Multi-Outlet Support

Finance data is scoped by:

- Company
- Outlet
- Department
- Cost Center

Headquarters users may access multiple outlets according to RBAC.

---

# 16. Firestore Collections

```text
expenseRequests

expenseItems

pettyCash

budgetPlans

budgetRequests

paymentRequests

financialDocuments

approvalFlows

costCenters

vendors
```

---

# 17. Cloud Functions

```text
createExpenseRequest()

submitExpenseRequest()

approveExpense()

rejectExpense()

createBudget()

updateBudget()

submitBudgetRequest()

approveBudget()

recordPettyCash()

createPaymentRequest()

approvePayment()

generateFinanceReport()
```

---

# 18. Notifications

Examples

- Expense submitted
- Expense approved
- Expense rejected
- Budget request pending
- Budget approved
- Payment due
- Petty cash below threshold
- Missing receipt reminder

Future

- Email
- WhatsApp
- Push Notifications

---

# 19. Validation Rules

Expense Requests

- At least one expense item required.
- Receipt attachment mandatory.
- Total amount must equal sum of items.
- Expense date cannot be in the future.

Budget Requests

- Justification required.
- Requested amount must be positive.

Petty Cash

- Balance cannot become negative.
- Transaction amount must be greater than zero.

Payment Requests

- Invoice required.
- Due date required.
- Vendor required.

---

# 20. Permissions

| Action            | Finance |  GM  | Director | Department Manager |
| ----------------- | :-----: | :--: | :------: | :----------------: |
| View Expenses     |   ✅    |  ✅  |    ✅    |     Team Only      |
| Create Expense    |   ✅    |  ✅  |    ✅    |         ✅         |
| Approve Expense   |   ✅    |  ✅  |    ✅    |      Limited       |
| Manage Budgets    |   ✅    | View |   View   |         ❌         |
| Approve Budget    |   ❌    |  ✅  |    ✅    |         ❌         |
| Manage Petty Cash |   ✅    | View |   View   |         ❌         |
| Payment Requests  |   ✅    | View |   View   |       Create       |
| Financial Reports |   ✅    |  ✅  |    ✅    |      Limited       |

---

# 21. Dashboard Metrics

Examples

- Monthly Operating Expenses
- Budget Remaining
- Budget Utilization %
- Petty Cash Balance
- Pending Finance Approvals
- Average Approval Time
- Outstanding Payments
- Department Spending

---

# 22. Audit Logging

Automatically record:

- Expense created
- Expense edited
- Expense approved
- Budget updated
- Budget approved
- Payment approved
- Petty cash adjustments

Each log includes:

- User
- Timestamp
- Action
- Before/After values (where applicable)

---

# 23. Performance Targets

- Expense submission ≤ 2 seconds
- Approval updates in real time
- Dashboard load ≤ 2 seconds
- Reports generated ≤ 5 seconds (target)
- File uploads show progress and retry support

---

# 24. Future Enhancements

## Accounting

- General Ledger
- Journal Entries
- Trial Balance
- Profit & Loss
- Balance Sheet
- Cash Flow

## Purchasing

- Purchase Orders
- Goods Received Notes
- Vendor Bills

## Payroll

- Payroll Integration
- Salary Approval
- Tax Reporting

## Banking

- Bank Reconciliation
- Multi-bank Accounts
- Payment Gateway

## Business Intelligence

- Financial Forecasting
- AI Expense Analysis
- Budget Prediction
- Cost Optimization
- Executive Finance Dashboard

---

# 25. Acceptance Criteria

The Finance & Accounting module is complete when:

- Expense requests are fully digital.
- Petty cash is tracked electronically.
- Budget planning and requests are managed within the system.
- Payment requests follow configurable approval workflows.
- Financial documents are securely stored and searchable.
- Dashboards provide real-time financial visibility.
- Reports support filtering and export.
- RBAC is enforced for all finance operations.
- Audit logs are generated for sensitive financial actions.
- The module is responsive across desktop, tablet, and mobile devices.
