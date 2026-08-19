/**
 * Candidate Portal end-to-end smoke test — hand-run against the emulator:
 *
 *   firebase emulators:start --project demo-nourishos
 *   node functions/test/portal-flow.mjs
 *
 * Walks the whole public flow the way the portal does (unauthenticated
 * callables, application token as the only credential) and asserts the things
 * that must hold: the token gates every write, a submitted application is
 * read-only, DISC is scored server-side, and the candidate never sees a score.
 *
 * Seeds the requisition directly through the Firestore REST API with
 * `Bearer owner` rather than driving the approval chain — this is a test of the
 * portal, not of the approval engine.
 */
import assert from 'node:assert/strict'

const FUNCTIONS = 'http://127.0.0.1:5001/demo-nourishos/asia-southeast2'
const FIRESTORE = 'http://127.0.0.1:8080/v1/projects/demo-nourishos/databases/(default)/documents'
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }

async function call(name, data = {}) {
  const response = await fetch(`${FUNCTIONS}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  const body = await response.json()
  if (body.error) throw new Error(`${name}: ${body.error.message}`)
  return body.result.data
}

async function expectFailure(name, data, expected) {
  await assert.rejects(() => call(name, data), (error) => {
    assert.match(error.message, expected, `${name}: expected ${expected}, got "${error.message}"`)
    return true
  })
}

const string = (stringValue) => ({ stringValue })

async function seedRequisition() {
  const id = `REQ-portal-smoke-${Date.now()}`
  const now = new Date().toISOString()
  const response = await fetch(`${FIRESTORE}/recruitments/${id}`, {
    method: 'PATCH',
    headers: OWNER,
    body: JSON.stringify({
      fields: {
        requisitionNumber: string('MPR-SMOKE'),
        position: string('barista'),
        outletId: string('nourish_uluwatu'),
        departmentId: string('bar'),
        openings: { integerValue: '1' },
        employmentType: string('ft'),
        workSchedule: string('6 days, split shift'),
        responsibilities: string('Make coffee.'),
        requirements: string('One year of bar experience.'),
        status: string('approved'),
        vacancyStage: string('open'),
        filledCount: { integerValue: '0' },
        createdAt: { timestampValue: now },
        updatedAt: { timestampValue: now },
        createdBy: string('smoke'),
        updatedBy: string('smoke'),
        isArchived: { booleanValue: false },
      },
    }),
  })
  assert.ok(response.ok, `seed requisition failed: ${await response.text()}`)
  return id
}

const form = {
  personalData: {
    fullName: 'Smoke Candidate',
    gender: 'female',
    placeOfBirth: 'Denpasar',
    dateOfBirth: '1998-04-12',
    nationality: 'Indonesia',
    maritalStatus: 'Single',
    religion: 'Hindu',
    email: 'smoke@example.com',
    phone: '081200000001',
  },
  address: { permanentAddress: 'Jl. Uluwatu 1', domicileAddress: 'Jl. Uluwatu 1' },
  formalEducation: [
    { schoolType: 'SMA', institutionName: 'SMAN 1', city: 'Denpasar', major: 'Hospitality', graduationYear: '2016' },
  ],
  informalEducation: [],
  training: [],
  languages: [{ language: 'Indonesian', speaking: 'excellent', reading: 'excellent', writing: 'good' }],
  workExperience: [
    {
      companyName: 'XYZ Coffee',
      companyType: 'Cafe',
      periodStart: '2022-01',
      periodEnd: '2026-06',
      position: 'Barista',
      superiorName: 'Budi',
      reasonForResignation: 'Career development',
      salary: 4500000,
    },
  ],
  references: [],
  additionalQuestions: {
    knowsAboutCompany: 'Bali F&B group.',
    expectationsIfHired: 'Grow into a bar leader.',
    willingToRelocate: true,
    willingToTravel: true,
    preferredEnvironment: 'field',
    strengths: ['Latte art', 'Speed', 'Calm'],
    weaknesses: ['Impatient', 'Direct', 'Perfectionist'],
    willingToAttachReferenceLetter: true,
    expectedRemuneration: '5.000.000',
  },
  sensitiveResponses: {
    seriousIllnessHistory: false,
    criminalHistory: false,
  },
  declarationAccepted: true,
}

async function main() {
  const requisitionId = await seedRequisition()

  const { positions } = await call('listOpenPositions')
  const listed = positions.find((row) => row.requisitionId === requisitionId)
  assert.ok(listed, 'the seeded vacancy is not in listOpenPositions')
  assert.equal(listed.positionLabel, 'Barista / Bartender', 'position label should come from the POSITIONS catalog')
  assert.ok(!('justification' in listed), 'listOpenPositions must not leak the requisition justification')

  const started = await call('startApplication', {
    requisitionId,
    fullName: 'Smoke Candidate',
    phone: '0812-0000-0001',
    email: 'smoke@example.com',
    source: 'socialMedia',
  })
  const token = started.applicationToken
  assert.equal(token.length, 43, 'the application token should be 32 bytes of base64url')

  // The token is the only credential — a wrong one must not resolve to anyone.
  await expectFailure('getApplicationStatus', { applicationToken: 'x'.repeat(43) }, /not valid/i)
  await expectFailure('getApplicationStatus', {}, /not valid/i)

  // Same phone, same vacancy → refused, with no way for the caller to override.
  await expectFailure(
    'startApplication',
    { requisitionId, fullName: 'Smoke Candidate', phone: '+62 812 0000 0001', source: 'referral' },
    /already applied/i,
  )

  // Submitting before the form is filled in must fail on each missing piece in turn.
  await expectFailure('completeApplication', { applicationToken: token }, /Employment form|Still to complete/i)

  const saved = await call('saveApplicationForm', { applicationToken: token, form })
  assert.deepEqual(saved.missing, [], `form still incomplete: ${saved.missing.join(', ')}`)

  await expectFailure('completeApplication', { applicationToken: token }, /DISC/i)

  const { questions } = await call('getDiscQuestions')
  assert.equal(questions.length, 24)
  assert.ok(
    questions.every((question) => question.options.every((option) => !('dimension' in option))),
    'the question bank must not ship its dimension mapping to the client',
  )

  await expectFailure(
    'submitDiscAssessment',
    { applicationToken: token, responses: questions.slice(0, 3).map((q) => ({ questionId: q.id, answer: 'A' })) },
    /Answer all 24/i,
  )

  // Answer every question with the same option id; the mapping rotates per
  // question, so this still produces a spread rather than 100% of one style.
  const disc = await call('submitDiscAssessment', {
    applicationToken: token,
    responses: questions.map((question) => ({ questionId: question.id, answer: 'A' })),
  })
  assert.ok(disc.completedAt, 'DISC submission should return a completion time')
  assert.ok(!('scores' in disc), 'DISC scores must never be returned to the candidate')

  await expectFailure('completeApplication', { applicationToken: token }, /CV/i)

  const uploaded = await call('uploadCandidateDocument', {
    applicationToken: token,
    documentType: 'cv',
    fileName: 'smoke-cv.pdf',
    mimeType: 'application/pdf',
    contentBase64: Buffer.from('%PDF-1.4 smoke test').toString('base64'),
  })
  assert.ok(uploaded.fileId)

  await expectFailure(
    'uploadCandidateDocument',
    {
      applicationToken: token,
      documentType: 'cv',
      fileName: 'payload.exe',
      mimeType: 'application/x-msdownload',
      contentBase64: 'AAAA',
    },
    /PDF, JPG or PNG/i,
  )

  const submitted = await call('completeApplication', { applicationToken: token })
  assert.equal(submitted.currentStage, 'ST-02', 'a submitted application should be at Screening')

  // Read-only from here: the candidate owns the record only until they submit.
  await expectFailure('saveApplicationForm', { applicationToken: token, form }, /already been submitted/i)

  const status = await call('getApplicationStatus', { applicationToken: token })
  assert.equal(status.stageLabel, 'Screening')
  assert.deepEqual(status.steps, { form: true, disc: true, cv: true })
  assert.ok(status.submittedAt, 'submittedAt should be stamped')
  assert.ok(!JSON.stringify(status).includes('primaryStyle'), 'the status view must not expose the DISC result')

  // The scored result exists, server-side, with the raw answers kept for audit.
  const result = await fetch(`${FIRESTORE}/discResults/${started.candidateId}`, { headers: OWNER })
  assert.ok(result.ok, 'discResults document was not written')
  const fields = (await result.json()).fields
  const scores = fields.scores.mapValue.fields
  const total = ['D', 'I', 'S', 'C'].reduce((sum, key) => sum + Number(scores[key].integerValue), 0)
  assert.ok(Math.abs(total - 100) <= 2, `DISC percentages should sum to ~100, got ${total}`)
  assert.equal(fields.responses.arrayValue.values.length, 24)

  console.log('portal flow OK —', started.candidateNumber)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
