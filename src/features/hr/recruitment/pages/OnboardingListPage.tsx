import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCheck, Clock, Lock } from 'lucide-react'
import { Button, Card, CardContent, Spinner, StatusPill } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import * as recruitmentService from '../recruitmentService'
import type { OnboardingChecklist } from '@/types'

/** How many required documents are still outstanding — the same rule the server closes on. */
function outstandingMandatory(checklist: OnboardingChecklist): number {
  return checklist.documentChecklist.filter((item) => item.tier === 'mandatory' && item.status === 'pending').length
}

/**
 * Open onboarding checklists — one per hire, created automatically when a
 * candidate reaches Hired.
 */
export function OnboardingListPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<OnboardingChecklist[] | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    return recruitmentService.subscribeToOnboardingChecklists(
      (next) => {
        setDenied(false)
        setRows(next)
      },
      () => {
        setDenied(true)
        setRows([])
      },
    )
  }, [])

  if (rows === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (denied) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Access restricted"
          description="Onboarding checklists are limited to HR and above."
        />
      </div>
    )
  }

  const open = rows.filter((row) => row.status !== 'completed')

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Onboarding</h1>
        <p className="text-sm text-muted-foreground">
          {open.length} in progress · {rows.length - open.length} complete
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Nobody onboarding"
          description="A checklist is created automatically when a candidate is marked Hired."
        />
      ) : (
        rows.map((row) => {
          const outstanding = outstandingMandatory(row)
          return (
            <Card key={row.id} className="cursor-pointer" onClick={() => navigate(`/hr/onboarding/${row.id}`)}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{row.candidateName}</p>
                  <p className="text-sm text-muted-foreground">
                    {row.joinDate ? `Joins ${row.joinDate}` : 'No join date'} ·{' '}
                    {row.employeeId ? 'Employee record created' : 'No employee record yet'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {row.status === 'completed' ? (
                    <StatusPill tone="closed" icon={CheckCheck} label="Complete" />
                  ) : (
                    <StatusPill
                      tone={outstanding === 0 ? 'success' : 'warning'}
                      icon={Clock}
                      label={outstanding === 0 ? 'Ready to close' : `${outstanding} required outstanding`}
                    />
                  )}
                  <Button variant="secondary" onClick={() => navigate(`/hr/onboarding/${row.id}`)}>
                    Open
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
