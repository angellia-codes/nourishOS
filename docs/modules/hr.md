# NourishOS Human Resources (HR) Module

Version: 1.0  
Module: Human Resources (HR)

---

# 1. Overview

The Human Resources (HR) module manages the complete employee lifecycle, from recruitment through onboarding, employment, development, performance, and separation.

The module provides a centralized, paperless system for employee information, workflows, approvals, and documentation across Headquarters and all outlets.

---

# 2. Objectives

- Centralize employee records
- Digitize HR workflows
- Standardize HR processes
- Improve compliance
- Reduce administrative work
- Support multi-outlet operations
- Provide accurate workforce reporting

---

# 3. User Roles

| Role              | Access                |
| ----------------- | --------------------- |
| Super Admin       | Full                  |
| Director          | Read                  |
| General Manager   | Read                  |
| HR Manager        | Full                  |
| Department Leader | Limited               |
| Employee          | Self-service (future) |

---

# 4. Module Overview

```text
HR
│
├── Employee Database
├── Recruitment
├── Candidate Management
├── Onboarding
├── Employment Contracts
├── Performance Management
├── Training
├── Employee Assets
├── Employee Activities
├── Disciplinary Actions
├── Document Management
└── HR Reports
```

---

# 5. Employee Database

## Purpose

Maintain a single source of truth for all employee information.

### Features

- Create employee
- Edit employee
- Archive employee
- Search
- Filter
- Sort
- Export
- Employee profile
- Employment history

### Employee Information

#### Personal

- Employee Number
- Full Name
- Preferred Name
- Gender
- Date of Birth
- Nationality
- Marital Status
- Phone
- Email
- Address
- Emergency Contact

#### Employment

- Position
- Department
- Outlet
- Manager
- Employment Type
- Join Date
- Probation End Date
- Employment Status

#### Documents

- ID Card
- Tax Number (NPWP)
- Social Security (BPJS)
- Employment Contract
- Certificates
- Other Supporting Documents

### Workflow

```text
Create Employee

↓

Assign Department

↓

Assign Outlet

↓

Assign Role

↓

Save

↓

Employee Profile Created
```

---

# 6. Recruitment

## Features

- Job Requisition
- Vacancy Management
- Candidate Tracking
- Interview Scheduling
- Interview Feedback
- Hiring Decision
- Offer Management

### Recruitment Stages

```text
Draft

↓

Open

↓

Application Received

↓

Screening

↓

Interview

↓

Assessment

↓

Offer

↓

Hired

↓

Closed
```

---

# 7. Candidate Management

### Candidate Profile

- Personal Information
- Resume
- Portfolio
- Interview Notes
- Evaluation Score
- Status

### Features

- Search
- Filter
- Stage Tracking
- Duplicate Detection (future)

---

# 8. Onboarding

## Features

- New Hire Checklist
- Account Creation
- Equipment Assignment
- SOP Assignment
- Training Assignment
- Document Submission

### Workflow

```text
Hire Candidate

↓

Create Employee

↓

Create User Account

↓

Assign Training

↓

Assign Assets

↓

Complete Checklist

↓

Employee Ready
```

---

# 9. Employment Contracts

### Features

- Create Contract
- Renew Contract
- Extend Contract
- Terminate Contract
- Version History

### Contract Types

- Permanent
- Probation
- Fixed-Term
- Internship
- Part-Time

### Reminders

Automatic notifications for:

- Expiring contracts
- Probation completion
- Renewal deadlines

---

# 10. Performance Management

### Features

- Performance Reviews
- KPI Scoring
- Competency Assessment
- Manager Feedback
- Employee Acknowledgement
- Performance History

### Review Cycle

```text
Create Review

↓

Manager Assessment

↓

Employee Discussion

↓

Final Score

↓

Archive
```

---

# 11. Training

### Features

- Training Catalog
- Mandatory Training
- Assigned Training
- Completion Tracking
- Certificates
- Training History

### Training Types

- SOP
- Safety
- Food Safety
- Customer Service
- Leadership
- Technical Skills

---

# 12. Employee Assets

### Features

- Assign Asset
- Transfer Asset
- Return Asset
- Asset History

### Asset Types

- Laptop
- Mobile Phone
- Tablet
- Uniform
- Keys
- ID Card
- Equipment

---

# 13. Employee Activities

Track major employee events.

Examples

- Hired
- Promoted
- Department Transfer
- Outlet Transfer
- Training Completed
- Contract Renewed
- Performance Review
- Warning Issued

Displayed as a chronological timeline.

---

# 14. Disciplinary Actions

### Features

- Verbal Warning
- Written Warning
- Suspension
- Investigation Notes
- Resolution
- Attachments

### Status

- Draft
- Under Review
- Finalized
- Closed

---

# 15. HR Documents

Store employee-related documents.

Examples

- Contracts
- Certificates
- Identification
- Licenses
- Training Certificates
- Performance Reviews

Files are stored in Firebase Cloud Storage with metadata in Firestore.

---

# 16. HR Reports

### Standard Reports

- Employee List
- Headcount
- Recruitment Status
- Training Completion
- Contract Expiry
- Performance Summary
- Asset Assignment
- Disciplinary Records

Reports should support filtering and export.

---

# 17. Dashboard Widgets

Examples

- Active Employees
- New Hires
- Open Vacancies
- Interviews Today
- Contracts Expiring
- Training Completion
- Pending Reviews

---

# 18. Firestore Collections

```text
employees

recruitments

candidates

contracts

performances

trainings

employeeAssets

employeeActivities

disciplinaryActions

documents

users
```

---

# 19. Cloud Functions

Recommended functions

```text
createEmployee()

updateEmployee()

archiveEmployee()

createRecruitment()

updateRecruitment()

hireCandidate()

assignTraining()

recordPerformance()

renewContract()

assignAsset()

returnAsset()

issueDisciplinaryAction()
```

---

# 20. Notifications

Examples

- Contract expiring
- Interview scheduled
- Candidate hired
- Training assigned
- Training overdue
- Performance review due
- Asset assigned
- Warning issued

Future:

- Email
- WhatsApp
- Push Notifications

---

# 21. Validation Rules

Examples

- Employee Number must be unique.
- Email must be unique.
- Join Date cannot be in the future.
- Required documents must be uploaded before activation.
- Contract end date must be later than start date.
- Assigned manager must be an active employee.

---

# 22. Permissions

| Action             | HR  |   GM    | Director | Department Leader |
| ------------------ | :-: | :-----: | :------: | :---------------: |
| View Employees     | ✅  |   ✅    |    ✅    |      Limited      |
| Create Employee    | ✅  |   ❌    |    ❌    |        ❌         |
| Edit Employee      | ✅  |   ❌    |    ❌    |  Limited (team)   |
| Archive Employee   | ✅  |   ❌    |    ❌    |        ❌         |
| View Recruitment   | ✅  |   ✅    |    ✅    |      Limited      |
| Manage Recruitment | ✅  |   ❌    |    ❌    |        ❌         |
| Assign Training    | ✅  |   ❌    |    ❌    |      Limited      |
| Record Performance | ✅  | Limited |   Read   |  Limited (team)   |
| Assign Assets      | ✅  |   ❌    |    ❌    |        ❌         |
| Manage Contracts   | ✅  |   ❌    |    ❌    |        ❌         |

---

# 23. Performance Targets

- Employee search ≤ 1 second
- Employee profile load ≤ 2 seconds
- Recruitment updates in real time
- Training assignment ≤ 500 ms (target)
- File upload progress visible to users

---

# 24. Future Enhancements

- Employee Self-Service (ESS)
- Manager Self-Service (MSS)
- Leave Management
- Attendance
- Shift Scheduling
- Payroll Integration
- Organization Chart
- Succession Planning
- Career Development
- Exit Management
- Digital Employee Handbook
- E-signatures

---

# 25. Acceptance Criteria

The HR module is considered complete when:

- Employee records are fully manageable.
- Recruitment workflows support hiring from vacancy to onboarding.
- Contracts can be created and tracked.
- Training assignments and completions are recorded.
- Performance reviews are completed and retained.
- Employee assets are tracked.
- Disciplinary actions are documented.
- HR reports are available with filtering and export.
- RBAC is enforced across all HR features.
- Audit logs are created for sensitive actions.
- The module is responsive and works across desktop, tablet, and mobile.
