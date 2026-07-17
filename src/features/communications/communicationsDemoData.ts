/** communications.md §5 "Categories". */
export type AnnouncementCategory = 'operations' | 'hr' | 'finance' | 'training' | 'maintenance' | 'events' | 'emergency' | 'general'

/** communications.md §5 "Workflow". */
export type AnnouncementStatus = 'draft' | 'review' | 'published' | 'archived'

/** communications.md §5 "Audience". */
export type AnnouncementAudience = 'company_wide' | 'headquarters' | 'selected_outlets' | 'departments'

export interface MockAnnouncement {
  id: string
  title: string
  body: string
  category: AnnouncementCategory
  audience: AnnouncementAudience
  status: AnnouncementStatus
  pinned: boolean
  authorName: string
  publishedAt?: string
  createdAt: string
}

export const MOCK_ANNOUNCEMENTS: MockAnnouncement[] = [
  {
    id: 'ann-1',
    title: 'Food Safety Alert — Batch Recall on Imported Prawns',
    body: 'Supplier has issued a recall on frozen prawn batch #FP-2207. Kitchen leads must pull affected stock immediately and log disposal via Inventory > Waste.',
    category: 'emergency',
    audience: 'company_wide',
    status: 'published',
    pinned: true,
    authorName: 'Made Dwi Cahyadi',
    publishedAt: '2026-07-17',
    createdAt: '2026-07-17',
  },
  {
    id: 'ann-2',
    title: 'Q3 Training Schedule Released',
    body: 'The Q3 training calendar covering food safety refreshers, POS updates, and leadership workshops is now available in Documents > Training Materials.',
    category: 'training',
    audience: 'company_wide',
    status: 'published',
    pinned: false,
    authorName: 'Sri Wahyuni',
    publishedAt: '2026-07-14',
    createdAt: '2026-07-13',
  },
  {
    id: 'ann-3',
    title: 'Sanur Outlet — Scheduled Generator Maintenance',
    body: 'Backup generator maintenance at Sanur outlet on Sunday 08:00-10:00. Expect brief power fluctuations during switch-over testing.',
    category: 'maintenance',
    audience: 'selected_outlets',
    status: 'published',
    pinned: false,
    authorName: 'Kadek Bayu Santika',
    publishedAt: '2026-07-12',
    createdAt: '2026-07-11',
  },
  {
    id: 'ann-4',
    title: 'Updated Expense Approval Thresholds',
    body: 'Finance approval thresholds have been revised for Q3 — draft pending Director sign-off before publishing.',
    category: 'finance',
    audience: 'headquarters',
    status: 'review',
    pinned: false,
    authorName: 'Kadek Bayu Santika',
    createdAt: '2026-07-16',
  },
]

export const ANNOUNCEMENT_CATEGORY_OPTIONS: AnnouncementCategory[] = [
  'operations',
  'hr',
  'finance',
  'training',
  'maintenance',
  'events',
  'emergency',
  'general',
]

export const ANNOUNCEMENT_AUDIENCE_OPTIONS: AnnouncementAudience[] = ['company_wide', 'headquarters', 'selected_outlets', 'departments']
