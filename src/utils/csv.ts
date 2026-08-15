export interface CsvColumn<T> {
  header: string
  value: (row: T) => string
}

function escapeCsvCell(value: string): string {
  if (!/[",\n]/.test(value)) return value
  return `"${value.replace(/"/g, '""')}"`
}

/** Generic CSV serializer — one row per array entry, in the given column order. */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const table = [
    columns.map((c) => c.header),
    ...rows.map((row) => columns.map((c) => escapeCsvCell(c.value(row)))),
  ]
  return table.map((row) => row.join(',')).join('\r\n')
}

/** Triggers a browser download of the given CSV text — no backend call, data is already on the client. */
export function downloadCsv(csv: string, fileName: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
