# NourishOS Design System

Version: 1.0  
Product: Nourish Operational System (NourishOS)

---

# 1. Design Philosophy

NourishOS is designed to feel like an extension of the Nourish brand.

The experience should be:

- Calm
- Premium
- Minimal
- Fast
- Warm
- Human
- Professional

Employees use the system throughout their workday, so the interface should reduce cognitive load and help users complete tasks efficiently.

---

# 2. Design Principles

## Clarity

Every page should have one clear purpose.

Users should immediately understand:

- Where they are
- What they can do
- What requires attention

---

## Consistency

Buttons, forms, tables, navigation, spacing, colors, and interactions should remain consistent across every module.

---

## Simplicity

Remove anything that does not help users complete their work.

Avoid visual clutter.

---

## Accessibility

Design should follow WCAG AA guidelines where practical:

- Keyboard navigation
- Sufficient color contrast
- Visible focus states
- Readable typography
- Clear labels

---

## Performance

UI should feel instantaneous.

Target interaction feedback:

- Hover: ≤100ms
- Click: immediate
- Navigation: ≤300ms perceived

---

# 3. Layout System

Desktop Layout

```text
+-------------------------------------------------------------+
| Header                                                      |
+-----------+-------------------------------------------------+
| Sidebar   | Page Header                                     |
|           +-------------------------------------------------+
|           |                                                 |
|           |                 Main Content                    |
|           |                                                 |
|           |                                                 |
+-----------+-------------------------------------------------+
```

---

Tablet

- Collapsible sidebar
- Responsive tables
- Simplified dashboard widgets

---

Mobile (PWA)

```text
+---------------------------+
| Header                    |
+---------------------------+
| Content                   |
|                           |
|                           |
+---------------------------+
| Bottom Navigation         |
+---------------------------+
```

---

# 4. Navigation

Primary Navigation

- Dashboard
- HR
- Operations
- Finance
- Documents
- Communication
- Settings

Sidebar behavior:

- Expandable
- Collapsible
- Icon + Label
- Active state highlighted

---

Secondary Navigation

Within modules:

Example

HR

- Employees
- Recruitment
- Contracts
- Training
- Performance
- Assets

---

Breadcrumbs

Display on all pages except Dashboard.

Example

Dashboard / HR / Employees / Employee Profile

---

# 5. Header

Contains:

- Company Logo
- Search
- Notifications
- Quick Actions
- User Profile
- Theme Switcher

Height:

72px

---

# 6. Dashboard

Dashboard includes:

- Welcome message
- KPI cards
- Pending approvals
- Recent activity
- Assigned tasks
- Announcements
- Department shortcuts
- Calendar (future)

Widgets should be configurable per role.

---

# 7. Cards

Cards are the primary content container.

Properties:

- White surface
- Rounded corners (20px)
- Soft shadow
- 24px padding
- Optional header actions

Use cards for:

- KPIs
- Reports
- Forms
- Lists
- Charts

---

# 8. Buttons

Primary

- Filled
- Forest Green
- White text

Secondary

- Outlined

Ghost

- Text only

Danger

- Muted red

Icon Button

- Circular
- 40×40px

States:

- Default
- Hover
- Active
- Focus
- Disabled
- Loading

---

# 9. Forms

All forms should include:

- Labels above inputs
- Required field indicators
- Inline validation
- Helper text
- Error messages

Input height:

48px

Textarea minimum:

120px

Submit actions remain visible on long forms.

---

# 10. Tables

Tables support:

- Search
- Filter
- Sort
- Pagination
- Column visibility
- Export (CSV/PDF)
- Bulk selection

Sticky header:

Yes

Row height:

56px

---

# 11. Detail Pages

Every record page follows:

```text
Page Header
↓

Summary Card

↓

Tabs

↓

Details

↓

Activity Timeline

↓

Attachments

↓

Approval History
```

---

# 12. Modals

Use for:

- Confirmation
- Quick edits
- Short forms

Avoid placing long workflows inside modals.

Maximum width:

640px

---

# 13. Drawers

Use side drawers for:

- Filters
- Quick previews
- Notifications
- Comments

---

# 14. Notifications

Notification types:

- Success
- Warning
- Error
- Information

Placement:

Top-right (desktop)

Top (mobile)

Notifications should auto-dismiss when appropriate while allowing manual dismissal.

---

# 15. Loading States

Use:

- Skeleton loaders
- Progress indicators
- Button loading states

Avoid full-screen spinners except during initial authentication.

---

# 16. Empty States

Every empty page should include:

- Illustration or icon
- Clear explanation
- Primary action

Example:

"No announcements yet."

[Create Announcement]

---

# 17. Error States

Error pages should:

- Explain the problem
- Suggest recovery steps
- Provide a retry action

Avoid technical jargon for end users.

---

# 18. Search Experience

Global search should support:

- Employees
- SOPs
- Documents
- Tasks
- Reports
- Work Orders

Results grouped by category with keyboard navigation.

---

# 19. Approval Workflow UI

Each approval screen displays:

- Current status
- Progress indicator
- Approval timeline
- Comments
- Attachments
- Approve
- Reject
- Return for Revision

Timeline example:

User → Manager → HR → GM → Director

---

# 20. Dashboard KPIs

Example widgets:

- Employees
- Pending Approvals
- Daily Reports
- Open Work Orders
- Outstanding Tasks
- Expenses This Month
- Active SOPs
- Recent Incidents

---

# 21. Charts

Preferred chart types:

- Bar
- Line
- Area
- Donut

Use muted colors consistent with the Nourish palette.

Avoid unnecessary 3D effects.

---

# 22. Icons

Library:

Lucide React

Guidelines:

- 20px or 24px
- Outline style
- Consistent stroke width

Avoid mixing icon libraries.

---

# 23. Motion

Animation duration:

150–250ms

Use motion for:

- Navigation transitions
- Hover states
- Dialog appearance
- Toast notifications
- Accordion expansion

Avoid distracting effects.

---

# 24. Theme Support

Provide:

- Light Mode
- Dark Mode

User preference should persist across sessions.

---

# 25. Responsive Breakpoints

| Device | Width |
|---------|------:|
| Mobile | <640px |
| Tablet | 640–1023px |
| Laptop | 1024–1279px |
| Desktop | 1280–1535px |
| Wide | ≥1536px |

---

# 26. Accessibility

Minimum touch target:

44×44px

All controls require:

- Keyboard support
- Visible focus
- Accessible labels
- ARIA attributes where needed

---

# 27. Reusable Components

Core components include:

- Button
- IconButton
- Card
- Badge
- Avatar
- Input
- Textarea
- Select
- Checkbox
- Radio
- Switch
- Date Picker
- Table
- Tabs
- Breadcrumb
- Modal
- Drawer
- Tooltip
- Snackbar
- Timeline
- Stepper
- File Upload
- Empty State
- Skeleton
- Data Chart

Each component should have documented props, variants, and accessibility behavior.

---

# 28. Design Tokens

All visual values should be centralized as design tokens:

- Colors
- Typography
- Spacing
- Border radius
- Shadows
- Breakpoints
- Z-index
- Motion durations

Tokens should be shared between Figma and the React codebase to ensure consistency.

---

# 29. Future UX Enhancements

Planned improvements:

- Drag-and-drop task boards
- Calendar scheduling
- Dashboard personalization
- Keyboard shortcuts
- Command palette
- Saved filters
- Advanced search
- AI-powered assistance

---

# 30. User Experience Goals

Every interaction in NourishOS should help users:

- Find information quickly
- Complete work with minimal effort
- Understand approval status at a glance
- Collaborate across departments
- Feel confident that data is accurate and up to date

The overall experience should communicate the same qualities as the Nourish brand: thoughtful, organized, welcoming, and dependable.