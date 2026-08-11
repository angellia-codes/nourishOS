/**
 * Google Sign-In via Google Identity Services' OAuth2 token client — loaded
 * directly (no Firebase Auth SDK). Replaces firebase/auth's signInWithPopup.
 * AUTHENTICATION.md §3 still applies: Google is the only supported provider.
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; error?: string }) => void
          }): { requestAccessToken: () => void }
        }
      }
    }
  }
}

let scriptLoadPromise: Promise<void> | null = null

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (scriptLoadPromise) return scriptLoadPromise

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services.'))
    document.head.appendChild(script)
  })
  return scriptLoadPromise
}

function getClientId(): string {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!id) throw new Error('Missing VITE_GOOGLE_CLIENT_ID — see .env.example.')
  return id
}

/** Opens the Google account picker popup, resolves with an OAuth access token. */
export async function requestGoogleAccessToken(): Promise<string> {
  await loadGisScript()

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: getClientId(),
      scope: 'openid email profile',
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error || 'Google sign-in failed.'))
          return
        }
        resolve(response.access_token)
      },
    })
    client.requestAccessToken()
  })
}
