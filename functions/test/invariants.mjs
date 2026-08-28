#!/usr/bin/env node
/**
 * Tier 0 invariant checks — the configuration-drift class this codebase keeps
 * re-hitting, per root CLAUDE.md "Intentional duplication" and "Gotchas".
 *
 *   node functions/test/invariants.mjs
 *
 * No emulator, no JVM, and deliberately NO build step: this reads the .ts
 * sources as text so it can run before `tsc`, in a pre-commit hook, or on a
 * machine with no JRE. Every sibling script in this folder needs
 * `npm --prefix functions run build` first; this one does not.
 *
 * What it does NOT do: type checking (that is `npm run build`) or anything a
 * typed `const` already guarantees. `PERMISSIONS.FOO` referenced from a
 * callable is checked by tsc against the same object literal it came from, so
 * asserting that here would be theatre. What tsc CANNOT see is that
 * `src/constants/*` and `functions/src/lib/*` are hand-mirrored across two
 * separate npm packages, and that `firestore.rules` hardcodes the same names a
 * third time. That gap is the entire subject of this file.
 *
 * Definition of done items covered: #3 (mirrors + rules block) and #6 (an
 * index for every equality+orderBy query).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8')

let failures = 0
let checksRun = 0

function check(label, fn) {
  checksRun += 1
  let detail
  try {
    detail = fn()
  } catch (error) {
    failures += 1
    console.error(`  ✗ ${label}`)
    for (const line of String(error.message).split('\n')) console.error(`      ${line}`)
    return
  }
  console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`)
}

function fail(message) {
  throw new Error(message)
}

function heading(title) {
  console.log(`\n${title}`)
}

function note(message) {
  console.log(`    · ${message}`)
}

// ---------------------------------------------------------------------------
// Source parsing
//
// These are resolvers, not greps: the permission parser evaluates
// permission(PERMISSION_MODULES.X, ACTIONS.Y) against the maps parsed out of
// the same file, because the frontend composes its strings while the backend
// writes them literally — a text diff of the two files returns ~80 phantom
// differences. Every parser below self-checks (see the "Parsers" section): a
// parser that silently matches nothing would turn this whole file into a green
// light that means nothing.
// ---------------------------------------------------------------------------

/** Slice a balanced {...} or [...] or (...) region starting at the first `open` at/after `from`. */
function sliceDelimited(src, from, open = '{', close = '}') {
  const start = src.indexOf(open, from)
  if (start === -1) return null
  let depth = 0
  let inString = null
  let inLineComment = false
  let inBlockComment = false
  for (let i = start; i < src.length; i += 1) {
    const c = src[i]
    const next = src[i + 1]
    if (inLineComment) {
      if (c === '\n') inLineComment = false
      continue
    }
    if (inBlockComment) {
      if (c === '*' && next === '/') {
        inBlockComment = false
        i += 1
      }
      continue
    }
    if (inString) {
      if (c === '\\') i += 1
      else if (c === inString) inString = null
      continue
    }
    if (c === '/' && next === '/') {
      inLineComment = true
      i += 1
      continue
    }
    if (c === '/' && next === '*') {
      inBlockComment = true
      i += 1
      continue
    }
    if (c === "'" || c === '"' || c === '`') {
      inString = c
      continue
    }
    if (c === open) depth += 1
    else if (c === close) {
      depth -= 1
      if (depth === 0) return { start, end: i, body: src.slice(start + 1, i) }
    }
  }
  return null
}

/** Body of `export const NAME ... = { ... }`. */
function constBody(src, name, open = '{', close = '}') {
  const decl = new RegExp(`(?:export\\s+)?const\\s+${name}\\b`).exec(src)
  if (!decl) fail(`could not find a declaration for ${name}`)
  const eq = src.indexOf('=', decl.index)
  if (eq === -1) fail(`${name} has no initializer`)
  const region = sliceDelimited(src, eq, open, close)
  if (!region) fail(`${name}'s initializer is not a balanced ${open}...${close}`)
  return region.body
}

/** Strip comments so entry regexes never match commented-out sample code. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

/** `KEY: 'value'` pairs. */
function parseKeyLiteralMap(body) {
  const out = new Map()
  const re = /([A-Za-z_][A-Za-z0-9_]*)\s*:\s*'([^']*)'/g
  let m
  while ((m = re.exec(stripComments(body)))) out.set(m[1], m[2])
  return out
}

/** `key: ['a', 'b']` pairs. */
function parseKeyArrayMap(body) {
  const clean = stripComments(body)
  const out = new Map()
  const re = /([A-Za-z_][A-Za-z0-9_]*)\s*:\s*\[/g
  let m
  while ((m = re.exec(clean))) {
    const region = sliceDelimited(clean, m.index + m[0].length - 1, '[', ']')
    if (!region) continue
    out.set(
      m[1],
      [...region.body.matchAll(/'([^']*)'/g)].map((x) => x[1]),
    )
    re.lastIndex = region.end
  }
  return out
}

/** Every quoted string inside a region, in order. */
function quotedStrings(body) {
  return [...stripComments(body).matchAll(/'([^']*)'/g)].map((m) => m[1])
}

/**
 * Note there is no `lib` in the skip list: `functions/src/lib` holds the
 * mirrored constants this whole file is about. The compiled `functions/lib`
 * is never reached because the walk starts at `functions/src`.
 */
function walk(dir, exts, out = []) {
  let entries
  try {
    entries = readdirSync(path.join(ROOT, dir))
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const rel = `${dir}/${entry}`
    if (statSync(path.join(ROOT, rel)).isDirectory()) walk(rel, exts, out)
    else if (exts.some((e) => entry.endsWith(e))) out.push(rel)
  }
  return out
}

const FRONTEND_FILES = walk('src', ['.ts', '.tsx'])
const BACKEND_FILES = walk('functions/src', ['.ts'])
const RULES = read('firestore.rules')
const INDEXES = JSON.parse(read('firestore.indexes.json'))

const feCollections = parseKeyLiteralMap(constBody(read('src/constants/collections.ts'), 'COLLECTIONS'))
const beCollections = parseKeyLiteralMap(constBody(read('functions/src/lib/collections.ts'), 'COLLECTIONS'))

// ---------------------------------------------------------------------------

console.log('NourishOS invariants — static checks, no emulator required')

heading('Parsers (a parser that matches nothing must fail, not pass)')

check('source tree walked', () => {
  if (FRONTEND_FILES.length < 100) fail(`only ${FRONTEND_FILES.length} frontend files found`)
  if (BACKEND_FILES.length < 100) fail(`only ${BACKEND_FILES.length} backend files found`)
  return `${FRONTEND_FILES.length} frontend / ${BACKEND_FILES.length} backend files`
})

check('COLLECTIONS parsed from both packages', () => {
  if (feCollections.size < 50) fail(`frontend COLLECTIONS parsed only ${feCollections.size} entries`)
  if (beCollections.size < 30) fail(`backend COLLECTIONS parsed only ${beCollections.size} entries`)
  return `${feCollections.size} frontend / ${beCollections.size} backend`
})

// --- 1. Collections -------------------------------------------------------

heading('1. Collections — every collection actually read has a firestore.rules block')

/**
 * Deliberately NOT "every name in COLLECTIONS": 42 of the frontend's 110 are
 * reserved-and-unused placeholders (root CLAUDE.md names `preventiveMaintenance`
 * and `equipmentInspections` explicitly), so a naive diff is all noise. Only
 * keys a query actually references can fail at runtime.
 */
function usedCollectionKeys(files, constantsFile) {
  const used = new Set()
  for (const file of files) {
    if (file === constantsFile) continue
    // Comments stripped: a collection named in prose is not a query.
    for (const m of stripComments(read(file)).matchAll(/COLLECTIONS\.([A-Z_0-9]+)/g)) used.add(m[1])
  }
  return used
}

const feUsed = usedCollectionKeys(FRONTEND_FILES, 'src/constants/collections.ts')
const beUsed = usedCollectionKeys(BACKEND_FILES, 'functions/src/lib/collections.ts')

/**
 * Any `match /<name>/…` counts, including a specific-document match rather
 * than a `{wildcard}` collection match — `systemSettings` is ruled as two
 * document paths (jobDescriptionAccess, sopAccess) and is correct that way.
 *
 * So this detects the TOTAL ABSENCE of rules for a collection, which is the
 * failure that reaches production silently. It does not verify that every
 * document a query touches is actually covered — a partially-ruled collection
 * passes here. That is Tier 2's job (rules tests against the emulator).
 */
function rulesHasBlock(name) {
  return new RegExp(`match\\s+/${name}/`).test(RULES)
}

check('frontend: every referenced collection has a rules block', () => {
  const missing = []
  for (const key of [...feUsed].sort()) {
    const value = feCollections.get(key)
    if (!value) fail(`COLLECTIONS.${key} is referenced in src/ but not defined in src/constants/collections.ts`)
    if (!rulesHasBlock(value)) missing.push(`COLLECTIONS.${key} -> '${value}'`)
  }
  if (missing.length) {
    fail(
      `${missing.length} referenced collection(s) fall through to the deny-all match, so\n` +
        `reads return empty or permission-denied rather than failing loudly:\n` +
        missing.map((m) => `  - ${m}`).join('\n'),
    )
  }
  return `${feUsed.size} referenced`
})

check('backend: every referenced collection has a rules block', () => {
  const missing = []
  for (const key of [...beUsed].sort()) {
    const value = beCollections.get(key)
    if (!value) fail(`COLLECTIONS.${key} is referenced in functions/src/ but not defined in the backend mirror`)
    if (!rulesHasBlock(value)) missing.push(`COLLECTIONS.${key} -> '${value}'`)
  }
  if (missing.length) fail(`no rules block for:\n${missing.map((m) => `  - ${m}`).join('\n')}`)
  return `${beUsed.size} referenced`
})

check('backend COLLECTIONS is a strict subset of the frontend source of truth', () => {
  const feValues = new Set(feCollections.values())
  const extra = [...beCollections.entries()].filter(([, v]) => !feValues.has(v))
  if (extra.length) {
    fail(
      `these exist only in functions/src/lib/collections.ts — the frontend file is the\n` +
        `source of truth (see its header comment), so add them there too:\n` +
        extra.map(([k, v]) => `  - ${k} -> '${v}'`).join('\n'),
    )
  }
  return `${beCollections.size} mirrored`
})

check('shared COLLECTIONS keys resolve to the same value in both packages', () => {
  const conflicts = []
  for (const [key, value] of beCollections) {
    const feValue = feCollections.get(key)
    if (feValue && feValue !== value) conflicts.push(`  - ${key}: frontend '${feValue}' vs backend '${value}'`)
  }
  if (conflicts.length) fail(`same key, different collection:\n${conflicts.join('\n')}`)
})

// --- 2. Permissions -------------------------------------------------------

heading('2. Permissions — parity across the two hand-mirrored copies')

const fePermSrc = read('src/constants/permissions.ts')
const permModules = parseKeyLiteralMap(constBody(fePermSrc, 'PERMISSION_MODULES'))
const permActions = parseKeyLiteralMap(constBody(fePermSrc, 'ACTIONS'))

/** Resolves `KEY: permission(PERMISSION_MODULES.X, ACTIONS.Y | 'literal')`. */
function parseFrontendPermissions(body) {
  const clean = stripComments(body)
  const out = new Map()
  const unresolved = []
  const re =
    /([A-Z][A-Z0-9_]*)\s*:\s*permission\(\s*PERMISSION_MODULES\.([A-Z0-9_]+)\s*,\s*(?:ACTIONS\.([A-Z0-9_]+)|'([^']*)')\s*\)/g
  let m
  while ((m = re.exec(clean))) {
    const moduleName = permModules.get(m[2])
    const action = m[3] ? permActions.get(m[3]) : m[4]
    if (!moduleName || action === undefined) {
      unresolved.push(m[1])
      continue
    }
    out.set(m[1], `${moduleName}.${action}`)
  }
  // Anything shaped `KEY:` the resolver did not understand.
  for (const m2 of clean.matchAll(/^\s*([A-Z][A-Z0-9_]*)\s*:/gm)) {
    if (!out.has(m2[1]) && !unresolved.includes(m2[1])) unresolved.push(m2[1])
  }
  return { permissions: out, unresolved }
}

const { permissions: fePermissions, unresolved: fePermUnresolved } = parseFrontendPermissions(
  constBody(fePermSrc, 'PERMISSIONS'),
)
const bePermissions = parseKeyLiteralMap(constBody(read('functions/src/lib/permissions.ts'), 'PERMISSIONS'))
const fePermValues = new Set(fePermissions.values())

check('every frontend PERMISSIONS entry resolved', () => {
  if (fePermissions.size < 80) fail(`resolved only ${fePermissions.size} entries — the resolver is stale`)
  if (fePermUnresolved.length) {
    fail(
      `the permission() resolver did not understand ${fePermUnresolved.length} entr(y|ies), so\n` +
        `they are silently excluded from every check below: ${fePermUnresolved.join(', ')}`,
    )
  }
  return `${fePermissions.size} strings`
})

check('backend PERMISSIONS is a subset of the frontend source of truth', () => {
  const orphans = [...bePermissions.entries()].filter(([, v]) => !fePermValues.has(v))
  if (orphans.length) {
    fail(
      `enforced by Cloud Functions but absent from src/constants/permissions.ts, so\n` +
        `PermissionGuard cannot reference them and Settings > Roles & Permissions\n` +
        `(which derives its module list from PERMISSIONS) will never show them:\n` +
        orphans.map(([k, v]) => `  - ${k} -> '${v}'`).join('\n'),
    )
  }
  return `${bePermissions.size} mirrored of ${fePermissions.size}`
})

check('shared PERMISSIONS keys resolve to the same string in both packages', () => {
  const conflicts = []
  for (const [key, value] of bePermissions) {
    const feValue = fePermissions.get(key)
    if (feValue && feValue !== value) conflicts.push(`  - ${key}: frontend '${feValue}' vs backend '${value}'`)
  }
  if (conflicts.length) fail(`same key, different permission string:\n${conflicts.join('\n')}`)
})

// --- 3. Role grants -------------------------------------------------------

heading('3. Role grants — every enforced permission reaches at least one role')

const orgBackendSrc = read('functions/src/lib/organization.ts')
const grantedStrings = new Set([
  ...quotedStrings(constBody(orgBackendSrc, 'BASE', '[', ']')),
  ...quotedStrings(constBody(orgBackendSrc, 'LEADER', '[', ']')),
  ...quotedStrings(constBody(orgBackendSrc, 'ROLE_PERMISSIONS')),
])

/**
 * Strings that deliberately reach no role. Each needs a reason, because the
 * whole point of this check is that "granted to nobody" is normally the bug —
 * it is the standing gotcha every module in CLAUDE.md has hit.
 */
const UNGRANTED_BY_DESIGN = new Map([
  ['payroll.manageParameters', 'Super Admin only; superAdmin bypasses requirePermission entirely (2026-08-15)'],
  ['positions.seed', 'Super Admin only — migrateEmployeePositions / seed callables'],
  ['appraisals.create', 'v1 legacy; kept defined so historical roles/{roleId} docs resolve (appraisal-v2 §10)'],
  ['appraisals.submit', 'v1 legacy; superseded by scorePrimary/scoreSecondary (appraisal-v2 §10)'],
  ['appraisals.manageTemplates', 'v1 legacy; superseded by appraisalTemplates.generate/approve'],
])

check('every backend-enforced permission is granted to some role', () => {
  if (grantedStrings.size < 50) fail(`ROLE_PERMISSIONS parsed only ${grantedStrings.size} strings — parser is stale`)
  const ungranted = [...bePermissions.entries()]
    .filter(([, v]) => !grantedStrings.has(v) && !UNGRANTED_BY_DESIGN.has(v))
    .map(([k, v]) => `  - ${k} -> '${v}'`)
  if (ungranted.length) {
    fail(
      `${ungranted.length} permission string(s) reach no role in ROLE_PERMISSIONS. Existing\n` +
        `roles/{roleId} documents will not have them either — this is the standing\n` +
        `gotcha every module has hit. Fix by adding the grant, then run:\n` +
        `  node functions/tools/sync-role-permissions.mjs --prefix <module>. --apply\n` +
        `Or add it to UNGRANTED_BY_DESIGN in this file with a reason.\n` +
        ungranted.join('\n'),
    )
  }
  return `${grantedStrings.size} granted, ${UNGRANTED_BY_DESIGN.size} ungranted by design`
})

check('UNGRANTED_BY_DESIGN has no stale entries', () => {
  const stale = [...UNGRANTED_BY_DESIGN.keys()].filter((p) => grantedStrings.has(p))
  if (stale.length) fail(`now granted to a role, so drop the exemption: ${stale.join(', ')}`)
})

check('every granted string is a real permission', () => {
  const unknown = [...grantedStrings].filter((s) => !fePermValues.has(s))
  if (unknown.length) {
    fail(
      `granted in ROLE_PERMISSIONS but defined nowhere — a typo here silently grants\n` +
        `nothing: ${unknown.join(', ')}`,
    )
  }
})

// --- 4. Indexes -----------------------------------------------------------

heading('4. Indexes — every equality+orderBy query has an entry (definition of done #6)')

const indexesByCollection = new Map()
for (const entry of INDEXES.indexes ?? []) {
  const fields = (entry.fields ?? []).map((f) => f.fieldPath)
  if (!indexesByCollection.has(entry.collectionGroup)) indexesByCollection.set(entry.collectionGroup, [])
  indexesByCollection.get(entry.collectionGroup).push(fields)
}

const EQUALITY_OPS = new Set(['==', 'array-contains', 'array-contains-any', 'in', 'not-in'])

/** Pull `where('f', '==', …)` / `orderBy('f', …)` out of one constraint region. */
function readConstraints(text) {
  const equality = new Set()
  const range = new Set()
  const order = []
  for (const m of text.matchAll(/where\(\s*'([^']+)'\s*,\s*'([^']+)'/g)) {
    if (EQUALITY_OPS.has(m[2])) equality.add(m[1])
    else range.add(m[1])
  }
  for (const m of text.matchAll(/orderBy\(\s*'([^']+)'/g)) order.push(m[1])
  return { equality, range, order }
}

/**
 * CLAUDE.md's rule: "an equality filter plus a range or orderBy on a different
 * field". Two orderBy fields need one too. Equality-only queries do not —
 * Firestore merges single-field indexes for those.
 */
function needsComposite({ equality, range, order }) {
  if (order.length > 1) return true
  const sortish = [...order, ...range]
  if (!sortish.length) return false
  if (equality.size && sortish.some((f) => !equality.has(f))) return true
  if (range.size && order.some((f) => !range.has(f))) return true
  return false
}

/**
 * Set containment, not full order/direction validation: the failure this
 * catches is "no index at all", which is the one that actually reaches
 * production. A wrong field ORDER within an existing index still surfaces at
 * runtime with a create-index URL — matching loosely keeps this check free of
 * false alarms that would train you to ignore it.
 */
function hasIndex(collection, { equality, range, order }) {
  const needed = new Set([...equality, ...range, ...order])
  return (indexesByCollection.get(collection) ?? []).some((fields) => {
    const present = new Set(fields)
    return [...needed].every((f) => present.has(f))
  })
}

const queryCallSites = []
const skippedSites = []

// Frontend: queryDocuments(COLLECTIONS.X, [ ...constraints ]) / subscribeToCollection(…)
for (const file of FRONTEND_FILES) {
  const src = read(file)
  for (const m of src.matchAll(/\b(queryDocuments|subscribeToCollection)\s*(?:<[^(]*?>)?\s*\(/g)) {
    const call = sliceDelimited(src, m.index + m[0].length - 1, '(', ')')
    if (!call) continue
    const line = src.slice(0, m.index).split('\n').length
    const collectionRef = /COLLECTIONS\.([A-Z_0-9]+)/.exec(call.body)
    if (!collectionRef) {
      if (/where\(|orderBy\(/.test(call.body)) {
        skippedSites.push(`${file}:${line} (collection is not a COLLECTIONS.* literal)`)
      }
      continue
    }
    const collection = feCollections.get(collectionRef[1])
    // Each [...] group is one query variant — a ternary yields two real queries.
    let cursor = 0
    let found = 0
    while (cursor < call.body.length) {
      const region = sliceDelimited(call.body, cursor, '[', ']')
      if (!region) break
      cursor = region.end + 1
      if (!/where\(|orderBy\(/.test(region.body)) continue
      found += 1
      queryCallSites.push({ file, line, collection, constraints: readConstraints(region.body) })
    }
    if (!found && /where\(|orderBy\(/.test(call.body)) {
      skippedSites.push(`${file}:${line} (constraints are not an array literal)`)
    }
  }
}

// Backend: db.collection(COLLECTIONS.X).where(…).orderBy(…)
for (const file of BACKEND_FILES) {
  const src = read(file)
  for (const m of src.matchAll(/\.orderBy\(/g)) {
    const before = src.slice(Math.max(0, m.index - 900), m.index)
    const refs = [...before.matchAll(/COLLECTIONS\.([A-Z_0-9]+)/g)]
    const line = src.slice(0, m.index).split('\n').length
    if (!refs.length) {
      skippedSites.push(`${file}:${line} (no COLLECTIONS.* reference in scope)`)
      continue
    }
    const collection = beCollections.get(refs[refs.length - 1][1])
    const chainStart = before.lastIndexOf('.collection(')
    const chain = (chainStart === -1 ? before : before.slice(chainStart)) + src.slice(m.index, m.index + 200)
    queryCallSites.push({ file, line, collection, constraints: readConstraints(chain) })
  }
}

check('query call sites were found and parsed', () => {
  if (queryCallSites.length < 30) fail(`only ${queryCallSites.length} call sites parsed — the scanner is stale`)
  return `${queryCallSites.length} parsed`
})

check('every composite-index-requiring query has an index entry', () => {
  const missing = []
  let requiring = 0
  for (const site of queryCallSites) {
    if (!site.collection || !needsComposite(site.constraints)) continue
    requiring += 1
    if (hasIndex(site.collection, site.constraints)) continue
    const { equality, range, order } = site.constraints
    const fields = [...equality, ...range, ...order].join(', ')
    missing.push(`  - ${site.file}:${site.line} — ${site.collection} (${fields})`)
  }
  if (missing.length) {
    fail(
      `Firestore rejects these at runtime, not build time. Add them to\n` +
        `firestore.indexes.json rather than clicking the console URL, or the index\n` +
        `will not exist in the next environment:\n` +
        [...new Set(missing)].join('\n'),
    )
  }
  return `${requiring} of ${queryCallSites.length} queries need one`
})

// Coverage is partial by construction — say so rather than implying a clean sweep.
if (skippedSites.length) {
  const unique = [...new Set(skippedSites)]
  note(`${unique.length} query site(s) not statically resolvable, so NOT checked:`)
  for (const site of unique.slice(0, 10)) note(`  ${site}`)
  if (unique.length > 10) note(`  …and ${unique.length - 10} more`)
}

// --- 5. Region ------------------------------------------------------------

heading('5. Region — a mismatch makes every callable fail with NOT_FOUND')

check('functions region matches on both sides', () => {
  const backend = /export const REGION = '([^']+)'/.exec(read('functions/src/lib/admin.ts'))
  if (!backend) fail('could not find REGION in functions/src/lib/admin.ts')
  const frontend = /getFunctions\(\s*firebaseApp\s*,\s*'([^']+)'\s*\)/.exec(read('src/services/firebase/functions.ts'))
  if (!frontend) fail('could not find the getFunctions region in src/services/firebase/functions.ts')
  if (backend[1] !== frontend[1]) {
    fail(`backend admin.ts is '${backend[1]}' but frontend functions.ts is '${frontend[1]}'`)
  }
  return backend[1]
})

// --- 6. Organization ------------------------------------------------------

heading('6. Organization — the third mirrored pair')

const orgFrontendSrc = read('src/constants/organization.ts')

function compareArrayMaps(name, feBody, beBody) {
  const fe = parseKeyArrayMap(feBody)
  const be = parseKeyArrayMap(beBody)
  if (!fe.size || !be.size) fail(`${name} parsed empty (${fe.size} frontend / ${be.size} backend)`)
  const diffs = []
  for (const [key, beValues] of be) {
    const feValues = fe.get(key)
    if (!feValues) {
      diffs.push(`  - ${key}: missing from the frontend copy entirely`)
      continue
    }
    const onlyBackend = beValues.filter((v) => !feValues.includes(v))
    const onlyFrontend = feValues.filter((v) => !beValues.includes(v))
    if (onlyBackend.length || onlyFrontend.length) {
      diffs.push(
        `  - ${key}: frontend-only [${onlyFrontend.join(', ') || '—'}] / backend-only [${onlyBackend.join(', ') || '—'}]`,
      )
    }
  }
  if (diffs.length) fail(`${name} differs between packages:\n${diffs.join('\n')}`)
  return `${be.size} keys`
}

check('OUTLET_DEPARTMENTS matches', () =>
  compareArrayMaps(
    'OUTLET_DEPARTMENTS',
    constBody(orgFrontendSrc, 'OUTLET_DEPARTMENTS'),
    constBody(orgBackendSrc, 'OUTLET_DEPARTMENTS'),
  ),
)

check('OUTLET_AREAS matches', () =>
  compareArrayMaps('OUTLET_AREAS', constBody(orgFrontendSrc, 'OUTLET_AREAS'), constBody(orgBackendSrc, 'OUTLET_AREAS')),
)

check('OUTLET_CODES matches', () => {
  const fe = parseKeyLiteralMap(constBody(orgFrontendSrc, 'OUTLET_CODES'))
  const be = parseKeyLiteralMap(constBody(orgBackendSrc, 'OUTLET_CODES'))
  if (!fe.size || !be.size) fail(`parsed empty (${fe.size} / ${be.size})`)
  const diffs = []
  for (const [key, value] of be) {
    if (!fe.has(key)) diffs.push(`  - ${key}: missing from the frontend copy`)
    else if (fe.get(key) !== value) diffs.push(`  - ${key}: frontend '${fe.get(key)}' vs backend '${value}'`)
  }
  if (diffs.length) fail(`OUTLET_CODES differs between packages:\n${diffs.join('\n')}`)
  return `${be.size} outlets`
})

check('outlet ids agree across OUTLETS / OUTLET_NAMES and every per-outlet map', () => {
  const feOutletIds = [...constBody(orgFrontendSrc, 'OUTLETS', '[', ']').matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1])
  const beOutletIds = [...parseKeyLiteralMap(constBody(orgBackendSrc, 'OUTLET_NAMES')).keys()]
  if (!feOutletIds.length || !beOutletIds.length) fail('parsed no outlet ids')
  const diffs = []
  const feSet = new Set(feOutletIds)
  for (const id of beOutletIds) {
    if (!feSet.has(id)) diffs.push(`  - '${id}' in backend OUTLET_NAMES but not frontend OUTLETS`)
  }
  for (const id of feOutletIds) {
    if (!beOutletIds.includes(id)) diffs.push(`  - '${id}' in frontend OUTLETS but not backend OUTLET_NAMES`)
  }
  for (const [mapName, literal] of [
    ['OUTLET_DEPARTMENTS', false],
    ['OUTLET_AREAS', false],
    ['OUTLET_CODES', true],
  ]) {
    const body = constBody(orgBackendSrc, mapName)
    const keys = [...(literal ? parseKeyLiteralMap(body) : parseKeyArrayMap(body)).keys()]
    for (const id of beOutletIds) if (!keys.includes(id)) diffs.push(`  - '${id}' missing from backend ${mapName}`)
  }
  if (diffs.length) fail(`outlet id sets disagree:\n${diffs.join('\n')}`)
  return `${beOutletIds.length} outlets`
})

check('every department offered by an outlet has a role list', () => {
  const outletDepartments = parseKeyArrayMap(constBody(orgBackendSrc, 'OUTLET_DEPARTMENTS'))
  const departmentRoles = parseKeyArrayMap(constBody(orgBackendSrc, 'DEPARTMENT_ROLES'))
  const orphans = []
  for (const [outlet, departments] of outletDepartments) {
    for (const department of departments) {
      if (!departmentRoles.has(department)) {
        orphans.push(`  - ${outlet} offers '${department}', which has no DEPARTMENT_ROLES entry`)
      }
    }
  }
  if (orphans.length) fail(`registerUser would reject every role for these:\n${orphans.join('\n')}`)
})

// ---------------------------------------------------------------------------

console.log(
  `\n${failures ? '✗' : '✓'} ${checksRun - failures}/${checksRun} checks passed` +
    (failures ? ` — ${failures} failing` : ''),
)
process.exit(failures ? 1 : 0)
