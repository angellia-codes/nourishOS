import { useState } from 'react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@/components/ui'
import { SignaturePad } from '@/components/shared'
import { useToast } from '@/hooks'
import { uploadFile } from '@/services/shared/fileService'
import { RATING_BAND_LABELS, type RatingBand } from '@/types'

interface AppraisalAcknowledgementViewProps {
  appraisalId: string
  finalScore: number | null
  ratingBand: RatingBand | null
  overallComment: string | null
  isSelfAcknowledging: boolean
  onAcknowledge: (signatureFileId?: string, witnessedByUid?: string) => void | Promise<void>
  isSubmitting?: boolean
}

/**
 * §2.6/§2.7 — the acknowledgement-mode view. This is the load-bearing
 * control that keeps the confidential recommendation out of what the
 * subject sees: it renders finalScore/ratingBand (stored for every
 * appraisal) but deliberately never imports appraisalService's
 * getAppraisalRecommendation — there is no data path here to the
 * confidential/recommendation subcollection at all, not a filtered one.
 */
export function AppraisalAcknowledgementView({
  appraisalId,
  finalScore,
  ratingBand,
  overallComment,
  isSelfAcknowledging,
  onAcknowledge,
  isSubmitting,
}: AppraisalAcknowledgementViewProps) {
  const toast = useToast()
  const [witnessedByUid, setWitnessedByUid] = useState('')
  const [uploading, setUploading] = useState(false)

  async function handleSignatureCapture(blob: Blob) {
    setUploading(true)
    try {
      const file = new File([blob], `signature-${appraisalId}.png`, { type: 'image/png' })
      const result = await uploadFile({ file, module: 'hr', resourceType: 'appraisalAcknowledgement', resourceId: appraisalId })
      // uploadFile's return type claims FileMetadata, but createFileMetadata's
      // actual response is {fileId} (a pre-existing type/runtime mismatch in
      // fileService.ts, not introduced here) — read the real field.
      const fileId = (result as unknown as { fileId: string }).fileId
      await onAcknowledge(fileId, witnessedByUid.trim() || undefined)
    } catch {
      toast.error('Could not save the signature. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acknowledge This Review</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-md border border-border p-4">
          <div>
            <p className="text-sm text-muted-foreground">Final Score</p>
            {ratingBand && <Badge variant="neutral">{RATING_BAND_LABELS[ratingBand]}</Badge>}
          </div>
          <p className="text-2xl font-semibold text-foreground">
            {finalScore !== null ? finalScore.toFixed(1) : '—'}
            <span className="ml-1 text-sm font-normal text-muted-foreground">/ 100</span>
          </p>
        </div>
        {overallComment && <p className="text-sm text-foreground">{overallComment}</p>}

        {isSelfAcknowledging ? (
          <div className="flex justify-end">
            <Button onClick={() => void onAcknowledge()} loading={isSubmitting}>
              I acknowledge this review
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Have the employee sign below. This records who operated the device, not a verified identity —
              the acknowledgement is supervised, on-device.
            </p>
            <SignaturePad onCapture={(blob) => void handleSignatureCapture(blob)} disabled={uploading || isSubmitting} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="witness">Witnessed by (optional, uid)</Label>
              <Input id="witness" value={witnessedByUid} onChange={(e) => setWitnessedByUid(e.target.value)} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
