export interface StampOptions {
  lines: string[]
}

/**
 * Draws the source image onto a canvas with the given text lines burned
 * into a semi-transparent bar at the bottom, then exports as a new JPEG
 * Blob. This is the visual/tamper-evidence half of the stamp — the
 * structured lat/long/accuracy/timestamp fields stored alongside it in
 * Firestore are the queryable half.
 */
export function stampImage(file: File, options: StampOptions): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Canvas is not supported on this device.'))
        return
      }

      ctx.drawImage(img, 0, 0)

      const fontSize = Math.max(16, Math.round(canvas.width * 0.022))
      const lineHeight = fontSize * 1.4
      const padding = fontSize * 0.6
      const barHeight = options.lines.length * lineHeight + padding * 2

      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
      ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight)

      ctx.fillStyle = '#FFFFFF'
      ctx.font = `${fontSize}px sans-serif`
      ctx.textBaseline = 'top'

      options.lines.forEach((line, i) => {
        ctx.fillText(line, padding, canvas.height - barHeight + padding + i * lineHeight)
      })

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to process the photo.'))
        },
        'image/jpeg',
        0.9,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load the captured photo.'))
    }

    img.src = objectUrl
  })
}
