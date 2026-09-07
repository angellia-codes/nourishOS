/**
 * backfill-communication-validity — recompute an Employee Communication
 * record's validity window from the incident date instead of the day it was
 * acknowledged.
 *
 * Why this exists: acknowledgeCommunicationRecord used to stamp
 * `validFrom = today`, so a warning about something that happened months ago
 * started its 90/180-day clock on the day the paperwork was signed. As of the
 * 2026-09-07 change it runs from `incident.date` (employee_communication.md
 * §13). Records already acknowledged still carry the old window — this brings
 * them in line.
 *
 * For every record with a non-null `validUntil` and an `incident.date`:
 *   validFrom  = incident.date
 *   validUntil = incident.date + validityDays   (validityDays falls back to the
 *                                                type default when unset)
 *   status     = expired when that date has passed, otherwise active
 *
 * Records with no incident date are left exactly as they are and reported —
 * there is nothing to recompute from, and inventing one is worse than the drift.
 * Draft / in-review / closed records are untouched: they have no window yet.
 *
 * Idempotent — re-running after --apply finds nothing left to change.
 *
 * Usage (from the repo root, PowerShell):
 *   node functions/tools/backfill-communication-validity.mjs --key C:\path\to\sa.json
 *   node functions/tools/backfill-communication-validity.mjs --key C:\path\to\sa.json --apply
 *
 * Against the emulator (no credentials needed):
 *   $env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
 *   node functions/tools/backfill-communication-validity.mjs --project demo-nourishos --apply
 *
 * Credentials: the key file is a root credential for the whole project — keep
 * it out of the repo and delete it when done.
 */

import { readFileSync } from 'node:fs'
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

/** Mirrors DISCIPLINARY_VALIDITY_DAYS (functions/src/hr/employees/helpers.ts). */
const VALIDITY_DAYS = {
  coaching: null,
  verbalWarning: 90,
  SP1: 180,
  SP2: 180,
  SP3: 180,
  termination: null,
}

const SYSTEM_UID = 'system'

function parseArgs(argv) {
  const args = { apply: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--apply') args.apply = true
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

/** WITA (UTC+8) — the business day, same rule as functions/src/lib/timestamps.ts. */
function todayIso() {
  return new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10)
}

function addDaysIso(days, from) {
  return new Date(Date.parse(`${from}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

async function main() {
  const today = todayIso()
  console.log(
    `backfill-communication-validity — ${args.apply ? 'APPLY' : 'DRY RUN'} against project "${projectId}" (today ${today} WITA)\n`,
  )

  const snap = await db.collection('disciplinaryActions').where('validUntil', '!=', null).get()

  const changes = []
  const missingIncident = []
  let unchanged = 0

  for (const doc of snap.docs) {
    const record = doc.data()
    const incidentDate = record.incident?.date ?? null
    if (!incidentDate) {
      missingIncident.push({ id: doc.id, record })
      continue
    }

    const validityDays = record.validityDays ?? VALIDITY_DAYS[record.type] ?? null
    if (validityDays === null) {
      unchanged += 1
      continue
    }

    const validUntil = addDaysIso(validityDays, incidentDate)
    // Only 'active'/'expired' are recomputed — a closed record's window is
    // history, and the status is set by whoever closed it.
    const status =
      record.status === 'active' || record.status === 'expired'
        ? validUntil <= today
          ? 'expired'
          : 'active'
        : record.status

    if (record.validFrom === incidentDate && record.validUntil === validUntil && record.status === status) {
      unchanged += 1
      continue
    }
    changes.push({ doc, record, validFrom: incidentDate, validUntil, status })
  }

  console.log(`Records with a validity window: ${snap.size}`)
  console.log(`  already correct: ${unchanged}`)
  console.log(`  no incident date (left alone): ${missingIncident.length}`)
  console.log(`  to update: ${changes.length}\n`)

  for (const { doc, record, validFrom, validUntil, status } of changes) {
    console.log(
      `  ${doc.id}  ${record.employeeName ?? '(no name)'}  ${record.type}` +
        `  ${record.validFrom ?? 'null'}..${record.validUntil ?? 'null'} (${record.status})` +
        `  ->  ${validFrom}..${validUntil} (${status})`,
    )
  }

  if (missingIncident.length > 0) {
    console.log('\nNo incident date — fill it in on the record, then re-run:')
    for (const { id, record } of missingIncident) {
      console.log(`  ${id}  ${record.employeeName ?? '(no name)'}  ${record.type}  (${record.status})`)
    }
  }

  if (!args.apply) {
    console.log('\nDry run. Re-run with --apply to write.')
    return
  }

  for (const { doc, validFrom, validUntil, status } of changes) {
    await doc.ref.update({ validFrom, validUntil, status, updatedAt: new Date(), updatedBy: SYSTEM_UID })
  }
  console.log(`\nUpdated ${changes.length} record${changes.length === 1 ? '' : 's'}.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
