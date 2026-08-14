# communications

Communications domain UI: announcements, tasks, chat.

## Built

- **`pages/CommunicationsHomePage.tsx`** — the hub at `/communications`, one card per sub-module below.
- **`announcements/`** — the Announcements register (`/communications/announcements`), with `new`,
  `:announcementId` and `:announcementId/edit` beneath it. Draft → Publish → Archive, targeted by outlet +
  department + role (an empty group means "everyone"), plain-text body, attachments through the shared `files`
  collection. Broadcast (`docs/modules/communications.md` §13) is the `emergency` category rather than a
  separate collection — it carries the `announcements.broadcast` permission and publishes in one call.
  Publishing resolves the audience to `audienceUids`, which is what both `firestore.rules` and the feed query
  read; archiving clears it, which is what removes the announcement from every feed.
- **`tasks/`** — the Tasks UI (`/communications/tasks`, plus `new` and `:taskId`). Pure frontend over the
  shared Task Engine (`functions/src/shared/tasks/`) that had shipped with no surface at all, so tasks from HR,
  Operations and Incident Reports appear here too. `addTaskComment` is the one callable this added.

## Planned

Team Chat, Direct Messages, Activity Feed, Mentions, File Sharing as its own surface, and Communication
Settings — see `docs/modules/communications.md` §7-§14. Their collections (`chatChannels`, `chatMessages`,
`directMessages`, `mentions`) are declared in `src/constants/collections.ts` but have no `firestore.rules`
block, so they are denied rather than open.

The Notification Center (§9) is deliberately not a page: `src/components/layout/NotificationBell.tsx` and
`NotificationPanel.tsx` already cover the list, badge count, mark-read and mark-all-read.
