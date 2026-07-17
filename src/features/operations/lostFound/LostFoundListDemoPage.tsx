import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Plus } from 'lucide-react'
import { Badge, Button, Card, CardContent, Input, Select } from '@/components/ui'
import { EmptyState } from '@/components/shared/EmptyState'
import { useToast } from '@/hooks'
import { MOCK_LOST_FOUND_ITEMS, type LostFoundCategory, type LostFoundStatus, type MockLostFoundItem } from './lostFoundDemoData'
import {
  LOST_FOUND_CATEGORY_LABELS,
  LOST_FOUND_STATUS_LABELS,
  LOST_FOUND_STATUS_VARIANT,
  VALUE_TIER_LABELS,
  VALUE_TIER_VARIANT,
  formatLostFoundDate,
} from './lostFoundFormat'

const TODAY = '2026-07-17' // demo "today" — keeps retention badges stable

/**
 * Lost & Found log — lost-and-found-report.md §1/§6/§9. Search covers the
 * "has anyone turned this in?" inquiry flow (§2 — no separate inquiry
 * collection). Mock data; the claim button only updates local state.
 */
export function LostFoundListDemoPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [items, setItems] = useState<MockLostFoundItem[]>(MOCK_LOST_FOUND_ITEMS)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | LostFoundCategory>('all')

  const visible = items.filter((item) => {
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    const matchesSearch =
      search.trim() === '' ||
      `${item.itemDescription} ${item.foundLocation} ${item.itemNumber}`.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const nearingDisposal = items.filter(
    (item) => (item.status === 'logged' || item.status === 'unclaimed') && item.retentionExpiresAt <= '2026-07-24',
  ).length

  function handleReturn(id: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'returned' as LostFoundStatus, claimantName: 'Claimant (demo)', returnedAt: TODAY } : item,
      ),
    )
    toast.success('Item marked returned after ID verification (demo) — nothing was written to a backend.')
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-3xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls.
      </div>

      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Lost &amp; Found</h1>
            <p className="text-sm text-muted-foreground">{nearingDisposal} item(s) nearing or past retention</p>
          </div>
          <Button type="button" onClick={() => navigate('/demo/operations/lost-found/new')}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Log Found Item
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_220px]">
          <Input
            aria-label="Search items"
            placeholder="Search description, location, or item number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'all' | LostFoundCategory)}
          >
            <option value="all">All categories</option>
            {Object.entries(LOST_FOUND_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            title="No items match"
            description="Nothing with that description has been turned in — log it if a guest reports it later."
          />
        ) : (
          visible.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-foreground">{item.itemDescription}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={VALUE_TIER_VARIANT[item.valueTier]}>{VALUE_TIER_LABELS[item.valueTier]}</Badge>
                    <Badge variant={LOST_FOUND_STATUS_VARIANT[item.status]}>{LOST_FOUND_STATUS_LABELS[item.status]}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{item.itemNumber}</span> · {LOST_FOUND_CATEGORY_LABELS[item.category]} · found at{' '}
                  {item.foundLocation} on {formatLostFoundDate(item.foundAt)} by {item.foundByName}
                </p>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  {item.hasPhoto && <Camera className="h-3.5 w-3.5" aria-hidden="true" />}
                  Stored: {item.storageLocation} · retention until {formatLostFoundDate(item.retentionExpiresAt)}
                  {item.claimantName && ` · claimant: ${item.claimantName}`}
                  {item.returnedAt && ` · returned ${formatLostFoundDate(item.returnedAt)}`}
                </p>
                {(item.status === 'logged' || item.status === 'claimPending') && (
                  <div>
                    <Button type="button" variant="secondary" size="sm" onClick={() => handleReturn(item.id)}>
                      Record Claim &amp; Return
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
