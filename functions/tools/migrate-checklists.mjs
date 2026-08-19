/**
 * migrate-checklists — carry `openingChecklists` / `closingChecklists`
 * documents forward into the `shiftHandovers` collection that replaced them
 * (opening_closing_shift_report_template.md; see src/features/operations/CLAUDE.md).
 *
 * The standalone Opening/Closing Checklists feature was absorbed into the
 * Shift Report on 2026-08-19. Its two collections lost their firestore.rules
 * blocks with it, so anything already in them fell through to the deny-all and
 * became unreadable. This turns each one into a real (if thin) shift report so
 * the history stays visible.
 *
 * What a migrated report is, and is not:
 *   - The checklist section is real — it is the only thing the old feature
 *     ever captured.
 *   - Every other section (shift name, promos, staffing, issues, handover) was
 *     never recorded and is written empty. `otherNotes` says so in plain text
 *     so nobody mistakes a migrated record for a manager who filed a blank
 *     report. There is no schema field for "this was migrated" on purpose —
 *     the note is where a human actually reads it.
 *
 * Closing item ids changed when the template's ten items replaced the old six,
 * so CLOSING_ID_MAP below is applied. Two old items have no equivalent at all;
 * when they were ticked, that is recorded in `otherNotes` rather than dropped
 * silently or forced onto an item that means something else.
 *
 * Safety:
 *   - Dry run by default. Nothing is written without --apply.
 *   - A checklist whose target id already holds a shift report is SKIPPED, never
 *     overwritten — a real report always wins over a migrated one.
 *   - The old checklist documents are left in place. Deleting them is
 *     irreversible and buys nothing; nothing reads them any more.
 *
 * Usage (from the repo root, PowerShell):
 *   node functions/tools/migrate-checklists.mjs --key C:\path\to\sa.json
 *   node functions/tools/migrate-checklists.mjs --key C:\path\to\sa.json --apply
 *
 * Against the emulator (no credentials needed):
 *   $env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
 *   node functions/tools/migrate-checklists.mjs --project demo-nourishos --apply
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

/**
 * Old closing item id -> new one. Only mappings where the two labels mean the
 * same thing; a near-miss would silently rewrite what a manager actually
 * confirmed, which is worse than reporting the item as unmapped.
 *
 *   equipment_off    "Turn off all non-essential equipment"  -> "Equipment switched off / secured"
 *   cleaning_done    "Complete closing cleaning tasks"       -> "Outlet cleaned and organized"
 *   cash_reconciled  "Reconcile and secure the cash float"   -> "Cashier closing completed"
 *   doors_locked     "Lock all doors and windows"            -> "Outlet secured"
 *
 * Deliberately absent, with the old label kept here so the choice is auditable:
 *   stock_secured    "Secure stock and storage areas"  — the new "Stock / N/A items
 *                    updated" is a different action, not a rename.
 *   lights_off       "Turn off lights and signage"     — the template dropped it.
 */
const CLOSING_ID_MAP = {
  equipment_off: 'equipment_off',
  cleaning_done: 'outlet_cleaned',
  cash_reconciled: 'cashier_closed',
  doors_locked: 'outlet_secured',
}

const UNMAPPED_CLOSING_LABELS = {
  stock_secured: 'Secure stock and storage areas',
  lights_off: 'Turn off lights and signage',
}

/** Opening items were not renumbered — all six ids carried over unchanged. */
const OPENING_IDS = new Set([
  'lights_on',
  'equipment_check',
  'stock_check',
  'cleanliness_check',
  'cash_float',
  'staff_briefing',
])

const SOURCE_COLLECTIONS = [
  { name: 'openingChecklists', reportType: 'opening' },
  { name: 'closingChecklists', reportType: 'closing' },
]

const TARGET_COLLECTION = 'shiftHandovers'

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
    // The emulator accepts any project id and needs no credential.
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

const BLANK_ISSUE = { present: false, details: '' }
const BLANK_STAFFING = { pic: '', regularStaff: 0, dailyWorker: 0, midShift: 0 }

/**
 * Translate one checklist's itemStatuses into the report's flat
 * `checklistStatuses`, reporting anything that could not be carried across.
 */
function convertChecklist(reportType, itemStatuses) {
  const statuses = {}
  const unmappedCompleted = []
  const unknownIds = []

  for (const [oldId, status] of Object.entries(itemStatuses ?? {})) {
    const completed = status?.completed === true

    if (reportType === 'opening') {
      if (!OPENING_IDS.has(oldId)) {
        unknownIds.push(oldId)
        continue
      }
      statuses[oldId] = completed
      continue
    }

    const newId = CLOSING_ID_MAP[oldId]
    if (newId) {
      // Two old ids could in principle land on one new id; a tick wins.
      statuses[newId] = statuses[newId] === true || completed
      continue
    }
    if (UNMAPPED_CLOSING_LABELS[oldId]) {
      if (completed) unmappedCompleted.push(UNMAPPED_CLOSING_LABELS[oldId])
      continue
    }
    unknownIds.push(oldId)
  }

  return { statuses, unmappedCompleted, unknownIds }
}

function buildNote(reportType, unmappedCompleted, unknownIds) {
  const lines = [
    `Migrated from the standalone ${reportType} checklist. Only the checklist ` +
      'section is real — this report predates the Shift Report form, so no ' +
      'shift name, staffing, promo, issue or handover detail was ever captured.',
  ]
  if (unmappedCompleted.length > 0) {
    lines.push(
      `Completed on the old checklist but with no equivalent item on the new one: ${unmappedCompleted.join('; ')}.`,
    )
  }
  if (unknownIds.length > 0) {
    lines.push(`Unrecognised legacy item ids, not carried across: ${unknownIds.join(', ')}.`)
  }
  return lines.join('\n\n')
}

function buildReport(source, reportType, checklistStatuses, note) {
  return {
    reportType,
    outletId: source.outletId,
    date: source.date,
    // The old checklist was keyed per outlet+day, never per shift.
    shift: 'Unrecorded',
    picUid: source.createdBy ?? '',

    foodPromo: '',
    beveragePromo: '',
    specialMenu: '',

    unavailableItems: [],
    limitedItems: [],

    complaints: { ...BLANK_ISSUE },
    customerFeedback: { ...BLANK_ISSUE },
    reviewRating: null,
    reviewCount: null,
    reviewKeyFeedback: '',

    managerIc: '',
    supervisorIc: '',
    floor: { ...BLANK_STAFFING },
    bar: { ...BLANK_STAFFING },
    kitchen: { ...BLANK_STAFFING },
    steward: 0,
    cashier: '',
    otherPositions: '',
    absent: { ...BLANK_ISSUE },
    sickLeave: { ...BLANK_ISSUE },
    permission: { ...BLANK_ISSUE },

    maintenance: { ...BLANK_ISSUE },
    equipment: { ...BLANK_ISSUE },
    hygiene: { ...BLANK_ISSUE },
    stock: { ...BLANK_ISSUE },
    otherNotes: note,

    checklistStatuses,

    priorities: [],
    followUpRequired: '',
    picAcknowledgement: '',

    // A closing report normally points at that morning's opening report. The
    // link is resolved in a second pass, once both halves exist.
    openingReportId: null,

    // The original stamps are kept — when the checklist was filled in is the
    // fact worth preserving; when it was migrated is not.
    createdAt: source.createdAt ?? null,
    createdBy: source.createdBy ?? '',
    updatedAt: source.updatedAt ?? null,
    updatedBy: source.updatedBy ?? '',
    status: 'submitted',
    isArchived: source.isArchived === true,
  }
}

async function main() {
  console.log(`migrate-checklists — ${args.apply ? 'APPLY' : 'DRY RUN'}\n`)

  const planned = []
  const skipped = []
  const malformed = []

  for (const { name, reportType } of SOURCE_COLLECTIONS) {
    const snap = await db.collection(name).get()
    console.log(`${name}: ${snap.size} document(s)`)

    for (const doc of snap.docs) {
      const source = doc.data()

      if (!source.outletId || !source.date) {
        malformed.push(`${name}/${doc.id} — missing outletId or date`)
        continue
      }

      const targetId = `${source.outletId}__${source.date}__${reportType}`
      const existing = await db.collection(TARGET_COLLECTION).doc(targetId).get()
      if (existing.exists) {
        skipped.push(`${name}/${doc.id} -> ${targetId} (a shift report already exists there)`)
        continue
      }

      const { statuses, unmappedCompleted, unknownIds } = convertChecklist(reportType, source.itemStatuses)
      planned.push({
        sourcePath: `${name}/${doc.id}`,
        targetId,
        reportType,
        ticked: Object.values(statuses).filter(Boolean).length,
        total: Object.keys(statuses).length,
        unmappedCompleted,
        unknownIds,
        report: buildReport(source, reportType, statuses, buildNote(reportType, unmappedCompleted, unknownIds)),
      })
    }
  }

  console.log('')
  for (const entry of planned) {
    console.log(`  ${entry.sourcePath} -> ${TARGET_COLLECTION}/${entry.targetId}`)
    console.log(`      ${entry.ticked}/${entry.total} item(s) ticked`)
    if (entry.unmappedCompleted.length > 0) {
      console.log(`      no new equivalent (recorded in otherNotes): ${entry.unmappedCompleted.join('; ')}`)
    }
    if (entry.unknownIds.length > 0) {
      console.log(`      unrecognised item ids: ${entry.unknownIds.join(', ')}`)
    }
  }

  if (skipped.length > 0) {
    console.log('\nSkipped — not overwritten:')
    skipped.forEach((line) => console.log(`  ${line}`))
  }
  if (malformed.length > 0) {
    console.log('\nSkipped — malformed source document:')
    malformed.forEach((line) => console.log(`  ${line}`))
  }

  if (!args.apply) {
    console.log(`\n${planned.length} document(s) would be migrated. Re-run with --apply to write them.`)
    return
  }

  if (planned.length === 0) {
    console.log('\nNothing to migrate.')
    return
  }

  // One batch per 500 writes is Firestore's limit; a checklist backlog will
  // never approach it, but chunking costs one line.
  for (let i = 0; i < planned.length; i += 500) {
    const batch = db.batch()
    for (const entry of planned.slice(i, i + 500)) {
      batch.set(db.collection(TARGET_COLLECTION).doc(entry.targetId), entry.report)
    }
    await batch.commit()
  }
  console.log(`\nWrote ${planned.length} shift report(s).`)

  // Second pass: a migrated closing report links to that day's opening report
  // the way submitShiftReport does, whether the opening half was migrated in
  // this run or filed for real earlier.
  let linked = 0
  const linkBatch = db.batch()
  for (const entry of planned.filter((e) => e.reportType === 'closing')) {
    const openingId = `${entry.report.outletId}__${entry.report.date}__opening`
    if ((await db.collection(TARGET_COLLECTION).doc(openingId).get()).exists) {
      linkBatch.update(db.collection(TARGET_COLLECTION).doc(entry.targetId), { openingReportId: openingId })
      linked += 1
    }
  }
  if (linked > 0) {
    await linkBatch.commit()
    console.log(`Linked ${linked} closing report(s) to their opening report.`)
  }

  console.log(
    `\nThe original ${SOURCE_COLLECTIONS.map((c) => c.name).join(' / ')} documents were left in place ` +
      '— nothing reads them, and deleting them is irreversible. Remove them by hand once you are satisfied.',
  )
}

main().catch((error) => {
  console.error(`\nFailed: ${error.message}`)
  process.exitCode = 1
})
