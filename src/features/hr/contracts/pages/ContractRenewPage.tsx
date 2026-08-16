import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardContent, Input, Label, Select, Spinner } from '@/components/ui'
import { useToast } from '@/hooks'
import { CONTRACT_TYPE_LABELS, type ContractType } from '@/constants/hr'
import * as contractService from '../contractService'

/** HR.md §9 — Renew/Extend Contract. An "extend" is the same form with the same type and a later end date. */
export function ContractRenewPage() {
  const { employeeId } = useParams<{ employeeId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [contractType, setContractType] = useState<ContractType>('permanent')
  const [contractStartDate, setContractStartDate] = useState('')
  const [contractEndDate, setContractEndDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const backTo = `/hr/employees/${employeeId}`
  const canSubmit = contractStartDate !== '' && (contractType !== 'fixedTerm' || contractEndDate !== '')

  async function handleSubmit() {
    if (!employeeId || !canSubmit) return
    setSubmitting(true)
    try {
      await contractService.renewContract({
        employeeId,
        contractType,
        contractStartDate,
        contractEndDate: contractEndDate || undefined,
      })
      toast.success('Contract renewed.')
      navigate(backTo)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to renew contract. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">Renew Contract</h1>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contract-type">Contract type</Label>
            <Select id="contract-type" value={contractType} onChange={(e) => setContractType(e.target.value as ContractType)}>
              {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contract-start">Start date *</Label>
              <Input
                id="contract-start"
                type="date"
                value={contractStartDate}
                onChange={(e) => setContractStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contract-end">
                End date{contractType === 'fixedTerm' ? ' *' : ''}
              </Label>
              <Input
                id="contract-end"
                type="date"
                value={contractEndDate}
                onChange={(e) => setContractEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate(backTo)}>
              Cancel
            </Button>
            <Button type="button" disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting ? <Spinner className="h-4 w-4" /> : 'Renew'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
