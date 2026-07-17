import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Textarea } from '@/components/ui'
import { useToast } from '@/hooks'
import { FINANCE_OUTLETS } from '@/features/finance/financeDemoData'
import { RETENTION_DAYS, type LostFoundCategory, type LostFoundValueTier } from './lostFoundDemoData'
import { LOST_FOUND_CATEGORY_LABELS, VALUE_TIER_LABELS } from './lostFoundFormat'

/**
 * Found Item form — lost-and-found-report.md §3 Sections A–B (Section C,
 * the claim, happens later from the log). Photo is mandatory (§10 AC-1);
 * retention is derived from category (§5). Mock only; submit shows a toast.
 */
export function LostFoundFormDemoPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<LostFoundCategory>('other')
  const [valueTier, setValueTier] = useState<LostFoundValueTier>('low')
  const [foundLocation, setFoundLocation] = useState('')
  const [foundAt, setFoundAt] = useState('2026-07-17')
  const [storageLocation, setStorageLocation] = useState('')
  const [outletId, setOutletId] = useState(FINANCE_OUTLETS[0].id)
  const [hasPhoto, setHasPhoto] = useState(false)

  const canSubmit =
    description.trim() !== '' && foundLocation.trim() !== '' && storageLocation.trim() !== '' && foundAt !== '' && hasPhoto

  function handleSubmit() {
    if (!canSubmit) return
    const visibilityNote =
      valueTier === 'low' ? '' : ' Outlet Manager + GM notified (medium/high value).'
    toast.success(`Item logged with a ${RETENTION_DAYS[category]}-day retention hold (demo).${visibilityNote} Nothing was written to a backend.`)
    navigate('/demo/operations/lost-found')
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. Submitting shows a toast and returns to the log; nothing is persisted.
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/demo/operations/lost-found')}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Log Found Item</h1>
            <p className="text-sm text-muted-foreground">
              Retention hold: {RETENTION_DAYS[category]} days for {LOST_FOUND_CATEGORY_LABELS[category].toLowerCase()}
            </p>
          </div>
        </div>

        {/* Section A — Item Details */}
        <Card>
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lfDescription">Item Description *</Label>
              <Textarea
                id="lfDescription"
                className="min-h-[80px]"
                placeholder="Color, brand, identifying marks…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lfCategory">Category *</Label>
                <Select id="lfCategory" value={category} onChange={(e) => setCategory(e.target.value as LostFoundCategory)}>
                  {Object.entries(LOST_FOUND_CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lfValueTier">Estimated Value Tier *</Label>
                <Select id="lfValueTier" value={valueTier} onChange={(e) => setValueTier(e.target.value as LostFoundValueTier)}>
                  {Object.entries(VALUE_TIER_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => setHasPhoto(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setHasPhoto(true)
              }}
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors duration-150 hover:border-primary/50"
            >
              <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                {hasPhoto ? (
                  'Photo attached (demo)'
                ) : (
                  <>
                    <span className="font-medium text-primary">Add item photo *</span> — mandatory before logging
                  </>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section B — Found Context */}
        <Card>
          <CardHeader>
            <CardTitle>Found Context</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lfLocation">Found Location *</Label>
              <Input
                id="lfLocation"
                placeholder='e.g. "Table 12", "Restroom"'
                value={foundLocation}
                onChange={(e) => setFoundLocation(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lfFoundAt">Date Found *</Label>
              <Input id="lfFoundAt" type="date" value={foundAt} onChange={(e) => setFoundAt(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lfStorage">Storage Location *</Label>
              <Input
                id="lfStorage"
                placeholder="Front desk drawer, manager's safe…"
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lfOutlet">Outlet</Label>
              <Select id="lfOutlet" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
                {FINANCE_OUTLETS.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/demo/operations/lost-found')}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
            Log Item
          </Button>
        </div>
      </div>
    </div>
  )
}
