# NourishOS Component Library

Version: 1.0  
Framework: React + TypeScript + Material UI (MUI)

---

# 1. Overview

The NourishOS Component Library provides a standardized collection of reusable UI components.

Goals:

- Consistency
- Accessibility
- Reusability
- Performance
- Scalability
- Responsive Design

Every screen should be assembled from reusable components rather than custom-built UI.

---

# 2. Design Principles

Components should be:

- Simple
- Predictable
- Accessible
- Responsive
- Theme-aware
- Composable
- Fully typed

---

# 3. Component Categories

```text
Layout
Navigation
Buttons
Forms
Data Display
Feedback
Dialogs
Charts
Utilities
```

---

# 4. Folder Structure

```text
src/

components/

├── layout/
├── navigation/
├── buttons/
├── forms/
├── data-display/
├── feedback/
├── dialogs/
├── charts/
├── utilities/
└── index.ts
```

---

# 5. Layout Components

## AppLayout

Purpose

Main application shell.

Contains

- Header
- Sidebar
- Content
- Footer

---

## PageLayout

Standard page wrapper.

Props

```typescript
title
subtitle
actions
breadcrumbs
children
```

---

## Section

Reusable content section.

---

## Card

Variants

- Default
- Elevated
- Outlined
- KPI

---

## Grid

Responsive wrapper.

---

## Stack

Spacing helper.

---

# 6. Navigation Components

## Sidebar

Features

- Collapse
- Expand
- Nested menus
- Active state
- Icons

---

## Header

Contains

- Logo
- Search
- Notifications
- Theme Switcher
- User Menu

---

## Breadcrumb

Supports unlimited depth.

---

## Bottom Navigation

Mobile only.

---

## User Menu

Items

- Profile
- Settings
- Logout

---

# 7. Button Components

## PrimaryButton

Filled

Forest Green

---

## SecondaryButton

Outlined

---

## GhostButton

Text only

---

## DangerButton

Red

---

## IconButton

Round

40px

---

## Floating Action Button

Mobile shortcut.

---

Button Props

```typescript
variant

size

loading

disabled

icon

fullWidth

onClick
```

---

# 8. Form Components

## TextField

---

## PasswordField

---

## EmailField

---

## PhoneField

---

## NumberField

---

## SearchField

---

## TextArea

---

## Select

---

## MultiSelect

---

## Checkbox

---

## Radio Group

---

## Switch

---

## Date Picker

---

## Date Range Picker

---

## Time Picker

---

## File Upload

Supports

- Drag & Drop
- Multiple files
- Preview

---

## Image Upload

Includes

Preview

Cropping (Future)

---

## Rich Text Editor

For:

- SOPs
- Announcements
- Training

---

# 9. Data Display Components

## Table

Features

- Search
- Sort
- Pagination
- Filters
- Sticky Header
- Export
- Row Selection

---

## DataGrid

Large datasets.

---

## Badge

Variants

- Success
- Warning
- Error
- Neutral

---

## Avatar

Supports

- Image
- Initials

---

## Timeline

For

- Approval history
- Activity logs

---

## Statistic Card

Displays

- Number
- Icon
- Trend

---

## Progress Bar

---

## Circular Progress

---

## Status Chip

Examples

Pending

Approved

Rejected

Completed

Cancelled

---

# 10. Feedback Components

## Snackbar

---

## Toast

---

## Alert

Types

Success

Warning

Info

Error

---

## Empty State

Contains

- Illustration
- Message
- CTA

---

## Skeleton Loader

Used while loading.

---

## Error Boundary

Displays fallback UI.

---

# 11. Dialog Components

## Confirmation Dialog

Used for

Delete

Archive

Approve

Reject

---

## Form Dialog

Small forms.

---

## Preview Dialog

Documents

Images

---

## Drawer

Side panel.

---

# 12. Charts

Library

Recharts

Supported

- Line Chart
- Bar Chart
- Area Chart
- Donut Chart
- KPI Cards

---

# 13. Utility Components

## Theme Toggle

---

## Loading Overlay

---

## Page Loader

---

## Permission Guard

Checks RBAC before rendering.

Example

```tsx
<PermissionGuard permission="employees.create">
    <PrimaryButton />
</PermissionGuard>
```

---

## Outlet Selector

HQ users.

---

## Department Selector

---

## User Selector

---

## Employee Selector

---

# 14. Dashboard Components

## KPI Grid

---

## Activity Feed

---

## Announcement List

---

## Pending Approval List

---

## Recent Documents

---

## Assigned Tasks

---

## Quick Actions

---

## Calendar Widget (Future)

---

# 15. HR Components

## Employee Card

---

## Employee Table

---

## Performance Card

---

## Recruitment Pipeline

---

## Training Progress

---

## Asset Card

---

# 16. Operations Components

## Daily Report Card

---

## Checklist

---

## Incident Timeline

---

## Work Order Card

---

## SOP Viewer

---

# 17. Finance Components

## Expense Card

---

## Budget Card

---

## Petty Cash Table

---

## Approval Queue

---

# 18. Documents Components

## Document Card

---

## SOP Card

---

## File Preview

---

## Version History

---

# 19. Communication Components

## Announcement Card

---

## Task Card

---

## Chat Bubble

---

## Notification Center

---

# 20. Component Props Standards

Every component should support:

```typescript
className

sx

style

children

loading

disabled

onClick

onChange

testId
```

Where applicable, components should expose additional props while maintaining consistent naming.

---

# 21. Accessibility

Every component must:

- Support keyboard navigation.
- Include visible focus indicators.
- Use semantic HTML where possible.
- Provide ARIA labels when necessary.
- Meet WCAG AA color contrast.

---

# 22. Theme Support

All components must support:

- Light Mode
- Dark Mode

No hard-coded colors.

Use centralized design tokens.

---

# 23. Responsive Behavior

Components should adapt automatically:

Desktop

↓

Tablet

↓

Mobile

Tables should offer horizontal scrolling or alternative layouts on smaller screens.

---

# 24. Loading States

All asynchronous components should provide:

- Skeleton
- Spinner
- Disabled actions
- Optimistic updates where appropriate

---

# 25. Error Handling

Components should display:

- Friendly error messages
- Retry actions
- Validation hints

Avoid exposing technical details to end users.

---

# 26. Naming Convention

Component names:

```text
PascalCase
```

Examples

```text
PrimaryButton

EmployeeCard

ExpenseTable

ApprovalTimeline

NotificationCenter
```

Files:

```text
PrimaryButton.tsx

EmployeeCard.tsx
```

Hooks:

```text
useAuth

useEmployees

useTasks
```

---

# 27. Storybook

Each component should include:

- Documentation
- Interactive examples
- Prop descriptions
- Accessibility checks
- Theme previews

Storybook should be the primary environment for UI development and review.

---

# 28. Testing

Each reusable component should have tests covering:

- Rendering
- User interactions
- Accessibility
- Loading states
- Error states
- Theme compatibility

Use:

- Vitest
- React Testing Library

---

# 29. Future Components

Planned additions:

- Kanban Board
- Calendar Scheduler
- Command Palette
- AI Assistant Panel
- Digital Signature Pad
- QR Scanner
- Barcode Scanner
- Rich Dashboard Builder
- Workflow Designer

These components should follow the same design principles, theming, and accessibility standards.

---

# 30. Component Development Rules

- Build reusable components before page-specific implementations.
- Keep components focused on a single responsibility.
- Prefer composition over inheritance.
- Avoid duplicating UI patterns.
- Document every public component.
- Version breaking changes.
- Review components for accessibility before release.
- Keep the component library synchronized with the design system and Storybook.

The Component Library is the foundation of the NourishOS user interface. All modules should consume these shared components to maintain a cohesive, maintainable, and scalable application.