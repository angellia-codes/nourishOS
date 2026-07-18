import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '@/components/ui'
import { useFirestoreDoc, useRole, useToast } from '@/hooks'
import { useAuthStore } from '@/store'
import { COLLECTIONS } from '@/constants'
import type { AckParty, DisciplinaryAction, Employee } from '@/types'
import * as disciplinaryService from '../disciplinaryService'
import {
  ACK_PARTY_LABELS,
  DISCIPLINARY_STATUS_LABELS,
  DISCIPLINARY_STATUS_VARIANT,
  DISCIPLINARY_TYPE_LABELS,
  formatDisciplinaryDate,
} from '../disciplinaryFormat'

export function DisciplinaryDetailPage() {
  const { actionId } = useParams<{ actionId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const profile = useAuthStore((s) => s.profile)
  const { roleId } = useRole()

  const { data: action, loading } = useFirestoreDoc<DisciplinaryAction>(COLLECTIONS.DISCIPLINARY_ACTIONS, actionId)
  const { data: employee } = useFirestoreDoc<Employee>(COLLECTIONS.EMPLOYEES, action?.employeeId)

  const [busy, setBusy] = useState(false)

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }
  if (!action) {
    return <p className="text-sm text-muted-foreground">Disciplinary action not found.</p>
  }

  const id = action.id

  // Which unsigned parties the current user may sign — mirrors the server's
  // entitledParty check (helpers.ts). Super Admin may sign any remaining party.
  const unsigned = action.acknowledgments.filter((a) => !a.acknowledgedAt).map((a) => a.party)
  function eligibleParties(): AckParty[] {
    if (action!.status !== 'underReview') return []
    if (roleId === 'superAdmin') return unsigned
    const mine: AckParty[] =
      roleId === 'hrManager'
        ? ['hrManager']
        : roleId === 'generalManager'
          ? ['generalManager']
          : roleId === 'outletManager' && profile?.departmentId === action!.departmentId
            ? ['departmentHead']
            : employee && profile?.email === employee.email
              ? ['employee']
              : []
    return mine.filter((p) => unsigned.includes(p))
  }
  const myParties = eligibleParties()

  async function acknowledge(party: AckParty) {
    setBusy(true)
    try {
      const { finalized } = await disciplinaryService.acknowledgeDisciplinaryAction(id, party)
      toast.success(finalized ? 'Acknowledged — action finalized.' : 'Acknowledgment recorded.')
    } catch {
      toast.error('Could not record acknowledgment. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/hr/disciplinary')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{action.employeeName}</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{action.actionNumber}</span> · {DISCIPLINARY_TYPE_LABELS[action.disciplinaryType]}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={DISCIPLINARY_STATUS_VARIANT[action.status]}>{DISCIPLINARY_STATUS_LABELS[action.status]}</Badge>
        <Badge variant="neutral">
          Valid {formatDisciplinaryDate(action.validFrom)} – {formatDisciplinaryDate(action.validUntil)}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incident</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p className="text-foreground">{action.incidentDetails}</p>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Employee Statement</p>
            <p className="text-foreground">{action.employeeStatement || '—'}</p>
          </div>
          {action.proposedSolution && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Proposed Solution</p>
              <p className="text-foreground">{action.proposedSolution}</p>
            </div>
          )}
          {action.companyFurtherAction && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Company Further Action</p>
              <p className="text-foreground">{action.companyFurtherAction}</p>
            </div>
          )}
          {action.employeeFurtherAction && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Employee Further Action</p>
              <p className="text-foreground">{action.employeeFurtherAction}</p>
            </div>
          )}
          {action.nextEscalationLevel && (
            <p className="text-xs text-muted-foreground">
              Suggested next level: {DISCIPLINARY_TYPE_LABELS[action.nextEscalationLevel]}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acknowledgments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {action.acknowledgments.map((ack) => {
            const signedAt = ack.acknowledgedAt
            const signed = !!signedAt
            return (
              <div key={ack.party} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={signed ? 'text-success' : 'text-muted-foreground'}>
                    {signed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                  </span>
                  <p className="text-sm font-medium text-foreground">{ACK_PARTY_LABELS[ack.party]}</p>
                </div>
                {signed ? (
                  <span className="text-xs text-muted-foreground">
                    {signedAt ? formatDisciplinaryDate(signedAt.toDate().toISOString().slice(0, 10)) : 'Signed'}
                  </span>
                ) : myParties.includes(ack.party) ? (
                  <Button type="button" size="sm" disabled={busy} onClick={() => acknowledge(ack.party)}>
                    {busy ? <Spinner className="h-4 w-4" /> : 'Acknowledge'}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Pending</span>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
