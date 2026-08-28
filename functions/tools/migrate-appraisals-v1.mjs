/**
 * migrate-appraisals-v1 — appraisal-v2-design.md §13.
 *
 * Appraisal v2 shipped alongside the frozen v1 module (the shipped 1-5
 * single-reviewer instrument). Existing v1 documents predate the
 * `scoringModelVersion` field entirely, so this stamps it explicitly
 * (`scoringModelVersion: 1`) on every `appraisals` doc that doesn't already
 * carry `2` — that's what lets the frontend render a v1 doc's 1-5 scale
 * distinctly rather than guessing from field shape at render time. It also
 * flips the 5 hand-seeded v1 templates (`appraisalTemplateSeeds.ts`,
 * identified by having `subjects` rather than `criteria`) to
 * `templateStatus: 'archived'` — readable, but createAppraisal can no
 * longer pick them up (it only ever queries `templateStatus in
 * ['approved','stale']`).
 *
 * No rescaling happens anywhere in this script (§2.8) — a v1 `overallScore`
 * of 3/5 is never touched, never multiplied, never copied onto `finalScore`.
 *
 * Safety: dry run by default, --apply to write. Idempotent — a doc already
 * carrying the right stamp is skipped, so re-running is always safe.
 *
 * Usage (from the repo root):
 *   node functions/tools/migrate-appraisals-v1.mjs --key <service-account.json>
 *   node functions/tools/migrate-appraisals-v1.mjs --key <service-account.json> --apply
 * Against the emulator:
 *   $env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080"
 *   node functions/tools/migrate-appraisals-v1.mjs --project demo-nourishos --apply
 */

import { readFileSync } from 'node:fs'
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

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

async function writeInBatches(refs, data) {
  for (let i = 0; i < refs.length; i += 500) {
    const batch = db.batch()
    refs.slice(i, i + 500).forEach((ref) => batch.update(ref, data))
    await batch.commit()
  }
}

async function main() {
  console.log(`migrate-appraisals-v1 — ${args.apply ? 'APPLY' : 'DRY RUN'}\n`)

  const appraisalsSnap = await db.collection('appraisals').get()
  const v1Appraisals = appraisalsSnap.docs.filter((doc) => doc.data().scoringModelVersion !== 2 && doc.data().scoringModelVersion !== 1)
  console.log(`appraisals: ${appraisalsSnap.size} total, ${v1Appraisals.length} unstamped v1 document(s)`)

  const templatesSnap = await db.collection('appraisalTemplates').get()
  const v1Templates = templatesSnap.docs.filter(
    (doc) => Array.isArray(doc.data().subjects) && doc.data().templateStatus !== 'archived',
  )
  console.log(`appraisalTemplates: ${templatesSnap.size} total, ${v1Templates.length} v1 template(s) to archive`)

  if (!args.apply) {
    console.log(`\n${v1Appraisals.length} appraisal(s) would be stamped scoringModelVersion:1.`)
    console.log(`${v1Templates.length} template(s) would be set templateStatus:'archived'.`)
    console.log('\nRe-run with --apply to write.')
    return
  }

  if (v1Appraisals.length > 0) {
    await writeInBatches(v1Appraisals.map((doc) => doc.ref), { scoringModelVersion: 1 })
    console.log(`\nStamped ${v1Appraisals.length} appraisal(s) scoringModelVersion:1.`)
  }
  if (v1Templates.length > 0) {
    await writeInBatches(v1Templates.map((doc) => doc.ref), { scoringModelVersion: 1, templateStatus: 'archived' })
    console.log(`Archived ${v1Templates.length} v1 template(s).`)
  }
  if (v1Appraisals.length === 0 && v1Templates.length === 0) {
    console.log('\nNothing to migrate.')
  }
}

main().catch((error) => {
  console.error(`\nFailed: ${error.message}`)
  process.exitCode = 1
})
