// Pins the pure logic added by the 2026-08-18 HR_OPERATIONS.md gap pass:
// the Fonnte adapter's retry/response handling, the project milestone parser,
// and the flash-report formatter.
//
//   npm --prefix functions run build
//   npm test
//
// No emulator needed. `fetch` is stubbed, so nothing leaves the machine.
//
// SLOW ON PURPOSE: two of the Fonnte tests sleep through real 5s backoffs,
// because the retry policy (HR_OPERATIONS.md §13.1) is the thing under test.
// This file takes ~15s and is the reason `npm test` is not instant. It is not
// hung.
import { describe, test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

process.env.FONNTE_TOKEN = 'test-token'
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT ?? 'demo-nourishos'

const { sendWhatsApp } = require('../lib/shared/notifications/whatsapp.js')
const { parseMilestones } = require('../lib/operations/projects/helpers.js')
const { formatFlashReport } = require('../lib/reports/flashReport.js')

const realFetch = globalThis.fetch

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

describe('sendWhatsApp (Fonnte adapter, §13.1)', () => {
  afterEach(() => {
    globalThis.fetch = realFetch
  })

  test('a successful send returns the provider message id', async () => {
    const calls = stubFetch([{ ok: true, body: { status: true, id: 'msg-1' } }])
    const result = await sendWhatsApp('628123456789', 'hello')

    assert.equal(result.status, 'sent')
    assert.equal(result.messageId, 'msg-1')
    assert.equal(result.attempts, 1)
    assert.equal(calls.length, 1, 'a success must not retry')
    // §13.1 deviation: the live API takes the bare token, not "Bearer <token>".
    assert.equal(calls[0].init.headers.Authorization, 'test-token')
  })

  test('an array id (Fonnte returns one per target) takes the first entry', async () => {
    stubFetch([{ ok: true, body: { status: true, id: ['msg-a', 'msg-b'] } }])
    const result = await sendWhatsApp('628123456789', 'hello')
    assert.equal(result.messageId, 'msg-a')
  })

  test('HTTP 200 with status:false is a failure, not a success', async () => {
    // Fonnte reports a disconnected device in the body, not the status line —
    // trusting response.ok alone would silently drop every message.
    stubFetch([{ ok: true, status: 200, body: { status: false, reason: 'Device disconnected' } }])
    const result = await sendWhatsApp('628123456789', 'hello')
    assert.equal(result.status, 'failed')
    assert.equal(result.error, 'Device disconnected')
    assert.equal(result.attempts, 3)
  })

  test('a transient failure retries and then succeeds', async () => {
    const calls = stubFetch([
      { ok: false, status: 500, body: {} },
      { ok: true, body: { status: true, id: 'msg-2' } },
    ])
    const result = await sendWhatsApp('628123456789', 'hello')
    assert.equal(result.status, 'sent')
    assert.equal(result.attempts, 2)
    assert.equal(calls.length, 2)
  })

  test('no target is skipped without calling the API', async () => {
    const calls = stubFetch([{ ok: true, body: { status: true } }])
    const result = await sendWhatsApp('', 'hello')
    assert.equal(result.status, 'skipped')
    assert.equal(calls.length, 0)
  })
})

describe('parseMilestones', () => {
  test('milestones parse into the stored shape', () => {
    const parsed = parseMilestones([{ title: ' Kickoff ', dueDate: '2026-09-01', completed: true }])
    assert.deepEqual(parsed, [{ title: 'Kickoff', dueDate: '2026-09-01', completed: true }])
  })

  test('a missing milestone list is empty, not an error', () => {
    assert.deepEqual(parseMilestones(undefined), [])
    assert.deepEqual(parseMilestones(null), [])
  })

  test('a malformed milestone date is rejected', () => {
    assert.throws(() => parseMilestones([{ title: 'Kickoff', dueDate: '01/09/2026' }]), /YYYY-MM-DD/)
  })

  test('an untitled milestone is rejected', () => {
    assert.throws(() => parseMilestones([{ title: '   ', dueDate: '2026-09-01' }]), /required/)
  })

  test('more than 25 milestones is rejected', () => {
    const many = Array.from({ length: 26 }, (_, i) => ({ title: `M${i}`, dueDate: '2026-09-01' }))
    assert.throws(() => parseMilestones(many), /at most 25/)
  })
})

describe('formatFlashReport', () => {
  test('renders every figure it was given', () => {
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
})
