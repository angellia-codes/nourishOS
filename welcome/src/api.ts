import { callFunction } from './firebase'

/** Every callable in functions/src/hr/welcome/portal/ — the app's whole surface. */

export interface WelcomeSession {
  outletId: string | null
  outletLabel: string | null
  /** Blank until the hire types it in step 1 — HR never sets it. */
  fullName: string
  onboardingStatus: 'invited' | 'submitted' | 'pendingVerification' | 'verified'
  /** Set only when HR sent the submission back for a correction (§3.4). */
  rejectionReason: string | null
  submitted: boolean
  expiresAt: string
  draft: Record<string, unknown>
}

export function getWelcomeSession(token: string): Promise<WelcomeSession> {
  return callFunction('getWelcomeSession', { token })
}

export function saveWelcomeDraft(token: string, values: Record<string, unknown>): Promise<{ saved: string[] }> {
  return callFunction('saveWelcomeDraft', { token, values })
}

export type UploadSlot = 'photo' | 'ktp' | 'kk' | 'supporting'

export function uploadWelcomeDocument(input: {
  token: string
  slot: UploadSlot
  fileName: string
  mimeType: string
  contentBase64: string
}): Promise<{ fileId: string; slot: UploadSlot; fileName: string }> {
  return callFunction('uploadWelcomeDocument', input)
}

export function submitWelcomeForm(
  token: string,
  values: Record<string, unknown>,
): Promise<{ employeeId: string; fullName: string }> {
  return callFunction('submitWelcomeForm', { token, values })
}

/** {id, en} pairs, as §7.4 specifies for every label the portal renders. */
export interface Bilingual {
  id: string
  en: string
}

export interface MenuContent {
  categories: { title: Bilingual; items: { name: string; price: string; tags: string }[] }[]
}

export interface OrgChartContent {
  /**
   * A public image URL, deliberately not a `files/{id}` id: a new hire has no
   * Firebase Auth session and `storage.rules` requires one, so an id pointing
   * into the app's own bucket would render as a broken image for exactly the
   * audience this section exists for.
   */
  imageUrl: string
  caption: Bilingual
}

export interface GuideContent {
  blocks: { heading: Bilingual; body: Bilingual }[]
}

export interface WelcomeContent {
  sections: {
    menu: MenuContent | null
    orgChart: OrgChartContent | null
    attendanceGuide: GuideContent | null
    dosAndDonts: GuideContent | null
  }
}

export function getWelcomeContent(token: string): Promise<WelcomeContent> {
  return callFunction('getWelcomeContent', { token })
}

/** Reads a File as bare base64 (no data: prefix) for uploadWelcomeDocument. */
export function toBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.readAsDataURL(file)
  })
}
