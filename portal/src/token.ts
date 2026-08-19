const STORAGE_KEY = 'nourish.applicationToken'

/**
 * The application token is the candidate's only credential (there is no login),
 * so it lives in localStorage for this browser and in the WhatsApp link for
 * every other device. A `?t=` in the URL always wins and is persisted.
 */
export function readToken(): string | null {
  const fromUrl = new URLSearchParams(window.location.search).get('t')
  if (fromUrl) {
    localStorage.setItem(STORAGE_KEY, fromUrl)
    return fromUrl
  }
  return localStorage.getItem(STORAGE_KEY)
}

export function storeToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY)
}
