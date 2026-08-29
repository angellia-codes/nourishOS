import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Upload } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { EmptyState, ReportTable, type ReportTableColumn } from '@/components/shared'
import { OUTLETS, DEPARTMENTS, OUTLET_DEPARTMENTS, optionsFor, type OrgOption } from '@/constants'
import {
  GENDERS,
  EMPLOYMENT_STATUS,
  EMPLOYMENT_STATUS_LABELS,
  CONTRACT_TYPE,
  CONTRACT_TYPE_LABELS,
  RELIGION,
  RELIGION_LABELS,
  DISCIPLINARY_TYPE,
  DISCIPLINARY_TYPE_LABELS,
  type Gender,
  type EmploymentStatus,
  type ContractType,
  type Religion,
  type DisciplinaryType,
} from '@/constants/hr'
import { POSITION_LABELS, positionsFor, type PositionId } from '@/constants/positions'
import { useToast } from '@/hooks'
import * as employeeService from '@/features/hr/services/employeeService'
import { toCsv, downloadCsv, parseCsv, type CsvColumn } from '@/utils/csv'
import type { Employee } from '@/types'
import type {
  ImportEmployeeRow,
  ImportEmployeeRowResult,
  UpdateEmployeeCompensationInput,
} from '@/features/hr/services/employeeService'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const TEMPLATE_HEADERS = [
  'Full Name',
  'Gender',
  'Birth Date',
  'National ID',
  'Tax Number',
  'Religion',
  'Phone',
  'Email',
  'Address',
  'Permanent Address',
  'Domicile Address',
  'Emergency Contact Name',
  'Emergency Contact Phone',
  'Position',
  'Department',
  'Outlet',
  'Manager Employee Number',
  'Employment Status',
  'Join Date',
  'Probation Months',
  'Contract Type',
  'Contract Start Date',
  'Contract End Date',
  'Mother Name',
  'Disciplinary Action',
  'Disciplinary Period Start',
  'Disciplinary Period End',
  'Recognition',
  'Recognition Period',
  'Basic Salary',
  'Position Allowance',
  'Phone Allowance',
  'Transportation Allowance',
  'Bank Account Name',
  'Bank Account Number',
] as const

const TEMPLATE_EXAMPLE: Record<string, string> = {
  'Full Name': 'Jane Doe',
  Gender: 'Female',
  'Birth Date': '1995-04-12',
  'National ID': '',
  'Tax Number': '',
  Religion: '',
  Phone: '62812345678',
  Email: 'jane.doe@example.com',
  Address: '',
  'Permanent Address': '',
  'Domicile Address': '',
  'Emergency Contact Name': '',
  'Emergency Contact Phone': '',
  Position: POSITION_LABELS.barista,
  Department: 'Kitchen',
  Outlet: 'Nourish Berawa',
  'Manager Employee Number': '',
  'Employment Status': EMPLOYMENT_STATUS_LABELS.PKWT,
  'Join Date': '2026-08-01',
  'Probation Months': '3',
  'Contract Type': CONTRACT_TYPE_LABELS.fixedTerm,
  'Contract Start Date': '2026-08-01',
  'Contract End Date': '2027-08-01',
  'Mother Name': '',
  'Disciplinary Action': '',
  'Disciplinary Period Start': '',
  'Disciplinary Period End': '',
  Recognition: '',
  'Recognition Period': '',
  'Basic Salary': '5000000',
  'Position Allowance': '',
  'Phone Allowance': '',
  'Transportation Allowance': '',
  'Bank Account Name': 'Jane Doe',
  'Bank Account Number': '1234567890',
}

const TEMPLATE_COLUMNS: CsvColumn<Record<string, string>>[] = TEMPLATE_HEADERS.map((header) => ({
  header,
  value: (row) => row[header] ?? '',
}))

function findOrgOption(raw: string, options: OrgOption[]): string | null {
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return null
  const match = options.find((o) => o.id.toLowerCase() === trimmed || o.name.toLowerCase() === trimmed)
  return match?.id ?? null
}

function resolveEnum<T extends string>(raw: string, values: readonly T[], labels: Record<T, string>): T | null {
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return null
  return values.find((v) => v.toLowerCase() === trimmed || labels[v].toLowerCase() === trimmed) ?? null
}

interface ParsedRow {
  index: number
  raw: Record<string, string>
  input: ImportEmployeeRow | null
  clientErrors: string[]
}

function parseOptionalNonNegativeNumber(raw: string, field: string, errors: string[]): number | undefined {
  if (!raw) return undefined
  const n = Number(raw)
  if (Number.isNaN(n) || n < 0) {
    errors.push(`${field} must be a non-negative number`)
    return undefined
  }
  return n
}

function buildRow(raw: Record<string, string>, index: number, employeeIdByNumber: Map<string, string>): ParsedRow {
  const errors: string[] = []
  const get = (header: string) => (raw[header] ?? '').trim()

  const fullName = get('Full Name')
  if (!fullName) errors.push('Full Name is required')

  const gender = resolveEnum(get('Gender'), Object.values(GENDERS) as Gender[], { male: 'Male', female: 'Female' })
  if (!gender) errors.push('Gender must be Male or Female')

  const birthDate = get('Birth Date')
  if (!ISO_DATE_RE.test(birthDate)) errors.push('Birth Date must be YYYY-MM-DD')

  const phone = get('Phone')
  if (!phone) errors.push('Phone is required')

  const email = get('Email')
  if (!email) errors.push('Email is required')

  const outletId = findOrgOption(get('Outlet'), [...OUTLETS])
  if (!outletId) errors.push('Outlet not recognized')
  const departmentId = outletId ? findOrgOption(get('Department'), optionsFor(OUTLET_DEPARTMENTS[outletId] ?? [], DEPARTMENTS)) : null
  if (outletId && !departmentId) errors.push('Department not recognized for this outlet')

  // Position is scoped to department + outlet (POSITIONS.md §3 catalog) —
  // resolved after both so the allow-list is known.
  const positionRaw = get('Position')
  const positionIds = departmentId && outletId ? positionsFor(outletId, departmentId) : []
  const position = departmentId && outletId ? resolveEnum(positionRaw, positionIds as PositionId[], POSITION_LABELS) : null
  if (!positionRaw) errors.push('Position is required')
  else if (departmentId && outletId && !position) errors.push('Position not recognized for this department and outlet')

  const employmentStatus = resolveEnum(
    get('Employment Status'),
    Object.values(EMPLOYMENT_STATUS) as EmploymentStatus[],
    EMPLOYMENT_STATUS_LABELS,
  )
  if (!employmentStatus) errors.push('Employment Status not recognized')

  const joinDate = get('Join Date')
  if (!ISO_DATE_RE.test(joinDate)) errors.push('Join Date must be YYYY-MM-DD')

  const contractType = resolveEnum(get('Contract Type'), Object.values(CONTRACT_TYPE) as ContractType[], CONTRACT_TYPE_LABELS)
  if (!contractType) errors.push('Contract Type not recognized')

  // Optional — unlike the other resolveEnum calls above, a blank cell is fine,
  // but a non-blank cell that doesn't match the enum is still an error.
  const religionRaw = get('Religion')
  const religion = religionRaw ? resolveEnum(religionRaw, Object.values(RELIGION) as Religion[], RELIGION_LABELS) : null
  if (religionRaw && !religion) errors.push('Religion not recognized')

  const managerNumber = get('Manager Employee Number')
  const managerId = managerNumber ? employeeIdByNumber.get(managerNumber) : undefined
  if (managerNumber && !managerId) errors.push('Manager Employee Number not found')

  const disciplinaryTypeRaw = get('Disciplinary Action')
  const disciplinaryType = disciplinaryTypeRaw
    ? resolveEnum(disciplinaryTypeRaw, Object.values(DISCIPLINARY_TYPE) as DisciplinaryType[], DISCIPLINARY_TYPE_LABELS)
    : null
  if (disciplinaryTypeRaw && !disciplinaryType) errors.push('Disciplinary Action not recognized')

  const disciplinaryStartPeriod = get('Disciplinary Period Start')
  if (disciplinaryStartPeriod && !ISO_DATE_RE.test(disciplinaryStartPeriod)) {
    errors.push('Disciplinary Period Start must be YYYY-MM-DD')
  }

  const disciplinaryEndPeriod = get('Disciplinary Period End')
  if (disciplinaryEndPeriod && !ISO_DATE_RE.test(disciplinaryEndPeriod)) {
    errors.push('Disciplinary Period End must be YYYY-MM-DD')
  }

  const recognitionPeriod = get('Recognition Period')
  if (recognitionPeriod && !ISO_DATE_RE.test(recognitionPeriod)) errors.push('Recognition Period must be YYYY-MM-DD')

  // Basic Salary is the anchor: a blank cell means "no compensation for this
  // row" and the other 5 compensation cells are ignored entirely, matching
  // updateEmployeeCompensation's own contract (basicSalary is its one
  // required field) — never write a doc with every field null.
  const basicSalaryRaw = get('Basic Salary')
  let compensation: UpdateEmployeeCompensationInput | undefined
  if (basicSalaryRaw) {
    const basicSalary = parseOptionalNonNegativeNumber(basicSalaryRaw, 'Basic Salary', errors)
    const positionAllowance = parseOptionalNonNegativeNumber(get('Position Allowance'), 'Position Allowance', errors)
    const phoneAllowance = parseOptionalNonNegativeNumber(get('Phone Allowance'), 'Phone Allowance', errors)
    const transportationAllowance = parseOptionalNonNegativeNumber(
      get('Transportation Allowance'),
      'Transportation Allowance',
      errors,
    )
    if (basicSalary !== undefined) {
      compensation = {
        basicSalary,
        positionAllowance,
        phoneAllowance,
        transportationAllowance,
        bankAccountName: get('Bank Account Name') || undefined,
        bankAccountNumber: get('Bank Account Number') || undefined,
      }
    }
  }

  if (!gender || !outletId || !departmentId || !position || !employmentStatus || !contractType || errors.length > 0) {
    return { index, raw, input: null, clientErrors: errors }
  }

  return {
    index,
    raw,
    clientErrors: [],
    input: {
      employee: {
        fullName,
        gender,
        birthDate,
        nationalId: get('National ID') || undefined,
        taxNumber: get('Tax Number') || undefined,
        religion: religion ?? undefined,
        phone,
        email,
        address: get('Address') || undefined,
        permanentAddress: get('Permanent Address') || undefined,
        domicileAddress: get('Domicile Address') || undefined,
        emergencyContactName: get('Emergency Contact Name') || undefined,
        emergencyContactPhone: get('Emergency Contact Phone') || undefined,
        motherName: get('Mother Name') || undefined,
        position,
        departmentId,
        outletId,
        managerId,
        employmentStatus,
        joinDate,
        probationMonths: Number(get('Probation Months')) || 0,
        contractType,
        contractStartDate: get('Contract Start Date') || undefined,
        contractEndDate: get('Contract End Date') || undefined,
        disciplinaryType: disciplinaryType ?? undefined,
        disciplinaryStartPeriod: disciplinaryStartPeriod || undefined,
        disciplinaryEndPeriod: disciplinaryEndPeriod || undefined,
        recognitionType: get('Recognition') || undefined,
        recognitionPeriod: recognitionPeriod || undefined,
      },
      compensation,
    },
  }
}

interface DisplayRow {
  index: number
  fullName: string
  status: 'ready' | 'error' | 'success' | 'failed'
  message: string
}

const STATUS_LABEL: Record<DisplayRow['status'], string> = {
  ready: 'Ready',
  error: 'Fix and re-upload',
  success: 'Created',
  failed: 'Failed',
}

const COLUMNS: ReportTableColumn<DisplayRow>[] = [
  { header: 'Row', value: (r) => String(r.index + 2) },
  { header: 'Name', value: (r) => r.fullName },
  { header: 'Status', value: (r) => STATUS_LABEL[r.status] },
  { header: 'Detail', value: (r) => r.message },
]

/** hr.md §5 / HR_OPERATIONS.md §9.1-F12 — bulk-create employees from a CSV template. */
export function EmployeeImportPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [employees, setEmployees] = useState<Employee[] | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null)
  const [results, setResults] = useState<ImportEmployeeRowResult[] | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => employeeService.subscribeToEmployees(setEmployees), [])

  const employeeIdByNumber = useMemo(
    () => new Map((employees ?? []).map((e) => [e.employeeNumber, e.id])),
    [employees],
  )

  function downloadTemplate() {
    downloadCsv(toCsv([TEMPLATE_EXAMPLE], TEMPLATE_COLUMNS), 'employee-import-template.csv')
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const text = await file.text()
    const rows = parseCsv(text)
    setParsedRows(rows.map((row, index) => buildRow(row, index, employeeIdByNumber)))
    setResults(null)
  }

  const validRows = useMemo(() => (parsedRows ?? []).filter((r) => r.input !== null), [parsedRows])

  async function handleSubmit() {
    if (validRows.length === 0 || submitting) return
    setSubmitting(true)
    try {
      const response = await employeeService.importEmployees(validRows.map((r) => r.input!))
      setResults(response.results)
      const succeeded = response.results.filter((r) => r.success).length
      if (succeeded === response.results.length) {
        toast.success(`Imported ${succeeded} of ${response.results.length} employees.`)
      } else {
        toast.warning(`Imported ${succeeded} of ${response.results.length} employees — see failed rows below.`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed.')
    } finally {
      setSubmitting(false)
    }
  }

  function downloadFailedRows() {
    if (!results) return
    const failed = results.filter((r) => !r.success)
    if (failed.length === 0) return
    const rows = failed.map((r) => ({ ...validRows[r.index].raw, Error: r.error ?? '' }))
    const columns: CsvColumn<Record<string, string>>[] = [...TEMPLATE_COLUMNS, { header: 'Error', value: (row) => row.Error ?? '' }]
    downloadCsv(toCsv(rows, columns), 'employee-import-failed-rows.csv')
  }

  const displayRows: DisplayRow[] = (parsedRows ?? []).map((row) => {
    const fullName = row.raw['Full Name'] || `Row ${row.index + 2}`
    if (row.input === null) {
      return { index: row.index, fullName, status: 'error', message: row.clientErrors.join('; ') }
    }
    if (results) {
      const position = validRows.findIndex((r) => r.index === row.index)
      const result = results[position]
      return result?.success
        ? {
            index: row.index,
            fullName,
            status: 'success',
            message: result.compensationError
              ? `${result.employeeNumber} — employee created, but compensation not saved: ${result.compensationError}`
              : (result.employeeNumber ?? ''),
          }
        : { index: row.index, fullName, status: 'failed', message: result?.error ?? '' }
    }
    return { index: row.index, fullName, status: 'ready', message: 'Ready to import' }
  })

  const hasFailures = results ? results.some((r) => !r.success) : false

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/hr/employees')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Import Employees</h1>
          <p className="text-sm text-muted-foreground">Bulk-create employee records from a CSV file.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Get the template</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Department and Outlet accept either the display name or the id. Employment Status and Contract Type
            accept either their label or raw value. Basic Salary, allowances and bank details are only saved if you
            hold compensation access — if you don't, those columns are ignored and the employee is still created
            without them.
          </p>
          <Button variant="secondary" onClick={downloadTemplate}>
            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Download template
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Upload the filled-in file</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <input
            type="file"
            accept=".csv"
            onChange={handleFile}
            disabled={employees === null}
            className="text-sm text-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-sunken file:px-3 file:py-2 file:text-sm file:font-medium"
          />
          {employees === null && <p className="text-xs text-muted-foreground">Loading the current roster…</p>}
        </CardContent>
      </Card>

      {parsedRows && (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle>3. Review and import</CardTitle>
            <div className="flex gap-2">
              {hasFailures && (
                <Button variant="secondary" onClick={downloadFailedRows}>
                  <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Download failed rows
                </Button>
              )}
              <Button onClick={handleSubmit} loading={submitting} disabled={validRows.length === 0 || results !== null}>
                <Upload className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Import {validRows.length} row{validRows.length === 1 ? '' : 's'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {displayRows.length === 0 ? (
              <EmptyState title="No rows found" description="The file has no data rows below the header." />
            ) : (
              <ReportTable columns={COLUMNS} rows={displayRows} rowKey={(r) => String(r.index)} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
