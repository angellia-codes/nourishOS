import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { useToast } from '@/hooks'
import * as employeeService from '@/features/hr/services/employeeService'
import type { DisciplinaryAction, DisciplinaryType, Employee } from '@/types'
import * as disciplinaryService from '../disciplinaryService'
import { DISCIPLINARY_TYPE_LABELS, formatDisciplinaryDate } from '../disciplinaryFormat'

const TYPE_OPTIONS = Object.entries(DISCIPLINARY_TYPE_LABELS) as [DisciplinaryType, string][]

/** Mirrors the server's validity rule (§1/AC-2): +3mo coaching/verbal, +6mo SP1–3/suspension. */
function previewValidUntil(type: DisciplinaryType): string {
  const months = type === 'coaching' || type === 'verbalWarning' ? 3 : 6
  const date = new Date()
  date.setMonth(date.getMonth() + months)
  return date.toISOString().slice(0, 10)
}

/**
 * New Disciplinary Action — employee-disciplinary-action.md §3. Outlet/department
 * are taken server-side from the subject employee. One-shot: create draft →
 * submit for acknowledgment (the four parties then sign on the Detail page).
 * The employee's own statement is mandatory to submit (AC-1).
 */
export function DisciplinaryFormPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [employees, setEmployees] = useState<Employee[] | null>(null)
  const [employeeId, setEmployeeId] = useState('')
  const [disciplinaryType, setDisciplinaryType] = useState<DisciplinaryType>('coaching')
  const [incidentDetails, setIncidentDetails] = useState('')
  const [employeeStatement, setEmployeeStatement] = useState('')
  const [proposedSolution, setProposedSolution] = useState('')
  const [companyFurtherAction, setCompanyFurtherAction] = useState('')
  const [employeeFurtherAction, setEmployeeFurtherAction] = useState('')

  const [activeRecord, setActiveRecord] = useState<DisciplinaryAction | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    return employeeService.subscribeToEmployees(setEmployees)
  }, [])

  // AC-6 — surface the employee's current unexpired record so HR knows whether
  // this continues an existing ladder or starts fresh.
  useEffect(() => {
    if (!employeeId) {
      setActiveRecord(null)
      return
    }
    let cancelled = false
    disciplinaryService.getActiveDisciplinaryLevel(employeeId).then((r) => {
      if (!cancelled) setActiveRecord(r)
    })
    return () => {
      cancelled = true
    }
  }, [employeeId])

  const validUntil = useMemo(() => previewValidUntil(disciplinaryType), [disciplinaryType])

  const isValid =
    employeeId !== '' && incidentDetails.trim() !== '' && employeeStatement.trim() !== ''

  async function handleSubmit() {
    if (!isValid) return
    setSubmitting(true)
    try {
      const { actionId, actionNumber } = await disciplinaryService.createDisciplinaryAction({
        employeeId,
        incidentDetails,
        disciplinaryType,
        employeeStatement,
        proposedSolution: proposedSolution.trim() || undefined,
        companyFurtherAction: companyFurtherAction.trim() || undefined,
        employeeFurtherAction: employeeFurtherAction.trim() || undefined,
      })
      await disciplinaryService.submitDisciplinaryAction(actionId)
      toast.success(`${actionNumber} submitted for acknowledgment.`)
      navigate('/hr/disciplinary')
    } catch {
      toast.error('Failed to submit disciplinary action. A draft may have been saved — check the list.')
    } finally {
      setSubmitting(false)
    }
  }

  if (employees === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/hr/disciplinary')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">New Disciplinary Action</h1>
          <p className="text-sm text-muted-foreground">Draft → Under Review → Finalized (all four parties acknowledge)</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subject & Type</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="employee">Employee *</Label>
            <Select id="employee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} · {emp.employeeNumber}
                </option>
              ))}
            </Select>
            {activeRecord && (
              <p className="text-xs text-warning">
                Active record: {DISCIPLINARY_TYPE_LABELS[activeRecord.disciplinaryType]} (valid until{' '}
                {formatDisciplinaryDate(activeRecord.validUntil)})
                {activeRecord.nextEscalationLevel && ` — suggested next: ${DISCIPLINARY_TYPE_LABELS[activeRecord.nextEscalationLevel]}`}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type">Disciplinary Level *</Label>
            <Select id="type" value={disciplinaryType} onChange={(e) => setDisciplinaryType(e.target.value as DisciplinaryType)}>
              {TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              Validity if finalized today: through <Badge variant="neutral">{formatDisciplinaryDate(validUntil)}</Badge>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Incident & Statements</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incident">Incident Details *</Label>
            <Textarea id="incident" className="min-h-[80px]" placeholder="Dates/times, Code of Conduct reference — be specific" value={incidentDetails} onChange={(e) => setIncidentDetails(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="statement">Employee Statement * (WAJIB DIISI)</Label>
            <Textarea id="statement" className="min-h-[70px]" placeholder="The employee's own account" value={employeeStatement} onChange={(e) => setEmployeeStatement(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="solution">Proposed Solution</Label>
            <Textarea id="solution" value={proposedSolution} onChange={(e) => setProposedSolution(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="companyAction">Company Further Action</Label>
              <Textarea id="companyAction" value={companyFurtherAction} onChange={(e) => setCompanyFurtherAction(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employeeAction">Employee Further Action</Label>
              <Textarea id="employeeAction" value={employeeFurtherAction} onChange={(e) => setEmployeeFurtherAction(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => navigate('/hr/disciplinary')} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" disabled={!isValid || submitting} onClick={handleSubmit}>
          {submitting ? <Spinner className="h-4 w-4" /> : 'Submit for Acknowledgment'}
        </Button>
      </div>
    </div>
  )
}
