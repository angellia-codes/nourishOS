import { DEPARTMENTS, OUTLETS, type OrgOption } from '@/constants/organization'
import { DISCIPLINARY_TYPE_LABELS, EMPLOYMENT_STATUS_LABELS, type DisciplinaryType } from '@/constants/hr'
import { employedAsOf } from './turnover'
import type { Employee } from '@/types'

/**
 * Aggregations behind the HR Overview dashboard — every one of them derived
 * from the employee register alone, so the page adds no new query shape and no
 * index. Pure functions, taking the roster as an argument, for the same reason
 * the other report utils here are: the page just renders what they return.
 */

export interface Slice {
  key: string
  label: string
  value: number
}

function labelFor(id: string, source: readonly OrgOption[]): string {
  return source.find((option) => option.id === id)?.name ?? id
}

function tally(employees: Employee[], keyOf: (employee: Employee) => string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const employee of employees) {
    const key = keyOf(employee)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/**
 * Headcount per department, largest first. Everything past `topN` is folded
 * into one "Others" slice — a donut with fourteen legend rows reads as noise,
 * and the register has one department per nav group plus outlet-only ones.
 */
export function departmentSlices(employees: Employee[], topN = 6): Slice[] {
  const counts = Array.from(tally(employees, (e) => e.departmentId).entries())
    .map(([key, value]) => ({ key, label: labelFor(key, DEPARTMENTS), value }))
    .sort((a, b) => b.value - a.value)

  if (counts.length <= topN + 1) return counts

  const head = counts.slice(0, topN)
  const rest = counts.slice(topN).reduce((sum, slice) => sum + slice.value, 0)
  return [...head, { key: 'others', label: 'Others', value: rest }]
}

export function outletSlices(employees: Employee[]): Slice[] {
  return Array.from(tally(employees, (e) => e.outletId).entries())
    .map(([key, value]) => ({ key, label: labelFor(key, OUTLETS), value }))
    .sort((a, b) => b.value - a.value)
}

/** Male/female only — `Gender` has exactly those two values (src/constants/hr.ts). */
export function genderSlices(employees: Employee[]): Slice[] {
  const counts = tally(employees, (e) => e.gender)
  return [
    { key: 'male', label: 'Male', value: counts.get('male') ?? 0 },
    { key: 'female', label: 'Female', value: counts.get('female') ?? 0 },
  ]
}

/** PKWT / PKWTT / freelance / bod / dailyWorker / ojt, labelled as the rest of HR labels them. */
export function employmentTypeSlices(employees: Employee[]): Slice[] {
  return Array.from(tally(employees, (e) => e.employmentStatus).entries())
    .map(([key, value]) => ({
      key,
      label: EMPLOYMENT_STATUS_LABELS[key as keyof typeof EMPLOYMENT_STATUS_LABELS] ?? key,
      value,
    }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Headcount per disciplinary action in force, from `Employee.disciplinaryType`
 * (§12.1's escalation ladder).
 *
 * That field is HR's own current-standing flag, set by hand on the employee
 * record — nothing syncs it from the `disciplinaryActions` records the Employee
 * Communication workflow files (see src/features/hr/CLAUDE.md, which states the
 * no-auto-sync deliberately). So this counts PEOPLE currently carrying a
 * sanction, not records ever filed, and the two numbers will differ.
 *
 * Employees with nothing on file are returned as `none` rather than as a slice:
 * they are almost always the bulk of the register and would flatten every real
 * bar next to them.
 */
export function disciplinarySlices(employees: Employee[]): { slices: Slice[]; none: number } {
  const counts = tally(employees, (employee) => employee.disciplinaryType ?? '')
  const none = counts.get('') ?? 0
  counts.delete('')

  const slices = Array.from(counts.entries())
    .map(([key, value]) => ({
      key,
      label: DISCIPLINARY_TYPE_LABELS[key as DisciplinaryType] ?? key,
      value,
    }))
    .sort((a, b) => b.value - a.value)

  return { slices, none }
}

const AGE_BANDS: { label: string; min: number; max: number }[] = [
  { label: 'Below 25', min: 0, max: 24 },
  { label: '25 - 35', min: 25, max: 35 },
  { label: '36 - 45', min: 36, max: 45 },
  { label: '46 - 55', min: 46, max: 55 },
  { label: 'Above 55', min: 56, max: 200 },
]

/** Whole years as of `asOfIso`, from a 'YYYY-MM-DD' birth date. Null when unparseable. */
export function ageOn(birthDate: string | null | undefined, asOfIso: string): number | null {
  if (!birthDate || birthDate.length < 10) return null
  const years = Number(asOfIso.slice(0, 4)) - Number(birthDate.slice(0, 4))
  if (!Number.isFinite(years)) return null
  // Birthday not yet reached this year — compare the MM-DD tails.
  return asOfIso.slice(5) < birthDate.slice(5) ? years - 1 : years
}

/**
 * The five bands the HR dashboard reports on. Employees with no usable
 * birth date are counted separately rather than dropped — the bands would
 * otherwise silently stop summing to the headcount.
 */
export function ageBands(employees: Employee[], asOfIso: string): { bands: Slice[]; unknown: number } {
  const bands = AGE_BANDS.map((band) => ({ key: band.label, label: band.label, value: 0 }))
  let unknown = 0

  for (const employee of employees) {
    const age = ageOn(employee.birthDate, asOfIso)
    if (age === null || age < 0) {
      unknown += 1
      continue
    }
    const index = AGE_BANDS.findIndex((band) => age >= band.min && age <= band.max)
    if (index === -1) unknown += 1
    else bands[index].value += 1
  }

  return { bands, unknown }
}

/** The last day of the month `isoDate` falls in, as 'YYYY-MM-DD'. */
function monthEnd(isoDate: string): string {
  const year = Number(isoDate.slice(0, 4))
  const month = Number(isoDate.slice(5, 7))
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${isoDate.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`
}

function shiftMonths(isoDate: string, months: number): string {
  const year = Number(isoDate.slice(0, 4))
  const month = Number(isoDate.slice(5, 7))
  const shifted = new Date(Date.UTC(year, month - 1 + months, 1))
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-01`
}

export interface TrendPoint {
  /** 'YYYY-MM' — the month the headcount was measured at the end of. */
  month: string
  label: string
  value: number
}

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Headcount at the end of each of the last `months` months, reconstructed from
 * joinDate/resignationDate rather than stored anywhere — the register is the
 * only history this app keeps, and `employedAsOf` (turnover.ts) already encodes
 * the rule. The current month is measured at `asOfIso`, not its month end,
 * since the rest of it hasn't happened yet.
 *
 * A resignation recorded without a `resignationDate` never leaves the trend;
 * that is the same limitation every turnover figure in this module has.
 */
export function headcountTrend(employees: Employee[], asOfIso: string, months = 6): TrendPoint[] {
  const points: TrendPoint[] = []

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const monthStart = shiftMonths(asOfIso, -offset)
    const measureAt = offset === 0 ? asOfIso : monthEnd(monthStart)
    points.push({
      month: monthStart.slice(0, 7),
      label: MONTH_LABELS[Number(monthStart.slice(5, 7)) - 1],
      value: employees.filter((employee) => employedAsOf(employee, measureAt)).length,
    })
  }

  return points
}

export interface WorkforceSummary {
  total: number
  male: number
  female: number
  hiresYtd: number
  exitsYtd: number
  departments: number
  /** Hires YTD over the average of opening and current headcount. */
  recruitmentRateYtd: number
  /** 1 − (exits YTD over that same average headcount). */
  retentionRateYtd: number
}

/**
 * `employees` is the whole register, active and inactive — exits and the
 * average headcount both need the people who have already left.
 */
export function buildWorkforceSummary(employees: Employee[], asOfIso: string): WorkforceSummary {
  const ytdStart = `${asOfIso.slice(0, 4)}-01-01`
  const active = employees.filter((employee) => employee.status === 'active')

  const hiresYtd = employees.filter((employee) => employee.joinDate >= ytdStart && employee.joinDate <= asOfIso).length
  const exitsYtd = employees.filter(
    (employee) => employee.resignationDate && employee.resignationDate >= ytdStart && employee.resignationDate <= asOfIso,
  ).length

  const headcountStart = employees.filter((employee) => employedAsOf(employee, ytdStart)).length
  const headcountNow = employees.filter((employee) => employedAsOf(employee, asOfIso)).length
  const avgHeadcount = (headcountStart + headcountNow) / 2

  const genders = genderSlices(active)

  return {
    total: active.length,
    male: genders[0].value,
    female: genders[1].value,
    hiresYtd,
    exitsYtd,
    departments: new Set(active.map((employee) => employee.departmentId)).size,
    recruitmentRateYtd: avgHeadcount > 0 ? hiresYtd / avgHeadcount : 0,
    retentionRateYtd: avgHeadcount > 0 ? 1 - exitsYtd / avgHeadcount : 1,
  }
}
