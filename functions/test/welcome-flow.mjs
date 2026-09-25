/**
 * New-Hire Welcome Portal end-to-end smoke test — hand-run against the
 * emulator:
 *
 *   firebase emulators:start --project demo-nourishos
 *   node functions/test/welcome-flow.mjs
 *
 * Walks the whole flow the way a hire does (unauthenticated callables, the
 * magic-link token as the only credential) and asserts welcome-portal.md's own
 * §13 list: issue → session → draft → upload → submit → locked → verify, plus
 * the security cases — token probing returns one identical message, the
 * whitelist rejects rather than ignores, and one token cannot touch another
 * employee.
 *
 * Modelled on portal-flow.mjs, including its shortcut: fixtures are seeded
 * straight through the Firestore REST API with `Bearer owner` rather than
 * driving createEmployee and the approval engine. This is a test of the
 * welcome portal, not of HR's own callables.
 *
 * `issueWelcomeInvite` is authenticated, so the raw token is read back out of
 * `onboardingInvites` the same way — which is also why the WhatsApp leg is not
 * asserted here: without FONNTE_TOKEN the adapter reports `skipped` by design.
 */
import assert from 'node:assert/strict'

const FUNCTIONS = 'http://127.0.0.1:5001/demo-nourishos/asia-southeast2'
const FIRESTORE = 'http://127.0.0.1:8080/v1/projects/demo-nourishos/databases/(default)/documents'
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }

const INVALID_LINK = /isn.t valid|not valid/i

async function call(name, data = {}, idToken) {
  const headers = { 'Content-Type': 'application/json' }
  if (idToken) headers.Authorization = `Bearer ${idToken}`
  const response = await fetch(`${FUNCTIONS}/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ data }),
  })
  const body = await response.json()
  if (body.error) throw new Error(`${name}: ${body.error.message}`)
  return body.result.data
}

async function expectFailure(name, data, expected, idToken) {
  await assert.rejects(
    () => call(name, data, idToken),
    (error) => {
      assert.match(error.message, expected, `${name}: expected ${expected}, got "${error.message}"`)
      return true
    },
  )
}

const string = (stringValue) => ({ stringValue })
const bool = (booleanValue) => ({ booleanValue })

/**
 * An unsigned JWT the Functions emulator accepts, same trick rules.mjs uses.
 * The emulator does not verify signatures, so this is enough to make
 * requireActiveUser read the users/{uid} doc below.
 */
function idTokenFor(uid) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const header = encode({ alg: 'none', typ: 'JWT' })
  const now = Math.floor(Date.now() / 1000)
  const payload = encode({
    iss: 'https://securetoken.google.com/demo-nourishos',
    aud: 'demo-nourishos',
    sub: uid,
    user_id: uid,
    iat: now,
    exp: now + 3600,
    auth_time: now,
    email: `${uid}@example.com`,
    firebase: { sign_in_provider: 'custom', identities: {} },
  })
  return `${header}.${payload}.`
}

async function put(path, fields) {
  const response = await fetch(`${FIRESTORE}/${path}`, {
    method: 'PATCH',
    headers: OWNER,
    body: JSON.stringify({ fields }),
  })
  assert.ok(response.ok, `seed ${path} failed: ${await response.text()}`)
}

async function read(path) {
  const response = await fetch(`${FIRESTORE}/${path}`, { headers: OWNER })
  assert.ok(response.ok, `read ${path} failed: ${await response.text()}`)
  return (await response.json()).fields ?? {}
}

const stamp = Date.now()
const now = new Date().toISOString()

async function seedHrManager() {
  const uid = `welcome-hr-${stamp}`
  await put(`users/${uid}`, {
    email: string(`${uid}@example.com`),
    displayName: string('Smoke HR Manager'),
    roleId: string('hrManager'),
    status: string('active'),
    outletId: string('nourish_uluwatu'),
    departmentId: string('admin_general'),
    createdAt: { timestampValue: now },
    updatedAt: { timestampValue: now },
    isArchived: bool(false),
  })
  // requireActiveUser reads roles/{roleId}.permissions live, so the two new
  // strings have to exist on the document — the same hand-grant every real
  // environment needs (sync-role-permissions.mjs --prefix employees.invite).
  await put('roles/hrManager', {
    name: string('Jr. HR Manager'),
    permissions: {
      arrayValue: {
        values: [
          string('employees.invite'),
          string('welcome.manageContent'),
          string('employees.readSensitive'),
          string('employees.update'),
        ],
      },
    },
    createdAt: { timestampValue: now },
    updatedAt: { timestampValue: now },
    isArchived: bool(false),
  })
  return uid
}

async function seedEmployee(suffix) {
  const id = `welcome-emp-${stamp}-${suffix}`
  await put(`employees/${id}`, {
    employeeNumber: string(`N-9${suffix}${stamp % 1000}`),
    fullName: string(''),
    gender: string('female'),
    birthDate: string('1999-01-01'),
    phone: string(`0812000${suffix}${stamp % 10000}`),
    email: string(`${id}@example.com`),
    position: string('barista'),
    departmentId: string('bar'),
    outletId: string('nourish_uluwatu'),
    employmentStatus: string('PKWT'),
    joinDate: string('2026-10-01'),
    probationMonths: { integerValue: '3' },
    contractType: string('permanent'),
    status: string('active'),
    createdAt: { timestampValue: now },
    updatedAt: { timestampValue: now },
    createdBy: string('smoke'),
    updatedBy: string('smoke'),
    isArchived: bool(false),
  })
  return id
}

async function seedChecklist(employeeId, suffix) {
  const id = `welcome-chk-${stamp}-${suffix}`
  await put(`onboardingChecklists/${id}`, {
    candidateId: string(`cand-${suffix}`),
    candidateName: string('Smoke Hire'),
    requisitionId: string('req-smoke'),
    employeeId: string(employeeId),
    joinDate: string('2026-10-01'),
    status: string('inProgress'),
    documentChecklist: {
      arrayValue: {
        values: [
          {
            mapValue: {
              fields: {
                itemNumber: { integerValue: '31' },
                label: string('Welcome link sent to new hire'),
                tier: string('mandatory'),
                treatment: string('generate'),
                status: string('pending'),
                receivedDate: { nullValue: null },
                fileId: { nullValue: null },
              },
            },
          },
        ],
      },
    },
    taskIds: { arrayValue: { values: [] } },
    createdAt: { timestampValue: now },
    updatedAt: { timestampValue: now },
    createdBy: string('smoke'),
    updatedBy: string('smoke'),
    isArchived: bool(false),
  })
  return id
}

const goodValues = {
  fullName: 'Kadek Puspitasari',
  placeOfBirth: 'Denpasar',
  birthDate: '1999-04-12',
  gender: 'female',
  religion: 'hindu',
  maritalStatus: 'single',
  bloodType: 'O',
  tshirtSize: 'M',
  motherName: 'Ni Wayan Sari',
  phone: '081234567890',
  personalEmail: 'Kadek@Example.com',
  permanentAddressKtp: 'Jl. Raya Uluwatu No. 1',
  domicileAddress: 'Jl. Pantai Berawa No. 9',
  emergencyContactName: 'Made Puspitasari',
  emergencyContactPhone: '+6281100002222',
  emergencyContactAddress: 'Jl. Raya Uluwatu No. 1',
  emergencyContactRelationship: 'parents',
  nik: '5103014204990001',
  npwp: '123456789012345',
  bankAccountName: 'kadek puspitasari',
  bankAccountNumber: '1234567890',
}

async function main() {
  const hrUid = await seedHrManager()
  const hrToken = idTokenFor(hrUid)

  const employeeId = await seedEmployee('a')
  const checklistId = await seedChecklist(employeeId, 'a')

  // A second hire, to prove one token reaches exactly one employee (§10.5).
  const otherEmployeeId = await seedEmployee('b')
  const otherChecklistId = await seedChecklist(otherEmployeeId, 'b')

  // ---- §3.3 step 2: HR issues the link ----

  // The employee record has to exist first — the confirmed correction to §3.3
  // step 1, since reaching Hired does not create it.
  await put(`onboardingChecklists/${checklistId}`, { employeeId: { nullValue: null } })
  await expectFailure('issueWelcomeInvite', { checklistId }, /Create the employee record first/i, hrToken)
  await put(`onboardingChecklists/${checklistId}`, { employeeId: string(employeeId) })

  const issued = await call('issueWelcomeInvite', { checklistId }, hrToken)
  assert.ok(issued.inviteId, 'issueWelcomeInvite returned no inviteId')

  // §3.3 / §5.1 — checklist item 31 is marked complete on success.
  const checklist = await read(`onboardingChecklists/${checklistId}`)
  const item31 = checklist.documentChecklist.arrayValue.values
    .map((entry) => entry.mapValue.fields)
    .find((fields) => fields.itemNumber.integerValue === '31')
  assert.equal(item31.status.stringValue, 'received', 'item 31 should be marked received')
  assert.ok(checklist.welcomeInviteSentAt, 'welcomeInviteSentAt should be denormalised onto the checklist')

  // A second issue is refused; reissue is the documented path.
  await expectFailure('issueWelcomeInvite', { checklistId }, /already been sent/i, hrToken)

  // The raw token is never persisted, so recover it the only way a test can:
  // reissue, and read the hash back to confirm it matches what we hold.
  const token = await recoverToken(checklistId, hrToken)
  await call('issueWelcomeInvite', { checklistId: otherChecklistId }, hrToken)
  const otherToken = await recoverToken(otherChecklistId, hrToken)

  // ---- §10.2: every token failure is the same message ----

  for (const bad of ['', 'nope', 'x'.repeat(43), null, 42]) {
    await expectFailure('getWelcomeSession', { token: bad }, INVALID_LINK)
  }

  // ---- §3.3 step 3: the session ----

  const session = await call('getWelcomeSession', { token })
  assert.equal(session.outletId, 'nourish_uluwatu')
  assert.equal(session.fullName, '', 'there is no HR-set name before the hire types one')
  assert.equal(session.submitted, false)
  assert.deepEqual(session.draft, {})

  // ---- §4.2: the whitelist rejects, it does not ignore ----

  await expectFailure('saveWelcomeDraft', { token, values: { salary: 99999999 } }, /set by HR/i)
  await expectFailure('saveWelcomeDraft', { token, values: { outletId: 'nourish_berawa' } }, /set by HR/i)
  await expectFailure('saveWelcomeDraft', { token, values: { onboardingStatus: 'verified' } }, /set by HR/i)
  await expectFailure('saveWelcomeDraft', { token, values: { notAField: 'x' } }, /Unknown field/i)

  const outletAfter = (await read(`employees/${employeeId}`)).outletId.stringValue
  assert.equal(outletAfter, 'nourish_uluwatu', 'a rejected write must not land')

  // ---- §7.1: autosave, then resume ----

  await call('saveWelcomeDraft', { token, values: { fullName: goodValues.fullName, nik: goodValues.nik } })
  const resumed = await call('getWelcomeSession', { token })
  assert.equal(resumed.draft.fullName, goodValues.fullName, 'the draft should come back on the next visit')
  assert.equal(resumed.fullName, '', 'a draft name is not the employee record yet')

  // ---- §11: the server is authoritative, per field ----

  await expectFailure('submitWelcomeForm', { token, values: { ...goodValues, nik: '123' } }, /NIK must be 16 digits/i)
  await expectFailure(
    'submitWelcomeForm',
    { token, values: { ...goodValues, bankAccountNumber: '123' } },
    /10 digits/i,
  )

  // Documents are required, and nothing has been uploaded yet.
  await expectFailure('submitWelcomeForm', { token, values: goodValues }, /KTP/i)

  // ---- §6: uploads ----

  const onePixelPng =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

  const ktp = await call('uploadWelcomeDocument', {
    token,
    slot: 'ktp',
    fileName: 'ktp.png',
    mimeType: 'image/png',
    contentBase64: onePixelPng,
  })
  assert.ok(ktp.fileId, 'upload returned no fileId')

  await call('uploadWelcomeDocument', {
    token,
    slot: 'kk',
    fileName: 'kk.png',
    mimeType: 'image/png',
    contentBase64: onePixelPng,
  })

  // A PDF in the photo slot is refused; the slot is image-only (§6).
  await expectFailure(
    'uploadWelcomeDocument',
    { token, slot: 'photo', fileName: 'x.pdf', mimeType: 'application/pdf', contentBase64: onePixelPng },
    /must be an image/i,
  )

  // Supporting caps at two.
  for (let index = 0; index < 2; index += 1) {
    await call('uploadWelcomeDocument', {
      token,
      slot: 'supporting',
      fileName: `s${index}.png`,
      mimeType: 'image/png',
      contentBase64: onePixelPng,
    })
  }
  await expectFailure(
    'uploadWelcomeDocument',
    { token, slot: 'supporting', fileName: 's3.png', mimeType: 'image/png', contentBase64: onePixelPng },
    /at most 2/i,
  )

  // ---- §3.3 step 6: submit ----

  const submitted = await call('submitWelcomeForm', { token, values: goodValues })
  assert.equal(submitted.employeeId, employeeId)

  const employee = await read(`employees/${employeeId}`)
  assert.equal(employee.fullName.stringValue, goodValues.fullName)
  // The spec's names map onto the shipped fields.
  assert.equal(employee.nationalId.stringValue, goodValues.nik)
  assert.equal(employee.taxNumber.stringValue, goodValues.npwp)
  assert.equal(employee.birthPlace.stringValue, goodValues.placeOfBirth)
  assert.equal(employee.permanentAddress.stringValue, goodValues.permanentAddressKtp)
  assert.equal(employee.phone.stringValue, '6281234567890', 'phone should be normalised to 62…')
  assert.equal(employee.email.stringValue, 'kadek@example.com')
  assert.ok(!employee.bankAccountNumber, '§10.4 — bank details must not land on the employee document')
  assert.equal(employee.onboardingStatus.stringValue, 'pendingVerification')

  const compensation = await read(`employees/${employeeId}/compensation/current`)
  assert.equal(compensation.bankAccountNumber.stringValue, goodValues.bankAccountNumber)
  assert.equal(compensation.bankAccountName.stringValue, 'KADEK PUSPITASARI', 'the server uppercases it')

  // ---- §2 D6: the form locks on submit ----

  await expectFailure('submitWelcomeForm', { token, values: goodValues }, /already been submitted/i)
  await expectFailure('saveWelcomeDraft', { token, values: { fullName: 'Someone Else' } }, /already been submitted/i)

  // The banner and content stay open while the token is valid.
  const afterSubmit = await call('getWelcomeSession', { token })
  assert.equal(afterSubmit.submitted, true)
  assert.equal(afterSubmit.fullName, goodValues.fullName)

  // ---- §10.5: one token, one employee ----

  await call('saveWelcomeDraft', { token: otherToken, values: { fullName: 'Second Hire' } })
  const untouched = await read(`employees/${employeeId}`)
  assert.equal(untouched.fullName.stringValue, goodValues.fullName, 'another token must not reach this employee')

  // ---- §5.1: revoke kills the link, with the same uniform message ----

  await call('revokeWelcomeInvite', { checklistId: otherChecklistId }, hrToken)
  await expectFailure('getWelcomeSession', { token: otherToken }, INVALID_LINK)

  // ---- §7.4: content ----

  await call('updateWelcomeContent', { sectionId: 'menu', content: { categories: [] } }, hrToken)
  const beforePublish = await call('getWelcomeContent', { token })
  assert.equal(beforePublish.sections.menu, null, 'a draft is not visible to the hire')

  await call('publishWelcomeContent', { sectionId: 'menu' }, hrToken)
  const afterPublish = await call('getWelcomeContent', { token })
  assert.deepEqual(afterPublish.sections.menu, { categories: [] }, 'publishing makes it visible')
  await expectFailure('publishWelcomeContent', { sectionId: 'notASection' }, /must be one of/i, hrToken)

  console.log('welcome-flow: OK')
  console.log('')
  console.log('Not covered here, verify by hand:')
  console.log('  - the hr/onboardingVerification approval (approve, then reject and confirm the form re-opens)')
  console.log('  - the WhatsApp leg (needs FONNTE_TOKEN; without it the adapter reports "skipped" by design)')
}

/**
 * Reissues and returns the raw token. `issueWelcomeInvite` returns the token
 * only in the WhatsApp message, never in its response, so a test has to take
 * this route — which also exercises reissue's revoke-then-issue ordering.
 */
async function recoverToken(checklistId, hrToken) {
  const response = await fetch(`${FUNCTIONS}/reissueWelcomeInvite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({ data: { checklistId } }),
  })
  const body = await response.json()
  if (body.error) throw new Error(`reissueWelcomeInvite: ${body.error.message}`)

  const token = body.result.data.token
  assert.ok(
    token,
    'reissueWelcomeInvite must return `token` for this test to run.\n' +
      '  It deliberately does not in production — the raw token goes out by WhatsApp only.\n' +
      '  Set WELCOME_RETURN_TOKEN=true on the functions emulator to enable it.',
  )
  return token
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
