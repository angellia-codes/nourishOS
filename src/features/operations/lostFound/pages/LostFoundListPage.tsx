import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge, Button, Card, CardContent, Input, Select, Spinner } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import * as lostFoundService from '../lostFoundService'
import { formatLostFoundDate, LOST_FOUND_CATEGORY_LABELS, LOST_FOUND_STATUS_LABELS, LOST_FOUND_STATUS_VARIANT, VALUE_TIER_LABELS, VALUE_TIER_VARIANT } from '../lostFoundFormat'
import type { LostFoundCategory, LostFoundItem } from '@/types'

/** lost-and-found-report.md §1/§6/§9. Search covers the "has anyone turned this in?" inquiry flow (§2 — no separate inquiry collection). */
export function LostFoundListPage() {
  const navigate = useNavigate()

  const [items, setItems] = useState<LostFoundItem[] | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | LostFoundCategory>('all')

  useEffect(() => {
    return lostFoundService.subscribeToLostFoundItems(setItems)
  }, [])

  if (items === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  const visible = items.filter((item) => {
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    const matchesSearch =
      search.trim() === '' ||
      `${item.itemDescription} ${item.foundLocation} ${item.itemNumber}`.toLowerCase().includes(search.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const today = new Date().toISOString().slice(0, 10)
  const nearingDisposalDate = new Date()
  nearingDisposalDate.setUTCDate(nearingDisposalDate.getUTCDate() + 7)
  const nearingDisposalIso = nearingDisposalDate.toISOString().slice(0, 10)
  const nearingDisposal = items.filter(
    (item) => (item.status === 'logged' || item.status === 'unclaimed') && item.retentionExpiresAt <= nearingDisposalIso,
  ).length

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Lost &amp; Found</h1>
          <p className="text-sm text-muted-foreground">{nearingDisposal} item(s) nearing or past retention</p>
        </div>
        <PermissionGuard permission={PERMISSIONS.LOST_FOUND_CREATE}>
          <Button type="button" onClick={() => navigate('/operations/lost-found/new')}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Log Found Item
          </Button>
        </PermissionGuard>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_220px]">
        <Input
          aria-label="Search items"
          placeholder="Search description, location, or item number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select aria-label="Filter by category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as 'all' | LostFoundCategory)}>
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
          description={
            items.length === 0
              ? 'Nothing has been logged yet.'
              : 'Nothing with that description has been turned in — log it if a guest reports it later.'
          }
        />
      ) : (
        visible.map((item) => (
          <Card
            key={item.id}
            className="cursor-pointer transition-colors duration-150 hover:border-primary/40"
            onClick={() => navigate(`/operations/lost-found/${item.id}`)}
          >
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
                {item.foundLocation} on {formatLostFoundDate(item.foundAt)}
              </p>
              <p className="text-xs text-muted-foreground">
                Stored: {item.storageLocation} · retention until {formatLostFoundDate(item.retentionExpiresAt)}
                {item.claimantName && ` · claimant: ${item.claimantName}`}
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
