export interface DonutSlice {
  key: string
  label: string
  value: number
}

interface DonutChartProps {
  slices: DonutSlice[]
  /** Rendered inside the ring, above the total. */
  centerLabel?: string
  /** Override the number in the middle — defaults to the sum of the slices. */
  total?: number
  size?: number
}

/**
 * Donut + legend, hand-rolled SVG — there is still no charting dependency in
 * this repo, and the whole thing is one circle per slice with a rotated
 * dash offset (same reasoning as BarDiagram and window.print()).
 *
 * Colors come from `--color-chart-1..8` (src/styles/globals.css), assigned in
 * slice order and never cycled: a 9th slice would reuse a hue, so callers fold
 * the tail into one "Others" slice before passing it in (see
 * `departmentSlices`). Identity is never color-alone — every slice is named in
 * the legend with its own swatch, and each arc carries a `<title>` so hovering
 * names it too.
 */
const SLOTS = 8

export function DonutChart({ slices, centerLabel, total, size = 180 }: DonutChartProps) {
  const shown = slices.filter((slice) => slice.value > 0)
  const sum = shown.reduce((acc, slice) => acc + slice.value, 0)

  if (sum === 0) {
    return <p className="text-sm text-muted-foreground">No data to chart.</p>
  }

  const stroke = size * 0.18
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  // A 2px surface-coloured gap between adjacent fills, per the chart spec.
  const gap = 2

  let offset = 0

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${centerLabel ?? 'Total'}: ${total ?? sum}`}
        className="shrink-0"
      >
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {shown.map((slice, index) => {
            const length = (slice.value / sum) * circumference
            const dash = Math.max(length - gap, 0.5)
            const element = (
              <circle
                key={slice.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={`var(--color-chart-${(index % SLOTS) + 1})`}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              >
                <title>{`${slice.label}: ${slice.value} (${Math.round((slice.value / sum) * 100)}%)`}</title>
              </circle>
            )
            offset += length
            return element
          })}
        </g>
        <text
          x="50%"
          y={centerLabel ? '46%' : '50%'}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground font-mono text-xl font-semibold"
        >
          {total ?? sum}
        </text>
        {centerLabel && (
          <text
            x="50%"
            y="60%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {centerLabel}
          </text>
        )}
      </svg>

      <ul className="flex min-w-[10rem] flex-1 flex-col gap-1.5">
        {shown.map((slice, index) => (
          <li key={slice.key} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: `var(--color-chart-${(index % SLOTS) + 1})` }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-muted-foreground" title={slice.label}>
              {slice.label}
            </span>
            <span className="shrink-0 tabular-nums text-foreground">{slice.value}</span>
            <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">
              {Math.round((slice.value / sum) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
