# NourishOS Operations Module

Version: 1.0
Module: Operations

---

# 1. Overview

The Operations module digitizes the daily operational activities across all Nourish outlets.

Its purpose is to standardize operations, eliminate paper-based processes, improve accountability, and provide real-time operational visibility.

The module supports:

- Headquarters
- Multiple outlets
- Multiple departments
- Mobile-first operations (PWA)

---

# 2. Objectives

- Standardize operational procedures
- Digitize all operational checklists
- Enable real-time reporting
- Improve issue tracking
- Reduce response times
- Increase operational visibility
- Support multi-outlet management

---

# 3. Supported Departments

- Kitchen
- Bar
- Floor Service
- Security
- Engineering
- General Manager

Future

- Bakery
- Wholefood
- Warehouse

---

# 4. Module Structure

```text
Operations
│
├── SOP Library
├── Opening Checklists
├── Closing Checklists
├── Daily Reports
├── Shift Handover
├── Incident Reports
├── Engineering Work Orders
├── Preventive Maintenance
├── Equipment Inspections
├── Operational Calendar
└── Operations Dashboard
```

---

# 5. SOP Library

## Purpose

Provide one centralized repository for operational SOPs.

### Features

- Browse by department
- Search
- Categories
- Version history
- PDF preview
- Download
- Approval workflow
- Read acknowledgment (future)

### Categories

- Kitchen
- Bar
- Floor
- Security
- Engineering
- HR
- Finance

### Workflow

```text
Draft

↓

Review

↓

Approve

↓

Publish

↓

Archive
```

---

# 6. Opening Checklist

## Purpose

Ensure each department completes opening procedures before operations begin.

### Features

- Daily checklist
- Assigned by department
- Required tasks
- Photo attachments
- Comments
- Completion tracking
- Manager verification

### Example Items

Kitchen

- Equipment inspection
- Refrigerator temperature
- Ingredient preparation
- Hygiene check

Bar

- Coffee machine check
- Grinder calibration
- Ice machine check
- Milk inventory

Floor

- Dining area clean
- POS operational
- Tables prepared
- Music and lighting checked

### Workflow

```text
Checklist Created

↓

Employee Completes

↓

Leader Reviews

↓

Completed
```

---

# 7. Closing Checklist

## Purpose

Ensure all closing procedures are completed consistently.

### Features

- Department-specific checklist
- Photo verification
- Sign-off
- Daily archive

### Example Items

Kitchen

- Equipment cleaned
- Waste disposed
- Gas turned off
- Refrigeration checked

Bar

- Coffee machine cleaned
- Cash reconciled
- Inventory secured

Floor

- Tables sanitized
- Lights switched off
- Doors locked

---

# 8. Daily Reports

## Purpose

Provide standardized daily operational reporting.

### Sections

- Shift Summary
- Customer Feedback
- Operational Issues
- Team Attendance (future integration)
- Sales Notes (future)
- Maintenance Requests
- Attachments

### Workflow

```text
Create Report

↓

Complete Sections

↓

Submit

↓

Manager Review

↓

Archive
```

---

# 9. Shift Handover

## Features

- Incoming shift
- Outgoing shift
- Outstanding tasks
- Important notes
- Equipment status

### Benefits

- Better communication
- Reduced information loss
- Improved accountability

---

# 10. Incident Reports

## Purpose

Capture operational incidents consistently.

### Incident Types

- Customer Complaint
- Food Safety
- Workplace Injury
- Equipment Failure
- Theft
- Security Incident
- Utility Failure
- Near Miss

### Severity

- Low
- Medium
- High
- Critical

### Workflow

```text
Report Incident

↓

Manager Review

↓

Investigation

↓

Resolution

↓

Closed
```

### Attachments

- Photos
- Videos (future)
- Documents

---

# 11. Engineering Work Orders

## Purpose

Manage maintenance requests and repairs.

### Features

- Create request
- Assign engineer
- Priority
- Due date
- Progress updates
- Completion confirmation
- Attachments

### Priorities

- Low
- Normal
- High
- Critical

### Status

- Open
- Assigned
- In Progress
- Waiting Parts
- Completed
- Closed

### Workflow

```text
Request

↓

Assign Engineer

↓

In Progress

↓

Completed

↓

Manager Verification

↓

Closed
```

---

# 12. Preventive Maintenance

## Features

- Maintenance schedules
- Recurring tasks
- Equipment lifecycle
- Maintenance history
- Reminders

### Examples

- Coffee machine servicing
- Air conditioner cleaning
- Refrigerator inspection
- Fire extinguisher checks

---

# 13. Equipment Inspections

Track operational equipment.

### Information

- Equipment ID
- Location
- Condition
- Inspection date
- Inspector
- Next inspection

---

# 14. Operational Calendar

Displays

- Maintenance schedules
- Training
- Audits
- Events
- Public holidays
- Store activities

---

# 15. Operations Dashboard

Widgets

- Daily Reports Submitted
- Checklist Completion
- Open Incidents
- Work Orders
- Maintenance Due
- Department Status
- Outlet Status

---

# 16. Firestore Collections

```text
sops

openingChecklists

closingChecklists

dailyReports

shiftHandovers

incidentReports

workOrders

preventiveMaintenance

equipment

equipmentInspections
```

---

# 17. Cloud Functions

```text
createChecklist()

completeChecklist()

submitDailyReport()

createIncident()

assignWorkOrder()

updateWorkOrder()

closeWorkOrder()

scheduleMaintenance()

completeMaintenance()

publishSOP()
```

---

# 18. Notifications

Examples

- Checklist due
- Checklist overdue
- Incident reported
- Work order assigned
- Work order completed
- Maintenance reminder
- SOP updated

Future

- Push notifications
- WhatsApp alerts
- Email notifications

---

# 19. Permissions

| Action                 | Leader |   GM    | Engineering | Security |   HR    |
| ---------------------- | :----: | :-----: | :---------: | :------: | :-----: |
| View SOP               |   ✅   |   ✅    |     ✅      |    ✅    |   ✅    |
| Publish SOP            |   ❌   |   ✅    |     ❌      |    ❌    | Limited |
| Opening Checklist      |   ✅   |  View   |     ❌      |    ❌    |   ❌    |
| Closing Checklist      |   ✅   |  View   |     ❌      |    ❌    |   ❌    |
| Daily Reports          |   ✅   |   ✅    |    View     |   View   |  View   |
| Incident Reports       | Create |  View   |    View     |  Manage  |  View   |
| Lost & Found           | Create |  Manage |     ❌      |  Create  |   ❌    |
| Work Orders            | Create | Approve |   Manage    |   View   |   ❌    |
| Preventive Maintenance |   ❌   |  View   |   Manage    |    ❌    |   ❌    |

> **Reconciled 2026-07-18**: this table is the coarse, at-a-glance version. `incident-report.md` §8 has the actual shipped permission matrix — it's type-based (Engineering only sees equipment-type incidents, Security only theft/security-type, HR gets `view_sensitive` for workplace injury) and severity-aware (any `critical` incident notifies GM regardless of type), none of which this table's flat "View"/"Manage" columns capture. `lost-and-found-report.md` §7 is the shipped Lost & Found matrix (this table's row is new, added to reflect what's actually built — see `functions/src/operations/lostFound/`). Treat the per-module docs as authoritative for RBAC; this table is an index, not a source of truth.

---

# 20. Validation Rules

- Required checklist items must be completed before submission.
- Mandatory photo evidence must be uploaded where configured.
- Work orders require priority and location.
- Incidents require a severity level.
- Only assigned engineers can update work orders.
- Daily reports can only be submitted once per department and shift.

---

# 21. Performance Targets

- Checklist load ≤ 1 second
- Daily report submission ≤ 2 seconds
- Work order updates in real time
- Incident reporting ≤ 1 second
- Dashboard refresh ≤ 2 seconds (target)

---

# 22. Future Enhancements

- QR code equipment scanning
- Barcode asset lookup
- Offline checklist completion
- Digital signatures
- Voice-to-text reporting
- AI-powered incident categorization
- Predictive maintenance
- IoT equipment monitoring
- Temperature sensor integration
- Smart audit scoring

---

# 23. Acceptance Criteria

The Operations module is complete when:

- Department-specific SOPs are centrally available.
- Opening and closing checklists are digitized.
- Daily reports replace paper forms.
- Shift handovers are documented.
- Incident reporting supports investigation and closure.
- Engineering work orders are tracked from creation to completion.
- Preventive maintenance schedules are managed digitally.
- Operations dashboards provide real-time visibility.
- RBAC controls access to operational data.
- Audit logs are generated for operational actions.
- The module functions effectively on desktop, tablet, and mobile devices.
