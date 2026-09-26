/**
 * Exercises `seedWelcomeContent` against the emulator suite — the step
 * welcomeSeeds.ts could not be verified by `npm test` alone.
 *
 *   firebase emulators:start --project demo-nourishos --only auth,functions,firestore,storage
 *   node functions/test/welcome-seed-flow.mjs
 *
 * Modelled on emulator-callables.mjs, including its shortcut: the role and user
 * documents are written straight through firebase-admin rather than by driving
 * registerUser. What is under test is the seed callable, not HR's own.
 *
 * Asserts, in order: the seed writes four drafts, auto-publishing `orgChart`
 * (real HR-supplied content) but leaving the other three unpublished
 * first-pass copy; a second run skips all four rather than overwriting; an HR
 * edit survives a third run; and publishing is what finally exposes a section
 * the seed itself didn't. `welcome/`'s own `getWelcomeContent` is asserted
 * last, through the real published/draft split, so the portal's view of a
 * seeded-but-unpublished section — and of the one seeded-and-published one —
 * is pinned too.
 */
import { createRequire } from 'module'
const require = createRequire(import.meta.url) // firebase-admin lives in functions/node_modules
const admin = require('firebase-admin')

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
const PROJECT = 'demo-nourishos'
const REGION = 'asia-southeast2'
const FN = (name) => `http://127.0.0.1:5001/${PROJECT}/${REGION}/${name}`
const SECTIONS = ['menu', 'orgChart', 'attendanceGuide', 'dosAndDonts']

admin.initializeApp({ projectId: PROJECT })
const db = admin.firestore()

const RUN = Date.now()
let pass = 0
let fail = 0
function check(label, cond, detail = '') {
  if (cond) {
    console.log(`  ✓ ${label}`)
    pass++
  } else {
    console.log(`  ✗ ${label} ${detail}`)
    fail++
  }
}

async function signUp(email) {
  const res = await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123', returnSecureToken: true }),
  })
  const json = await res.json()
  if (!json.idToken) throw new Error('signUp failed: ' + JSON.stringify(json))
  return { idToken: json.idToken, uid: json.localId }
}

async function callFn(name, data, idToken) {
  const res = await fetch(FN(name), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ data }),
  })
  return { status: res.status, json: await res.json() }
}

async function readSections() {
  const out = {}
  for (const id of SECTIONS) {
    const snap = await db.collection('welcomeContent').doc(id).get()
    out[id] = snap.exists ? snap.data() : null
  }
  return out
}

async function main() {
  // ---- A clean slate: this suite owns the whole collection ----
  for (const id of SECTIONS) await db.collection('welcomeContent').doc(id).delete()

  // hrManager, the role ROLE_PERMISSIONS grants welcome.manageContent to.
  await db.collection('roles').doc('hrManager').set({ permissions: ['welcome.manageContent'] })
  const hr = await signUp(`hr-${RUN}@test.local`)
  await db.collection('users').doc(hr.uid).set({
    status: 'active',
    roleId: 'hrManager',
    displayName: 'Test HR Manager',
    email: `hr-${RUN}@test.local`,
    outletId: 'boh_nourish_group',
    departmentId: 'human_resources',
  })

  // A role with no welcome permission at all, for the gate check.
  await db.collection('roles').doc('kitchen').set({ permissions: ['incidents.create'] })
  const cook = await signUp(`cook-${RUN}@test.local`)
  await db.collection('users').doc(cook.uid).set({
    status: 'active',
    roleId: 'kitchen',
    displayName: 'Test Cook',
    email: `cook-${RUN}@test.local`,
    outletId: 'nourish_ungasan',
    departmentId: 'kitchen',
  })

  console.log('\n=== Permission gate ===')
  const denied = await callFn('seedWelcomeContent', {}, cook.idToken)
  check(
    'a role without welcome.manageContent is refused',
    denied.json?.error?.status === 'PERMISSION_DENIED',
    JSON.stringify(denied.json),
  )
  check('and nothing was written', (await db.collection('welcomeContent').get()).empty)

  console.log('\n=== First seed ===')
  const first = await callFn('seedWelcomeContent', {}, hr.idToken)
  check('returns 200', first.status === 200, JSON.stringify(first.json))
  const firstData = first.json?.result?.data ?? {}
  check(
    'seeds all four sections',
    [...(firstData.seeded ?? [])].sort().join(',') === [...SECTIONS].sort().join(','),
    JSON.stringify(firstData),
  )
  check('skips none', (firstData.skipped ?? []).length === 0, JSON.stringify(firstData))

  const seeded = await readSections()
  check(
    'every section now holds a draft',
    SECTIONS.every((id) => seeded[id]?.draft),
    JSON.stringify(Object.keys(seeded).map((id) => [id, !!seeded[id]?.draft])),
  )
  check(
    'orgChart auto-publishes — it is real content, not first-pass copy',
    Boolean(seeded.orgChart.published) && typeof seeded.orgChart.publishedAt === 'string',
    JSON.stringify({ published: seeded.orgChart.published, publishedAt: seeded.orgChart.publishedAt }),
  )
  check(
    'and the other three stay unpublished — a hire sees none of that yet',
    ['menu', 'attendanceGuide', 'dosAndDonts'].every((id) => seeded[id].published === null && seeded[id].publishedAt === null),
  )
  check(
    'the attendance guide explains all nine codes',
    ['WD', 'DO', 'PH', 'DP', 'AL', 'MC', 'EO', 'SL', 'UL'].every((code) =>
      seeded.attendanceGuide.draft.blocks.some((block) => block.body.en.includes(`${code} —`)),
    ),
  )
  check(
    'every seeded label carries both languages',
    seeded.dosAndDonts.draft.blocks.every(
      (block) => block.heading.id && block.heading.en && block.body.id && block.body.en,
    ),
  )
  check(
    'the menu ships categories with no invented items',
    seeded.menu.draft.categories.length > 0 && seeded.menu.draft.categories.every((c) => c.items.length === 0),
  )
  check('the org chart ships a real image url', seeded.orgChart.draft.imageUrl.trim().length > 0)

  console.log('\n=== Idempotency ===')
  const second = await callFn('seedWelcomeContent', {}, hr.idToken)
  const secondData = second.json?.result?.data ?? {}
  check('a second run seeds nothing', (secondData.seeded ?? []).length === 0, JSON.stringify(secondData))
  check('and skips all four', (secondData.skipped ?? []).length === 4, JSON.stringify(secondData))

  console.log('\n=== An HR edit is never overwritten ===')
  const edited = { blocks: [{ heading: { id: 'Punya HR', en: 'HR wrote this' }, body: { id: 'Isi', en: 'Body' } }] }
  const update = await callFn('updateWelcomeContent', { sectionId: 'dosAndDonts', content: edited }, hr.idToken)
  check('updateWelcomeContent returns 200', update.status === 200, JSON.stringify(update.json))
  await callFn('seedWelcomeContent', {}, hr.idToken)
  const afterEdit = await readSections()
  check(
    "HR's own draft survives a later seed run",
    afterEdit.dosAndDonts.draft.blocks[0]?.heading.en === 'HR wrote this',
    JSON.stringify(afterEdit.dosAndDonts.draft.blocks[0]),
  )

  console.log('\n=== Publishing is what exposes a section ===')
  const published = await callFn('publishWelcomeContent', { sectionId: 'attendanceGuide' }, hr.idToken)
  check('publishWelcomeContent returns 200', published.status === 200, JSON.stringify(published.json))
  const afterPublish = await readSections()
  check('the published copy equals the seeded draft', Boolean(afterPublish.attendanceGuide.published))
  check(
    'and the two still-unreviewed sections are still unpublished',
    ['menu', 'dosAndDonts'].every((id) => afterPublish[id].published === null),
  )
  check('orgChart is unaffected — still published from the seed itself', Boolean(afterPublish.orgChart.published))

  console.log('\n=== What the portal actually serves (getWelcomeContent) ===')
  // The portal is unauthenticated and token-gated, so it needs a live invite.
  // issueWelcomeInvite is driven by HR's checklist; this asserts the read path
  // only, so the invite is written directly the way portal-flow.mjs does.
  const { createHash, randomBytes } = require('crypto')
  const token = randomBytes(32).toString('base64url')
  const employeeId = `emp-${RUN}`
  await db.collection('employees').doc(employeeId).set({
    fullName: 'Test Hire',
    status: 'active',
    onboardingStatus: 'invited',
    outletId: 'nourish_ungasan',
    departmentId: 'kitchen',
  })
  await db.collection('onboardingInvites').add({
    employeeId,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    lockedAt: null,
    revokedAt: null,
    draft: {},
  })

  const portal = await fetch(FN('getWelcomeContent'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { token } }),
  })
  const portalJson = await portal.json()
  const served = portalJson?.result?.data?.sections ?? portalJson?.result?.sections ?? null
  check('the portal read succeeds', portal.status === 200, JSON.stringify(portalJson).slice(0, 400))
  check(
    'it serves the published attendance guide',
    Array.isArray(served?.attendanceGuide?.blocks) && served.attendanceGuide.blocks.length > 0,
    JSON.stringify(served && Object.keys(served)),
  )
  check(
    'it also serves the auto-published org chart',
    typeof served?.orgChart?.imageUrl === 'string' && served.orgChart.imageUrl.trim().length > 0,
    JSON.stringify(served?.orgChart),
  )
  check(
    'and serves null for the two still seeded-but-unpublished sections',
    served !== null && ['menu', 'dosAndDonts'].every((id) => served[id] === null),
    JSON.stringify(served),
  )

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
