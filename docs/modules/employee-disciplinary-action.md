# NourishOS — Employee Communication Form (Disciplinary Action)

Version: 1.0
Module: HR → Disciplinary Actions
Collection: `disciplinaryActions` (new — `hr.md` §14 named the module but never specified real fields)

Source: `Employee Communication Form.docx` (uploaded) — the actual disciplinary
notice Nourish uses. It arrived pre-filled with a real employee's attendance
record; this spec generalizes the structure and doesn't reproduce that
individual's details, since there's no reason a schema document needs to
carry someone's actual write-up.

---

## 1. This Is the Real Structure Behind an Already-Named Module

`hr.md` §14 lists Disciplinary Actions as a feature ("Verbal Warning, Written Warning, Suspension, Investigation Notes, Resolution, Attachments," status `Draft/Under Review/Finalized/Closed`) but never defines actual fields. This form is that missing structure — same relationship this project's other digitized forms have had to their named-but-unspecified modules (Exit Interview → F009, Application Form → F010).

Two things it confirms that were only partially visible before:

- `HR_OPERATIONS.md`'s Employee sheet schema already references `disciplinary_end_period`, auto-calculated as `disciplinary_start_period + 6 months` for SP1/SP2/SP3, or `+ 3 months` for Coaching/Verbal Warning — this form's validity notice is the actual source of that rule, not a separate thing. Good confirmation the two documents agree.
- The real escalation ladder is **Coaching → Verbal Warning → SP1 → SP2 → SP3 → Suspension/Termination** — six levels, not the generic "Verbal/Written/Suspension" three-tier version `hr.md` §14 implied.

---

## 2. Flag — "Divisi" Shows Up Again, Independently

This is the **second** real form (after F009's Exit Interview) with Division as a field separate from Department, on an unrelated form filled out by an unrelated part of HR. That's no longer a one-off template quirk worth a passing note — two independent source documents agreeing is a real signal that Division is an actual organizational layer, not redundant labeling. Recommend resolving this properly (add `divisionId` to the schema) rather than continuing to flag it per-form — worth a direct decision from Angel before the third form makes the same point.

---

## 3. Firestore Schema

```typescript
// disciplinaryActions/{actionId}
interface DisciplinaryAction extends BaseDocument {
  actionNumber: string; // DA-2026-0001

  employeeId: string;
  dateCreated: Timestamp;
  incidentDetails: string; // dates/times, reference to Code of Conduct section — free text, matches the form's own instruction to be specific

  disciplinaryType:
    | "coaching"
    | "verbalWarning"
    | "sp1"
    | "sp2"
    | "sp3"
    | "suspensionTermination";

  employeeStatement: string; // the form marks this "WAJIB DIISI / MUST BE FILLED" — the employee's own account, not optional
  proposedSolution?: string;

  companyFurtherAction?: string;
  employeeFurtherAction?: string;
  nextEscalationLevel?: DisciplinaryAction["disciplinaryType"]; // auto-suggested from the ladder above, editable by HR

  validFrom: Timestamp;
  validUntil: Timestamp; // auto-calculated: +3 months (coaching/verbalWarning) or +6 months (sp1/sp2/sp3/suspensionTermination), per §1

  status: "draft" | "underReview" | "finalized" | "expired" | "closed";

  linkedIncidentId?: string; // FK → incidentReports, if this action originated from a logged incident

  acknowledgments: {
    party: "employee" | "departmentHead" | "generalManager" | "hrManager";
    acknowledgedAt?: Timestamp;
    acknowledgedBy?: string; // uid
  }[];

  attachments: string[];

  // BaseDocument: id, createdAt, updatedAt, createdBy, updatedBy,
  // outletId, departmentId, isArchived
}
```

```typescript
// employees/{employeeId} — existing fields, now clarified
// disciplinaryType / disciplinaryStartPeriod / disciplinaryEndPeriod
// (already in the schema per HR_OPERATIONS.md) are a denormalized snapshot
// of the employee's current ACTIVE disciplinary record, not the source of
// truth — full history lives in disciplinaryActions. Same "thin summary,
// full record elsewhere" pattern already used for onboarding/offboarding
// checklists. Updated whenever a disciplinaryActions record is finalized
// or expires.
```

---

## 4. Flag — Does Every Level Really Need All Four Signatures?

The form shows four acknowledgment blocks — Department Head, General Manager, HR Manager, Employee — with no visible conditional logic tying signature requirements to severity. Digitizing it literally means every Coaching note requires a GM signature, same as a Suspension/Termination. That could be a real bottleneck if Coaching-level notes happen often (per the source example: attendance coaching, which sounds routine, not exceptional). Worth confirming whether GM sign-off is meant for every level or just SP2+/Suspension — I'm digitizing it as written (all four, every time) rather than assuming a threshold that isn't actually on the form.

---

## 5. Cloud Functions

| Function                        | Purpose                                                                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createDisciplinaryAction`      | Draft — captures incident details, type, calculates `validUntil` from `disciplinaryType`                                                               |
| `submitDisciplinaryAction`      | `draft` → `underReview`, notifies all four acknowledgment parties                                                                                      |
| `acknowledgeDisciplinaryAction` | Records one party's acknowledgment; once all four are recorded, auto-transitions to `finalized` and updates the denormalized fields on `employees`     |
| `checkDisciplinaryExpiry`       | Scheduled, daily — `finalized` records past `validUntil` move to `expired`; clears the denormalized `employees` snapshot if this was the active record |

`getActiveDisciplinaryLevel(employeeId)` (a query helper, not a separate Cloud Function) — used when drafting a new action, to check whether the employee already has an unexpired record and at what level, so HR isn't manually cross-referencing history to know whether a new lateness incident should start at Coaching or continue from an active SP1.

---

## 6. RBAC

| Role                                         | Create | View          | Acknowledge                   |
| -------------------------------------------- | ------ | ------------- | ----------------------------- |
| Department Leader (employee's own dept only) | ✅     | ✅ (own team) | ✅ (as Department Head party) |
| Other Department Leaders                     | —      | ❌            | —                             |
| HR Manager                                   | ✅     | ✅ (all)      | ✅ (as HR Manager party)      |
| General Manager                              | —      | ✅ (all)      | ✅ (as GM party)              |
| Employee (own record)                        | —      | ✅ (own only) | ✅ (as Employee party)        |
| Super Admin                                  | ✅     | ✅            | ✅                            |

Scoped by department like the rest of HR's "Limited" visibility for Department Leaders (`hr.md` §22) — a Kitchen Leader shouldn't see a Floor employee's disciplinary history.

---

## 7. Notification Matrix

| Event                        | Recipient                             | Timing                                                 |
| ---------------------------- | ------------------------------------- | ------------------------------------------------------ |
| Submitted for acknowledgment | All four parties                      | Immediate                                              |
| One party acknowledges       | Remaining unacknowledged parties      | On each acknowledgment                                 |
| Fully finalized              | Employee, Department Head, HR Manager | On finalization                                        |
| Expiring soon (14 days out)  | HR Manager                            | Once                                                   |
| Expired                      | HR Manager                            | Once, also clears the employee's denormalized snapshot |

---

## 8. Dashboard Hooks

| Widget                                                    | Source                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------- |
| HR Reports — Disciplinary Records (existing, `hr.md` §16) | `disciplinaryActions`, filterable by type/department/date           |
| Employee profile — Active Disciplinary Status             | `employees.disciplinaryType`/`disciplinaryEndPeriod` (denormalized) |

---

## 9. Acceptance Criteria

1. `employeeStatement` is required before an action can leave `draft` — matches the form's own "MUST BE FILLED" instruction
2. `validUntil` calculates correctly per type: +3 months for `coaching`/`verbalWarning`, +6 months for `sp1`/`sp2`/`sp3`/`suspensionTermination`
3. Status only reaches `finalized` once all four `acknowledgments` entries are recorded
4. `checkDisciplinaryExpiry` correctly moves expired records out of `finalized` and clears the employee's denormalized active-status snapshot
5. Department Leaders can only view records for employees in their own department — verified by Security Rules test
6. `getActiveDisciplinaryLevel` correctly surfaces an employee's current unexpired record when drafting a new action, so escalation level isn't manually reconstructed from history each time
7. Every creation, acknowledgment, and expiry event produces an audit log entry
