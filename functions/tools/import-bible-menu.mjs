/**
 * Nourish's Bible — initial menu load (nourish-bible.md §3 Phase 1, §11).
 *
 * Writes MENU_SEED (functions/src/documents/bible/menuSeed.ts, transcribed
 * from docs/MENU NOURISH.pdf) into the editor collections, compiles a new
 * edition, points systemSettings/bibleEdition at it, and ticks every item for
 * any restaurant outlet that has no bibleOutletMenus doc yet — existing ticks
 * are never overwritten. Skips approval by design (§18): the source is the
 * printed, already-approved menu. Audited as BibleMenuImported.
 *
 * Dry run by default. Idempotent on itemCode (it is the doc id).
 *
 *   npm --prefix functions run build
 *   node functions/tools/import-bible-menu.mjs                        # dry run
 *   node functions/tools/import-bible-menu.mjs --key sa.json --apply  # write
 *
 *   # Emulator — no credentials:
 *   $env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
 *   node functions/tools/import-bible-menu.mjs --project demo-nourishos --apply
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const require = createRequire(import.meta.url)
const here = path.dirname(fileURLToPath(import.meta.url))
let edition, MENU_SEED
try {
  edition = require(path.join(here, '..', 'lib', 'documents', 'bible', 'edition.js'))
  ;({ MENU_SEED } = require(path.join(here, '..', 'lib', 'documents', 'bible', 'menuSeed.js')))
} catch {
  console.error('Could not load functions/lib/documents/bible — run `npm --prefix functions run build` first.')
  process.exit(1)
}
const { buildEdition, expandMenuSeed, BIBLE_OUTLETS } = edition

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
    const sa = JSON.parse(readFileSync(keyPath, 'utf8'))
    projectId = projectId ?? sa.project_id
    initializeApp({ credential: cert(sa), projectId })
  } else if (process.env.FIRESTORE_EMULATOR_HOST) {
    projectId = projectId ?? 'demo-nourishos'
    initializeApp({ projectId })
  } else {
    initializeApp({ credential: applicationDefault(), projectId })
  }
} catch (error) {
  console.error('Could not initialise the Admin SDK.')
  console.error(error.message)
  process.exit(1)
}
const db = getFirestore()

const ACTOR = 'system:import-bible-menu'
const base = { createdAt: FieldValue.serverTimestamp(), createdBy: ACTOR, updatedAt: FieldValue.serverTimestamp(), updatedBy: ACTOR, status: 'active', isArchived: false }
const touched = { updatedAt: FieldValue.serverTimestamp(), updatedBy: ACTOR }

async function main() {
  console.log(`import-bible-menu — ${args.apply ? 'APPLY' : 'DRY RUN'} against project "${projectId}"`)

  const { categories, items } = expandMenuSeed(MENU_SEED) // throws on a bad seed
  const byOwner = items.reduce((acc, item) => ({ ...acc, [item.owner]: (acc[item.owner] ?? 0) + 1 }), {})
  console.log(`Seed: ${categories.length} categories, ${items.length} items`, byOwner)

  const pointerRef = db.collection('systemSettings').doc('bibleEdition')
  const pointer = await pointerRef.get()
  let editionNumber = 1
  if (pointer.exists) {
    const current = await db.collection('bibleEditions').doc(pointer.get('currentEditionId')).get()
    editionNumber = (current.get('editionNumber') ?? 0) + 1
  }
  const body = buildEdition({ categories, items, content: [], editionNumber, publishedBy: ACTOR }) // throws over 900 KB
  console.log(`Edition ${editionNumber}: ${Math.round(Buffer.byteLength(JSON.stringify(body)) / 1024)} KB`)

  const outletSnaps = await Promise.all(BIBLE_OUTLETS.map((id) => db.collection('bibleOutletMenus').doc(id).get()))
  const newOutlets = BIBLE_OUTLETS.filter((_, i) => !outletSnaps[i].exists)
  console.log(`Outlet menus to create (all items ticked): ${newOutlets.join(', ') || 'none — existing ticks kept'}`)

  if (!args.apply) {
    console.log('\nDry run — nothing written. Re-run with --apply.')
    return
  }

  // Source records, chunked well under the 500-writes-per-batch limit.
  const writes = [
    ...categories.map((c) => [db.collection('bibleMenuCategories').doc(c.id), c]),
    ...items.map((i) => [db.collection('bibleMenuItems').doc(i.id), { ...i, lockedByRequestId: null }]),
  ]
  for (let i = 0; i < writes.length; i += 400) {
    const chunk = writes.slice(i, i + 400)
    const existing = await db.getAll(...chunk.map(([ref]) => ref))
    const batch = db.batch()
    chunk.forEach(([ref, data], j) => batch.set(ref, { ...data, ...(existing[j].exists ? touched : base) }, { merge: true }))
    await batch.commit()
  }

  // Edition + pointer in one transaction, so readers see old or new, never neither (§9).
  const editionRef = db.collection('bibleEditions').doc()
  await db.runTransaction(async (tx) => {
    tx.set(editionRef, { ...body, publishedAt: FieldValue.serverTimestamp(), ...base })
    tx.set(pointerRef, { currentEditionId: editionRef.id, ...(pointer.exists ? touched : base) }, { merge: true })
  })

  const allIds = items.map((i) => i.id)
  for (const outletId of newOutlets) {
    await db.collection('bibleOutletMenus').doc(outletId).set({ soldItemIds: allIds, priceOverrides: {}, ...base })
  }

  await db.collection('auditLogs').add({
    timestamp: FieldValue.serverTimestamp(),
    eventType: 'BibleMenuImported',
    category: 'Documents',
    module: 'documents',
    resourceType: 'bibleEdition',
    resourceId: editionRef.id,
    action: 'create',
    userId: ACTOR,
    userName: 'import-bible-menu',
    userRole: 'system',
    departmentId: null,
    outletId: null,
    severity: 'high',
    previousValues: null,
    newValues: null,
    metadata: { editionNumber, itemCount: items.length, categoryCount: categories.length, outletsCreated: newOutlets },
  })

  console.log(`\nDone. Edition ${editionNumber} (${editionRef.id}) is live.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
