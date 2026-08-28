import { useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Input, Label, Select } from '@/components/ui'
import type { PayrollComponent } from '@/types'
import type { UpsertPayrollComponentInput } from '../../payrollService'

/**
 * §4.3 — create or edit one discretionary component.
 *
 * `code` is the document id and the CSV column, so it is immutable once the
 * component exists: changing it would orphan every payslip line that
 * references it and silently break the import contract.
 */
export function PayrollComponentForm({
  component,
  onSubmit,
  onCancel,
  saving,
}: {
  component: PayrollComponent | null
  onSubmit: (input: UpsertPayrollComponentInput) => void
  onCancel: () => void
  saving: boolean
}) {
  const isEdit = component !== null

  const [code, setCode] = useState(component?.code ?? '')
  const [labelEn, setLabelEn] = useState(component?.labelEn ?? '')
  const [labelId, setLabelId] = useState(component?.labelId ?? '')
  const [type, setType] = useState<'earning' | 'deduction'>(component?.type ?? 'earning')
  const [sortOrder, setSortOrder] = useState(String(component?.sortOrder ?? 1))
  const [isActive, setIsActive] = useState(component?.isActive ?? true)
  const [isTaxable, setIsTaxable] = useState(component?.isTaxable ?? true)

  const parsedOrder = Number(sortOrder)
  const canSubmit =
    code.trim().length > 0 &&
    labelEn.trim().length > 0 &&
    labelId.trim().length > 0 &&
    Number.isInteger(parsedOrder) &&
    parsedOrder >= 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? `Edit ${component.code}` : 'New component'}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="component-code">Code</Label>
            <Input
              id="component-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="MEAL_ALLOWANCE"
              disabled={isEdit}
              className="font-mono"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {isEdit
                ? 'Immutable — it is the CSV column and the reference every payslip line holds.'
                : 'Uppercase letters, digits and underscores. This becomes the CSV column name.'}
            </p>
          </div>

          <div>
            <Label htmlFor="component-order">Sort order</Label>
            <Input
              id="component-order"
              type="number"
              min={1}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">Position within its own column on the slip.</p>
          </div>

          <div>
            <Label htmlFor="component-label-en">Label (English)</Label>
            <Input id="component-label-en" value={labelEn} onChange={(e) => setLabelEn(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="component-label-id">Label (Indonesian)</Label>
            <Input id="component-label-id" value={labelId} onChange={(e) => setLabelId(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">
              Stored on every line so the slip can be rendered in either language with no migration (§10).
            </p>
          </div>

          <div>
            <Label htmlFor="component-type">Type</Label>
            <Select
              id="component-type"
              value={type}
              onChange={(e) => setType(e.target.value as 'earning' | 'deduction')}
            >
              <option value="earning">Earning</option>
              <option value="deduction">Deduction</option>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active
            </label>
            <p className="ml-7 text-xs text-muted-foreground">
              Deactivating removes it from future imports. Components are never deleted — historical payslips
              reference them.
            </p>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox checked={isTaxable} onChange={(e) => setIsTaxable(e.target.checked)} />
              Taxable
            </label>
            <p className="ml-7 text-xs text-muted-foreground">
              Reserved for the future PPh 21 engine — not read anywhere today (§4.3).
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSubmit({
                code: code.trim(),
                labelId: labelId.trim(),
                labelEn: labelEn.trim(),
                type,
                sortOrder: parsedOrder,
                isActive,
                isTaxable,
              })
            }
            loading={saving}
            disabled={!canSubmit}
          >
            {isEdit ? 'Save changes' : 'Create component'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
