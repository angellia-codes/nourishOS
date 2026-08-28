/**
 * Fill a fresh emulator with content across every module — hand-run:
 *
 *   firebase emulators:start --project demo-nourishos
 *   npm --prefix functions run build
 *   node functions/test/seed-emulator-user.mjs --role superAdmin --email admin@nourish.test --outlet all --department management
 *   node functions/test/seed-demo-data.mjs
 *
 * Everything goes through the real callables as a signed-in superAdmin rather
 * than straight into Firestore, so what you end up looking at is what the app
 * actually produces — real validation, real audit entries, real notifications,
 * real Task Engine documents. It doubles as a smoke test of every endpoint it
 * touches: anything that fails prints its own error message and the run keeps
 * going, so one broken module does not block seeing the rest.
 *
 * Re-runnable, with one exception worth knowing: shift reports and checklists
 * are keyed per outlet+day, so a second run reports those as already-filed
 * rather than creating duplicates.
 */

const FN = 'http://127.0.0.1:5001/demo-nourishos/asia-southeast2'
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1'

const ADMIN_SUB = 'seed-superAdmin-all'
const ADMIN_EMAIL = 'admin@nourish.test'

let ok = 0
let failed = 0

async function token() {
  const r = await fetch(`${AUTH}/accounts:signInWithIdp?key=fake-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      postBody: `id_token=${JSON.stringify({ sub: ADMIN_SUB, email: ADMIN_EMAIL, email_verified: true })}&providerId=google.com`,
      requestUri: 'http://localhost',
      returnIdpCredential: true,
      returnSecureToken: true,
    }),
  }).then((res) => res.json())
  if (!r.idToken) {
    throw new Error(
      'Could not sign in as the seeded superAdmin. Run seed-emulator-user.mjs first:\n' +
        '  node functions/test/seed-emulator-user.mjs --role superAdmin --email admin@nourish.test --outlet all --department management',
    )
  }
  return { idToken: r.idToken, uid: r.localId }
}

let idToken
let adminUid

/** Calls a callable and reports rather than throws — one bad module must not hide the others. */
async function call(label, name, data) {
  const res = await fetch(`${FN}/${name}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.error) {
    failed += 1
    console.log(`  --   ${label}: ${body.error?.message ?? `HTTP ${res.status}`}`)
    return null
  }
  ok += 1
  console.log(`  ok   ${label}`)
  return body.result?.data ?? {}
}

const OUTLET = 'nourish_uluwatu'
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' })
const daysFromNow = (n) => {
  const d = new Date(`${today}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const EMPLOYEES = [
  { fullName: 'I Wayan Suarta', gender: 'male', position: 'restaurantSupervisor', departmentId: 'fb_service', joinDate: daysFromNow(-800) },
  { fullName: 'Ni Kadek Ayu', gender: 'female', position: 'waiter', departmentId: 'fb_service', joinDate: daysFromNow(-120) },
  { fullName: 'I Made Budi', gender: 'male', position: 'sousChef', departmentId: 'kitchen', joinDate: daysFromNow(-560) },
  { fullName: 'Ni Luh Putri', gender: 'female', position: 'cook', departmentId: 'kitchen', joinDate: daysFromNow(-60) },
  { fullName: 'I Ketut Darma', gender: 'male', position: 'steward', departmentId: 'kitchen', joinDate: daysFromNow(-30) },
]

async function main() {
  ;({ idToken, uid: adminUid } = await token())
  console.log(`Seeding demo data as ${ADMIN_EMAIL}\n`)

  console.log('HR — employees')
  for (const [i, e] of EMPLOYEES.entries()) {
    await call(e.fullName, 'createEmployee', {
      ...e,
      birthDate: '1995-04-12',
      phone: `08123456${String(700 + i)}`,
      email: `${e.fullName.toLowerCase().replace(/[^a-z]+/g, '.')}@nourish.test`,
      outletId: OUTLET,
      // employmentStatus is the Indonesian contract class (PKWT/PKWTT/...),
      // not a generic 'permanent' — a different axis from contractType.
      employmentStatus: 'PKWTT',
      probationMonths: 3,
      contractType: 'permanent',
    })
  }

  console.log('\nOperations — shift reports')
  await call('opening shift report', 'submitShiftReport', {
    reportType: 'opening',
    shift: 'Morning',
    outletId: OUTLET,
    foodPromo: 'Nasi campur 20% off until 15:00',
    beveragePromo: 'Buy-one-get-one iced latte',
    specialMenu: 'Grilled snapper with sambal matah',
    unavailableItems: [
      { category: 'cakeGelato', product: 'Pistachio gelato', reason: 'Supplier delay', actionRequired: 'Chase supplier by 11:00' },
      { category: 'food', product: 'Beef rendang', reason: 'Prep not finished', actionRequired: 'Ready from 12:00' },
    ],
    limitedItems: [{ product: 'Sourdough loaf', remainingQty: 6, actionRequired: 'Stop selling after 6 covers' }],
    complaints: { present: false, details: '' },
    customerFeedback: { present: true, details: 'Regular guest praised the new breakfast menu.' },
    reviewRating: 4.6,
    reviewCount: 128,
    reviewKeyFeedback: 'Consistent praise for service speed; two mentions of noise at peak.',
    floor: { pic: 'I Wayan Suarta', regularStaff: 4, dailyWorker: 1, midShift: 0 },
    bar: { pic: 'Ni Kadek Ayu', regularStaff: 2, dailyWorker: 0, midShift: 0 },
    kitchen: { pic: 'I Made Budi', regularStaff: 5, dailyWorker: 2, midShift: 0 },
    steward: 2,
    cashier: 'Ni Luh Putri',
    absent: { present: true, details: 'One daily worker did not show; floor covered.' },
    sickLeave: { present: false, details: '' },
    permission: { present: false, details: '' },
    maintenance: { present: true, details: 'Chiller 2 running warm — engineering notified.' },
    equipment: { present: false, details: '' },
    otherNotes: 'Delivery expected 14:00.',
    checklistStatuses: { lights_on: true, equipment_check: true, stock_check: true, cleanliness_check: true, cash_float: true, staff_briefing: false },
    priorities: ['Chase the gelato supplier', 'Brief the new daily worker', 'Follow up chiller 2'],
  })

  await call('closing shift report', 'submitShiftReport', {
    reportType: 'closing',
    shift: 'Night',
    outletId: OUTLET,
    managerIc: 'I Wayan Suarta',
    supervisorIc: 'Ni Kadek Ayu',
    foodPromo: 'Nasi campur 20% off — ran all day',
    unavailableItems: [
      { category: 'cakeGelato', product: 'Pistachio gelato', reason: 'Still not delivered', actionRequired: 'Escalate to purchasing' },
    ],
    limitedItems: [],
    complaints: { present: true, details: 'Table 12 waited 35 minutes for mains; comped dessert.' },
    customerFeedback: { present: false, details: '' },
    reviewRating: 4.5,
    reviewCount: 131,
    floor: { pic: 'I Wayan Suarta', regularStaff: 4, dailyWorker: 1, midShift: 2 },
    bar: { pic: 'Ni Kadek Ayu', regularStaff: 2, dailyWorker: 0, midShift: 1 },
    kitchen: { pic: 'I Made Budi', regularStaff: 5, dailyWorker: 1, midShift: 2 },
    steward: 2,
    cashier: 'Ni Luh Putri',
    absent: { present: false, details: '' },
    sickLeave: { present: true, details: 'I Ketut Darma left at 20:00 — fever.' },
    permission: { present: false, details: '' },
    maintenance: { present: true, details: 'Chiller 2 still warm; work order raised.' },
    equipment: { present: false, details: '' },
    hygiene: { present: true, details: 'Floor drain by the dish pit blocked.' },
    stock: { present: true, details: 'Sourdough sold out by 19:00.' },
    otherNotes: 'Cash float reconciled, no variance.',
    checklistStatuses: {
      outlet_cleaned: true, kitchen_secured: true, bar_secured: true, equipment_off: true, chiller_checked: true,
      stock_updated: true, cashier_closed: true, maintenance_reported: true, handover_done: true, outlet_secured: true,
    },
    priorities: ['Chiller 2 — engineering first thing', 'Chase gelato delivery', 'Deep clean the dish pit drain'],
    followUpRequired: 'Engineering to attend chiller 2 before service.',
    picAcknowledgement: 'I Made Budi',
  })

  console.log('\nOperations — daily update')
  await call('daily update', 'submitDailyReport', {
    outletId: OUTLET,
    departmentId: 'fb_service',
    staffScheduled: 8,
    staffPresent: 7,
    absences: [{ name: 'Daily worker (agency)', reason: 'No-show' }],
    lateArrivals: [{ name: 'Ni Kadek Ayu', minutesLate: 15 }],
    achievements: ['Covers up 12% on last Tuesday', 'Zero food-safety findings on the spot check'],
    challenges: [
      { description: 'Chiller 2 running warm', category: 'equipment', severity: 'high', requiresFollowUp: true },
      { description: 'Gelato supplier missed the delivery window', category: 'supplier', severity: 'medium' },
    ],
    newTasks: [{ title: 'Get a quote for chiller 2 servicing', assignedTo: adminUid, priority: 'high', dueDate: daysFromNow(3) }],
  })

  console.log('\nOperations — work orders, incidents, lost & found, projects')
  await call('work order', 'createWorkOrder', {
    title: 'Chiller 2 running warm',
    description: 'Holding at 9°C against a 4°C setpoint. Stock moved to chiller 1 overnight.',
    location: 'Main kitchen, back line',
    priority: 'high',
    outletId: OUTLET,
    departmentId: 'kitchen',
    assignedToRole: 'engineering',
  })
  await call('incident report', 'createIncidentReport', {
    title: 'Guest slipped near the dish pit',
    description: 'Guest walked through the service corridor and slipped on standing water from a blocked drain. No injury.',
    incidentType: 'nearMiss',
    severity: 'medium',
    location: 'Service corridor, dish pit',
    occurredAt: `${today}T20:15`,
    peopleInvolved: [{ name: 'Guest (declined to give name)', role: 'customer' }],
    witnesses: [{ name: 'I Ketut Darma', contact: '08123456704' }],
    immediateActionTaken: 'Area mopped and coned, guest checked and offered assistance, drain reported to engineering.',
    outletId: OUTLET,
  })
  await call('lost & found item', 'createLostFoundItem', {
    itemDescription: 'Black sunglasses, tortoiseshell arms, no case',
    category: 'eyewear',
    valueTier: 'medium',
    foundLocation: 'Table 12, terrace',
    foundAt: today,
    storageLocation: 'Manager office drawer 2',
    outletId: OUTLET,
  })
  await call('project', 'createProject', {
    name: 'Terrace refurbishment',
    objective: 'Replace terrace furniture and re-lamp the pergola before high season.',
    startDate: daysFromNow(7),
    targetDate: daysFromNow(60),
    priority: 'medium',
    outletId: OUTLET,
    departmentId: 'fb_service',
    milestones: [
      { title: 'Quotes collected', dueDate: daysFromNow(14) },
      { title: 'Furniture ordered', dueDate: daysFromNow(30) },
      { title: 'Install complete', dueDate: daysFromNow(55) },
    ],
  })

  console.log('\nCommunications')
  await call('announcement (published)', 'createAnnouncement', {
    title: 'New breakfast menu launches Monday',
    body: 'The revised breakfast menu goes live on Monday. Briefing at 09:00 Saturday for all floor and kitchen staff. Printed menus arrive Friday.',
    category: 'operations',
    priority: 'medium',
    isPinned: true,
    publishNow: true,
  })
  await call('announcement (draft)', 'createAnnouncement', {
    title: 'Uniform order window closes Friday',
    body: 'Submit sizes to HR before Friday 17:00. Late requests go into the next quarterly order.',
    category: 'hr',
    priority: 'low',
  })
  await call('task', 'createTask', {
    title: 'Deep clean the dish pit drain',
    description: 'Blocked drain caused standing water and a near-miss. Needs a full clean, not a mop.',
    taskType: 'maintenance',
    sourceModule: 'operations',
    assignedTo: [adminUid],
    priority: 'high',
    dueDate: daysFromNow(2),
  })

  console.log('\nFinance')
  await call('expense request', 'createExpenseRequest', {
    purpose: 'Chiller 2 emergency service call',
    category: 'maintenance',
    paymentCategory: 'reimbursement',
    expenseDate: today,
    outletId: OUTLET,
    departmentId: 'kitchen',
    items: [
      { description: 'Call-out fee', amount: 750000, category: 'maintenance' },
      { description: 'Replacement thermostat', amount: 1250000, category: 'maintenance' },
    ],
    notes: 'Chiller holding 9°C against a 4°C setpoint; stock at risk.',
  })

  console.log(`\n${ok} created, ${failed} failed`)
  if (failed > 0) {
    console.log('Failures above are printed with the callable\'s own message — usually a field name or an enum value.')
  }
}

main().catch((error) => {
  console.error(`\nAborted: ${error.message}`)
  process.exitCode = 1
})
