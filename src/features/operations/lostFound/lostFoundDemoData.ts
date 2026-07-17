/** lost-and-found-report.md §4 — category. */
export type LostFoundCategory =
  | 'electronics'
  | 'wallet'
  | 'bag'
  | 'clothing'
  | 'jewelry'
  | 'documents'
  | 'keys'
  | 'eyewear'
  | 'other'

export type LostFoundValueTier = 'low' | 'medium' | 'high'

/** lost-and-found-report.md §4 — status. */
export type LostFoundStatus = 'logged' | 'claimPending' | 'returned' | 'unclaimed' | 'disposed' | 'donated'

/** lost-and-found-report.md §5 — suggested category hold periods (days), pending policy sign-off. */
export const RETENTION_DAYS: Record<LostFoundCategory, number> = {
  documents: 90,
  electronics: 60,
  jewelry: 60,
  wallet: 60,
  bag: 30,
  clothing: 30,
  eyewear: 30,
  keys: 30,
  other: 14,
}

export interface MockLostFoundItem {
  id: string
  itemNumber: string
  itemDescription: string
  category: LostFoundCategory
  valueTier: LostFoundValueTier
  foundLocation: string
  foundAt: string // ISO date
  foundByName: string
  storageLocation: string
  outletId: string
  status: LostFoundStatus
  retentionExpiresAt: string // ISO date
  claimantName?: string
  returnedAt?: string
  hasPhoto: boolean
}

export const MOCK_LOST_FOUND_ITEMS: MockLostFoundItem[] = [
  {
    id: 'lf-1',
    itemNumber: 'LF-2026-0018',
    itemDescription: 'iPhone 15, dark blue case with a surf-shop sticker',
    category: 'electronics',
    valueTier: 'high',
    foundLocation: 'Table 12',
    foundAt: '2026-07-15',
    foundByName: 'Ni Made Ayu Ratih',
    storageLocation: "Manager's safe",
    outletId: 'outlet-sanur',
    status: 'claimPending',
    retentionExpiresAt: '2026-09-13',
    claimantName: 'Walk-in guest (verifying)',
    hasPhoto: true,
  },
  {
    id: 'lf-2',
    itemNumber: 'LF-2026-0017',
    itemDescription: 'Brown leather wallet, no cash, two bank cards',
    category: 'wallet',
    valueTier: 'medium',
    foundLocation: 'Restroom',
    foundAt: '2026-07-14',
    foundByName: 'Gede Arya Wibawa',
    storageLocation: 'Front desk drawer',
    outletId: 'outlet-canggu',
    status: 'returned',
    retentionExpiresAt: '2026-09-12',
    claimantName: 'I Putu Eka Saputra',
    returnedAt: '2026-07-15',
    hasPhoto: true,
  },
  {
    id: 'lf-3',
    itemNumber: 'LF-2026-0015',
    itemDescription: 'Child’s denim jacket, size 6',
    category: 'clothing',
    valueTier: 'low',
    foundLocation: 'Garden seating area',
    foundAt: '2026-06-12',
    foundByName: 'Putu Indah Lestari',
    storageLocation: 'Lost & found shelf',
    outletId: 'outlet-ubud',
    status: 'unclaimed',
    retentionExpiresAt: '2026-07-12',
    hasPhoto: true,
  },
  {
    id: 'lf-4',
    itemNumber: 'LF-2026-0012',
    itemDescription: 'Prescription glasses, tortoiseshell frame',
    category: 'eyewear',
    valueTier: 'low',
    foundLocation: 'Bar counter',
    foundAt: '2026-05-28',
    foundByName: 'Kadek Bayu Santika',
    storageLocation: 'Front desk drawer',
    outletId: 'outlet-sanur',
    status: 'donated',
    retentionExpiresAt: '2026-06-27',
    hasPhoto: true,
  },
  {
    id: 'lf-5',
    itemNumber: 'LF-2026-0019',
    itemDescription: 'KTP + driving licence in a clear pouch',
    category: 'documents',
    valueTier: 'medium',
    foundLocation: 'Parking area',
    foundAt: '2026-07-16',
    foundByName: 'Komang Tri Wijaya',
    storageLocation: "Manager's safe",
    outletId: 'outlet-ubud',
    status: 'logged',
    retentionExpiresAt: '2026-10-14',
    hasPhoto: true,
  },
]
