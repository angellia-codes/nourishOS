const STORAGE_KEY = 'nourish.welcomeToken'
const DRAFT_KEY = 'nourish.welcomeDraft'
const OPENED_KEY = 'nourish.welcomeOpened'

/**
 * The welcome token is the hire's only credential (there is no login), so it
 * lives in localStorage for this browser and in the WhatsApp link for every
 * other device. A `?t=` in the URL always wins and is persisted, which is what
 * makes a re-sent link replace an expired one without the hire doing anything.
 */
export function readToken(): string | null {
  const fromUrl = new URLSearchParams(window.location.search).get('t')
  if (fromUrl) {
    safeSet(STORAGE_KEY, fromUrl)
    return fromUrl
  }
  return safeGet(STORAGE_KEY)
}

/**
 * §11 — "Drafts cached locally". The server copy is authoritative; this is
 * what keeps a half-typed step through a refresh on a flaky connection, before
 * the autosave has landed.
 */
export function readCachedDraft(): Record<string, unknown> {
  const raw = safeGet(DRAFT_KEY)
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export function cacheDraft(draft: Record<string, unknown>): void {
  try {
    safeSet(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // Quota, private mode, a blocked origin — the server copy still has it.
  }
}

export function clearCachedDraft(): void {
  safeRemove(DRAFT_KEY)
}

/**
 * §7.2, and the spec's own open assumption: the envelope ceremony plays once,
 * on the first arrival after submit. Checking your status on day nine should
 * not mean tapping an envelope again.
 */
export function hasOpenedEnvelope(): boolean {
  return safeGet(OPENED_KEY) === '1'
}

export function markEnvelopeOpened(): void {
  safeSet(OPENED_KEY, '1')
}

// localStorage throws outright in some private-browsing modes rather than
// returning null, so every access is guarded — an unavailable store degrades
// to "nothing cached", never to a blank screen.
function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
