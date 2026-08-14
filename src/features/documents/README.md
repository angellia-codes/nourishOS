# documents

Documents domain UI: SOP library, job descriptions, templates, training materials, key performance indicator

## Built

- **`jobDescriptions/`** — the Job Descriptions register (`/documents`). Rows of Department → Role → PDF link,
  curated by hand by the super admin. Read access is an editable allowlist of roles stored in
  `systemSettings/jobDescriptionAccess` and enforced by `firestore.rules`; add/edit/delete is super admin only.
  The PDF is an external link, not a Storage upload.

## Planned

SOP library, templates, training materials, KPI — still unbuilt. `docs/modules/documents.md` is the spec for
those; note it has no Job Descriptions section, which is why that sub-module documents its own deviations.
