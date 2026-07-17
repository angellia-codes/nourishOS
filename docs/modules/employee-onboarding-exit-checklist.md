# NourishOS — Employee Onboarding & Exit Checklist (Digitized F01)

Version: 2.1 — resolves the flags raised in v2.0 per Angel's confirmation:
Employment Status is FT/DW (not a broader "Staff = everything else"), Unit
Business = Outlet, BPJS Pensiun and BPJS-TK are the same program (not two
separate cards), SKCK is removed from the checklist, and Professional
Certification / NPWP / Medical Check-up are all optional rather than
mandatory-or-follow-up. Supersedes the document-collection portions of the
standalone Onboarding Checklist (v1.0) and Clearance Checklist (v1.0)
produced earlier in this project; the Task Engine/summary-doc architecture
from those specs is unchanged and referenced throughout, not rebuilt.

Source: `F01 - Employee In/Out Data Check List.xlsx` (uploaded) — Nourish
Group's actual paper form, two sheets: **IN** (30 printed, 28 active — item
9 merged into item 8, item 16 removed, both per Angel's confirmation) and
**OUT** (9 items).

---

## 1. What This Reconciles

The uploaded form is the real, in-use HR checklist — more specific than what either earlier spec assumed. Three things change as a result:

1. **Onboarding's "Document Submission" task** (a single generic item in v1.0) is now the full 30-item IN list, tiered and categorized (§4).
2. **Exit's "Document Handover" task** grows from a generic placeholder into the form's actual OUT items, and the "Handover List" task turns out to be **conditional** — backoffice/supervisor-and-above only, not every exiting employee (§5). This is a genuine correction to v1.0, which applied it unconditionally.
3. Two exit items have no home in the v1.0 Clearance Checklist at all — **Certificate/Reference Letter** and **BPJS-TK Closure Letter** — both HR-issued outputs, not employee-submitted inputs. Added as their own tasks (§5).

Everything else from the two v1.0 specs stands: Task Engine-based generation, thin summary docs (`onboardingChecklists`/`offboardingChecklists`) that derive status rather than own it, the `employees.userId` link, and the `lastWorkingDate` vs. resignation-recorded-date distinction.

---

## 2. Architecture Decision — Embedded Document Checklist, Not 30 Separate Tasks

Thirty Task Engine tasks per new hire would be unusable noise. Same reasoning already applied to Expense Request line items and Requisition attachments: **one task, structured array**. The IN list becomes a single `documentReview` task (`tag: 'onboarding-docs'`) whose completion is derived from an embedded `documentChecklist` array on the `onboardingChecklists` doc — not from a manual "mark task complete" click. Same treatment for the OUT list's document-handover items on `offboardingChecklists`.

Each array item carries the form's own two-tier requirement system, translated directly rather than reinterpreted:

| Source Marker | Meaning (as printed on the form) | System Behavior |
| --- | --- | --- |
| `*` | *Wajib dilengkapi* — mandatory | Blocks the parent task from completing until `Yes` + file attached |
| `**` | *Wajib dilengkapi atau boleh menyusul* — mandatory, but may follow up later | Flagged as outstanding, does **not** block task completion; surfaces on a "Pending Follow-up Documents" widget instead |
| `optional` | Not on the original form's tier system — added per Angel's confirmation for items 5, 11, 15 | Never blocks, never nudges. Distinct from `**`: an optional item that's never provided just stays `pending` quietly, it doesn't appear on the outstanding-documents widget the way a `followUp` item does |
| (none) | Process step, not a document | Checkbox only, no file requirement |

The form's footnote — *"Berkas/dokumen asli akan langsung dikembalikan setelah di FC oleh HRD"* (originals returned immediately after HR photocopies them) — doesn't digitize as a system rule; it just confirms what gets uploaded is a **scan/photo of the original**, not the physical document itself. Worth keeping in the UI copy so staff understand they're uploading a copy, not surrendering the original.

---

## 3. Header Fields — Mapping to Existing Schema

| Form Field (IN) | Maps To | Note |
| --- | --- | --- |
| Employee Name | `employees.fullName` | Existing |
| Department | `employees.departmentId` | Existing |
| Position | `employees.positionId` | Existing |
| Joined Date | `employees.joinDate` | Existing |
| Employee ID No. | `employees.employeeNumber` | Existing (server-generated) |
| Employee Status: Staff / DW | `employees.employmentType` | **Confirmed:** "Staff" on this form specifically means `ft` (Full-Time) — not a catch-all for every other `EmploymentType` value. This checklist's Employee Status field is a two-option selector, `ft`/`dw` only, scoped to this form. The broader `EmploymentType` enum (which also has `fl`, `ojt`, `fixedTerm`) is untouched elsewhere in the system — F01 simply doesn't cover those hire types. If freelance/OJT/fixed-term hires also need an onboarding document checklist, that's a gap outside this form's scope, worth a separate conversation rather than stretching F01's two options to cover it |
| Units Business | `employees.outletId` | **Confirmed** — maps directly to the existing outlet concept, no new field needed |

| Form Field (OUT) | Maps To | Note |
| --- | --- | --- |
| Employee Name, Department, Position | Same as above | — |
| Last Working Date | `employees.lastWorkingDate` | Matches the field added in the v1.0 Clearance spec exactly — good independent confirmation that field was the right addition |
| Units Business | `employees.outletId` | **Confirmed**, same as IN |

---

## 4. IN — Onboarding Document Checklist (30 printed, 28 active)

"NourishOS Treatment" tells you whether onboarding collects this fresh, or just verifies something another module already produced — several of these are recruitment artifacts that already exist by the time someone reaches onboarding, and re-collecting them would duplicate data that's already in `candidates`/`recruitments`.

| # | Item (as printed) | Tier | NourishOS Treatment |
| --- | --- | --- | --- |
| 1 | Application Letter / Surat Lamaran Kerja | — | **Verify** — already on the `candidates` record (Candidate Profile, `hr.md` §7) |
| 2 | Curriculum Vitae / Daftar Riwayat Hidup | — | **Verify** — `candidates.resumeFileId` |
| 3 | Copy of Ijazah & transcript | `*` | **Verify/Collect** — candidate document if captured at application; collect if not |
| 4 | Copy of Working Reference (if previously employed) | `*` | **Verify/Collect** — same |
| 5 | Copy of Professional Certification | `optional` | **Verify/Collect** — **confirmed optional**, downgraded from follow-up; no blocking, no outstanding-document nudge |
| 6 | Photo 4×6, red background | `*` | **Collect** — feeds `employees.photoFileId` (also satisfies item 25) |
| 7 | Copy of KTP (valid) | `*` | **Collect** — supports `employees.nik` |
| 8 | Copy of BPJS Ketenagakerjaan card | `**` | **Collect** — supports `employees.bpjsTk`. **Confirmed:** BPJS Pensiun (item 9) is the same program/number as BPJS-TK, not a separate card — item 9 is merged into this one, not tracked independently |
| 9 | ~~Copy of BPJS Pensiun card~~ | — | **Merged into item 8** — confirmed same as BPJS-TK; not a separate checklist entry, `documentChecklist` array has no independent row for this |
| 10 | Copy of BPJS Kesehatan card | `**` | **Collect** — supports `employees.bpjsKesehatan` |
| 11 | Copy of NPWP | `optional` | **Collect** — supports `employees.npwp`. **Confirmed optional**, downgraded from mandatory — this is a deliberate deviation from the paper form's `*` marking, per Angel's instruction, not an oversight |
| 12 | Copy of Kartu Keluarga (Family Card) | `*` | **Collect** — attachment only, no dedicated `Employee` field exists or is proposed |
| 13 | Copy of SIM A/B/C (driving license) | `**` | **Collect** — attachment only |
| 14 | Copy of BCA bank account book | `**` | **Collect** — supports `employees.bankAccountName`/`bankAccountNumber` (on the compensation sub-document, per the field-security split already in place) |
| 15 | Original — Medical check-up report | `optional` | **Collect — confirmed optional.** Downgraded from mandatory-with-follow-up; the F&B-department conditional gating from v2.0 is dropped since an optional item doesn't need a blocking condition — kept visible to all new hires, just never required |
| 16 | ~~Original — SKCK~~ | — | **Removed — confirmed.** No longer part of the checklist; drop from `documentChecklist` generation entirely |
| 17 | Psychological Test Result | `*` | **Verify/Collect** — candidate assessment artifact if captured during recruitment |
| 18 | Personnel Requisition Form | `*` | **Verify** — this *is* the approved Employee Requisition record already spec'd; link, don't re-collect |
| 19 | Application Form | `*` | **Verify** — candidate intake form |
| 20 | Interview Assessment Form | `*` | **Verify** — candidate stage artifact |
| 21 | Approval to Hire | `*` | **Verify** — the Requisition's completed Approval Engine record |
| 22 | Employment Agreement / Kontrak Kerja | `*` | **Collect** — output of the Employment Contracts feature (`hr.md` §9, `contracts` collection) — not built yet in what's been spec'd so far in this project, flagging as a dependency |
| 23 | Employee Data Form | `*` | **Verify** — this is the `employees` record itself, created via `createEmployee` |
| 24 | Staff Inventory Movement Form | `*` | **Verify** — this is the onboarding Asset Assignment task from v1.0, already covered |
| 25 | Employee Photo Taking | — | **Verify** — same photo as item 6 |
| 26 | New Hire Announcement (Notice Board, WhatsApp, Email) | — | **Partial** — WhatsApp/Email via Notification Engine broadcast; Notice Board is physical signage, not digitized |
| 27 | Formulir Penilaian Kerja (Performance appraisal form) | — | **Not onboarding-gating** — output of the Appraisal module, filed to the employee's document record whenever the first review happens, not required to close onboarding (tier corrected from `*`: the mandatory marker contradicted this prose, and the demo follows the prose) |
| 28 | Surat Peringatan (if any) | — | **Not onboarding-gating** — Disciplinary Actions module output, conditional, filed as it occurs |
| 29 | SK Mutasi (if any) | — | **Not onboarding-gating** — transfer decree; no dedicated Transfer module exists yet in what's been built — flagging as a gap, not silently mapping it somewhere it doesn't fit |
| 30 | Source of Recruitment | — | **New field needed** — doesn't currently exist on `candidates` or `recruitments` in the Requisition spec; use the canonical superset from employment-application-form.md §2 (`jobPortal \| referral \| socialMedia \| broadcast \| newspaperAd \| appliedDirectly \| otherAdvertisement \| employmentAgency \| other`) |

**Onboarding document task completion rule:** every `mandatory` (`*`) item must be `received` + file attached (or, for "Verify" items, linked to its source record) before the `documentReview` task can close. `followUp` (`**`) items remain visible as outstanding but don't block. `optional` items (5, 11, 15) never block and never generate an outstanding-documents nudge either way.

---

## 5. OUT — Exit Document Checklist (9 items)

| # | Item (as printed) | NourishOS Treatment |
| --- | --- | --- |
| 1 | Resignation Letter | **Collect** — attached at `initiateEmployeeClearance`, folded into the exit `documentReview` task |
| 2 | Employee Clearance Statement Form | **Generate** — rather than collecting this as a separate document, recommend generating it: a PDF summary of the completed `offboardingChecklists` record (assets returned, docs handed over, settlement done, interview held), auto-produced once `status == 'completed'`. Flagging this as a system-generated artifact instead of a manually filled form — same value, less duplicate data entry |
| 3 | Exit Interview Record Form | **Collect** — output of the existing "Exit Interview" task (`custom`, `offboarding-interview`), notes/attachment stored on that task |
| 4 | Certificate / Reference Letter | **New task** — not in the v1.0 Clearance spec's five items. HR-issued output, so it's a distinct task (`custom`, `offboarding-reference`), assigned to HR Manager, not folded into document handover since the direction of paperwork is reversed (HR produces it, doesn't collect it) |
| 5 | Surat Pengantar Penutupan BPJS-TK (BPJS-TK closure letter) | **New task** — also missing from v1.0. Indonesia-specific statutory step: HR issues the closure cover letter for the employee's BPJS-TK account. `custom`, `offboarding-bpjs`, assigned to HR Admin |
| 6 | Employee Out Photo Taking | **Optional** — low-priority process step; not worth a dedicated task, can be a checkbox on the document-handover checklist |
| 7 | Resignation Announcement (Notice Board, Email, WhatsApp) | **Partial** — same treatment as onboarding's item 26: WA/Email via Notification Engine, Notice Board stays physical |
| 8 | Handover List (backoffice staff and supervisor level and above) | **Conditional — correction to v1.0.** The earlier Clearance spec generated a "Task/Work Reassignment Review" item for every exiting employee. The form is explicit this only applies to backoffice staff and supervisor+ roles. Recommend gating task generation on role: skip for general floor/service staff, generate for `outletManager` and above, and backoffice roles (Finance, Purchasing, HR, etc.) |
| 9 | Surat Pernyataan Bermaterai (stamped statutory declaration) | **Collect, physical-only** — a `materai` stamp duty document is a physical/legal artifact by nature; the system holds a scanned copy after physical signing, same "scan after the fact" pattern as the IN form's photocopy-then-return note |

**Reconciled exit checklist** (replacing v1.0's five-item list):

| Task | Type | Assignee | Condition |
| --- | --- | --- | --- |
| Asset Return | `assetAssignment` | Outlet Manager | Always |
| Document Handover (resignation letter, bermaterai statement, out photo) | `documentReview` (`offboarding-docs`) | HR Admin | Always |
| Task/Work Reassignment Review | `custom` (`offboarding-reassignment`) | Department Leader | **Only** backoffice + supervisor-and-above (per item 8) |
| Final Settlement Calculation | `custom` (`offboarding-settlement`) | Finance | Always |
| Exit Interview | `custom` (`offboarding-interview`) | HR Manager | Always |
| Issue Certificate/Reference Letter | `custom` (`offboarding-reference`) | HR Manager | Always |
| BPJS-TK Closure Letter | `custom` (`offboarding-bpjs`) | HR Admin | Always |

Clearance Statement (item 2) isn't a task — it's generated once everything above is `completed`.

---

## 6. Schema Additions

```typescript
// Shared shape for both onboardingChecklists.documentChecklist and
// offboardingChecklists.documentChecklist
interface DocumentChecklistItem {
  itemNumber: number              // matches the form's numbering, for traceability
  label: string                   // e.g. "Copy of KTP (valid)"
  tier: 'mandatory' | 'followUp' | 'optional' | 'process'   // *, **, optional (§confirmed), or unmarked
  treatment: 'collect' | 'verify' | 'generate' | 'notDigitized'
  linkedRecordType?: 'candidate' | 'requisition' | 'contract' | 'employee'
  linkedRecordId?: string          // set when treatment == 'verify'
  status: 'pending' | 'received' | 'notApplicable'
  receivedDate?: Timestamp
  fileId?: string                  // File Storage, when treatment == 'collect'
  conditionalOn?: string           // e.g. "departmentId in F&B" — human-readable, evaluated at generation time
}
```

```typescript
// onboardingChecklists/{employeeId} — extends the v1.0 shape
interface OnboardingChecklist extends BaseDocument {
  // ...v1.0 fields unchanged (employeeId, startDate, taskIds, status, completedAt)
  documentChecklist: DocumentChecklistItem[]   // the 30 IN items, tiered per §4
}
```

```typescript
// offboardingChecklists/{employeeId} — extends the v1.0 shape
interface OffboardingChecklist extends BaseDocument {
  // ...v1.0 fields unchanged, plus the two new task references
  documentChecklist: DocumentChecklistItem[]   // OUT items 1, 6, 9
  referenceLetterTaskId?: string
  bpjsClosureTaskId?: string
  clearanceStatementFileId?: string             // set once auto-generated, §5 item 2
}
```

```typescript
// candidates/{candidateId} or recruitments/{requisitionId} — one field addition
recruitmentSource?: 'jobPortal' | 'referral' | 'socialMedia' | 'broadcast' | 'newspaperAd'
                  | 'appliedDirectly' | 'otherAdvertisement' | 'employmentAgency' | 'other'  // item 30 — employment-application-form.md §2
```

---

## 7. Cloud Functions Delta (on top of v1.0's `initiateEmployeeClearance`/`onboardEmployee`)

| Function | Purpose |
| --- | --- |
| `updateDocumentChecklistItem` | Marks one item `received`/`notApplicable`, attaches file or links a source record; recomputes the parent `documentReview` task's completion from all `mandatory`-tier items |
| `generateClearanceStatement` | Triggered when `offboardingChecklists.status` reaches `completed` — renders a PDF summary, stores via File Storage, sets `clearanceStatementFileId` |

`initiateEmployeeClearance` (v1.0) needs one change: generate task list conditionally per the role gate in §5 item 8, and add the two new tasks (reference letter, BPJS closure).
`onboardEmployee` (v1.0) needs one change: populate `documentChecklist` from the §4 table at generation time — 28 active rows (item 9 merged, item 16 removed), tiers set per §2's legend including the new `optional` value.

---

## 8. Acceptance Criteria

1. Onboarding's document task cannot close while any `mandatory`-tier item is `pending` — `followUp`-tier items don't block
2. Items 1–5, 17–21 (candidate/recruitment artifacts) default to `verify` treatment and link to the existing source record where one exists, rather than prompting for a re-upload
3. Medical check-up (item 11 NPWP, item 15 Medical check-up, item 5 Professional Certification) never block document-task completion for any new hire, regardless of department — confirmed `optional`-tier items don't appear on the outstanding-documents widget
4. Handover List task is generated only for backoffice or supervisor-and-above exits — confirmed by testing a floor-staff exit (task absent) against a Department Leader exit (task present)
5. Clearance Statement PDF generates automatically on checklist completion — no manual document upload required for that item
6. `recruitmentSource` is captured at requisition/candidate creation, not left as a dangling unmapped field
7. Every document checklist item change (received, linked, attached) produces an audit log entry
