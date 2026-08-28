export interface BarDiagramItem {
  label: string
  value: number
}

interface BarDiagramProps {
  items: BarDiagramItem[]
  valueFormatter?: (value: number) => string
  maxBars?: number
}

/**
 * Highest-to-lowest horizontal bar diagram — plain CSS width percentages, no
 * chart library (no charting dependency exists anywhere in this repo; a few
 * dozen native lines beats adding one, same reasoning as window.print()
 * instead of a PDF library elsewhere in this app).
 */
export function BarDiagram({ items, valueFormatter = String, maxBars = 10 }: BarDiagramProps) {
  const sorted = [...items].sort((a, b) => b.value - a.value).slice(0, maxBars)
  const max = Math.max(...sorted.map((i) => i.value), 1)

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">No data to chart.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-xs text-muted-foreground" title={item.label}>
            {item.label}
          </span>
          <div className="h-5 flex-1 overflow-hidden rounded-sm bg-border/40">
            <div
              className="h-full rounded-sm bg-secondary transition-all duration-200"
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
            />
          </div>
          <span className="w-24 shrink-0 text-right text-xs tabular-nums text-foreground">
            {valueFormatter(item.value)}
          </span>
        </div>
      ))}
    </div>
  )
}
