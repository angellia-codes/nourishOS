# NourishOS Inventory Module

Version: 1.0
Module: Business Module - Inventory

---

# 1. Overview

The Inventory Module manages real-time stock tracking, movement, valuation, and control of all materials across NourishOS outlets and central warehouse.

It ensures visibility of stock levels, prevents shortages, reduces waste, and supports purchasing decisions.

This module is tightly integrated with Purchasing, Operations, and Finance.

---

# 2. Objectives

- Provide real-time stock visibility
- Standardize inventory management across outlets
- Prevent stockouts and overstocking
- Track stock movement history
- Enable FIFO/FEFO tracking
- Support costing and valuation
- Integrate with Purchasing and Operations
- Reduce manual stock counting errors

---

# 3. Scope

```text
Inventory Module
│
├── Stock Items (Master Data)
├── Stock Levels
├── Stock Movements
├── Stock Adjustments
├── Stock Transfers
├── Stock Counting (Stock Opname)
├── Waste & Loss Tracking
├── Reorder Management
├── Inventory Valuation
└── Reporting & Analytics
```

---

# 4. User Roles

- Outlet Staff
- Storekeeper
- Kitchen Leader
- Bar Leader
- Outlet Manager
- Purchasing Officer
- Finance Manager
- General Manager
- Super Admin

---

# 5. Inventory Structure

## Hierarchy

```text
Company
 ├── Warehouse (HQ)
 ├── Outlet A
 │     ├── Kitchen Stock
 │     ├── Bar Stock
 │     └── General Stock
 └── Outlet B
```

---

# 6. Stock Item Master

Each item represents a stockable material.

## Fields

- Item ID
- Item Name
- SKU
- Category (Food, Beverage, Packaging, Cleaning, Maintenance)
- Unit of Measurement (kg, liter, pcs)
- Barcode (optional)
- Cost Price
- Selling Impact (optional for recipe costing)
- Reorder Level
- Maximum Stock Level
- Supplier Reference
- Storage Condition (Chilled, Frozen, Dry)

---

# 7. Stock Levels

Tracks current inventory per location.

## Fields

- Item ID
- Outlet / Warehouse
- Current Stock
- Reserved Stock
- Available Stock
- Last Updated

---

# 8. Stock Movements

Every inventory change is recorded as a movement.

## Types

```text
IN (Stock In)

OUT (Stock Out)

TRANSFER

ADJUSTMENT

WASTE

RETURN

PRODUCTION CONSUMPTION
```

## Fields

- Movement ID
- Item ID
- Type
- Quantity
- Source Location
- Destination Location
- Reference Module (Purchasing / Operations)
- Reference ID
- Created By
- Timestamp
- Notes

---

# 9. Stock In (Receiving)

Triggered from:

- Purchasing (GRN)
- Manual stock entry

Includes:

- Supplier delivery
- Warehouse receiving
- Verified quantity

---

# 10. Stock Out

Triggered by:

- Kitchen usage
- Bar usage
- Sales (future POS integration)
- Manual removal

Requires justification for tracking.

---

# 11. Stock Transfer

Transfers stock between:

- Warehouse → Outlet
- Outlet → Outlet

## Workflow

```text
Transfer Request

↓

Approval Engine

↓

Dispatch

↓

Receiving Confirmation
```

---

# 12. Stock Adjustment

Used for corrections:

- Data entry errors
- Damaged goods
- Expired goods
- Theft/loss investigation

Requires approval (Finance or Manager level).

---

# 13. Stock Opname (Stock Counting)

Periodic physical stock counting.

## Features

- Cycle count
- Full stock count
- Variance detection
- Approval of adjustments
- Audit trail

## Variance Types

- Positive variance (missing entry correction)
- Negative variance (loss/shrinkage)

---

# 14. Waste & Loss Tracking

Tracks:

- Expired goods
- Spoilage
- Cooking waste
- Breakage
- Theft (investigation)

Used for:

- Cost control
- Operational efficiency
- KPI reporting

---

# 15. Reorder Management

Automated alerts when stock reaches threshold.

## Logic

```text
If Current Stock ≤ Reorder Level

→ Trigger Notification
→ Create Purchase Request (optional automation)
```

---

# 16. Inventory Valuation

Methods:

- FIFO (First In First Out) – Recommended
- Weighted Average Cost

Used for:

- Cost of Goods Sold (COGS)
- Financial reporting
- Profit analysis

---

# 17. Integration with Purchasing

Inventory receives:

- Goods Received Notes (GRN)
- Purchase Orders (PO updates)

Automatically updates stock levels.

---

# 18. Integration with Operations

Operations consume inventory via:

- Recipes (Future POS)
- Kitchen usage
- Bar usage
- Daily reports

---

# 19. Integration with Finance

Provides:

- Stock valuation
- Waste cost reports
- Budget impact analysis
- COGS calculation

---

# 20. Task Engine Integration

Auto-generated tasks:

- Stock count schedule
- Reorder tasks
- Transfer approvals
- Expired stock review
- Waste investigation tasks

---

# 21. Notification Integration

Triggers:

- Low stock alerts
- Overstock alerts
- Transfer requests
- Stock discrepancies
- Expired items warnings

---

# 22. File Storage Integration

Used for:

- Delivery invoices
- Stock count sheets
- Damage photos
- Supplier receipts

---

# 23. Audit Logging

Tracks:

- Stock changes
- Adjustments
- Transfers
- Count variances
- Waste entries
- Manual overrides

Ensures full traceability.

---

# 24. Search Integration

Searchable fields:

- Item name
- SKU
- Category
- Outlet
- Supplier
- Movement type

---

# 25. Firestore Collections

```text
inventoryItems

stockLevels

stockMovements

stockTransfers

stockAdjustments

stockOpname

wasteLogs

inventoryValuation
```

---

# 26. Cloud Functions

```text
createStockItem()

updateStockLevel()

recordStockMovement()

processStockTransfer()

approveStockAdjustment()

generateStockOpname()

calculateInventoryValuation()

checkReorderLevels()

recordWaste()
```

---

# 27. Reporting

## Reports

- Stock on hand
- Stock valuation
- Fast-moving items
- Slow-moving items
- Waste report
- Variance report
- Outlet stock comparison

---

# 28. Analytics

Tracks:

- Stock turnover rate
- Shrinkage rate
- Waste percentage
- Inventory accuracy
- Reorder efficiency
- Stock aging

---

# 29. RBAC

| Role               | View Stock | Adjust Stock | Transfer | Approve Adjustment | Full Control |
| ------------------ | :--------: | :----------: | :------: | :----------------: | :----------: |
| Staff              |  Limited   |      ❌      |    ❌    |         ❌         |      ❌      |
| Storekeeper        |    Full    |   Limited    | Limited  |         ❌         |      ❌      |
| Kitchen/Bar Leader | Usage Only |      ❌      |    ❌    |         ❌         |      ❌      |
| Outlet Manager     |    Full    |   Limited    | Limited  |      Limited       |      ❌      |
| Purchasing Officer |    Full    |      ❌      |   Full   |         ❌         |      ❌      |
| Finance Manager    |    Full    |      ❌      |   View   |      Approve       |      ❌      |
| GM                 |    Full    |     Full     |   Full   |      Approve       |      ❌      |
| Director           |    Full    |     Full     |   Full   |        Full        |   Limited    |
| Super Admin        |    Full    |     Full     |   Full   |        Full        |     Full     |

---

# 30. Security

- Firebase Authentication required
- RBAC enforced on all operations
- Stock adjustments require approval
- Immutable stock movement history
- Audit logging for all changes
- Secure file attachments via File Storage Service

---

# 31. Performance Targets

- Stock update ≤ 500 ms
- Movement recording ≤ 1 second
- Reorder checks real-time
- Reporting ≤ 3 seconds
- Dashboard updates near real-time

---

# 32. Future Enhancements

## Automation

- AI demand forecasting
- Auto reordering (smart procurement)
- Dynamic reorder levels
- Seasonal stock prediction

## Integration

- POS system integration
- Supplier real-time inventory sync
- Barcode scanning
- RFID tracking

## Intelligence

- Waste prediction
- Stock optimization suggestions
- Cost reduction insights

---

# 33. Acceptance Criteria

The Inventory Module is complete when:

- All stock movements are tracked in real time.
- Stock levels update automatically from Purchasing and Operations.
- Stock adjustments require approval and are audited.
- Reorder alerts function correctly.
- Inventory valuation supports Finance reporting.
- Waste tracking is implemented across outlets.
- RBAC controls all inventory actions.
- Notifications and tasks are automatically generated.
- The module integrates seamlessly with Purchasing, Finance, and Operations.
