import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, CardContent, Checkbox, Spinner } from '@/components/ui'
import { useOutlet } from '@/hooks/useOutlet'
import { useToast } from '@/hooks/useToast'
import { getCurrentEdition, setBibleOutletMenu, subscribeToOutletMenu } from './bibleService'
import { BIBLE_OUTLETS } from './bibleBook'
import type { BibleEdition, BibleOutletMenu } from '@/types'

/**
 * Outlet ticks (nourish-bible.md §3, D11): an outlet manager chooses which
 * master-menu items their outlet sells. A normal Basalt screen, no approval —
 * the callable logs the change. Prices need approval and arrive in Phase 2.
 */
export function OutletMenuPage() {
  const navigate = useNavigate()
  const { outletId } = useOutlet()
  const toast = useToast()
  const outlet = outletId && (BIBLE_OUTLETS as readonly string[]).includes(outletId) ? outletId : null
  const [edition, setEdition] = useState<BibleEdition | null | undefined>(undefined)
  const [menu, setMenu] = useState<BibleOutletMenu | null | undefined>(undefined)
  const [sold, setSold] = useState<Set<string> | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCurrentEdition().then(setEdition, () => setEdition(null))
  }, [])
  useEffect(() => {
    if (!outlet) return
    return subscribeToOutletMenu(outlet, setMenu, () => setMenu(null))
  }, [outlet])
  // Seed the checkboxes once, from the saved ticks — later snapshots must not clobber edits in progress.
  useEffect(() => {
    if (sold === null && menu !== undefined) setSold(new Set(menu?.soldItemIds ?? []))
  }, [menu, sold])

  const groups = useMemo(() => {
    if (!edition) return []
    return edition.categories.map((c) => ({ category: c, items: edition.items.filter((i) => i.categoryId === c.id) }))
  }, [edition])

  if (!outlet) {
    return <p className="p-6 text-sm text-muted-foreground">Outlet ticks are set per restaurant outlet — Uluwatu, Ungasan or Berawa.</p>
  }
  if (edition === undefined || sold === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }
  if (edition === null) return <p className="p-6 text-sm text-muted-foreground">The menu has not been published yet.</p>

  const toggle = (id: string) =>
    setSold((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const save = async () => {
    setSaving(true)
    try {
      await setBibleOutletMenu(outlet, [...sold])
      toast.success('Outlet menu saved.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the outlet menu.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Outlet menu</h1>
          <p className="text-sm text-muted-foreground">
            Tick what {outlet.replace('nourish_', 'Nourish ').replace(/\b\w/g, (c) => c.toUpperCase())} sells. Staff see the change the next time they open the book.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/documents/bible')}>
            Back to the book
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : `Save (${sold.size} items)`}
          </Button>
        </div>
      </div>
      {groups.map(({ category, items }) => (
        <Card key={category.id}>
          <CardContent className="p-4">
            <h2 className="mb-2 font-medium text-foreground">{category.label}</h2>
            <ul className="flex flex-col">
              {items.map((item) => (
                <li key={item.id}>
                  <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm">
                    <Checkbox checked={sold.has(item.id)} onChange={() => toggle(item.id)} />
                    <span className="flex-1">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.itemCode}</span>
                  </label>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
