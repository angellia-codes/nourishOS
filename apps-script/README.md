# NourishOS Apps Script backend (Firebase replacement, in progress)

Phase 1 of the migration plan (`~/.claude/plans/spicy-singing-kurzweil.md`). This
directory is a `clasp` project — Google Sheets/Drive/Apps Script access
requires *your* Google OAuth, so the deploy step can't be automated here.

## One-time setup (you run this)

```powershell
cd apps-script
npm install
npm run login     # opens a browser, authorizes clasp against your Google account
npm run create     # creates the Apps Script project, writes .clasp.json
npm run push       # uploads src/ to the Apps Script project
npm run open       # opens the project in the Apps Script editor
```

In the editor: select `setupSpreadsheetAndDrive` in the function dropdown, click
Run, authorize the requested Sheets/Drive scopes. Check the execution log for
the spreadsheet + Drive folder URLs it created.

Then in **Project Settings → Script Properties**, confirm `SPREADSHEET_ID`,
`DRIVE_ROOT_FOLDER_ID`, and `SESSION_SECRET` were set by the setup run, and add
`ANTHROPIC_API_KEY` yourself (same key currently in the Firebase Functions
secret).

Open the generated spreadsheet's `roles` tab and add one row per role in
`src/constants/roles.ts` (`superAdmin`, `hrManager`, ...) with
`json = {"permissions":["employees.create", ...]}` — this data lived only in
live Firestore `roles/{roleId}` docs, not in the repo, so it has to be
re-entered by hand from whatever's currently deployed.

Deploy as a Web App (**Deploy → New deployment → Web app**, execute as you,
access anyone) and copy the `/exec` URL into `VITE_APPS_SCRIPT_URL` — the
frontend transport swap has landed (`src/services/appsScript/client.ts`),
so the app calls this Web App directly once the URL is set.

## What's here so far

Single-file layout — `Code.gs` is the conventional Apps Script entry-point
name, and everything lives there in dependency order (schema -> setup ->
store -> errors -> audit -> auth -> files -> api), sectioned with `====`
banner comments:

- **Schema** — the 18 collections ported 1:1 from `functions/src/lib/collections.ts`, one sheet tab each, row shape `id | createdAt | updatedAt | json`.
- **Setup** — `setupSpreadsheetAndDrive`, one-time spreadsheet/Drive provisioning.
- **Store** — generic CRUD (`listRows_`, `getDoc_`, `createDoc_`, `updateDoc_`) plus `withLockedDoc_`, the `LockService`-based stand-in for Firestore's `runTransaction` (used by the approval engine port in a later phase).
- **Errors** / **Audit** — direct ports of `functions/src/lib/errors.ts` / `audit.ts`.
- **Auth** — Google access-token verification (Google Identity Services, not Firebase Auth) + our own signed session token.
- **Files** — direct port of `functions/src/shared/fileStorage/*` onto Google Drive: `files.upload` decodes a base64 payload into a Drive file (mirrors the `/{module}/{resourceType}/{resourceId}/` folder convention), `files.delete` soft-deletes.
- **Api** — the `doGet`/`doPost` router. Every action is `{name: {handler, public?, authLevel?}}` registered via `registerActions_`; `auth.loginWithGoogle`, `auth.me`, coarse `collection.list`/`collection.get`, and `files.upload`/`files.delete` exist today. Per-module business-logic actions (createEmployee, submitApproval, ...) get added module-by-module in a later phase, replacing the coarse generic reads with the real permission/scoping checks `firestore.rules` used to enforce.

## Not done yet

The ~40 business-logic Cloud Functions haven't been ported to actions yet
(only the generic reads + files + auth exist), and cron triggers aren't set
up. Firebase itself is fully removed from the frontend and repo already —
this project is the only backend now.

`collection.list`/`collection.get` currently return the full unfiltered
collection to any active user — no department/role scoping yet (the old
`firestore.rules` conditions haven't been ported). Treat this as an open
security gap until per-module actions land.
