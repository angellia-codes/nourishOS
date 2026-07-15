

**PRODUCT REQUIREMENTS DOCUMENT**

**Nourish Executive Scheduler**

**& HR Operations Hub**

─────────────────────────────────────

**Nourish Group Indonesia**

Version 1.0.0  |  July 2026  |  Confidential

| Document Title | Nourish Executive Scheduler & HR Operations Hub — PRD |
| :---- | :---- |
| **Version** | 1.0.0 |
| **Status** | Draft for Review |
| **Date** | July 2026 |
| **Prepared By** | Jr. HR Manager |
| **Reviewed By** | General Manager |
| **Approved By** | Pending |
| **Next Review** | July 2026 |

# **Table of Content**

# **1\. Executive Summary**

Nourish Group Indonesia operates three Nourish restaurant outlets, three Wholefood retail outlets, and one Bakery outlet across Ungasan, Uluwatu, and Berawa in Bali. The organization currently employs approximately 179 active headcount (as of April 2026\) across corporate, kitchen, F\&B service, and wholefood departments.

The company faces a set of compounding operational challenges: HR deadlines are missed due to the absence of a centralized system, General Manager scheduling visibility is poor, recruitment tracking is done across disconnected spreadsheets, and there is no automated escalation or notification mechanism to surface critical issues in time.

This PRD defines the full product requirements for the Nourish Executive Scheduler & HR Operations Hub — a single, integrated platform built on React \+ Firebase Cloud Function that will serve as the company's operational command center.

# **2\. Problem Statement**

## **2.1 Current Pain Points**

| ID | Pain Point | Description |
| :---- | :---- | :---- |
| P1 | Missed HR Deadlines | Contract renewals, probation reviews, and compliance tasks tracked manually. Critical dates missed with no automated alerting. |
| P2 | Poor GM Calendar Visibility | No centralized view of meetings, interviews, reviews, and events. Scheduling conflicts and forgotten commitments. |
| P3 | No Centralized Scheduling | HR uses a basic Google Sheet for reminders. Cannot handle complex dependencies or multi-stakeholder scheduling. |
| P4 | Disconnected Recruitment | Recruitment tracked informally. No pipeline stages, interview outcomes, or time-to-hire data. |
| P5 | No Outlet Operations Visibility | No standard mechanism for outlet leaders to submit daily updates. Management blind to open issues. |
| P6 | No Project Oversight | Company-wide projects have no centralized tracking. Milestones slip without visibility. |
| P7 | No Automated Notifications | Fonnte integration exists but coverage is limited, templates inconsistent, delivery not logged. |
| P8 | No Executive Decision Support | GM has no single dashboard showing operational health, HR status, recruitment, and risks. |

## **2.2 Business Impact**

* Regulatory compliance risks from missed contract and probation deadlines

* Hiring delays affecting outlet operational capacity

* Revenue impact from understaffing during peak seasons

* Management inefficiency from information fragmentation

* Culture and engagement issues from poor communication infrastructure

# **3\. Product Vision & Goals**

## **3.1 Vision Statement**

*"To build a single operational command center that gives Nourish Group Indonesia executives and HR leaders complete, real-time visibility into every aspect of people operations, scheduling, recruitment, and outlet performance — accessible from any device, with zero manual follow-up required for routine alerts."*

## **3.2 Product Goals**

| Goal | Description | Success Indicator |
| :---- | :---- | :---- |
| G1 | Zero Missed Deadlines | Contract/probation alerts auto-fire at 90/60/30/14/7 days with no manual intervention |
| G2 | Unified GM Calendar | One view consolidates all executive commitments, synced to Google Calendar |
| G3 | Real-Time Outlet Operations | Every outlet submits daily updates; management sees live issues within seconds |
| G4 | Full Recruitment Pipeline | Every candidate tracked from applied to hired with automated WA communication |
| G5 | AI-Ready Infrastructure | Schema supports future NL queries without structural refactoring |

# **4\. Business Objectives & Success Metrics**

## **4.1 Business Objectives**

| ID | Objective | Target |
| :---- | :---- | :---- |
| BO-1 | Eliminate missed contract/probation deadlines | 0 missed in first 6 months |
| BO-2 | Reduce time-to-hire | From unknown baseline to \< 21 days for floor staff |
| BO-3 | Daily update submission compliance | ≥ 90% departments submit daily by 5 PM |
| BO-4 | GM preparation time for weekly review | Reduce from \~2 hours manual prep to \< 15 minutes |
| BO-5 | Reduce manual WhatsApp sending | Automate ≥ 80% of operational reminders |

## **4.2 Success Metrics (KPIs)**

| Metric | Baseline | 3-Month Target | 6-Month Target |
| :---- | :---- | :---- | :---- |
| Contract deadline compliance | Unknown | 100% | 100% |
| Daily update submission rate | 0% (no system) | 60% | 90% |
| Recruitment pipeline visibility | 0% | 100% active requisitions | 100% |
| Open task aging \> 7 days | Unknown | Measured | \< 10% of open tasks |
| User adoption (active/week) | 0 | 5 core users | All HODs |
| Automated notifications/month | \~283 manual | 500+ automated | 800+ automated |

# **5\. Stakeholders**

## **5.1 Internal Stakeholders**

| Stakeholder | Role | Interest | Involvement |
| :---- | :---- | :---- | :---- |
| General Manager | Primary executive user | Operational visibility, scheduling | Approver, daily user |
| HR Manager (Angellia Okta) | Primary system owner | All HR operations | Owner, daily user |
| HR Admin (I Komang Putra) | Secondary system admin | Task execution, scheduling | Daily user |
| Head Chefs / Kitchen Leaders | Outlet HOD | Daily updates, task tracking | Daily submitter |
| Restaurant Managers | Outlet HOD | Daily updates, task tracking | Daily submitter |
| Bar Managers | Outlet HOD | Daily updates, task tracking | Daily submitter |
| The Bakery Leaders | Outlet HOD | Daily updates, task tracking | Daily submitter |
| Wholefood Managers | Outlet HOD | Daily updates, task tracking | Daily submitter |
| Finance Team | Department | Contract data, reports | Periodic user |
| Department Managers | All departments | Team schedules, approvals | Weekly user |

## **5.2 External Stakeholders**

| Stakeholder | Role |
| :---- | :---- |
| Fonnte (WhatsApp API) | Notification delivery — all automated WA messages dispatched via Fonnte |
| Firebase | Infrastructure: Cloud Firestore (database), Calendar (sync), Drive (files), Firebase Authentication (Google Login) (auth) |

# **6\. User Roles & Personas**

## **6.1 Role Overview**

| Role | Primary User(s) | Access Level | Key Responsibility |
| :---- | :---- | :---- | :---- |
| Super Admin | Angellia Okta (HR Manager) | Full system | System config, user management, RBAC |
| HR | HR Manager, HR Admin | All HR modules | Employee records, recruitment, reviews |
| General Manager | Made Bagia Arsana | Dashboard, calendar, approvals | Executive decisions, monitoring |
| Department Manager | Restaurant/Kitchen/Bar/WF Managers | Own team data | Daily updates, team oversight |
| View Only | Security supervisors, select staff | Read-only assigned modules | View schedules, announcements |

## **6.2 RBAC Permission Matrix**

| Module | Super Admin | HR | GM | Dept. Mgr | View Only |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Employee Database | Full | Full | Read | Own Team | None |
| Executive Calendar | Full | Full | Full | Read | None |
| Recruitment | Full | Full | Read | Participate | None |
| Performance Reviews | Full | Full | Read | Own Team | None |
| Contract Tracker | Full | Full | Read | None | None |
| Project Management | Full | Full | Read | Own Projects | None |
| Daily Updates | Full | Full | Read | Own Outlet | None |
| Dashboards | Full | HR Dash | GM Dash | Dept Dash | None |
| Approvals | Full | All | All | Team Only | None |
| Notifications | Full | Full | Read | Read | None |
| Reports | Full | Full | Read | Dept Only | None |
| System Config | Full | None | None | None | None |
| Audit Log | Full | Read | None | None | None |

# **7\. System Architecture Overview**

## **7.1 Technology Stack**

| Layer | Technology | Purpose |
| :---- | :---- | :---- |
| Database | Cloud Firestore | Primary data store |
| Backend | Firebase Cloud Function  | Server-side logic, triggers, API calls, RBAC enforcement |
| Frontend | React \+ Typescript \+ Vite | Single Page Application (SPA) with tab routing |
| Calendar | Google Calendar API | Bidirectional sync for executive calendar |
| Notifications | Fonnte WhatsApp API | Automated WA messages for all trigger events |
| Authentication | Firebase Authentication  | Google Login |
| Authorization | Custom RBAC | Role-based access control per module and action |
| Hosting | Firebase hosting | Deployed as web application — PWA |
| File Storage | Firebase Cloud Storage | Resumes, reports, employee photos, attachments, contracts, SOPs, Training modules  |

## **7.2 Cloud Firestore**

| Sheet Name | Purpose |
| :---- | :---- |
| EMPLOYEES | Employee master records — primary HR data source |
| OUTLETS | Outlet registry with location, hours, manager reference |
| DEPARTMENTS | Department master — linked to outlets and employees |
| POSITIONS | Position master — salary bands, level classification |
| CALENDAR\_EVENTS | All system events — meetings, interviews, training, reviews |
| RECRUITMENT | Job requisitions — open positions per outlet and department |
| CANDIDATES | Candidate master — full pipeline data per candidate |
| INTERVIEWS | Interview records — linked to candidates and calendar |
| PERFORMANCE\_REVIEWS | Evaluation records — scores, notes, history per employee |
| CONTRACTS | Contract and probation tracking — expiry dates, renewal history |
| PROJECTS | Project master — all company projects across departments |
| TASKS | Task records — project tasks, daily update tasks, carry-forward chain |
| DAILY\_UPDATES | Daily operational update submissions from all outlet HODs |
| APPROVALS | Approval workflow records — pending, approved, rejected |
| NOTIFICATIONS | Full notification log — sent messages, delivery status, retry count |
| USERS | System users — email, role, outlet, department assignment |
| AUDIT\_LOG | Immutable audit trail — all system actions with actor and timestamp |
| CONFIG | System configuration — API tokens, calendar IDs, notification settings |

# **8\. Module Functional Requirements**

| M01 — Employee Master Database |
| :---- |

### **Purpose**

Single source of truth for all employee data across all outlets and departments. Replaces all existing employee spreadsheets and manual tracking files.

### **Functional Requirements**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| M01-F01 | System shall store complete employee profiles with all mandatory fields | Must Have |
| M01-F02 | System shall auto-generate unique Employee IDs in format N-(NNNN) (PKWT, PKWTT, BOD, FREELANCE), DW-NNNN (DAILY WORKER), OJT-NNNN (ON THE JOB TRAINING)  | Must Have |
| M01-F03 | System shall enforce mandatory field validation on create/edit/delete | Must Have |
| M01-F04 | System shall support full-text search across name, position, and, department | Must Have |
| M01-F05 | System shall support filtering by outlet, department, employment status, birth date, religion, personal tax exemption status, basic salary, allowance | Must Have |
| M01-F06 | System shall support sorting by name, join date, and department, birth date, disciplinary action, recognition | Must Have |
| M01-F07 | System shall display employee profile page with full history | Must Have |
| M01-F08 | System shall track employment status changes with timestamps | Must Have |
| M01-F09 | System shall calculate tenure automatically from join date | Must Have |
| M01-F10 | System shall flag employees with contracts expiring within 90 days | Must Have |
| M01-F11 | System shall flag employees with probation ending within 30 days | Must Have |
| M01-F12 | System shall support bulk import via CSV | Should Have |
| M01-F13 | System shall store employee photo (Firebase Cloud Storage) | Must Have |
| M01-F14 | System shall allow soft-delete (deactivation) with reason | Must Have |
| M01-F15 | System shall maintain complete change history per employee record | Must Have |

### **Employee Data Fields**

| Category | Field | Type | Required |
| :---- | :---- | :---- | :---- |
| Personal | Employee ID | STRING (auto) | Yes |
| Personal | Full Name | STRING | Yes |
| Personal | NIK | STRING | Yes |
| Personal | NPWP | STRING | No |
| Personal | Gender | ENUM (MALE/FEMALE)  | Yes |
| Personal | Birth Date | DATE | Yes |
| Personal | Phone Number | STRING | Yes |
| Personal | Email | STRING | Yes |
| Personal | Emergency Contact Name | STRING | Yes |
| Personal | Emergency Contact Phone | STRING | Yes |
| Personal | Mother Name | STRING | Yes |
| Personal | Permanent Address | STRING | Yes |
| Personal | Domicile Address | STRING | Yes |
| Personal | BPJS TK | STRING | No |
| Personal | BPJS Kesehatan | STRING | No |
| Personal | Bank Account Name | STRING | No |
| Personal | Bank Account Account | STRING | No |
| Personal | Personal Tax Exemption Status | FK → PERSONAL TAX STATUS | No |
| Personal | Religion | ENUM (HINDU/CHRISTIAN/MUSLIM)  | Yes |
| Employment | Position | STRING | Yes |
| Employment | Department | FK → DEPARTMENTS | Yes |
| Employment | Outlet | FK → OUTLETS | Yes |
| Employment | Employment Status | FK → EMPLOYMENT STATUS | Yes |
| Employment | Join Date | DATE | Yes |
| Employment | Probation Period (months) | INTEGER | Yes |
| Employment | Probation End Date | DATE (auto-calc) | Auto |
| Employment | Contract Type | ENUM (Permanent/Fixed/Daily) | Yes |
| Employment | Contract Start Date | DATE | Yes |
| Employment | Contract End Date | DATE | No |
| Employment | Manager | FK → EMPLOYEES | No |
| System | Basic Salary | STRING  | Yes |
| System | Position Allowance | STRING  | Yes |
| System | Phone Allowance | STRING  | Yes |
| System | Transportation Allowance | STRING  | Yes |
| System | Active Status | ENUM (Active/Inactive) | Auto |
| System | Resignation Date | DATE | If resigned |
| System | Resignation Reason | STRING | If resigned |
| System | Disciplinary Actions Type | STRING | No |
| System | Disciplinary Actions Period | DATE FROM \- DATE TO | No |
| System | Recognition / Award Type | STRING | No |
| System  | Recognition / Award Period | MM/YY | No |
| System | Created By / Date | Audit fields | Auto |

| M02 — Executive Calendar System |
| :---- |

### **Purpose**

Centralized scheduling hub for the General Manager and HR team. Replaces the current Task Calendar Google Sheet with a proper calendar UI, conflict detection, and recurring event support.

### **Event Types & Color Coding**

| Event Type | Color | Default Owner |
| :---- | :---- | :---- |
| Executive Meeting | Navy Blue (\#1F3864) | General Manager |
| Recruitment Interview | Teal (\#008080) | HR Admin |
| Training Session | Green (\#375623) | HR Manager |
| Performance Evaluation | Purple (\#7030A0) | HR Manager |
| Probation Review | Orange (\#C55A11) | HR Admin |
| Open Door Program | Yellow (\#FFD700) | General Manager |
| Company Event | Red (\#C00000) | HR Manager |
| Recurring Task | Grey (\#808080) | HR Admin |
| Contract Review | Brown (\#843C0C) | HR Manager |
| Project Milestone | Pink (\#FF007F) | Project Owner |

### **Key Functional Requirements**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| M02-F01 | Monthly calendar view with event count badges per date | Must Have |
| M02-F02 | Agenda / list view for upcoming events | Must Have |
| M02-F03 | Create events with full fields including participants, location, priority | Must Have |
| M02-F04 | Color-code events by type (10 types) | Must Have |
| M02-F05 | Recurring events: daily, weekly, monthly, custom interval | Must Have |
| M02-F06 | Event priority levels: Low, Medium, High, Critical | Must Have |
| M02-F07 | Scheduling conflict detection before save | Must Have |
| M02-F08 | Prevent duplicate events for same participants at same time | Must Have |
| M02-F09 | Filter events by type, department, outlet, and owner | Must Have |
| M02-F10 | Approval workflow for company events | Should Have |

| M03 — Google Calendar Integration |
| :---- |

### **Purpose**

Bidirectional sync between the system calendar and Google Calendar so all stakeholders receive native device notifications without opening the Hub.

### **Key Requirements**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| M03-F01 | Create shared "Nourish Executive Calendar" in Google Calendar | Must Have |
| M03-F02 | Push all confirmed system events to Google Calendar within 30 seconds | Must Have |
| M03-F03 | Detect conflicts against Google Calendar before creating events | Must Have |
| M03-F04 | Prevent duplicate event creation (store gcal\_event\_id per event) | Must Have |
| M03-F05 | Update Google Calendar when system event is modified | Must Have |
| M03-F06 | Delete Google Calendar event when system event is cancelled | Must Have |
| M03-F07 | Scheduled sync every 15 minutes via time-based trigger | Must Have |
| M03-F08 | Log all sync operations with success/failure status | Must Have |

| M04 — Recruitment Management System |
| :---- |

### **Purpose**

End-to-end candidate pipeline management from job posting to hire/rejection. Replaces informal spreadsheet tracking with a structured Kanban board and automated communication.

### **Recruitment Pipeline Stages**

| Stage | Code | Description | Auto-Trigger |
| :---- | :---- | :---- | :---- |
| Applied | ST-01 | Candidate submitted application | None |
| Screening | ST-02 | HR reviewing application | Send Initial Contact WA |
| HR Interview | ST-03 | Interview with HR team | Send Interview Invitation WA |
| User Interview | ST-04 | Interview with hiring manager | Send Interview Invitation WA |
| Offering | ST-05 | Offer extended to candidate | Send Offer Notification WA |
| Hired | ST-06 | Offer accepted, join date set | Send Join Date Confirmation WA |
| Rejected | ST-07 | Candidate not progressing | Send Rejection WA |
| Withdrawn | ST-08 | Candidate withdrew | No WA sent |

### **Key Functional Requirements**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| M04-F01 | Create job requisitions per outlet and department | Must Have |
| M04-F02 | Auto-generate Candidate IDs in format C-\[YEAR\]-\[SEQ\] | Must Have |
| M04-F03 | Kanban board view of recruitment pipeline | Must Have |
| M04-F04 | Stage change logs to history JSON with timestamp and actor | Must Have |
| M04-F05 | Schedule interviews linked to Executive Calendar | Must Have |
| M04-F06 | Track time-to-hire per candidate and per position | Must Have |
| M04-F07 | Record interview notes and score (1–5) per stage | Must Have |
| M04-F08 | Hiring metrics dashboard with funnel view | Should Have |
| M04-F09 | Filter candidates by stage, position, outlet, and date range | Must Have |
| M04-F10 | Export recruitment report to PDF | Should Have |

| M05 — WhatsApp Recruitment Automation |
| :---- |

### **Message Templates (Indonesian)**

| Template | Trigger | Recipient |
| :---- | :---- | :---- |
| 1\. Initial Contact | Candidate moves to Screening (ST-02) | Candidate |
| 2\. Interview Invitation | Interview scheduled for HR or User stage | Candidate \+ Interviewer |
| 3\. Interview Reminder | 24 hours before interview date/time | Candidate \+ Interviewer |
| 4\. Offer Notification | Candidate moves to Offering (ST-05) | Candidate |
| 5\. Rejection Message | Candidate marked Rejected (ST-07) | Candidate |
| 6\. Join Date Confirmation | Candidate marked Hired (ST-06) | Candidate \+ HR |

### **Template Variables**

| Variable | Source Field |
| :---- | :---- |
| \[CANDIDATE\_NAME\] | Candidate.full\_name |
| \[POSITION\] | Candidate.position\_applied |
| \[OUTLET\] | Candidate.outlet\_applied |
| \[DATE\] | Interview.date (formatted: DD MMMM YYYY) |
| \[TIME\] | Interview.start\_time |
| \[LOCATION\] | Interview.location |
| \[INTERVIEWER\] | Interview.interviewer\_name |
| \[JOIN\_DATE\] | Candidate.join\_date |
| \[HR\_NAME\] | Config.hr\_contact\_name |
| \[HR\_PHONE\] | Config.hr\_contact\_phone |

| M06 — Performance Management |
| :---- |

### **Evaluation Components & Weighting**

| Component | Weight | Description |
| :---- | :---- | :---- |
| KPI Achievement | 40% | Achievement against defined KPIs for the period |
| Behavioral Competencies | 25% | Attitude, teamwork, communication, service excellence |
| Leadership | 10% | For supervisory roles only — team management, decision-making |
| Attendance | 15% | Punctuality record and attendance compliance for the period |
| Development Plan | 10% | Progress on goals set in previous review cycle |

### **Performance Review Types**

| Review Type | Trigger | Frequency |
| :---- | :---- | :---- |
| Probation Review | Probation End Date approaching (30 days) | Once per employee at probation end |
| Quarter Review | Q1, Q2, Q3, Q4 | Quarter |
| Annual Review | 2 month before end of the Contract Date | Annual |
| Contract Renewal Review | 30 days before contract end | Per contract cycle |
| Performance Improvement Plan | Triggered by HR / score ≤ 2 | As needed |

### **Score Scale**

| Score | Label | Criteria |
| :---- | :---- | :---- |
| 5 | Outstanding | Consistently exceeds all expectations in every dimension |
| 4 | Above Expectations | Frequently exceeds expectations — strong performer |
| 3 | Meets Expectations | Consistently meets all requirements — solid contributor |
| 2 | Needs Improvement | Partially meets requirements — improvement plan required |
| 1 | Unsatisfactory | Does not meet requirements — formal action required |

| M07 — Probation & Contract Tracker |
| :---- |

### **Notification Schedule**

| Days Before Expiry | Alert Type | Recipients |
| :---- | :---- | :---- |
| 90 days | First Alert | HR Admin, HR Manager |
| 60 days | Second Alert | HR Admin, HR Manager |
| 30 days | Urgent Alert | HR Admin, HR Manager, Department Manager |
| 14 days | Critical Alert | HR Admin, HR Manager, Department Manager, GM |
| 7 days | Final Alert | HR Admin, HR Manager, Department Manager, GM |
| Day 0 (Expired) | Expired Alert | HR Admin, HR Manager, GM |

### **Key Rules**

* System checks all contract end dates daily at 06:00 via time-based trigger

* Each threshold fires only once per employee — no duplicate alerts

* Probation outcome options: Passed / Failed / Extended (with new date)

* Failed probation auto-triggers employee deactivation workflow

* HR Dashboard widget shows counts by threshold: \< 30 days, \< 14 days, \< 7 days

| M08 — Project Management System |
| :---- |

### **Kanban Board Columns**

| Column | Meaning | SLA to Progress |
| :---- | :---- | :---- |
| Backlog | Tasks identified but not yet started | No SLA |
| To Do | Tasks confirmed and ready to start | Within defined sprint |
| In Progress | Tasks actively being worked on | Per task due date |
| Review | Tasks completed, pending quality review | 1–2 days |
| Completed | Tasks done, accepted, and closed | Final |

### **Task Priority Levels**

| CRITICAL | HIGH | MEDIUM | LOW |
| ----- | ----- | ----- | ----- |
| Same day action required | 1–2 day response window | 3–5 day response window | No SLA — schedule at discretion |

| M09 — Dashboards |
| :---- |

### **HR Dashboard Widgets**

| Widget | Data Source | Alert Logic |
| :---- | :---- | :---- |
| Total Active Employees | EMPLOYEES.active\_status=Active | No alert |
| New Hires (last 30 days) | EMPLOYEES.join\_date filter | Informational |
| Resignations (last 30 days) | EMPLOYEES.resignation\_date filter | Informational |
| Open Positions | RECRUITMENT.stage \= open | Yellow if \> 5 |
| Recruitment Funnel | CANDIDATES by stage | Chart view |
| Interviews Today | CALENDAR\_EVENTS type=interview, today | Red if 0 and positions open |
| Probation Reviews Due (30d) | CONTRACTS.probation | Red if \< 14 days |
| Contract Renewals Due (60d) | CONTRACTS.expiry | Red if \< 30 days |
| Submission Compliance Today | DAILY\_UPDATES today | Red if \< 80% |
| Pending Approvals | APPROVALS.status=pending | Red if \> 3 |
| Contract Renewal Signing | CONTRACTS.pdf | Red if \< 30 days |

### **GM Executive Dashboard Widgets**

| Widget | Data Source | GM Action |
| :---- | :---- | :---- |
| Today's Meetings | CALENDAR\_EVENTS today | View agenda |
| Upcoming Interviews (7d) | CALENDAR\_EVENTS type=interview | Monitor pipeline |
| Active Projects Count | PROJECTS status=active | Drill into at-risk |
| Projects At Risk | PROJECTS with overdue tasks | Intervene |
| Open Recruitment Positions | RECRUITMENT stage ≠ hired | Prioritize hiring |
| Critical Open Tasks | TASKS priority=Critical | Reassign/escalate |
| Contract Expiry Risks (30d) | CONTRACTS | Mandate renewal action |
| Review Completion Rate | PERFORMANCE\_REVIEWS current period | Hold managers accountable |
| Daily Updates Submitted | DAILY\_UPDATES today | Contact non-submitters |
| Escalated Issues (5+ days) | TASKS escalation\_level \>= 3 | Immediate resolution |
| Contract Renewal Signing | CONTRACTS. pdf | Digital Signatures |

| M10 — Approval Workflow |
| :---- |

### **Approval Entity Types & Chains**

| Entity | Approval Chain | Trigger | Max SLA |
| :---- | :---- | :---- | :---- |
| Company Event | HR → GM | Event with approval\_required \= Yes | 24 hours |
| Training Request | Dept. Manager → HR | Any staff submission | 48 hours |
| Project Request | Dept. Manager → GM | New project creation | 48 hours |
| Performance Review | Manager → HR | Review submission | 72 hours |
| Schedule Change | Dept. Manager | Staff request | 24 hours |
| Promotion | HR → GM | Recommended in review | 48 hours |
| Contract Renewal | HR → GM | Expiry \< 30 days | 24 hours |
| Contract Signing | GM → Director | Uploaded PDF contracts | 72 hours |

| M11 — WhatsApp Notification Center |
| :---- |

### **Notification Trigger Matrix**

| Trigger Event | Template | Recipients | Timing |
| :---- | :---- | :---- | :---- |
| Contract expiry approaching | Contract Alert | HR, Manager, GM | 90/60/30/14/7 days |
| Probation end approaching | Probation Alert | HR, Manager | 30/14/7 days |
| Interview scheduled | Interview Invite | Candidate, Interviewer | On schedule \+ 24h prior |
| Candidate stage moved | Stage Update | HR Admin | Real-time |
| Task overdue | Task Overdue | Owner, Manager | Daily 08:00 |
| Daily update not submitted | Compliance Alert | Dept. Manager | Daily 17:00 |
| Approval request submitted | Approval Needed | Next approver | On submission |
| Approval decision made | Approval Result | Requestor | On decision |
| Milestone due in 7 days | Milestone Alert | Project Owner | 7 days before |
| Performance review due | Review Due | Manager, HR | 14 days before |
| Task escalation D+2 | Escalation L1 | Dept. Manager | Automatic |
| Task escalation D+3 | Escalation L2 | HR Admin \+ Manager | Automatic |
| Task escalation D+5 | Escalation L3 | GM | Automatic |

| M17 — Daily Updates System |
| :---- |

### **Purpose**

Centralized daily operational reporting system where each Head of Department from every outlet submits structured updates. Provides the GM and HR with real-time visibility into outlet operations, issues, and unresolved action items.

### **Task Aging System**

| Age (Days) | Status Label | Color | Automatic Action |
| :---- | :---- | :---- | :---- |
| 1–3 days | Normal | Green | No action — monitor |
| 4–7 days | Warning | Yellow | Visible on dashboard |
| 8–14 days | High Attention | Orange | HR notified (D+3 trigger) |
| 15+ days | Critical | Red | Priority escalated, GM alerted |

### **Escalation Trigger Logic**

| Days Open | Escalation Level | WhatsApp Recipient | Dashboard Flag |
| :---- | :---- | :---- | :---- |
| Day \+2 | Level 1 | Department Manager | Warning (Yellow) |
| Day \+3 | Level 2 | HR Admin \+ HR Manager | High Attention (Orange) |
| Day \+5 | Level 3 | General Manager | Critical (Red) |
| Day \+14 | Level 4 | GM with full summary | Critical \+ Escalated flag |

### **Key Functional Requirements**

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| M17-F01 | Structured daily update form for each outlet and department | Must Have |
| M17-F02 | Submission compliance tracker (Submitted/Pending/Overdue) per department | Must Have |
| M17-F03 | Automatic carry forward of incomplete tasks to next day at midnight | Must Have |
| M17-F04 | Days-open counter tracked and displayed on every open task | Must Have |
| M17-F05 | Aging indicators (Normal/Warning/High Attention/Critical) | Must Have |
| M17-F06 | Escalation WhatsApp at Day \+2, \+3, \+5 automatically | Must Have |
| M17-F07 | Daily digest WhatsApp to GM and HR at 08:00 AM | Must Have |
| M17-F08 | Live Daily Operations Dashboard | Must Have |
| M17-F09 | Weekly Executive Report auto-generated every Monday | Must Have |
| M17-F10 | Require carried-forward task review before new daily submission | Must Have |
| M17-F11 | Compliance alert WhatsApp to Dept. Manager if not submitted by 17:00 | Must Have |
| M17-F12 | Average resolution time tracking per outlet and department | Should Have |

| M18 — System Homepage & Daily Operations Command Center |
| :---- |

### **Homepage Sections**

| Section | Content | Primary Role |
| :---- | :---- | :---- |
| Section 1: Executive Snapshot | 9 KPI metrics with color-coded alerts at top of page | All roles |
| Section 2: Daily Outlet Updates Feed | Real-time feed of all submitted daily updates, newest first | GM, HR |
| Section 3: Outstanding Issues Board | Kanban view: Open | In Progress | Waiting Approval | Blocked | GM, HR, Managers |
| Section 4: Escalation Center | Color-banded: Yellow (D+2), Orange (D+3), Red (D+5+) | GM, HR |
| Section 5: Today's Priorities | Auto-ranked top 10 items from all sources | GM, HR |
| Section 6: Executive Calendar Widget | Today's schedule \+ 7-day preview | GM, HR |
| Section 7: Recruitment Snapshot | Open positions, pipeline funnel, interviews today | GM, HR |
| Section 8: Project Progress | Active projects with completion bars, upcoming milestones | GM, HR |

### **Role-Specific Homepage Behavior**

| Role | Homepage View |
| :---- | :---- |
| Super Admin | Full company view \+ system health indicators (trigger status, sync status) |
| HR | HR metrics \+ full outlet updates \+ recruitment pipeline \+ contracts widget |
| General Manager | Executive snapshot \+ escalations \+ decisions needed \+ calendar widget |
| Director | Executive snapshot \+ calendar widget |
| Department Manager | Own outlet only — own team tasks, submission status, carried-forward tasks |
| View Only | Read-only schedule view \+ company announcements |

| M19 — New Contract Signing |
| :---- |

**Key Requirements** 

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| HR Manager | Upload PDF contract | Must have |
| HR Manager | Push new contract as new task to GM | Must have |
| General Manager | Digital signature the contract and save it; auto-push it as new task to the director. | Must have |
| Director | Digitally sign the contract and save it; auto-notify HR | Must have |
| HR Manager | Download the signed PDF contract, and store PDF contract in employee database | Must have |

# **9\. Non-Functional Requirements**

## **9.1 Performance**

| ID | Requirement | Target |
| :---- | :---- | :---- |
| NFR-P01 | Homepage load time | \< 3 seconds on 10 Mbps connection |
| NFR-P02 | Module navigation (SPA) | \< 1 second per tab switch |
| NFR-P03 | Data write operations | \< 2 seconds (form submission to confirmation) |
| NFR-P04 | Report generation | \< 10 seconds for any report type |
| NFR-P05 | WhatsApp dispatch | \< 5 seconds per message to Fonnte API |
| NFR-P06 | Calendar sync to Google | \< 30 seconds per event push |
| NFR-P07 | Dashboard widget refresh | Every 5 minutes via Firebase trigger |

## **9.2 Scalability**

| ID | Requirement | Target |
| :---- | :---- | :---- |
| NFR-S01 | Employee records | Support up to 500 active employees without degradation |
| NFR-S02 | Daily update submissions | Support 50+ submissions per day across all outlets |
| NFR-S03 | Candidate records | Support up to 1,000 active candidates in the pipeline. |
| NFR-S04 | Task records | Support up to 5,000 tasks without performance impact |
| NFR-S05 | Notification logs | Retain 12 months of logs (rolling archive) |
| NFR-S06 | Outlets | Support up to 15 outlets without code changes |

## **9.3 Security**

| ID | Requirement | Target |
| :---- | :---- | :---- |
| NFR-SE01 | Authentication | Google OAuth 2.0 required for all access — no public endpoints |
| NFR-SE02 | Authorization | RBAC enforced server-side on every Firebase call |
| NFR-SE03 | Data isolation | Department Managers cannot read other departments' data |
| NFR-SE04 | Salary data | Restricted to HR and Super Admin only |
| NFR-SE05 | Audit log | Immutable — no user-facing delete on audit records |
| NFR-SE06 | Sheet protection | Protected ranges on all sensitive data |
| NFR-SE07 | Employee Contract | PDF contract restricted to Super Admin & HR only. Able to upload and download a PDF after it is signed by the GM, director, or employee with an e-stamp affixed.  |

# **10\. User Stories by Epic**

## **Epic E01 — Employee Management**

### **E01-US01: Add New Employee**

As an HR admin, I want to add a new employee record with all required fields so that the employee is immediately visible in the database and linked to automated contract and probation tracking.

**Acceptance Criteria:**

* Employee ID auto-generated in format N-\[NNNN\] (PKWT, PKWTT, FREELANCE, BOD), DW-\[NNNN\] (DAILY WORKER), OJT-\[NNNN\] (ON-THE-JOB TRAINING) 

* Mandatory fields validated before saving—the system blocks incomplete records

* Probation End Date auto-calculated from Join Date \+ Probation Period (months)

* Contract End Date triggers notification schedule setup at 90/60/30/14/7 days

* Employee appears in list and outlet headcount within 1 second of save

### **E01-US02: Search and Filter Employees**

As an HR Manager, I want to search and filter the employee database by name, outlet, department, and employment status so that I can quickly find any employee without scrolling through 179+ rows.

**Acceptance Criteria:**

* Search returns results as user types (a minimum of 2 characters trigger search)

* Filters are cumulative — outlet AND department AND status combined

* Results update in real time without page reload

* Empty state message shown when no results match filters

### **E01-US03: Deactivate Employee (Resignation)**

As an HR Admin, I want to soft-delete an employee record with a resignation reason and date, so that they are removed from active headcount but all historical data is preserved.

**Acceptance Criteria:**

* Resignation date and reason are mandatory to confirm deactivation

* Deactivated employee removed from all active dashboards and counts

* Employee record remains accessible via "Inactive" filter

* All active tasks assigned to this employee flagged for reassignment

* WhatsApp notification sent to HR Manager confirming deactivation

## **Epic E02 — Executive Calendar**

### **E02-US01: Create a Meeting**

As the General Manager, I want to create a meeting event with participants, location, and priority so that all stakeholders see it in their calendar and receive WhatsApp reminders.

**Acceptance Criteria:**

* Event form includes: title, type, date, start/end time, participants, location, priority

* System checks for scheduling conflicts before saving

* Confirmed event syncs to Google Calendar within 30 seconds

* WhatsApp reminder sent to all participants at configured lead time

* Event appears under "Today's Meetings" on all participant dashboards

### **E02-US02: Detect Scheduling Conflict**

As an HR Admin, I want the system to warn me when an event overlaps with an existing commitment for the same participant so that double-booking is prevented.

**Acceptance Criteria:**

* A conflict check runs on save before any event is written to the database

* Warning shows conflicting event name, time, and affected participants

* User can choose: Override with reason, or Cancel and reschedule

* Override action is logged in the audit log with actor, timestamp, and reason

## **Epic E04 — Recruitment Management**

### **E04-US01: Add a New Candidate**

As an HR Admin, I want to add a new candidate to the pipeline for a specific position and outlet, so that all candidate data is tracked centrally from day one.

**Acceptance Criteria:**

* Candidate ID auto-generated in format C-\[YEAR\]-\[SEQ\]

* Required: Name, Position Applied, Outlet, Department, Source, Phone

* Candidate appears in Kanban board under "Applied" column immediately

* Duplicate check on phone number warns HR before save proceeds

### **E04-US02: Move Candidate Through Pipeline**

As an HR Manager, I want to move a candidate from one stage to another on the Kanban board, so that the pipeline is updated and the candidate receives an automated WhatsApp message.

**Acceptance Criteria:**

* Stage change saved with timestamp and actor identity

* Stage history JSON log updated on every stage transition

* Corresponding WhatsApp template fires automatically on stage change

* Days in current stage counter resets to 0 on each stage change

## **Epic E10 — Daily Updates**

### **E10-US01: Submit Daily Opening Shift Update**

As a Restaurant Manager, I want to submit a structured daily update including staffing, achievements, challenges, and open tasks, so that the GM and HR have real-time outlet visibility.

**Acceptance Criteria:**

* Form pre-fills date, outlet, and submitted\_by from logged-in user session

* Task section allows multiple tasks per submission

* WhatsApp notification sent to HR confirming receipt of submission

* Submission visible in Company-wide Updates Feed within 30 seconds

* Cannot submit without reviewing all carried-forward tasks from previous days

### **E10-US02: See Carried-Forward Outstanding Tasks**

As a Kitchen Head, when I open the system each morning, I want to see all tasks from previous days that are still open, so that I can update their status before adding new ones.

**Acceptance Criteria:**

* Outstanding tasks shown in a "My Carried-Forward Tasks" block at form top

* Each task shows: days open, last update, current status, priority badge

* Status update required before new daily update submission is allowed

* Completed task disappears from the carried-forward list immediately

### **E10-US04: Receive Escalation Notification as GM**

As the General Manager, I want to receive a WhatsApp message when a task has been open for 5 or more days without resolution, so that I can intervene and unblock the team.

**Acceptance Criteria:**

* Escalation message includes: task title, outlet, department, owner, days open, last update

* Message sent via Fonnte to GM WhatsApp number at Day \+5

* Escalation logged in notification log with level and delivery status

* GM Dashboard shows escalated tasks in Escalation Center with red visual indicator

## **Epic E12 — Reporting**

### **E12-US01: Generate GM Flash Report (Automated Weekly)**

As an HR Admin, I want the GM Flash Report to be generated and sent automatically every Monday, so that the GM receives the weekly operations summary without any manual preparation.

**Acceptance Criteria:**

* Report auto-triggers every Monday at 07:00 via time-based trigger

* Content: headcount summary, open positions, escalated issues, projects, contracts due

* Delivered as WhatsApp text summary \+ PDF link to GM and HR Manager

* HR Admin can manually trigger report at any time via Reports module

# **11\. Data Model Overview**

## **11.1 EMPLOYEES Sheet Schema**

| Column | Data Type | Constraints | Notes |
| :---- | :---- | :---- | :---- |
| employee\_id | STRING | PK, Unique, NOT NULL | Format: N-NNNN (FT/FL/BOD), DW-NNNN (DW), OJT-NNNN (OJT)  |
| full\_name | STRING | NOT NULL | Legal name as per ID |
| phone | STRING | NOT NULL, Unique | 62xxx format for WA |
| department\_id | STRING | FK → DEPARTMENTS | Links to department record |
| outlet\_id | STRING | FK → OUTLETS | Links to outlet record |
| employment\_status | ENUM | NOT NULL | FT/FL/BOD/DW/OJT/RESIGN |
| join\_date | DATE | NOT NULL | DD/MM/YYYY |
| probation\_end\_date | DATE | Auto-calculated | join\_date \+ probation\_months |
| probation\_status | ENUM | Default: Pending | Pending/Passed/Failed/Extended |
| contract\_type | ENUM | NOT NULL | Permanent/Fixed Term/Daily |
| contract\_end\_date | DATE | Conditional | Required if Fixed Term |
| manager\_id | STRING | FK → EMPLOYEES | Reporting manager |
| active\_status | ENUM | Default: Active | Active/Inactive |
| created\_date | DATETIME | Auto, NOT NULL | Set on first save |
| last\_modified\_date | DATETIME | Auto | Updated on every change |
| mother\_name | STRING | NOT NULL | Input later |
| permanent\_address | STRING | NOT NULL | As per ID |
| domicile\_address | STRING | NOT NULL | Input later |
| bpjs\_tk | STRING  | NULL | Input later |
| bpjs\_kes | STRING  | NULL | Input later |
| bank\_account\_name | STRING  | NULL | Input later |
| bank\_account\_number | STRING  | NULL | Input later |
| personal\_tax\_status | ENUM | NOT NULL | K0/K1/K2/K3/TK0/TK1/TK2/TK3 |
| basic\_salary | STRING | NOT NULL |  |
| phone\_allowance | STRING | NOT NULL |  |
| position\_allowance | STRING | NOT NULL |  |
| transportation\_allowance | STRING | NOT NULL |  |
| religion | ENUM | NOT NULL | Hindu/Christian/Muslim |
| disciplinary\_type | ENUM | NULL | Coaching/Verbal Warning/SP1/SP2/SP3/Termination |
| disciplinary\_start\_period | DATE | Conditional |  |
| disciplinary\_end\_period | DATE | Auto-calculated | If SP1, SP2, SP3 (disciplinary\_start\_period \+ 6 months)  If Coaching, Verbal Warning (disciplinary\_start\_period \+ 3 months)  |
| recognition\_type | STRING | NULL |  |
| recognition\_period | DATE | Conditional  | MM/YYYY |

## **11.2 TASKS Sheet Schema (Unified Task Table)**

| Column | Data Type | Constraints | Notes |
| :---- | :---- | :---- | :---- |
| task\_id | STRING | PK, NOT NULL | Auto-generated |
| source | ENUM | NOT NULL | PROJECT / DAILY\_UPDATES / MANUAL |
| outlet\_id | STRING | FK → OUTLETS | Task location context |
| department\_id | STRING | FK → DEPARTMENTS | Task owner department |
| task\_title | STRING | NOT NULL | Clear action-oriented title |
| owner\_id | STRING | FK → EMPLOYEES | Person responsible |
| due\_date | DATE | NOT NULL | When task must be done |
| priority | ENUM | NOT NULL | Critical/High/Medium/Low |
| status | ENUM | NOT NULL | Open/In Progress/Waiting Approval/Blocked/Completed/Cancelled |
| days\_open | INTEGER | Calculated daily | Increments via carry forward |
| carry\_forward\_from | STRING | FK → TASKS | Parent task ID if carried |
| escalation\_level | INTEGER | Default: 0 | 0–4, set by escalation trigger |
| date | DATE | For daily tasks | The day this task belongs to |

## **11.3 CANDIDATES Sheet Schema**

| Column | Data Type | Notes |
| :---- | :---- | :---- |
| candidate\_id | STRING (PK) | Format: C-YYYY-NNNN |
| position\_applied | STRING | Must exist in POSITIONS master |
| outlet\_id | FK → OUTLETS | Target outlet for the role |
| application\_date | DATE | Defaults to today on creation |
| source | ENUM | Referral/Portal/Walk-in/Social/Other |
| current\_stage | ENUM | ST-01 through ST-08 |
| stage\_history | JSON | \[{from, to, actor, timestamp}\] — append only |
| hr\_interview\_score | INTEGER (1–5) | Captured after HR interview stage |
| user\_interview\_score | INTEGER (1–5) | Captured after User interview stage |
| offered\_salary | NUMBER | HR and Super Admin visibility only |
| days\_in\_current\_stage | INTEGER | Calculated from last stage change date |
| total\_days\_to\_hire | INTEGER | Calculated on ST-06 (Hired) — application to join date |

## **11.4 Entity Relationship Summary**

Key relationships between the 18 sheets:

* EMPLOYEES → DEPARTMENTS, OUTLETS, EMPLOYEES (manager self-reference)

* CANDIDATES → OUTLETS, DEPARTMENTS, INTERVIEWS, CALENDAR\_EVENTS

* TASKS → EMPLOYEES (owner), OUTLETS, DEPARTMENTS, DAILY\_UPDATES, PROJECTS

* DAILY\_UPDATES → TASKS (one-to-many), OUTLETS, DEPARTMENTS, USERS

* CALENDAR\_EVENTS → EMPLOYEES (participants), NOTIFICATIONS

* APPROVALS → CALENDAR\_EVENTS, PROJECTS, TASKS, USERS

* AUDIT\_LOG → USERS, all entity types (polymorphic)

# **12\. API Integration Specifications**

## **12.1 Fonnte WhatsApp API**

| Property | Value |
| :---- | :---- |
| Base URL | https://api.fonnte.com |
| Authentication | Authorization: Bearer {FONNTE\_TOKEN} (stored in CONFIG sheet) |
| Send Endpoint | POST /send |
| Request Format | JSON body: {target, message, countryCode, delay} |
| Success Response | 200 OK: {status: true, process: 1, id: "..."} |
| Error Response | 400: {status: false, reason: "Device disconnected"} |
| Retry Policy | Up to 3 retries with 5-second backoff on failure |
| Rate Limit Strategy | 2-second delay between bulk messages |
| Target Formats | Individual: 628123456789 | Group: 120363xxx@g.us | Bulk: comma-separated |

## **12.2 Google Calendar API**

| Operation | Method | Trigger |
| :---- | :---- | :---- |
| Create Event | CalendarApp.createEvent() | System event status \= Confirmed |
| Update Event | event.setTitle(), setTime() | System event modified |
| Delete Event | event.deleteEvent() | System event cancelled |
| Conflict Check | CalendarApp.getEvents() | Before every event creation |
| Sync Trigger | Firebase.newTrigger() | Every 15 minutes, time-based |

# **13\. Functional Specifications (Key Algorithms)**

## **13.1 Contract/Probation Alert Logic**

Runs daily at 06:00 via time-based trigger. Checks all active contracts and probation records against defined threshold days (90, 60, 30, 14, 7, 0). Each threshold fires exactly once per employee per contract cycle (duplicate prevention via sent flag on notification\_schedule record). Appropriate WhatsApp template dispatched to role-based recipients per threshold.

## **13.2 Automatic Carry Forward Logic**

Runs daily at 00:01 via time-based trigger. Queries all TASKS where source \= DAILY\_UPDATES AND date \= yesterday AND status NOT IN (Completed, Cancelled). For each matching task: creates a new TASK record for today, copies all fields, increments days\_open by 1, stores carry\_forward\_from reference to parent task. Escalation check runs immediately after carry forward completes.

## **13.3 Escalation Check Logic**

Runs daily at 07:00. For all open daily update tasks: if days\_open \= 2 and escalation\_level \< 1, sends WA to Department Manager and sets escalation\_level \= 1\. At days\_open \= 3, sends to HR team. At days\_open \= 5, sends to GM and flags task as ESCALATED on GM Dashboard. At days\_open \>= 14, forces priority to Critical and sends full summary to GM.

## **13.4 Google Calendar Sync Deduplication**

Before pushing any event to Google Calendar, system checks if gcal\_event\_id is stored on the system event record. If it exists and the Google Calendar event is still valid: update existing event (no new event created). If gcal\_event\_id is missing or event was deleted externally: create new event and store the new gcal\_event\_id. This prevents calendar duplication across sync cycles.

# **14\. Development Roadmap & MVP Scope**

## **14.1 Phase 1 — MVP (Target: 7 Weeks)**

Phase 1 Goal: Replace the current Google Sheet task calendar with a structured web application covering the most critical pain points: contract/probation tracking, daily updates, and executive calendar.

| Week | Milestone | Deliverable |
| :---- | :---- | :---- |
| Week 1 | Database Layer | All 18 sheets created, schemas, protection, relationships |
| Week 2 | Auth & Core Shell | Firebase Authentication , RBAC for 3 roles, SPA navigation, CONFIG |
| Week 3 | Employee Module | Employee CRUD, search/filter, profile page, bulk import |
| Week 4 | Calendar & Sync | Executive Calendar UI, Google Calendar sync, conflict detection |
| Week 5 | Contract Tracker | Probation/contract tracking, all 6 WhatsApp alert thresholds |
| Week 6 | Daily Updates | Submission form, carry forward trigger, escalation logic, compliance tracker |
| Week 7 | Homepage \+ Launch | Command Center homepage, all 8 sections, role-based views, user testing |

## **14.2 MVP Included / Excluded**

| Module | MVP Status |
| :---- | :---- |
| M01 Employee Database (core fields) | INCLUDED |
| M02 Executive Calendar | INCLUDED |
| M03 Google Calendar Sync (push only) | INCLUDED |
| M05 WhatsApp: Contract/probation alerts | INCLUDED |
| M07 Contract & Probation Tracker | INCLUDED |
| M09 HR Dashboard (5 core widgets) | INCLUDED |
| M17 Daily Updates System (full) | INCLUDED |
| M18 Homepage / Command Center | INCLUDED |
| M04 Recruitment Kanban | Phase 2 |
| M06 Performance Management | Phase 2 |
| M08 Project Management | Phase 2 |
| M10 Approval Workflow | Phase 2 |
| M15 PDF Report Generation | Phase 2 |
| Dark Mode, Bilingual UI | Phase 3 |
| AI Query Interface | Phase 3 |

## **14.3 Phase 2 — Full HR Hub (Target: \+8 Weeks After MVP)**

| Module | Scope |
| :---- | :---- |
| M04 Recruitment | Full pipeline, Kanban board, all 8 pipeline stages, metrics dashboard |
| M05 WA Recruitment | All 6 candidate communication templates with variable resolution |
| M06 Performance Management | Review scheduling, evaluation forms, score calculation, history |
| M08 Project Management | Kanban board, task management, milestones, Gantt chart |
| M10 Approval Workflow | 3-level approval chain, WA notifications, audit trail |
| M15 Reporting | PDF generation for 5 report types, auto-dispatch to GM and HR |

## **14.4 Phase 3 — Advanced Features (Target: \+12 Weeks After Phase 2\)**

* Dark Mode and Light Mode toggle

* Full bilingual UI: English / Bahasa Indonesia toggle

* Mobile-first redesign for HOD use on phones (screen width \< 768px)

* Google Calendar pull sync — import GM personal calendar events

* AI Query Interface — natural language questions answered from system data

* Data archiving — auto-archive records older than 2 years

* Advanced analytics — trend charts, year-over-year comparisons

# **15\. Risks & Mitigations**

| Risk | Probability | Impact | Mitigation |
| ----- | ----- | ----- | ----- |
| **Low user adoption due to resistance to change** | Medium | High | Conduct phased rollout, provide user training, appoint outlet champions, and collect continuous feedback during implementation. |
| **Incomplete or inaccurate master data migration** | Medium | High | Validate data before migration, perform trial migrations, maintain backups, and execute reconciliation before go-live. |
| **Internet connectivity issues at outlets** | Medium | High | Implement offline-friendly PWA capabilities where feasible, cache critical data locally, and synchronize automatically when connectivity is restored. |
| **Firebase service outage or degraded performance** | Low | Critical | Monitor Firebase status, implement retry mechanisms, graceful error handling, and maintain daily Firestore backups. |
| **Unauthorized access or RBAC misconfiguration** | Medium | Critical | Enforce RBAC in Cloud Functions, perform regular permission audits, apply least-privilege principles, and require security reviews before deployment. |
| **Sensitive employee or financial data exposure** | Low | Critical | Encrypt data in transit, implement Firestore Security Rules, enable audit logging, restrict access by role, and perform periodic security assessments. |
| **Cloud Functions execution limits or quota exceeded** | Medium | High | Optimize functions, split long-running processes into background jobs, monitor usage, and enable billing alerts. |
| **Firestore performance degradation due to poor data modeling** | Medium | High | Follow Firestore best practices, optimize indexes, denormalize where appropriate, paginate large datasets, and review query performance regularly. |

# **16\. Acceptance Criteria**

## **16.1 System-Level Acceptance**

| ID | Criterion | Verification Method |
| :---- | :---- | :---- |
| AC-01 | All users can log in using Google Workspace accounts | Manual test with all 5 role types |
| AC-02 | RBAC prevents unauthorized access to any module | Penetration test per role matrix |
| AC-03 | Contract alerts fire at all 6 thresholds without manual trigger | 30-day monitoring log |
| AC-04 | Daily updates carry forward automatically at midnight | Verify next morning with test task |
| AC-05 | Escalation WhatsApp fires at D+2, D+3, D+5 | Create test task, monitor WA for 5 days |
| AC-06 | Google Calendar events sync within 30 seconds | Create event, check Google Calendar |
| AC-07 | Homepage loads in under 3 seconds on 10 Mbps | Browser devtools network timing test |
| AC-08 | Notification log records every sent message | Compare Fonnte dashboard to system log |
| AC-09 | Audit log records every create/update/delete | Trace actions against audit entries |
| AC-10 | All 18 sheets exist with correct schemas | Sheet structure verification checklist |

## **16.2 Business Acceptance**

| ID | Criterion | Measurement |
| :---- | :---- | :---- |
| BA-01 | 0 missed contract deadlines in first 30 days | CONTRACTS sheet review at 30-day mark |
| BA-02 | Daily update submission rate ≥ 60% by Week 4 | DAILY\_UPDATES compliance tracker % |
| BA-03 | GM can review company health in \< 60 seconds | User test with stopwatch on login |
| BA-04 | HR Admin processes a recruitment candidate in ≤ 4 clicks | Click-count user test workflow |
| BA-05 | Weekly GM Flash Report auto-generated with correct data | Verify 4 consecutive Monday reports |

# 

# 

# **17\. Apps Script File Structure**

| File | Location | Responsibility |
| :---- | :---- | :---- |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |

# **18\. Glossary**

| Term | Definition |
| :---- | :---- |
| HOD | Head of Department — outlet-level leader responsible for daily updates |
| GM | General Manager — Made Bagia Arsana, primary executive user of the system |
| DW | Daily Worker — employment status for casual daily contracted staff |
| OJT | On-the-Job Training — intern/trainee employment status |
| FT / FL | Full Time / Freelance — permanent vs. project-based employment |
| RBAC | Role-Based Access Control — permission system per role and module |
| SPA | Single Page Application — web app that updates without full page reload |
| Fonnte | WhatsApp API provider used for all automated message dispatch |
| Carry Forward | Automatic system action that brings unresolved tasks to the next day |
| Escalation | Automatic notification triggered when tasks exceed age thresholds |
| gcal\_event\_id | Google Calendar event ID stored for sync deduplication |
| Stage History | JSON audit trail of all pipeline stage changes per candidate |
| Compliance Rate | Percentage of departments that submitted daily updates by deadline |
| Aging Indicator | Color label for task age: Green (1–3d) / Yellow (4–7d) / Orange (8–14d) / Red (15+d) |
| Flash Report | GM's weekly operational summary sent every Monday at 07:00 |
| Daily Digest | Auto-generated morning operations summary sent at 08:00 |
| Manning Guide | Internal headcount report comparing staff levels year-over-year |
| BEOTM | Best Employee of the Month — internal recognition program |
| NGI | Nourish Group Indonesia — company abbreviation used in Employee IDs |
| PRD | Product Requirements Document — this document |
| MVP | Minimum Viable Product — Phase 1 with core features only |
| CONFIG | System configuration Google Sheet storing all environment variables |

| Document Approval & Sign-Off |
| :---- |

| Role | Name | Date | Signature |
| :---- | :---- | :---- | :---- |
| General Manager | Made Bagia Arsana |  |  |
| HR Manager | Angellia Okta |  |  |
| HR Admin | I Komang Putra Adnyana |  |  |
| Product Lead | Angellia Okta |  |  |

*Document Version: 1.0.0  |  Nourish Group Indonesia  |  June 2026  |  Confidential*