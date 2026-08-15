import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardContent, Label, Select, Spinner, Textarea } from '@/components/ui'
import { useToast } from '@/hooks'
import { DISCIPLINARY_TYPE_LABELS, type DisciplinaryType } from '@/constants/hr'
import * as disciplinaryService from '../disciplinaryService'

/** FEATURE_SPECIFICATIONS.md Module 3 — the detail layer behind Employee's disciplinaryType/Start/End fields. */
export function DisciplinaryRecordFormPage() {
  const { employeeId } = useParams<{ employeeId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [type, setType] = useState<DisciplinaryType>('coaching')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = description.trim() !== ''
  const backTo = `/hr/employees/${employeeId}`

  async function handleSubmit() {
    if (!employeeId || !canSubmit) return
    setSubmitting(true)
    try {
      await disciplinaryService.createDisciplinaryRecord({ employeeId, type, description: description.trim() })
      toast.success('Disciplinary record created.')
      navigate(backTo)
    } catch {
      toast.error('Failed to create record. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">New Disciplinary Record</h1>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="disc-type">Type</Label>
            <Select id="disc-type" value={type} onChange={(e) => setType(e.target.value as DisciplinaryType)}>
              {Object.entries(DISCIPLINARY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="disc-description">Description *</Label>
            <Textarea id="disc-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate(backTo)}>
              Cancel
            </Button>
            <Button type="button" disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting ? <Spinner className="h-4 w-4" /> : 'Create'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
