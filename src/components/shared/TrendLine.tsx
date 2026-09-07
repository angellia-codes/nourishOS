export interface TrendPointItem {
  label: string
  value: number
}

interface TrendLineProps {
  points: TrendPointItem[]
  /** Height of the plot area in px. Width is fluid — the SVG scales to its box. */
  height?: number
}

/**
 * Single-series line chart — SVG polyline, no charting dependency (see
 * DonutChart for the same note). One series, so no legend: the card's own
 * title names it, and every point is directly labelled.
 *
 * The y-axis is deliberately NOT zero-based: headcount moves by a few percent
 * month to month and a zero baseline would flatten it into a straight line.
 * The axis captions print the real floor and ceiling so the scale can't be
 * misread, and the fill under the line stops at that floor rather than
 * implying area from zero.
 */
export function TrendLine({ points, height = 160 }: TrendLineProps) {
  if (points.length < 2) {
    return <p className="text-sm text-muted-foreground">Not enough history to chart.</p>
  }

  const values = points.map((point) => point.value)
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
  const x = (index: number) => (index / (points.length - 1)) * (width - 8) + 4
  const y = (value: number) => top + plot - ((value - min) / (max - min)) * plot

  const line = points.map((point, index) => `${x(index)},${y(point.value)}`).join(' ')
  const area = `${x(0)},${top + plot} ${line} ${x(points.length - 1)},${top + plot}`

  return (
    <div className="flex flex-col gap-1">
      <svg
        viewBox={`0 0 ${width} 100`}
        preserveAspectRatio="none"
        style={{ height }}
        className="w-full"
        role="img"
        aria-label={points.map((point) => `${point.label}: ${point.value}`).join(', ')}
      >
        <polygon points={area} fill="var(--color-chart-1)" opacity={0.12} />
        {/*
         * No point markers: preserveAspectRatio="none" scales x and y by
         * different factors, so a <circle> renders as a squashed ellipse. Every
         * value is directly labelled under the axis instead, which is the
         * stronger encoding anyway.
         */}
        <polyline
          points={line}
          fill="none"
          stroke="var(--color-chart-1)"
          strokeWidth={0.8}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        >
          <title>{points.map((point) => `${point.label}: ${point.value}`).join(' · ')}</title>
        </polyline>
      </svg>

      <div className="flex justify-between">
        {points.map((point, index) => (
          <div key={point.label + index} className="flex flex-col items-center gap-0.5">
            <span className="font-mono text-xs tabular-nums text-foreground">{point.value}</span>
            <span className="text-[10px] text-muted-foreground">{point.label}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Scale {min}–{max}, not zero-based.
      </p>
    </div>
  )
}
