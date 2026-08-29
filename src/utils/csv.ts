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

/**
 * Which character actually separates the cells.
 *
 * `toCsv` always writes commas, but Excel on an Indonesian (or any European)
 * locale uses the system list separator when it saves a .csv — semicolons —
 * and "Text (Tab delimited)" gets renamed .csv often enough to be worth
 * covering too. A comma parser fed a semicolon file reads every line as one
 * cell, so the header becomes a single unmatchable key and *every* column
 * comes back empty: the import then reports every required field missing on
 * every row rather than "this file is not comma-separated".
 *
 * Counted on the header line only, and only outside quotes — a quoted header
 * containing a comma must not out-vote the real separator.
 */
function sniffDelimiter(headerLine: string): string {
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 }
  let inQuotes = false
  for (const char of headerLine) {
    if (char === '"') inQuotes = !inQuotes
    else if (!inQuotes && char in counts) counts[char]++
  }
  const [best, bestCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return bestCount > 0 ? best : ','
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  const delimiter = sniffDelimiter(text.split(/\r?\n/, 1)[0] ?? '')

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
    } else if (char === delimiter) {
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
 *
 * The separator is sniffed per file (see sniffDelimiter), so a template
 * round-tripped through a locale whose Excel saves semicolons still imports.
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
