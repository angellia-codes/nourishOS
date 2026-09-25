import { callFunction } from '@/services/api/callFunction'

/**
 * New-Hire Welcome Portal — the authenticated half (welcome-portal.md §5.1).
 *
 * The portal app itself talks to its own unauthenticated callables from
 * `welcome/src/api.ts`; nothing in NourishOS calls those. What lives here is
 * what HR does from inside the app: send the link, resend it, revoke it, and
 * curate the four editable content sections.
 */

export interface WelcomeInviteResult {
  inviteId: string
  expiresAt: string
  /** False when Fonnte is unprovisioned or the send failed — HR needs to know. */
  delivered: boolean
}

export function issueWelcomeInvite(checklistId: string): Promise<WelcomeInviteResult> {
  return callFunction('issueWelcomeInvite', { checklistId })
}

export function reissueWelcomeInvite(checklistId: string): Promise<WelcomeInviteResult> {
  return callFunction('reissueWelcomeInvite', { checklistId })
}

export function revokeWelcomeInvite(checklistId: string): Promise<{ inviteId: string }> {
  return callFunction('revokeWelcomeInvite', { checklistId })
}

/** §7.4's HR-editable four. Must match WELCOME_SECTIONS in functions/src/hr/welcome/content.ts. */
export const WELCOME_SECTIONS = ['menu', 'orgChart', 'attendanceGuide', 'dosAndDonts'] as const
export type WelcomeSection = (typeof WELCOME_SECTIONS)[number]

export const WELCOME_SECTION_LABELS: Record<WelcomeSection, string> = {
  menu: 'Menu',
  orgChart: 'Organization Chart',
  attendanceGuide: 'Attendance Guide',
  dosAndDonts: "Do's & Don'ts",
}

export const WELCOME_SECTION_HINTS: Record<WelcomeSection, string> = {
  menu: 'Categories, items, prices and dietary tags. The tax and allergen notices are added automatically.',
  orgChart:
    'A public image URL. New hires have no NourishOS account, so a link into this app’s own storage will not load for them — host the chart somewhere publicly readable. They can pinch to zoom, so a wide chart is fine.',
  attendanceGuide: 'Working hours, how attendance is recorded, and the public-holiday calendar.',
  dosAndDonts: 'The short version of grooming, conduct and attendance — what to do, what not to.',
}

/** Every label the portal renders is an {id, en} pair (§7.4). */
export interface Bilingual {
  id: string
  en: string
}

export interface MenuItem {
  name: string
  price: string
  /** GF / V / VO / VG, free-form so a new tag needs no deploy. */
  tags: string
}

export interface MenuCategory {
  title: Bilingual
  items: MenuItem[]
}

export interface MenuContent {
  categories: MenuCategory[]
}

export interface OrgChartContent {
  /**
   * A public image URL, deliberately not a `files/{id}` id: a new hire has no
   * Firebase Auth session and `storage.rules` requires one, so anything inside
   * the app's own bucket renders as a broken image on the welcome portal.
   */
  imageUrl: string
  caption: Bilingual
}

export interface GuideBlock {
  heading: Bilingual
  body: Bilingual
}

export interface GuideContent {
  blocks: GuideBlock[]
}

export type WelcomeSectionContent = MenuContent | OrgChartContent | GuideContent

export function updateWelcomeContent(
  sectionId: WelcomeSection,
  content: WelcomeSectionContent,
): Promise<{ sectionId: string }> {
  return callFunction('updateWelcomeContent', { sectionId, content })
}

export function publishWelcomeContent(sectionId: WelcomeSection): Promise<{ sectionId: string; publishedAt: string }> {
  return callFunction('publishWelcomeContent', { sectionId })
}

/** An empty draft of the right shape, so the editor never starts from nothing. */
export function emptySection(section: WelcomeSection): WelcomeSectionContent {
  const blank: Bilingual = { id: '', en: '' }
  if (section === 'menu') return { categories: [{ title: { ...blank }, items: [{ name: '', price: '', tags: '' }] }] }
  if (section === 'orgChart') return { imageUrl: '', caption: { ...blank } }
  return { blocks: [{ heading: { ...blank }, body: { ...blank } }] }
}
