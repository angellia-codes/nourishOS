import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Upload } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Spinner, Tabs, Textarea } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { COLLECTIONS } from '@/constants'
import { useToast } from '@/hooks'
import { getDocument } from '@/services/firestore/queries'
import {
  WELCOME_SECTIONS,
  WELCOME_SECTION_HINTS,
  WELCOME_SECTION_LABELS,
  emptySection,
  publishWelcomeContent,
  seedWelcomeContent,
  updateWelcomeContent,
  type Bilingual,
  type GuideContent,
  type MenuContent,
  type OrgChartContent,
  type WelcomeSection,
  type WelcomeSectionContent,
} from '@/features/hr/welcome/welcomeService'

/**
 * welcome-portal.md §5.1 / §7.4 — the four HR-editable welcome sections.
 *
 * Draft and publish are separate actions on purpose: a new hire sees the
 * published half the moment it lands (§14 criterion 6, "without a redeploy"),
 * so a half-rewritten menu must not be visible while HR is still typing it.
 *
 * Company Profile, Core Values and Grooming Standard are deliberately absent —
 * §2 D4 keeps those static in the welcome bundle.
 */

interface SectionDoc {
  draft?: WelcomeSectionContent | null
  published?: WelcomeSectionContent | null
  publishedAt?: string | null
}

/** Every user-visible string in the portal is an {id, en} pair (§7.4). */
function BilingualFields({
  label,
  value,
  multiline,
  onChange,
}: {
  label: string
  value: Bilingual
  multiline?: boolean
  onChange: (next: Bilingual) => void
}) {
  const Field = multiline ? Textarea : Input
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label>{label} (English)</Label>
        <Field value={value.en} onChange={(event) => onChange({ ...value, en: event.target.value })} />
      </div>
      <div>
        <Label>{label} (Bahasa Indonesia)</Label>
        <Field value={value.id} onChange={(event) => onChange({ ...value, id: event.target.value })} />
      </div>
    </div>
  )
}

function MenuEditor({ value, onChange }: { value: MenuContent; onChange: (next: MenuContent) => void }) {
  const patch = (index: number, next: MenuContent['categories'][number]) =>
    onChange({ categories: value.categories.map((category, i) => (i === index ? next : category)) })

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Prices are shown to new hires with the &ldquo;exclusive of 10% government tax + 6% service charge&rdquo; and
        allergen notices appended automatically — do not repeat them here.
      </p>
      {value.categories.map((category, categoryIndex) => (
        <Card key={categoryIndex}>
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <BilingualFields
                  label="Category"
                  value={category.title}
                  onChange={(title) => patch(categoryIndex, { ...category, title })}
                />
              </div>
              <Button
                variant="secondary"
                onClick={() =>
                  onChange({ categories: value.categories.filter((_, i) => i !== categoryIndex) })
                }
                aria-label="Remove category"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            {category.items.map((item, itemIndex) => (
              <div key={itemIndex} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                <Input
                  placeholder="Item name"
                  value={item.name}
                  onChange={(event) =>
                    patch(categoryIndex, {
                      ...category,
                      items: category.items.map((row, i) =>
                        i === itemIndex ? { ...row, name: event.target.value } : row,
                      ),
                    })
                  }
                />
                <Input
                  placeholder="Price"
                  value={item.price}
                  onChange={(event) =>
                    patch(categoryIndex, {
                      ...category,
                      items: category.items.map((row, i) =>
                        i === itemIndex ? { ...row, price: event.target.value } : row,
                      ),
                    })
                  }
                />
                <Input
                  placeholder="GF, V, VO, VG"
                  value={item.tags}
                  onChange={(event) =>
                    patch(categoryIndex, {
                      ...category,
                      items: category.items.map((row, i) =>
                        i === itemIndex ? { ...row, tags: event.target.value } : row,
                      ),
                    })
                  }
                />
                <Button
                  variant="secondary"
                  onClick={() =>
                    patch(categoryIndex, { ...category, items: category.items.filter((_, i) => i !== itemIndex) })
                  }
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}

            <Button
              variant="secondary"
              onClick={() =>
                patch(categoryIndex, { ...category, items: [...category.items, { name: '', price: '', tags: '' }] })
              }
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add item
            </Button>
          </CardContent>
        </Card>
      ))}

      <Button
        variant="secondary"
        onClick={() =>
          onChange({
            categories: [
              ...value.categories,
              { title: { id: '', en: '' }, items: [{ name: '', price: '', tags: '' }] },
            ],
          })
        }
      >
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
        Add category
      </Button>
    </div>
  )
}

function OrgChartEditor({ value, onChange }: { value: OrgChartContent; onChange: (next: OrgChartContent) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label>Chart image URL</Label>
        <Input
          type="url"
          value={value.imageUrl}
          placeholder="https://…"
          onChange={(event) => onChange({ ...value, imageUrl: event.target.value })}
        />
        <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
          <Upload className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          Must be publicly reachable. A new hire has no NourishOS account, so a link into this app&rsquo;s own storage
          will not load for them. They can pinch to zoom, so a wide chart is fine.
        </p>
      </div>
      <BilingualFields label="Caption" value={value.caption} onChange={(caption) => onChange({ ...value, caption })} />
    </div>
  )
}

function GuideEditor({ value, onChange }: { value: GuideContent; onChange: (next: GuideContent) => void }) {
  return (
    <div className="flex flex-col gap-6">
      {value.blocks.map((block, index) => (
        <Card key={index}>
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <BilingualFields
                  label="Heading"
                  value={block.heading}
                  onChange={(heading) =>
                    onChange({ blocks: value.blocks.map((row, i) => (i === index ? { ...row, heading } : row)) })
                  }
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => onChange({ blocks: value.blocks.filter((_, i) => i !== index) })}
                aria-label="Remove block"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <BilingualFields
              label="Body"
              multiline
              value={block.body}
              onChange={(body) =>
                onChange({ blocks: value.blocks.map((row, i) => (i === index ? { ...row, body } : row)) })
              }
            />
          </CardContent>
        </Card>
      ))}
      <Button
        variant="secondary"
        onClick={() =>
          onChange({ blocks: [...value.blocks, { heading: { id: '', en: '' }, body: { id: '', en: '' } }] })
        }
      >
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
        Add section
      </Button>
    </div>
  )
}

export function WelcomeContentPage() {
  const toast = useToast()
  const [section, setSection] = useState<WelcomeSection>('menu')
  const [drafts, setDrafts] = useState<Partial<Record<WelcomeSection, WelcomeSectionContent>>>({})
  const [publishedAt, setPublishedAt] = useState<Partial<Record<WelcomeSection, string | null>>>({})
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const loaded: Partial<Record<WelcomeSection, WelcomeSectionContent>> = {}
      const stamps: Partial<Record<WelcomeSection, string | null>> = {}
      for (const id of WELCOME_SECTIONS) {
        const doc = await getDocument<SectionDoc>(COLLECTIONS.WELCOME_CONTENT, id)
        loaded[id] = (doc?.draft ?? doc?.published ?? emptySection(id)) as WelcomeSectionContent
        stamps[id] = doc?.publishedAt ?? null
      }
      setDrafts(loaded)
      setPublishedAt(stamps)
      setDenied(false)
    } catch {
      setDenied(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const current = drafts[section]

  const tabs = useMemo(
    () => WELCOME_SECTIONS.map((id) => ({ value: id, label: WELCOME_SECTION_LABELS[id] })),
    [],
  )

  async function save() {
    if (!current) return
    setBusy(true)
    try {
      await updateWelcomeContent(section, current)
      toast.success('Draft saved. New hires still see the published version.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save that draft.')
    } finally {
      setBusy(false)
    }
  }

  /**
   * §7.4 — the one-time starter content. The callable skips any section that
   * already holds a draft or a published version, so this cannot overwrite
   * HR's own work, and it writes drafts only: a hire sees nothing until the
   * section is published.
   */
  async function seed() {
    setBusy(true)
    try {
      const result = await seedWelcomeContent()
      await load()
      toast.success(
        result.seeded.length > 0
          ? `Starter content loaded into ${result.seeded.length} section(s). Read it through, then publish.`
          : 'Every section already has content — nothing was changed.',
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load the starter content.')
    } finally {
      setBusy(false)
    }
  }

  async function publish() {
    if (!current) return
    setBusy(true)
    try {
      // Save first: publishing copies whatever draft is on the server, not
      // whatever is on screen.
      await updateWelcomeContent(section, current)
      const result = await publishWelcomeContent(section)
      setPublishedAt((prev) => ({ ...prev, [section]: result.publishedAt }))
      toast.success('Published. New hires see it immediately.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not publish that section.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (denied) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          title="Access restricted"
          description="Welcome content is edited by HR. Ask an administrator if you need access."
        />
      </div>
    )
  }

  const stamp = publishedAt[section]

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Welcome content</h1>
          <p className="text-sm text-muted-foreground">
            What a new hire reads in the welcome portal. Company Profile, Core Values and Grooming Standard are fixed in
            the app itself — these four are yours.
          </p>
        </div>
        <Button variant="secondary" disabled={busy} onClick={() => void seed()}>
          Load starter content
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        &ldquo;Load starter content&rdquo; fills only the sections that are still empty, as unpublished drafts — it never
        overwrites what you have written, and nothing reaches a new hire until you publish it. The Menu arrives as
        categories with no items, and the Org Chart without its image: both need source material HR holds.
      </p>

      <Tabs items={tabs} value={section} onValueChange={(next) => setSection(next as WelcomeSection)} />

      <Card>
        <CardHeader>
          <CardTitle>{WELCOME_SECTION_LABELS[section]}</CardTitle>
          <p className="text-sm text-muted-foreground">{WELCOME_SECTION_HINTS[section]}</p>
          <p className="text-xs text-muted-foreground">
            {stamp ? `Last published ${new Date(stamp).toLocaleString()}` : 'Never published — new hires see nothing here yet.'}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {section === 'menu' ? (
            <MenuEditor
              value={current as MenuContent}
              onChange={(next) => setDrafts((prev) => ({ ...prev, menu: next }))}
            />
          ) : section === 'orgChart' ? (
            <OrgChartEditor
              value={current as OrgChartContent}
              onChange={(next) => setDrafts((prev) => ({ ...prev, orgChart: next }))}
            />
          ) : (
            <GuideEditor
              value={current as GuideContent}
              onChange={(next) => setDrafts((prev) => ({ ...prev, [section]: next }))}
            />
          )}

          <div className="flex flex-wrap gap-3 border-t border-border pt-4">
            <Button variant="secondary" disabled={busy} onClick={() => void save()}>
              Save draft
            </Button>
            <Button disabled={busy} onClick={() => void publish()}>
              Publish
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
