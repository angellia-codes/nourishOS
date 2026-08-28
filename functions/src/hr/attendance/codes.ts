/**
 * attendance.md §2 — the nine-code taxonomy, alias folding, and the fixed CSV
 * shape (§4.1). Pure: no Firestore, no auth — mirrors
 * functions/src/hr/training/trainingCatalog.ts's "pure half" pattern so the
 * folding/classification logic is assertable with a plain `node` script.
 */

export type AttendanceCode = 'WD' | 'PH' | 'DP' | 'AL' | 'MC' | 'EO' | 'SL' | 'DO' | 'UL'
export type AttendanceCodeClass = 'worked' | 'rest' | 'leaveEntitled' | 'leaveUnpaid'

/** §2 table — every code belongs to exactly one class, and class determines its treatment in every metric. */
export const ATTENDANCE_CODES: readonly AttendanceCode[] = ['WD', 'PH', 'DP', 'AL', 'MC', 'EO', 'SL', 'DO', 'UL']

/** D2 (locked): MC and EO are entitled leave, not absenteeism. Absenteeism is UL only. */
export const ATTENDANCE_CODE_CLASS: Record<AttendanceCode, AttendanceCodeClass> = {
  WD: 'worked',
  DO: 'rest',
  PH: 'rest',
  DP: 'leaveEntitled',
  AL: 'leaveEntitled',
  MC: 'leaveEntitled',
  EO: 'leaveEntitled',
  SL: 'leaveEntitled',
  UL: 'leaveUnpaid',
}

/** §4.1 — the four identity columns, in fixed order, ahead of the nine codes and late_count. */
export const ATTENDANCE_IDENTITY_COLUMNS = ['employee_number', 'employee_name', 'department', 'outlet'] as const

/** §4.1 — the full 14-column canonical header, in order. */
export const ATTENDANCE_CSV_COLUMNS: readonly string[] = [
  ...ATTENDANCE_IDENTITY_COLUMNS,
  ...ATTENDANCE_CODES,
  'late_count',
]

/**
 * §2.2 (D4, locked) — legacy columns folded at the column-header level. An
 * incoming column named e.g. `NPL` is folded into `UL` by adding its values to
 * the `UL` column; if both the alias and its target are present, the values
 * are summed.
 */
export const ATTENDANCE_ALIAS_COLUMNS: Record<string, AttendanceCode> = {
  NPL: 'UL',
  DPH: 'DP',
  DPN: 'DP',
  OFF: 'DO',
}

export interface FoldResult {
  /** Rows with every alias column folded into its target and removed. */
  rows: Record<string, string>[]
  /** One entry per alias column actually present in the header, for the W6 warning. */
  substitutions: string[]
}

/**
 * Folds every alias column present in `header` into its target code column,
 * summing when both are present. Returns rows with the alias columns removed
 * so downstream validation only ever sees the canonical nine.
 */
export function foldAliasColumns(header: string[], rows: Record<string, string>[]): FoldResult {
  const present = header.filter((column) => column in ATTENDANCE_ALIAS_COLUMNS)
  if (present.length === 0) return { rows, substitutions: [] }

  const folded = rows.map((row) => {
    const next = { ...row }
    for (const alias of present) {
      const target = ATTENDANCE_ALIAS_COLUMNS[alias]
      const aliasValue = Number(next[alias] ?? 0) || 0
      const targetValue = Number(next[target] ?? 0) || 0
      next[target] = String(aliasValue + targetValue)
      delete next[alias]
    }
    return next
  })

  const substitutions = present.map((alias) => `${alias} → ${ATTENDANCE_ALIAS_COLUMNS[alias]}`)
  return { rows: folded, substitutions }
}
