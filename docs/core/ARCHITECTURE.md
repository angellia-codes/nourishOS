# NourishOS Architecture

Version: 1.1  
Product: Nourish Operational System (NourishOS)

---

# 1. Architecture Overview

NourishOS is a cloud-native, serverless single-page web application (SPA) designed to centralize operational workflows across Headquarters and all Nourish outlets. PWA packaging (installable app, service worker) is planned but not yet built — today it ships as a plain Vite SPA.

The architecture prioritizes:

- Modular development
- Scalability
- Security
- High availability
- Real-time collaboration
- Offline capability (planned — depends on the PWA work)
- Low operational maintenance

---

# 2. Technology Stack

## Frontend

- React 18
- Vite
- TypeScript (strict)
- React Router
- Tailwind CSS + shadcn-style UI primitives (class-variance-authority, tailwind-merge)
- Zustand
- Lucide React

---

## Backend

Google Firebase

- Firebase Authentication
- Cloud Firestore
- Cloud Functions
- Cloud Storage
- Firebase Hosting (planned — no hosting block in `src/firebase.json` yet)
- Firebase Cloud Messaging (Future)

---

## Development

- TypeScript strict mode — `npm run build` (tsc + vite) is the quality gate
- ESLint + Prettier (planned — not yet installed)
- Test runner (planned — none configured today; see CLAUDE.md)
- Git
- GitHub

---

# 3. High-Level Architecture

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

# 4. System Layers

## Presentation Layer

Responsible for:

- User Interface
- Navigation
- Forms
- Dashboards
- Reports
- Data Visualization

Technology

- React
- Tailwind CSS + shadcn-style primitives (`src/components/ui/`)
- Zustand

---

## Business Layer

Responsible for:

- Approval workflows
- Business rules
- Notifications
- Scheduled tasks
- Validation
- Audit logging

Technology

- Firebase Cloud Functions

---

## Data Layer

Responsible for:

- Operational data
- Employee records
- Reports
- SOPs
- Tasks
- Documents

Technology

- Cloud Firestore

---

## Storage Layer

Responsible for:

- SOP PDFs
- Images
- Contracts
- Training materials
- Employee documents
- Attachments

Technology

- Firebase Cloud Storage

---

# 5. Application Modules

## Core

- Authentication
- User Management
- RBAC
- Dashboard
- Notifications

---

## HR

- Employee Database
- Recruitment
- Onboarding
- Contracts
- Performance
- Training
- Assets
- Employee Activity
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

---

## Documents

- SOP Repository
- Templates
- Forms
- Training Modules

---

## Communication

- Announcements
- Internal Chat
- Tasks

---

# 6. Project Structure

```text
nourishos/

├── docs/
│   ├── core/          (this file, PRD, DESIGN, STYLE_GUIDE, API, DATABASE, RBAC, ...)
│   ├── modules/       (per-module specs)
│   └── platform/      (shared-service specs: approval, tasks, notifications, ...)
│
├── src/
│   ├── app/
│   ├── assets/
│   ├── components/
│   │     ├── ui/        (shadcn-style primitives)
│   │     ├── shared/    (EmptyState, FileUpload, PermissionGuard, ...)
│   │     └── layout/    (Sidebar, Header, ...)
│   ├── constants/       (collections, permissions, roles — mirrored subset in functions/src/lib)
│   ├── features/
│   │     ├── auth/
│   │     ├── dashboard/
│   │     ├── demo/            (/demo mock-up hub)
│   │     ├── hr/
│   │     ├── security/
│   │     ├── operations/
│   │     ├── finance/
│   │     ├── documents/
│   │     ├── communications/
│   │     ├── inventory/
│   │     └── reports/
│   │
│   ├── layouts/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── routes/
│   ├── contexts/
│   ├── store/
│   ├── styles/
│   ├── themes/          (stub — design tokens live in styles/globals.css)
│   ├── utils/
│   ├── types/
│   ├── firebase.json          (Firebase config — paths resolve relative to src/)
│   ├── firestore.rules        (the deployed rules)
│   ├── firestore.indexes.json
│   ├── storage.rules
│   └── main.tsx
│
├── functions/
│
├── public/
│
└── package.json
```

---

# 7. Authentication Flow

1. User opens NourishOS.
2. User signs in with Google.
3. Firebase Authentication validates the account.
4. User profile is retrieved from Firestore.
5. Assigned roles and permissions are loaded.
6. Dashboard is displayed according to role.

---

# 8. Authorization

NourishOS uses Role-Based Access Control (RBAC).

Permissions are evaluated on both:

- Frontend (UI visibility)
- Backend (Firestore Security Rules and Cloud Functions)

Permission types include:

- View
- Create
- Edit
- Delete
- Approve
- Reject
- Export
- Manage
- Upload
- Download

---

# 9. Firestore Collections (High Level)

```text
users
roles
permissions
employees
departments
outlets

announcements
tasks
notifications

sops
documents
trainingModules

dailyReports
openingChecklists
closingChecklists
incidentReports

expenseRequests

workOrders

approvalRequests / approvalSteps / approvalHistory
auditLogs
systemSettings
```

(Approvals are normalized into request/step/history collections — see `src/constants/collections.ts` and platform/approval_engine.md; the older single `approvalFlows` model is superseded.)

---

# 10. File Storage

Cloud Storage stores:

- Employee photos
- Contracts
- SOP PDFs
- Images
- Attachments
- Training materials

Firestore stores only metadata and file references.

---

# 11. Approval Workflow

Typical workflow:

User
↓
Manager
↓
HR
↓
General Manager
↓
Director

Each step records:

- Status
- Timestamp
- Comments
- User
- Audit trail

---

# 12. Notification Architecture

Notifications are generated by Cloud Functions.

Examples:

- Form submitted
- Approval required
- Approval completed
- Announcement published
- Task assigned
- Training assigned
- Work order updated

Delivery channels:

- In-app notifications
- Push notifications (Future)
- Email (Future)

---

# 13. Offline Strategy (Planned)

This section is a target, not shipped behavior — there is no service worker or PWA packaging yet.

Planned features:

- Cached navigation
- Recently viewed documents
- Read-only SOPs
- Queued form submissions (where feasible)

Service Worker manages local caching and synchronization when connectivity returns.

---

# 14. Security

Authentication

- Google Sign-In

Authorization

- RBAC

Database

- Firestore Security Rules

Functions

- Server-side validation

Communication

- HTTPS only

Additional protections:

- Audit logs
- Input validation
- Rate limiting for callable functions
- Least-privilege access

---

# 15. Performance Strategy

Goals:

- Initial load under 3 seconds on broadband
- Lazy-loaded feature modules
- Route-based code splitting
- Optimized image delivery
- Firestore query indexing
- Efficient pagination
- Client-side caching

---

# 16. Monitoring

Use:

- Firebase Analytics (optional)
- Firebase Performance Monitoring
- Firebase Crashlytics (if native/mobile components are added)
- Cloud Logging
- Error reporting

Track:

- Active users
- Failed logins
- Slow queries
- Function execution errors
- Approval durations
- Form completion rates

---

# 17. Scalability

Designed to support:

- Multiple outlets
- Additional departments
- New feature modules
- Increased employee count
- Regional expansion

New modules should integrate through shared services without impacting existing functionality.

---

# 18. Future Integrations

Planned integrations:

- ESB
- Payroll systems
- WhatsApp notifications
- AI Assistant
- Digital Signatures
- Business Intelligence dashboards
- Accounting software
- POS systems

Integrations should communicate through Cloud Functions or secure APIs to maintain loose coupling.

---

# 19. Deployment Pipeline

Development flow:

Developer
↓
GitHub Repository
↓
Pull Request
↓
Review
↓
Merge
↓
GitHub Actions (Future)
↓
Firebase Hosting (planned — not yet configured)
↓
Production

Environments:

- Development
- Staging
- Production

Each environment should have its own Firebase project and configuration.

---

# 20. Architecture Principles

- Modular by feature
- Serverless by default
- Secure by design
- Mobile-first
- Responsive
- Offline-aware
- API-driven
- Event-driven
- Reusable components
- Consistent user experience
- Scalable across departments and outlets

---

# 21. Long-Term Vision

NourishOS will become the single operational platform for Nourish, connecting employees, departments, and outlets through standardized workflows, centralized information, secure collaboration, and real-time operational visibility. The architecture is designed to evolve without major restructuring as the organization grows.