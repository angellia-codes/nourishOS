# NourishOS Global Search Service

Version: 1.0
Module: Shared Services - Global Search

---

# 1. Overview

The Global Search Service enables users to quickly find information across all NourishOS modules from a single search interface.

Every search result is filtered according to the user's:

- Authentication
- Role
- Department
- Outlet
- RBAC permissions

Users will never see results they are not authorized to access.

---

# 2. Objectives

- Provide one unified search experience
- Search across every module
- Minimize search response time
- Respect RBAC permissions
- Support structured and full-text search
- Reduce navigation time
- Improve operational efficiency

---

# 3. Search Scope

The Global Search Service supports searching across:

```text
Search
│
├── Employees
├── Recruitment
├── Candidates
├── Contracts
├── Training
├── Performance Reviews
├── SOPs
├── Documents
├── Forms
├── Daily Reports
├── Opening Checklists
├── Closing Checklists
├── Incident Reports
├── Work Orders
├── Preventive Maintenance
├── Expense Requests
├── Budget Requests
├── Payment Requests
├── Tasks
├── Announcements
├── Chat Messages (Future)
├── Audit Logs (Admin Only)
└── Settings (Admin Only)
```

---

# 4. Search Types

## Global Search

Searches all accessible modules simultaneously.

Example:

```
coffee machine
```

Results may include:

- SOP
- Work Order
- Equipment
- Training
- Daily Report

---

## Module Search

Searches only the current module.

Examples

HR

```
John Doe
```

Finance

```
Expense 2026-0015
```

Documents

```
Food Safety SOP
```

---

## Advanced Search

Supports multiple filters.

Example

Department = Kitchen

Status = Active

Outlet = Ungasan

Created Between = January–March

---

# 5. Search Interface

Global search bar is available in the application header.

Features

- Instant suggestions
- Recent searches
- Search history
- Keyboard shortcuts
- Loading indicator
- Clear button

Future

Voice search.

---

# 6. Search Results Layout

Each result includes:

- Icon
- Title
- Module
- Description
- Status
- Department
- Outlet
- Last Updated
- Relevance Score (internal)

Example

```text
📄 Food Safety SOP

Documents

Kitchen

Updated 2 days ago
```

---

# 7. Search Categories

Results are grouped by category.

```text
Employees

Documents

Tasks

Reports

Finance

Operations

Communications

Settings
```

Users can collapse or expand categories.

---

# 8. Filters

Supported filters

- Module
- Department
- Outlet
- Status
- Date Created
- Last Updated
- Author
- Assignee
- Priority
- Category
- Tags
- File Type

---

# 9. Sorting

Options

- Relevance (Default)
- Newest
- Oldest
- Recently Updated
- Alphabetical

---

# 10. Supported Search Fields

Employees

- Name
- Employee ID
- Email
- Position

Documents

- Title
- Document Number
- Tags
- Description

Finance

- Request Number
- Vendor
- Cost Center

Operations

- Work Order ID
- Equipment
- Incident Number

Tasks

- Task Name
- Assignee
- Tags

---

# 11. Search Suggestions

Suggestions appear while typing.

Examples

```
Food Safety SOP

Coffee Machine

Expense Request

John Doe

Kitchen

Budget
```

Suggestions are ranked by:

- Frequency
- Recent activity
- Relevance
- User permissions

---

# 12. Recent Searches

Each user has personal search history.

Features

- Last 20 searches
- Clear history
- Pin favorite searches (Future)

---

# 13. Saved Searches

Users may save frequently used searches.

Examples

```
Pending Expense Requests

Open Work Orders

Contracts Expiring

Training Due
```

Future

Shared saved searches by department.

---

# 14. Search Index

Searchable resources maintain a lightweight search index.

Example fields

```text
id

module

title

keywords

description

department

outlet

owner

status

updatedAt

permissions
```

Indexes are updated automatically when source records change.

---

# 15. Firestore Collections

```text
searchIndex

searchHistory

savedSearches

searchAnalytics
```

Business modules remain the source of truth; the search index is an optimized projection.

---

# 16. Cloud Functions

```text
indexDocument()

removeFromIndex()

search()

advancedSearch()

saveSearch()

deleteSavedSearch()

getRecentSearches()

recordSearchAnalytics()
```

---

# 17. Search Workflow

```text
User Types Query

↓

Permission Check

↓

Search Index

↓

Apply Filters

↓

Rank Results

↓

Return Results

↓

Record Analytics
```

---

# 18. Ranking Logic

Results are ranked by:

1. Exact match
2. Prefix match
3. Keyword match
4. Recent updates
5. Frequently accessed items
6. User's department relevance

---

# 19. RBAC Integration

Every result is filtered using:

- Authentication
- Role
- Department
- Outlet
- Assigned resources

Restricted items are never indexed for unauthorized users at query time.

---

# 20. Dashboard Integration

Dashboard search supports:

- Global search
- Recent searches
- Suggested searches
- Quick links

---

# 21. Notifications Integration

Users may search:

- Notifications
- Announcements
- Tasks

Future

Search within message history.

---

# 22. Performance Targets

- Suggestion response ≤ 200 ms (target)
- Search results ≤ 1 second
- Advanced search ≤ 2 seconds
- Pagination for large result sets
- Debounced search input (300 ms recommended)

---

# 23. Analytics

Track:

- Most searched keywords
- Zero-result searches
- Popular documents
- Popular SOPs
- Search response time
- Module usage

Analytics help improve indexing and content quality.

---

# 24. Future Enhancements

## AI Search

- Natural language search
- Semantic search
- AI-generated answers
- Related document recommendations

## OCR

Search inside:

- PDFs
- Images
- Scanned documents

## Voice

- Voice search
- Speech-to-text

## Personalization

- Frequently accessed items
- Personalized ranking
- Department-aware recommendations

---

# 25. Security

- Enforce RBAC before returning results.
- Never expose hidden metadata.
- Sanitize search inputs.
- Apply rate limiting to prevent abuse.
- Log search activity for monitoring without storing sensitive query content unnecessarily.

---

# 26. Acceptance Criteria

The Global Search Service is complete when:

- Users can search across all authorized modules.
- Results respect RBAC, department, and outlet restrictions.
- Instant suggestions and advanced filters are available.
- Search history and saved searches function correctly.
- Search indexes update automatically after record changes.
- Response times meet performance targets.
- Search analytics are recorded for continuous improvement.
- The service is responsive across desktop, tablet, and mobile devices.
