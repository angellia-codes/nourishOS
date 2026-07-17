# Nourish Operational System (NOS)
## Product Requirements Document (PRD)

**Version:** 1.1
**Status:** Draft
**Product Owner:** Nourish Management
**Prepared By:** HR & Digital Transformation
**Last Updated:** July 2026

> **Scope note:** this is the whole-platform product vision. The HR & Operations vertical (employee database, executive calendar, recruitment, contract tracking, daily updates, projects) has a deeper, architecture-aligned PRD that supersedes this document for that scope — see [HR_OPERATIONS.md](HR_OPERATIONS.md) (v2.0.0).

---

# 1. Executive Summary

The Nourish Operational System (NOS) is an all-in-one company operating system designed to digitize and centralize business operations across Headquarters and all Nourish outlets.

The system will replace manual paperwork, spreadsheets, and scattered communication with one integrated platform supporting every department while maintaining role-based access control and standardized workflows.

The platform will be developed incrementally using a modular architecture, allowing each department to adopt digital operations without disrupting existing business processes.

---

# 2. Product Vision

Create one centralized digital operating system where every Nourish employee can perform operational tasks, access company documents, complete approvals, and collaborate efficiently from any device.

---

# 3. Product Goals

Primary goals include:

- Digitize all company SOPs
- Eliminate paper-based forms
- Standardize operations across outlets
- Centralize company knowledge
- Improve accountability
- Reduce approval turnaround time
- Enable real-time reporting
- Support future company expansion

---

# 4. Target Users

## Executive

- Director
- General Manager

## Administration

- HR Manager
- Finance
- Purchasing

## Operations

- Kitchen Leader
- Bar Leader
- Floor Leader
- Security
- Engineering
- Wholefood Leader
- The Bakery Leader

## System

- Super Admin

---

# 5. Supported Organization Structure

- Headquarters
- Multiple Outlets
- Future Multi-Outlet Expansion

---

# 6. Core Modules

## HR Module

Features

- Employee Database
- Recruitment
- Candidate Tracking
- Employee Onboarding/Offboarding
- Employment Contracts
- Performance Reviews
- Disciplinary Actions
- Training Records
- Company Assets
- Employee Activity
- Payroll Integration (Future)

---

## Operations Module

Features

- Opening Checklist
- Closing Checklist
- Daily Reports
- Incident Reports
- Engineering Work Order Forms

---

## Finance Module

Features

- Expense Requests

---

## Documents Module

Features

- SOP Repository
- Company Forms
- Templates
- Training Modules

---

## Communication Module

Features

- Company Announcements
- Internal Chat
- Task Management

---

## Dashboard Module

Features

- KPIs
- Pending Approvals
- Notifications
- Department Overview
- Operational Status

---

# 7. User Roles

- Super Admin
- Director
- General Manager
- HR Manager
- Finance
- Purchasing
- Kitchen Leader
- Bar Leader
- Floor Leader
- The Bakery Leader
- Wholefood Leader
- Security
- Engineering

---

# 8. Permission Model

The system will implement Role-Based Access Control (RBAC).

Each role can have:

- View
- Create
- Edit
- Approve
- Reject
- Delete
- Export
- Manage

Permissions are assigned by module.

---

# 9. Approval Workflow

General Form Approval Flow

User

↓

Manager

↓

HR

↓

General Manager

↓

Director

Each workflow should support:

- Approve
- Reject
- Return for Revision
- Comment History
- Approval Timeline
- Notifications

---

# 10. User Flow

Login

↓

Dashboard

↓

Department Module

↓

Submit Form

↓

Approval Workflow

↓

Notification

↓

Completed Record

---

# 11. Authentication

Authentication Method

- Google Login

Future Support

- Microsoft Login
- Email Login
- Two-Factor Authentication

---

# 12. Multi-Outlet Support

The platform must support

- Headquarters
- Multiple outlets
- Department segregation
- Outlet filtering
- Cross-outlet reporting

---

# 13. Branding

Follow Nourish Brand Identity

Including

- Logo
- Brand Colors
- Typography
- Dark Mode
- Light Mode

---

# 14. Platform

Primary Platform

- Responsive web app (SPA); Progressive Web App packaging planned — not yet built

Responsive Support

- Desktop
- Tablet
- Mobile

---

# 15. Technical Direction

## Architecture

The Nourish Operational System (NOS) will be built using a fully serverless architecture on Google Firebase to maximize scalability, reduce infrastructure maintenance, and enable rapid feature development.

### Frontend

- React
- Progressive Web App (PWA) — planned
- Responsive Design
- Component-Based Architecture

### Backend

- Firebase Authentication
- Cloud Functions
- Cloud Firestore
- Cloud Storage
- Firebase Cloud Messaging (Future)

### Authentication

- Google Login
- Role-Based Access Control (RBAC)

### Database

- Cloud Firestore

### File Storage

- Firebase Cloud Storage

### Hosting

- Firebase Hosting (planned — not yet configured)

### Architecture Principles

- Serverless
- Modular
- Event-Driven
- API-First
- Secure by Default
- Scalable
- Offline-Capable (where practical)

---

# 16. Non-Functional Requirements

Performance

- Fast loading
- Offline-capable where practical
- Mobile responsive

Security

- RBAC
- Secure authentication
- Audit logs
- HTTPS
- Encrypted data

Scalability

- Multi-outlet
- Modular deployment
- Future integrations

---

# 17. Future Roadmap

Planned Integrations

- ESB
- Payroll
- AI Assistant
- WhatsApp Notifications
- Digital Signatures
- Analytics Dashboard

---

# 18. Success Criteria

The project is successful when:

✓ 100% SOPs are digitized

✓ Paper forms are eliminated

✓ Approval time is reduced by at least 80%

✓ Single login is available for all departments

✓ Real-time operational reporting is implemented

✓ Platform supports multiple outlets

---

# 19. Development Strategy

Development Approach

Module-by-module

Recommended implementation order

Phase 1
- Authentication
- RBAC
- Dashboard

Phase 2
- HR

Phase 3
- Documents

Phase 4
- Operations

Phase 5
- Finance

Phase 6
- Communication

Phase 7
- Reporting

Phase 8
- Integrations

---

# 20. MVP Scope

Included

- Login
- Dashboard
- RBAC
- Employee Database
- SOP Library
- Document Management
- Daily Reports
- Expense Requests
- Announcements
- Notifications
- Task Management

Excluded

- Payroll
- AI Assistant
- ESB Integration
- Analytics
- WhatsApp
- Digital Signatures

---

# 21. Success Metrics

Business KPIs

- SOP Usage Rate
- Paperless Adoption Rate
- Form Completion Rate
- Approval Lead Time
- Employee Adoption Rate
- Daily Active Users
- Monthly Active Users
- Average Task Completion Time

---

# 22. Long-Term Vision

Become the single operating platform for every Nourish business unit by providing standardized workflows, centralized documentation, operational transparency, and scalable digital infrastructure across all current and future outlets.