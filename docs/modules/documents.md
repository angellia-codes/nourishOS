# NourishOS Documents Management Module

Version: 1.0
Module: Documents Management

---

# 1. Overview

The Documents Management module centralizes all company documents into a secure, searchable, and version-controlled repository.

The module ensures employees always access the latest approved documents while preserving historical versions for compliance and audit purposes.

It supports:

- SOPs
- Company Forms
- Templates
- Training Materials
- Manuals
- Reference Documents

---

# 2. Objectives

- Create a single source of truth
- Eliminate duplicate documents
- Ensure version control
- Improve document accessibility
- Standardize documentation
- Enable approval workflows
- Support paperless operations

---

# 3. Supported Users

- Super Admin
- Director
- General Manager
- HR
- Finance
- Purchasing
- Kitchen
- Bar
- Floor
- Security
- Engineering
- All Employees (Read access based on permissions)

---

# 4. Module Structure

```text
Documents
│
├── SOP Library
├── Company Policies
├── Company Forms
├── Templates
├── Training Materials
├── Manuals
├── Knowledge Base
├── Version History
├── Approval Center
└── Archive
```

---

# 5. Document Types

Supported document categories:

- Standard Operating Procedures (SOP)
- Policies
- Work Instructions
- Forms
- Templates
- Training Modules
- Manuals
- Checklists
- Guidelines
- Reference Documents

Future

- Videos
- Interactive Learning
- E-books

---

# 6. SOP Library

## Purpose

Maintain all approved operational procedures.

### Features

- Browse by department
- Search
- Categories
- Tags
- Version history
- PDF preview
- Download
- Approval workflow
- Archive
- Print

### Departments

- HR
- Finance
- Purchasing
- Kitchen
- Bar
- Floor
- Security
- Engineering
- Wholefood
- Bakery

---

# 7. Company Policies

Store

- Employee Handbook
- Code of Conduct
- Attendance Policy
- Leave Policy
- IT Policy
- Security Policy
- Health & Safety Policy
- Food Safety Policy

Features

- Read online
- Download
- Version tracking
- Acknowledgement (future)

---

# 8. Company Forms

Examples

- Leave Form
- Expense Form
- Incident Report
- Asset Request
- Work Order
- Recruitment Request
- Training Request

Features

- Download
- Online submission
- Version control
- Approval workflow

---

# 9. Templates

Examples

- Word Templates
- Excel Templates
- Presentation Templates
- Report Templates
- Letter Templates

Purpose

Standardize company documentation.

---

# 10. Training Materials

Store

- SOP Documents
- Training Manuals
- Presentations
- Videos (future)
- Quizzes (future)

Features

- Categories
- Search
- Download
- Completion tracking (future)

---

# 11. Manuals

Examples

- Equipment Manuals
- Coffee Machine Guides
- Kitchen Equipment Guides
- POS Manuals
- Emergency Procedures

---

# 12. Knowledge Base

Purpose

Central repository for operational knowledge.

Examples

- FAQs
- Best Practices
- Troubleshooting
- Operational Tips
- Frequently Used Procedures

Future

AI-powered search.

---

# 13. Document Lifecycle

```text
Draft

↓

Review

↓

Approved

↓

Published

↓

Revised

↓

Archived
```

Every document maintains a complete history of changes.

---

# 14. Version Control

Each version stores:

- Version Number
- Author
- Reviewer
- Approver
- Change Summary
- Publish Date
- Effective Date
- Status

Older versions remain read-only.

---

# 15. Approval Workflow

Standard workflow

```text
Author

↓

Department Manager

↓

HR / Finance (if applicable)

↓

General Manager

↓

Director (optional)

↓

Published
```

Workflow should be configurable by document type.

---

# 16. Search & Filters

Search by:

- Title
- Document Number
- Department
- Category
- Tags
- Author
- Status
- Version
- Effective Date

Filters

- Active
- Draft
- Archived
- Pending Approval
- Department
- Outlet

---

# 17. Document Metadata

Each document includes:

- Document Number
- Title
- Description
- Department
- Category
- Tags
- Owner
- Reviewer
- Approver
- Current Version
- Status
- Effective Date
- Review Date
- Expiry Date (optional)

---

# 18. File Support

Supported formats

- PDF
- DOCX
- XLSX
- PPTX
- JPG
- PNG

Future

- MP4
- Interactive HTML
- SCORM Packages

---

# 19. Document Preview

Supports:

- PDF preview
- Image preview
- Office document preview (future)
- Full-screen mode
- Download
- Print

---

# 20. Firestore Collections

```text
documents

documentVersions

documentCategories

documentTags

documentApprovals

trainingModules

knowledgeBase

documentAcknowledgements
```

Files are stored in Firebase Cloud Storage.

---

# 21. Cloud Functions

```text
createDocument()

updateDocument()

submitDocument()

approveDocument()

rejectDocument()

publishDocument()

archiveDocument()

restoreDocument()

createVersion()

searchDocuments()
```

---

# 22. Notifications

Examples

- Document submitted for review
- Approval requested
- Document approved
- Document rejected
- New SOP published
- Document updated
- Review date approaching

Future

- Email
- WhatsApp
- Push Notifications

---

# 23. Permissions

| Action              | Author | Manager |   HR    | GM  | Director | Employee |
| ------------------- | :----: | :-----: | :-----: | :-: | :------: | :------: |
| View Documents      |   ✅   |   ✅    |   ✅    | ✅  |    ✅    | Limited  |
| Create Document     |   ✅   |   ✅    |   ✅    | ✅  |    ✅    |    ❌    |
| Edit Draft          |   ✅   |   ✅    |   ✅    | ✅  |    ✅    |    ❌    |
| Submit for Approval |   ✅   |   ✅    |   ✅    | ✅  |    ✅    |    ❌    |
| Approve Document    |   ❌   | Limited | Limited | ✅  |    ✅    |    ❌    |
| Publish Document    |   ❌   |   ❌    | Limited | ✅  |    ✅    |    ❌    |
| Archive Document    |   ❌   |   ❌    |   ❌    | ✅  |    ✅    |    ❌    |

Access to published documents is controlled by department, outlet, and RBAC permissions.

---

# 24. Dashboard Widgets

Examples

- Recently Published Documents
- Pending Document Approvals
- SOP Updates
- Documents Requiring Review
- Training Materials Added
- Most Viewed Documents

---

# 25. Validation Rules

- Title is required.
- Document Number must be unique.
- Category is required.
- Owner is required.
- At least one file must be uploaded.
- New versions require a change summary.
- Published documents cannot be edited directly; changes require creating a new version.

---

# 26. Audit Logging

Automatically record:

- Document created
- Document edited
- Version created
- Submitted for approval
- Approved
- Rejected
- Published
- Archived
- Downloaded (optional)
- Viewed (optional)

Each audit entry includes:

- User
- Timestamp
- Action
- Document ID
- Version

---

# 27. Performance Targets

- Document search ≤ 1 second
- Document preview ≤ 2 seconds
- Upload progress displayed in real time
- File uploads support retry
- Search results paginated for large datasets

---

# 28. Future Enhancements

## Knowledge Management

- AI document search
- AI document summaries
- Semantic search
- Related document suggestions

## Learning

- Learning paths
- Quizzes
- Certifications
- Training completion tracking

## Compliance

- Mandatory document acknowledgement
- Expiring document reminders
- Electronic signatures
- Compliance reporting

## Collaboration

- Comments
- Review discussions
- Suggested edits
- Co-authoring (future)

---

# 29. Acceptance Criteria

The Documents Management module is complete when:

- All company documents are stored in a centralized repository.
- SOPs support version control and approval workflows.
- Users can search and filter documents efficiently.
- Published documents are read-only and versioned.
- Files are securely stored in Firebase Cloud Storage.
- Access is restricted using RBAC and department/outlet permissions.
- Audit logs capture all document lifecycle events.
- Dashboard widgets provide document insights.
- The module is responsive across desktop, tablet, and mobile devices.
