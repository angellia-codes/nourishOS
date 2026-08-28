import { Badge, Button } from '@/components/ui'
import { ReportTable, type ReportTableColumn } from '@/components/shared'
import { STATUTORY_COMPONENTS } from '@/constants/payroll'
import type { PayrollComponent } from '@/types'

/**
 * §4.3 — the discretionary registry, plus the code-owned statutory rows shown
 * read-only beside it.
 *
 * Decision 2: statutory components are not editable at runtime. Listing them
 * here anyway is deliberate — the registry page is where someone goes to ask
 * "what can appear on a slip", and answering with only half the catalogue
 * would invite someone to re-create JHT as a discretionary component.
 */
export function PayrollComponentTable({
  components,
  onEdit,
}: {
  components: PayrollComponent[]
  onEdit?: (component: PayrollComponent) => void
}) {
  const columns: ReportTableColumn<PayrollComponent>[] = [
    { header: 'Code', value: (c) => <span className="font-mono text-xs">{c.code}</span> },
    { header: 'Label (EN)', value: (c) => c.labelEn },
    { header: 'Label (ID)', value: (c) => c.labelId },
    { header: 'Type', value: (c) => (c.type === 'earning' ? 'Earning' : 'Deduction') },
    { header: 'Order', value: (c) => String(c.sortOrder), align: 'right' },
    {
      header: 'Status',
      value: (c) => <Badge variant={c.isActive ? 'success' : 'neutral'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    ...(onEdit
      ? [
          {
            header: '',
            value: (c: PayrollComponent) => (
              <Button variant="ghost" size="sm" onClick={() => onEdit(c)}>
                Edit
              </Button>
            ),
            align: 'right' as const,
          },
        ]
      : []),
  ]

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Discretionary components</h2>
        <p className="text-sm text-muted-foreground">
          Editable. Deactivating one hides it from future imports; it is never deleted, because historical payslips
          reference it.
        </p>
        <ReportTable columns={columns} rows={components} rowKey={(c) => c.id} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Statutory components</h2>
        <p className="text-sm text-muted-foreground">
          Owned by code, not editable here — their rates and bases are law. The five marked{' '}
          <em>employer contribution</em> print on both sides of the slip and net to zero.
        </p>
        <ReportTable columns={STATUTORY_COLUMNS} rows={STATUTORY_ROWS} rowKey={(row) => row.id} />
      </section>
    </div>
  )
}

interface StatutoryRow {
  id: string
  label: string
  side: string
  rateKey: string
  baseKey: string
}

const STATUTORY_ROWS: StatutoryRow[] = Object.entries(STATUTORY_COMPONENTS)
  .sort((a, b) => a[1].sortOrder - b[1].sortOrder)
  .map(([id, component]) => ({
    id,
    label: component.label,
    side:
      component.side === 'both'
        ? 'Employer contribution (both sides)'
        : component.side === 'income'
          ? 'Income'
          : 'Deduction',
    // PPh 21 is CSV-supplied and not recomputable until a tax engine exists (§4.1).
    rateKey: component.rateKey ?? 'CSV-supplied',
    baseKey: component.baseKey ?? '—',
  }))

const STATUTORY_COLUMNS: ReportTableColumn<StatutoryRow>[] = [
  { header: 'Code', value: (r) => <span className="font-mono text-xs">{r.id}</span> },
  { header: 'Label', value: (r) => r.label },
  { header: 'Prints as', value: (r) => r.side },
  { header: 'Rate', value: (r) => <span className="font-mono text-xs">{r.rateKey}</span> },
  { header: 'Base', value: (r) => <span className="font-mono text-xs">{r.baseKey}</span> },
]
