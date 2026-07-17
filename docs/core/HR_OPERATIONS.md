**NOURISHOS**

Product Requirements Document

**HR & Operations**

*Executive Scheduling · Recruitment · Performance · Daily Outlet Operations*

A module extension of the NourishOS platform — Nourish Group Indonesia

Version 2.0.0 (Refined)  |  July 2026  |  Confidential

| Document Title | Nourish HR & Operations Command Center — PRD |
| :---- | :---- |
| Parent Platform | NourishOS (Nourish Operational System) |
| Version | 2.0.0 — Refined from v1.0.0 draft |
| Status | Draft for Review — architecture-aligned |
| Date | July 2026 |
| Prepared By | Jr. HR Manager (original) — refined for platform alignment |
| Reviewed By | General Manager |
| Approved By | Pending |
| Next Review | Upon Phase 1 kickoff |

# **Table of Contents** {#table-of-contents}

[Table of Contents	2](#table-of-contents)

[1\. Executive Summary	4](#1.-executive-summary)

[2\. Problem Statement	4](#2.-problem-statement)

[2.1 Current Pain Points	4](#2.1-current-pain-points)

[2.2 Business Impact	4](#2.2-business-impact)

[3\. Product Vision & Goals	4](#3.-product-vision-&-goals)

[3.1 Vision Statement	4](#3.1-vision-statement)

[3.2 Product Goals	5](#3.2-product-goals)

[4\. Business Objectives & Success Metrics	5](#4.-business-objectives-&-success-metrics)

[4.1 Business Objectives	5](#4.1-business-objectives)

[4.2 Success Metrics (KPIs)	5](#4.2-success-metrics-\(kpis\))

[5\. Stakeholders	5](#5.-stakeholders)

[5.1 Internal Stakeholders	5](#5.1-internal-stakeholders)

[5.2 External Stakeholders	6](#5.2-external-stakeholders)

[6\. Platform Alignment & Architecture Decisions	6](#6.-platform-alignment-&-architecture-decisions)

[6.1 Decision Rule	6](#6.1-decision-rule)

[6.2 Capability-by-Capability Decisions	6](#6.2-capability-by-capability-decisions)

[6.3 Firestore Collections — Net New vs. Reused	7](#6.3-firestore-collections-—-net-new-vs.-reused)

[6.4 Required Resolution: Performance Management vs. the Appraisal Module	7](#6.4-required-resolution:-performance-management-vs.-the-appraisal-module)

[7\. User Roles & RBAC	8](#7.-user-roles-&-rbac)

[7.1 Role Mapping	8](#7.1-role-mapping)

[7.2 RBAC Permission Matrix	8](#7.2-rbac-permission-matrix)

[7.3 New Permission Strings Required	9](#7.3-new-permission-strings-required)

[8\. System Architecture & Data Model	9](#8.-system-architecture-&-data-model)

[8.1 Technology Stack	9](#8.1-technology-stack)

[8.2 Firestore Collections	9](#8.2-firestore-collections)

[9\. Module Functional Requirements	10](#9.-module-functional-requirements)

[9.1 Employee Master Database	10](#9.1-employee-master-database)

[9.2 Executive Calendar (Calendar Service)	11](#9.2-executive-calendar-\(calendar-service\))

[9.3 Google Calendar Integration	12](#9.3-google-calendar-integration)

[9.4 Recruitment Management	12](#9.4-recruitment-management)

[9.5 WhatsApp Recruitment Automation	13](#9.5-whatsapp-recruitment-automation)

[9.6 Performance Management	13](#9.6-performance-management)

[9.7 Contract & Probation Tracker	14](#9.7-contract-&-probation-tracker)

[9.8 Project Management	14](#9.8-project-management)

[9.9 Dashboards	15](#9.9-dashboards)

[9.10 Approval Workflow	15](#9.10-approval-workflow)

[9.11 WhatsApp Notification Center	16](#9.11-whatsapp-notification-center)

[9.12 Daily Updates System	16](#9.12-daily-updates-system)

[9.13 Homepage / Command Center	17](#9.13-homepage-/-command-center)

[9.14 New Contract Signing	17](#9.14-new-contract-signing)

[10\. Non-Functional Requirements	18](#10.-non-functional-requirements)

[10.1 Performance	18](#10.1-performance)

[10.2 Scalability	18](#10.2-scalability)

[10.3 Security	18](#10.3-security)

[11\. User Stories by Epic	19](#11.-user-stories-by-epic)

[Epic E01 — Employee Management	19](#epic-e01-—-employee-management)

[Epic E02 — Executive Calendar	19](#epic-e02-—-executive-calendar)

[Epic E04 — Recruitment Management	20](#epic-e04-—-recruitment-management)

[Epic E10 — Daily Updates	20](#epic-e10-—-daily-updates)

[Epic E12 — Reporting	21](#epic-e12-—-reporting)

[12\. Data Schemas	21](#12.-data-schemas)

[12.1 employees — HR-Specific Fields	21](#12.1-employees-—-hr-specific-fields)

[12.2 tasks — Fields Added for This PRD	22](#12.2-tasks-—-fields-added-for-this-prd)

[12.3 candidates — Fields for the Recruitment Pipeline	22](#12.3-candidates-—-fields-for-the-recruitment-pipeline)

[12.4 dailyUpdates — New Collection	23](#12.4-dailyupdates-—-new-collection)

[12.5 Entity Relationship Summary	23](#12.5-entity-relationship-summary)

[13\. API Integration Specifications	23](#13.-api-integration-specifications)

[13.1 Fonnte WhatsApp API	23](#13.1-fonnte-whatsapp-api)

[13.2 Google Calendar API	24](#13.2-google-calendar-api)

[14\. Core Algorithms	24](#14.-core-algorithms)

[14.1 Contract / Probation Alert Logic	24](#14.1-contract-/-probation-alert-logic)

[14.2 Automatic Carry-Forward Logic	24](#14.2-automatic-carry-forward-logic)

[14.3 Escalation Check Logic	24](#14.3-escalation-check-logic)

[14.4 Google Calendar Sync Deduplication	24](#14.4-google-calendar-sync-deduplication)

[15\. Cloud Functions Module Map	25](#15.-cloud-functions-module-map)

[16\. Development Roadmap & MVP Scope	25](#16.-development-roadmap-&-mvp-scope)

[16.1 Phase 1 — MVP (Target: 7 Weeks)	25](#16.1-phase-1-—-mvp-\(target:-7-weeks\))

[16.2 MVP Included / Excluded	26](#16.2-mvp-included-/-excluded)

[16.3 Phase 2 — Full HR Hub (Target: \+8 Weeks After MVP)	26](#16.3-phase-2-—-full-hr-hub-\(target:-+8-weeks-after-mvp\))

[16.4 Phase 3 — Advanced Features (Target: \+12 Weeks After Phase 2\)	26](#16.4-phase-3-—-advanced-features-\(target:-+12-weeks-after-phase-2\))

[17\. Risks & Mitigations	26](#17.-risks-&-mitigations)

[18\. Acceptance Criteria	27](#18.-acceptance-criteria)

[18.1 System-Level Acceptance	27](#18.1-system-level-acceptance)

[18.2 Business Acceptance	27](#18.2-business-acceptance)

[19\. Glossary	28](#19.-glossary)

[20\. Document Approval & Sign-Off	28](#20.-document-approval-&-sign-off)

# **1\. Executive Summary** {#1.-executive-summary}

Nourish Group Indonesia operates three Nourish restaurant outlets, three Wholefood retail outlets, and one Bakery outlet across Ungasan, Uluwatu, and Berawa in Bali — approximately 179 active headcount as of April 2026 across corporate, kitchen, F\&B service, and wholefood departments.

HR deadlines are missed for lack of a centralized system, the General Manager has poor visibility into scheduling, recruitment is tracked across disconnected spreadsheets, and there is no automated escalation to surface operational issues before they become expensive.

This PRD defines the HR & Operations Command Center: the set of NourishOS modules, shared-service extensions, and two genuinely new shared services (a Calendar Service and a WhatsApp notification channel) that together give HR and the GM one place to manage people, scheduling, recruitment, and daily outlet operations. It is not a separate application — it is built on the NourishOS platform already in development, and it consumes that platform's Approval Engine, Task Engine, Notification Engine, Audit Log, and File Storage Service rather than reimplementing them.

# **2\. Problem Statement** {#2.-problem-statement}

## **2.1 Current Pain Points** {#2.1-current-pain-points}

| ID | Pain Point | Description |
| :---- | :---- | :---- |
| P1 | Missed HR Deadlines | Contract renewals, probation reviews, and compliance tasks tracked manually. Critical dates missed with no automated alerting. |
| P2 | Poor GM Calendar Visibility | No centralized view of meetings, interviews, reviews, and events. Scheduling conflicts and forgotten commitments. |
| P3 | No Centralized Scheduling | HR uses a basic Google Sheet for reminders. Cannot handle complex dependencies or multi-stakeholder scheduling. |
| P4 | Disconnected Recruitment | Recruitment tracked informally. No pipeline stages, interview outcomes, or time-to-hire data. |
| P5 | No Outlet Operations Visibility | No standard mechanism for outlet leaders to submit daily updates. Management blind to open issues. |
| P6 | No Project Oversight | Company-wide projects have no centralized tracking. Milestones slip without visibility. |
| P7 | No Automated Notifications | Fonnte (WhatsApp) integration exists informally, but coverage is limited, templates inconsistent, delivery not logged. |
| P8 | No Executive Decision Support | GM has no single dashboard showing operational health, HR status, recruitment, and risks. |

## **2.2 Business Impact** {#2.2-business-impact}

* Regulatory compliance risk from missed contract and probation deadlines.

* Hiring delays affecting outlet operational capacity.

* Revenue impact from understaffing during peak seasons.

* Management inefficiency from information fragmentation.

* Culture and engagement issues from poor communication infrastructure.

# **3\. Product Vision & Goals** {#3.-product-vision-&-goals}

## **3.1 Vision Statement** {#3.1-vision-statement}

"One operational command center that gives Nourish Group Indonesia executives and HR leaders complete, real-time visibility into people operations, scheduling, recruitment, and outlet performance — accessible from any device, with zero manual follow-up required for routine alerts — built on the same platform, RBAC, and shared services as the rest of NourishOS."

## **3.2 Product Goals** {#3.2-product-goals}

| Goal | Description | Success Indicator |
| :---- | :---- | :---- |
| G1 | Zero Missed Deadlines | Contract/probation alerts fire automatically at 90/60/30/14/7/0 days with no manual intervention. |
| G2 | Unified GM Calendar | One view consolidates all executive commitments, synced to Google Calendar. |
| G3 | Real-Time Outlet Operations | Every outlet submits daily updates; management sees live issues within seconds. |
| G4 | Full Recruitment Pipeline | Every candidate tracked from applied to hired with automated WhatsApp communication. |
| G5 | Reuse Over Rebuild | Every workflow, task, notification, and audit event runs through the existing NourishOS shared services — no parallel systems. |

# **4\. Business Objectives & Success Metrics** {#4.-business-objectives-&-success-metrics}

## **4.1 Business Objectives** {#4.1-business-objectives}

| ID | Objective | Target |
| :---- | :---- | :---- |
| BO-1 | Eliminate missed contract/probation deadlines | 0 missed in first 6 months |
| BO-2 | Reduce time-to-hire | From unknown baseline to \< 21 days for floor staff |
| BO-3 | Daily update submission compliance | ≥ 90% of departments submit daily by 5 PM |
| BO-4 | GM preparation time for weekly review | Reduce from \~2 hours manual prep to \< 15 minutes |
| BO-5 | Reduce manual WhatsApp sending | Automate ≥ 80% of operational reminders |

## **4.2 Success Metrics (KPIs)** {#4.2-success-metrics-(kpis)}

| Metric | Baseline | 3-Month Target | 6-Month Target |
| :---- | :---- | :---- | :---- |
| Contract deadline compliance | Unknown | 100% | 100% |
| Daily update submission rate | 0% (no system) | 60% | 90% |
| Recruitment pipeline visibility | 0% | 100% of active requisitions | 100% |
| Open task aging \> 7 days | Unknown | Measured | \< 10% of open tasks |
| User adoption (active/week) | 0 | 5 core users | All HODs |
| Automated notifications/month | \~283 manual | 500+ automated | 800+ automated |

# **5\. Stakeholders** {#5.-stakeholders}

## **5.1 Internal Stakeholders** {#5.1-internal-stakeholders}

| Stakeholder | Role | Involvement |
| :---- | :---- | :---- |
| General Manager | Primary executive user | Approver, daily user |
| HR Manager | Primary system owner | Owner, daily user |
| HR Admin | Secondary system admin | Daily user |
| Kitchen / Bar / Floor / Bakery / Wholefood Leaders | Outlet HOD | Daily submitter |
| Finance Team | Department | Periodic user (contract data, reports) |
| Department Managers | All departments | Weekly user (team schedules, approvals) |

## **5.2 External Stakeholders** {#5.2-external-stakeholders}

| Stakeholder | Role |
| :---- | :---- |
| Fonnte (WhatsApp API) | Notification delivery — all automated WhatsApp messages dispatched via Fonnte, as a new channel adapter behind the existing Notification Engine. |
| Google Calendar API | Bidirectional sync target for the new Calendar Service. |

# **6\. Platform Alignment & Architecture Decisions** {#6.-platform-alignment-&-architecture-decisions}

NourishOS already has a working Shared Services layer (approval\_engine.md, task\_engine.md, notifications.md, audit\_log.md, file\_storage.md) and a live data model (DATABASE.md, FIRESTORE\_SCHEMA.md, RBAC.md). The original draft of this PRD was written before that layer existed and independently re-invented several of the same concepts under different names. This section is the decision record for every place that happened, so engineering builds one system, not two.

## **6.1 Decision Rule** {#6.1-decision-rule}

**For every capability below, the default is REUSE. A NEW shared service or collection is only justified when nothing in the current platform covers it. A capability is only allowed to stay as a CONFLICT if there is a genuine, documented reason the existing implementation cannot serve it — and even then, the resolution is to extend the existing system, not to run two in parallel.**

## **6.2 Capability-by-Capability Decisions** {#6.2-capability-by-capability-decisions}

| Proposed Capability (original M\#) | Decision | What actually happens |
| :---- | :---- | :---- |
| Approval Workflow (M10) — new "APPROVALS" collection | REUSE | Route every approval (training request, project request, schedule change, promotion, contract renewal, contract signing) through the existing Approval Engine: approvalWorkflows / approvalRequests / approvalSteps / approvalHistory, via submitApproval() / approveStep() / rejectStep(). No new collection. |
| Task tracking, Daily Update tasks, Project tasks (M08, M17) — new unified "TASKS" table | REUSE \+ EXTEND | Use the existing tasks collection and Task Engine. Add two TASK\_TYPE values (dailyUpdate, projectTask) and extend the Task type with additive fields: daysOpen, escalationLevel, carriedForwardFrom. A daily update's open items become Task Engine tasks with sourceModule: "operations" and referenceId pointing at the dailyUpdates document — this is exactly what referenceId already exists for. |
| WhatsApp Notification Center (M05, M11) — new "NOTIFICATIONS" log | REUSE \+ EXTEND | NOTIFICATION\_CHANNEL already includes "whatsapp" as a planned value. Implement a Fonnte adapter behind the existing sendNotification() Cloud Function and extend AppNotification with an optional delivery-status block (provider message ID, retry count). Do not build a second notification log. |
| Audit Log (§7.2) — new "AUDIT\_LOG" collection | REUSE | Use the existing auditLogs collection and recordAuditEvent(), which is already write-only from Cloud Functions. Rename any reference from AUDIT\_LOG to auditLogs. |
| Contract PDF storage, resumes, attachments (M19) — bespoke upload flow | REUSE | Route through the existing File Storage Service (files collection, createFileMetadata() / deleteFile(), Cloud Storage folder structure) with module: "hr" and the appropriate resourceType (contract, candidateResume, dailyUpdateAttachment). |
| Performance Management (M06) — new "PERFORMANCE\_REVIEWS" collection, weighted scoring model | CONFLICT — must resolve before build | A structured Appraisal module already exists in NourishOS (appraisalTemplates / appraisals, per-subject 1–5 scoring, HR Manager → GM approval chain, on-demand AI insights). M06 proposes a different weighted-component model (KPI 40% / Behavioral 25% / Leadership 10% / Attendance 15% / Development 10%) and a different set of review types. See §6.4 for the required resolution — do not build a parallel system. |
| Executive Calendar \+ Google Calendar sync (M02, M03) | NEW SHARED SERVICE | Genuinely new — no calendar capability exists in NourishOS today. Build it as a Calendar Service under Shared Services (shared-service.md §24 already lists "Calendar Service" as a planned future service), not as an HR-only feature, so Operations (maintenance scheduling) and Documents (training calendar) can consume it later. |
| Daily Updates submission \+ compliance tracking (M17) | NEW COLLECTION | dailyUpdates is genuinely new (there is no existing collection for structured shift/outlet reporting). It generates Task Engine tasks for open items rather than owning its own task list. |
| Project Management (M08) | NEW COLLECTION | projects is genuinely new. Tasks under a project are ordinary Task Engine tasks with sourceModule: "operations" and a projectId reference field. |
| Recruitment pipeline (M04) | REUSE (already scaffolded) | recruitments and candidates collections and RECRUITMENT\_\* permissions already exist in the codebase. This PRD's pipeline stages, Kanban view, and scoring extend that scaffold — they do not replace it. |
| Interviews (M04) | NEW COLLECTION (thin) | interviews is new and intentionally thin: it links a candidateId to a calendarEvents document and stores interview-specific data (scores, notes) that don't belong on a generic calendar event. |
| System config (Fonnte token, Google Calendar IDs) — new "CONFIG" sheet | REUSE | Use the existing integrations and systemSettings collections. Do not create a CONFIG collection. |
| Contract & Probation Tracker (M07) | REUSE \+ EXTEND | contracts already exists in DATABASE.md. Add the notification-threshold fields (sentFlags per 90/60/30/14/7/0-day threshold) to that collection rather than a new one. |
| Homepage / Command Center (M18) | RECONCILE | NourishOS already has a Dashboard module spec (dashboard.md) with KPI cards, role-based widgets, and a defined layout. M18's eight sections become the HR/Ops-specific widget set for that existing Dashboard, not a separate homepage system with its own routing. |

## **6.3 Firestore Collections — Net New vs. Reused** {#6.3-firestore-collections-—-net-new-vs.-reused}

**Only these are genuinely new. Everything else in the sections that follow maps to an existing collection.**

* calendarEvents — new (Calendar Service)

* dailyUpdates — new (Operations)

* projects — new (Operations)

* interviews — new, thin (HR — links candidates to calendarEvents)

## **6.4 Required Resolution: Performance Management vs. the Appraisal Module** {#6.4-required-resolution:-performance-management-vs.-the-appraisal-module}

| Decision needed before Phase 2: this cannot ship as written without creating two competing review systems. |
| :---- |

**Two credible paths — pick one before any Performance Management engineering starts:**

* Option A — Extend the Appraisal module. Add a scoringModel field to AppraisalTemplate ("simpleAverage" | "weightedComponents"), add the weighted-component structure (KPI / Behavioral / Leadership / Attendance / Development) as an alternate scoring shape, and add the missing review types (quarter, contractRenewal, performanceImprovementPlan) alongside the existing probation / quarterly / annual. Lower engineering cost; one system to maintain.

* Option B — Keep them separate on purpose, with a documented reason (e.g., Appraisal is for individual development conversations, this new module is for KPI-driven compensation decisions) and explicitly different Firestore collections, explicitly different approval chains, and no shared UI components pretending they're the same thing.

Recommendation: Option A. The scoring difference is a data-shape problem, not a workflow problem — the approval chain (HR Manager → GM), the audit requirements, and the on-demand-AI-insight pattern are identical in both proposals. This document proceeds under Option A in §9.5; flag if Option B is preferred so §9.5 is rewritten accordingly.

# **7\. User Roles & RBAC** {#7.-user-roles-&-rbac}

Roles below use the canonical role IDs already defined in NourishOS (src/constants/roles.ts), not the generic labels from the original draft. Permission strings use the platform-wide module.action format (RBAC.md §2), not a bespoke per-module matrix.

## **7.1 Role Mapping** {#7.1-role-mapping}

| Original Draft Role | Canonical NourishOS Role ID | Notes |
| :---- | :---- | :---- |
| Super Admin | superAdmin | No change. |
| HR (Manager \+ Admin) | hrManager | Both HR Manager and HR Admin share the hrManager RBAC role — the same module access. Distinguish them by position (already a field on the employee record), not by a second role. |
| General Manager | generalManager | No change. |
| Department Manager — Kitchen | kitchenLeader | Already exists. |
| Department Manager — Bar | barLeader | Already exists. |
| Department Manager — Floor / Restaurant | floorLeader | Already exists. |
| Department Manager — Bakery | bakeryLeader | Added July 2026 (`src/constants/roles.ts`). |
| Department Manager — Wholefood | wholefoodLeader | Added July 2026 (`src/constants/roles.ts`). |
| View Only | (no new role) | Not a role — a narrower permission grant. Apply read-only permissions to the existing security or staff role rather than inventing a "viewOnly" role. |

## **7.2 RBAC Permission Matrix** {#7.2-rbac-permission-matrix}

Legend: Full \= create/read/update/delete/approve within scope · Read \= view only · Own \= scoped to own outlet/team · None \= no access.

| Module |  | superAdmin | hrManager | generalManager | Outlet Leaders | View-only grant |  |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | ----- |
| Employee Database |  | Full | Full | Read | Own Team (Read) | None |  |
| Executive Calendar |  | Full | Full | Full | Read | None |  |
| Recruitment |  | Full | Full | Read | Participate (interview scoring) | None |  |
| Performance / Appraisals |  | Full | Full | Read | Own Team | None |  |
| Contract & Probation Tracker |  | Full | Full | Read | Own Team (Read) | None |  |
| Project Management |  | Full | Full | Read | Own Projects | None |  |
| Daily Updates |  | Full | Full | Read | Own Outlet | None |  |
| Dashboards |  | Full | HR Dashboard | GM Dashboard | Department Dashboard | None |  |
| Approvals |  | Full (override) | All within HR scope | All within GM scope | Team only | None |  |
| Notifications |  | Full | Full | Read | Read | None |  |
| Reports |  | Full | Full | Read | Department only | None |  |
| System Config / Integrations |  | Full | None | None | None | None |  |
| Audit Log |  | Full | Read (HR events only) | None | None | None |  |
|  | **Corrected from the original draft:** the v1.0.0 RBAC matrix showed Contract Tracker \= "None" for Department Managers, but §M07 of the same draft sends the 30-day "Urgent Alert" to Department Managers — an outlet leader who receives a compliance alert needs at least read access to see what they're being alerted about. Fixed to Own Team (Read) above. |  |  |  |  |  |  |

## **7.3 New Permission Strings Required** {#7.3-new-permission-strings-required}

Following the existing module.action convention (src/constants/permissions.ts). Add alongside the existing PERMISSIONS map:

| Permission String | Purpose |
| :---- | :---- |
| calendar.read / calendar.create / calendar.manage | Executive Calendar module access. |
| contracts.read / contracts.manage / contracts.sign | Contract & Probation Tracker; contracts.sign gated to generalManager and director for the digital-signature step. |
| dailyUpdates.submit / dailyUpdates.read / dailyUpdates.manage | Daily Updates System. |
| projects.read / projects.create / projects.manage | Project Management. |
| interviews.schedule / interviews.score | Recruitment interview scheduling and scoring — reuses RECRUITMENT\_\* for pipeline-stage actions. |

# **8\. System Architecture & Data Model** {#8.-system-architecture-&-data-model}

## **8.1 Technology Stack** {#8.1-technology-stack}

No new stack — this module runs on the NourishOS platform already in development. The original draft listed the stack as if standing up a new app; corrected below to show what's already in place vs. what this PRD adds.

| Layer | Technology | Status |
| :---- | :---- | :---- |
| Frontend | React \+ TypeScript \+ Vite, tab/route-based SPA | Existing — NourishOS shell |
| State | Zustand | Existing |
| Database | Cloud Firestore | Existing |
| Backend | Firebase Cloud Functions (region: asia-southeast2) | Existing |
| Authentication | Firebase Authentication — Google Sign-In | Existing |
| Authorization | Custom RBAC (role \+ department \+ outlet) | Existing |
| File Storage | Firebase Cloud Storage via File Storage Service | Existing |
| Hosting | Firebase Hosting \+ PWA packaging | Planned — no hosting block in src/firebase.json yet, no vite-plugin-pwa; plain Vite SPA today |
| Calendar | Google Calendar API | NEW — Calendar Service (this PRD) |
| WhatsApp | Fonnte API | NEW — channel adapter behind Notification Engine (this PRD) |

## **8.2 Firestore Collections** {#8.2-firestore-collections}

The original draft called this table "Cloud Firestore — Sheet Name / Purpose," a direct leftover from an earlier Google Sheets / Apps Script prototype. Corrected below, and split so it's clear at a glance what's reused vs. new.

### **Reused — already defined in the platform, this PRD adds fields or read patterns**

| Collection | Purpose in this PRD |
| :---- | :---- |
| employees | Employee master records. Extend with the fields in §12.1 (probation/contract auto-calc fields, disciplinary tracking, recognition tracking). |
| outlets | Outlet registry — already covers HQ \+ outlets. No change. |
| departments | Department master. No change. |
| positions | Position master. No change. |
| contracts | Extend with per-threshold sent-flags for the 90/60/30/14/7/0-day alert schedule. |
| recruitments | Job requisitions per outlet/department — already scaffolded. |
| candidates | Candidate pipeline — already scaffolded. Extend with stageHistory, scores, sourcing fields per §12.3. |
| appraisals / appraisalTemplates | Performance reviews — see §6.4 for required resolution before extending. |
| tasks | Extend TASK\_TYPE with dailyUpdate and projectTask; extend Task with daysOpen, escalationLevel, carriedForwardFrom. |
| approvalWorkflows / approvalRequests / approvalSteps / approvalHistory | All approval chains in this PRD (training request, project request, schedule change, promotion, contract renewal, contract signing) configure new workflows here — no new collection. |
| notifications | Extend AppNotification with an optional WhatsApp delivery-status block. |
| auditLogs | All create/update/delete/approve events in this PRD, written only via recordAuditEvent(). |
| files | Contract PDFs, resumes, daily-update photo attachments. |
| users | System users — no change. |
| integrations | Fonnte token, Google Calendar credentials/IDs. |
| systemSettings | Notification thresholds, escalation timing, other tunables. |

### **Net new — genuinely new collections this PRD introduces**

| Collection | Purpose |
| :---- | :---- |
| calendarEvents | All executive/HR calendar events — meetings, interviews, training, reviews, milestones. Owned by the new Calendar Service. |
| dailyUpdates | Structured daily operational update submissions from outlet HODs. Open items spawn tasks (Task Engine) rather than owning their own task list. |
| projects | Company-wide project registry. Tasks under a project are ordinary Task Engine tasks referencing projectId. |
| interviews | Thin join between candidates and calendarEvents, plus interview-specific scores/notes. |

# **9\. Module Functional Requirements** {#9.-module-functional-requirements}

Renumbered from the original M01–M19 (which skipped M12–M16 with no defined content). Each module states which collections/services it uses per §6 and §8.

## **9.1 Employee Master Database** {#9.1-employee-master-database}

Uses: employees (existing). Single source of truth for employee data across all outlets and departments, replacing existing spreadsheets.

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| 9.1-F01 | Store complete employee profiles with all mandatory fields (§12.1). | Must Have |
| 9.1-F02 | Auto-generate Employee IDs: N-NNNN (PKWT / PKWTT / BOD / Freelance), DW-NNNN (Daily Worker), OJT-NNNN (On-the-Job Training). | Must Have |
| 9.1-F03 | Enforce mandatory-field validation on create/edit — server-side in the Cloud Function, not just the form. | Must Have |
| 9.1-F04 | Full-text search across name, position, department. | Must Have |
| 9.1-F05 | Filter by outlet, department, employment status, birth date, religion, tax-exemption status, basic salary, allowance. | Must Have |
| 9.1-F06 | Sort by name, join date, department, birth date, disciplinary action, recognition. | Must Have |
| 9.1-F07 | Employee profile page with full change history. | Must Have |
| 9.1-F08 | Track employment-status changes with timestamps. | Must Have |
| 9.1-F09 | Auto-calculate tenure from join date. | Must Have |
| 9.1-F10 | Flag employees with contracts expiring within 90 days. | Must Have |
| 9.1-F11 | Flag employees with probation ending within 30 days. | Must Have |
| 9.1-F12 | Bulk import via CSV. | Should Have |
| 9.1-F13 | Store employee photo via the existing File Storage Service. | Must Have |
| 9.1-F14 | Soft-delete (deactivate) with a mandatory reason. | Must Have |
| 9.1-F15 | Maintain complete change history per employee record (uses auditLogs, not a bespoke history array). | Must Have |

Salary and allowance fields are restricted to hrManager and superAdmin — enforce at the Cloud Function and Firestore Security Rule level, never in the client only, per RBAC.md §11.

## **9.2 Executive Calendar (Calendar Service)** {#9.2-executive-calendar-(calendar-service)}

Uses: calendarEvents (new, §8.2). Centralized scheduling hub for the GM and HR team, replacing the current Task Calendar spreadsheet.

### **Event Types & Color Coding**

| Event Type |  | Color | Default Owner |  |
| :---- | :---- | :---- | :---- | :---- |
| Executive Meeting |  | Navy Blue \#1F3864 | General Manager |  |
| Recruitment Interview |  | Teal \#008080 | HR Admin |  |
| Training Session |  | Green \#375623 | HR Manager |  |
| Performance Evaluation |  | Purple \#7030A0 | HR Manager |  |
| Probation Review |  | Orange \#C55A11 | HR Admin |  |
| Open Door Program |  | Yellow \#FFD700 | General Manager |  |
| Company Event |  | Red \#C00000 | HR Manager |  |
| Recurring Task |  | Grey \#808080 | HR Admin |  |
| Contract Review |  | Brown \#843C0C | HR Manager |  |
| Project Milestone |  | Pink \#FF007F | Project Owner |  |
| **ID** | **Requirement** |  |  | **Priority** |
| 9.2-F01 | Monthly calendar view with event-count badges per date. |  |  | Must Have |
| 9.2-F02 | Agenda / list view for upcoming events. |  |  | Must Have |
| 9.2-F03 | Create events with participants, location, priority. |  |  | Must Have |
| 9.2-F04 | Color-code events by the 10 types above. |  |  | Must Have |
| 9.2-F05 | Recurring events: daily, weekly, monthly, custom interval. |  |  | Must Have |
| 9.2-F06 | Event priority levels: Low, Medium, High, Critical. |  |  | Must Have |
| 9.2-F07 | Scheduling-conflict detection before save. |  |  | Must Have |
| 9.2-F08 | Prevent duplicate events for the same participants at the same time. |  |  | Must Have |
| 9.2-F09 | Filter by type, department, outlet, owner. |  |  | Must Have |
| 9.2-F10 | Approval workflow for company events — routes through the existing Approval Engine (§9.10), not a bespoke flag. |  |  | Should Have |

## **9.3 Google Calendar Integration** {#9.3-google-calendar-integration}

Bidirectional sync between calendarEvents and Google Calendar so stakeholders get native device reminders.

| ID | Requirement | Priority |
| :---- | :---- | :---- |
| 9.3-F01 | Create a shared "Nourish Executive Calendar" in Google Calendar. | Must Have |
| 9.3-F02 | Push confirmed events to Google Calendar within 30 seconds. | Must Have |
| 9.3-F03 | Check conflicts against Google Calendar before creating events. | Must Have |
| 9.3-F04 | Prevent duplicate events — store gcalEventId per event, per §14.4 dedup logic. | Must Have |
| 9.3-F05 | Update Google Calendar when the system event is modified. | Must Have |
| 9.3-F06 | Delete the Google Calendar event when the system event is cancelled. | Must Have |
| 9.3-F07 | Scheduled sync every 15 minutes via a Cloud Scheduler-triggered function. | Must Have |
| 9.3-F08 | Log every sync operation with success/failure status. | Must Have |

## **9.4 Recruitment Management** {#9.4-recruitment-management}

Uses: recruitments, candidates (existing, extended), interviews (new, §8.2). End-to-end candidate pipeline from posting to hire/reject.

### **Pipeline Stages**

| Stage |  | Code | Description | Auto-Trigger |  |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Applied |  | ST-01 | Candidate submitted application | None |  |
| Screening |  | ST-02 | HR reviewing application | Send Initial Contact WA |  |
| HR Interview |  | ST-03 | Interview with HR team | Send Interview Invitation WA |  |
| User Interview |  | ST-04 | Interview with hiring manager | Send Interview Invitation WA |  |
| Offering |  | ST-05 | Offer extended to candidate | Send Offer Notification WA |  |
| Hired |  | ST-06 | Offer accepted, join date set | Send Join Date Confirmation WA |  |
| Rejected |  | ST-07 | Candidate not progressing | Send Rejection WA |  |
| Withdrawn |  | ST-08 | Candidate withdrew | No WA sent |  |
| **ID** | **Requirement** |  |  |  | **Priority** |
| 9.4-F01 | Create job requisitions per outlet and department. |  |  |  | Must Have |
| 9.4-F02 | Auto-generate Candidate IDs: C-\[YEAR\]-\[SEQ\]. |  |  |  | Must Have |
| 9.4-F03 | Kanban board view of the pipeline. |  |  |  | Must Have |
| 9.4-F04 | Log every stage change to stageHistory with timestamp and actor. |  |  |  | Must Have |
| 9.4-F05 | Schedule interviews linked to the Calendar Service. |  |  |  | Must Have |
| 9.4-F06 | Track time-to-hire per candidate and per position. |  |  |  | Must Have |
| 9.4-F07 | Record interview notes and score (1–5) per stage. |  |  |  | Must Have |
| 9.4-F08 | Hiring-metrics dashboard with funnel view. |  |  |  | Should Have |
| 9.4-F09 | Filter by stage, position, outlet, date range. |  |  |  | Must Have |
| 9.4-F10 | Export recruitment report to PDF. |  |  |  | Should Have |

## **9.5 WhatsApp Recruitment Automation** {#9.5-whatsapp-recruitment-automation}

Implemented as templates dispatched through the Notification Engine's WhatsApp channel (§9.11) — not a separate messaging system.

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
| \[CANDIDATE\_NAME\] | candidate.fullName |
| \[POSITION\] | candidate.positionApplied |
| \[OUTLET\] | candidate.outletId |
| \[DATE\] | interview.date (DD MMMM YYYY) |
| \[TIME\] | interview.startTime |
| \[LOCATION\] | interview.location |
| \[INTERVIEWER\] | interview.interviewerName |
| \[JOIN\_DATE\] | candidate.joinDate |
| \[HR\_NAME\] | integrations/fonnte.hrContactName |
| \[HR\_PHONE\] | integrations/fonnte.hrContactPhone |

## **9.6 Performance Management** {#9.6-performance-management}

| See §6.4: this section assumes Option A (extend the existing Appraisal module) is accepted. If Option B is chosen instead, this section defines a standalone collection and the resolution note in §6.4 should be updated accordingly. |
| :---- |

Uses: appraisalTemplates, appraisals (existing, extended with the weighted-component scoring shape below).

### **Evaluation Components & Weighting (weightedComponents scoring model)**

| Component | Weight | Description |
| :---- | :---- | :---- |
| KPI Achievement | 40% | Achievement against defined KPIs for the period. |
| Behavioral Competencies | 25% | Attitude, teamwork, communication, service excellence. |
| Leadership | 10% | Supervisory roles only — team management, decision-making. |
| Attendance | 15% | Punctuality and attendance compliance for the period. |
| Development Plan | 10% | Progress against goals set in the previous review cycle. |

### **Review Types (added to existing probation / quarterly / annual)**

| Review Type | Trigger | Frequency |
| :---- | :---- | :---- |
| Quarter Review | Q1 / Q2 / Q3 / Q4 | Quarterly |
| Contract Renewal Review | 30 days before contract end | Per contract cycle |
| Performance Improvement Plan | HR-triggered, or score ≤ 2 | As needed |

### **Score Scale (unchanged — matches existing Appraisal module)**

| Score | Label | Criteria |
| :---- | :---- | :---- |
| 5 | Outstanding | Consistently exceeds all expectations in every dimension. |
| 4 | Above Expectations | Frequently exceeds expectations — strong performer. |
| 3 | Meets Expectations | Consistently meets all requirements — solid contributor. |
| 2 | Needs Improvement | Partially meets requirements — improvement plan required. |
| 1 | Unsatisfactory | Does not meet requirements — formal action required. |

## **9.7 Contract & Probation Tracker** {#9.7-contract-&-probation-tracker}

Uses: contracts (existing, extended with per-threshold sent-flags).

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

* A scheduled Cloud Function checks all contract end dates daily at 06:00.

* Each threshold fires exactly once per employee per contract cycle (sent-flag on the contract's notification schedule prevents duplicates).

* Probation outcome: Passed / Failed / Extended (with a new date).

* Failed probation auto-triggers the employee deactivation workflow (§9.1-F14).

* HR Dashboard widget shows counts by threshold: \< 30 days, \< 14 days, \< 7 days.

## **9.8 Project Management** {#9.8-project-management}

Uses: projects (new), tasks (existing Task Engine, referencing projectId).

### **Kanban Board Columns**

| Column | Meaning | SLA to Progress |
| :---- | :---- | :---- |
| Backlog | Identified but not started | No SLA |
| To Do | Confirmed and ready to start | Within defined sprint |
| In Progress | Actively being worked on | Per task due date |
| Review | Completed, pending quality review | 1–2 days |
| Completed | Done, accepted, closed | Final |

### **Task Priority Levels (matches existing PRIORITY constant)**

| CRITICAL | HIGH | MEDIUM | LOW |
| :---- | :---- | :---- | :---- |
| Same-day action required | 1–2 day response window | 3–5 day response window | No SLA — schedule at discretion |

## **9.9 Dashboards** {#9.9-dashboards}

Implements the widget sets below inside the existing Dashboard module (dashboard.md), not as a separate dashboard system.

### **HR Dashboard Widgets**

| Widget | Data Source | Alert Logic |
| :---- | :---- | :---- |
| Total Active Employees | employees.status \= active | No alert |
| New Hires (last 30 days) | employees.joinDate filter | Informational |
| Resignations (last 30 days) | employees.resignationDate filter | Informational |
| Open Positions | recruitments.stage \= open | Yellow if \> 5 |
| Recruitment Funnel | candidates by stage | Chart view |
| Interviews Today | calendarEvents type=interview, today | Red if 0 and positions open |
| Probation Reviews Due (30d) | contracts.probation | Red if \< 14 days |
| Contract Renewals Due (60d) | contracts.expiry | Red if \< 30 days |
| Submission Compliance Today | dailyUpdates today | Red if \< 80% |
| Pending Approvals | approvalRequests.status \= pending | Red if \> 3 |
| Contract Renewal Signing | files (contract PDFs) | Red if \< 30 days |

### **GM Executive Dashboard Widgets**

| Widget | Data Source | GM Action |
| :---- | :---- | :---- |
| Today's Meetings | calendarEvents today | View agenda |
| Upcoming Interviews (7d) | calendarEvents type=interview | Monitor pipeline |
| Active Projects Count | projects.status \= active | Drill into at-risk |
| Projects At Risk | projects with overdue tasks | Intervene |
| Open Recruitment Positions | recruitments.stage ≠ hired | Prioritize hiring |
| Critical Open Tasks | tasks.priority \= critical | Reassign / escalate |
| Contract Expiry Risks (30d) | contracts | Mandate renewal action |
| Review Completion Rate | appraisals current period | Hold managers accountable |
| Daily Updates Submitted | dailyUpdates today | Contact non-submitters |
| Escalated Issues (5+ days) | tasks.escalationLevel \>= 3 | Immediate resolution |
| Contract Renewal Signing | files (contract PDFs) | Digital signature |

## **9.10 Approval Workflow** {#9.10-approval-workflow}

Every row below is configured as a workflow in the existing Approval Engine (approvalWorkflows), not a new collection.

| Entity | Approval Chain | Trigger | Max SLA |
| :---- | :---- | :---- | :---- |
| Company Event | HR → GM | Event requires approval | 24 hours |
| Training Request | Dept. Manager → HR | Any staff submission | 48 hours |
| Project Request | Dept. Manager → GM | New project creation | 48 hours |
| Performance Review | Manager → HR | Review submission | 72 hours |
| Schedule Change | Dept. Manager | Staff request | 24 hours |
| Promotion | HR → GM | Recommended in review | 48 hours |
| Contract Renewal | HR → GM | Expiry \< 30 days | 24 hours |
| Contract Signing | GM → Director | Uploaded PDF contract | 72 hours |

## **9.11 WhatsApp Notification Center** {#9.11-whatsapp-notification-center}

Every trigger below dispatches through the existing Notification Engine's sendNotification() with channel: "whatsapp" and a Fonnte adapter — see §13.1 for the API contract.

| Trigger Event | Recipients | Timing |
| :---- | :---- | :---- |
| Contract expiry approaching | HR, Manager, GM | 90/60/30/14/7 days |
| Probation end approaching | HR, Manager | 30/14/7 days |
| Interview scheduled | Candidate, Interviewer | On schedule \+ 24h prior |
| Candidate stage moved | HR Admin | Real-time |
| Task overdue | Owner, Manager | Daily 08:00 |
| Daily update not submitted | Dept. Manager | Daily 17:00 |
| Approval request submitted | Next approver | On submission |
| Approval decision made | Requestor | On decision |
| Milestone due in 7 days | Project Owner | 7 days before |
| Performance review due | Manager, HR | 14 days before |
| Task escalation D+2 / D+3 / D+5 | Dept. Manager → HR → GM (per §9.12) | Automatic |

## **9.12 Daily Updates System** {#9.12-daily-updates-system}

Uses: dailyUpdates (new) for the submission itself; open items become tasks in the existing Task Engine (taskType: dailyUpdate, sourceModule: "operations", referenceId: dailyUpdate doc ID). Gives HR and the GM real-time visibility into outlet operations, issues, and unresolved action items.

### **Task Aging**

| Age (Days) | Status Label | Color | Automatic Action |
| :---- | :---- | :---- | :---- |
| 1–3 days | Normal | Green | No action — monitor |
| 4–7 days | Warning | Yellow | Visible on dashboard |
| 8–14 days | High Attention | Orange | HR notified (D+3 trigger) |
| 15+ days | Critical | Red | Priority escalated, GM alerted |

### **Escalation Trigger Logic**

| Days Open |  | Escalation Level | WhatsApp Recipient | Dashboard Flag |  |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Day \+2 |  | Level 1 | Department Manager | Warning (Yellow) |  |
| Day \+3 |  | Level 2 | HR Admin \+ HR Manager | High Attention (Orange) |  |
| Day \+5 |  | Level 3 | General Manager | Critical (Red) |  |
| Day \+14 |  | Level 4 | GM with full summary | Critical \+ Escalated flag |  |
| **ID** | **Requirement** |  |  |  | **Priority** |
| 9.12-F01 | Structured daily update form per outlet/department. |  |  |  | Must Have |
| 9.12-F02 | Submission compliance tracker (Submitted / Pending / Overdue) per department. |  |  |  | Must Have |
| 9.12-F03 | Automatic carry-forward of incomplete tasks to the next day at midnight. |  |  |  | Must Have |
| 9.12-F04 | daysOpen counter tracked and displayed on every open task. |  |  |  | Must Have |
| 9.12-F05 | Aging indicators (Normal/Warning/High Attention/Critical). |  |  |  | Must Have |
| 9.12-F06 | Escalation WhatsApp at Day \+2, \+3, \+5 automatically. |  |  |  | Must Have |
| 9.12-F07 | Daily digest WhatsApp to GM and HR at 08:00. |  |  |  | Must Have |
| 9.12-F08 | Live Daily Operations Dashboard widget. |  |  |  | Must Have |
| 9.12-F09 | Weekly Executive Report auto-generated every Monday. |  |  |  | Must Have |
| 9.12-F10 | Require review of carried-forward tasks before a new daily submission. |  |  |  | Must Have |
| 9.12-F11 | Compliance alert WhatsApp to Dept. Manager if not submitted by 17:00. |  |  |  | Must Have |
| 9.12-F12 | Average resolution time tracking per outlet and department. |  |  |  | Should Have |

## **9.13 Homepage / Command Center** {#9.13-homepage-/-command-center}

This is the HR/Ops widget configuration of the platform's existing Dashboard module, rendered as the landing page after login.

| Section | Content | Primary Role |
| :---- | :---- | :---- |
| Executive Snapshot | 9 KPI metrics, color-coded alerts, top of page | All roles |
| Daily Outlet Updates Feed | Real-time feed of submitted updates, newest first | GM, HR |
| Outstanding Issues Board | Kanban: Open | In Progress | Waiting Approval | Blocked | GM, HR, Managers |
| Escalation Center | Color-banded: Yellow (D+2), Orange (D+3), Red (D+5+) | GM, HR |
| Today's Priorities | Auto-ranked top 10 items from all sources | GM, HR |
| Executive Calendar Widget | Today's schedule \+ 7-day preview | GM, HR |
| Recruitment Snapshot | Open positions, pipeline funnel, interviews today | GM, HR |
| Project Progress | Active projects with completion bars, upcoming milestones | GM, HR |

### **Role-Specific Homepage Behavior**

| Role | Homepage View |
| :---- | :---- |
| superAdmin | Full company view \+ system health (sync status, function error rate). |
| hrManager | HR metrics \+ full outlet updates \+ recruitment pipeline \+ contracts widget. |
| generalManager | Executive snapshot \+ escalations \+ decisions needed \+ calendar widget. |
| director | Executive snapshot \+ calendar widget. |
| Outlet leaders (kitchenLeader, barLeader, floorLeader, bakeryLeader, wholefoodLeader) | Own outlet only — own team tasks, submission status, carried-forward tasks. |
| View-only grant | Read-only schedule view \+ company announcements. |

## **9.14 New Contract Signing** {#9.14-new-contract-signing}

Uses: files (existing File Storage Service) for the PDF; approvalWorkflows (existing Approval Engine) for HR → GM → Director routing, with digital signature captured as an approval action attachment.

| Actor |  | Action | Priority |  |
| :---- | :---- | :---- | :---- | ----- |
| HR Manager |  | Upload PDF contract to File Storage; submit an approval request (module: hr, resourceType: contractSigning). | Must Have |  |
| General Manager |  | Digitally sign; approveStep() advances the workflow to Director automatically. | Must Have |  |
| Director |  | Digitally sign; approveStep() completes the workflow and auto-notifies HR. | Must Have |  |
| HR Manager |  | Download the fully signed PDF; store the final version against the employee record via files. | Must Have |  |
|  | **Sign-off gap:** the original draft's document approval table (now §20) had no Director row despite this module requiring Director sign-off on every new contract. Added. |  |  |  |

# **10\. Non-Functional Requirements** {#10.-non-functional-requirements}

## **10.1 Performance** {#10.1-performance}

| ID | Requirement | Target |
| :---- | :---- | :---- |
| NFR-P01 | Homepage load time | \< 3 seconds on 10 Mbps connection |
| NFR-P02 | Module navigation (SPA route change) | \< 1 second per tab switch |
| NFR-P03 | Data write operations | \< 2 seconds (form submission to confirmation) |
| NFR-P04 | Report generation | \< 10 seconds for any report type |
| NFR-P05 | WhatsApp dispatch | \< 5 seconds per message to the Fonnte API |
| NFR-P06 | Calendar sync to Google | \< 30 seconds per event push |
| NFR-P07 | Dashboard widget refresh | Every 5 minutes via a scheduled Cloud Function, or real-time via Firestore listener where already used elsewhere on the platform |

## **10.2 Scalability** {#10.2-scalability}

| ID | Requirement | Target |
| :---- | :---- | :---- |
| NFR-S01 | Employee records | Support up to 500 active employees without degradation |
| NFR-S02 | Daily update submissions | Support 50+ submissions per day across all outlets |
| NFR-S03 | Candidate records | Support up to 1,000 active candidates in the pipeline |
| NFR-S04 | Task records | Support up to 5,000 tasks without performance impact |
| NFR-S05 | Notification logs | Retain 12 months of logs (rolling archive) |
| NFR-S06 | Outlets | Support up to 15 outlets without code changes |

## **10.3 Security** {#10.3-security}

| ID | Requirement | Target |
| :---- | :---- | :---- |
| NFR-SE01 | Authentication | Google OAuth 2.0 via Firebase Auth for all access — no public endpoints |
| NFR-SE02 | Authorization | RBAC enforced server-side in every Cloud Function — never client-only |
| NFR-SE03 | Data isolation | Outlet leaders cannot read other outlets' employee or daily-update data |
| NFR-SE04 | Salary data | Restricted to hrManager and superAdmin only, enforced by Firestore Security Rules |
| NFR-SE05 | Audit log | Immutable — no user-facing delete on auditLogs records |
| NFR-SE06 | Firestore Security Rules | Field- and collection-level rules on all sensitive data — the correct enforcement point on this stack; no "protected ranges" concept (that was a Sheets-era carryover) |
| NFR-SE07 | Employee contract PDFs | Restricted to superAdmin and hrManager; upload/download only after GM and Director digital signature is complete |

# **11\. User Stories by Epic** {#11.-user-stories-by-epic}

## **Epic E01 — Employee Management** {#epic-e01-—-employee-management}

### **E01-US01: Add New Employee**

As an HR admin, I want to add a new employee record with all required fields so that the employee is immediately visible in the database and linked to automated contract and probation tracking.

**Acceptance Criteria:**

* Employee ID auto-generated in format N-\[NNNN\] (PKWT, PKWTT, Freelance, BOD), DW-\[NNNN\] (Daily Worker), OJT-\[NNNN\] (On-the-Job Training).

* Mandatory fields validated before saving — the Cloud Function blocks incomplete records.

* Probation End Date auto-calculated from Join Date \+ Probation Period (months).

* Contract End Date triggers the notification schedule setup at 90/60/30/14/7 days.

* Employee appears in the list and outlet headcount within 1 second of save.

### **E01-US02: Search and Filter Employees**

As an HR Manager, I want to search and filter the employee database by name, outlet, department, and employment status so that I can quickly find any employee without scrolling through 179+ rows.

**Acceptance Criteria:**

* Search returns results as the user types (minimum 2 characters to trigger).

* Filters are cumulative — outlet AND department AND status combined.

* Results update in real time without a page reload.

* Empty-state message shown when no results match the filters.

### **E01-US03: Deactivate Employee (Resignation)**

As an HR Admin, I want to soft-delete an employee record with a resignation reason and date, so that they are removed from active headcount but all historical data is preserved.

**Acceptance Criteria:**

* Resignation date and reason are mandatory to confirm deactivation.

* Deactivated employee removed from all active dashboards and counts.

* Employee record remains accessible via an "Inactive" filter.

* All active tasks assigned to this employee are flagged for reassignment.

* WhatsApp notification sent to the HR Manager confirming deactivation.

## **Epic E02 — Executive Calendar** {#epic-e02-—-executive-calendar}

### **E02-US01: Create a Meeting**

As the General Manager, I want to create a meeting event with participants, location, and priority so that all stakeholders see it in their calendar and receive WhatsApp reminders.

**Acceptance Criteria:**

* Event form includes: title, type, date, start/end time, participants, location, priority.

* System checks for scheduling conflicts before saving.

* Confirmed event syncs to Google Calendar within 30 seconds.

* WhatsApp reminder sent to all participants at the configured lead time.

* Event appears under "Today's Meetings" on all participant dashboards.

### **E02-US02: Detect Scheduling Conflict**

As an HR Admin, I want the system to warn me when an event overlaps with an existing commitment for the same participant so that double-booking is prevented.

**Acceptance Criteria:**

* A conflict check runs on save, before any event is written to Firestore.

* Warning shows the conflicting event name, time, and affected participants.

* User can choose: override with a reason, or cancel and reschedule.

* Override action is logged in auditLogs with actor, timestamp, and reason.

## **Epic E04 — Recruitment Management** {#epic-e04-—-recruitment-management}

### **E04-US01: Add a New Candidate**

As an HR Admin, I want to add a new candidate to the pipeline for a specific position and outlet, so that all candidate data is tracked centrally from day one.

**Acceptance Criteria:**

* Candidate ID auto-generated: C-\[YEAR\]-\[SEQ\].

* Required: name, position applied, outlet, department, source, phone.

* Candidate appears on the Kanban board under "Applied" immediately.

* Duplicate check on phone number warns HR before save.

### **E04-US02: Move Candidate Through Pipeline**

As an HR Manager, I want to move a candidate from one stage to another on the Kanban board, so that the pipeline is updated and the candidate receives an automated WhatsApp message.

**Acceptance Criteria:**

* Stage change saved with timestamp and actor identity.

* stageHistory JSON log updated on every stage transition.

* Corresponding WhatsApp template fires automatically on stage change.

* Days-in-current-stage counter resets to 0 on each stage change.

## **Epic E10 — Daily Updates** {#epic-e10-—-daily-updates}

### **E10-US01: Submit Daily Opening Shift Update**

As a Restaurant Manager, I want to submit a structured daily update including staffing, achievements, challenges, and open tasks, so that the GM and HR have real-time outlet visibility.

**Acceptance Criteria:**

* Form pre-fills date, outlet, and submittedBy from the logged-in session.

* Task section allows multiple tasks per submission.

* WhatsApp notification sent to HR confirming receipt.

* Submission visible in the company-wide Updates Feed within 30 seconds.

* Cannot submit without reviewing all carried-forward tasks from previous days.

### **E10-US02: See Carried-Forward Outstanding Tasks**

As a Kitchen Leader, when I open the system each morning, I want to see all tasks from previous days that are still open, so that I can update their status before adding new ones.

**Acceptance Criteria:**

* Outstanding tasks shown in a "My Carried-Forward Tasks" block at the top of the form.

* Each task shows days open, last update, current status, priority badge.

* Status update required before a new daily update submission is allowed.

* A completed task disappears from the carried-forward list immediately.

### **E10-US03: Receive Escalation Notification as GM**

As the General Manager, I want to receive a WhatsApp message when a task has been open for 5 or more days without resolution, so that I can intervene and unblock the team.

**Acceptance Criteria:**

* Escalation message includes: task title, outlet, department, owner, days open, last update.

* Message sent via Fonnte to the GM WhatsApp number at Day \+5.

* Escalation logged in the notification log with level and delivery status.

* GM Dashboard shows escalated tasks in the Escalation Center with a red indicator.

## **Epic E12 — Reporting** {#epic-e12-—-reporting}

### **E12-US01: Generate GM Flash Report (Automated Weekly)**

As an HR Admin, I want the GM Flash Report to be generated and sent automatically every Monday, so that the GM receives the weekly operations summary without any manual preparation.

**Acceptance Criteria:**

* Report auto-triggers every Monday at 07:00 via a scheduled Cloud Function.

* Content: headcount summary, open positions, escalated issues, projects, contracts due.

* Delivered as a WhatsApp text summary \+ PDF link to the GM and HR Manager.

* HR Admin can manually trigger the report at any time via the Reports module.

# **12\. Data Schemas** {#12.-data-schemas}

Field names converted to camelCase to match the project-wide convention (the original draft used snake\_case throughout, a leftover from the Sheets-based prototype). Only fields specific to this PRD are shown; every employees/contracts/candidates/tasks document also carries the standard platform fields — id, createdAt, updatedAt, createdBy, outletId, status — per Firestore Design Standards.

## **12.1 employees — HR-Specific Fields** {#12.1-employees-—-hr-specific-fields}

> **Reconciliation with shipped code:** the implemented `Employee` type (`src/types/employee.types.ts`, what `createEmployee` writes) renamed several fields during build: `employeeId` → `employeeNumber`, `nik`/`npwp` → `nationalId`/`taxNumber`, civil dates are ISO **strings** (not Firestore dates), and salary/allowance/bank fields are deliberately **absent** from the employee doc — they live in the PLANNED compensation shape (sub-collection) pending build. Treat the table below as the field inventory; the shipped type wins on naming.

| Field | Type | Constraints | Notes |
| :---- | :---- | :---- | :---- |
| employeeId | string | PK, unique, not null | Format: N-NNNN (FT/FL/BOD), DW-NNNN (Daily Worker), OJT-NNNN (On-the-Job Training) |
| fullName | string | not null | Legal name as per ID |
| nik | string | not null | National ID number |
| npwp | string | optional | Tax ID number |
| gender | enum | not null | male / female |
| birthDate | date | not null |  |
| phone | string | not null, unique | 62xxx format for WhatsApp |
| email | string | not null |  |
| emergencyContactName / emergencyContactPhone | string | not null |  |
| motherName | string | not null |  |
| permanentAddress / domicileAddress | string | not null |  |
| bpjsTk / bpjsKesehatan | string | optional |  |
| bankAccountName / bankAccountNumber | string | optional |  |
| personalTaxStatus | enum | not null | K0/K1/K2/K3/TK0/TK1/TK2/TK3 |
| religion | enum | not null | hindu / christian / muslim |
| departmentId | string (FK → departments) | not null |  |
| outletId | string (FK → outlets) | not null |  |
| employmentStatus | enum | not null | FT / FL / BOD / DW / OJT / resigned |
| joinDate | date | not null |  |
| probationMonths | integer | not null |  |
| probationEndDate | date | auto-calculated | joinDate \+ probationMonths |
| probationStatus | enum | default: pending | pending / passed / failed / extended |
| contractType | enum | not null | permanent / fixedTerm / daily |
| contractEndDate | date | required if fixedTerm |  |
| managerId | string (FK → employees) | optional | Reporting manager |
| basicSalary / positionAllowance / phoneAllowance / transportationAllowance | number | not null | Visible to hrManager / superAdmin only |
| activeStatus | enum | default: active | active / inactive |
| resignationDate / resignationReason | date / string | required if resigned |  |
| disciplinaryType | enum | optional | coaching / verbalWarning / SP1 / SP2 / SP3 / termination |
| disciplinaryStartPeriod / disciplinaryEndPeriod | date | conditional | End \= start \+ 6 months (SP1–3) or \+ 3 months (coaching/verbal) |
| recognitionType / recognitionPeriod | string / date (MM/YYYY) | optional |  |

## **12.2 tasks — Fields Added for This PRD** {#12.2-tasks-—-fields-added-for-this-prd}

Extends the existing Task type. All other fields (id, title, ownerId, dueDate, priority, status, createdAt, updatedAt) already exist.

| Field | Type | Constraints | Notes |
| :---- | :---- | :---- | :---- |
| taskType | enum | extend existing enum | Add dailyUpdate, projectTask to existing values |
| sourceModule | enum | existing field | operations for daily-update and project tasks |
| referenceId | string | existing field | Points to the dailyUpdates or projects document |
| daysOpen | integer | new, calculated daily | Increments via the carry-forward function |
| carriedForwardFrom | string (FK → tasks) | new, optional | Parent task ID if this is a carried-forward instance |
| escalationLevel | integer | new, default 0 | 0–4, set by the escalation Cloud Function |

## **12.3 candidates — Fields for the Recruitment Pipeline** {#12.3-candidates-—-fields-for-the-recruitment-pipeline}

| Field | Type | Notes |
| :---- | :---- | :---- |
| candidateId | string (PK) | Format: C-YYYY-NNNN |
| positionApplied | string | Must exist in positions master |
| outletId | string (FK → outlets) | Target outlet for the role |
| applicationDate | date | Defaults to today on creation |
| source | enum | referral / portal / walkIn / social / other |
| currentStage | enum | ST-01 through ST-08 |
| stageHistory | array\<object\> | \[{from, to, actor, timestamp}\] — append-only |
| hrInterviewScore | integer (1–5) | Captured after the HR interview stage |
| userInterviewScore | integer (1–5) | Captured after the user interview stage |
| offeredSalary | number | hrManager / superAdmin visibility only |
| daysInCurrentStage | integer | Calculated from the last stage-change date |
| totalDaysToHire | integer | Calculated on ST-06 (Hired) — application to join date |

## **12.4 dailyUpdates — New Collection** {#12.4-dailyupdates-—-new-collection}

| Field | Type | Notes |
| :---- | :---- | :---- |
| dailyUpdateId | string (PK) | Auto-generated |
| outletId / departmentId | string (FK) | Submission context |
| submittedBy | string (FK → users) | From logged-in session |
| date | date | The operational day this update covers |
| staffingNotes | string | Free text |
| achievements / challenges | string | Free text |
| openTaskIds | array\<string\> (FK → tasks) | Tasks spawned from this submission |
| carriedForwardReviewed | boolean | Must be true before a new submission is allowed |
| attachmentFileIds | array\<string\> (FK → files) | Photos/attachments via File Storage Service |

## **12.5 Entity Relationship Summary** {#12.5-entity-relationship-summary}

* employees → departments, outlets, employees (managerId self-reference)

* candidates → outlets, departments, interviews, calendarEvents

* tasks → employees (owner), outlets, departments, dailyUpdates, projects

* dailyUpdates → tasks (one-to-many), outlets, departments, users

* calendarEvents → employees (participants), notifications

* approvalRequests → calendarEvents, projects, tasks, users (existing polymorphic pattern)

* auditLogs → users, all entity types (existing polymorphic pattern)

# **13\. API Integration Specifications** {#13.-api-integration-specifications}

## **13.1 Fonnte WhatsApp API** {#13.1-fonnte-whatsapp-api}

Implemented as the WhatsApp channel adapter behind the existing Notification Engine — see §6.2.

| Property | Value |
| :---- | :---- |
| Base URL | https://api.fonnte.com |
| Authentication | Authorization: Bearer {FONNTE\_TOKEN} — stored in integrations/fonnte, not a CONFIG sheet |
| Send Endpoint | POST /send |
| Request Format | JSON body: { target, message, countryCode, delay } |
| Success Response | 200 OK: { status: true, process: 1, id: "..." } |
| Error Response | 400: { status: false, reason: "Device disconnected" } |
| Retry Policy | Up to 3 retries with 5-second backoff on failure, logged to notifications delivery-status block |
| Rate Limit Strategy | 2-second delay between bulk messages |
| Target Formats | Individual: 628123456789 · Group: 120363xxx@g.us · Bulk: comma-separated |

## **13.2 Google Calendar API** {#13.2-google-calendar-api}

| Operation |  | Trigger |  |
| :---- | :---- | :---- | ----- |
| Create event |  | System event status \= confirmed |  |
| Update event |  | System event modified |  |
| Delete event |  | System event cancelled |  |
| Conflict check |  | Before every event creation |  |
| Sync run |  | Scheduled Cloud Function, every 15 minutes |  |
|  | **Corrected from the original draft:** the v1.0.0 spec referenced Apps Script's CalendarApp object (createEvent(), setTitle(), getEvents()), which only exists inside Google Apps Script and is not callable from a Firebase Cloud Function. The Calendar Service instead calls the Google Calendar REST API (events.insert / events.patch / events.delete / events.list with a service account or OAuth2 credentials stored in integrations/googleCalendar) from a Node.js Cloud Function. |  |  |

# **14\. Core Algorithms** {#14.-core-algorithms}

## **14.1 Contract / Probation Alert Logic** {#14.1-contract-/-probation-alert-logic}

Runs daily at 06:00 via a Cloud Scheduler-triggered function. Checks all active contracts and probation records against the defined threshold days (90, 60, 30, 14, 7, 0). Each threshold fires exactly once per employee per contract cycle — duplicate prevention via a sentFlags map on the contracts document. The appropriate WhatsApp template dispatches to the role-based recipients for that threshold via the Notification Engine.

## **14.2 Automatic Carry-Forward Logic** {#14.2-automatic-carry-forward-logic}

Runs daily at 00:01 via a Cloud Scheduler-triggered function. Queries all tasks where sourceModule \= "operations", taskType \= "dailyUpdate", date \= yesterday, and status is not in (completed, cancelled). For each match: creates a new task for today, copies all fields, increments daysOpen by 1, and sets carriedForwardFrom to the parent task ID. The escalation check (§14.3) runs immediately after carry-forward completes.

## **14.3 Escalation Check Logic** {#14.3-escalation-check-logic}

Runs daily at 07:00. For all open daily-update tasks: at daysOpen \= 2 and escalationLevel \< 1, sends a WhatsApp to the Department Manager and sets escalationLevel \= 1\. At daysOpen \= 3, sends to the HR team and sets escalationLevel \= 2\. At daysOpen \= 5, sends to the GM, sets escalationLevel \= 3, and flags the task as escalated on the GM Dashboard. At daysOpen ≥ 14, forces priority to critical and sends a full summary to the GM at escalationLevel \= 4\.

## **14.4 Google Calendar Sync Deduplication** {#14.4-google-calendar-sync-deduplication}

Before pushing any event to Google Calendar, the sync function checks whether gcalEventId is stored on the calendarEvents document. If present and the Google Calendar event is still valid, it updates the existing event (no new event created). If gcalEventId is missing, or the event was deleted externally, it creates a new Google Calendar event and stores the new gcalEventId. This prevents calendar duplication across sync cycles.

# **15\. Cloud Functions Module Map** {#15.-cloud-functions-module-map}

|  | Replaces §17 "Apps Script File Structure" from the original draft: that section listed a table with no rows and was written for the wrong runtime (Google Apps Script) — NourishOS runs on Firebase Cloud Functions (Node.js/TypeScript). Below is the actual module map for this PRD's scope, following the existing functions/src/{module}/ convention. |  |  |
| :---- | :---- | :---- | ----- |
| **Path** |  | **Responsibility** |  |
| functions/src/hr/employees/ |  | Employee CRUD, ID generation, tenure/probation auto-calc, soft-delete. SHIPPED — createEmployee / updateEmployee / archiveEmployee. |  |
| functions/src/hr/contracts.ts |  | Contract/probation threshold checks (§14.1), scheduled 06:00 daily. |  |
| functions/src/hr/recruitment.ts |  | Requisition and candidate CRUD, Candidate ID generation, stage transitions. |  |
| functions/src/hr/appraisals.ts |  | Extended per §6.4/§9.6 — weighted-component scoring, new review-type triggers. |  |
| functions/src/calendar/events.ts |  | calendarEvents CRUD, conflict detection, recurrence expansion. |  |
| functions/src/calendar/googleSync.ts |  | Push/pull sync against the Google Calendar API, dedup logic (§14.4), scheduled every 15 minutes. |  |
| functions/src/operations/dailyUpdates.ts |  | Submission handling, carry-forward (§14.2) scheduled 00:01, escalation (§14.3) scheduled 07:00. |  |
| functions/src/operations/projects.ts |  | Project CRUD, milestone tracking. |  |
| functions/src/notifications/whatsapp.ts |  | Fonnte adapter behind the existing Notification Engine — template rendering, dispatch, retry, delivery-status logging. |  |
| functions/src/reports/flashReport.ts |  | GM Flash Report generation, scheduled Mondays 07:00, plus manual trigger. |  |
| functions/src/reports/dailyDigest.ts |  | Daily 08:00 digest to GM and HR. |  |

All modules above call into the existing shared services (approval, task, notification, audit, file) rather than duplicating their logic — per §6.1. RBAC checks happen inside each Cloud Function using the existing requireRole()/requirePermission() middleware, not inside the React UI.

# **16\. Development Roadmap & MVP Scope** {#16.-development-roadmap-&-mvp-scope}

## **16.1 Phase 1 — MVP (Target: 7 Weeks)** {#16.1-phase-1-—-mvp-(target:-7-weeks)}

Goal: replace the current spreadsheet-based task calendar with a structured module on the NourishOS platform, covering the highest-value pain points first: contract/probation tracking, daily updates, and the executive calendar.

|  | Corrected from the original draft: Week 1 originally read "all 18 sheets created" — since this is now a Firestore-based module extending an existing platform, Week 1 is schema/field additions and security rules, not creating 18 new tables from scratch. Week 2 originally listed "RBAC for 3 roles" — RBAC already exists platform-wide; Week 2 is adding the new permission strings from §7.3 (the two outlet-leader roles have since shipped in roles.ts, July 2026). |  |  |  |
| :---- | :---- | :---- | :---- | ----- |
| **Week** |  | **Milestone** | **Deliverable** |  |
| Week 1 |  | Data Layer | Extend employees/contracts/tasks schemas; create calendarEvents, dailyUpdates collections and Security Rules; resolve §6.4 decision. |  |
| Week 2 |  | RBAC & Permissions | Add new permission strings (§7.3); provision test users. (bakeryLeader/wholefoodLeader roles already shipped July 2026.) |  |
| Week 3 |  | Employee Module | Employee CRUD, search/filter, profile page, bulk import. |  |
| Week 4 |  | Calendar & Sync | Calendar Service UI, Google Calendar sync, conflict detection. |  |
| Week 5 |  | Contract Tracker | Probation/contract tracking, all 6 WhatsApp alert thresholds via the Notification Engine. |  |
| Week 6 |  | Daily Updates | Submission form, carry-forward function, escalation logic, compliance tracker. |  |
| Week 7 |  | Dashboard \+ Launch | HR/Ops widgets on the existing Dashboard module, role-based views, user testing. |  |

## **16.2 MVP Included / Excluded** {#16.2-mvp-included-/-excluded}

| Module | MVP Status |
| :---- | :---- |
| Employee Database (core fields) | Included |
| Executive Calendar | Included |
| Google Calendar Sync (push only) | Included |
| WhatsApp: contract/probation alerts | Included |
| Contract & Probation Tracker | Included |
| HR Dashboard (5 core widgets) | Included |
| Daily Updates System (full) | Included |
| Homepage / Command Center | Included |
| Recruitment Kanban | Phase 2 |
| Performance Management | Phase 2 — pending §6.4 resolution |
| Project Management | Phase 2 |
| Approval Workflow (new chains configured) | Phase 2 |
| PDF Report Generation | Phase 2 |
| Dark Mode, Bilingual UI | Phase 3 |
| AI Query Interface | Phase 3 |

## **16.3 Phase 2 — Full HR Hub (Target: \+8 Weeks After MVP)** {#16.3-phase-2-—-full-hr-hub-(target:-+8-weeks-after-mvp)}

| Module | Scope |
| :---- | :---- |
| Recruitment | Full pipeline, Kanban board, all 8 stages, metrics dashboard. |
| WhatsApp Recruitment | All 6 candidate communication templates with variable resolution. |
| Performance Management | Per §6.4 resolution — review scheduling, scoring, history. |
| Project Management | Kanban board, task management, milestones. |
| Approval Workflow | Configure the 8 workflow chains from §9.10 in the existing Approval Engine. |
| Reporting | PDF generation for 5 report types, auto-dispatch to GM and HR. |

## **16.4 Phase 3 — Advanced Features (Target: \+12 Weeks After Phase 2\)** {#16.4-phase-3-—-advanced-features-(target:-+12-weeks-after-phase-2)}

* Dark Mode / Light Mode toggle (platform-wide, not HR-specific).

* Full bilingual UI: English / Bahasa Indonesia toggle.

* Mobile-first refinement for HOD use on phones (\< 768px).

* Google Calendar pull sync — import GM personal calendar events.

* AI Query Interface — natural-language questions answered from system data.

* Data archiving — auto-archive records older than 2 years.

* Advanced analytics — trend charts, year-over-year comparisons.

# **17\. Risks & Mitigations** {#17.-risks-&-mitigations}

| Risk | Probability | Impact | Mitigation |
| :---- | :---- | :---- | :---- |
| Low user adoption due to resistance to change | Medium | High | Phased rollout, user training, outlet champions, continuous feedback during rollout. |
| Incomplete or inaccurate master-data migration | Medium | High | Validate before migration, trial migrations, backups, reconciliation before go-live. |
| Internet connectivity issues at outlets | Medium | High | Planned PWA offline caching for critical data with auto-sync on reconnect (PWA packaging not yet built — see CLAUDE.md). |
| Firebase service outage or degraded performance | Low | Critical | Monitor Firebase status, retry mechanisms, graceful error handling, daily Firestore backups. |
| Unauthorized access or RBAC misconfiguration | Medium | Critical | RBAC enforced in Cloud Functions, regular permission audits, least-privilege, security review before deploy. |
| Sensitive employee or financial data exposure | Low | Critical | Encrypt in transit, Firestore Security Rules, audit logging, role-restricted access, periodic security assessment. |
| Cloud Functions execution limits or quota exceeded | Medium | High | Optimize functions, split long-running work into background jobs, monitor usage, billing alerts. |
| Firestore performance degradation from poor data modeling | Medium | High | Follow Firestore best practices, optimize indexes, denormalize where appropriate, paginate, review query performance. |
| Performance Management conflict (§6.4) not resolved before Phase 2 starts | Medium | High | Treat §6.4 as a blocking decision — do not begin Performance Management engineering until Option A or B is signed off. |

# **18\. Acceptance Criteria** {#18.-acceptance-criteria}

## **18.1 System-Level Acceptance** {#18.1-system-level-acceptance}

| ID | Criterion | Verification Method |
| :---- | :---- | :---- |
| AC-01 | All users can log in using Google Workspace accounts. | Manual test across all role types. |
| AC-02 | RBAC prevents unauthorized access to any module. | Penetration test per the permission matrix (§7.2). |
| AC-03 | Contract alerts fire at all 6 thresholds without manual trigger. | 30-day monitoring log. |
| AC-04 | Daily updates carry forward automatically at midnight. | Verify next morning with a test task. |
| AC-05 | Escalation WhatsApp fires at D+2, D+3, D+5. | Create a test task, monitor WhatsApp for 5 days. |
| AC-06 | Google Calendar events sync within 30 seconds. | Create event, check Google Calendar. |
| AC-07 | Homepage loads in under 3 seconds on 10 Mbps. | Browser devtools network timing test. |
| AC-08 | Notification log records every sent message. | Compare Fonnte dashboard to the notifications collection. |
| AC-09 | Audit log records every create/update/delete. | Trace actions against auditLogs entries. |
| AC-10 | All new/extended Firestore collections match the schemas in §12. | Schema verification checklist against §8.2 and §12. |

## **18.2 Business Acceptance** {#18.2-business-acceptance}

| ID | Criterion | Measurement |
| :---- | :---- | :---- |
| BA-01 | 0 missed contract deadlines in the first 30 days. | contracts collection review at the 30-day mark. |
| BA-02 | Daily update submission rate ≥ 60% by Week 4\. | dailyUpdates compliance tracker %. |
| BA-03 | GM can review company health in \< 60 seconds. | User test with stopwatch on login. |
| BA-04 | HR Admin processes a recruitment candidate in ≤ 4 clicks. | Click-count user test workflow. |
| BA-05 | Weekly GM Flash Report auto-generated with correct data. | Verify 4 consecutive Monday reports. |

# **19\. Glossary** {#19.-glossary}

| Term | Definition |
| :---- | :---- |
| HOD | Head of Department — outlet-level leader responsible for daily updates. |
| GM | General Manager — primary executive user of the system. |
| DW | Daily Worker — employment status for casual daily-contracted staff. |
| OJT | On-the-Job Training — intern/trainee employment status. |
| FT / FL | Full Time / Freelance — permanent vs. project-based employment. |
| RBAC | Role-Based Access Control — the platform-wide permission system per role, module, and action. |
| PWA | Progressive Web App — the planned NourishOS deployment model (installable, offline-capable web app); not yet built, plain Vite SPA today. |
| Fonnte | WhatsApp API provider used for all automated message dispatch. |
| Carry Forward | Automatic system action that brings unresolved daily-update tasks to the next day. |
| Escalation | Automatic notification triggered when a task exceeds an age threshold. |
| gcalEventId | Google Calendar event ID stored on a calendarEvents document for sync deduplication. |
| stageHistory | Append-only array on a candidate document logging every pipeline stage change. |
| Compliance Rate | Percentage of departments that submitted daily updates by the deadline. |
| Aging Indicator | Color label for task age: Green (1–3d) / Yellow (4–7d) / Orange (8–14d) / Red (15+d). |
| Flash Report | GM's weekly operational summary, sent every Monday at 07:00. |
| Daily Digest | Auto-generated morning operations summary sent at 08:00. |
| Manning Guide | Internal headcount report comparing staff levels year-over-year. |
| BEOTM | Best Employee of the Month — internal recognition program. |
| NGI | Nourish Group Indonesia — company abbreviation used in Employee IDs. |
| PRD | Product Requirements Document — this document. |
| MVP | Minimum Viable Product — Phase 1, core features only. |
| Shared Services | NourishOS's common backbone — Approval Engine, Task Engine, Notification Engine, Audit Log, File Storage, Search — that every module must use rather than duplicate. |

# **20\. Document Approval & Sign-Off** {#20.-document-approval-&-sign-off}

| Role | Name | Date | Signature |
| :---- | :---- | :---- | :---- |
| General Manager | Made Bagia Arsana |  |  |
| HR Manager | Angellia Okta |  |  |
| HR Admin | I Komang Putra Adnyana |  |  |
| Director | Elle Mary Georgiou |  |  |
| Product / Technical Lead | Angellia Okta |  |  |

Document Version: 2.0.0 (Refined)  |  Nourish Group Indonesia  |  July 2026  |  Confidential