import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardContent, Label, Spinner, Textarea } from '@/components/ui'
import { useToast } from '@/hooks'
import * as contractService from '../contractService'

/** HR.md §9 — Terminate Contract. Only closes this contract row; ending employment stays a separate archiveEmployee action. */
export function ContractTerminatePage() {
  const { employeeId } = useParams<{ employeeId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [terminationReason, setTerminationReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const backTo = `/hr/employees/${employeeId}`
  const canSubmit = terminationReason.trim() !== ''

  async function handleSubmit() {
    if (!employeeId || !canSubmit) return
    setSubmitting(true)
    try {
      await contractService.terminateContract({ employeeId, terminationReason: terminationReason.trim() })
      toast.success('Contract terminated.')
      navigate(backTo)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to terminate contract. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Terminate Contract</h1>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <p className="text-sm text-muted-foreground">
            Closes the employee's current contract record. This does not change their employment status — use Archive
            on the employee profile to end employment.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="termination-reason">Reason *</Label>
            <Textarea
              id="termination-reason"
              value={terminationReason}
              onChange={(e) => setTerminationReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate(backTo)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting ? <Spinner className="h-4 w-4" /> : 'Terminate'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
