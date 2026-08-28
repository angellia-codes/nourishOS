import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { useToast } from '@/hooks'
import { DEPARTMENTS } from '@/constants/organization'
import { POSITION_LEVEL_LABELS, type PositionLevel, type PositionResponsibility, type Position } from '@/types'
import * as positionService from '../positionService'

const LEVELS = Object.keys(POSITION_LEVEL_LABELS) as PositionLevel[]

function newResponsibilityId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `r-${Date.now()}-${Math.random()}`
}

/** Derives a catalog-style camelCase id from a title, e.g. "Senior Bartender" -> seniorBartender. */
function slugifyTitle(title: string): string {
  const words = title.trim().split(/[^a-zA-Z0-9]+/).filter(Boolean)
  return words
    .map((word, i) => (i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join('')
}

/**
 * Create or edit a position. Editing only stages a proposal — updatePosition
 * routes it through HR Manager -> Department Head -> GM approval
 * (POSITIONS_MASTER_DESIGN.md §8.1); the content shown here after a save
 * reflects the CURRENT live doc until that chain resolves, not the edit.
 *
 * Scope note: only title/jobOverview/keyResponsibilities/supervisesPositionIds
 * /positionStatus are editable here — authority/workingRelationships/
 * qualifications/knowledge/skills/competencies/performanceExpectations are
 * §4's confirmed tier-templated boilerplate (not a valid appraisal criteria
 * source either way) and stay editable only via a future pass.
 */
export function PositionFormPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { positionId: routePositionId } = useParams<{ positionId: string }>()
  const isEdit = Boolean(routePositionId)

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)

  const [positionId, setPositionId] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [departmentId, setDepartmentId] = useState(DEPARTMENTS[0]?.id ?? '')
  const [level, setLevel] = useState<PositionLevel>('VII')
  const [isAppraisable, setIsAppraisable] = useState(true)
  const [jobOverviewEn, setJobOverviewEn] = useState('')
  const [positionStatus, setPositionStatus] = useState<'draft' | 'active'>('draft')
  const [responsibilities, setResponsibilities] = useState<PositionResponsibility[]>([])
  const [allPositions, setAllPositions] = useState<Position[]>([])
  const [supervisesPositionIds, setSupervisesPositionIds] = useState<string[]>([])

  useEffect(() => {
    positionService.listPositions().then(setAllPositions)
  }, [])

  useEffect(() => {
    if (!routePositionId) return
    let cancelled = false

    positionService
      .getPosition(routePositionId)
      .then((row) => {
        if (cancelled) return
        if (!row) {
          toast.error('That position no longer exists.')
          navigate('/positions')
          return
        }
        setPositionId(row.positionId)
        setTitleEn(row.title.en)
        setDepartmentId(row.departmentId)
        setLevel(row.level)
        setIsAppraisable(row.isAppraisable)
        setJobOverviewEn(row.jobOverview.en)
        setPositionStatus(row.positionStatus)
        setResponsibilities(row.keyResponsibilities.filter((r) => !r.isRemoved))
        setSupervisesPositionIds(row.supervisesPositionIds)
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load that position.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [routePositionId, navigate, toast])

  function addResponsibility() {
    setResponsibilities((current) => [
      ...current,
      { responsibilityId: newResponsibilityId(), text: { en: '', id: '' }, order: current.length, isRemoved: false },
    ])
  }

  function updateResponsibilityText(responsibilityId: string, text: string) {
    setResponsibilities((current) =>
      current.map((r) => (r.responsibilityId === responsibilityId ? { ...r, text: { ...r.text, en: text } } : r)),
    )
  }

  /** Tombstoned, never spliced — §2.3 responsibilityId stability. */
  function removeResponsibility(responsibilityId: string) {
    setResponsibilities((current) =>
      current.map((r) => (r.responsibilityId === responsibilityId ? { ...r, isRemoved: true } : r)),
    )
  }

  const canSubmit = titleEn.trim() !== '' && !submitting

  async function handleSave() {
    setSubmitting(true)
    try {
      if (isEdit && routePositionId) {
        await positionService.updatePosition({
          positionId: routePositionId,
          title: { en: titleEn.trim(), id: titleEn.trim() },
          jobOverview: { en: jobOverviewEn.trim(), id: jobOverviewEn.trim() },
          keyResponsibilities: responsibilities.map((r, index) => ({
            ...r,
            text: { ...r.text, en: r.text.en.trim() },
            order: r.isRemoved ? r.order : index,
          })),
          supervisesPositionIds,
          positionStatus,
        })
        toast.success('Edit submitted for HR Manager, Department Head, and GM approval.')
        navigate(`/positions/${routePositionId}`)
        return
      }

      const { positionId: newId } = await positionService.createPosition({
        positionId: slugifyTitle(titleEn),
        title: { en: titleEn.trim(), id: titleEn.trim() },
        departmentId,
        level,
        isAppraisable,
      })
      toast.success('Position submitted for approval.')
      navigate(`/positions/${newId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save that position.')
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
      <h1 className="text-xl font-semibold text-foreground">{isEdit ? 'Edit Position' : 'New Position'}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Position details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={titleEn} maxLength={120} onChange={(e) => setTitleEn(e.target.value)} />
          </div>

          {!isEdit && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="department">Department</Label>
                <Select id="department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                  {DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="level">Tier level</Label>
                <Select id="level" value={level} onChange={(e) => setLevel(e.target.value as PositionLevel)}>
                  {LEVELS.map((value) => (
                    <option key={value} value={value}>
                      {POSITION_LEVEL_LABELS[value]}
                    </option>
                  ))}
                </Select>
              </div>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox checked={isAppraisable} onChange={(e) => setIsAppraisable(e.target.checked)} />
                Appraisable
              </label>
            </>
          )}

          {isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="positionStatus">JD status</Label>
              <Select
                id="positionStatus"
                value={positionStatus}
                onChange={(e) => setPositionStatus(e.target.value as 'draft' | 'active')}
              >
                <option value="draft">Draft — no full JD content yet</option>
                <option value="active">Active — JD content complete</option>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="jobOverview">Job overview</Label>
            <Textarea id="jobOverview" value={jobOverviewEn} onChange={(e) => setJobOverviewEn(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {isEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Key Responsibilities</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {responsibilities
              .filter((r) => !r.isRemoved)
              .map((r) => (
                <div key={r.responsibilityId} className="flex items-start gap-2">
                  <Textarea
                    value={r.text.en}
                    onChange={(e) => updateResponsibilityText(r.responsibilityId, e.target.value)}
                    rows={2}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Remove responsibility"
                    onClick={() => removeResponsibility(r.responsibilityId)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            <Button variant="secondary" onClick={addResponsibility}>
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
              Add responsibility
            </Button>
          </CardContent>
        </Card>
      )}

      {isEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Supervises</CardTitle>
          </CardHeader>
          <CardContent className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {allPositions
              .filter((p) => p.positionId !== positionId)
              .map((p) => (
                <label key={p.positionId} className="flex items-center gap-2 rounded-md p-1.5 text-sm text-foreground hover:bg-border/30">
                  <Checkbox
                    checked={supervisesPositionIds.includes(p.positionId)}
                    onChange={(e) =>
                      setSupervisesPositionIds((current) =>
                        e.target.checked
                          ? [...current, p.positionId]
                          : current.filter((id) => id !== p.positionId),
                      )
                    }
                  />
                  {p.title.en}
                </label>
              ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={() => void handleSave()} disabled={!canSubmit}>
          {isEdit ? 'Submit edit for approval' : 'Submit for approval'}
        </Button>
      </div>
    </div>
  )
}
