import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { where, orderBy } from 'firebase/firestore'
import { ArrowLeft } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { FileList, PermissionGuard } from '@/components/shared'
import { useFirestoreDoc, useFirestoreQuery, useToast } from '@/hooks'
import { COLLECTIONS, PERMISSIONS } from '@/constants'
import { formatDate } from '@/utils'
import * as lostFoundService from '../lostFoundService'
import {
  formatLostFoundDate,
  LOST_FOUND_CATEGORY_LABELS,
  LOST_FOUND_STATUS_LABELS,
  LOST_FOUND_STATUS_VARIANT,
  VALUE_TIER_LABELS,
  VALUE_TIER_VARIANT,
} from '../lostFoundFormat'
import type { FileMetadata, LostFoundDisposalMethod, LostFoundItem } from '@/types'

const DISPOSAL_METHOD_LABELS: Record<LostFoundDisposalMethod, string> = {
  donated: 'Donated',
  discarded: 'Discarded',
  handedToAuthorities: 'Handed to Authorities',
}

function ClaimPanel({ item, onDone }: { item: LostFoundItem; onDone: () => void }) {
  const toast = useToast()
  const [claimantName, setClaimantName] = useState('')
  const [claimantPhone, setClaimantPhone] = useState('')
  const [claimantEmail, setClaimantEmail] = useState('')
  const [identifyingDetailsGiven, setIdentifyingDetailsGiven] = useState('')
  const [idVerified, setIdVerified] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const requiresIdVerification = item.valueTier !== 'low'
  const canSubmit =
    claimantName.trim() !== '' &&
    (claimantPhone.trim() !== '' || claimantEmail.trim() !== '') &&
    identifyingDetailsGiven.trim() !== '' &&
    (!requiresIdVerification || idVerified)

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await lostFoundService.claimLostFoundItem({
        itemId: item.id,
        claimantName,
        claimantPhone: claimantPhone.trim() || undefined,
        claimantEmail: claimantEmail.trim() || undefined,
        identifyingDetailsGiven,
        idVerified,
      })
      toast.success('Item returned to claimant.')
      onDone()
    } catch {
      toast.error('Failed to record claim. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Claim &amp; Return</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="claimName">Claimant Name *</Label>
            <Input id="claimName" value={claimantName} onChange={(e) => setClaimantName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="claimPhone">Phone</Label>
            <Input id="claimPhone" value={claimantPhone} onChange={(e) => setClaimantPhone(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="claimEmail">Email {claimantPhone.trim() === '' && '*'}</Label>
            <Input id="claimEmail" type="email" value={claimantEmail} onChange={(e) => setClaimantEmail(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="claimDetails">Identifying Details Given *</Label>
          <Textarea
            id="claimDetails"
            placeholder="What they described before staff confirmed the match…"
            value={identifyingDetailsGiven}
            onChange={(e) => setIdentifyingDetailsGiven(e.target.value)}
          />
        </div>
        {requiresIdVerification && (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={idVerified} onChange={(e) => setIdVerified(e.target.checked)} />
            ID verified — required for {VALUE_TIER_LABELS[item.valueTier].toLowerCase()} items *
          </label>
        )}
        <div className="flex justify-end">
          <Button type="button" disabled={!canSubmit || submitting} onClick={handleSubmit}>
            {submitting ? <Spinner className="h-4 w-4" /> : 'Confirm Return'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function DisposePanel({ item, onDone }: { item: LostFoundItem; onDone: () => void }) {
  const toast = useToast()
  const [method, setMethod] = useState<LostFoundDisposalMethod>('donated')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const beforeRetention = item.retentionExpiresAt > today
  const canSubmit = notes.trim() !== ''

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await lostFoundService.disposeLostFoundItem({
        itemId: item.id,
        disposalMethod: method,
        disposalNotes: notes,
        overrideBeforeRetention: beforeRetention,
      })
      toast.success('Item disposed.')
      onDone()
    } catch {
      toast.error('Failed to dispose item. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dispose Item</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {beforeRetention && (
          <p className="text-xs text-warning">
            Retention holds until {formatLostFoundDate(item.retentionExpiresAt)} — disposing now requires a reason below.
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="disposeMethod">Method *</Label>
          <Select id="disposeMethod" value={method} onChange={(e) => setMethod(e.target.value as LostFoundDisposalMethod)}>
            {Object.entries(DISPOSAL_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="disposeNotes">Notes {beforeRetention && '(reason for early disposal) '}*</Label>
          <Textarea id="disposeNotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="secondary" disabled={!canSubmit || submitting} onClick={handleSubmit}>
            {submitting ? <Spinner className="h-4 w-4" /> : 'Confirm Disposal'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function LostFoundDetailPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const navigate = useNavigate()

  const { data: item, loading } = useFirestoreDoc<LostFoundItem>(COLLECTIONS.LOST_FOUND_ITEMS, itemId)
  const { data: photos } = useFirestoreQuery<FileMetadata>(
    COLLECTIONS.FILES,
    itemId
      ? [
          where('resourceType', '==', 'lostFoundItem'),
          where('resourceId', '==', itemId),
          where('fileStatus', '==', 'available'),
          orderBy('createdAt', 'desc'),
        ]
      : [],
    [itemId],
  )

  const [activePanel, setActivePanel] = useState<'none' | 'claim' | 'dispose'>('none')

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (!item) {
    return <p className="text-sm text-muted-foreground">Item not found.</p>
  }

  const canClaim = item.status === 'logged' || item.status === 'claimPending'
  const canDispose = item.status === 'logged' || item.status === 'unclaimed'

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/operations/lost-found')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{item.itemDescription}</h1>
          <p className="font-mono text-xs text-muted-foreground">{item.itemNumber}</p>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={VALUE_TIER_VARIANT[item.valueTier]}>{VALUE_TIER_LABELS[item.valueTier]}</Badge>
            <Badge variant={LOST_FOUND_STATUS_VARIANT[item.status]}>{LOST_FOUND_STATUS_LABELS[item.status]}</Badge>
            <Badge variant="neutral">{LOST_FOUND_CATEGORY_LABELS[item.category]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Found at {item.foundLocation} on {formatLostFoundDate(item.foundAt)}
          </p>
          <p className="text-sm text-muted-foreground">
            Stored: {item.storageLocation} · retention until {formatLostFoundDate(item.retentionExpiresAt)}
          </p>
          {item.claimantName && (
            <p className="text-sm text-muted-foreground">
              Claimant: {item.claimantName}
              {item.returnedAt && ` · returned ${formatDate(item.returnedAt)}`}
            </p>
          )}
          {item.disposalMethod && <p className="text-sm text-muted-foreground">Disposal: {DISPOSAL_METHOD_LABELS[item.disposalMethod]} — {item.disposalNotes}</p>}

          <FileList files={photos} />
        </CardContent>
      </Card>

      <PermissionGuard permission={PERMISSIONS.LOST_FOUND_MANAGE}>
        {activePanel === 'none' && (canClaim || canDispose) && (
          <div className="flex gap-2">
            {canClaim && (
              <Button type="button" variant="secondary" onClick={() => setActivePanel('claim')}>
                Record Claim &amp; Return
              </Button>
            )}
            {canDispose && (
              <Button type="button" variant="ghost" onClick={() => setActivePanel('dispose')}>
                Dispose
              </Button>
            )}
          </div>
        )}
        {activePanel === 'claim' && <ClaimPanel item={item} onDone={() => setActivePanel('none')} />}
        {activePanel === 'dispose' && <DisposePanel item={item} onDone={() => setActivePanel('none')} />}
      </PermissionGuard>
    </div>
  )
}
