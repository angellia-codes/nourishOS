# NourishOS HR & Operations — Build Roadmap + Employee Master Database Implementation Plan

> **For agentic workers:** Use `subagent-driven-development` (recommended) or `executing-plans` to implement Part B task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sequence the 14 sub-modules in the refined HR & Operations PRD into a dependency-safe build order, then deliver a complete, ready-to-execute implementation plan for the first module: **Employee Master Database**.

**Architecture:** Every module is a thin vertical slice on the existing NourishOS platform — Cloud Function (business logic + RBAC + audit) → client service wrapper (`callFunction`/`getDocument`/`subscribeToDocument`) → hook → component → page → route. No module owns its own approval, task, notification, or file logic — those always route through the five Shared Services already built (Approval Engine, Task Engine, Notification Engine, Audit Log, File Storage).

**Tech Stack:** React 18 + TypeScript + Vite + React Router, Tailwind CSS + shadcn/ui (see flagged conflict below), React Hook Form + Zod, Zustand, Firebase (Auth, Firestore, Cloud Functions v2, Storage), Vitest + React Testing Library.

## Global Constraints

- All business logic runs in Cloud Functions — never in the React UI (CLAUDE.md, ARCHITECTURE.md §8).
- Every document carries `id, createdAt, updatedAt, createdBy, updatedBy, outletId, departmentId, status, isArchived` (`BaseDocument`, `src/types/firestore.types.ts`).
- Every collection name lives in `src/constants/collections.ts` (`COLLECTIONS`). Never hardcode a string.
- Every permission is a `module.action` string in `src/constants/permissions.ts` (`PERMISSIONS`). Every Cloud Function calls `requirePermission(user, PERMISSIONS.X)` — client-side checks are UX only (RBAC.md §11).
- Every write mutation is a `functions/src/{module}/{feature}/{operation}.ts` exporting an `onCall({ region: REGION }, ...)` handler, wrapped in `try { ... } catch (error) { handleError(error) }`, using `requireActiveUser`, `AppError`, `successResponse`, `newDocumentBaseFields` / `updatedFields`, and `recordAuditEvent` from `functions/src/lib`.
- Every Cloud Function is exported from `functions/src/index.ts`.
- The client never writes Firestore directly for anything sensitive — reads go through `src/services/firestore` (`getDocument`, `queryDocuments`, `subscribeToDocument`, `subscribeToCollection`); writes go through `callFunction()`.
- **Flagged conflict — UI library:** `docs/core/ARCHITECTURE.md`, `DESIGN.md`, and `COMPONENT_LIBRARY.md` all specify Material UI. The actual shipped code (`AppraisalReviewPage.tsx`, `Sidebar.tsx`, etc.) uses Tailwind utility classes and shadcn/ui `Card`/`CardHeader`/`CardTitle` components — no MUI import anywhere in the built modules. This plan follows the code, not the stale docs. Recommend updating `DESIGN.md`/`COMPONENT_LIBRARY.md` to match; not blocking this plan.
- **Flagged conflict — Employee schema source of truth:** `docs/core/FIRESTORE_SCHEMA.md` §9 has a minimal `employees` shape (7 fields). `docs/modules/hr.md` §5 has a fuller Indonesia-generic field list. The refined HR & Operations PRD §12.1 has a richer, payroll/compliance-specific field list (NIK, NPWP, BPJS, tax status, disciplinary/recognition tracking). This plan uses the PRD §12.1 set — it's the most recent and most specific — unioned with `hr.md`'s `preferredName`/`nationality`/`maritalStatus` (non-conflicting additions). Recommend formally superseding `FIRESTORE_SCHEMA.md` §9 with this plan's `Employee` type once merged.
- **Flagged gap — field-level security:** PRD NFR-SE04 requires salary/allowance data restricted to `hrManager`/`superAdmin`, but Firestore Security Rules are document-level, not field-level. Resolved below by splitting compensation into its own sub-collection (`employees/{id}/compensation/current`) with its own, stricter rule — not a single flat document. This is a deliberate deviation from a literal reading of PRD §12.1 (which lists salary as fields on the employee doc); flag if a different approach is preferred.

---

# Part A — Full Module Build Roadmap

## A.1 Sequencing principle

Employee Master Database is the dependency root: Contract Tracker extends `employees`, Recruitment hires _into_ `employees`, Daily Updates/Projects reference employees as owners, and Calendar events have employees as participants. Every other module in the PRD is easier to build correctly once real employee records — not placeholder ID strings — exist. This confirms the user's instinct to start there.

Beyond that root, ordering follows two rules: (1) build a shared/cross-cutting piece before the first feature that needs it, never inside that feature, and (2) don't start work blocked on an open decision.

## A.2 Build order

| #   | Module (PRD §)                                             | Depends on             | Why here                                                                                                                                                                                  | Blocking issue                                                              |
| --- | ---------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 0   | RBAC/routing prerequisites                                 | —                      | `bakeryLeader`/`wholefoodLeader` roles, new permission strings, route scaffolding — needed by everything below                                                                            | None — do first                                                             |
| 1   | **Employee Master Database (§9.1)**                        | #0                     | Dependency root — see A.1                                                                                                                                                                 | None — **this plan, Part B**                                                |
| 2   | WhatsApp channel adapter (§9.11, Fonnte)                   | #0                     | Small, high-leverage shared-service piece. Contract Tracker's alerts and Recruitment's candidate messages both need it — build once, not twice                                            | Needs Fonnte API token provisioned (ops task, not engineering)              |
| 3   | Contract & Probation Tracker (§9.7)                        | #1, #2                 | Highest business value (P1 pain point), self-contained scheduled function + notification thresholds                                                                                       | None                                                                        |
| 4   | Calendar Service + Google Calendar sync (§9.2, §9.3)       | #0                     | New shared service. Recruitment interviews and Daily Updates/Homepage widgets both consume it                                                                                             | Needs Google Calendar service-account credentials (ops task)                |
| 5   | Recruitment + WhatsApp Recruitment Automation (§9.4, §9.5) | #1, #2, #4             | `recruitments`/`candidates` collections and `RECRUITMENT_*` permissions already scaffolded — this wires Cloud Functions + UI + Kanban on top                                              | None                                                                        |
| 6   | Daily Updates System (§9.12)                               | #1                     | Needs Task Engine extended with `dailyUpdate` task type + carry-forward/escalation Cloud Functions                                                                                        | None                                                                        |
| 7   | Project Management (§9.8)                                  | #1                     | Needs Task Engine extended with `projectTask` type — natural pair with #6, same Task Engine extension work                                                                                | None                                                                        |
| 8   | Performance Management (§9.6)                              | #1                     | Extends the existing Appraisal module                                                                                                                                                     | **Blocked on §6.4 decision (Option A vs B) — get sign-off before starting** |
| 9   | Approval Workflow configuration (§9.10)                    | #1–#8 as each needs it | Mostly configuration (workflow definitions), not new engineering — thread into each feature above as it's built, then do a final pass for the remaining chains (Company Event, Promotion) | None                                                                        |
| 10  | New Contract Signing (§9.14)                               | #3, #9                 | Small — File Storage + Approval Engine, no new collection                                                                                                                                 | None                                                                        |
| 11  | Dashboards (§9.9)                                          | #1–#10                 | Needs upstream data to exist before widgets are meaningful                                                                                                                                | None                                                                        |
| 12  | Homepage / Command Center (§9.13)                          | #11                    | Aggregates the Dashboard module — do last                                                                                                                                                 | None                                                                        |

## A.3 Prerequisite tasks (do before Module 1, small enough to fold into this session)

1. **`src/constants/roles.ts`** — add `BAKERY_LEADER: 'bakeryLeader'` and `WHOLEFOOD_LEADER: 'wholefoodLeader'` to `ROLES`.
2. **`src/constants/permissions.ts`** — add a new `EMPLOYEES_READ_SENSITIVE` permission (`employees.readSensitive`) gating the compensation sub-collection, since the existing `EMPLOYEES_READ` doesn't distinguish general profile data from salary data.
3. **`src/constants/routes.ts`** — no change needed; `ROUTES.HR = '/hr'` already exists and this plan nests under it in `routes.tsx`.

These are folded into Task 1 of Part B below so the plan stays to one file per module per the Scope Check in the writing-plans skill.

---

# Part B — Implementation Plan: Employee Master Database

**Scope:** PRD §9.1 (FR 9.1-F01–F15), §12.1 (schema), §7 (RBAC). Produces a working, testable Employee Database: create, edit, search/filter/sort, profile view, soft-delete, salary visibility restricted to HR/Super Admin, full audit trail.

**Out of scope for this plan** (belong to later modules per §A.2): bulk CSV import (9.1-F12, Should-Have — defer), contract expiry/probation alerting (Module 3), recruitment-to-hire flow (Module 5).

## File Structure

```
src/constants/roles.ts                          (modify)
src/constants/permissions.ts                     (modify)
src/types/employee.types.ts                      (new)
src/types/index.ts                                (modify)
src/utils/employee.ts                             (new)
src/utils/employee.test.ts                        (new)
src/firestore.rules                               (modify)
firestore.indexes.json                            (modify)
functions/src/hr/employees/employeeIdSequence.ts   (new)
functions/src/hr/employees/createEmployee.ts       (new)
functions/src/hr/employees/updateEmployee.ts       (new)
functions/src/hr/employees/updateEmployeeCompensation.ts (new)
functions/src/hr/employees/archiveEmployee.ts      (new)
functions/src/hr/employees/index.ts                (new)
functions/src/index.ts                             (modify)
src/features/hr/services/employeeService.ts        (new)
src/features/hr/hooks/useEmployees.ts               (new)
src/features/hr/hooks/useEmployee.ts                (new)
src/features/hr/components/employee/EmployeeStatusBadge.tsx (new)
src/features/hr/components/employee/EmployeeForm.tsx (new)
src/features/hr/components/employee/EmployeeTable.tsx (new)
src/features/hr/components/employee/index.ts        (new)
src/features/hr/pages/EmployeeListPage.tsx           (new)
src/features/hr/pages/EmployeeCreatePage.tsx         (new)
src/features/hr/pages/EmployeeProfilePage.tsx        (new)
src/features/hr/pages/EmployeeEditPage.tsx           (new)
src/routes/routes.tsx                                (modify)
```

---

### Task 1: RBAC prerequisites + Employee domain types

**Files:**

- Modify: `src/constants/roles.ts`
- Modify: `src/constants/permissions.ts`
- Create: `src/types/employee.types.ts`
- Modify: `src/types/index.ts`

**Interfaces:**

- Produces: `ROLES.BAKERY_LEADER`, `ROLES.WHOLEFOOD_LEADER`; `PERMISSIONS.EMPLOYEES_READ_SENSITIVE`; `Employee`, `EmployeeCompensation`, `EmploymentType`, `ProbationStatus`, `TaxStatus`, `MaritalStatus` types — every later task in this plan imports these.

- [ ] **Step 1: Add the two missing outlet-leader roles**

In `src/constants/roles.ts`, add to `ROLES`:

```ts
export const ROLES = {
  SUPER_ADMIN: "superAdmin",
  DIRECTOR: "director",
  GENERAL_MANAGER: "generalManager",
  HR_MANAGER: "hrManager",
  FINANCE: "finance",
  PURCHASING: "purchasing",
  KITCHEN_LEADER: "kitchenLeader",
  BAR_LEADER: "barLeader",
  FLOOR_LEADER: "floorLeader",
  /** Added for HR & Operations PRD §7.1 — Bakery outlet did not have a leader role. */
  BAKERY_LEADER: "bakeryLeader",
  /** Added for HR & Operations PRD §7.1 — Wholefood outlet did not have a leader role. */
  WHOLEFOOD_LEADER: "wholefoodLeader",
  SECURITY: "security",
  ENGINEERING: "engineering",
  OUTLET_MANAGER: "outletManager",
  STOREKEEPER: "storekeeper",
  MARKETING: "marketing",
  CUSTOMER_SERVICE: "customerService",
  STAFF: "staff",
} as const;
```

Everything else in the file (`Role` type, `CROSS_OUTLET_ROLES`) is derived from `ROLES` and needs no change.

- [ ] **Step 2: Add the sensitive-data read permission**

In `src/constants/permissions.ts`, add one line after `EMPLOYEES_EXPORT`:

```ts
  EMPLOYEES_EXPORT: permission(PERMISSION_MODULES.EMPLOYEES, ACTIONS.EXPORT),
  /**
   * Gates the employees/{id}/compensation sub-collection (salary,
   * allowances, bank details). Separate from EMPLOYEES_READ because
   * RBAC.md's standard actions don't distinguish field sensitivity —
   * PRD NFR-SE04 requires hrManager/superAdmin only.
   */
  EMPLOYEES_READ_SENSITIVE: permission(PERMISSION_MODULES.EMPLOYEES, 'readSensitive'),
```

- [ ] **Step 3: Write the Employee domain types**

Create `src/types/employee.types.ts`:

```ts
import type { Timestamp } from "firebase/firestore";
import type { BaseDocument } from "./firestore.types";

/**
 * Employee Master Database — PRD §9.1, schema §12.1.
 *
 * Field-set reconciliation (flagged in the plan header): unions PRD §12.1
 * (NIK/NPWP/BPJS/tax status — Indonesia payroll-specific) with hr.md §5's
 * preferredName/nationality/maritalStatus, which PRD §12.1 omitted but
 * doesn't conflict with.
 *
 * "employeeNumber" (not "employeeId") holds the human-facing N-0001 /
 * DW-0001 / OJT-0001 code, to avoid colliding with BaseDocument's own `id`
 * (the Firestore document ID). PRD §12.1 called this field "employeeId";
 * renamed here for clarity — same concept, less ambiguous name.
 *
 * "employmentType" merges what PRD §12.1 listed as two separate fields
 * (contractType, employmentStatus) — they described the same axis
 * (permanent/fixedTerm/freelance/BOD/dailyWorker/OJT) with overlapping
 * values. One field, one source of truth.
 */

export type EmploymentType =
  | "permanent"
  | "fixedTerm"
  | "freelance"
  | "bod"
  | "dailyWorker"
  | "ojt";

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  permanent: "Permanent (PKWTT)",
  fixedTerm: "Fixed-Term (PKWT)",
  freelance: "Freelance",
  bod: "Board of Directors",
  dailyWorker: "Daily Worker",
  ojt: "On-the-Job Training",
};

/** Employee-number prefix per employmentType — PRD §9.1-F02. */
export const EMPLOYMENT_TYPE_ID_PREFIX: Record<EmploymentType, string> = {
  permanent: "N",
  fixedTerm: "N",
  freelance: "N",
  bod: "N",
  dailyWorker: "DW",
  ojt: "OJT",
};

/** Only permanent/fixedTerm run a probation cycle under current Nourish policy. */
export const EMPLOYMENT_TYPES_WITH_PROBATION: readonly EmploymentType[] = [
  "permanent",
  "fixedTerm",
];

export type ProbationStatus = "pending" | "passed" | "failed" | "extended";

export type Gender = "male" | "female";

export type MaritalStatus = "single" | "married" | "divorced" | "widowed";

/**
 * PRD §12.1 lists hindu/christian/muslim only, reflecting current Bali
 * outlet staff composition. Flagging rather than silently expanding —
 * confirm with HR before this becomes the enforced enum long-term.
 */
export type Religion = "hindu" | "christian" | "muslim";

/** Indonesian personal income tax (PPh21) status codes. */
export type TaxStatus =
  | "TK0"
  | "TK1"
  | "TK2"
  | "TK3"
  | "K0"
  | "K1"
  | "K2"
  | "K3";

export type DisciplinaryType =
  | "coaching"
  | "verbalWarning"
  | "SP1"
  | "SP2"
  | "SP3"
  | "termination";

export interface Employee extends BaseDocument {
  employeeNumber: string; // N-0001 / DW-0001 / OJT-0001 — server-generated, see employeeIdSequence.ts
  fullName: string;
  preferredName?: string;
  nik: string;
  npwp?: string;
  gender: Gender;
  birthDate: Timestamp;
  nationality?: string;
  maritalStatus?: MaritalStatus;
  religion: Religion;
  phone: string;
  email: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  motherName: string;
  permanentAddress: string;
  domicileAddress: string;
  bpjsTk?: string;
  bpjsKesehatan?: string;
  personalTaxStatus: TaxStatus;
  positionId?: string;
  managerId?: string;
  employmentType: EmploymentType;
  joinDate: Timestamp;
  probationMonths?: number; // required if employmentType is in EMPLOYMENT_TYPES_WITH_PROBATION
  probationEndDate?: Timestamp; // server-calculated — never client-set
  probationStatus?: ProbationStatus;
  contractEndDate?: Timestamp; // required if employmentType === 'fixedTerm'
  activeStatus: "active" | "inactive";
  resignationDate?: Timestamp;
  resignationReason?: string;
  disciplinaryType?: DisciplinaryType;
  disciplinaryStartPeriod?: Timestamp;
  disciplinaryEndPeriod?: Timestamp;
  recognitionType?: string;
  recognitionPeriod?: string; // "MM/YYYY"
  photoFileId?: string; // links into the files collection (File Storage Service)
}

/**
 * Sub-collection at employees/{employeeId}/compensation/current — split out
 * from Employee per this plan's field-level-security decision (see plan
 * header). Only one live document ("current") per employee; history is
 * covered by auditLogs, not a version array here.
 */
export interface EmployeeCompensation {
  basicSalary: number;
  positionAllowance?: number;
  phoneAllowance?: number;
  transportationAllowance?: number;
  bankAccountName?: string;
  bankAccountNumber?: string;
  updatedAt: Timestamp;
  updatedBy: string;
}
```

- [ ] **Step 4: Export the new types**

In `src/types/index.ts`, add:

```ts
export * from "./employee.types";
```

- [ ] **Step 5: Commit**

```bash
git add src/constants/roles.ts src/constants/permissions.ts src/types/employee.types.ts src/types/index.ts
git commit -m "feat(hr): add employee domain types and missing outlet-leader roles"
```

---

### Task 2: Pure business-logic helpers (employee number, probation date) — TDD

**Files:**

- Create: `src/utils/employee.ts`
- Test: `src/utils/employee.test.ts`

**Interfaces:**

- Consumes: `Employee`, `EmploymentType`, `EMPLOYMENT_TYPE_ID_PREFIX`, `EMPLOYMENT_TYPES_WITH_PROBATION` from Task 1.
- Produces: `buildEmployeeNumber(employmentType, sequence): string`, `calculateProbationEndDate(joinDate, probationMonths): Date`, `requiresProbation(employmentType): boolean`, `validateEmployeeInput(input): string[]` — Task 4/5 (Cloud Functions) call all four directly (functions and client share `src/utils` via TypeScript project references / copy-in build step already used by the Appraisal module's shared constants).

These are pulled out of the Cloud Function bodies specifically so they're unit-testable without the Firebase emulator — the Cloud Function tasks below become thin wrappers that call these plus do the Firestore I/O.

- [ ] **Step 1: Write the failing tests**

Create `src/utils/employee.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  buildEmployeeNumber,
  calculateProbationEndDate,
  requiresProbation,
  validateEmployeeInput,
} from "./employee";

describe("buildEmployeeNumber", () => {
  it("pads permanent employees to 4 digits with N- prefix", () => {
    expect(buildEmployeeNumber("permanent", 7)).toBe("N-0007");
  });

  it("uses DW- prefix for daily workers", () => {
    expect(buildEmployeeNumber("dailyWorker", 12)).toBe("DW-0012");
  });

  it("uses OJT- prefix for on-the-job trainees", () => {
    expect(buildEmployeeNumber("ojt", 1)).toBe("OJT-0001");
  });

  it("does not truncate sequences beyond 4 digits", () => {
    expect(buildEmployeeNumber("permanent", 12345)).toBe("N-12345");
  });
});

describe("calculateProbationEndDate", () => {
  it("adds probationMonths calendar months to the join date", () => {
    const joinDate = new Date("2026-01-15T00:00:00.000Z");
    const result = calculateProbationEndDate(joinDate, 3);
    expect(result.toISOString()).toBe("2026-04-15T00:00:00.000Z");
  });

  it("rolls over year boundaries correctly", () => {
    const joinDate = new Date("2026-11-01T00:00:00.000Z");
    const result = calculateProbationEndDate(joinDate, 3);
    expect(result.toISOString()).toBe("2027-02-01T00:00:00.000Z");
  });
});

describe("requiresProbation", () => {
  it("is true for permanent and fixedTerm", () => {
    expect(requiresProbation("permanent")).toBe(true);
    expect(requiresProbation("fixedTerm")).toBe(true);
  });

  it("is false for freelance, bod, dailyWorker, ojt", () => {
    expect(requiresProbation("freelance")).toBe(false);
    expect(requiresProbation("bod")).toBe(false);
    expect(requiresProbation("dailyWorker")).toBe(false);
    expect(requiresProbation("ojt")).toBe(false);
  });
});

describe("validateEmployeeInput", () => {
  const validInput = {
    fullName: "Kadek Ayu",
    nik: "5171234567890001",
    gender: "female" as const,
    birthDate: "1998-05-20",
    religion: "hindu" as const,
    phone: "628123456789",
    email: "kadek.ayu@nourish.id",
    emergencyContactName: "Wayan Sudira",
    emergencyContactPhone: "628129876543",
    motherName: "Ni Made Sari",
    permanentAddress: "Jl. Uluwatu No. 12, Bali",
    domicileAddress: "Jl. Uluwatu No. 12, Bali",
    personalTaxStatus: "TK0" as const,
    departmentId: "kitchen",
    outletId: "uluwatu",
    employmentType: "permanent" as const,
    joinDate: "2026-07-01",
    probationMonths: 3,
  };

  it("returns no errors for a complete permanent-employee input", () => {
    expect(validateEmployeeInput(validInput)).toEqual([]);
  });

  it("flags every missing required field", () => {
    const errors = validateEmployeeInput({});
    expect(errors).toContain("fullName is required");
    expect(errors).toContain("nik is required");
    expect(errors).toContain("departmentId is required");
    expect(errors).toContain("outletId is required");
    expect(errors).toContain("employmentType is required");
    expect(errors).toContain("joinDate is required");
  });

  it("requires probationMonths when employmentType needs probation", () => {
    const errors = validateEmployeeInput({
      ...validInput,
      probationMonths: undefined,
    });
    expect(errors).toContain(
      "probationMonths is required for this employment type",
    );
  });

  it("does not require probationMonths for freelance", () => {
    const errors = validateEmployeeInput({
      ...validInput,
      employmentType: "freelance",
      probationMonths: undefined,
    });
    expect(errors).not.toContain(
      "probationMonths is required for this employment type",
    );
  });

  it("requires contractEndDate when employmentType is fixedTerm", () => {
    const errors = validateEmployeeInput({
      ...validInput,
      employmentType: "fixedTerm",
    });
    expect(errors).toContain(
      "contractEndDate is required for fixed-term employment",
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/employee.test.ts`
Expected: FAIL — `Cannot find module './employee'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/utils/employee.ts`:

```ts
import {
  EMPLOYMENT_TYPE_ID_PREFIX,
  EMPLOYMENT_TYPES_WITH_PROBATION,
  type EmploymentType,
} from "@/types/employee.types";

/** PRD §9.1-F02 — prefix by employmentType, sequence padded to at least 4 digits. */
export function buildEmployeeNumber(
  employmentType: EmploymentType,
  sequence: number,
): string {
  const prefix = EMPLOYMENT_TYPE_ID_PREFIX[employmentType];
  const padded = String(sequence).padStart(4, "0");
  return `${prefix}-${padded}`;
}

/** PRD §9.1-F09 — calendar-month addition, not a fixed 30-day offset. */
export function calculateProbationEndDate(
  joinDate: Date,
  probationMonths: number,
): Date {
  const result = new Date(joinDate.getTime());
  result.setUTCMonth(result.getUTCMonth() + probationMonths);
  return result;
}

export function requiresProbation(employmentType: EmploymentType): boolean {
  return (
    EMPLOYMENT_TYPES_WITH_PROBATION as readonly EmploymentType[]
  ).includes(employmentType);
}

/**
 * Shape mirrors CreateEmployeeInput (Task 4) but every field is optional
 * here so this same function can validate a partially-filled draft from
 * the client as well as the payload a Cloud Function receives.
 */
export interface EmployeeInputForValidation {
  fullName?: string;
  nik?: string;
  gender?: string;
  birthDate?: string;
  religion?: string;
  phone?: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  motherName?: string;
  permanentAddress?: string;
  domicileAddress?: string;
  personalTaxStatus?: string;
  departmentId?: string;
  outletId?: string;
  employmentType?: EmploymentType;
  joinDate?: string;
  probationMonths?: number;
  contractEndDate?: string;
}

const REQUIRED_FIELDS: (keyof EmployeeInputForValidation)[] = [
  "fullName",
  "nik",
  "gender",
  "birthDate",
  "religion",
  "phone",
  "email",
  "emergencyContactName",
  "emergencyContactPhone",
  "motherName",
  "permanentAddress",
  "domicileAddress",
  "personalTaxStatus",
  "departmentId",
  "outletId",
  "employmentType",
  "joinDate",
];

/** PRD §9.1-F03 — enforced server-side in the Cloud Function, not just the form. */
export function validateEmployeeInput(
  input: EmployeeInputForValidation,
): string[] {
  const errors: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (!input[field]) {
      errors.push(`${field} is required`);
    }
  }

  if (
    input.employmentType &&
    requiresProbation(input.employmentType) &&
    !input.probationMonths
  ) {
    errors.push("probationMonths is required for this employment type");
  }

  if (input.employmentType === "fixedTerm" && !input.contractEndDate) {
    errors.push("contractEndDate is required for fixed-term employment");
  }

  return errors;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/employee.test.ts`
Expected: PASS — 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/employee.ts src/utils/employee.test.ts
git commit -m "feat(hr): add employee number generation and validation helpers"
```

---

### Task 3: Firestore Security Rules + composite indexes

**Files:**

- Modify: `src/firestore.rules`
- Modify: `firestore.indexes.json`

**Interfaces:**

- Consumes: `ROLES` from Task 1 (role literals used in `hasAnyRole`).
- Produces: rule coverage for `employees` and the `compensation` sub-collection, and the composite indexes Tasks 8–9's queries rely on (`outletId + departmentId + activeStatus`, `activeStatus + fullName`).

- [ ] **Step 1: Add employees + compensation rules**

In `src/firestore.rules`, inside `match /databases/{database}/documents { ... }`, add (near the other HR rules):

```
    // ---- HR: Employee Master Database ----
    match /employees/{employeeId} {
      // General profile fields — HR/GM/Director/Super Admin see everyone;
      // outlet leaders see only their own outlet+department (PRD §7.2:
      // Outlet Leaders = "Own Team (Read)").
      allow read: if isSignedIn() && (
        hasAnyRole(['superAdmin', 'director', 'generalManager', 'hrManager']) ||
        (resource.data.outletId == request.auth.token.outletId &&
         resource.data.departmentId == request.auth.token.departmentId)
      );
      allow write: if false; // createEmployee / updateEmployee / archiveEmployee Cloud Functions only

      // Salary/allowance/bank data — hrManager + superAdmin only (NFR-SE04).
      // Split into its own document specifically so this stricter rule
      // doesn't have to also gate the general profile fields above.
      match /compensation/{document=**} {
        allow read: if isSignedIn() && hasAnyRole(['superAdmin', 'hrManager']);
        allow write: if false; // createEmployee / updateEmployeeCompensation Cloud Functions only
      }
    }
```

- [ ] **Step 2: Add composite indexes**

In `firestore.indexes.json`, add to the `indexes` array (create the file with `{ "indexes": [], "fieldOverrides": [] }` first if it doesn't exist yet):

```json
    {
      "collectionGroup": "employees",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "outletId", "order": "ASCENDING" },
        { "fieldPath": "departmentId", "order": "ASCENDING" },
        { "fieldPath": "activeStatus", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "employees",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "activeStatus", "order": "ASCENDING" },
        { "fieldPath": "fullName", "order": "ASCENDING" }
      ]
    }
```

These back FR 9.1-F05 (filter by outlet/department/status) and the default sorted list view (FR 9.1-F06).

- [ ] **Step 3: Verify rules compile**

Run: `firebase emulators:start --only firestore` then, in another terminal: `firebase deploy --only firestore:rules --dry-run`
Expected: no syntax errors reported.

- [ ] **Step 4: Commit**

```bash
git add src/firestore.rules firestore.indexes.json
git commit -m "feat(hr): add Firestore rules and indexes for employees + compensation"
```

---

### Task 4: Cloud Function `createEmployee`

**Files:**

- Create: `functions/src/hr/employees/employeeIdSequence.ts`
- Create: `functions/src/hr/employees/createEmployee.ts`

**Interfaces:**

- Consumes: `buildEmployeeNumber`, `calculateProbationEndDate`, `requiresProbation`, `validateEmployeeInput` from Task 2 (via the functions package's copy of `src/utils` — this codebase already shares `src/constants` between `src/` and `functions/src/` per the appraisal module's `positions.ts` import; do the same here). `db`, `COLLECTIONS`, `REGION`, `requireActiveUser`, `requirePermission`, `recordAuditEvent`, `newDocumentBaseFields`, `AppError`, `handleError`, `successResponse`, `PERMISSIONS` from `functions/src/lib`.
- Produces: `createEmployee` onCall handler returning `{ employeeId: string; employeeNumber: string }`, and `getNextEmployeeSequence(employmentType): Promise<number>` (used again by no other task in this plan, but kept exported for the future bulk-import task).

- [ ] **Step 1: Write the employee-number sequence generator**

Create `functions/src/hr/employees/employeeIdSequence.ts`:

```ts
import { db, COLLECTIONS } from "../../lib";
import type { EmploymentType } from "../../../../src/types/employee.types";
import { EMPLOYMENT_TYPE_ID_PREFIX } from "../../../../src/types/employee.types";

const COUNTER_DOC_PATH = "employeeIdCounters/counters";

/**
 * Transactional per-prefix counter so N-/DW-/OJT- sequences never collide
 * even under concurrent createEmployee calls. Stored under systemSettings
 * (shared-service.md §17 — reusable lookup values) rather than a bespoke
 * top-level collection.
 */
export async function getNextEmployeeSequence(
  employmentType: EmploymentType,
): Promise<number> {
  const prefix = EMPLOYMENT_TYPE_ID_PREFIX[employmentType];
  const counterRef = db
    .collection(COLLECTIONS.SYSTEM_SETTINGS)
    .doc(COUNTER_DOC_PATH);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current = (snap.data()?.[prefix] as number | undefined) ?? 0;
    const next = current + 1;
    tx.set(counterRef, { [prefix]: next }, { merge: true });
    return next;
  });
}
```

- [ ] **Step 2: Write `createEmployee`**

Create `functions/src/hr/employees/createEmployee.ts`:

```ts
import { onCall } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  newDocumentBaseFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from "../../lib";
import {
  buildEmployeeNumber,
  calculateProbationEndDate,
  requiresProbation,
  validateEmployeeInput,
} from "../../../../src/utils/employee";
import { getNextEmployeeSequence } from "./employeeIdSequence";
import type {
  EmploymentType,
  TaxStatus,
  Gender,
  Religion,
  MaritalStatus,
} from "../../../../src/types/employee.types";

interface CreateEmployeeInput {
  fullName: string;
  preferredName?: string;
  nik: string;
  npwp?: string;
  gender: Gender;
  birthDate: string; // ISO date
  nationality?: string;
  maritalStatus?: MaritalStatus;
  religion: Religion;
  phone: string;
  email: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  motherName: string;
  permanentAddress: string;
  domicileAddress: string;
  bpjsTk?: string;
  bpjsKesehatan?: string;
  personalTaxStatus: TaxStatus;
  positionId?: string;
  managerId?: string;
  departmentId: string;
  outletId: string;
  employmentType: EmploymentType;
  joinDate: string; // ISO date
  probationMonths?: number;
  contractEndDate?: string; // ISO date
  compensation?: {
    basicSalary: number;
    positionAllowance?: number;
    phoneAllowance?: number;
    transportationAllowance?: number;
    bankAccountName?: string;
    bankAccountNumber?: string;
  };
}

export const createEmployee = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request);
    requirePermission(user, PERMISSIONS.EMPLOYEES_CREATE);

    const input = (request.data ?? {}) as Partial<CreateEmployeeInput>;

    const validationErrors = validateEmployeeInput(input as never);
    if (validationErrors.length > 0) {
      throw new AppError(
        "invalid-argument",
        `Invalid employee data: ${validationErrors.join("; ")}`,
      );
    }
    // validateEmployeeInput narrows presence but not type — safe to assert non-partial from here.
    const data = input as CreateEmployeeInput;

    // PRD §9.1 validation rule: Join Date cannot be in the future.
    const joinDate = new Date(data.joinDate);
    if (joinDate.getTime() > Date.now()) {
      throw new AppError(
        "invalid-argument",
        "Join date cannot be in the future.",
      );
    }

    // hr.md §21: assigned manager must be an active employee.
    if (data.managerId) {
      const managerSnap = await db
        .collection(COLLECTIONS.EMPLOYEES)
        .doc(data.managerId)
        .get();
      if (
        !managerSnap.exists ||
        managerSnap.data()?.activeStatus !== "active"
      ) {
        throw new AppError(
          "failed-precondition",
          "Assigned manager must be an active employee.",
        );
      }
    }

    const sequence = await getNextEmployeeSequence(data.employmentType);
    const employeeNumber = buildEmployeeNumber(data.employmentType, sequence);

    const employeeRef = db.collection(COLLECTIONS.EMPLOYEES).doc();

    const probationFields = requiresProbation(data.employmentType)
      ? {
          probationMonths: data.probationMonths,
          probationEndDate: Timestamp.fromDate(
            calculateProbationEndDate(joinDate, data.probationMonths!),
          ),
          probationStatus: "pending" as const,
        }
      : {};

    await employeeRef.set({
      employeeNumber,
      fullName: data.fullName,
      preferredName: data.preferredName ?? null,
      nik: data.nik,
      npwp: data.npwp ?? null,
      gender: data.gender,
      birthDate: Timestamp.fromDate(new Date(data.birthDate)),
      nationality: data.nationality ?? null,
      maritalStatus: data.maritalStatus ?? null,
      religion: data.religion,
      phone: data.phone,
      email: data.email,
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      motherName: data.motherName,
      permanentAddress: data.permanentAddress,
      domicileAddress: data.domicileAddress,
      bpjsTk: data.bpjsTk ?? null,
      bpjsKesehatan: data.bpjsKesehatan ?? null,
      personalTaxStatus: data.personalTaxStatus,
      positionId: data.positionId ?? null,
      managerId: data.managerId ?? null,
      departmentId: data.departmentId,
      outletId: data.outletId,
      employmentType: data.employmentType,
      joinDate: Timestamp.fromDate(joinDate),
      ...probationFields,
      contractEndDate: data.contractEndDate
        ? Timestamp.fromDate(new Date(data.contractEndDate))
        : null,
      activeStatus: "active",
      resignationDate: null,
      resignationReason: null,
      disciplinaryType: null,
      disciplinaryStartPeriod: null,
      disciplinaryEndPeriod: null,
      recognitionType: null,
      recognitionPeriod: null,
      photoFileId: null,
      ...newDocumentBaseFields(user.uid, "active"),
    });

    if (data.compensation) {
      await employeeRef
        .collection("compensation")
        .doc("current")
        .set({
          basicSalary: data.compensation.basicSalary,
          positionAllowance: data.compensation.positionAllowance ?? null,
          phoneAllowance: data.compensation.phoneAllowance ?? null,
          transportationAllowance:
            data.compensation.transportationAllowance ?? null,
          bankAccountName: data.compensation.bankAccountName ?? null,
          bankAccountNumber: data.compensation.bankAccountNumber ?? null,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        });
    }

    await recordAuditEvent({
      eventType: "EmployeeCreated",
      category: "HR",
      module: "hr",
      resourceType: "employee",
      resourceId: employeeRef.id,
      action: "create",
      user,
      newValues: {
        employeeNumber,
        fullName: data.fullName,
        employmentType: data.employmentType,
      },
    });

    return successResponse(
      { employeeId: employeeRef.id, employeeNumber },
      "Employee created.",
    );
  } catch (error) {
    handleError(error);
  }
});
```

- [ ] **Step 3: Verify manually against the emulator**

Run: `firebase emulators:start --only functions,firestore`
Then, from the Emulator Suite UI's function-testing panel (or `curl` against the emulator's callable HTTP endpoint) call `createEmployee` with a payload matching `validInput` from Task 2's tests, authenticated as a user with `roleId: 'hrManager'`.
Expected: response `{ success: true, data: { employeeId: "...", employeeNumber: "N-0001" } }`; a new document appears under `employees` in the Emulator UI's Firestore tab with `probationEndDate` three calendar months after `joinDate`.

- [ ] **Step 4: Commit**

```bash
git add functions/src/hr/employees/employeeIdSequence.ts functions/src/hr/employees/createEmployee.ts
git commit -m "feat(hr): add createEmployee Cloud Function"
```

---

### Task 5: Cloud Functions `updateEmployee` + `updateEmployeeCompensation`

**Files:**

- Create: `functions/src/hr/employees/updateEmployee.ts`
- Create: `functions/src/hr/employees/updateEmployeeCompensation.ts`

**Interfaces:**

- Consumes: same `lib` exports as Task 4; `Employee`, `EmployeeCompensation` types from Task 1.
- Produces: `updateEmployee` onCall (general profile fields only), `updateEmployeeCompensation` onCall (separate function so the stricter `EMPLOYEES_READ_SENSITIVE`-equivalent write permission is enforced independently of general profile edits).

- [ ] **Step 1: Write `updateEmployee`**

Create `functions/src/hr/employees/updateEmployee.ts`:

```ts
import { onCall } from "firebase-functions/v2/https";
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  updatedFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from "../../lib";

// Fields updateEmployee is allowed to touch — deliberately excludes
// employeeNumber (immutable once issued), activeStatus/resignation*
// (archiveEmployee's job, Task 6), and anything under compensation
// (updateEmployeeCompensation's job).
const EDITABLE_FIELDS = [
  "fullName",
  "preferredName",
  "nik",
  "npwp",
  "gender",
  "birthDate",
  "nationality",
  "maritalStatus",
  "religion",
  "phone",
  "email",
  "emergencyContactName",
  "emergencyContactPhone",
  "motherName",
  "permanentAddress",
  "domicileAddress",
  "bpjsTk",
  "bpjsKesehatan",
  "personalTaxStatus",
  "positionId",
  "managerId",
  "departmentId",
  "outletId",
  "photoFileId",
] as const;

interface UpdateEmployeeInput {
  employeeId: string;
  updates: Partial<Record<(typeof EDITABLE_FIELDS)[number], unknown>>;
}

export const updateEmployee = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request);
    requirePermission(user, PERMISSIONS.EMPLOYEES_UPDATE);

    const { employeeId, updates } = (request.data ??
      {}) as Partial<UpdateEmployeeInput>;
    if (!employeeId || !updates || Object.keys(updates).length === 0) {
      throw new AppError(
        "invalid-argument",
        "employeeId and at least one field in updates are required.",
      );
    }

    const disallowed = Object.keys(updates).filter(
      (key) => !(EDITABLE_FIELDS as readonly string[]).includes(key),
    );
    if (disallowed.length > 0) {
      throw new AppError(
        "invalid-argument",
        `These fields cannot be updated here: ${disallowed.join(", ")}`,
      );
    }

    const employeeRef = db.collection(COLLECTIONS.EMPLOYEES).doc(employeeId);
    const employeeSnap = await employeeRef.get();
    if (!employeeSnap.exists) {
      throw new AppError("not-found", "Employee not found.");
    }

    if (updates.managerId) {
      const managerSnap = await db
        .collection(COLLECTIONS.EMPLOYEES)
        .doc(updates.managerId as string)
        .get();
      if (
        !managerSnap.exists ||
        managerSnap.data()?.activeStatus !== "active"
      ) {
        throw new AppError(
          "failed-precondition",
          "Assigned manager must be an active employee.",
        );
      }
    }

    await employeeRef.update({ ...updates, ...updatedFields(user.uid) });

    await recordAuditEvent({
      eventType: "EmployeeUpdated",
      category: "HR",
      module: "hr",
      resourceType: "employee",
      resourceId: employeeId,
      action: "update",
      user,
      newValues: updates,
    });

    return successResponse(undefined, "Employee updated.");
  } catch (error) {
    handleError(error);
  }
});
```

- [ ] **Step 2: Write `updateEmployeeCompensation`**

Create `functions/src/hr/employees/updateEmployeeCompensation.ts`:

```ts
import { onCall } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from "../../lib";

interface UpdateEmployeeCompensationInput {
  employeeId: string;
  basicSalary: number;
  positionAllowance?: number;
  phoneAllowance?: number;
  transportationAllowance?: number;
  bankAccountName?: string;
  bankAccountNumber?: string;
}

export const updateEmployeeCompensation = onCall(
  { region: REGION },
  async (request) => {
    try {
      const user = await requireActiveUser(request);
      // NFR-SE04 — narrower than general employee edit rights.
      requirePermission(user, PERMISSIONS.EMPLOYEES_READ_SENSITIVE);

      const input = (request.data ??
        {}) as Partial<UpdateEmployeeCompensationInput>;
      if (!input.employeeId || typeof input.basicSalary !== "number") {
        throw new AppError(
          "invalid-argument",
          "employeeId and basicSalary are required.",
        );
      }

      const employeeRef = db
        .collection(COLLECTIONS.EMPLOYEES)
        .doc(input.employeeId);
      const employeeSnap = await employeeRef.get();
      if (!employeeSnap.exists) {
        throw new AppError("not-found", "Employee not found.");
      }

      await employeeRef
        .collection("compensation")
        .doc("current")
        .set({
          basicSalary: input.basicSalary,
          positionAllowance: input.positionAllowance ?? null,
          phoneAllowance: input.phoneAllowance ?? null,
          transportationAllowance: input.transportationAllowance ?? null,
          bankAccountName: input.bankAccountName ?? null,
          bankAccountNumber: input.bankAccountNumber ?? null,
          updatedAt: Timestamp.now(),
          updatedBy: user.uid,
        });

      await recordAuditEvent({
        eventType: "EmployeeCompensationUpdated",
        category: "HR",
        module: "hr",
        resourceType: "employeeCompensation",
        resourceId: input.employeeId,
        action: "update",
        user,
        // Amounts deliberately excluded from the audit payload itself —
        // the audit entry proves *when* and *by whom*, not a second place
        // salary figures are readable from. Full before/after values are
        // reconstructable from Firestore, which is already hrManager/superAdmin-only.
        metadata: { employeeId: input.employeeId },
      });

      return successResponse(undefined, "Compensation updated.");
    } catch (error) {
      handleError(error);
    }
  },
);
```

- [ ] **Step 3: Verify manually against the emulator**

Run: `firebase emulators:start --only functions,firestore`
Call `updateEmployee` with `{ employeeId: <id from Task 4>, updates: { phone: '628111222333' } }` as `hrManager`.
Expected: `{ success: true }`; the employee doc's `phone` and `updatedAt` change; `updatedBy` matches the caller's uid.
Then call `updateEmployee` with an update key of `activeStatus` (not in `EDITABLE_FIELDS`).
Expected: rejected with `invalid-argument` — "These fields cannot be updated here: activeStatus".

- [ ] **Step 4: Commit**

```bash
git add functions/src/hr/employees/updateEmployee.ts functions/src/hr/employees/updateEmployeeCompensation.ts
git commit -m "feat(hr): add updateEmployee and updateEmployeeCompensation Cloud Functions"
```

---

### Task 6: Cloud Function `archiveEmployee`

**Files:**

- Create: `functions/src/hr/employees/archiveEmployee.ts`

**Interfaces:**

- Consumes: same `lib` exports as Task 4/5.
- Produces: `archiveEmployee` onCall handler.

- [ ] **Step 1: Write `archiveEmployee`**

Create `functions/src/hr/employees/archiveEmployee.ts`:

```ts
import { onCall } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requirePermission,
  recordAuditEvent,
  updatedFields,
  AppError,
  handleError,
  successResponse,
  PERMISSIONS,
} from "../../lib";

interface ArchiveEmployeeInput {
  employeeId: string;
  resignationDate: string; // ISO date
  resignationReason: string;
}

// PRD §9.1-F14 — soft-delete (deactivate) with a mandatory reason.
export const archiveEmployee = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request);
    requirePermission(user, PERMISSIONS.EMPLOYEES_DELETE);

    const { employeeId, resignationDate, resignationReason } = (request.data ??
      {}) as Partial<ArchiveEmployeeInput>;
    if (!employeeId || !resignationDate || !resignationReason?.trim()) {
      throw new AppError(
        "invalid-argument",
        "employeeId, resignationDate, and resignationReason are all required — deactivation requires a reason.",
      );
    }

    const employeeRef = db.collection(COLLECTIONS.EMPLOYEES).doc(employeeId);
    const employeeSnap = await employeeRef.get();
    if (!employeeSnap.exists) {
      throw new AppError("not-found", "Employee not found.");
    }
    if (employeeSnap.data()?.activeStatus === "inactive") {
      throw new AppError(
        "failed-precondition",
        "This employee is already inactive.",
      );
    }

    await employeeRef.update({
      activeStatus: "inactive",
      resignationDate: Timestamp.fromDate(new Date(resignationDate)),
      resignationReason,
      isArchived: true,
      ...updatedFields(user.uid),
    });

    await recordAuditEvent({
      eventType: "EmployeeArchived",
      category: "HR",
      module: "hr",
      resourceType: "employee",
      resourceId: employeeId,
      action: "delete",
      user,
      newValues: { resignationDate, resignationReason },
    });

    return successResponse(undefined, "Employee deactivated.");
  } catch (error) {
    handleError(error);
  }
});
```

_Note — reassignment of open tasks (PRD E01-US03 acceptance criterion "All active tasks assigned to this employee are flagged for reassignment"): deferred. That requires a `tasks` query scoped by `assignedTo == employeeId`'s linked `uid`, which doesn't exist as a resolvable relationship until the Recruitment/onboarding flow (Module 5) links `employees` docs to `users` docs. Tracking here rather than building it against data that doesn't exist yet._

- [ ] **Step 2: Verify manually against the emulator**

Call `archiveEmployee` with `{ employeeId, resignationDate: '2026-07-20', resignationReason: 'Relocating to Java' }`.
Expected: `{ success: true }`; employee's `activeStatus` becomes `'inactive'`, `isArchived` becomes `true`.
Call it again with the same `employeeId`.
Expected: rejected with `failed-precondition` — "This employee is already inactive."

- [ ] **Step 3: Commit**

```bash
git add functions/src/hr/employees/archiveEmployee.ts
git commit -m "feat(hr): add archiveEmployee Cloud Function"
```

---

### Task 7: Export Cloud Functions + client service layer

**Files:**

- Create: `functions/src/hr/employees/index.ts`
- Modify: `functions/src/index.ts`
- Create: `src/features/hr/services/employeeService.ts`

**Interfaces:**

- Consumes: `createEmployee`, `updateEmployee`, `updateEmployeeCompensation`, `archiveEmployee` from Tasks 4–6; `callFunction`, `getDocument`, `queryDocuments`, `subscribeToDocument`, `subscribeToCollection` from `src/services`; `Employee`, `EmployeeCompensation` types from Task 1.
- Produces: `employeeService.{createEmployee, updateEmployee, updateEmployeeCompensation, archiveEmployee, getEmployee, subscribeToEmployee, listEmployees, subscribeToEmployees, getEmployeeCompensation}` — Task 8's hooks call these directly.

- [ ] **Step 1: Barrel-export the HR employees Cloud Functions**

Create `functions/src/hr/employees/index.ts`:

```ts
export { createEmployee } from "./createEmployee";
export { updateEmployee } from "./updateEmployee";
export { updateEmployeeCompensation } from "./updateEmployeeCompensation";
export { archiveEmployee } from "./archiveEmployee";
```

- [ ] **Step 2: Wire into the functions entry point**

In `functions/src/index.ts`, add a new export block after the `HR: Appraisal` block:

```ts
// ---- HR: Employee Master Database ----
export {
  createEmployee,
  updateEmployee,
  updateEmployeeCompensation,
  archiveEmployee,
} from "./hr/employees";
```

- [ ] **Step 3: Write the client service**

Create `src/features/hr/services/employeeService.ts`:

```ts
import { orderBy, where, type QueryConstraint } from "firebase/firestore";
import { callFunction } from "@/services/api";
import {
  getDocument,
  queryDocuments,
  subscribeToDocument,
  subscribeToCollection,
} from "@/services/firestore";
import { COLLECTIONS } from "@/constants";
import type { Employee, EmployeeCompensation } from "@/types";
import type { Unsubscribe } from "firebase/firestore";

export interface CreateEmployeeInput {
  fullName: string;
  preferredName?: string;
  nik: string;
  npwp?: string;
  gender: Employee["gender"];
  birthDate: string;
  nationality?: string;
  maritalStatus?: Employee["maritalStatus"];
  religion: Employee["religion"];
  phone: string;
  email: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  motherName: string;
  permanentAddress: string;
  domicileAddress: string;
  bpjsTk?: string;
  bpjsKesehatan?: string;
  personalTaxStatus: Employee["personalTaxStatus"];
  positionId?: string;
  managerId?: string;
  departmentId: string;
  outletId: string;
  employmentType: Employee["employmentType"];
  joinDate: string;
  probationMonths?: number;
  contractEndDate?: string;
  compensation?: {
    basicSalary: number;
    positionAllowance?: number;
    phoneAllowance?: number;
    transportationAllowance?: number;
    bankAccountName?: string;
    bankAccountNumber?: string;
  };
}

export function createEmployee(
  input: CreateEmployeeInput,
): Promise<{ employeeId: string; employeeNumber: string }> {
  return callFunction("createEmployee", input);
}

export interface UpdateEmployeeInput {
  employeeId: string;
  updates: Partial<
    Pick<
      Employee,
      | "fullName"
      | "preferredName"
      | "nik"
      | "npwp"
      | "gender"
      | "birthDate"
      | "nationality"
      | "maritalStatus"
      | "religion"
      | "phone"
      | "email"
      | "emergencyContactName"
      | "emergencyContactPhone"
      | "motherName"
      | "permanentAddress"
      | "domicileAddress"
      | "bpjsTk"
      | "bpjsKesehatan"
      | "personalTaxStatus"
      | "positionId"
      | "managerId"
      | "departmentId"
      | "outletId"
      | "photoFileId"
    >
  >;
}

export function updateEmployee(input: UpdateEmployeeInput): Promise<void> {
  return callFunction("updateEmployee", input);
}

export interface UpdateEmployeeCompensationInput {
  employeeId: string;
  basicSalary: number;
  positionAllowance?: number;
  phoneAllowance?: number;
  transportationAllowance?: number;
  bankAccountName?: string;
  bankAccountNumber?: string;
}

export function updateEmployeeCompensation(
  input: UpdateEmployeeCompensationInput,
): Promise<void> {
  return callFunction("updateEmployeeCompensation", input);
}

export function archiveEmployee(input: {
  employeeId: string;
  resignationDate: string;
  resignationReason: string;
}): Promise<void> {
  return callFunction("archiveEmployee", input);
}

export function getEmployee(employeeId: string): Promise<Employee | null> {
  return getDocument<Employee>(COLLECTIONS.EMPLOYEES, employeeId);
}

export function subscribeToEmployee(
  employeeId: string,
  onChange: (employee: Employee | null) => void,
): Unsubscribe {
  return subscribeToDocument<Employee>(
    COLLECTIONS.EMPLOYEES,
    employeeId,
    onChange,
  );
}

/** Rules deny cross-outlet reads for non-elevated roles — Security Rules filter this server-side regardless of what's queried. */
export function getEmployeeCompensation(
  employeeId: string,
): Promise<EmployeeCompensation | null> {
  return getDocument<EmployeeCompensation>(
    `${COLLECTIONS.EMPLOYEES}/${employeeId}/compensation`,
    "current",
  );
}

export interface ListEmployeesFilters {
  outletId?: string;
  departmentId?: string;
  activeStatus?: Employee["activeStatus"];
}

function buildFilterConstraints(
  filters: ListEmployeesFilters,
): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];
  if (filters.outletId)
    constraints.push(where("outletId", "==", filters.outletId));
  if (filters.departmentId)
    constraints.push(where("departmentId", "==", filters.departmentId));
  if (filters.activeStatus)
    constraints.push(where("activeStatus", "==", filters.activeStatus));
  constraints.push(orderBy("fullName", "asc"));
  return constraints;
}

/** One-shot — for exports (FR 9.1-F04, Should-Have bulk actions) that don't need live updates. */
export function listEmployees(
  filters: ListEmployeesFilters = {},
): Promise<Employee[]> {
  return queryDocuments<Employee>(
    COLLECTIONS.EMPLOYEES,
    buildFilterConstraints(filters),
  );
}

export function subscribeToEmployees(
  filters: ListEmployeesFilters,
  onChange: (employees: Employee[]) => void,
): Unsubscribe {
  return subscribeToCollection<Employee>(
    COLLECTIONS.EMPLOYEES,
    buildFilterConstraints(filters),
    onChange,
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/src/hr/employees/index.ts functions/src/index.ts src/features/hr/services/employeeService.ts
git commit -m "feat(hr): export employee Cloud Functions and add client service layer"
```

---

### Task 8: Hooks + EmployeeForm

**Files:**

- Create: `src/features/hr/hooks/useEmployees.ts`
- Create: `src/features/hr/hooks/useEmployee.ts`
- Create: `src/features/hr/components/employee/EmployeeForm.tsx`

**Interfaces:**

- Consumes: `employeeService` from Task 7; `useFirestoreQuery`, `useFirestoreDoc`, `useAsync` from `src/hooks`; `Employee` type from Task 1.
- Produces: `useEmployees(filters)`, `useEmployee(employeeId)`, `<EmployeeForm onSubmit initialValues? />` — Task 10's pages compose all three.

- [ ] **Step 1: Write `useEmployees`**

Create `src/features/hr/hooks/useEmployees.ts`:

```ts
import { where, orderBy } from "firebase/firestore";
import { useFirestoreQuery } from "@/hooks";
import { COLLECTIONS } from "@/constants";
import type { Employee } from "@/types";
import type { ListEmployeesFilters } from "@/features/hr/services/employeeService";

/**
 * Real-time list, matching FR 9.1-F04 ("real-time" wasn't explicit in the
 * PRD for the list view specifically, but every other read in this codebase
 * defaults to live per ARCHITECTURE.md §20 — one-shot is the exception, not
 * the rule, and listEmployees() in the service layer covers that exception.
 */
export function useEmployees(filters: ListEmployeesFilters = {}) {
  const constraints = [
    ...(filters.outletId ? [where("outletId", "==", filters.outletId)] : []),
    ...(filters.departmentId
      ? [where("departmentId", "==", filters.departmentId)]
      : []),
    ...(filters.activeStatus
      ? [where("activeStatus", "==", filters.activeStatus)]
      : []),
    orderBy("fullName", "asc"),
  ];

  return useFirestoreQuery<Employee>(COLLECTIONS.EMPLOYEES, constraints, [
    filters.outletId,
    filters.departmentId,
    filters.activeStatus,
  ]);
}
```

- [ ] **Step 2: Write `useEmployee`**

Create `src/features/hr/hooks/useEmployee.ts`:

```ts
import { useFirestoreDoc } from "@/hooks";
import { COLLECTIONS } from "@/constants";
import type { Employee } from "@/types";

export function useEmployee(employeeId: string | undefined) {
  return useFirestoreDoc<Employee>(COLLECTIONS.EMPLOYEES, employeeId);
}
```

- [ ] **Step 3: Write `EmployeeForm`**

Create `src/features/hr/components/employee/EmployeeForm.tsx`:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYMENT_TYPES_WITH_PROBATION,
} from "@/types/employee.types";
import type { EmploymentType } from "@/types/employee.types";

const employeeFormSchema = z
  .object({
    fullName: z.string().min(1, "Full name is required"),
    preferredName: z.string().optional(),
    nik: z
      .string()
      .min(16, "NIK must be 16 digits")
      .max(16, "NIK must be 16 digits"),
    npwp: z.string().optional(),
    gender: z.enum(["male", "female"]),
    birthDate: z.string().min(1, "Birth date is required"),
    nationality: z.string().optional(),
    maritalStatus: z
      .enum(["single", "married", "divorced", "widowed"])
      .optional(),
    religion: z.enum(["hindu", "christian", "muslim"]),
    phone: z.string().min(9, "Phone number looks too short"),
    email: z.string().email("Enter a valid email"),
    emergencyContactName: z.string().min(1, "Required"),
    emergencyContactPhone: z.string().min(9, "Phone number looks too short"),
    motherName: z.string().min(1, "Mother's name is required"),
    permanentAddress: z.string().min(1, "Required"),
    domicileAddress: z.string().min(1, "Required"),
    bpjsTk: z.string().optional(),
    bpjsKesehatan: z.string().optional(),
    personalTaxStatus: z.enum([
      "TK0",
      "TK1",
      "TK2",
      "TK3",
      "K0",
      "K1",
      "K2",
      "K3",
    ]),
    departmentId: z.string().min(1, "Department is required"),
    outletId: z.string().min(1, "Outlet is required"),
    employmentType: z.enum([
      "permanent",
      "fixedTerm",
      "freelance",
      "bod",
      "dailyWorker",
      "ojt",
    ]),
    joinDate: z.string().min(1, "Join date is required"),
    probationMonths: z.coerce.number().optional(),
    contractEndDate: z.string().optional(),
    basicSalary: z.coerce.number().min(0).optional(),
  })
  .refine(
    (val) =>
      !EMPLOYMENT_TYPES_WITH_PROBATION.includes(
        val.employmentType as EmploymentType,
      ) || Boolean(val.probationMonths),
    {
      message: "Probation months is required for this employment type",
      path: ["probationMonths"],
    },
  )
  .refine(
    (val) => val.employmentType !== "fixedTerm" || Boolean(val.contractEndDate),
    {
      message: "Contract end date is required for fixed-term employment",
      path: ["contractEndDate"],
    },
  );

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export interface EmployeeFormProps {
  initialValues?: Partial<EmployeeFormValues>;
  onSubmit: (values: EmployeeFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function EmployeeForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel = "Save Employee",
}: EmployeeFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: initialValues,
  });

  const employmentType = watch("employmentType");
  const showProbation =
    employmentType &&
    EMPLOYMENT_TYPES_WITH_PROBATION.includes(employmentType as EmploymentType);
  const showContractEndDate = employmentType === "fixedTerm";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">Full Name</Label>
          <Input id="fullName" {...register("fullName")} />
          {errors.fullName && (
            <p className="text-sm text-destructive">
              {errors.fullName.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="preferredName">Preferred Name</Label>
          <Input id="preferredName" {...register("preferredName")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nik">NIK</Label>
          <Input id="nik" maxLength={16} {...register("nik")} />
          {errors.nik && (
            <p className="text-sm text-destructive">{errors.nik.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="npwp">NPWP (optional)</Label>
          <Input id="npwp" {...register("npwp")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gender">Gender</Label>
          <Select
            onValueChange={(v) =>
              setValue("gender", v as EmployeeFormValues["gender"])
            }
          >
            <SelectTrigger id="gender">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && (
            <p className="text-sm text-destructive">{errors.gender.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="birthDate">Birth Date</Label>
          <Input id="birthDate" type="date" {...register("birthDate")} />
          {errors.birthDate && (
            <p className="text-sm text-destructive">
              {errors.birthDate.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="religion">Religion</Label>
          <Select
            onValueChange={(v) =>
              setValue("religion", v as EmployeeFormValues["religion"])
            }
          >
            <SelectTrigger id="religion">
              <SelectValue placeholder="Select religion" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hindu">Hindu</SelectItem>
              <SelectItem value="christian">Christian</SelectItem>
              <SelectItem value="muslim">Muslim</SelectItem>
            </SelectContent>
          </Select>
          {errors.religion && (
            <p className="text-sm text-destructive">
              {errors.religion.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
          <Input
            id="emergencyContactName"
            {...register("emergencyContactName")}
          />
          {errors.emergencyContactName && (
            <p className="text-sm text-destructive">
              {errors.emergencyContactName.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
          <Input
            id="emergencyContactPhone"
            {...register("emergencyContactPhone")}
          />
          {errors.emergencyContactPhone && (
            <p className="text-sm text-destructive">
              {errors.emergencyContactPhone.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="motherName">Mother's Name</Label>
          <Input id="motherName" {...register("motherName")} />
          {errors.motherName && (
            <p className="text-sm text-destructive">
              {errors.motherName.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="permanentAddress">Permanent Address</Label>
          <Input id="permanentAddress" {...register("permanentAddress")} />
          {errors.permanentAddress && (
            <p className="text-sm text-destructive">
              {errors.permanentAddress.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="domicileAddress">Domicile Address</Label>
          <Input id="domicileAddress" {...register("domicileAddress")} />
          {errors.domicileAddress && (
            <p className="text-sm text-destructive">
              {errors.domicileAddress.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="personalTaxStatus">Tax Status (PPh21)</Label>
          <Select
            onValueChange={(v) =>
              setValue(
                "personalTaxStatus",
                v as EmployeeFormValues["personalTaxStatus"],
              )
            }
          >
            <SelectTrigger id="personalTaxStatus">
              <SelectValue placeholder="Select tax status" />
            </SelectTrigger>
            <SelectContent>
              {["TK0", "TK1", "TK2", "TK3", "K0", "K1", "K2", "K3"].map(
                (status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          {errors.personalTaxStatus && (
            <p className="text-sm text-destructive">
              {errors.personalTaxStatus.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="employmentType">Employment Type</Label>
          <Select
            onValueChange={(v) =>
              setValue("employmentType", v as EmploymentType)
            }
          >
            <SelectTrigger id="employmentType">
              <SelectValue placeholder="Select employment type" />
            </SelectTrigger>
            <SelectContent>
              {(
                Object.entries(EMPLOYMENT_TYPE_LABELS) as [
                  EmploymentType,
                  string,
                ][]
              ).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.employmentType && (
            <p className="text-sm text-destructive">
              {errors.employmentType.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="joinDate">Join Date</Label>
          <Input id="joinDate" type="date" {...register("joinDate")} />
          {errors.joinDate && (
            <p className="text-sm text-destructive">
              {errors.joinDate.message}
            </p>
          )}
        </div>

        {showProbation && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="probationMonths">Probation Period (months)</Label>
            <Input
              id="probationMonths"
              type="number"
              min={0}
              {...register("probationMonths")}
            />
            {errors.probationMonths && (
              <p className="text-sm text-destructive">
                {errors.probationMonths.message}
              </p>
            )}
          </div>
        )}

        {showContractEndDate && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contractEndDate">Contract End Date</Label>
            <Input
              id="contractEndDate"
              type="date"
              {...register("contractEndDate")}
            />
            {errors.contractEndDate && (
              <p className="text-sm text-destructive">
                {errors.contractEndDate.message}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="basicSalary">
            Basic Salary (optional here — HR/Super Admin only)
          </Label>
          <Input
            id="basicSalary"
            type="number"
            min={0}
            {...register("basicSalary")}
          />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/hr/hooks/useEmployees.ts src/features/hr/hooks/useEmployee.ts src/features/hr/components/employee/EmployeeForm.tsx
git commit -m "feat(hr): add employee hooks and EmployeeForm component"
```

---

### Task 9: `EmployeeTable` + `EmployeeStatusBadge`

**Files:**

- Create: `src/features/hr/components/employee/EmployeeStatusBadge.tsx`
- Create: `src/features/hr/components/employee/EmployeeTable.tsx`
- Create: `src/features/hr/components/employee/index.ts`

**Interfaces:**

- Consumes: `Employee`, `EMPLOYMENT_TYPE_LABELS` from Task 1; shadcn `Badge`, `Table` primitives; `Input` for the search box.
- Produces: `<EmployeeStatusBadge status />`, `<EmployeeTable employees onRowClick />` — Task 10's `EmployeeListPage` composes both.

- [ ] **Step 1: Write `EmployeeStatusBadge`**

Create `src/features/hr/components/employee/EmployeeStatusBadge.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import type { Employee } from "@/types";

const STATUS_STYLES: Record<Employee["activeStatus"], string> = {
  active: "bg-primary/10 text-primary",
  inactive: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<Employee["activeStatus"], string> = {
  active: "Active",
  inactive: "Inactive",
};

export function EmployeeStatusBadge({
  status,
}: {
  status: Employee["activeStatus"];
}) {
  return (
    <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>
  );
}
```

- [ ] **Step 2: Write `EmployeeTable`**

Create `src/features/hr/components/employee/EmployeeTable.tsx`:

```tsx
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmployeeStatusBadge } from "./EmployeeStatusBadge";
import { EMPLOYMENT_TYPE_LABELS } from "@/types/employee.types";
import type { Employee } from "@/types";

export interface EmployeeTableProps {
  employees: Employee[];
  onRowClick: (employee: Employee) => void;
  loading?: boolean;
}

type SortField = "fullName" | "joinDate" | "departmentId";

/** FR 9.1-F04 (search), F05 (filter — composed via useEmployees' constraints upstream), F06 (sort). */
export function EmployeeTable({
  employees,
  onRowClick,
  loading,
}: EmployeeTableProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("fullName");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matches = term
      ? employees.filter(
          (e) =>
            e.fullName.toLowerCase().includes(term) ||
            e.employeeNumber.toLowerCase().includes(term) ||
            (e.positionId ?? "").toLowerCase().includes(term),
        )
      : employees;

    return [...matches].sort((a, b) => {
      if (sortField === "joinDate")
        return b.joinDate.toMillis() - a.joinDate.toMillis();
      if (sortField === "departmentId")
        return a.departmentId.localeCompare(b.departmentId);
      return a.fullName.localeCompare(b.fullName);
    });
  }, [employees, search, sortField]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by name, employee number, or position…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={sortField}
          onChange={(e) => setSortField(e.target.value as SortField)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="fullName">Sort: Name</option>
          <option value="joinDate">Sort: Join Date</option>
          <option value="departmentId">Sort: Department</option>
        </select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee No.</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Outlet</TableHead>
            <TableHead>Employment Type</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center text-muted-foreground"
              >
                Loading…
              </TableCell>
            </TableRow>
          )}
          {!loading && filtered.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center text-muted-foreground"
              >
                No employees match your search.
              </TableCell>
            </TableRow>
          )}
          {filtered.map((employee) => (
            <TableRow
              key={employee.id}
              onClick={() => onRowClick(employee)}
              className="cursor-pointer hover:bg-border/40"
            >
              <TableCell className="font-mono text-sm">
                {employee.employeeNumber}
              </TableCell>
              <TableCell>{employee.fullName}</TableCell>
              <TableCell>{employee.departmentId}</TableCell>
              <TableCell>{employee.outletId}</TableCell>
              <TableCell>
                {EMPLOYMENT_TYPE_LABELS[employee.employmentType]}
              </TableCell>
              <TableCell>
                <EmployeeStatusBadge status={employee.activeStatus} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 3: Barrel-export the employee components**

Create `src/features/hr/components/employee/index.ts`:

```ts
export {
  EmployeeForm,
  type EmployeeFormProps,
  type EmployeeFormValues,
} from "./EmployeeForm";
export { EmployeeTable, type EmployeeTableProps } from "./EmployeeTable";
export { EmployeeStatusBadge } from "./EmployeeStatusBadge";
```

- [ ] **Step 4: Commit**

```bash
git add src/features/hr/components/employee/EmployeeStatusBadge.tsx src/features/hr/components/employee/EmployeeTable.tsx src/features/hr/components/employee/index.ts
git commit -m "feat(hr): add EmployeeTable and EmployeeStatusBadge components"
```

---

### Task 10: Pages + route wiring

**Files:**

- Create: `src/features/hr/pages/EmployeeListPage.tsx`
- Create: `src/features/hr/pages/EmployeeCreatePage.tsx`
- Create: `src/features/hr/pages/EmployeeProfilePage.tsx`
- Create: `src/features/hr/pages/EmployeeEditPage.tsx`
- Modify: `src/routes/routes.tsx`

**Interfaces:**

- Consumes: everything from Tasks 7–9, plus `FileUpload`/`FileList` (existing File Storage components, same pattern as `AppraisalReviewPage.tsx`), `usePermissions` from `src/hooks`.
- Produces: four routed pages, replacing the HR `ModulePlaceholder` index route.

- [ ] **Step 1: Write `EmployeeListPage`**

Create `src/features/hr/pages/EmployeeListPage.tsx`:

```tsx
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEmployees } from "@/features/hr/hooks/useEmployees";
import { EmployeeTable } from "@/features/hr/components/employee";
import { usePermissions } from "@/hooks";
import { PERMISSIONS } from "@/constants";
import type { Employee } from "@/types";

export function EmployeeListPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { data: employees, loading } = useEmployees({ activeStatus: "active" });

  const handleRowClick = (employee: Employee) =>
    navigate(`/hr/employees/${employee.id}`);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Employees</h1>
          <p className="text-sm text-muted-foreground">
            {employees.length} active employees
          </p>
        </div>
        {can(PERMISSIONS.EMPLOYEES_CREATE) && (
          <Button onClick={() => navigate("/hr/employees/new")}>
            Add Employee
          </Button>
        )}
      </div>

      <EmployeeTable
        employees={employees}
        onRowClick={handleRowClick}
        loading={loading}
      />
    </div>
  );
}
```

- [ ] **Step 2: Write `EmployeeCreatePage`**

Create `src/features/hr/pages/EmployeeCreatePage.tsx`:

```tsx
import { useNavigate } from "react-router-dom";
import { useAsync } from "@/hooks";
import { useToast } from "@/hooks";
import {
  EmployeeForm,
  type EmployeeFormValues,
} from "@/features/hr/components/employee";
import * as employeeService from "@/features/hr/services/employeeService";

export function EmployeeCreatePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createAsync = useAsync(employeeService.createEmployee);

  const handleSubmit = async (values: EmployeeFormValues) => {
    const { basicSalary, ...profileFields } = values;
    const result = await createAsync.execute({
      ...profileFields,
      compensation: basicSalary ? { basicSalary } : undefined,
    });
    toast({
      title: "Employee created",
      description: `${result.employeeNumber} — ${values.fullName}`,
    });
    navigate(`/hr/employees/${result.employeeId}`);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Add Employee</h1>
      {createAsync.error && (
        <p className="text-sm text-destructive">{createAsync.error.message}</p>
      )}
      <EmployeeForm
        onSubmit={handleSubmit}
        isSubmitting={createAsync.loading}
        submitLabel="Create Employee"
      />
    </div>
  );
}
```

- [ ] **Step 3: Write `EmployeeProfilePage`**

Create `src/features/hr/pages/EmployeeProfilePage.tsx`:

```tsx
import { useParams } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEmployee } from "@/features/hr/hooks/useEmployee";
import { EmployeeStatusBadge } from "@/features/hr/components/employee";
import { EMPLOYMENT_TYPE_LABELS } from "@/types/employee.types";
import { FileUpload, FileList } from "@/components/shared";
import { usePermissions } from "@/hooks";
import { PERMISSIONS } from "@/constants";

export function EmployeeProfilePage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { data: employee, loading } = useEmployee(employeeId);

  if (loading) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  if (!employee) {
    return <p className="text-muted-foreground">Employee not found.</p>;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{employee.fullName}</h1>
          <p className="font-mono text-sm text-muted-foreground">
            {employee.employeeNumber}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <EmployeeStatusBadge status={employee.activeStatus} />
          {can(PERMISSIONS.EMPLOYEES_UPDATE) && (
            <Button
              variant="outline"
              onClick={() => navigate(`/hr/employees/${employee.id}/edit`)}
            >
              Edit
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employment</CardTitle>
          <CardDescription>
            Position, department, and contract details.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Employment Type</p>
            <p>{EMPLOYMENT_TYPE_LABELS[employee.employmentType]}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Department</p>
            <p>{employee.departmentId}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Outlet</p>
            <p>{employee.outletId}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Join Date</p>
            <p>{employee.joinDate.toDate().toLocaleDateString()}</p>
          </div>
          {employee.probationEndDate && (
            <div>
              <p className="text-muted-foreground">Probation Ends</p>
              <p>{employee.probationEndDate.toDate().toLocaleDateString()}</p>
            </div>
          )}
          {employee.contractEndDate && (
            <div>
              <p className="text-muted-foreground">Contract Ends</p>
              <p>{employee.contractEndDate.toDate().toLocaleDateString()}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p>{employee.phone}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p>{employee.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Emergency Contact</p>
            <p>
              {employee.emergencyContactName} — {employee.emergencyContactPhone}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Same File Storage pattern as AppraisalReviewPage.tsx — no employee-specific upload logic needed. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents</CardTitle>
          <CardDescription>
            ID card, contracts, certificates, and other supporting documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FileUpload
            module="hr"
            resourceType="employee"
            resourceId={employee.id}
          />
          <FileList files={[]} />
        </CardContent>
      </Card>
    </div>
  );
}
```

_Note: `<FileList files={[]} />` is a placeholder for wiring `fileService.listFiles({ module: 'hr', resourceType: 'employee', resourceId: employee.id })` — that query helper doesn't exist yet in `src/services/shared/fileService.ts` per the current codebase (only `deleteFile`/`createFileMetadata` were found). Flagging as a one-line follow-up in Task 10 Step 5 rather than silently guessing its interface._

- [ ] **Step 4: Write `EmployeeEditPage`**

Create `src/features/hr/pages/EmployeeEditPage.tsx`:

```tsx
import { useParams, useNavigate } from "react-router-dom";
import { useAsync, useToast } from "@/hooks";
import { useEmployee } from "@/features/hr/hooks/useEmployee";
import {
  EmployeeForm,
  type EmployeeFormValues,
} from "@/features/hr/components/employee";
import * as employeeService from "@/features/hr/services/employeeService";

export function EmployeeEditPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: employee, loading } = useEmployee(employeeId);
  const updateAsync = useAsync(employeeService.updateEmployee);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (!employee || !employeeId)
    return <p className="text-muted-foreground">Employee not found.</p>;

  const handleSubmit = async (values: EmployeeFormValues) => {
    const {
      basicSalary: _basicSalary,
      employmentType: _employmentType,
      joinDate: _joinDate,
      probationMonths: _probationMonths,
      contractEndDate: _contractEndDate,
      ...editableFields
    } = values;
    await updateAsync.execute({ employeeId, updates: editableFields });
    toast({ title: "Employee updated", description: values.fullName });
    navigate(`/hr/employees/${employeeId}`);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Edit {employee.fullName}</h1>
      {updateAsync.error && (
        <p className="text-sm text-destructive">{updateAsync.error.message}</p>
      )}
      <EmployeeForm
        initialValues={{
          ...employee,
          birthDate: employee.birthDate.toDate().toISOString().slice(0, 10),
          joinDate: employee.joinDate.toDate().toISOString().slice(0, 10),
          contractEndDate: employee.contractEndDate
            ?.toDate()
            .toISOString()
            .slice(0, 10),
        }}
        onSubmit={handleSubmit}
        isSubmitting={updateAsync.loading}
        submitLabel="Save Changes"
      />
    </div>
  );
}
```

_Note: `updateEmployee` (Task 5) intentionally rejects `employmentType`/`joinDate`/`probationMonths`/`contractEndDate` — those require the probation/contract-end recalculation logic that belongs to Module 3 (Contract & Probation Tracker), not a plain field edit. `EmployeeEditPage` strips them from the payload accordingly rather than sending fields the Cloud Function will reject; the fields still render (disabled would be a follow-up UX polish) so HR can see current values while editing everything else._

- [ ] **Step 5: Wire routes**

In `src/routes/routes.tsx`, replace the `hr` route block:

```tsx
import { EmployeeListPage } from "@/features/hr/pages/EmployeeListPage";
import { EmployeeCreatePage } from "@/features/hr/pages/EmployeeCreatePage";
import { EmployeeProfilePage } from "@/features/hr/pages/EmployeeProfilePage";
import { EmployeeEditPage } from "@/features/hr/pages/EmployeeEditPage";
```

```tsx
          {
            path: 'hr',
            children: [
              { index: true, element: <EmployeeListPage /> },
              { path: 'employees', element: <EmployeeListPage /> },
              { path: 'employees/new', element: <EmployeeCreatePage /> },
              { path: 'employees/:employeeId', element: <EmployeeProfilePage /> },
              { path: 'employees/:employeeId/edit', element: <EmployeeEditPage /> },
              { path: 'appraisals/:appraisalId', element: <AppraisalReviewPage /> },
            ],
          },
```

Wrap the `employees/new` and `employees/:employeeId/edit` routes with `RoleRoute` (already used elsewhere in the router per `src/routes/RoleRoute.tsx`) gated on `PERMISSIONS.EMPLOYEES_CREATE` / `PERMISSIONS.EMPLOYEES_UPDATE` respectively, matching the pattern other protected sub-routes use.

- [ ] **Step 6: Manual verification**

Run: `npm run dev` (and `firebase emulators:start` in a second terminal if not already running against the emulator).
Log in as a seeded `hrManager` user, navigate to `/hr`.
Expected: employee list loads (empty state initially), "Add Employee" button visible. Create an employee through the form; expect redirect to its profile page showing the generated `employeeNumber`. Log in as a `kitchenLeader` seeded to a different outlet than the new employee; navigate to `/hr`.
Expected: the new employee does not appear (Security Rule from Task 3 scopes the read).

- [ ] **Step 7: Commit**

```bash
git add src/features/hr/pages/EmployeeListPage.tsx src/features/hr/pages/EmployeeCreatePage.tsx src/features/hr/pages/EmployeeProfilePage.tsx src/features/hr/pages/EmployeeEditPage.tsx src/routes/routes.tsx
git commit -m "feat(hr): add employee pages and wire routes"
```

---

## Self-Review

**Spec coverage** — FR 9.1-F01 (profiles) ✅ Task 4; F02 (ID generation) ✅ Task 2/4; F03 (server-side validation) ✅ Task 2/4; F04 (search) ✅ Task 9; F05 (filter) ✅ Task 7/8; F06 (sort) ✅ Task 9; F07 (profile page) ✅ Task 10; F08 (status change timestamps) ✅ via `updatedAt`/audit log; F09 (tenure/probation auto-calc) ✅ Task 2/4; F10/F11 (expiry flags) — explicitly deferred to Module 3 per PRD §A.2; F12 (bulk CSV) — explicitly deferred, Should-Have; F13 (photo storage) ✅ `photoFileId` + File Storage Service; F14 (soft-delete with reason) ✅ Task 6; F15 (change history) ✅ `auditLogs`, not a bespoke array. NFR-SE04 (salary restriction) ✅ Task 1/3/5 compensation split.

**Placeholder scan** — one intentional flag left in Task 10 (`FileList files={[]}`) rather than fabricating a `fileService.listFiles` signature that doesn't exist in the codebase yet; this is a surfaced gap, not a hidden placeholder, and doesn't block the rest of the module.

**Type consistency** — `Employee`/`EmployeeCompensation` (Task 1) → used identically in Cloud Functions (Tasks 4–6), service layer (Task 7), hooks (Task 8), and components (Tasks 8–10). `EmploymentType`/`EMPLOYMENT_TYPE_LABELS`/`EMPLOYMENT_TYPES_WITH_PROBATION` names match across `types/employee.types.ts`, `utils/employee.ts`, and `EmployeeForm.tsx`. `buildEmployeeNumber`/`calculateProbationEndDate`/`requiresProbation`/`validateEmployeeInput` signatures match between their Task 2 definition, Task 2 tests, and Task 4 usage.

---

## Execution Handoff

Plan complete. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session, batch execution with checkpoints for review.
