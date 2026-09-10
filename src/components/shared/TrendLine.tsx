export interface TrendPointItem {
  label: string
  value: number
}

export interface TrendSeries {
  label: string
  points: TrendPointItem[]
}

interface TrendLineProps {
  /** Single-series shorthand. Ignored when `series` is supplied. */
  points?: TrendPointItem[]
  /** Two or more series sharing one x-axis and one y-scale. */
  series?: TrendSeries[]
  /** Height of the plot area in px. Width is fluid — the SVG scales to its box. */
  height?: number
  /** For currency or any other non-integer figure. Defaults to plain String. */
  valueFormatter?: (value: number) => string
}

/**
 * Line chart — SVG polyline, no charting dependency (see DonutChart for the
 * same note). One series or several; several share a single y-scale, so the
 * lines are directly comparable, and get a legend plus per-series value rows
 * under the axis.
 *
 * The y-axis is deliberately NOT zero-based: headcount moves by a few percent
 * month to month and a zero baseline would flatten it into a straight line.
 * The axis captions print the real floor and ceiling so the scale can't be
 * misread, and the fill under a single series stops at that floor rather than
 * implying area from zero. A multi-series chart gets no fill at all — two
 * overlapping translucent areas read as a third colour.
 */
export function TrendLine({ points, series, height = 160, valueFormatter = String }: TrendLineProps) {
  const allSeries: TrendSeries[] = series ?? (points ? [{ label: '', points }] : [])
  const axis = allSeries[0]?.points ?? []

  if (allSeries.length === 0 || axis.length < 2) {
    return <p className="text-sm text-muted-foreground">Not enough history to chart.</p>
  }

  const values = allSeries.flatMap((line) => line.points.map((point) => point.value))
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  // Pad the band so a flat series doesn't divide by zero and the extremes
  // don't sit exactly on the frame.
  const pad = Math.max(Math.round((rawMax - rawMin) * 0.25), 1)
  const min = Math.max(rawMin - pad, 0)
  const max = rawMax + pad

  // A 0-100 viewBox with preserveAspectRatio="none" would skew the stroke, so
  // the box is a fixed grid and the SVG is width-100% with a real height.
  const width = 100
  const top = 8
  const plot = 100 - top - 12
  const x = (index: number) => (index / (axis.length - 1)) * (width - 8) + 4
  const y = (value: number) => top + plot - ((value - min) / (max - min)) * plot

  const color = (index: number) => `var(--color-chart-${index + 1})`
  const pathFor = (line: TrendSeries) =>
    line.points.map((point, index) => `${x(index)},${y(point.value)}`).join(' ')
  const titleFor = (line: TrendSeries) =>
    line.points.map((point) => `${point.label}: ${valueFormatter(point.value)}`).join(' · ')

  return (
    <div className="flex flex-col gap-1">
      {allSeries.length > 1 && (
        <div className="mb-1 flex flex-wrap gap-x-4 gap-y-1">
          {allSeries.map((line, index) => (
            <span key={line.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: color(index) }}
                aria-hidden="true"
              />
              {line.label}
            </span>
          ))}
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} 100`}
        preserveAspectRatio="none"
        style={{ height }}
        className="w-full"
        role="img"
        aria-label={allSeries.map((line) => `${line.label} ${titleFor(line)}`).join('. ')}
      >
        {allSeries.length === 1 && (
          <polygon
            points={`${x(0)},${top + plot} ${pathFor(allSeries[0])} ${x(axis.length - 1)},${top + plot}`}
            fill={color(0)}
            opacity={0.12}
          />
        )}
        {/*
         * No point markers: preserveAspectRatio="none" scales x and y by
         * different factors, so a <circle> renders as a squashed ellipse. Every
         * value is directly labelled under the axis instead, which is the
         * stronger encoding anyway.
         */}
        {allSeries.map((line, index) => (
          <polyline
            key={line.label}
            points={pathFor(line)}
            fill="none"
            stroke={color(index)}
            strokeWidth={0.8}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          >
            <title>{line.label ? `${line.label} — ${titleFor(line)}` : titleFor(line)}</title>
          </polyline>
        ))}
      </svg>

      <div className="flex justify-between">
        {axis.map((point, index) => (
          <div key={point.label + index} className="flex flex-col items-center gap-0.5">
            {allSeries.map((line, seriesIndex) => (
              <span
                key={line.label}
                className={`font-mono text-xs tabular-nums ${allSeries.length > 1 ? '' : 'text-foreground'}`}
                style={allSeries.length > 1 ? { color: color(seriesIndex) } : undefined}
              >
                {valueFormatter(line.points[index]?.value ?? 0)}
              </span>
            ))}
            <span className="text-[10px] text-muted-foreground">{point.label}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Scale {valueFormatter(min)}–{valueFormatter(max)}, not zero-based.
      </p>
    </div>
  )
}
