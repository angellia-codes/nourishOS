import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Input, Label, Select, Spinner } from '@/components/ui'
import { useToast } from '@/hooks'
import * as inventoryService from '../inventoryService'
import { INVENTORY_CATEGORY_LABELS } from '../inventoryFormat'
import type { InventoryCategory } from '@/types'

const CATEGORIES = Object.keys(INVENTORY_CATEGORY_LABELS) as InventoryCategory[]

/**
 * Create and edit. category and hasSizes are immutable after creation —
 * changing either would orphan hrStockLevels docs keyed by the old size set —
 * so both are disabled (not hidden) on edit, with a note why.
 */
export function InventoryItemFormPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { itemId } = useParams<{ itemId: string }>()
  const isEdit = Boolean(itemId)

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<InventoryCategory>('uniform')
  const [unitCost, setUnitCost] = useState('')
  const [hasSizes, setHasSizes] = useState(false)
  const [sizes, setSizes] = useState<string[]>([''])

  useEffect(() => {
    if (!itemId) return
    let cancelled = false

    void inventoryService
      .getInventoryItem(itemId)
      .then((row) => {
        if (cancelled) return
        if (!row) {
          toast.error('That item no longer exists.')
          navigate('/hr/inventory')
          return
        }
        setName(row.name)
        setCategory(row.category)
        setUnitCost(String(row.unitCost))
        setHasSizes(row.hasSizes)
        setSizes(row.sizes.length > 0 ? row.sizes : [''])
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load that item.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [itemId, navigate, toast])

  const parsedSizes = sizes.map((s) => s.trim()).filter(Boolean)
  const parsedUnitCost = Number(unitCost)
  const canSubmit =
    name.trim() !== '' &&
    Number.isFinite(parsedUnitCost) &&
    parsedUnitCost >= 0 &&
    (!hasSizes || parsedSizes.length > 0) &&
    !submitting

  function updateSize(index: number, value: string) {
    setSizes((current) => current.map((s, i) => (i === index ? value : s)))
  }

  async function handleSave() {
    setSubmitting(true)
    try {
      if (itemId) {
        await inventoryService.updateInventoryItem({
          itemId,
          name: name.trim(),
          unitCost: parsedUnitCost,
          ...(hasSizes ? { sizes: parsedSizes } : {}),
        })
        toast.success('Item updated.')
        navigate(`/hr/inventory/${itemId}`)
        return
      }

      const { itemId: newId } = await inventoryService.createInventoryItem({
        name: name.trim(),
        category,
        unitCost: parsedUnitCost,
        hasSizes,
        sizes: hasSizes ? parsedSizes : undefined,
      })
      toast.success('Item created.')
      navigate(`/hr/inventory/${newId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save that item.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">{isEdit ? 'Edit Item' : 'New Item'}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Item details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Category</Label>
              <Select
                id="category"
                value={category}
                disabled={isEdit}
                onChange={(e) => setCategory(e.target.value as InventoryCategory)}
              >
                {CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {INVENTORY_CATEGORY_LABELS[value]}
                  </option>
                ))}
              </Select>
              {isEdit && <p className="text-xs text-muted-foreground">Category can't change after creation.</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unitCost">Unit cost (IDR)</Label>
              <Input
                id="unitCost"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={hasSizes} disabled={isEdit} onChange={(e) => setHasSizes(e.target.checked)} />
            Tracks stock by size
          </label>
          {isEdit && <p className="-mt-2 text-xs text-muted-foreground">Whether this item tracks sizes can't change after creation.</p>}

          {hasSizes && (
            <div className="flex flex-col gap-2">
              <Label>Sizes</Label>
              {sizes.map((size, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={size}
                    maxLength={20}
                    placeholder="e.g. M"
                    onChange={(e) => updateSize(index, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove size ${index + 1}`}
                    disabled={sizes.length === 1}
                    onClick={() => setSizes((current) => current.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                className="self-start"
                onClick={() => setSizes((current) => [...current, ''])}
              >
                <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                Add size
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={() => void handleSave()} disabled={!canSubmit}>
          {isEdit ? 'Save changes' : 'Create item'}
        </Button>
      </div>
    </div>
  )
}
