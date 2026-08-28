import { useEffect, useState } from 'react'

/**
 * A one-shot confetti burst over a milestone announcement. No dependency — 24
 * spans over the `confetti-fall` keyframes in globals.css, deterministic
 * offsets so nothing re-randomises on every render.
 *
 * Purely decorative and `aria-hidden`, and skipped outright for anyone who has
 * asked for reduced motion (matchMedia is read once on mount rather than
 * subscribed to — the animation only runs for a couple of seconds anyway).
 */
const PIECES = Array.from({ length: 24 }, (_, index) => ({
  left: `${(index * 37) % 100}%`,
  delay: `${(index % 8) * 0.18}s`,
  duration: `${2 + (index % 5) * 0.35}s`,
  color: ['#0E4F47', '#B45309', '#1D4ED8', '#B91C1C', '#15803D'][index % 5],
  size: 6 + (index % 3) * 3,
}))

export function Confetti() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    setEnabled(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  if (!enabled) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {PIECES.map((piece, index) => (
        <span
          key={index}
          className="absolute top-0 block rounded-[1px]"
          style={{
            left: piece.left,
            width: piece.size,
            height: piece.size * 2,
            backgroundColor: piece.color,
            animation: `confetti-fall ${piece.duration} linear ${piece.delay} 1 both`,
          }}
        />
      ))}
    </div>
  )
}
