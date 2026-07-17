# 🌿 NourishOS

> **One Platform. Every Department. Every Outlet.**

NourishOS is the centralized operational platform for **Nourish Group Indonesia**, designed to digitize and streamline business operations across Headquarters and all outlets.

Built with a modern serverless architecture, NourishOS replaces paper-based workflows and disconnected tools with a secure, scalable, real-time operational system.

---

# Vision

Create a single digital workplace where every employee can:

- Access company information
- Complete operational tasks
- Submit and approve requests
- Manage documents
- Collaborate across departments
- Monitor business performance
- Work from anywhere on any device

---

# Objectives

- Digitize 100% of company SOPs
- Eliminate paper-based operational forms
- Standardize workflows across all outlets
- Improve transparency and accountability
- Reduce approval turnaround time
- Support future company growth through modular architecture

---

# Technology Stack

## Frontend

- React 18
- TypeScript (strict)
- Vite
- Tailwind CSS + shadcn-style UI primitives (class-variance-authority, tailwind-merge)
- React Router
- Zustand
- Lucide React

## Backend

Firebase

- Authentication (Google Sign-In)
- Cloud Firestore
- Cloud Functions (region asia-southeast2)
- Cloud Storage
- Firebase Hosting (planned — not yet configured)

## Platform

- Responsive web app (SPA); Progressive Web App packaging is planned, not yet built

---

# Architecture

```text
                        Users
                           │
                           ▼
                Firebase Authentication
                           │
                           ▼
                  React SPA (Frontend)
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   Cloud Firestore   Cloud Functions   Cloud Storage
          │                │                │
          └────────────────┼────────────────┘
                           ▼
              Firebase Hosting (planned)
```

---

# Core Modules

## Core Platform

- Authentication
- Dashboard
- RBAC
- Notifications
- Settings

---

## Human Resources

- Employee Database
- Recruitment
- Onboarding
- Contracts
- Performance
- Training
- Employee Assets
- Employee Activities
- Disciplinary Actions

---

## Operations

- Opening Checklist
- Closing Checklist
- Daily Reports / Daily Updates
- Incident Reports
- Lost & Found
- Engineering Work Orders

---

## Finance

- Expense Requests

---

## Security

- Patrol Checkpoints
- Patrol Logs

---

## Documents

- SOP Library (read-only for staff)
- Company Forms
- Templates
- Training Modules

---

## Communication

- Announcements
- Tasks
- Internal Chat

---

# User Roles

The 16 canonical role IDs live in `src/constants/roles.ts`:

- Super Admin
- Director
- General Manager
- HR Manager
- Finance
- Purchasing
- Outlet Manager
- Kitchen Leader
- Bar Leader
- Floor Leader
- Bakery Leader
- Wholefood Leader
- Security
- Engineering
- Marketing
- Staff

---

# Project Structure

```text
nourishos/

├── docs/
│   ├── core/        (PRD, HR_OPERATIONS, ARCHITECTURE, DATABASE, DESIGN,
│   │                 STYLE_GUIDE, API, RBAC, FIRESTORE_SCHEMA,
│   │                 COMPONENT_LIBRARY, ROADMAP, FEATURE_SPECIFICATIONS, ...)
│   ├── modules/     (per-module specs: hr, finance, operations, documents, ...)
│   ├── platform/    (shared services: approval_engine, task_engine,
│   │                 notifications, audit_log, file_storage, ...)
│   └── BUILD_ROADMAP.md
│
├── src/
│   ├── firebase.json          (Firebase config — paths resolve relative to src/)
│   ├── firestore.rules        (the deployed rules)
│   ├── firestore.indexes.json
│   └── storage.rules
│
├── functions/
│
├── public/
│
└── package.json
```

---

# Documentation

| Document                       | Purpose                                                  |
| ------------------------------ | -------------------------------------------------------- |
| core/PRD.md                    | Whole-platform product vision, goals, and requirements   |
| core/HR_OPERATIONS.md          | HR & Operations Command Center PRD (v2.0.0, refined)     |
| core/STYLE_GUIDE.md            | Visual identity and design tokens (v2 — Warm Utilitarian)|
| core/DESIGN.md                 | UI/UX specifications                                     |
| core/ARCHITECTURE.md           | Technical architecture                                   |
| core/DATABASE.md               | Firestore data design                                    |
| core/FIRESTORE_SCHEMA.md       | Collection and document schemas                          |
| core/API.md                    | Cloud Functions and service contracts                    |
| core/RBAC.md                   | Roles and permissions                                    |
| core/AUTHENTICATION.md         | Auth flows and session management                        |
| core/COMPONENT_LIBRARY.md      | Reusable UI components (shipped vs planned)              |
| core/FEATURE_SPECIFICATIONS.md | Functional feature definitions                           |
| core/ROADMAP.md                | Development phases and milestones                        |
| modules/*.md                   | Per-module functional specs                              |
| platform/*.md                  | Shared-service specs (approval, tasks, notifications, …) |
| BUILD_ROADMAP.md               | HR & Ops build order + Employee DB implementation plan   |

---

# Development Principles

- Modular architecture
- Feature-first organization
- Serverless by default
- Reusable components
- Mobile-first responsive design
- Secure by design
- Accessibility-aware
- Offline-aware where practical
- Real-time collaboration

---

# Development Workflow

```text
Planning

↓

Documentation

↓

Design

↓

Development

↓

Code Review

↓

Testing

↓

Staging

↓

Production
```

---

# Branch Strategy

```text
main

develop

feature/<feature-name>

hotfix/<issue-name>

release/<version>
```

---

# Coding Standards

- TypeScript for all new code (strict — `npm run build` is the quality gate; ESLint/Prettier planned, not yet installed)
- Functional React components
- Custom hooks for shared logic
- Centralized design tokens
- Shared component library
- Strict RBAC enforcement
- Cloud Functions for business logic

---

# Security

- Firebase Authentication
- Google Sign-In
- Firestore Security Rules
- Cloud Functions validation
- Role-Based Access Control (RBAC)
- Audit logging
- HTTPS only
- Least-privilege access

---

# Performance Goals

- Initial page load ≤ 3 seconds
- Dashboard ≤ 2 seconds
- Cloud Function responses ≤ 500 ms (target)
- Lazy-loaded modules
- Optimized Firestore queries
- Responsive on desktop, tablet, and mobile

---

# Future Roadmap

Planned enhancements include:

- Payroll Integration
- ESB Integration
- AI Assistant
- WhatsApp Notifications
- Digital Signatures
- Analytics Dashboard
- Inventory Management
- Purchase Orders
- Shift Scheduling
- Leave Management

---

# Success Metrics

The project will be considered successful when:

- 100% of SOPs are digitized
- Paper-based workflows are eliminated where practical
- Approval turnaround time is reduced by at least 80%
- Employees use a single login across all modules
- Operational reporting is available in real time
- The platform scales efficiently across multiple outlets

---

# Guiding Principles

Every feature in NourishOS should be:

- Useful
- Consistent
- Secure
- Fast
- Accessible
- Maintainable
- Scalable

Technology should simplify operations, not add complexity.

---

# License

Internal software developed exclusively for **Nourish Group Indonesia**.

Unauthorized copying, distribution, or commercial use is prohibited without written approval from Nourish Management.

---

# Maintainers

**Product Owner**

Nourish Management

**Project**

NourishOS

**Status**

In development — shipped: core platform (auth/RBAC/dashboard shell), HR Appraisal (incl. AI insights), HR Employee Database, Security patrol/checkpoints; every other module has a frontend-only preview under `/demo`
