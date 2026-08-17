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
  Operations and Incident Reports appear here too. `addTaskComment` is the one callable this added, and it now
  takes an optional `mentionedUids` alongside `body`.
- **`chat/`** — Team Chat, text-only. `new` and `:channelId` are real pages; there's no channel list page —
  `src/components/layout/ChatBell.tsx`/`ChatPanel.tsx` in the header is the channel picker (same toggle shape
  as `NotificationBell`), since a header dropdown can create a channel or open one but can't host actual
  messaging. Channels are scoped company-wide / one department / one outlet, with membership implicit from the
  caller's own claims rather than a members array. `components/MentionAutocomplete.tsx` is shared with the
  Task comment composer.
- **`activity/activityService.ts`** — reads the new `activityFeed` collection (not `auditLogs`), fed by
  `recordActivityInternal` calls sprinkled across other modules. **No page** — a dedicated
  `/communications/activity` page was built and removed by request; the only consumer is the dashboard's
  `TeamActivityWidget`, presented as a non-clickable `Timeline` the same way `EmployeeProfilePage.tsx` embeds
  its audit-log history rather than linking out to a browsable log.

Two things that were built here and then relocated by request (2026-08-17): **Communication Settings** moved
to the Settings module (`/settings/communications`, `src/features/settings/`) since it's account-level
configuration, not a Communications record. A dedicated **Notification Center** page was built and removed —
`src/components/layout/NotificationBell.tsx`/`NotificationPanel.tsx` remain the only notifications surface,
per the module's original convention. `type === 'mention'` notifications (from chat/task @mentions) show up
there like any other notification, deep-linked via each notification's `actionUrl` straight to the source
message/comment.

## Planned

Direct Messages and File Sharing as its own surface — see `docs/modules/communications.md` §8/§12. Their
collections (`directMessages`) are declared in `src/constants/collections.ts` but have no `firestore.rules`
block, so they stay denied rather than open. Chat attachments, emoji reactions, message search, and
@Department/@Role mentions are deferred fast-follow work, same as Announcements deferred its rich-text editor.
