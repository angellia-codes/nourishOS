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

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

/**
 * Parses RFC4180-ish CSV text (quoted fields, embedded commas/newlines, ""
 * escaping) into row objects keyed by the header row. Hand-rolled, mirroring
 * toCsv's escaping in reverse — this reads a template the app itself
 * generates, not adversarial input, so no parsing library is warranted.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text)
  if (rows.length === 0) return []
  const [header, ...body] = rows
  return body
    .filter((row) => row.some((cell) => cell.trim() !== ''))
    .map((row) => Object.fromEntries(header.map((key, i) => [key.trim(), row[i] ?? ''])))
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
