import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Camera, MapPin, RotateCcw } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Textarea, Spinner } from '@/components/ui'
import { ErrorMessage } from '@/components/shared'
import * as securityService from '@/features/security/services/securityService'
import { fileService } from '@/services/shared'
import { useToast } from '@/hooks'
import { getCurrentPosition, calculateDistanceMeters, stampImage, formatDateTime } from '@/utils'
import type { Checkpoint } from '@/types'
import type { GeoCoordinates } from '@/utils/geolocation'

export function PatrolCapturePage() {
  const { checkpointId } = useParams<{ checkpointId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null)
  const [loadingCheckpoint, setLoadingCheckpoint] = useState(true)

  const [location, setLocation] = useState<GeoCoordinates | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [locationLoading, setLocationLoading] = useState(true)

  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!checkpointId) return
    securityService.getCheckpoint(checkpointId).then((result) => {
      setCheckpoint(result)
      setLoadingCheckpoint(false)
    })
  }, [checkpointId])

  // Fetched proactively on mount so it's (hopefully) ready by the time the
  // guard finishes taking the photo — not requested for the first time at
  // submit, which would add an extra wait right when they want to be done.
  useEffect(() => {
    fetchLocation()
  }, [])

  function fetchLocation() {
    setLocationLoading(true)
    setLocationError(null)
    getCurrentPosition()
      .then(setLocation)
      .catch((err: Error) => setLocationError(err.message))
      .finally(() => setLocationLoading(false))
  }

  async function handleFileSelected(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return
    setCapturedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function handleRetake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setCapturedFile(null)
    setPreviewUrl(null)
  }

  async function handleSubmit() {
    if (!checkpointId || !checkpoint || !capturedFile || !location) return

    setIsSubmitting(true)
    try {
      const { patrolLogId, withinGeofence, distanceMeters } = await securityService.createPatrolLog({
        checkpointId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        notes: notes.trim() || undefined,
      })

      const stampedBlob = await stampImage(capturedFile, {
        lines: [
          checkpoint.name,
          formatDateTime(new Date()),
          `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} (\u00b1${Math.round(location.accuracy)}m)`,
        ],
      })
      const stampedFile = new File([stampedBlob], `patrol-${Date.now()}.jpg`, { type: 'image/jpeg' })

      await fileService.uploadFile({
        file: stampedFile,
        module: 'security',
        resourceType: 'patrolLog',
        resourceId: patrolLogId,
      })

      if (withinGeofence) {
        toast.success('Patrol logged.')
      } else {
        toast.warning(`Patrol logged, but you're ~${distanceMeters}m from the checkpoint — flagged for review.`)
      }
      navigate('/security')
    } catch {
      toast.error('Failed to submit patrol. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loadingCheckpoint) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (!checkpoint) {
    return <ErrorMessage message="Checkpoint not found." />
  }

  const distancePreview =
    location && !locationError
      ? Math.round(
          calculateDistanceMeters(location.latitude, location.longitude, checkpoint.latitude, checkpoint.longitude),
        )
      : null

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{checkpoint.name}</h1>
        {checkpoint.description && <p className="text-sm text-muted-foreground">{checkpoint.description}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          {locationLoading && <p className="text-sm text-muted-foreground">Getting your location…</p>}
          {locationError && (
            <div className="flex flex-col gap-2">
              <ErrorMessage message={locationError} />
              <Button type="button" variant="secondary" size="sm" onClick={fetchLocation}>
                Try Again
              </Button>
            </div>
          )}
          {location && !locationError && (
            <p className="text-sm text-muted-foreground">
              Accuracy \u00b1{Math.round(location.accuracy)}m
              {distancePreview !== null && (
                <>
                  {' \u00b7 '}
                  ~{distancePreview}m from checkpoint
                  {distancePreview > checkpoint.geofenceRadiusMeters && (
                    <span className="text-warning"> (outside {checkpoint.geofenceRadiusMeters}m radius)</span>
                  )}
                </>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photo</CardTitle>
          <CardDescription>Timestamp and location are stamped onto the photo automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          {!previewUrl ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors duration-150 hover:border-primary/50"
            >
              <Camera className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium text-primary">Take Photo</span>
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <img src={previewUrl} alt="Captured patrol evidence" className="w-full rounded-lg" />
              <Button type="button" variant="secondary" size="sm" onClick={handleRetake}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Retake
              </Button>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => void handleFileSelected(e.target.files)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
          <CardDescription>Anything unusual observed. Optional.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. broken lock, light out..."
          />
        </CardContent>
      </Card>

      <Button onClick={handleSubmit} disabled={!capturedFile || !location || isSubmitting} loading={isSubmitting}>
        Submit Patrol
      </Button>
    </div>
  )
}
