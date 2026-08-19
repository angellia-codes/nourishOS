// Pins the pure logic added by the 2026-08-18 HR_OPERATIONS.md gap pass:
// the Fonnte adapter's retry/response handling, the project milestone parser,
// and the flash-report formatter.
//
//   npm --prefix functions run build
//   node functions/test/gap-pass.mjs
//
// No emulator needed. `fetch` is stubbed, so nothing leaves the machine — one
// case does sleep through a single 5s backoff, which is the retry policy
// itself (HR_OPERATIONS.md §13.1) rather than an accident.
import { createRequire } from 'module'
import assert from 'assert'

const require = createRequire(import.meta.url)

process.env.FONNTE_TOKEN = 'test-token'
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT ?? 'demo-nourishos'

const { sendWhatsApp } = require('../lib/shared/notifications/whatsapp.js')
const { parseMilestones } = require('../lib/operations/projects/helpers.js')
const { formatFlashReport } = require('../lib/reports/flashReport.js')

let failures = 0
const realFetch = globalThis.fetch

async function check(label, fn) {
  try {
    await fn()
    console.log(`✓ ${label}`)
  } catch (error) {
    failures += 1
    console.error(`✗ ${label} — ${error.message}`)
  }
}

/** Queues one canned response per attempt, and records what was sent. */
function stubFetch(responses) {
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    const next = responses[Math.min(calls.length - 1, responses.length - 1)]
    return {
      ok: next.ok,
      status: next.status ?? (next.ok ? 200 : 400),
      json: async () => next.body,
    }
  }
  return calls
}

await check('a successful send returns the provider message id', async () => {
  const calls = stubFetch([{ ok: true, body: { status: true, id: 'msg-1' } }])
  const result = await sendWhatsApp('628123456789', 'hello')

  assert.strictEqual(result.status, 'sent')
  assert.strictEqual(result.messageId, 'msg-1')
  assert.strictEqual(result.attempts, 1)
  assert.strictEqual(calls.length, 1, 'a success must not retry')
  // §13.1 deviation: the live API takes the bare token, not "Bearer <token>".
  assert.strictEqual(calls[0].init.headers.Authorization, 'test-token')
})

await check('an array id (Fonnte returns one per target) takes the first entry', async () => {
  stubFetch([{ ok: true, body: { status: true, id: ['msg-a', 'msg-b'] } }])
  const result = await sendWhatsApp('628123456789', 'hello')
  assert.strictEqual(result.messageId, 'msg-a')
})

await check('HTTP 200 with status:false is a failure, not a success', async () => {
  // Fonnte reports a disconnected device in the body, not the status line —
  // trusting response.ok alone would silently drop every message.
  stubFetch([{ ok: true, status: 200, body: { status: false, reason: 'Device disconnected' } }])
  const result = await sendWhatsApp('628123456789', 'hello')
  assert.strictEqual(result.status, 'failed')
  assert.strictEqual(result.error, 'Device disconnected')
  assert.strictEqual(result.attempts, 3)
})

await check('a transient failure retries and then succeeds', async () => {
  const calls = stubFetch([
    { ok: false, status: 500, body: {} },
    { ok: true, body: { status: true, id: 'msg-2' } },
  ])
  const result = await sendWhatsApp('628123456789', 'hello')
  assert.strictEqual(result.status, 'sent')
  assert.strictEqual(result.attempts, 2)
  assert.strictEqual(calls.length, 2)
})

await check('no target is skipped without calling the API', async () => {
  const calls = stubFetch([{ ok: true, body: { status: true } }])
  const result = await sendWhatsApp('', 'hello')
  assert.strictEqual(result.status, 'skipped')
  assert.strictEqual(calls.length, 0)
})

globalThis.fetch = realFetch

await check('milestones parse into the stored shape', () => {
  const parsed = parseMilestones([{ title: ' Kickoff ', dueDate: '2026-09-01', completed: true }])
  assert.deepStrictEqual(parsed, [{ title: 'Kickoff', dueDate: '2026-09-01', completed: true }])
})

await check('a missing milestone list is empty, not an error', () => {
  assert.deepStrictEqual(parseMilestones(undefined), [])
  assert.deepStrictEqual(parseMilestones(null), [])
})

await check('a malformed milestone date is rejected', () => {
  assert.throws(() => parseMilestones([{ title: 'Kickoff', dueDate: '01/09/2026' }]), /YYYY-MM-DD/)
})

await check('an untitled milestone is rejected', () => {
  assert.throws(() => parseMilestones([{ title: '   ', dueDate: '2026-09-01' }]), /required/)
})

await check('more than 25 milestones is rejected', () => {
  const many = Array.from({ length: 26 }, (_, i) => ({ title: `M${i}`, dueDate: '2026-09-01' }))
  assert.throws(() => parseMilestones(many), /at most 25/)
})

await check('the flash report renders every figure it was given', () => {
  const message = formatFlashReport({
    generatedFor: '2026-08-17',
    activeHeadcount: 179,
    newHiresLast7Days: 3,
    openRequisitions: 4,
    activeProjects: 2,
    escalatedTaskCount: 1,
    openIssueCount: 9,
    contractsDueIn30Days: 5,
    probationsDueIn30Days: 6,
    departmentsReportedToday: 7,
    departmentsExpected: 8,
  })
  for (const expected of ['2026-08-17', '179', '3', '4', '2', '1', '9', '5', '6', '7/8']) {
    assert.ok(message.includes(expected), `missing "${expected}" in:\n${message}`)
  }
})

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
