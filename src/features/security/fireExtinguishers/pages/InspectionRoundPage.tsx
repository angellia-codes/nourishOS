import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { Button, Card, CardContent, Spinner, StatusPill, Textarea } from '@/components/ui'
import { EmptyState, FileUpload } from '@/components/shared'
import { useToast } from '@/hooks'
import { cn } from '@/lib/utils'
import { outletName } from '@/features/security/securityFormat'
import * as aparService from '../fireExtinguisherService'
import {
  APAR_CHECKLIST_ITEMS,
  FORCED_SERVICE_ITEMS,
  ITEM_RESULT_LABEL,
  ITEM_RESULT_SYMBOL,
  formatPeriodMonth,
  formatUnitSpec,
} from '../fireExtinguisherFormat'
import type { AparChecklistKey, AparItemResult, AparResolution, FireExtinguisher, FireExtinguisherInspection } from '@/types'

const RESULTS: AparItemResult[] = ['pass', 'fail', 'notApplicable']

interface DraftItem {
  result: AparItemResult | null
  note: string
  photoFileId: string | null
  resolution: AparResolution | null
}

const EMPTY_DRAFT: Record<string, DraftItem> = Object.fromEntries(
  APAR_CHECKLIST_ITEMS.map((item) => [item.key, { result: null, note: '', photoFileId: null, resolution: null }]),
)

/**
 * fire-extinguisher.md §9.1 — the screen that decides whether this module
 * succeeds. Mobile-first: one scrolling list, three large tap targets per item,
 * one unit open at a time, and a submit per unit rather than per round (§5.1),
 * so a dropped connection costs the unit in hand and nothing else.
 *
 * The module ships without the D3 offline queue (§10), so there is no local
 * draft or replay: a submission needs connectivity, and the guard is told
 * immediately when one fails instead of walking away from a silent void.
 */
export function InspectionRoundPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [round, setRound] = useState<{ outletId: string; periodMonth: string } | null | undefined>(undefined)
  const [units, setUnits] = useState<FireExtinguisher[]>([])
  const [recorded, setRecorded] = useState<FireExtinguisherInspection[]>([])
  const [openUnitId, setOpenUnitId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, DraftItem>>(EMPTY_DRAFT)
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadUnits = useCallback(async (outletId: string, periodMonth: string) => {
    // §5.1 live register read — a unit registered on the 8th shows up in the
    // round generated on the 1st.
    const [register, inspections] = await Promise.all([
      aparService.getOutletRegister(outletId),
      aparService.getInspectionsForPeriod(outletId, periodMonth),
    ])
    setUnits(register.sort((a, b) => a.assetCode.localeCompare(b.assetCode)))
    setRecorded(inspections)
  }, [])

  useEffect(() => {
    if (!taskId) return
    let active = true
    void aparService.getRoundTask(taskId).then(async (task) => {
      if (!active) return
      const parts = task?.referenceId?.split('__') ?? []
      if (parts.length !== 2) {
        setRound(null)
        return
      }
      setRound({ outletId: parts[0], periodMonth: parts[1] })
      await loadUnits(parts[0], parts[1])
    })
    return () => {
      active = false
    }
  }, [taskId, loadUnits])

  const recordedIds = useMemo(() => new Set(recorded.map((item) => item.extinguisherId)), [recorded])

  function setItem(key: AparChecklistKey, patch: Partial<DraftItem>) {
    setDraft((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  function openUnit(unitId: string) {
    setOpenUnitId((current) => (current === unitId ? null : unitId))
    setDraft(EMPTY_DRAFT)
    setRemarks('')
  }

  // Mirrors §4.6 exactly — the callable re-checks all of it, this only stops
  // the guard submitting something it will reject.
  const draftComplete = APAR_CHECKLIST_ITEMS.every(({ key }) => {
    const item = draft[key]
    if (!item.result) return false
    if (item.result !== 'fail') return true
    if (!item.note.trim() || !item.photoFileId) return false
    return FORCED_SERVICE_ITEMS.includes(key) || item.resolution !== null
  })

  async function handleSubmit(unit: FireExtinguisher) {
    if (!taskId || !draftComplete) return
    setSubmitting(true)
    try {
      const result = await aparService.submitAparInspection({
        roundTaskId: taskId,
        extinguisherId: unit.id,
        remarks: remarks.trim() || undefined,
        items: APAR_CHECKLIST_ITEMS.map(({ key }) => ({
          key,
          result: draft[key].result as AparItemResult,
          note: draft[key].note.trim() || null,
          photoFileId: draft[key].photoFileId,
          resolution: FORCED_SERVICE_ITEMS.includes(key) ? 'needsService' : draft[key].resolution,
        })),
      })

      toast.success(
        result.workOrderId ? `${unit.assetCode} recorded — work order raised.` : `${unit.assetCode} recorded.`,
      )
      setOpenUnitId(null)
      setDraft(EMPTY_DRAFT)
      setRemarks('')
      if (round) await loadUnits(round.outletId, round.periodMonth)
      if (result.roundCompleted) {
        toast.success('Round complete — every unit is recorded.')
        navigate('/security/fire-extinguishers')
      }
    } catch {
      toast.error(`Failed to record ${unit.assetCode}. Nothing was saved — try again.`)
    } finally {
      setSubmitting(false)
    }
  }

  if (round === undefined) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }
  if (!round) {
    return <EmptyState title="Round not found" description="This task is not a fire extinguisher inspection round." />
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{formatPeriodMonth(round.periodMonth)} Round</h1>
        <p className="text-sm text-muted-foreground">{outletName(round.outletId)}</p>
      </div>

      {/* §9.1 — persistent progress, so the guard always knows what is left. */}
      <div className="sticky top-0 z-10 rounded-lg border border-border bg-background p-3 text-sm font-medium text-foreground">
        {recordedIds.size} of {units.length} recorded
      </div>

      {units.length === 0 ? (
        <EmptyState title="No units at this outlet" description="Register the cylinders before running a round." />
      ) : (
        units.map((unit) => {
          const isRecorded = recordedIds.has(unit.id)
          const isOpen = openUnitId === unit.id

          return (
            <Card key={unit.id} className={cn(isRecorded && 'opacity-70')}>
              <CardContent className="flex flex-col gap-3 p-4">
                <button
                  type="button"
                  className="flex min-h-11 items-center gap-3 text-left"
                  onClick={() => !isRecorded && openUnit(unit.id)}
                >
                  <div className="flex-1">
                    <p className="font-mono text-sm font-medium text-foreground">{unit.assetCode}</p>
                    <p className="text-sm text-foreground">{unit.locationLabel}</p>
                    <p className="text-xs text-muted-foreground">{formatUnitSpec(unit)}</p>
                  </div>
                  {isRecorded ? (
                    <StatusPill tone="success" icon={Check} label="Recorded" />
                  ) : isOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  )}
                </button>

                {isOpen && !isRecorded && (
                  <div className="flex flex-col gap-4 border-t border-border pt-3">
                    {APAR_CHECKLIST_ITEMS.map(({ key, en, id }) => {
                      const item = draft[key]
                      const forced = FORCED_SERVICE_ITEMS.includes(key)
                      return (
                        <div key={key} className="flex flex-col gap-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">{en}</p>
                            <p className="text-xs text-muted-foreground">{id}</p>
                          </div>

                          {/* Three ≥44px targets — gloved or wet hands, outdoor glare. */}
                          <div className="flex gap-2">
                            {RESULTS.map((result) => (
                              <button
                                key={result}
                                type="button"
                                aria-pressed={item.result === result}
                                onClick={() => setItem(key, { result })}
                                className={cn(
                                  'min-h-11 flex-1 rounded-lg border text-sm font-medium transition-colors duration-150',
                                  item.result === result
                                    ? result === 'fail'
                                      ? 'border-status-rejected bg-status-rejected text-status-rejected-foreground'
                                      : 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border text-foreground hover:border-primary/50',
                                )}
                              >
                                <span className="font-mono">{ITEM_RESULT_SYMBOL[result]}</span>
                                <span className="sr-only">{ITEM_RESULT_LABEL[result]}</span>
                              </button>
                            ))}
                          </div>

                          {item.result === 'fail' && (
                            <div className="flex flex-col gap-2 rounded-lg border border-status-rejected/40 p-3">
                              <Textarea
                                aria-label={`What is wrong with ${en}`}
                                placeholder="What is wrong with it?"
                                value={item.note}
                                onChange={(event) => setItem(key, { note: event.target.value })}
                              />

                              {item.photoFileId ? (
                                <p className="text-xs text-status-approved">Photo attached.</p>
                              ) : (
                                <FileUpload
                                  module="security"
                                  resourceType="aparInspectionPhoto"
                                  resourceId={unit.id}
                                  accept="image/*"
                                  camera
                                  onUploaded={(file) => setItem(key, { photoFileId: file.id })}
                                />
                              )}

                              {forced ? (
                                // §4.6 — a failed gauge or seal/pin means the
                                // cylinder will not discharge. Not a choice.
                                <p className="text-xs text-muted-foreground">
                                  Service required — this one cannot be resolved on the spot.
                                </p>
                              ) : (
                                <div className="flex gap-2">
                                  {(['resolvedOnSpot', 'needsService'] as AparResolution[]).map((resolution) => (
                                    <button
                                      key={resolution}
                                      type="button"
                                      aria-pressed={item.resolution === resolution}
                                      onClick={() => setItem(key, { resolution })}
                                      className={cn(
                                        'min-h-11 flex-1 rounded-lg border px-2 text-xs font-medium transition-colors duration-150',
                                        item.resolution === resolution
                                          ? 'border-primary bg-primary text-primary-foreground'
                                          : 'border-border text-foreground hover:border-primary/50',
                                      )}
                                    >
                                      {resolution === 'resolvedOnSpot' ? 'Fixed on the spot' : 'Needs service'}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    <Textarea
                      aria-label="Remarks"
                      placeholder="Remarks (optional)"
                      value={remarks}
                      onChange={(event) => setRemarks(event.target.value)}
                    />

                    <Button disabled={!draftComplete || submitting} onClick={() => void handleSubmit(unit)}>
                      {submitting ? 'Saving…' : `Record ${unit.assetCode}`}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
