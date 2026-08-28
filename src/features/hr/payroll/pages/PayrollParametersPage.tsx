import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Save } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Spinner } from '@/components/ui'
import { PAYROLL_PARAMETER_DEFAULTS } from '@/constants/payroll'
import { useToast } from '@/hooks'
import * as payrollService from '../payrollService'
import type { UpsertPayrollParametersInput } from '../payrollService'

const RATE_FIELDS: { key: keyof typeof PAYROLL_PARAMETER_DEFAULTS; label: string; hint: string }[] = [
  { key: 'jkk', label: 'Jaminan Kecelakaan Kerja (company)', hint: 'Varies by industry risk class — see below' },
  { key: 'jkm', label: 'Jaminan Kematian (company)', hint: 'Of basic salary' },
  { key: 'jhtCompany', label: 'Jaminan Hari Tua (company)', hint: 'Of basic salary' },
  { key: 'jhtEmployee', label: 'Jaminan Hari Tua (employee)', hint: 'Of basic salary' },
  { key: 'jpCompany', label: 'Jaminan Pensiun (company)', hint: 'Of the capped base, not basic salary' },
  { key: 'jpEmployee', label: 'Jaminan Pensiun (employee)', hint: 'Of the capped base, not basic salary' },
  { key: 'bpjsKesCo', label: 'BPJS Kesehatan (company)', hint: 'Of the capped base' },
  { key: 'bpjsKesEmp', label: 'BPJS Kesehatan (employee)', hint: 'Of the capped base' },
  { key: 'bpjsKesFam', label: 'BPJS Kesehatan (family)', hint: 'Of the capped base' },
]

const CEILING_FIELDS: { key: keyof typeof PAYROLL_PARAMETER_DEFAULTS; label: string; hint: string }[] = [
  { key: 'jpWageCeiling', label: 'Jaminan Pensiun wage ceiling', hint: 'Changes annually — never hardcode it' },
  { key: 'bpjsKesCeiling', label: 'BPJS Kesehatan wage ceiling', hint: 'Upper bound on the Kesehatan base' },
]

type FormState = Record<string, string>

function toFormState(values: Record<string, number>): FormState {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value)]))
}

/**
 * §4.2 — the annual statutory parameters, one document per calendar year.
 *
 * Super Admin only. These are what §6.4's recompute checks every imported row
 * against, so an incorrect rate here silently blesses an incorrect payroll:
 * this is the narrowest gate in the module, which is why nothing seeds it
 * automatically and the defaults below are form values only.
 */
export function PayrollParametersPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [year, setYear] = useState(() => new Date().getFullYear())
  const [values, setValues] = useState<FormState>(() => toFormState(PAYROLL_PARAMETER_DEFAULTS))
  const [effectiveFrom, setEffectiveFrom] = useState(`${new Date().getFullYear()}-01-01`)
  const [loading, setLoading] = useState(true)
  const [existing, setExisting] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    payrollService
      .getPayrollParameters(year)
      .then((parameters) => {
        if (cancelled) return
        if (parameters) {
          setExisting(true)
          setValues(
            toFormState({
              jkk: parameters.jkk,
              jkm: parameters.jkm,
              jhtCompany: parameters.jhtCompany,
              jhtEmployee: parameters.jhtEmployee,
              jpCompany: parameters.jpCompany,
              jpEmployee: parameters.jpEmployee,
              bpjsKesCo: parameters.bpjsKesCo,
              bpjsKesEmp: parameters.bpjsKesEmp,
              bpjsKesFam: parameters.bpjsKesFam,
              jpWageCeiling: parameters.jpWageCeiling,
              bpjsKesCeiling: parameters.bpjsKesCeiling,
            }),
          )
          setEffectiveFrom(parameters.effectiveFrom)
        } else {
          // A year with nothing on file starts from the documented defaults,
          // which still have to be confirmed and saved by hand.
          setExisting(false)
          setValues(toFormState(PAYROLL_PARAMETER_DEFAULTS))
          setEffectiveFrom(`${year}-01-01`)
        }
      })
      .catch(() => {
        if (!cancelled) setExisting(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [year])

  async function handleSave() {
    setSaving(true)
    try {
      const numeric = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value)]))
      await payrollService.upsertPayrollParameters({
        year,
        effectiveFrom,
        ...numeric,
      } as UpsertPayrollParametersInput)
      setExisting(true)
      toast.success(`Payroll parameters for ${year} saved.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the parameters.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/hr/payroll')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Payroll parameters</h1>
          <p className="text-sm text-muted-foreground">
            BPJS rates and wage ceilings, versioned by year. Every import is checked against these.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Year</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="max-w-32">
            <Label htmlFor="parameters-year">Calendar year</Label>
            <Input
              id="parameters-year"
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
          <div className="max-w-48">
            <Label htmlFor="parameters-effective">Effective from</Label>
            <Input
              id="parameters-effective"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading…' : existing ? 'On file — editing replaces the saved values.' : 'Nothing on file yet.'}
          </p>
        </CardContent>
      </Card>

      {/* §14 open item 4 — surfaced rather than silently assumed. */}
      <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
        <span>
          The JKK rate corresponds to a specific industry risk class. Confirm it against the BPJS registration before
          saving. If Nourish Group's entities carry different classifications, JKK becomes a per-entity parameter —
          which is a schema change, not a value change.
        </span>
      </p>

      {loading ? (
        <div className="flex justify-center p-12">
          <Spinner />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Contribution rates</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {RATE_FIELDS.map((field) => (
                <NumberField
                  key={field.key}
                  id={field.key}
                  label={field.label}
                  hint={`${field.hint} · ${formatAsPercent(values[field.key])}`}
                  step="0.0001"
                  value={values[field.key] ?? ''}
                  onChange={(next) => setValues((prev) => ({ ...prev, [field.key]: next }))}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Wage ceilings</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {CEILING_FIELDS.map((field) => (
                <NumberField
                  key={field.key}
                  id={field.key}
                  label={field.label}
                  hint={field.hint}
                  step="1"
                  value={values[field.key] ?? ''}
                  onChange={(next) => setValues((prev) => ({ ...prev, [field.key]: next }))}
                />
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} loading={saving}>
              <Save className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Save {year} parameters
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function NumberField({
  id,
  label,
  hint,
  step,
  value,
  onChange,
}: {
  id: string
  label: string
  hint: string
  step: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" step={step} min={0} value={value} onChange={(e) => onChange(e.target.value)} />
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

/** A rate is entered as a fraction; showing the percentage catches a slipped decimal. */
function formatAsPercent(raw: string | undefined): string {
  const value = Number(raw)
  if (!raw || Number.isNaN(value)) return '—'
  return `${(value * 100).toFixed(2)}%`
}
