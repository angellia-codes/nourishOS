/**
 * Transport for the Apps Script backend (replaces httpsCallable + the
 * Firestore SDK — see apps-script/src/Api.js for the server side of this
 * contract). One POST per action; the envelope shape is hand-mirrored from
 * apps-script/src/Errors.js since Apps Script Web Apps can't set HTTP status
 * codes (ContentService always answers 200), so success/failure is signalled
 * in the body instead.
 */

const SESSION_TOKEN_KEY = 'nourishos.sessionToken'

export function getSessionToken(): string | null {
  return localStorage.getItem(SESSION_TOKEN_KEY)
}

export function setSessionToken(token: string): void {
  localStorage.setItem(SESSION_TOKEN_KEY, token)
}

export function clearSessionToken(): void {
  localStorage.removeItem(SESSION_TOKEN_KEY)
}

interface SuccessEnvelope<T> {
  success: true
  message: string
  data: T
}

interface ErrorEnvelope {
  success: false
  code: string
  message: string
  details?: unknown
}

export class AppsScriptError extends Error {
  readonly code: string
  readonly details?: unknown

  constructor(code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'AppsScriptError'
    this.code = code
    this.details = details
  }
}

function getWebAppUrl(): string {
  const url = import.meta.env.VITE_APPS_SCRIPT_URL
  if (!url) {
    throw new Error(
      'Missing VITE_APPS_SCRIPT_URL. Deploy apps-script/ as a Web App and copy its /exec URL into .env.local.',
    )
  }
  return url
}

/** Calls one Apps Script action. Throws AppsScriptError on any failure — callers never see the raw envelope. */
export async function callAction<TResponse = void, TPayload = Record<string, unknown>>(
  action: string,
  payload?: TPayload,
): Promise<TResponse> {
  const response = await fetch(getWebAppUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action,
      payload: payload ?? {},
      sessionToken: getSessionToken(),
    }),
  })

  let envelope: SuccessEnvelope<TResponse> | ErrorEnvelope
  try {
    envelope = (await response.json()) as SuccessEnvelope<TResponse> | ErrorEnvelope
  } catch {
    // Apps Script occasionally serves an HTML error page instead of the JSON
    // envelope (cold start, execution quota) — surface a clean retryable
    // error instead of leaking the raw JSON.parse SyntaxError to the UI.
    throw new AppsScriptError('unavailable', 'Server did not respond. Please try again.')
  }
  if (!envelope.success) {
    throw new AppsScriptError(envelope.code, envelope.message, envelope.details)
  }
  return envelope.data
}
