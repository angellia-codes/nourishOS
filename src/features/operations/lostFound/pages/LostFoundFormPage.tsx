import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { useToast } from '@/hooks'
import { fileService } from '@/services/shared'
import * as lostFoundService from '../lostFoundService'
import { RETENTION_DAYS } from '../lostFoundDemoData'
import { LOST_FOUND_CATEGORY_LABELS, VALUE_TIER_LABELS } from '../lostFoundFormat'
import type { LostFoundCategory, LostFoundValueTier } from '@/types'

const TODAY = new Date().toISOString().slice(0, 10)

/** Found Item form — lost-and-found-report.md §3 Sections A–B (claim happens later from the log). */
export function LostFoundFormPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<LostFoundCategory>('other')
  const [valueTier, setValueTier] = useState<LostFoundValueTier>('low')
  const [foundLocation, setFoundLocation] = useState('')
  const [foundAt, setFoundAt] = useState(TODAY)
  const [storageLocation, setStorageLocation] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canSubmit =
    description.trim() !== '' && foundLocation.trim() !== '' && storageLocation.trim() !== '' && foundAt !== '' && photo !== null

  async function handleSubmit() {
    if (!canSubmit || !photo) return
    setSubmitting(true)
    try {
      const { itemId, itemNumber } = await lostFoundService.createLostFoundItem({
        itemDescription: description,
        category,
        valueTier,
        foundLocation,
        foundAt,
        storageLocation,
      })

      // Create-then-attach — same order as Security Patrol's photo upload
      // (the item needs a server-generated ID before files can reference it).
      await fileService.uploadFile({ file: photo, module: 'operations', resourceType: 'lostFoundItem', resourceId: itemId })

      toast.success(`${itemNumber} logged with a ${RETENTION_DAYS[category]}-day retention hold.`)
      navigate('/operations/lost-found')
    } catch {
      toast.error('Failed to log item. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Log Found Item</h1>
        <p className="text-sm text-muted-foreground">
          Retention hold: {RETENTION_DAYS[category]} days for {LOST_FOUND_CATEGORY_LABELS[category].toLowerCase()}
        </p>
      </div>

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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lfPhoto">Item Photo *</Label>
            <label
              htmlFor="lfPhoto"
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors duration-150 hover:border-primary/50"
            >
              <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                {photo ? `${photo.name} selected` : (
                  <>
                    <span className="font-medium text-primary">Add item photo *</span> — mandatory before logging
                  </>
                )}
              </p>
              <input
                id="lfPhoto"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </CardContent>
      </Card>

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
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="lfStorage">Storage Location *</Label>
            <Input
              id="lfStorage"
              placeholder="Front desk drawer, manager's safe…"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => navigate('/operations/lost-found')} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" disabled={!canSubmit || submitting} onClick={handleSubmit}>
          {submitting ? <Spinner className="h-4 w-4" /> : 'Log Item'}
        </Button>
      </div>
    </div>
  )
}
