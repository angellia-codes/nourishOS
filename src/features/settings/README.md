# settings

Settings & administration UI: company profile, outlets, roles, permissions, communication settings.

## Built

- **`pages/RolePermissionsPage.tsx`** (`/settings`) — Roles & Permissions, super-admin only.
- **`pages/CommunicationSettingsPage.tsx`** (`/settings/communications`) — notification preference toggles and
  a muted-channels list, self-service (every signed-in user manages their own), one `communicationSettings/{uid}`
  doc per user via `communicationSettingsService.ts`. Moved here from `src/features/communications/` (2026-08-17)
  since it's account-level configuration rather than a Communications record. `RolePermissionsPage.tsx` links to
  it above its own super-admin gate, since this page is reachable by everyone.
