import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Check, Circle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Spinner } from '@/components/ui'
import { EmptyState, FileList, FileUpload, PermissionGuard } from '@/components/shared'
import { useAuth, useFirestoreQuery, useToast } from '@/hooks'
import { OPENING_CHECKLIST_ITEMS, CLOSING_CHECKLIST_ITEMS, COLLECTIONS, PERMISSIONS } from '@/constants'
import { where, orderBy } from '@/services/firestore'
import * as checklistService from './checklistService'
import type { ChecklistCompletion, ChecklistType, FileMetadata } from '@/types'

/** Same client-side "today" convention DailyUpdatesFeedPage already uses — a display/lookup key, not a server-truth boundary. */
function todayIsoClient(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * FEATURE_SPECIFICATIONS.md Module 5 — Opening/Closing Checklists. One
 * component for both types (route param), same precedent as SopFormPage
 * serving new/edit. Photo attachments are one shared FileUpload for the
 * whole day's checklist rather than one per item — a deliberate scope-down,
 * the spec asks for "photo attachments" not a per-item upload widget.
 */
export function ChecklistPage() {
  const { type } = useParams<{ type: ChecklistType }>()
  const { profile } = useAuth()
  const toast = useToast()

  const items = type === 'closing' ? CLOSING_CHECKLIST_ITEMS : OPENING_CHECKLIST_ITEMS
  const date = todayIsoClient()
  const outletId = profile?.outletId
  const checklistId = outletId ? `${outletId}__${date}` : undefined

  const [completion, setCompletion] = useState<ChecklistCompletion | null | undefined>(undefined)
  const [savingItemId, setSavingItemId] = useState<string | null>(null)

  const { data: attachments } = useFirestoreQuery<FileMetadata>(
    COLLECTIONS.FILES,
    checklistId
      ? [
          where('resourceType', '==', 'checklistCompletion'),
          where('resourceId', '==', checklistId),
          where('fileStatus', '==', 'available'),
          orderBy('createdAt', 'desc'),
        ]
      : [],
    [checklistId],
  )

  useEffect(() => {
    if (!type || !outletId) return
    let cancelled = false
    checklistService.getTodaysChecklist(type, outletId, date).then((row) => {
      if (!cancelled) setCompletion(row)
    })
    return () => {
      cancelled = true
    }
  }, [type, outletId, date])

  if (!type || (type !== 'opening' && type !== 'closing')) {
    return <EmptyState title="Unknown checklist" />
  }
  if (!outletId) {
    return <EmptyState title="No outlet assigned" description="Your account has no outlet, so there's no checklist to show." />
  }

  const statuses = completion?.itemStatuses ?? {}
  const completedCount = items.filter((item) => statuses[item.id]?.completed).length

  async function handleToggle(itemId: string, completed: boolean) {
    if (!type) return
    setSavingItemId(itemId)
    try {
      await checklistService.saveChecklistProgress({ type, itemId, completed })
      const refreshed = await checklistService.getTodaysChecklist(type, outletId!, date)
      setCompletion(refreshed)
    } catch {
      toast.error('Failed to save. Please try again.')
    } finally {
      setSavingItemId(null)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground capitalize">{type} Checklist</h1>
        <p className="text-sm text-muted-foreground">
          {completedCount} of {items.length} complete · {date}
        </p>
      </div>

      {completion === undefined ? (
        <div className="flex justify-center p-12">
          <Spinner />
        </div>
      ) : (
        <PermissionGuard
          permission={PERMISSIONS.CHECKLISTS_RECORD}
          fallback={<EmptyState title="No access" description="You don't have permission to record this checklist." />}
        >
          <Card>
            <CardContent className="flex flex-col gap-1 p-2">
              {items.map((item) => {
                const done = statuses[item.id]?.completed ?? false
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={savingItemId === item.id}
                    onClick={() => handleToggle(item.id, !done)}
                    className="flex items-center gap-3 rounded-md p-3 text-left transition-colors duration-150 hover:bg-border/30 disabled:opacity-60"
                  >
                    {done ? (
                      <Check className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    )}
                    <span className={done ? 'text-foreground line-through' : 'text-foreground'}>{item.label}</span>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <FileList files={attachments} />
              {checklistId && <FileUpload module="operations" resourceType="checklistCompletion" resourceId={checklistId} />}
            </CardContent>
          </Card>
        </PermissionGuard>
      )}
    </div>
  )
}
