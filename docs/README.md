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

- React
- TypeScript
- Vite
- Material UI (MUI)
- React Router
- Zustand
- React Hook Form
- Zod

## Backend

Firebase

- Authentication
- Cloud Firestore
- Cloud Functions
- Cloud Storage
- Firebase Hosting

## Platform

- Progressive Web App (PWA)

---

# Architecture

```text
                        Users
                           │
                           ▼
                Firebase Authentication
                           │
                           ▼
                  React PWA (Frontend)
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   Cloud Firestore   Cloud Functions   Cloud Storage
          │                │                │
          └────────────────┼────────────────┘
                           ▼
                    Firebase Hosting
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

- SOP Library
- Opening Checklist
- Closing Checklist
- Daily Reports
- Incident Reports
- Engineering Work Orders

---

## Finance

- Expense Requests
- Petty Cash
- Budget Approvals

---

## Documents

- SOP Repository
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

- Super Admin
- Director
- General Manager
- HR Manager
- Finance
- Purchasing
- Kitchen Leader
- Bar Leader
- Floor Leader
- Security
- Engineering

---

# Project Structure

```text
nourishos/

├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── DESIGN.md
│   ├── STYLE_GUIDE.md
│   ├── API.md
│   ├── RBAC.md
│   ├── FIRESTORE_SCHEMA.md
│   ├── COMPONENT_LIBRARY.md
│   ├── ROADMAP.md
│   ├── FEATURE_SPECIFICATIONS.md
│   └── features/
│
├── src/
│
├── functions/
│
├── public/
│
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
└── package.json
```

---

# Documentation

| Document                  | Purpose                                 |
| ------------------------- | --------------------------------------- |
| PRD.md                    | Product vision, goals, and requirements |
| STYLE_GUIDE.md            | Visual identity and design principles   |
| DESIGN.md                 | UI/UX specifications                    |
| ARCHITECTURE.md           | Technical architecture                  |
| DATABASE.md               | Firestore data design                   |
| FIRESTORE_SCHEMA.md       | Collection and document schemas         |
| API.md                    | Cloud Functions and service contracts   |
| RBAC.md                   | Roles and permissions                   |
| COMPONENT_LIBRARY.md      | Reusable UI components                  |
| FEATURE_SPECIFICATIONS.md | Functional feature definitions          |
| ROADMAP.md                | Development phases and milestones       |

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

- TypeScript for all new code
- ESLint + Prettier
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

Planning → Foundation Phase
