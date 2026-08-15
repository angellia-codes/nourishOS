import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface ReportTableColumn<T> {
  header: string
  value: (row: T) => ReactNode
  align?: 'left' | 'right'
}

interface ReportTableProps<T> {
  columns: ReportTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
}

/**
 * Minimal presentational table for report views — column config in, rows out.
 * No built-in sorting/pagination: filtering and sorting stay page-local, same
 * as EmployeeListPage's client-side useMemo convention.
 */
export function ReportTable<T>({ columns, rows, rowKey }: ReportTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-border bg-sunken">
            {columns.map((col) => (
              <th
                key={col.header}
                className={cn(
                  'whitespace-nowrap px-4 py-2.5 font-medium text-muted-foreground',
                  col.align === 'right' ? 'text-right' : 'text-left',
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-border last:border-0">
              {columns.map((col) => (
                <td
                  key={col.header}
                  className={cn(
                    'whitespace-nowrap px-4 py-2.5 text-foreground',
                    col.align === 'right' ? 'text-right' : 'text-left',
                  )}
                >
                  {col.value(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
