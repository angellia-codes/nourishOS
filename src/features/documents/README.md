# documents

Documents domain UI: SOP library, job descriptions, templates, training materials, key performance indicator

## Built

- **`pages/DocumentsHomePage.tsx`** — the hub at `/documents`, one card per sub-module below.
- **`jobDescriptions/`** — the Job Descriptions register (`/documents/job-descriptions`). Rows of
  Department → Role → PDF link, curated by hand by the super admin. Read access is an editable allowlist of
  roles stored in `systemSettings/jobDescriptionAccess` and enforced by `firestore.rules`; add/edit/delete is
  super admin only. The PDF is an external link, not a Storage upload.
- **`sopLibrary/`** — the SOP Library (`/documents/sop-library`), same shape against its own
  `sops` collection and its own `systemSettings/sopAccess` allowlist. Rows of Department → SOP Number →
  Topic → Google Drive link. `docs/modules/documents.md` §6 also lists version history, an approval workflow,
  tags and search — none of that ships; this is the browse-by-department register only.

## Planned

Templates, training materials, KPI — still unbuilt. `docs/modules/documents.md` is the spec for those; note it
has no Job Descriptions section, which is why that sub-module documents its own deviations.
