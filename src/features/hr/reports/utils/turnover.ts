import { OUTLETS, DEPARTMENTS, type OrgOption } from '@/constants/organization'
import type { Employee } from '@/types'

function labelFor(id: string, source: readonly OrgOption[]): string {
  return source.find((option) => option.id === id)?.name ?? id
}

/**
 * Employed as of the given civil date: joined on or before it, and not
 * resigned before it. Promoted out of EmployeeTurnoverReportPage.tsx (where
 * it used to live inline) so buildSeasonalActualRows (manningBudget.ts) can
 * reuse it too.
 */
export function employedAsOf(employee: Employee, isoDate: string): boolean {
  if (employee.joinDate > isoDate) return false
  if (employee.resignationDate && employee.resignationDate < isoDate) return false
  return true
}

export interface TurnoverRow {
  outletId: string
  outletName: string
  departmentId: string
  departmentName: string
  activeCount: number
  resignedMtd: number
  turnoverRateMtd: number
  resignedYtd: number
  turnoverRateYtd: number
}

function rateFor(employees: Employee[], windowStart: string, asOfIso: string): { resigned: number; rate: number } {
  const resigned = employees.filter(
    (e) => e.resignationDate && e.resignationDate >= windowStart && e.resignationDate <= asOfIso,
  ).length
  const headcountStart = employees.filter((e) => employedAsOf(e, windowStart)).length
  const headcountNow = employees.filter((e) => employedAsOf(e, asOfIso)).length
  const avgHeadcount = (headcountStart + headcountNow) / 2
  return { resigned, rate: avgHeadcount > 0 ? resigned / avgHeadcount : 0 }
}

/** Turnover grouped by outlet + department, with MTD and YTD windows ending `asOfIso`. */
export function buildTurnoverRows(employees: Employee[], asOfIso: string): TurnoverRow[] {
  const groups = new Map<string, Employee[]>()
  for (const employee of employees) {
    const key = `${employee.outletId}::${employee.departmentId}`
    const list = groups.get(key)
    if (list) list.push(employee)
    else groups.set(key, [employee])
  }

  const mtdStart = `${asOfIso.slice(0, 7)}-01`
  const ytdStart = `${asOfIso.slice(0, 4)}-01-01`

  return Array.from(groups.entries())
    .map(([key, group]) => {
      const [outletId, departmentId] = key.split('::')
      const mtd = rateFor(group, mtdStart, asOfIso)
      const ytd = rateFor(group, ytdStart, asOfIso)
      return {
        outletId,
        outletName: labelFor(outletId, OUTLETS),
        departmentId,
        departmentName: labelFor(departmentId, DEPARTMENTS),
        activeCount: group.filter((e) => e.status === 'active').length,
        resignedMtd: mtd.resigned,
        turnoverRateMtd: mtd.rate,
        resignedYtd: ytd.resigned,
        turnoverRateYtd: ytd.rate,
      }
    })
    .sort((a, b) => a.outletName.localeCompare(b.outletName) || a.departmentName.localeCompare(b.departmentName))
}
