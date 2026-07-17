# NourishOS — Employment Application Form (Digitized F010, Full-Time Only)

Version: 1.0
Module: HR → Recruitment → Candidate Intake
Collection: `candidates` (existing, per `hr.md` §7) — extended with an embedded `applicationForm` object

Source: `F010 - Employment Application Form.docx` (uploaded). Scope, per your
instruction: **Full-Time (`ft`) candidates only.** Daily Worker (`dw`)
intake isn't covered by this form or this spec — if DW hiring needs its own
(presumably lighter) application form, that's a separate document to
digitize, not something to improvise here.

---

## 1. Where This Fits

This is the actual content behind F01's item 19 ("Application Form") and, for most fields, item 3/4 (education, references) — the Candidate Profile spec (`hr.md` §7) as documented so far only lists "Personal Information, Resume, Portfolio, Interview Notes, Evaluation Score, Status," which is far thinner than what F010 actually collects. This spec fills that gap.

Once a candidate is hired, onboarding's document checklist (item 19, per the Onboarding & Exit Checklist spec) treats this as **verify, not re-collect** — the hired employee's application data already lives here.

---

## 2. Flag — Third Version of the "How Did You Hear About Us" Field

This is now the third document with a version of this same question, and each one has different options:

| Source                              | Options                                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| F01 item 30 (Source of Recruitment) | Originally guessed: referral, jobPortal, walkIn, agency, other                                        |
| F009 Exit Interview §A              | Newspaper Ads, Job Portal, Applied Directly, Other Advertisement, Referral, Employment Agency, Others |
| F010 Vacancy Information            | Job Portal, Reference, Social Media, Broadcast                                                        |

**Recommend one canonical enum, superset of all three**, set once at application time (F010) and carried through — not re-asked or re-guessed at exit:

```typescript
recruitmentSource: "jobPortal" |
  "referral" |
  "socialMedia" |
  "broadcast" |
  "newspaperAd" |
  "appliedDirectly" |
  "otherAdvertisement" |
  "employmentAgency" |
  "other";
```

`referral` merges F010's "Reference" and F009's "Referral"/"Introduced by friend/family" — same concept, different word choice across forms. `socialMedia` and `broadcast` are genuinely new, not present in F009's taxonomy — worth Angel confirming what "Broadcast" specifically means in practice (a WhatsApp broadcast list, a company-wide announcement, something else) since it's not self-evident from the form alone.

This supersedes the enum proposed in both the Onboarding & Exit Checklist spec and the Exit Interview spec — update those two to this superset rather than maintaining three slightly different versions.

---

## 3. Flag — This Form Collects Genuinely Sensitive Data

Three sections go further than typical HR intake:

- **Question 7:** history of serious illness, with a conditional "when and what illness" follow-up — medical history.
- **Question 9:** history of criminal acts, with a conditional "when and what reason" follow-up — background/legal history.
- **Work Experience blocks (up to 4 previous employers):** basic salary, position allowance, meal/transport allowance, other allowances, total salary per employer — detailed salary history.

None of this should be visible to whoever happens to be reviewing candidates for a role. Recommend the same field-level restriction pattern already used for employee compensation and workplace injury records: these three groups of answers live in a `sensitiveResponses` sub-object, gated behind a new `candidates.view_sensitive` permission (HR Manager, Super Admin only) — not the general `RECRUITMENT_*` view permission that interviewers and department leaders already hold.

---

## 4. Schema

```typescript
// candidates/{candidateId} — extends the existing Candidate Profile
interface Candidate extends BaseDocument {
  // ...existing fields (resumeFileId, evaluationScore, stage status, etc.)

  applicationForm: {
    recruitmentSource:
      | "jobPortal"
      | "referral"
      | "socialMedia"
      | "broadcast"
      | "newspaperAd"
      | "appliedDirectly"
      | "otherAdvertisement"
      | "employmentAgency"
      | "other";
    recruitmentSourceOther?: string;
    positionApplied: string;
    applicationDate: Timestamp;

    personalData: {
      fullName: string;
      gender: "male" | "female";
      placeOfBirth: string;
      dateOfBirth: string;
      nationality: string;
      maritalStatus: string;
      religion: string;
      email: string;
      phone: string;
    };

    address: {
      permanentAddress: string;
      domicileAddress: string;
    };

    formalEducation: {
      schoolType: string;
      institutionName: string;
      city: string;
      major: string;
      graduationYear: string;
    }[];

    informalEducation: {
      schoolType: string;
      institutionName: string;
      city: string;
      major: string;
      graduationYear: string;
    }[];

    training: {
      name: string;
      organizerLocation: string;
      monthYear: string;
    }[];

    languages: {
      language: string; // 'english' | 'indonesian' | other, free text for a third+ language
      speaking: "excellent" | "good" | "basic";
      reading: "excellent" | "good" | "basic";
      writing: "excellent" | "good" | "basic";
    }[];

    workExperience: {
      companyName: string;
      companyType: string;
      periodStart: string;
      periodEnd: string;
      position: string;
      superiorName: string;
      reasonForResignation: string;
      // sensitive — see sensitiveResponses note below; kept here structurally
      // but access-gated the same way
      salary?: number;
    }[];

    additionalQuestions: {
      knowsAboutCompany: string;
      expectationsIfHired: string;
      willingToRelocate: boolean;
      willingToTravel: boolean;
      preferredEnvironment: "office" | "field";
      strengths: [string, string, string];
      weaknesses: [string, string, string];
      willingToAttachReferenceLetter: boolean;
      referenceLetterDeclineReason?: string;
      expectedRemuneration: string;
    };

    references: {
      name: string;
      phone: string;
      company: string;
      department: string;
      position: string;
      relationship: string;
    }[];

    declarationAccepted: boolean; // digital equivalent of the signed truthfulness declaration
    declarationAcceptedAt?: Timestamp;
  };

  // Restricted sub-object — gated by candidates.view_sensitive
  sensitiveResponses: {
    seriousIllnessHistory: boolean; // Q7
    seriousIllnessDetail?: string;
    criminalHistory: boolean; // Q9
    criminalHistoryDetail?: string;
    // workExperience salary fields (above) are also gated by the same
    // permission when rendered — noted here, not duplicated in schema
  };
}
```

---

## 5. Declaration — Digital Equivalent

The paper form's declaration ("data written correctly; false data may result in termination without severance pay") is a legal statement the candidate signs. Same treatment as the IN/OUT checklist and Exit Interview: **in-app acknowledgment (checkbox + timestamp) plus audit log**, not a real e-signature — e-signatures remain future work per `hr.md` §24. The declaration text itself should render verbatim (bilingual, as printed) immediately above the acknowledgment checkbox so the legal weight isn't lost in translation to a digital checkbox.

---

## 6. RBAC

| Role                            | Fill/Submit (as candidate, via portal) | View Application (standard fields) | View Sensitive (health, criminal, salary history) |
| ------------------------------- | -------------------------------------- | ---------------------------------- | ------------------------------------------------- |
| Candidate (external)            | ✅ (own record only)                   | ✅ (own, read-only after submit)   | ✅ (own)                                          |
| Department Leader (interviewer) | —                                      | ✅                                 | ❌                                                |
| HR Admin                        | —                                      | ✅                                 | ❌                                                |
| HR Manager                      | —                                      | ✅                                 | ✅                                                |
| GM                              | —                                      | ✅                                 | ❌                                                |
| Super Admin                     | —                                      | ✅                                 | ✅                                                |

New permission: `candidates.view_sensitive` — same shape as `incidents.view_sensitive` and `EMPLOYEES_READ_SENSITIVE`, applied here for consistency rather than inventing a different pattern for the third occurrence of the same need.

---

## 7. Acceptance Criteria

1. `recruitmentSource` uses the canonical superset enum (§2) — not re-invented per module
2. Sensitive fields (illness history, criminal history, all previous-employer salary figures) are unreadable by any role without `candidates.view_sensitive` — verified by Security Rules test against a Department Leader account
3. Declaration text renders in full, bilingual, before the acceptance checkbox can be checked — not a bare checkbox with no visible statement
4. `formalEducation`, `informalEducation`, `training`, `familyMembers`, `languages`, `workExperience`, and `references` all support add/remove rows freely — the paper form's fixed row counts (e.g. "4 previous companies") aren't hardcoded as a limit
5. Once a candidate is hired, onboarding's Document Checklist item 19 links to this record rather than prompting for re-upload
6. Every submission and any post-submission edit produces an audit log entry
