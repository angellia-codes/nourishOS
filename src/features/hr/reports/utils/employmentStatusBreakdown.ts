import { EMPLOYMENT_STATUS } from '@/constants/hr'
import type { Employee } from '@/types'

export interface EmploymentStatusBreakdown {
  /** PKWT + PKWTT combined — fixed-term and permanent staff. */
  pkwtCombined: number
  dailyWorker: number
  ojt: number
  /** freelance/bod — not one of the three requested buckets, kept so the tiles sum to the total. */
  other: number
}

export function buildEmploymentStatusBreakdown(employees: Employee[]): EmploymentStatusBreakdown {
  const breakdown: EmploymentStatusBreakdown = { pkwtCombined: 0, dailyWorker: 0, ojt: 0, other: 0 }

  for (const employee of employees) {
    switch (employee.employmentStatus) {
      case EMPLOYMENT_STATUS.FIXED_TERM:
      case EMPLOYMENT_STATUS.PERMANENT:
        breakdown.pkwtCombined += 1
        break
      case EMPLOYMENT_STATUS.DAILY_WORKER:
        breakdown.dailyWorker += 1
        break
      case EMPLOYMENT_STATUS.OJT:
        breakdown.ojt += 1
        break
      default:
        breakdown.other += 1
    }
  }

  return breakdown
}
