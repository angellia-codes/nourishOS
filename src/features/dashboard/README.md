# dashboard

Role-aware dashboard widgets and layout.

## Built

- **`DashboardPage.tsx`** — the landing page at `/`. Welcome banner (`docs/platform/dashboard.md` §6) plus
  four widgets in a responsive grid. Each widget owns its own subscription and skeleton, so a slow one never
  blocks the page (§21).
- **`widgets/DashboardWidget.tsx`** — the shared shell: title, count chip, optional "View all" link, skeleton
  rows while loading, an explicit empty state (§22), and a distinct message when a rules denial kills the
  subscription. `WidgetRow` is the row primitive; a row with no route renders unlinked rather than crashing.
- **`widgets/PendingApprovalsWidget.tsx`** (§9) — the first personal approval queue in the app
  (`approval_engine.md` §10). Two sections from two different branches of the `approvalRequests` read rule:
  *Needs your decision* and *Your submissions*.
- **`widgets/AssignedTasksWidget.tsx`** (§10) and **`widgets/AnnouncementsWidget.tsx`** (§12) — read-only
  views over the Communications module's own services and format modules.
- **`widgets/UpcomingCalendarWidget.tsx`** — closes the §26 "Company calendar" wishlist item. Reuses the
  calendar module's existing `subscribeToUpcomingEvents` unmodified (rules-scoped per viewer, same as
  `/calendar`); confirmed events only, capped to 5 client-side like every other widget.
- **`dashboardFormat.ts`** — approval status labels/tones and the `module/resourceType` → label + detail-route
  map, keyed exactly like `APPROVAL_ROUTES` in `functions/src/shared/approval/routes.ts`.

### How the approval queue is queried

The engine routes by **role**: the live step doc carries `approverRole`, and there is no assignee uid anywhere.
The equivalent on the request (`steps[currentStepIndex].approverRole`) is an array-index lookup Firestore
cannot query, so `subscribeToApprovalQueue` queries `approvalSteps` and joins each step back to its request.
That join works because every `approverRole` in `routes.ts` is on the `approvalRequests` read rule's elevated
list — **adding an approver role outside that list means updating `firestore.rules` at the same time.**

## Planned

KPI cards (§7), quick actions (§8), activity feed (§13), department widgets (§14) and the per-role variants
(§15) are unbuilt. "Upcoming birthdays and anniversaries" (§26) — the other half of that wishlist bullet — is
not built; there is no birthday/anniversary field on `Employee` to source it from. §11's notifications widget is deliberately absent: `src/components/layout/NotificationBell.tsx`
already is one. §17's `getDashboardSummary()`/`getPendingApprovals()` aggregation callables are not built —
every widget reads Firestore directly through a query that matches its own read rule.
