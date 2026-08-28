import { useRef, useState } from 'react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

interface SignaturePadProps {
  onCapture: (blob: Blob) => void
  disabled?: boolean
}

/**
 * appraisal-v2-design.md §2.7 — signatureFileId capture. Native <canvas> +
 * Pointer Events, no dependency (ponytail: native platform feature over a
 * signature-pad npm package for what's ~40 lines of drawing). The only
 * existing precedent in this repo is typed-name-as-signature
 * (CommunicationRecordDetailPage.tsx), whose own comment says there's no
 * canvas — this is genuinely new UI, not a reuse.
 */
export function SignaturePad({ onCapture, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawing.current = true
    const { x, y } = pointerPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    canvas.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const { x, y } = pointerPos(e)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0E4F47'
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasDrawn(true)
  }

  function handlePointerUp() {
    drawing.current = false
  }

  function handleClear() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  function handleCapture() {
    const canvas = canvasRef.current
    if (!canvas || !hasDrawn) return
    canvas.toBlob((blob) => {
      if (blob) onCapture(blob)
    }, 'image/png')
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={480}
        height={160}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={cn(
          'w-full touch-none rounded-md border border-border bg-surface',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={handleClear} disabled={disabled || !hasDrawn}>
          Clear
        </Button>
        <Button type="button" size="sm" onClick={handleCapture} disabled={disabled || !hasDrawn}>
          Use signature
        </Button>
      </div>
    </div>
  )
}
