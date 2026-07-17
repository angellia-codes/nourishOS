import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select } from '@/components/ui'
import { useToast } from '@/hooks'
import { POSITION_LABELS } from '@/constants/positions'
import { MOCK_CANDIDATES, REQUISITION_DEPARTMENTS, REQUISITION_OUTLETS, type CandidateSource } from './candidatePipelineDemoData'
import { CANDIDATE_SOURCE_LABELS } from './candidatePipelineFormat'

/**
 * Read-only-except-for-the-form visual preview of "Add a New Candidate" —
 * HR_OPERATIONS.md E04-US01. Mock data, no Firestore/Cloud Function calls.
 * Reproduces the duplicate-phone warning client-side against the mock
 * roster; candidate ID generation (C-[YEAR]-[SEQ]) stays server-side in the
 * real flow, so the demo just states that rather than faking a number.
 */
export function CandidateFormDemoPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [positionApplied, setPositionApplied] = useState(Object.values(POSITION_LABELS)[0])
  const [outletId, setOutletId] = useState(REQUISITION_OUTLETS[0].id)
  const [departmentId, setDepartmentId] = useState(REQUISITION_DEPARTMENTS[0].id)
  const [source, setSource] = useState<CandidateSource>('jobPortal')

  const duplicatePhone = useMemo(
    () => (phone.trim() ? MOCK_CANDIDATES.find((c) => c.phone === phone.trim()) : undefined),
    [phone],
  )

  const isValid = fullName.trim().length > 0 && phone.trim().length > 0 && positionApplied.trim().length > 0

  function handleSubmit() {
    if (!isValid) return
    toast.success(
      `Candidate submitted (demo) — candidate ID is generated server-side (C-[YEAR]-[SEQ]) in the real flow; nothing was written to a backend.`,
    )
    navigate('/demo/hr/pipeline')
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. Submitting shows a toast and returns to the board; nothing is persisted.
      </div>

      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/demo/hr/pipeline')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Add Candidate</h1>
            <p className="text-sm text-muted-foreground">New candidates enter the pipeline at Applied (ST-01).</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Candidate Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+62 812-0000-0000" />
              {duplicatePhone && (
                <p className="flex items-center gap-1.5 text-xs text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  This phone number matches an existing candidate: {duplicatePhone.fullName} ({duplicatePhone.candidateNumber}).
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="positionApplied">Position Applied *</Label>
              <Select id="positionApplied" value={positionApplied} onChange={(e) => setPositionApplied(e.target.value)}>
                {Object.values(POSITION_LABELS).map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="outlet">Outlet *</Label>
                <Select id="outlet" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
                  {REQUISITION_OUTLETS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="department">Department *</Label>
                <Select id="department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                  {REQUISITION_DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="source">Source *</Label>
              <Select id="source" value={source} onChange={(e) => setSource(e.target.value as CandidateSource)}>
                {Object.entries(CANDIDATE_SOURCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/demo/hr/pipeline')}>
            Cancel
          </Button>
          <Button type="button" disabled={!isValid} onClick={handleSubmit}>
            Add Candidate
          </Button>
        </div>
      </div>
    </div>
  )
}
