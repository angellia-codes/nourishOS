import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { EmptyState, ErrorMessage } from '@/components/shared'
import { useToast } from '@/hooks'
import { OUTLETS } from '@/constants'
import { getCurrentPosition } from '@/utils'
import * as securityService from '@/features/security/services/securityService'

const LIST_ROUTE = '/security'

/**
 * Add / edit / archive a patrol checkpoint — security-control-point.md §3.
 * One component for both routes, the same way SopFormPage serves new and
 * :id/edit.
 *
 * Archive is a two-step inline confirm because this design system has no Dialog
 * primitive.
 *
 * Outlet is stored and displayed, not used to scope the guard's checkpoint
 * list — that list stays company-wide. See src/features/security/CLAUDE.md.
 */
export function CheckpointFormPage() {
  const { checkpointId } = useParams<{ checkpointId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const isEdit = Boolean(checkpointId)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [outletId, setOutletId] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [geofenceRadiusMeters, setGeofenceRadiusMeters] = useState('50')
  const [scheduleIntervalMinutes, setScheduleIntervalMinutes] = useState('120')

  const [loading, setLoading] = useState(isEdit)
  const [loadError, setLoadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmingArchive, setConfirmingArchive] = useState(false)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    if (!checkpointId) return
    let cancelled = false
    securityService
      .getCheckpoint(checkpointId)
      .then((row) => {
        if (cancelled) return
        if (!row) {
          setLoadError('That checkpoint no longer exists.')
          return
        }
        setName(row.name)
        setDescription(row.description ?? '')
        setOutletId(row.outletId ?? '')
        setLatitude(String(row.latitude))
        setLongitude(String(row.longitude))
        setGeofenceRadiusMeters(String(row.geofenceRadiusMeters))
        setScheduleIntervalMinutes(String(row.scheduleIntervalMinutes))
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load that checkpoint.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [checkpointId])

  /** Typing coordinates by hand is error-prone; the admin is usually standing at the post. */
  async function useMyLocation() {
    setLocating(true)
    try {
      const position = await getCurrentPosition()
      setLatitude(String(position.latitude))
      setLongitude(String(position.longitude))
    } catch {
      toast.error('Could not read your location. Enter the coordinates manually.')
    } finally {
      setLocating(false)
    }
  }

  const radius = Number(geofenceRadiusMeters)
  const interval = Number(scheduleIntervalMinutes)
  const lat = Number(latitude)
  const lng = Number(longitude)

  // Mirrors the server's validateCheckpointFields — saves a round trip, does not replace it.
  const canSubmit =
    name.trim() !== '' &&
    outletId !== '' &&
    latitude !== '' &&
    longitude !== '' &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180 &&
    Number.isFinite(radius) &&
    radius > 0 &&
    Number.isFinite(interval) &&
    interval > 0 &&
    !submitting

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    const input = {
      name: name.trim(),
      description: description.trim() || undefined,
      outletId,
      latitude: lat,
      longitude: lng,
      geofenceRadiusMeters: radius,
      scheduleIntervalMinutes: interval,
    }
    try {
      if (checkpointId) {
        await securityService.updateCheckpoint({ ...input, checkpointId })
        toast.success('Checkpoint updated.')
      } else {
        await securityService.createCheckpoint(input)
        toast.success('Checkpoint created.')
      }
      navigate(LIST_ROUTE)
    } catch {
      toast.error('Could not save the checkpoint. Please try again.')
      setSubmitting(false)
    }
  }

  async function handleArchive() {
    if (!checkpointId) return
    setSubmitting(true)
    try {
      await securityService.archiveCheckpoint(checkpointId)
      toast.success('Checkpoint archived.')
      navigate(LIST_ROUTE)
    } catch {
      toast.error('Could not archive the checkpoint. Please try again.')
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

  if (loadError) {
    return <EmptyState title="Checkpoint not found" description={loadError} />
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate(LIST_ROUTE)} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{isEdit ? 'Edit checkpoint' : 'Add checkpoint'}</h1>
          <p className="text-sm text-muted-foreground">
            Guards log patrols against this point; the radius is what counts as being there.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Checkpoint</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cpName">Name *</Label>
            <Input id="cpName" value={name} placeholder="Main gate" onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cpDescription">Description</Label>
            <Textarea
              id="cpDescription"
              value={description}
              placeholder="Where exactly the guard should stand, and anything to check while there."
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cpOutlet">Outlet *</Label>
            <Select id="cpOutlet" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
              <option value="">Select an outlet…</option>
              {OUTLETS.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cpLatitude">Latitude *</Label>
              <Input
                id="cpLatitude"
                type="number"
                step="any"
                value={latitude}
                placeholder="-8.8305"
                onChange={(e) => setLatitude(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cpLongitude">Longitude *</Label>
              <Input
                id="cpLongitude"
                type="number"
                step="any"
                value={longitude}
                placeholder="115.0849"
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
          </div>
          <Button type="button" variant="secondary" size="sm" className="self-start" onClick={useMyLocation} disabled={locating}>
            <MapPin className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {locating ? 'Reading location…' : 'Use my current location'}
          </Button>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cpRadius">Geofence radius (metres) *</Label>
              <Input
                id="cpRadius"
                type="number"
                min={1}
                value={geofenceRadiusMeters}
                onChange={(e) => setGeofenceRadiusMeters(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A patrol logged outside this is still recorded, but flagged for review.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cpInterval">Patrol interval (minutes) *</Label>
              <Input
                id="cpInterval"
                type="number"
                min={1}
                value={scheduleIntervalMinutes}
                onChange={(e) => setScheduleIntervalMinutes(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Longer than this without a visit and the GM gets an overdue alert.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isEdit && confirmingArchive && (
        <ErrorMessage message="Archiving removes this checkpoint from the patrol list and the overdue alerts. Existing patrol history is kept." />
      )}

      <div className="flex flex-wrap justify-between gap-2 pb-8">
        {isEdit ? (
          confirmingArchive ? (
            <div className="flex gap-2">
              <Button variant="danger" onClick={handleArchive} disabled={submitting}>
                Confirm archive
              </Button>
              <Button variant="ghost" onClick={() => setConfirmingArchive(false)} disabled={submitting}>
                Keep
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmingArchive(true)} disabled={submitting}>
              Archive
            </Button>
          )
        ) : (
          <span />
        )}

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(LIST_ROUTE)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? <Spinner className="h-4 w-4" /> : isEdit ? 'Save changes' : 'Add checkpoint'}
          </Button>
        </div>
      </div>
    </div>
  )
}
