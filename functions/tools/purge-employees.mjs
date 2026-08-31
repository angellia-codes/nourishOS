/**
 * purge-employees — delete every employee record and the documents
 * createEmployeeInternal writes alongside it, so a bulk import can be re-run
 * from a clean slate.
 *
 * A bare `employees` wipe is not enough. One createEmployee writes across five
 * collections plus a counter, and the other four are keyed by employeeId with
 * no cascade behind them:
 *
 *   employees/{id}                        the record itself
 *   employees/{id}/compensation/current   salary + bank details, when the import carried them
 *   contracts/{id}                        version-1 contract (createContractInternal)
 *   employeeActivities/{id}               the 'hired' timeline entry
 *   trainingAssignments/{id}              the department's onboarding sequence — several per employee
 *   activityFeed/{id}                     the company-wide "X joined as Y" entry
 *   systemSettings/employeeNumberSequences   per-prefix counter, incremented per hire
 *
 * activityFeed is shared with announcements, SOPs and tasks, so it is the one
 * collection filtered rather than emptied — only resourceType == 'employee'.
 *
 * Leave those behind and the next import produces a register whose
 * contract history, activity timeline and training queue are full of rows
 * pointing at employees that no longer exist. Nothing in the app reconciles
 * that, and nothing surfaces it — the pages just render orphans.
 *
 * What this deliberately does NOT touch:
 *   - auditLogs. AUDIT_LOG.md §8 makes the trail append-only and unreadable
 *     even to superAdmin; a purge tool that quietly rewrites history is worse
 *     than a few EmployeeCreated events for ids that are gone.
 *   - candidates / onboardingChecklists. Only reachable when createEmployee was
 *     called with a candidateId, which the CSV import never does, and they are
 *     recruitment records that outlive the employee anyway.
 *   - payrollRecords, attendanceRecords, appraisals, disciplinaryActions,
 *     exitInterviews, offboardingChecklists. None are written by createEmployee.
 *     If real ones exist for these employees this script will say so and stop,
 *     because deleting the employees under them silently breaks those modules.
 *
 * Safety:
 *   - Dry run by default. Nothing is written without --apply.
 *   - Prints a full count per collection, and the first few employees by name,
 *     before doing anything.
 *   - Refuses to run if dependent records exist (see above) unless --force.
 *   - --reset-numbers also clears systemSettings/employeeNumberSequences so the
 *     re-import starts at 0001 again. Off by default: if ANY employee predates
 *     this import, resetting the counter will re-issue numbers that are already
 *     in use, and employeeNumber is not unique-constrained anywhere.
 *
 * THIS IS IRREVERSIBLE. Firestore has no undo and no soft-delete here. Export
 * first if the data matters:
 *   gcloud firestore export gs://<bucket>/pre-purge --collection-ids=employees,contracts,employeeActivities,trainingAssignments,activityFeed
 *
 * Usage (from the repo root, PowerShell):
 *   node functions/tools/purge-employees.mjs --key C:\path\to\sa.json
 *   node functions/tools/purge-employees.mjs --key C:\path\to\sa.json --apply
 *   node functions/tools/purge-employees.mjs --key C:\path\to\sa.json --apply --reset-numbers
 *
 * Against the emulator (no credentials needed):
 *   $env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
 *   node functions/tools/purge-employees.mjs --project demo-nourishos --apply
 *
 * Credentials: this machine has neither gcloud nor application-default
 * credentials, so pass --key with a service account JSON from
 * Console > Project settings > Service accounts > Generate new private key.
 * The key file is a root credential for the whole project — keep it out of the
 * repo and delete it when done.
 */

import { readFileSync } from 'node:fs'
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

/** Written by createEmployeeInternal, keyed by employeeId, no cascade. */
const CASCADE = [
  { collection: 'contracts', field: 'employeeId' },
  { collection: 'employeeActivities', field: 'employeeId' },
  { collection: 'trainingAssignments', field: 'employeeId' },
]

/**
 * Written by other modules against an employee. Their existence means this is
 * a live register, not a botched import — stop rather than strand them.
 */
const DEPENDENTS = [
  { collection: 'payrollRecords', field: 'employeeId' },
  { collection: 'attendanceRecords', field: 'employeeId' },
  { collection: 'appraisals', field: 'employeeId' },
  { collection: 'disciplinaryActions', field: 'employeeId' },
  { collection: 'offboardingChecklists', field: 'employeeId' },
  { collection: 'exitInterviews', field: 'employeeId' },
]

function parseArgs(argv) {
  const args = { apply: false, resetNumbers: false, force: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--apply') args.apply = true
    else if (arg === '--reset-numbers') args.resetNumbers = true
    else if (arg === '--force') args.force = true
    else if (arg === '--key') args.key = argv[++i]
    else if (arg === '--project') args.project = argv[++i]
    else {
      console.error(`Unknown argument: ${arg}`)
      process.exit(2)
    }
  }
  return args
}

const args = parseArgs(process.argv.slice(2))
const keyPath = args.key ?? process.env.GOOGLE_APPLICATION_CREDENTIALS
let projectId = args.project

try {
  if (keyPath) {
    const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'))
    projectId = projectId ?? serviceAccount.project_id
    initializeApp({ credential: cert(serviceAccount), projectId })
  } else if (process.env.FIRESTORE_EMULATOR_HOST) {
    initializeApp({ projectId: projectId ?? 'demo-nourishos' })
  } else {
    initializeApp({ credential: applicationDefault(), projectId })
  }
} catch (error) {
  console.error('Could not initialise the Admin SDK.')
  console.error(error.message)
  console.error('\nPass --key <path-to-service-account.json> (Console > Project settings > Service accounts).')
  process.exit(1)
}

const db = getFirestore()

/** Firestore caps a batch at 500 writes. */
async function deleteRefs(refs) {
  for (let i = 0; i < refs.length; i += 450) {
    const batch = db.batch()
    for (const ref of refs.slice(i, i + 450)) batch.delete(ref)
    await batch.commit()
  }
}

async function main() {
  console.log(`Project: ${projectId ?? '(from credentials)'}`)
  console.log(args.apply ? 'Mode:    APPLY (deletes are real and irreversible)\n' : 'Mode:    dry run (pass --apply to delete)\n')

  const employees = await db.collection('employees').get()

  // An empty `employees` is NOT "nothing to do": deleting the collection from
  // the Console leaves every cascade row behind, which is how this tool most
  // often gets reached. Keep going and clear the orphans.
  if (employees.empty) {
    console.log('employees: 0 documents (already deleted, or never created)')
  } else {
    console.log(`employees: ${employees.size} document(s)`)
    for (const doc of employees.docs.slice(0, 5)) {
      const d = doc.data()
      console.log(`   ${d.employeeNumber ?? '(no number)'}  ${d.fullName ?? '(no name)'}  [${d.status ?? '?'}]`)
    }
    if (employees.size > 5) console.log(`   …${employees.size - 5} more`)
  }

  // Dependents: any row here means a live register, not a botched import.
  // Counted unconditionally rather than filtered by employeeId — this wipes
  // the WHOLE register, so a payslip or appraisal for an employee that is
  // already gone is just as much a reason to stop and look.
  const blocking = []
  for (const { collection } of DEPENDENTS) {
    const snap = await db.collection(collection).get()
    if (snap.size) blocking.push(`${collection}: ${snap.size}`)
  }
  if (blocking.length) {
    console.log(`\nRecords from other modules reference these employees:`)
    for (const line of blocking) console.log(`   ${line}`)
    if (!args.force) {
      console.log('\nRefusing to purge — deleting the employees would strand these.')
      console.log('Resolve them first, or re-run with --force if you are certain.')
      process.exit(1)
    }
    console.log('\n--force given; continuing anyway.')
  }

  // Every row in these is either attached to an employee being deleted here or
  // already orphaned by an earlier Console delete — the whole register is going
  // either way, so there is no id set worth filtering on.
  const toDelete = []
  for (const { collection, field } of CASCADE) {
    const snap = await db.collection(collection).get()
    const orphans = employees.empty ? snap.size : snap.docs.filter((d) => !d.get(field)).length
    console.log(`${collection}: ${snap.size} document(s)${orphans ? ` (${orphans} already orphaned)` : ''}`)
    toDelete.push(...snap.docs.map((d) => d.ref))
  }

  // activityFeed is company-wide — announcements, SOPs and tasks write here
  // too — so this one IS filtered, by the resourceType createEmployee stamps.
  // Wiping the collection would take out the whole company feed.
  const feed = await db.collection('activityFeed').where('resourceType', '==', 'employee').get()
  console.log(`activityFeed: ${feed.size} employee entr${feed.size === 1 ? 'y' : 'ies'} (other modules' entries are left alone)`)
  toDelete.push(...feed.docs.map((d) => d.ref))

  // The compensation subcollection is not reached by deleting its parent.
  let compensation = 0
  for (const doc of employees.docs) {
    const sub = await doc.ref.collection('compensation').get()
    compensation += sub.size
    toDelete.push(...sub.docs.map((d) => d.ref))
  }
  console.log(`employees/*/compensation: ${compensation} document(s)`)

  toDelete.push(...employees.docs.map((d) => d.ref))

  if (toDelete.length === 0) {
    console.log('\nNothing to delete — the register and its cascade collections are already clear.')
    return
  }

  console.log(`\nTotal to delete: ${toDelete.length} document(s)`)
  if (args.resetNumbers) console.log('Plus: systemSettings/employeeNumberSequences will be reset to 0.')
  else console.log('Employee numbers will CONTINUE from the current counter (pass --reset-numbers to restart at 0001).')

  if (!args.apply) {
    console.log('\nDry run — nothing was deleted. Re-run with --apply.')
    return
  }

  await deleteRefs(toDelete)
  if (args.resetNumbers) await db.collection('systemSettings').doc('employeeNumberSequences').delete()

  console.log(`\nDeleted ${toDelete.length} document(s).`)
  console.log('auditLogs were left intact by design — see this file’s header.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
