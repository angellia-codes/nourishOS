import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Sprout } from 'lucide-react'
import { Button, Spinner } from '@/components/ui'
import { PermissionGuard } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import { useToast } from '@/hooks'
import * as payrollService from '../payrollService'
import { PayrollComponentForm, PayrollComponentTable } from '../components/registry'
import type { PayrollComponent } from '@/types'
import type { UpsertPayrollComponentInput } from '../payrollService'

/**
 * §4.3 — the discretionary component registry.
 *
 * Inline edit, no modal: there is no Dialog primitive in this codebase, and a
 * routed sub-page for a six-field form would be heavier than the edit it
 * carries. Same shape as the Employee profile's Compensation card.
 */
export function PayrollComponentsPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [components, setComponents] = useState<PayrollComponent[] | null>(null)
  const [editing, setEditing] = useState<PayrollComponent | null | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)

  useEffect(() => {
    return payrollService.subscribeToPayrollComponents(setComponents, () => setComponents([]))
  }, [])

  async function handleSubmit(input: UpsertPayrollComponentInput) {
    setSaving(true)
    try {
      await payrollService.upsertPayrollComponent(input)
      toast.success(editing ? 'Component updated.' : 'Component created.')
      setEditing(undefined)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the component.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSeed() {
    setSeeding(true)
    try {
      const result = await payrollService.seedPayrollComponents()
      toast.success(
        result.created > 0
          ? `Seeded ${result.created} component(s).`
          : 'Nothing to seed — every standard component already exists.',
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not seed the components.')
    } finally {
      setSeeding(false)
    }
  }

  if (components === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/hr/payroll')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Payroll components</h1>
            <p className="text-sm text-muted-foreground">
              What can appear as a line on a payslip, and in which CSV column.
            </p>
          </div>
        </div>
        <PermissionGuard permission={PERMISSIONS.PAYROLL_MANAGE_COMPONENTS}>
          <div className="flex gap-2">
            {components.length === 0 && (
              <Button variant="secondary" onClick={handleSeed} loading={seeding}>
                <Sprout className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Seed standard components
              </Button>
            )}
            <Button onClick={() => setEditing(null)} disabled={editing !== undefined}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              New component
            </Button>
          </div>
        </PermissionGuard>
      </div>

      {editing !== undefined && (
        <PayrollComponentForm
          component={editing}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(undefined)}
          saving={saving}
        />
      )}

      <PayrollComponentTable components={components} onEdit={(component) => setEditing(component)} />
    </div>
  )
}
