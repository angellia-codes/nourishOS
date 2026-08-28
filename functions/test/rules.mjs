/**
 * firestore.rules tests — the read half of RBAC, which is the ONLY thing
 * standing between an outlet manager and another outlet's payroll.
 *
 *   npm run test:rules          # starts the Firestore emulator, runs this, tears down
 *
 * or, against an emulator you already have running:
 *
 *   node --test functions/test/rules.mjs
 *
 * NOT part of `npm test`: this needs the Firestore emulator (and therefore a
 * JVM), where everything in `*.test.mjs` is pure. Hence the bare `.mjs` name —
 * see functions/test/README.md for the two tiers.
 *
 * No dependency, and deliberately not @firebase/rules-unit-testing: the
 * Firestore emulator accepts an UNSIGNED JWT as a bearer token, so custom
 * claims ({role, departmentId, outletId} — the ones syncUserClaims.ts keeps in
 * sync) can be minted here directly. That means no Auth emulator either, which
 * matters on a low-RAM machine. `Authorization: Bearer owner` bypasses rules
 * and is how the fixtures are seeded; any other bearer token IS rules-enforced,
 * so a denied read comes back 403 and an allowed-but-missing one comes back
 * 404. Same REST approach every emulator script in this folder already uses.
 *
 * What this does NOT cover: `list` (query) evaluation. Rules validate a query
 * rather than filtering it, so several rules here are written to be provable
 * against a client query (payslips' isIssued boolean, announcements'
 * audienceUids). Those get-level assertions are pinned below; the query-level
 * ones are not, and that is the obvious next layer.
 */
import { describe, test, before } from 'node:test'
import assert from 'node:assert/strict'

const PROJECT = process.env.GCLOUD_PROJECT ?? 'demo-nourishos'
const HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
const BASE = `http://${HOST}/v1/projects/${PROJECT}/databases/(default)/documents`
const ADMIN = `http://${HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`

// ---------------------------------------------------------------------------
// REST plumbing
// ---------------------------------------------------------------------------

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')

/** An unsigned token carrying the claims firestore.rules reads. */
function mintToken(uid, claims) {
  const now = Math.floor(Date.now() / 1000)
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
    iss: `https://securetoken.google.com/${PROJECT}`,
    aud: PROJECT,
    auth_time: now,
    user_id: uid,
    sub: uid,
    iat: now,
    exp: now + 3600,
    firebase: { identities: {}, sign_in_provider: 'custom' },
    ...claims,
  })}.`
}

function toValue(value) {
  if (value === null) return { nullValue: null }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  }
  if (typeof value === 'string') return { stringValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } }
  return { mapValue: { fields: toFields(value) } }
}

const toFields = (data) => Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toValue(v)]))

async function request(method, path, token, body) {
  const response = await fetch(`${BASE}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return response.status
}

/** Seeds through the owner token, which bypasses rules entirely. */
async function seed(path, data) {
  const status = await request('PATCH', path, 'owner', { fields: toFields(data) })
  if (status !== 200) throw new Error(`seeding ${path} failed with ${status}`)
}

const read = (user, path) => request('GET', path, user.token)
const write = (user, path) => request('PATCH', path, user.token, { fields: toFields({ tampered: true }) })

/**
 * 200 = allowed and the document exists. 403 = denied by rules. A 404 would
 * mean the rule allowed the read but the fixture is missing, which is a broken
 * test rather than a passing one — so it is called out rather than folded in.
 */
async function assertAllowed(user, path) {
  const status = await read(user, path)
  if (status === 404) assert.fail(`${user.label} -> ${path}: rule allowed it but the fixture is missing (404)`)
  assert.equal(status, 200, `${user.label} should READ ${path}`)
}

async function assertDenied(user, path) {
  const status = await read(user, path)
  if (status === 404) assert.fail(`${user.label} -> ${path}: got 404, so the fixture is missing and this proves nothing`)
  assert.equal(status, 403, `${user.label} must NOT read ${path}`)
}

// ---------------------------------------------------------------------------
// The cast. Claims mirror what syncUserClaims.ts writes.
// ---------------------------------------------------------------------------

const user = (label, uid, role, departmentId, outletId) => ({
  label,
  uid,
  token: mintToken(uid, { role, departmentId, outletId }),
})

const HR = user('hrManager', 'uid-hr', 'hrManager', 'human_resources', 'boh_nourish_group')
const GM = user('generalManager', 'uid-gm', 'generalManager', 'admin_general', 'boh_nourish_group')
const DIRECTOR = user('director', 'uid-dir', 'director', 'admin_general', 'boh_nourish_group')
const SUPER = user('superAdmin', 'uid-sa', 'superAdmin', 'admin_general', 'boh_nourish_group')
const FINANCE = user('finance', 'uid-fin', 'finance', 'finance_accounting', 'boh_nourish_group')
const ENGINEERING = user('engineering', 'uid-eng', 'engineering', 'engineering_pomec', 'boh_nourish_group')
// Two kitchen leaders at different outlets, and a bar leader at the same outlet
// as the first — between them they separate outlet scoping from department
// scoping, which several rules use for different things.
const KITCHEN_ULU = user('kitchenLeader@uluwatu', 'uid-kl-ulu', 'kitchenLeader', 'kitchen', 'nourish_uluwatu')
const KITCHEN_UNG = user('kitchenLeader@ungasan', 'uid-kl-ung', 'kitchenLeader', 'kitchen', 'nourish_ungasan')
const BAR_ULU = user('barLeader@uluwatu', 'uid-bl-ulu', 'barLeader', 'bar', 'nourish_uluwatu')
const STAFF = user('staff', 'uid-staff', 'staff', 'kitchen', 'nourish_uluwatu')
const SUBJECT = user('the disciplined employee', 'uid-subject', 'staff', 'kitchen', 'nourish_uluwatu')

// ---------------------------------------------------------------------------

before(async () => {
  let reachable = false
  try {
    reachable = (await fetch(`http://${HOST}/`)).status < 500
  } catch {
    reachable = false
  }
  assert.ok(
    reachable,
    `No Firestore emulator on ${HOST}. Start one with:\n` +
      `  firebase emulators:start --only firestore --project ${PROJECT}\n` +
      `(or run the whole thing through \`npm run test:rules\`)`,
  )

  // Wipe first: these fixtures are fixed ids, so a previous run's leftovers
  // would silently satisfy assertions the current rules no longer allow.
  await fetch(ADMIN, { method: 'DELETE' })

  await Promise.all([
    // --- Payroll -----------------------------------------------------------
    seed('payslips/issued', { isIssued: true, employeeId: 'emp-cook', takeHomePay: 7210874 }),
    seed('payslips/draft', { isIssued: false, employeeId: 'emp-cook', takeHomePay: 7210874 }),
    seed('payrollBatches/b1', { period: '2026-07', status: 'draft' }),

    // --- Attendance --------------------------------------------------------
    seed('attendanceRecords/approved-ulu', { isApproved: true, outletIdSnapshot: 'nourish_uluwatu' }),
    seed('attendanceRecords/pending-ulu', { isApproved: false, outletIdSnapshot: 'nourish_uluwatu' }),
    seed('attendanceRecords/approved-ung', { isApproved: true, outletIdSnapshot: 'nourish_ungasan' }),
    seed('attendancePeriods/2026-07', { period: '2026-07', status: 'approved' }),

    // --- Appraisal v2 ------------------------------------------------------
    seed('appraisals/on-a-cook', { employeeId: 'emp-cook', employeeDepartmentId: 'kitchen' }),
    seed('appraisals/on-a-cook/confidential/recommendation', { employeeId: 'emp-cook', finalScore: 52 }),
    seed('appraisals/on-the-hr-manager', { employeeId: 'emp-hr-manager', employeeDepartmentId: 'human_resources' }),
    seed('appraisals/on-the-hr-manager/confidential/recommendation', { employeeId: 'emp-hr-manager', finalScore: 48 }),
    seed('appraisals/on-the-gm', { employeeId: 'emp-gm', employeeDepartmentId: 'admin_general' }),
    seed('appraisals/on-the-gm/confidential/recommendation', { employeeId: 'emp-gm', finalScore: 41 }),
    // The self-exclusion resolves the reader's own employeeId through users/{uid}.
    // HR is linked; the GM deliberately is not — see the test that pins the gap.
    seed('users/uid-hr', { uid: 'uid-hr', roleId: 'hrManager', status: 'active', employeeId: 'emp-hr-manager' }),
    seed('users/uid-gm', { uid: 'uid-gm', roleId: 'generalManager', status: 'active' }),

    // --- Employee Communication -------------------------------------------
    seed('disciplinaryActions/released', {
      departmentId: 'kitchen',
      employeeUid: 'uid-subject',
      releasedToEmployee: true,
    }),
    seed('disciplinaryActions/unreleased', {
      departmentId: 'kitchen',
      employeeUid: 'uid-subject',
      releasedToEmployee: false,
    }),

    // --- Employees ---------------------------------------------------------
    seed('employees/emp-cook', { departmentId: 'kitchen', outletId: 'nourish_uluwatu', fullName: 'A Cook' }),
    seed('employees/emp-cook/compensation/current', { basicSalary: 18500000 }),

    // --- Recruitment -------------------------------------------------------
    seed('candidates/c1', { fullName: 'Rina Putri', stage: 'interview' }),
    seed('candidates/c1/confidential/application', { criminalHistory: false, previousSalary: 4500000 }),
    seed('discResults/c1', { dominance: 40, influence: 20 }),

    // --- Offboarding -------------------------------------------------------
    seed('exitInterviews/x1', { employeeId: 'emp-cook', reasonForLeaving: 'relocation' }),

    // --- Equipment ---------------------------------------------------------
    seed('equipment/at-uluwatu', { outletId: 'nourish_uluwatu', assetCode: 'NUL-REF-001' }),
    seed('equipment/at-ungasan', { outletId: 'nourish_ungasan', assetCode: 'NUN-REF-001' }),

    // --- Own-record collections -------------------------------------------
    seed('notifications/for-staff', { recipientUid: 'uid-staff', title: 'x' }),
    seed('communicationSettings/uid-staff', { whatsappEnabled: true }),

    // --- A collection with no rules block at all --------------------------
    seed('outlets/o1', { name: 'Nourish Uluwatu' }),
  ])
})

// ---------------------------------------------------------------------------
// The architectural invariant
// ---------------------------------------------------------------------------

describe('every collection is write-denied (ARCHITECTURE.md — clients read, actions write)', () => {
  const PATHS = [
    'payslips/issued',
    'attendanceRecords/approved-ulu',
    'appraisals/on-a-cook',
    'appraisals/on-a-cook/confidential/recommendation',
    'disciplinaryActions/released',
    'employees/emp-cook',
    'employees/emp-cook/compensation/current',
    'candidates/c1',
    'candidates/c1/confidential/application',
    'discResults/c1',
    'exitInterviews/x1',
    'equipment/at-uluwatu',
    'notifications/for-staff',
    'communicationSettings/uid-staff',
  ]

  for (const path of PATHS) {
    test(`superAdmin cannot write ${path}`, async () => {
      // superAdmin bypasses requirePermission in the callables (rbac.ts), but
      // it has no write path through the rules — the Admin SDK is the only
      // writer, full stop. If this ever passes, the layering is broken.
      assert.equal(await write(SUPER, path), 403)
    })
  }

  test('nor can an ordinary user', async () => {
    assert.equal(await write(STAFF, 'notifications/for-staff'), 403)
    assert.equal(await write(KITCHEN_ULU, 'employees/emp-cook'), 403)
  })
})

describe('an unruled collection falls through to deny-all, it does not fall open', () => {
  // `outlets` has no rules block (outlets are a hardcoded constant, not a
  // collection). The failure mode is an empty list, not a security hole —
  // which is exactly why `npm run check` looks for this statically.
  test('superAdmin cannot read outlets/o1', async () => {
    await assertDenied(SUPER, 'outlets/o1')
  })
})

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

describe('payslips — readable only once the batch is approved (§8)', () => {
  test('HR reads an issued payslip', async () => {
    await assertAllowed(HR, 'payslips/issued')
  })

  test('HR cannot read an UNissued payslip', async () => {
    // isIssued is stamped by the approval-resolved handler. Before that the
    // figure may still be rejected or corrected, so nobody sees it.
    await assertDenied(HR, 'payslips/draft')
  })

  test('Finance and the executives read issued payslips', async () => {
    await assertAllowed(FINANCE, 'payslips/issued')
    await assertAllowed(GM, 'payslips/issued')
    await assertAllowed(DIRECTOR, 'payslips/issued')
  })

  test('an outlet leader cannot — payroll visibility is HQ-only in v1', async () => {
    await assertDenied(KITCHEN_ULU, 'payslips/issued')
    await assertDenied(STAFF, 'payslips/issued')
  })

  test('batches are readable at any status, unlike payslips', async () => {
    // The batch holds totals and the reconciliation report, no per-person net
    // pay, and HR has to reload a draft's preview.
    await assertAllowed(HR, 'payrollBatches/b1')
    await assertDenied(KITCHEN_ULU, 'payrollBatches/b1')
  })
})

describe('attendanceRecords — approved AND in scope (attendance.md §8)', () => {
  test('HR reads an approved record at any outlet', async () => {
    await assertAllowed(HR, 'attendanceRecords/approved-ulu')
    await assertAllowed(HR, 'attendanceRecords/approved-ung')
  })

  test('nobody reads an unapproved record, not even HR', async () => {
    await assertDenied(HR, 'attendanceRecords/pending-ulu')
    await assertDenied(KITCHEN_ULU, 'attendanceRecords/pending-ulu')
  })

  test('a department head reads their OWN outlet only', async () => {
    await assertAllowed(KITCHEN_ULU, 'attendanceRecords/approved-ulu')
    await assertDenied(KITCHEN_ULU, 'attendanceRecords/approved-ung')
  })

  test('rank-and-file staff read none of it', async () => {
    await assertDenied(STAFF, 'attendanceRecords/approved-ulu')
  })

  test('periods are company-wide, so a leader sees the metadata', async () => {
    await assertAllowed(KITCHEN_ULU, 'attendancePeriods/2026-07')
    await assertDenied(STAFF, 'attendancePeriods/2026-07')
  })
})

// ---------------------------------------------------------------------------
// Confidentiality
// ---------------------------------------------------------------------------

describe('appraisals — HR, or a department head over their own department', () => {
  test('HR and the executives read any appraisal', async () => {
    await assertAllowed(HR, 'appraisals/on-a-cook')
    await assertAllowed(GM, 'appraisals/on-a-cook')
  })

  test('a department head reads their own department', async () => {
    await assertAllowed(KITCHEN_ULU, 'appraisals/on-a-cook')
  })

  test('a department head from another department does not', async () => {
    // Scoped by DEPARTMENT here, not outlet — the Ungasan kitchen leader can
    // read it and the Uluwatu bar leader cannot, same outlet notwithstanding.
    await assertAllowed(KITCHEN_UNG, 'appraisals/on-a-cook')
    await assertDenied(BAR_ULU, 'appraisals/on-a-cook')
  })

  test('the subject has no self-read branch (§10 excludes them)', async () => {
    await assertDenied(STAFF, 'appraisals/on-a-cook')
  })
})

describe('appraisals/{id}/confidential — the self-exclusion (§2.6)', () => {
  test('HR reads the recommendation on someone else’s appraisal', async () => {
    await assertAllowed(HR, 'appraisals/on-a-cook/confidential/recommendation')
  })

  test('HR CANNOT read the recommendation on their own appraisal', async () => {
    // The guarantee the whole feature rests on: hrManager holds
    // appraisals.readRecommendation and is also an appraisal subject.
    // Resolved through users/uid-hr.employeeId == the doc's employeeId.
    await assertDenied(HR, 'appraisals/on-the-hr-manager/confidential/recommendation')
  })

  test('...while still reading the parent appraisal document itself', async () => {
    // Only the recommendation is withheld, not the appraisal.
    await assertAllowed(HR, 'appraisals/on-the-hr-manager')
  })

  test('a department head is not in the audience at all', async () => {
    await assertDenied(KITCHEN_ULU, 'appraisals/on-a-cook/confidential/recommendation')
    await assertDenied(STAFF, 'appraisals/on-a-cook/confidential/recommendation')
  })

  test('KNOWN GAP: the exclusion is inert for a user with no employeeId link', async () => {
    // users/uid-gm has no employeeId, so the rule's `'employeeId' in ...` test
    // is false and the GM reads the recommendation on their own appraisal.
    // Nothing in this codebase populates users/{uid}.employeeId yet (root
    // CLAUDE.md names this gap for Appraisal v2 and Employee Communication
    // alike), so TODAY this is the live behaviour for everyone. This test
    // pins the gap rather than the intent — when account linking ships, it
    // should flip to assertDenied and that is the signal it worked.
    await assertAllowed(GM, 'appraisals/on-the-gm/confidential/recommendation')
  })
})

describe('disciplinaryActions — three self-contained branches (§5.4/§5.5)', () => {
  test('HR and the executives read every record', async () => {
    await assertAllowed(HR, 'disciplinaryActions/released')
    await assertAllowed(GM, 'disciplinaryActions/unreleased')
  })

  test('a department head reads their own department', async () => {
    await assertAllowed(KITCHEN_ULU, 'disciplinaryActions/released')
  })

  test('a department head from another department does not', async () => {
    await assertDenied(BAR_ULU, 'disciplinaryActions/released')
  })

  test('the employee reads their own record once it is released', async () => {
    await assertAllowed(SUBJECT, 'disciplinaryActions/released')
  })

  test('the employee CANNOT read it before the GM signs', async () => {
    await assertDenied(SUBJECT, 'disciplinaryActions/unreleased')
  })

  test('another employee reads neither', async () => {
    await assertDenied(STAFF, 'disciplinaryActions/released')
    await assertDenied(STAFF, 'disciplinaryActions/unreleased')
  })
})

describe('candidates — the confidential split is narrower than the parent', () => {
  test('HR and above read the candidate record', async () => {
    await assertAllowed(HR, 'candidates/c1')
    await assertAllowed(GM, 'candidates/c1')
  })

  test('only HR reads F010’s health/criminal/salary answers', async () => {
    await assertAllowed(HR, 'candidates/c1/confidential/application')
    // The GM reads the candidate but not this — rules gate documents, not
    // fields, which is the whole reason for the subcollection.
    await assertDenied(GM, 'candidates/c1/confidential/application')
    await assertDenied(DIRECTOR, 'candidates/c1/confidential/application')
  })

  test('a leader sees neither — they see the vacancy, not the applicants', async () => {
    await assertDenied(KITCHEN_ULU, 'candidates/c1')
    await assertDenied(KITCHEN_ULU, 'candidates/c1/confidential/application')
  })

  test('DISC results are HR-and-above, and never client-written', async () => {
    await assertAllowed(HR, 'discResults/c1')
    await assertAllowed(DIRECTOR, 'discResults/c1')
    await assertDenied(KITCHEN_ULU, 'discResults/c1')
    assert.equal(await write(HR, 'discResults/c1'), 403, 'a candidate must not be able to post their own score')
  })
})

describe('exitInterviews — hrManager/superAdmin, deliberately NOT the executives', () => {
  test('HR reads an exit interview', async () => {
    await assertAllowed(HR, 'exitInterviews/x1')
    await assertAllowed(SUPER, 'exitInterviews/x1')
  })

  test('the GM and Director do not — they get rollups instead', async () => {
    // exit-interview.md §4: the §6 minimum-N safeguard has to be enforced
    // server-side, which a read rule cannot do, so GM/Director go through
    // getExitInterviewInsights. Narrower than every other HR collection.
    await assertDenied(GM, 'exitInterviews/x1')
    await assertDenied(DIRECTOR, 'exitInterviews/x1')
  })
})

describe('employees — department-scoped, with compensation split out', () => {
  test('HR reads any employee', async () => {
    await assertAllowed(HR, 'employees/emp-cook')
  })

  test('a department head reads their own department', async () => {
    await assertAllowed(KITCHEN_ULU, 'employees/emp-cook')
    await assertDenied(BAR_ULU, 'employees/emp-cook')
  })

  test('staff read no employee records', async () => {
    await assertDenied(STAFF, 'employees/emp-cook')
  })

  test('compensation is hrManager/superAdmin only — not the GM, not the leader', async () => {
    // The parent rule cannot hide individual fields, hence the subcollection.
    await assertAllowed(HR, 'employees/emp-cook/compensation/current')
    await assertDenied(GM, 'employees/emp-cook/compensation/current')
    await assertDenied(DIRECTOR, 'employees/emp-cook/compensation/current')
    await assertDenied(KITCHEN_ULU, 'employees/emp-cook/compensation/current')
  })
})

// ---------------------------------------------------------------------------
// Outlet scoping
// ---------------------------------------------------------------------------

describe('equipment — outlet-scoped for everyone but the elevated set (§6.2 D9)', () => {
  test('Engineering and the executives see every outlet', async () => {
    await assertAllowed(ENGINEERING, 'equipment/at-uluwatu')
    await assertAllowed(ENGINEERING, 'equipment/at-ungasan')
    await assertAllowed(GM, 'equipment/at-ungasan')
    await assertAllowed(SUPER, 'equipment/at-ungasan')
  })

  test('a leader sees their own outlet only (AC #12)', async () => {
    await assertAllowed(KITCHEN_ULU, 'equipment/at-uluwatu')
    await assertDenied(KITCHEN_ULU, 'equipment/at-ungasan')
  })

  test('scoping is by outlet, not role — staff at that outlet can read', async () => {
    await assertAllowed(STAFF, 'equipment/at-uluwatu')
    await assertDenied(STAFF, 'equipment/at-ungasan')
  })

  test('HR is NOT in the elevated set here, so it is outlet-scoped too', async () => {
    // hrManager sits at boh_nourish_group, so both outlet rows deny. Worth
    // pinning because every other HR-sensitive collection reads the other way.
    await assertDenied(HR, 'equipment/at-uluwatu')
    await assertDenied(HR, 'equipment/at-ungasan')
  })
})

describe('own-record collections', () => {
  test('a notification is readable only by its recipient', async () => {
    await assertAllowed(STAFF, 'notifications/for-staff')
    await assertDenied(KITCHEN_ULU, 'notifications/for-staff')
    // Not even the executives — there is no isElevated() branch here.
    await assertDenied(SUPER, 'notifications/for-staff')
  })

  test('communication settings are readable only by their owner', async () => {
    await assertAllowed(STAFF, 'communicationSettings/uid-staff')
    await assertDenied(HR, 'communicationSettings/uid-staff')
  })
})
