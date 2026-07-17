# NourishOS — Exit Interview (Digitized F009)

Version: 1.0 — fills in the "Exit Interview" task from the Clearance
Checklist spec (v1.0/v2.1), which so far only said "notes/attachment stored
on that task." This is the actual structured form behind it.

Source: `F009 - Employee Exit Interview Form (11).docx` (uploaded) — bilingual
Indonesian/English survey, ~32 rated items across three blocks plus several
categorical questions.

---

## 1. What This Changes From the Existing Specs

1. The Exit Interview task can't just carry freeform notes — F009 is a real structured survey (recruitment channel, join/exit reasons, three 1–4 rating blocks). Needs its own record type, `exitInterviews`, linked from `offboardingChecklists`.
2. **F009's Section A (how the employee first heard about Nourish) is a more detailed, more authoritative taxonomy than the `recruitmentSource` field I proposed in the F01 spec.** That field should be updated to match this form's options rather than the six-value guess from before — see §4.
3. **Confidentiality is a real requirement here, not a nice-to-have.** F009's own instructions state responses are confidential to authorized HR only — and Section I asks the employee to rate their own manager. If that manager (or even the Department Leader role generally) can read this record, the entire point of the exercise is defeated. This needs a harder access wall than the rest of the offboarding checklist gets.

---

## 2. Flag — "Divisi" and "Departemen" Are Two Separate Header Fields

F009's header asks for both *Divisi/Division* and *Departemen/Department* as distinct fields. Nothing in the schema built so far has a `divisionId` — only `departmentId` exists on `Employee`. Two possibilities: either Division is a real organizational layer above Department that hasn't been modeled yet (e.g. "F&B Operations" containing Kitchen/Bar/Floor), or the paper template just uses two words for the same concept out of habit. **Flagging rather than guessing** — worth a direct answer before deciding whether this needs a new field or just maps `departmentId` to both boxes on the rendered form.

---

## 3. Firestore Schema

```typescript
// exitInterviews/{interviewId}
interface ExitInterview extends BaseDocument {
  employeeId: string
  offboardingChecklistId: string     // FK back to offboardingChecklists
  interviewerId: string               // uid, HR staff who conducted it
  interviewDate: Timestamp
  surveyVersion: string               // 'F009-v1' — lets the question set change later without a schema migration

  // Section A — how they first heard about Nourish. Uses the canonical superset
  // from employment-application-form.md §2 (adds socialMedia/broadcast to F009's list).
  recruitmentSource: 'jobPortal' | 'referral' | 'socialMedia' | 'broadcast'
                    | 'newspaperAd' | 'appliedDirectly' | 'otherAdvertisement'
                    | 'employmentAgency' | 'other'
  recruitmentSourceOther?: string

  // Section B — most important reason they joined
  joinReason: 'establishedCompany' | 'companyReputation' | 'friendReferral'
            | 'careerOpportunity' | 'salaryIncrease' | 'trainingProgram' | 'other'
  joinReasonOther?: string

  // Section C — main reason for leaving
  exitReason: 'personal' | 'continuingStudy' | 'health' | 'relocation' | 'transportationTooFar'
            | 'resignedWithoutNotice' | 'anotherJobSameIndustry' | 'anotherJobDifferentIndustry'
            | 'notReturningFromLeave' | 'pension' | 'contractExpiration' | 'other'
  exitReasonOther?: string

  // Section D
  resignationCategory: 'voluntary' | 'involuntary'

  // Sections E/F
  expectationsWereClear: boolean
  expectationsExplanation?: string    // required if false
  trainingMetExpectations: boolean
  trainingExplanation?: string        // required if false

  // Section G
  intendedTenure: '0-3m' | '4-6m' | '6-9m' | '12m' | '2y' | '>2y'

  // Sections H (company, 12 items), I (manager, 14 items), J (culture, 6 items)
  // — one flat array rather than three fixed field sets, so question wording
  // can change per surveyVersion without a schema change. Same "embed a
  // structured array" pattern already used for Requisition/Expense items.
  ratings: {
    section: 'company' | 'manager' | 'culture'
    itemKey: string        // stable key, e.g. 'seniorManagement', 'careAboutYou'
    itemLabel: string      // display label at time of submission, bilingual
    score: 1 | 2 | 3 | 4   // 1 = Sangat Buruk/Very Bad ... 4 = Sangat Baik/Very Good
  }[]

  // Section K
  wouldReturnToWork: boolean
  wouldReturnExplanation?: string     // required if false

  employeeAcknowledged: boolean
  employeeAcknowledgedAt?: Timestamp
  interviewerAcknowledged: boolean
  interviewerAcknowledgedAt?: Timestamp

  // BaseDocument: id, createdAt, updatedAt, createdBy, updatedBy,
  // outletId, departmentId, isArchived
}
```

```typescript
// offboardingChecklists/{employeeId} — one field addition
interface OffboardingChecklist {
  // ...existing fields from the Clearance Checklist spec
  exitInterviewId?: string   // set once the interview is submitted
}
```

```typescript
// candidates / recruitments — recruitmentSource uses the canonical superset from
// employment-application-form.md §2 (that spec supersedes both this doc's earlier
// F009-only list and the F01 spec's 5-value guess)
recruitmentSource?: 'jobPortal' | 'referral' | 'socialMedia' | 'broadcast'
                   | 'newspaperAd' | 'appliedDirectly' | 'otherAdvertisement'
                   | 'employmentAgency' | 'other'
```

Note on `employees.resignationReason` (already exists, plain free-text, set by `archiveEmployee`): this doesn't get replaced by `exitInterview.exitReason`. They're deliberately kept separate — the resignation-letter reason is whatever the employee wrote at notice time, often brief or diplomatic; the exit interview's structured `exitReason` is what actually gets asked in a private conversation later and may be more candid. Collapsing them into one field would lose that distinction, and it's exactly the distinction the whole exercise exists to capture.

---

## 4. Confidentiality — Harder Wall Than the Rest of the Offboarding Checklist

The offboarding checklist itself (Asset Return, Settlement, etc.) is visible to Department Leaders per the Clearance Checklist's RBAC table — they need to know clearance status. **The exit interview record is not part of that visibility.** Section I directly asks the employee to rate their manager; if that manager, or even other Department Leaders generally, can read it, nobody will answer honestly and the form's own stated confidentiality promise is broken.

| Role | View `exitInterviews` (individual records) | View aggregate reports (§6) |
| --- | --- | --- |
| HR Manager | ✅ | ✅ |
| Super Admin | ✅ | ✅ |
| Department Leader / Outlet Manager | ❌ | — |
| General Manager | ❌ | ✅ (aggregate only, with the minimum-N safeguard in §6) |

New permission: `exitInterviews.view`, granted only to HR Manager and Super Admin — same pattern as the `incidents.view_sensitive` / compensation-subcollection restrictions already established elsewhere in this project, not a new idea, just applied here.

---

## 5. Cloud Functions

| Function | Purpose | RBAC check |
| --- | --- | --- |
| `submitExitInterview` | Creates the `exitInterviews` record, sets `employees.offboardingChecklists.exitInterviewId`, marks the "Exit Interview" Task Engine task (`custom`, `offboarding-interview`) as completed, records both acknowledgments | `exitInterviews.view` (HR Manager/Super Admin only — same permission gates both read and the ability to conduct/submit one) |

No separate `updateExitInterview` — once submitted and acknowledged by both parties, treat it as immutable (matches the physical form's signed-and-done nature); corrections go through a documented amendment note rather than silent edits, consistent with the audit-immutability principle used elsewhere.

---

## 6. Reporting — Aggregate Only, With a Minimum-N Safeguard

Exit interview data is genuinely useful for turnover analysis (`hr.md` §16 already lists "Employee Turnover" as a standard report) — voluntary vs. involuntary rate, top exit reasons, satisfaction trends. The manager-rating block (Section I) is the part that needs care: reporting a single departing employee's raw manager scores back to leadership, even in aggregate, can effectively de-anonymize the respondent when only one person has left that manager's team recently.

**Recommendation:** manager-level rating aggregates only surface in reports once at least 3 exit interviews exist for employees who reported to that manager. Below that threshold, the underlying scores still exist and count toward company-wide averages, they just don't get broken out by manager. This isn't in F009 itself — it's a safeguard worth building in given what the form is asking people to disclose, not something to skip because the source document didn't specify it.

| Report/Widget | Source | Access |
| --- | --- | --- |
| Turnover reason breakdown | `exitInterviews.exitReason`, aggregated | HR Manager, GM |
| Voluntary/Involuntary rate | `exitInterviews.resignationCategory`, aggregated | HR Manager, GM |
| Company satisfaction trend (Section H average, over time) | `exitInterviews.ratings` where `section == 'company'` | HR Manager, GM |
| Manager rating aggregate (Section I average, per manager) | `exitInterviews.ratings` where `section == 'manager'`, grouped by the exiting employee's former manager, **gated at N ≥ 3** | HR Manager only |
| Recruitment source effectiveness | `exitInterviews.recruitmentSource`, cross-referenced with tenure/`intendedTenure` | HR Manager |

---

## 7. Acceptance Criteria

1. Submitting an exit interview requires both `employeeAcknowledged` and `interviewerAcknowledged` before it's considered complete
2. `exitInterviews` records are unreadable by any role without `exitInterviews.view` — verified specifically against a Department Leader account whose former report's interview is being tested (Security Rules test, not just UI hiding)
3. Manager-rating aggregates never render in any report/dashboard for a manager with fewer than 3 linked exit interviews
4. `recruitmentSource` options match F009's Section A exactly, and the earlier F01-spec'd field is updated to the same enum rather than left with the narrower five-value version
5. Submitting the interview automatically completes the linked Task Engine "Exit Interview" task — no separate manual completion step
6. `employees.resignationReason` (free text, set at notice) and `exitInterview.exitReason` (structured, set at interview) remain independently stored — neither overwrites the other
7. Every submission produces an audit log entry, and the record is immutable after both acknowledgments are recorded
