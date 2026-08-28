/**
 * Demo data for the Candidate Portal — hand-run against the emulator:
 *
 *   firebase emulators:start --project demo-nourishos
 *   node functions/test/portal-seed.mjs
 *
 * Writes six approved requisitions (so the careers landing page has vacancies
 * to list) straight through the Firestore REST API with `Bearer owner`, then
 * drives the public callables to leave one half-finished application and one
 * fully submitted candidate in the pipeline — enough to see both the portal's
 * resume flow and NourishOS's Candidate 360 with real content.
 *
 * Prints the resume link for the half-finished application; open it at
 * http://localhost:5174/apply?t=<token> (5175 if 5174 was taken).
 */

const FUNCTIONS = 'http://127.0.0.1:5001/demo-nourishos/asia-southeast2'
const FIRESTORE = 'http://127.0.0.1:8080/v1/projects/demo-nourishos/databases/(default)/documents'
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }
const PORTAL = process.env.PORTAL_BASE_URL ?? 'http://localhost:5175'

const string = (stringValue) => ({ stringValue })

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

/** Vacancies, one per outlet concept — positions come from the POSITIONS catalog. */
const VACANCIES = [
  {
    id: 'REQ-seed-barista-uluwatu',
    position: 'barista',
    outletId: 'nourish_uluwatu',
    departmentId: 'bar',
    workSchedule: '6 days on, 1 off — split shift',
    responsibilities: 'Espresso and manual brew service, bar mise en place, guest interaction at the counter.',
    requirements: 'One year on a busy bar. Latte art. Conversational English.',
  },
  {
    id: 'REQ-seed-waiter-ungasan',
    position: 'waiter',
    outletId: 'nourish_ungasan',
    departmentId: 'fb_service',
    workSchedule: '6 days on, 1 off — morning or evening shift',
    responsibilities: 'Take orders, run food, keep sections clean, handle guest requests end to end.',
    requirements: 'Restaurant floor experience. Good spoken English. Comfortable on a full section.',
  },
  {
    id: 'REQ-seed-cdp-berawa',
    position: 'chefDePartie',
    outletId: 'nourish_berawa',
    departmentId: 'kitchen',
    workSchedule: '6 days on, 1 off — straight shift',
    responsibilities: 'Run a section through service, prep to spec, keep the line to HACCP standard.',
    requirements: 'Two years in a professional kitchen, at least one as CDP or Demi.',
  },
  {
    id: 'REQ-seed-cashier-ungasan',
    position: 'cashier',
    outletId: 'nourish_ungasan',
    departmentId: 'cashier',
    workSchedule: '6 days on, 1 off',
    responsibilities: 'Handle POS, cash float, end-of-shift reconciliation and daily banking hand-over.',
    requirements: 'Accurate with numbers. Previous cashier or accounting admin experience preferred.',
  },
  {
    id: 'REQ-seed-baker-uluwatu',
    position: 'cookBaker',
    outletId: 'the_bakery_kitchen',
    departmentId: 'kitchen',
    workSchedule: '6 days on, 1 off — 04:00 start',
    responsibilities: 'Daily bread and viennoiserie production, dough management, oven loading.',
    requirements: 'Bakery production experience. Happy with early starts.',
  },
  {
    id: 'REQ-seed-wholefood-berawa',
    position: 'wholefoodsCashier',
    outletId: 'wholefood_berawa',
    departmentId: 'wholefood_retail',
    workSchedule: '6 days on, 1 off',
    responsibilities: 'Retail till, restocking shelves, stock rotation and expiry checks.',
    requirements: 'Retail experience. Attentive to dates and labelling.',
  },
]

async function seedVacancy(vacancy) {
  const now = new Date().toISOString()
  const response = await fetch(`${FIRESTORE}/recruitments/${vacancy.id}`, {
    method: 'PATCH',
    headers: OWNER,
    body: JSON.stringify({
      fields: {
        requisitionNumber: string(`MPR-SEED-${vacancy.position}`),
        position: string(vacancy.position),
        outletId: string(vacancy.outletId),
        departmentId: string(vacancy.departmentId),
        openings: { integerValue: '1' },
        employmentType: string('ft'),
        requisitionType: string('new_position'),
        urgency: string('normal'),
        workSchedule: string(vacancy.workSchedule),
        responsibilities: string(vacancy.responsibilities),
        requirements: string(vacancy.requirements),
        justification: string('Seeded demo vacancy.'),
        budgeted: { booleanValue: true },
        status: string('approved'),
        vacancyStage: string('open'),
        filledCount: { integerValue: '0' },
        targetJoinDate: string(new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)),
        approvedAt: { timestampValue: now },
        createdAt: { timestampValue: now },
        updatedAt: { timestampValue: now },
        createdBy: string('seed'),
        updatedBy: string('seed'),
        isArchived: { booleanValue: false },
      },
    }),
  })
  if (!response.ok) throw new Error(`seed ${vacancy.id}: ${await response.text()}`)
}

function applicationFor(name, email, phone, experience) {
  return {
    personalData: {
      fullName: name,
      gender: 'female',
      placeOfBirth: 'Denpasar',
      dateOfBirth: '1997-09-03',
      nationality: 'Indonesia',
      maritalStatus: 'single',
      religion: 'hindu',
      email,
      phone,
    },
    address: {
      permanentAddress: 'Jl. Raya Uluwatu No. 88, Jimbaran, Badung',
      domicileAddress: 'Jl. Pantai Berawa No. 12, Canggu, Badung',
    },
    formalEducation: [
      { schoolType: 'SMK', institutionName: 'SMKN 3 Denpasar', city: 'Denpasar', major: 'Hospitality', graduationYear: '2015' },
      { schoolType: 'D3', institutionName: 'Politeknik Pariwisata Bali', city: 'Nusa Dua', major: 'F&B Management', graduationYear: '2018' },
    ],
    informalEducation: [],
    training: [{ name: 'Barista Level 1', organizerLocation: 'Bali Coffee Academy, Denpasar', monthYear: '2019-06' }],
    languages: [
      { language: 'Indonesian', speaking: 'excellent', reading: 'excellent', writing: 'excellent' },
      { language: 'English', speaking: 'good', reading: 'good', writing: 'basic' },
    ],
    workExperience: experience,
    references: [
      {
        name: 'Wayan Sudira',
        phone: '081338889999',
        company: 'Sunset Beach Club',
        department: 'F&B',
        position: 'Operations Manager',
        relationship: 'Former supervisor',
      },
    ],
    additionalQuestions: {
      knowsAboutCompany: 'A Bali F&B group running restaurants, a bakery and wholefood stores.',
      expectationsIfHired: 'Learn the standards properly and grow into a supervisor role.',
      willingToRelocate: true,
      willingToTravel: true,
      preferredEnvironment: 'field',
      strengths: ['Calm under pressure', 'Fast learner', 'Good with guests'],
      weaknesses: ['Impatient with slow systems', 'Too direct sometimes', 'Perfectionist about plating'],
      willingToAttachReferenceLetter: true,
      expectedRemuneration: '5.500.000',
    },
    sensitiveResponses: {
      seriousIllnessHistory: false,
      criminalHistory: false,
    },
    declarationAccepted: true,
  }
}

/** Phone numbers this script owns — everything under them is wiped before re-seeding. */
const SEED_PHONES = ['6281234567801', '6281234567802', '6281234567803']

async function runQuery(structuredQuery) {
  const response = await fetch(`${FIRESTORE}:runQuery`, {
    method: 'POST',
    headers: OWNER,
    body: JSON.stringify({ structuredQuery }),
  })
  if (!response.ok) throw new Error(`runQuery: ${await response.text()}`)
  return (await response.json()).filter((row) => row.document)
}

async function remove(path) {
  await fetch(`${FIRESTORE}/${path}`, { method: 'DELETE', headers: OWNER })
}

/**
 * Re-runnable: the portal refuses a second application from the same phone for
 * the same vacancy (guard.ts), and the token is only ever returned once, so a
 * repeat run has to clear its own previous candidates rather than reuse them.
 */
async function clearPreviousSeed() {
  const rows = await runQuery({
    from: [{ collectionId: 'candidates' }],
    where: {
      fieldFilter: {
        field: { fieldPath: 'phoneDigits' },
        op: 'IN',
        value: { arrayValue: { values: SEED_PHONES.map(string) } },
      },
    },
  })

  for (const row of rows) {
    const candidateId = row.document.name.split('/documents/')[1].replace('candidates/', '')
    const files = await runQuery({
      from: [{ collectionId: 'files' }],
      where: {
        fieldFilter: { field: { fieldPath: 'resourceId' }, op: 'EQUAL', value: string(candidateId) },
      },
    })
    for (const file of files) await remove(file.document.name.split('/documents/')[1])
    await remove(`discResults/${candidateId}`)
    await remove(`candidates/${candidateId}/confidential/application`)
    await remove(`candidates/${candidateId}`)
  }

  if (rows.length) console.log(`cleared ${rows.length} candidate(s) from a previous run`)
}

async function main() {
  await clearPreviousSeed()
  for (const vacancy of VACANCIES) await seedVacancy(vacancy)
  console.log(`seeded ${VACANCIES.length} open vacancies`)

  // 1. A finished application — appears in NourishOS at Screening with a form,
  //    a DISC profile and a CV attached.
  const submittedApplicant = await call('startApplication', {
    requisitionId: 'REQ-seed-barista-uluwatu',
    fullName: 'Kadek Ayu Pratiwi',
    phone: '081234567801',
    email: 'kadek.ayu@example.com',
    source: 'socialMedia',
  })

  await call('saveApplicationForm', {
    applicationToken: submittedApplicant.applicationToken,
    form: applicationFor('Kadek Ayu Pratiwi', 'kadek.ayu@example.com', '081234567801', [
      {
        companyName: 'Sunset Beach Club',
        companyType: 'hospitality',
        periodStart: '2022-03-01',
        periodEnd: '2026-05-31',
        position: 'Barista',
        reasonForResignation: 'Looking for a bigger bar programme',
        salary: 4800000,
      },
      {
        companyName: 'Kopi Kecil',
        companyType: 'foodAndBeverage',
        periodStart: '2019-01-01',
        periodEnd: '2022-02-28',
        position: 'Junior Barista',
        reasonForResignation: 'Promotion elsewhere',
        salary: 3600000,
      },
    ]),
  })

  const { questions } = await call('getDiscQuestions')
  // A deliberately uneven answer pattern, so the DISC bars are not a flat 25/25/25/25.
  await call('submitDiscAssessment', {
    applicationToken: submittedApplicant.applicationToken,
    responses: questions.map((question, index) => ({
      questionId: question.id,
      answer: question.options[index % 5 === 0 ? 1 : index % 3 === 0 ? 2 : 0].id,
    })),
  })

  await call('uploadCandidateDocument', {
    applicationToken: submittedApplicant.applicationToken,
    documentType: 'cv',
    fileName: 'Kadek-Ayu-Pratiwi-CV.pdf',
    mimeType: 'application/pdf',
    contentBase64: Buffer.from('%PDF-1.4 seeded CV').toString('base64'),
  })

  await call('uploadCandidateDocument', {
    applicationToken: submittedApplicant.applicationToken,
    documentType: 'certificate',
    fileName: 'Barista-Level-1.pdf',
    mimeType: 'application/pdf',
    contentBase64: Buffer.from('%PDF-1.4 seeded certificate').toString('base64'),
  })

  await call('completeApplication', { applicationToken: submittedApplicant.applicationToken })

  // 2. A half-finished one — form saved, no DISC, no CV. This is the link to
  //    open in the portal to see the resume flow.
  const draftApplicant = await call('startApplication', {
    requisitionId: 'REQ-seed-waiter-ungasan',
    fullName: 'Putu Gede Mahendra',
    phone: '081234567802',
    email: 'putu.gede@example.com',
    source: 'referral',
  })

  await call('saveApplicationForm', {
    applicationToken: draftApplicant.applicationToken,
    form: applicationFor('Putu Gede Mahendra', 'putu.gede@example.com', '081234567802', [
      {
        companyName: 'Warung Bakti',
        companyType: 'foodAndBeverage',
        periodStart: '2023-02-01',
        periodEnd: '',
        position: 'Waiter',
        reasonForResignation: '',
        salary: 4200000,
      },
    ]),
  })

  // 3. One that never got past the first screen, so the pipeline's Applied
  //    column is not empty either.
  await call('startApplication', {
    requisitionId: 'REQ-seed-cdp-berawa',
    fullName: 'Ni Luh Sari',
    phone: '081234567803',
    source: 'jobPortal',
  })

  console.log(`submitted:  ${submittedApplicant.candidateNumber} — Kadek Ayu Pratiwi (Screening, DISC + CV)`)
  console.log(`in progress: ${draftApplicant.candidateNumber} — Putu Gede Mahendra`)
  console.log(`             resume link: ${PORTAL}/apply?t=${draftApplicant.applicationToken}`)
  console.log(`applied only: Ni Luh Sari`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
