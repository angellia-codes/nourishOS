import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Archive, ArrowLeft, BadgeCheck, Lock, Pencil, Printer, Send } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  Spinner,
  StatusPill,
  Textarea,
  Timeline,
  TimelineItem,
} from '@/components/ui'
import { EmptyState, FileList, FileUpload, PermissionGuard } from '@/components/shared'
import { COLLECTIONS, DEPARTMENTS, OUTLETS, PERMISSIONS, POSITION_LABELS } from '@/constants'
import { DISCIPLINARY_TYPE_LABELS } from '@/constants/hr'
import { where, orderBy } from '@/services/firestore'
import { useAuth, useFirestoreDoc, useFirestoreQuery, usePermissions, useToast } from '@/hooks'
import { approvalService, userService } from '@/services/shared'
import { formatDate, formatDateTime } from '@/utils'
import * as service from '../employeeCommunicationService'
import {
  ACKNOWLEDGEMENT_STATUS_ICON,
  ACKNOWLEDGEMENT_STATUS_LABELS,
  ACKNOWLEDGEMENT_STATUS_TONE,
  BILINGUAL,
  COMMUNICATION_STATUS_ICON,
  COMMUNICATION_STATUS_LABELS,
  COMMUNICATION_STATUS_TONE,
  DECLARATION,
  PROPOSED_ACTION_CATEGORY_LABELS,
  describeValidity,
  isEditable,
} from '../employeeCommunicationFormat'
import type { AcknowledgementStatus, ApprovalHistoryEntry, DisciplinaryRecord, FileMetadata } from '@/types'

const HISTORY_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  approve: 'success',
  approve_override: 'success',
  reject: 'error',
  returnForRevision: 'warning',
}

const labelIn = (source: readonly { id: string; name: string }[], id: string | null | undefined) =>
  (id ? source.find((entry) => entry.id === id)?.name : null) ?? id ?? '—'

/** The signature block the printed form needs — §17's four parties, §32 section 9. */
const SIGNATORIES = [
  { en: 'Department Head', id: 'Kepala Departemen' },
  { en: 'Group General Manager', id: 'General Manager Grup' },
  { en: 'Group HR Manager', id: 'Manajer HRD Grup' },
  { en: 'Employee', id: 'Karyawan' },
]

/** Two-line section heading — §33. */
function SectionTitle({ section }: { section: keyof typeof BILINGUAL }) {
  return (
    <CardTitle className="flex flex-col gap-0.5">
      <span>{BILINGUAL[section].en}</span>
      <span className="text-xs font-normal italic text-muted-foreground">{BILINGUAL[section].id}</span>
    </CardTitle>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap text-sm text-foreground">{value}</p>
    </div>
  )
}

/**
 * employee_communication.md §37 — the whole record on one page.
 *
 * Approve and reject are deliberately absent: they belong to the shared Approval
 * Engine and are the approver's action, so the dashboard's Pending Approvals
 * widget is where HR and the GM pick a record up. What lives here is the
 * requester's side (submit, close), the employee's side (statement,
 * acknowledgement), and the read-only approval trail — which is also the
 * "digital signature" (§18): approver identity, role, timestamp and comment,
 * captured by approveStep. There is no signature canvas and no signed-PDF
 * artifact.
 *
 * §32's PDF is the print stylesheet: `print:` variants hide the chrome and
 * reveal the declaration and signature block, so Ctrl+P produces the official
 * form. No PDF library is involved.
 */
export function CommunicationRecordDetailPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { recordId } = useParams<{ recordId: string }>()
  const { user } = useAuth()
  const { canAny } = usePermissions()

  const { data: record, loading, error } = useFirestoreDoc<DisciplinaryRecord>(
    COLLECTIONS.DISCIPLINARY_ACTIONS,
    recordId,
  )
  const { data: attachments } = useFirestoreQuery<FileMetadata>(
    COLLECTIONS.FILES,
    recordId
      ? [
          where('resourceType', '==', 'disciplinaryRecord'),
          where('resourceId', '==', recordId),
          where('fileStatus', '==', 'available'),
          orderBy('createdAt', 'desc'),
        ]
      : [],
    [recordId],
  )

  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')
  const [statement, setStatement] = useState('')
  const [ackStatus, setAckStatus] = useState<Exclude<AcknowledgementStatus, 'pending'>>('acknowledged')
  const [signedName, setSignedName] = useState('')
  const [circumstances, setCircumstances] = useState('')
  const [closureReason, setClosureReason] = useState('')
  const [busy, setBusy] = useState(false)

  const approvalRequestId = record?.approvalRequestId ?? null

  useEffect(() => {
    if (!approvalRequestId) return
    let cancelled = false
    void approvalService
      .getApprovalHistory(approvalRequestId)
      .then((entries) => {
        if (!cancelled) setHistory(entries)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [approvalRequestId, record?.status])

  useEffect(() => {
    return userService.subscribeToDirectory(
      (users) => setNames(Object.fromEntries(users.map((entry) => [entry.uid, entry.displayName]))),
      () => setNames({}),
    )
  }, [])

  // §5.4 — a department head issues for their own team without employees.update.
  const canManage = canAny([PERMISSIONS.EMPLOYEES_COMMUNICATE, PERMISSIONS.EMPLOYEES_UPDATE])
  const isSubject = Boolean(record && user && record.employeeUid === user.uid)

  const validity = useMemo(() => (record ? describeValidity(record) : null), [record])

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (error || !record || !recordId) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Communication record unavailable"
          description="HR and management read their own scope; an employee reads only their own record, once it has been signed off."
        />
      </div>
    )
  }

  const editable = canManage && isEditable(record.status)
  const awaitingEmployee = record.status === 'pendingEmployee'
  const statementSubmitted = Boolean(record.employeeStatement?.submittedAt)
  const canWriteStatement = !statementSubmitted && (canManage || (isSubject && record.releasedToEmployee === true))

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    try {
      await action()
      toast.success(success)
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'That did not work.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button variant="ghost" onClick={() => navigate('/communications/employee')}>
          <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
          Communication
        </Button>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" aria-hidden="true" />
          Print / Save as PDF
        </Button>
      </div>

      {/* Printed header — on screen the card headers carry the title instead. */}
      <div className="hidden print:block">
        <h1 className="text-lg font-semibold">{BILINGUAL.form.en}</h1>
        <p className="text-sm italic">{BILINGUAL.form.id}</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              tone={COMMUNICATION_STATUS_TONE[record.status]}
              icon={COMMUNICATION_STATUS_ICON[record.status]}
              label={COMMUNICATION_STATUS_LABELS[record.status]}
            />
            <Badge variant="neutral">{DISCIPLINARY_TYPE_LABELS[record.type]}</Badge>
          </div>
          <SectionTitle section="employeeInfo" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Name</dt>
              <dd className="text-foreground">{record.employeeName ?? record.employeeId}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Employee ID</dt>
              <dd className="font-mono text-foreground">{record.employeeNumber ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Department</dt>
              <dd className="text-foreground">{labelIn(DEPARTMENTS, record.departmentId)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Outlet</dt>
              <dd className="text-foreground">{labelIn(OUTLETS, record.outletId)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Position</dt>
              <dd className="text-foreground">
                {POSITION_LABELS[record.position as keyof typeof POSITION_LABELS] ?? record.position ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Created</dt>
              <dd className="text-foreground">{formatDate(record.createdAt)}</dd>
            </div>
          </dl>
          <p className="whitespace-pre-wrap border-t border-border pt-3 text-sm text-foreground">
            {record.description}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle section="communicationDetails" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            {formatDate(record.incident?.date)}
            {record.incident?.time && ` · ${record.incident.time}`}
            {record.incident?.location && ` · ${record.incident.location}`}
          </p>
          <Field label="Details" value={record.incident?.details} />
          <Field label="Code of Conduct reference" value={record.incident?.codeOfConductReference} />
          <Field label="Disciplinary procedure reference" value={record.incident?.policyReference} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle section="employeeStatement" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {statementSubmitted ? (
            <>
              <p className="whitespace-pre-wrap text-sm text-foreground">{record.employeeStatement?.text}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(record.employeeStatement?.submittedAt)}
                {record.employeeStatement?.enteredOnBehalf
                  ? ` · entered on the employee's behalf by ${names[record.employeeStatement.submittedBy] ?? 'HR'}`
                  : ''}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No statement submitted.</p>
          )}

          {canWriteStatement && (
            <div className="flex flex-col gap-2 print:hidden">
              <Textarea
                aria-label="Employee statement"
                rows={4}
                value={statement}
                maxLength={5000}
                placeholder={
                  isSubject
                    ? 'Your account of what happened. Once submitted it cannot be edited.'
                    : "The employee's statement, as written on the form."
                }
                onChange={(e) => setStatement(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  disabled={busy || statement.trim() === ''}
                  onClick={() =>
                    void run(
                      () => service.submitEmployeeStatement({ recordId, text: statement.trim() }),
                      'Statement submitted.',
                    )
                  }
                >
                  Submit statement
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {(record.proposedAction?.description || record.proposedAction?.category) && (
        <Card>
          <CardHeader>
            <SectionTitle section="proposedAction" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {record.proposedAction?.category && (
              <Field label="Category" value={PROPOSED_ACTION_CATEGORY_LABELS[record.proposedAction.category]} />
            )}
            <Field label="Action" value={record.proposedAction?.description} />
            <Field label="Owner" value={record.proposedAction?.owner} />
            <Field label="Target date" value={record.proposedAction?.targetDate} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <SectionTitle section="disciplinaryAction" />
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="text-foreground">{DISCIPLINARY_TYPE_LABELS[record.type]}</p>
          {record.validUntil ? (
            <p className="text-muted-foreground">
              Valid {formatDate(record.validFrom)} — {formatDate(record.validUntil)}
              {validity && ` · ${validity}`}
            </p>
          ) : (
            <p className="text-muted-foreground">
              {record.validityDays
                ? `Valid for ${record.validityDays} days from the date the employee acknowledges receipt.`
                : 'No validity period — this record does not expire.'}
            </p>
          )}
        </CardContent>
      </Card>

      {(record.furtherAction?.employer || record.furtherAction?.employee) && (
        <Card>
          <CardHeader>
            <SectionTitle section="furtherAction" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Field label="By the employer" value={record.furtherAction?.employer} />
            <Field label="Employer owner" value={record.furtherAction?.employerOwner} />
            <Field label="Employer date" value={record.furtherAction?.employerDate} />
            <Field label="By the employee" value={record.furtherAction?.employee} />
            <Field label="Employee action due" value={record.furtherAction?.employeeDueDate} />
          </CardContent>
        </Card>
      )}

      {(record.repeatIncident?.consequence || record.repeatIncident?.nextExpectedAction) && (
        <Card>
          <CardHeader>
            <SectionTitle section="repeatIncident" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Field label="Consequence of a repeat" value={record.repeatIncident?.consequence} />
            {record.repeatIncident?.nextExpectedAction && (
              <Field
                label="Next expected action"
                value={DISCIPLINARY_TYPE_LABELS[record.repeatIncident.nextExpectedAction]}
              />
            )}
            {record.repeatIncident?.linkedPreviousRecordId && (
              <button
                type="button"
                className="self-start text-sm text-primary hover:underline print:hidden"
                onClick={() =>
                  navigate(`/communications/employee/${record.repeatIncident?.linkedPreviousRecordId ?? ''}`)
                }
              >
                Open the linked previous communication
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {/* §16 — receipt is not agreement. Printed above the signature block and
          shown on screen before the employee acknowledges. */}
      <Card>
        <CardHeader>
          <SectionTitle section="declaration" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-foreground">{DECLARATION.en}</p>
          <p className="text-sm italic text-muted-foreground">{DECLARATION.id}</p>

          {record.acknowledgement ? (
            <div className="flex flex-col gap-1.5 border-t border-border pt-3">
              <StatusPill
                className="self-start"
                tone={ACKNOWLEDGEMENT_STATUS_TONE[record.acknowledgement.status]}
                icon={ACKNOWLEDGEMENT_STATUS_ICON[record.acknowledgement.status]}
                label={ACKNOWLEDGEMENT_STATUS_LABELS[record.acknowledgement.status]}
              />
              <p className="text-xs text-muted-foreground">
                {formatDateTime(record.acknowledgement.at)}
                {record.acknowledgement.signedName && ` · signed ${record.acknowledgement.signedName}`}
                {record.acknowledgement.witnessedBy &&
                  ` · witnessed by ${names[record.acknowledgement.witnessedBy] ?? 'HR'}`}
              </p>
              {record.acknowledgement.circumstances && (
                <p className="whitespace-pre-wrap text-sm text-foreground">{record.acknowledgement.circumstances}</p>
              )}
            </div>
          ) : (
            <p className="border-t border-border pt-3 text-sm text-muted-foreground">
              {awaitingEmployee ? 'Awaiting the employee.' : 'Not yet reached — the record must clear the GM first.'}
            </p>
          )}

          {awaitingEmployee && !record.acknowledgement && (isSubject || canManage) && (
            <div className="flex flex-col gap-3 border-t border-border pt-3 print:hidden">
              {canManage && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ackStatus">Outcome</Label>
                  <Select
                    id="ackStatus"
                    value={ackStatus}
                    onChange={(e) => setAckStatus(e.target.value as Exclude<AcknowledgementStatus, 'pending'>)}
                  >
                    <option value="acknowledged">{ACKNOWLEDGEMENT_STATUS_LABELS.acknowledged}</option>
                    <option value="refused">{ACKNOWLEDGEMENT_STATUS_LABELS.refused}</option>
                    <option value="unableToSign">{ACKNOWLEDGEMENT_STATUS_LABELS.unableToSign}</option>
                  </Select>
                </div>
              )}
              {ackStatus === 'acknowledged' ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="signedName">Name, typed as a signature</Label>
                  <Input
                    id="signedName"
                    value={signedName}
                    maxLength={500}
                    placeholder={record.employeeName ?? 'Full name'}
                    onChange={(e) => setSignedName(e.target.value)}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="circumstances">Circumstances *</Label>
                  <Textarea
                    id="circumstances"
                    rows={3}
                    value={circumstances}
                    maxLength={5000}
                    placeholder="Who was present, what was said, and why the employee did not sign."
                    onChange={(e) => setCircumstances(e.target.value)}
                  />
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  disabled={busy || (ackStatus !== 'acknowledged' && circumstances.trim() === '')}
                  onClick={() =>
                    void run(
                      () =>
                        service.acknowledgeCommunicationRecord({
                          recordId,
                          acknowledgementStatus: ackStatus,
                          method: signedName.trim() ? 'typedSignature' : 'acknowledgement',
                          signedName: signedName.trim() || undefined,
                          circumstances: circumstances.trim() || undefined,
                        }),
                      'Acknowledgement recorded.',
                    )
                  }
                >
                  <BadgeCheck className="mr-1 h-4 w-4" aria-hidden="true" />
                  Record acknowledgement
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle section="signatures" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {record.status === 'draft' ? 'Not yet submitted for signing.' : 'No approval actions recorded yet.'}
            </p>
          ) : (
            <Timeline>
              {history.map((entry) => (
                <TimelineItem
                  key={entry.id}
                  variant={HISTORY_VARIANT[entry.action] ?? 'default'}
                  title={
                    <>
                      <span className="font-medium">{names[entry.approverUid] ?? 'Approver'}</span> — {entry.action}
                      {entry.comments ? `: "${entry.comments}"` : ''}
                    </>
                  }
                  timestamp={formatDateTime(entry.timestamp)}
                />
              ))}
            </Timeline>
          )}

          {/* The wet-signature grid, for the copy that goes in the employee's
              file. On screen the approval trail above is the record of who
              signed; on paper the four §17 parties need somewhere to sign. */}
          <div className="hidden grid-cols-2 gap-8 border-t border-border pt-6 print:grid">
            {SIGNATORIES.map((party) => (
              <div key={party.en} className="flex flex-col gap-8">
                <span className="text-xs">
                  {party.en} / <span className="italic">{party.id}</span>
                </span>
                <span className="border-t border-foreground/60 pt-1 text-[10px] text-foreground/60">
                  Name &amp; date / Nama &amp; tanggal
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* §23 — supporting documents. Uploads are employer-side only; the employee
          reads what is attached. */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No supporting documents attached.</p>
          ) : (
            <FileList files={attachments} />
          )}
          {canManage && <FileUpload module="hr" resourceType="disciplinaryRecord" resourceId={recordId} />}
        </CardContent>
      </Card>

      {/* §22 — internal notes, never shown to the employee. */}
      <PermissionGuard anyOf={[PERMISSIONS.EMPLOYEES_COMMUNICATE, PERMISSIONS.EMPLOYEES_UPDATE]}>
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>Investigation notes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {record.investigationNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            ) : (
              <Timeline>
                {record.investigationNotes.map((entry, index) => (
                  <TimelineItem
                    key={index}
                    title={
                      <>
                        <span className="font-medium">{names[entry.authoredBy] ?? 'Author'}</span> — {entry.note}
                      </>
                    }
                    timestamp={formatDateTime(entry.authoredAt)}
                  />
                ))}
              </Timeline>
            )}
            <div className="flex flex-col gap-2">
              <Textarea
                aria-label="Investigation note"
                rows={2}
                value={note}
                maxLength={2000}
                placeholder="Add an internal note…"
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  disabled={busy || note.trim() === ''}
                  onClick={() =>
                    void run(async () => {
                      await service.addInvestigationNote({ recordId, note: note.trim() })
                      setNote('')
                    }, 'Note added.')
                  }
                >
                  Add note
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </PermissionGuard>

      {editable && (
        <div className="flex flex-wrap justify-end gap-2 print:hidden">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => navigate(`/communications/employee/${recordId}/edit`)}
          >
            <Pencil className="mr-1 h-4 w-4" aria-hidden="true" />
            Edit
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              void run(
                () => service.submitCommunicationRecord(recordId),
                'Submitted. Routed to the first approver.',
              )
            }
          >
            <Send className="mr-1 h-4 w-4" aria-hidden="true" />
            Submit for review
          </Button>
        </div>
      )}

      {canManage && ['active', 'expired', 'open'].includes(record.status) && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>Close this case</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label htmlFor="closureReason">Reason (optional)</Label>
              <Input
                id="closureReason"
                value={closureReason}
                maxLength={5000}
                placeholder="Why the case is being closed."
                onChange={(e) => setClosureReason(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run(
                  () => service.closeCommunicationRecord({ recordId, closureReason: closureReason.trim() || undefined }),
                  'Communication record closed.',
                )
              }
            >
              <Archive className="mr-1 h-4 w-4" aria-hidden="true" />
              Close
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
