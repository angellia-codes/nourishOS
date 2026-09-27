import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Clock, FileCheck, FileText, X } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  StatusPill,
  Textarea,
  Timeline,
  TimelineItem,
} from '@/components/ui'
import { EmptyState, SignaturePad } from '@/components/shared'
import { COLLECTIONS } from '@/constants'
import { CONTRACT_TYPE_LABELS } from '@/constants/hr'
import { useAuth, useToast } from '@/hooks'
import { getDocument } from '@/services/firestore'
import { approvalService, fileService, userService } from '@/services/shared'
import * as contractService from '@/features/hr/contracts/contractService'
import * as employeeService from '@/features/hr/services/employeeService'
import { formatDate, formatDateTime } from '@/utils'
import type { ApprovalHistoryEntry, ApprovalRequest, Contract, Employee, FileMetadata } from '@/types'

const HISTORY_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  approve: 'success',
  approve_override: 'success',
  reject: 'error',
  returnForRevision: 'warning',
}

/**
 * HR_OPERATIONS.md §9.14 — where the General Manager and Director open the
 * contract PDF (a link, not a forced download) and sign it. The PDF itself
 * is never modified: a captured signature image is uploaded through the
 * shared file-storage engine and linked to the approval-history entry as
 * audit evidence — the same "capture blob → upload → attach fileId" pattern
 * Appraisal v2's acknowledgement flow already uses
 * (AppraisalAcknowledgementView.tsx). Submitting still just calls the
 * existing approveStep — the automatic signingStatus flip on full approval
 * (functions/src/hr/contracts/index.ts) is unchanged.
 */
export function ContractSigningPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { profile } = useAuth()
  const { contractId } = useParams<{ contractId: string }>()

  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [signedFile, setSignedFile] = useState<FileMetadata | null>(null)
  const [fullySignedFile, setFullySignedFile] = useState<FileMetadata | null>(null)

  const [approvalRequest, setApprovalRequest] = useState<ApprovalRequest | null>(null)
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryEntry[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [signaturePreviewUrls, setSignaturePreviewUrls] = useState<Record<string, string>>({})

  const [rejecting, setRejecting] = useState(false)
  const [decisionComment, setDecisionComment] = useState('')
  const [decisionBusy, setDecisionBusy] = useState(false)
  const [signatureFileId, setSignatureFileId] = useState<string | null>(null)
  const [uploadingSignature, setUploadingSignature] = useState(false)

  useEffect(() => {
    if (!contractId) return
    return contractService.subscribeToContract(contractId, (row) => {
      setContract(row)
      setLoading(false)
    })
  }, [contractId])

  useEffect(() => {
    if (!contract) return
    let cancelled = false
    employeeService.getEmployee(contract.employeeId).then((row) => {
      if (!cancelled) setEmployee(row)
    })
    return () => {
      cancelled = true
    }
  }, [contract])

  useEffect(() => {
    if (!contract?.signedFileId) {
      setSignedFile(null)
      return
    }
    let cancelled = false
    getDocument<FileMetadata>(COLLECTIONS.FILES, contract.signedFileId).then((row) => {
      if (!cancelled) setSignedFile(row)
    })
    return () => {
      cancelled = true
    }
  }, [contract?.signedFileId])

  useEffect(() => {
    if (!contract?.fullySignedFileId) {
      setFullySignedFile(null)
      return
    }
    let cancelled = false
    getDocument<FileMetadata>(COLLECTIONS.FILES, contract.fullySignedFileId).then((row) => {
      if (!cancelled) setFullySignedFile(row)
    })
    return () => {
      cancelled = true
    }
  }, [contract?.fullySignedFileId])

  const approvalRequestId = contract?.signingApprovalRequestId ?? null

  const loadApprovalHistory = useCallback(() => {
    if (!approvalRequestId) return
    approvalService.getApprovalHistory(approvalRequestId).then(setApprovalHistory).catch(() => undefined)
  }, [approvalRequestId])

  useEffect(() => {
    if (!approvalRequestId) {
      setApprovalRequest(null)
      setApprovalHistory([])
      return
    }
    loadApprovalHistory()
    return approvalService.subscribeToApprovalRequest(approvalRequestId, setApprovalRequest)
  }, [approvalRequestId, loadApprovalHistory])

  useEffect(() => {
    return userService.subscribeToDirectory(
      (users) => setNames(Object.fromEntries(users.map((entry) => [entry.uid, entry.displayName]))),
      () => setNames({}),
    )
  }, [])

  // Resolve a small thumbnail for each history entry's captured signature —
  // at most a couple per contract, so a per-entry lookup needs no new query.
  useEffect(() => {
    const unresolved = approvalHistory
      .map((entry) => entry.signatureFileId)
      .filter((id): id is string => Boolean(id) && !(id as string in signaturePreviewUrls))
    if (unresolved.length === 0) return
    let cancelled = false
    void Promise.all(
      unresolved.map(async (fileId) => {
        const file = await getDocument<FileMetadata>(COLLECTIONS.FILES, fileId)
        if (!file) return null
        const url = await fileService.getFileDownloadUrl(file.storagePath)
        return [fileId, url] as const
      }),
    ).then((pairs) => {
      if (cancelled) return
      const resolved = Object.fromEntries(
        pairs.filter((pair): pair is readonly [string, string] => pair !== null),
      )
      if (Object.keys(resolved).length > 0) {
        setSignaturePreviewUrls((prev) => ({ ...prev, ...resolved }))
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvalHistory])

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (!contract || !contractId) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          title="Not found"
          description="That contract no longer exists."
          action={
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Back
            </Button>
          }
        />
      </div>
    )
  }

  const currentStep = approvalRequest?.steps[approvalRequest.currentStepIndex]
  const needsSignature = currentStep?.requiresSignature === true

  const canDecide =
    approvalRequest != null &&
    approvalService.canActOnApprovalRequest(
      approvalRequest,
      profile ? { uid: profile.uid, roleId: profile.roleId, outletId: profile.outletId } : null,
    )

  async function handleViewPdf() {
    if (!signedFile) return
    const url = await fileService.getFileDownloadUrl(signedFile.storagePath)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function handleViewFullySignedPdf() {
    if (!fullySignedFile) return
    const url = await fileService.getFileDownloadUrl(fullySignedFile.storagePath)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function handleSignatureCapture(blob: Blob) {
    if (!contractId) return
    setUploadingSignature(true)
    try {
      const file = new File([blob], `signature-${contractId}-${profile?.uid ?? 'approver'}.png`, {
        type: 'image/png',
      })
      const result = await fileService.uploadFile({
        file,
        module: 'hr',
        resourceType: 'contractSignature',
        resourceId: contractId,
      })
      // uploadFile's return type claims FileMetadata, but createFileMetadata's
      // actual response is {fileId} (a pre-existing type/runtime mismatch in
      // fileService.ts, not introduced here — see AppraisalAcknowledgementView.tsx).
      setSignatureFileId((result as unknown as { fileId: string }).fileId)
      toast.success('Signature captured.')
    } catch {
      toast.error('Could not save the signature. Please try again.')
    } finally {
      setUploadingSignature(false)
    }
  }

  async function handleApprove() {
    if (!approvalRequestId) return
    if (needsSignature && !signatureFileId) return
    setDecisionBusy(true)
    try {
      await approvalService.approveStep({
        approvalRequestId,
        comments: decisionComment.trim() || undefined,
        signatureFileId: signatureFileId ?? undefined,
      })
      toast.success(needsSignature ? 'Signed and approved.' : 'Approved.')
      setDecisionComment('')
      setSignatureFileId(null)
      setRejecting(false)
      loadApprovalHistory()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not submit.')
    } finally {
      setDecisionBusy(false)
    }
  }

  async function handleReject() {
    if (!approvalRequestId || !decisionComment.trim()) return
    setDecisionBusy(true)
    try {
      await approvalService.rejectStep({ approvalRequestId, comments: decisionComment.trim() })
      toast.success('Rejected.')
      setDecisionComment('')
      setSignatureFileId(null)
      setRejecting(false)
      loadApprovalHistory()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not reject.')
    } finally {
      setDecisionBusy(false)
    }
  }

  const statusPill =
    contract.signingStatus === 'signed'
      ? { tone: 'success' as const, icon: FileCheck, label: 'Signed' }
      : contract.signingStatus === 'pending'
        ? { tone: 'warning' as const, icon: Clock, label: 'Out for signing' }
        : { tone: 'neutral' as const, icon: FileText, label: 'Unsigned' }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <p className="font-mono text-xs text-muted-foreground">
              {employee ? `${employee.employeeNumber} · ${employee.fullName}` : 'Contract'}
            </p>
            <h1 className="text-xl font-semibold text-foreground">
              v{contract.version} · {CONTRACT_TYPE_LABELS[contract.contractType]}
            </h1>
          </div>
        </div>
        <StatusPill tone={statusPill.tone} icon={statusPill.icon} label={statusPill.label} />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm text-foreground">Contract PDF</p>
            <p className="text-xs text-muted-foreground">Opens in a new tab — review it before signing.</p>
          </div>
          <Button variant="secondary" disabled={!signedFile} onClick={() => void handleViewPdf()}>
            <FileText className="mr-1 h-4 w-4" aria-hidden="true" />
            View Contract PDF
          </Button>
        </CardContent>
      </Card>

      {contract.signingStatus === 'signed' && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm text-foreground">Fully Signed PDF</p>
              <p className="text-xs text-muted-foreground">
                {fullySignedFile
                  ? "The GM's and Director's signatures, stamped into the original document."
                  : 'Being generated — check back shortly, or ask HR if this persists.'}
              </p>
            </div>
            <Button variant="secondary" disabled={!fullySignedFile} onClick={() => void handleViewFullySignedPdf()}>
              <FileCheck className="mr-1 h-4 w-4" aria-hidden="true" />
              Download Fully Signed PDF
            </Button>
          </CardContent>
        </Card>
      )}

      {approvalRequest && (
        <Card>
          <CardHeader>
            <CardTitle>Approval</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {canDecide && (
              <div className="flex flex-col gap-3 rounded-md border border-border p-3">
                <p className="text-sm text-foreground">
                  {needsSignature
                    ? 'This contract is waiting on your signature.'
                    : 'This contract is waiting on your decision.'}
                </p>

                {needsSignature && !rejecting && (
                  <div className="flex flex-col gap-2">
                    <SignaturePad
                      onCapture={(blob) => void handleSignatureCapture(blob)}
                      disabled={uploadingSignature || decisionBusy}
                    />
                    {signatureFileId && <p className="text-xs text-success">Signature captured.</p>}
                  </div>
                )}

                <Textarea
                  aria-label="Decision comment"
                  rows={2}
                  placeholder={rejecting ? 'Reason for rejecting (required)' : 'Comment (optional)'}
                  value={decisionComment}
                  onChange={(e) => setDecisionComment(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {rejecting ? (
                    <>
                      <Button
                        variant="danger"
                        disabled={decisionBusy || !decisionComment.trim()}
                        onClick={() => void handleReject()}
                      >
                        <X className="mr-1 h-4 w-4" aria-hidden="true" />
                        Confirm reject
                      </Button>
                      <Button variant="ghost" disabled={decisionBusy} onClick={() => setRejecting(false)}>
                        Back
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        disabled={decisionBusy || (needsSignature && !signatureFileId)}
                        onClick={() => void handleApprove()}
                      >
                        <Check className="mr-1 h-4 w-4" aria-hidden="true" />
                        {needsSignature ? 'Sign & Approve' : 'Approve'}
                      </Button>
                      <Button variant="secondary" disabled={decisionBusy} onClick={() => setRejecting(true)}>
                        <X className="mr-1 h-4 w-4" aria-hidden="true" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
            {approvalHistory.length > 0 && (
              <Timeline>
                {approvalHistory.map((entry) => (
                  <TimelineItem
                    key={entry.id}
                    variant={HISTORY_VARIANT[entry.action] ?? 'default'}
                    title={
                      <span className="flex flex-col gap-1">
                        <span>
                          <span className="font-medium">{names[entry.approverUid] ?? 'Approver'}</span> —{' '}
                          {entry.action}
                          {entry.comments ? `: "${entry.comments}"` : ''}
                        </span>
                        {entry.signatureFileId && signaturePreviewUrls[entry.signatureFileId] && (
                          <img
                            src={signaturePreviewUrls[entry.signatureFileId]}
                            alt={`Signature — ${names[entry.approverUid] ?? 'Approver'}`}
                            className="h-16 w-auto rounded border border-border bg-white"
                          />
                        )}
                      </span>
                    }
                    timestamp={formatDateTime(entry.timestamp)}
                  />
                ))}
              </Timeline>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Period</p>
            <p className="text-sm text-foreground">
              {formatDate(contract.contractStartDate)} –{' '}
              {contract.contractEndDate ? formatDate(contract.contractEndDate) : 'No end date'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
