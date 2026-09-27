import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js') as typeof import('pdfjs-dist/legacy/build/pdf')

/**
 * HR_OPERATIONS.md §9.14 — stamps the GM's and Director's actually-captured
 * signatures (drawn on-device via SignaturePad, uploaded through the shared
 * file-storage engine) onto the contract PDF, producing the "fully signed"
 * artifact HR downloads. This is deliberately separate from the approval
 * trail itself (approvalHistory.signatureFileId, functions/src/shared/approval)
 * — that trail is the audit record; this module only concerns itself with
 * *where on the page* those already-captured images go.
 *
 * Two locate passes (pdfjs-dist, text-position only) feed one draw pass
 * (pdf-lib). Coordinates throughout are native PDF space (origin bottom-left,
 * y increasing upward) — both libraries already agree on this, so unlike the
 * one-off Python mockup that produced this design, no top-down/bottom-up
 * flip is needed anywhere here.
 *
 * ponytail: geometry here is derived from this company's actual PKWT/PKWTT
 * template (verified against a real contract during design), not computed
 * from first principles — a differently-laid-out template may need its own
 * constants revisited. Every detector returns null/empty rather than
 * guessing when its anchor text isn't found, so a mismatched template
 * degrades to "skip stamping, notify HR" (see generateSignedContract.ts)
 * rather than placing a mark somewhere wrong.
 */

export interface BoxGeometry {
  x0: number
  x1: number
  yTop: number
  yBottom: number
}

export interface PageInitialBoxes {
  pageIndex: number
  director: BoxGeometry
  generalManager: BoxGeometry
  // Column 3 (the employee's own initial) is intentionally not modeled — never touched.
}

export interface BilingualBox {
  indo: BoxGeometry
  english: BoxGeometry
}

export interface SignatureGapPair {
  pageIndex: number
  director: BilingualBox
  generalManager: BilingualBox
}

/** Measured against the real template — the footer initial box's fixed height. */
const INITIAL_BOX_HEIGHT = 42.7
/** Measured indent between a column's left border and its own label text. */
const INITIAL_BOX_LABEL_INSET = 15
/** Bilingual signature-block column bounds (page unrelated to the footer boxes). */
const INDO_COLUMN: readonly [number, number] = [53, 301]
const ENGLISH_COLUMN: readonly [number, number] = [311.9, 559.9]

interface TextItem {
  str: string
  x: number
  y: number
  width: number
  height: number
}

async function loadTextItemsPerPage(pdfBytes: Uint8Array): Promise<TextItem[][]> {
  const doc = await pdfjsLib.getDocument({ data: pdfBytes, useWorkerFetch: false, isEvalSupported: false }).promise
  const pages: TextItem[][] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    pages.push(
      content.items
        .filter((item): item is Extract<typeof item, { str: string }> => 'str' in item)
        .map((item) => ({
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width ?? 0,
          height: item.height ?? 0,
        })),
    )
  }
  return pages
}

/**
 * The repeating "1.Initial / 2. Initial / 3. Initial" footer, present on
 * every page. Column bounds are derived from the pitch between adjacent
 * labels (not from drawn border rects, which pdfjs-dist's text layer doesn't
 * expose) — an approximation, not a pixel-perfect reproduction of the box
 * border; good enough to center a signature image with visible margin.
 */
export async function locateInitialBoxes(pdfBytes: Uint8Array): Promise<(PageInitialBoxes | null)[]> {
  const pages = await loadTextItemsPerPage(pdfBytes)
  return pages.map((items, pageIndex) => {
    const labels = items
      .map((item) => {
        const match = /^\s*(\d)\s*\.?\s*initial/i.exec(item.str)
        return match ? { n: Number(match[1]), item } : null
      })
      .filter((entry): entry is { n: number; item: TextItem } => entry !== null)
      .sort((a, b) => a.n - b.n)

    const label1 = labels.find((l) => l.n === 1)
    const label2 = labels.find((l) => l.n === 2)
    const label3 = labels.find((l) => l.n === 3)
    if (!label1 || !label2) return null

    const pitch12 = label2.item.x - label1.item.x
    const pitch23 = label3 ? label3.item.x - label2.item.x : pitch12

    const yTop = label1.item.y + label1.item.height
    const yBottom = yTop - INITIAL_BOX_HEIGHT

    return {
      pageIndex,
      director: {
        x0: label1.item.x - INITIAL_BOX_LABEL_INSET,
        x1: label2.item.x - INITIAL_BOX_LABEL_INSET,
        yTop,
        yBottom,
      },
      generalManager: {
        x0: label2.item.x - INITIAL_BOX_LABEL_INSET,
        x1: label2.item.x + pitch23 - INITIAL_BOX_LABEL_INSET,
        yTop,
        yBottom,
      },
    }
  })
}

/**
 * The actual bilingual "Tanda Tangan / Signature:" block — the blank space
 * *above* that caption (under the printed Name/Position) is where a person
 * signs, per the confirmed mockup. Scans every page; the first two
 * occurrences in reading order are the Director's and the GM's row. A third
 * occurrence (the Employee's own line) exists further down and is
 * deliberately excluded, matching the footer boxes' column-3 rule.
 */
export async function locateSignatureGaps(pdfBytes: Uint8Array): Promise<SignatureGapPair | null> {
  const pages = await loadTextItemsPerPage(pdfBytes)

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const items = pages[pageIndex]
    // Anchored at both ends: "Tanda Tangan"/"Tanda Tangan :" only, never the
    // unrelated word "tangani" inside running paragraph text ("...anda tanda
    // tangani untuk Perjanjian Kerja") — a real bug caught by testing against
    // the actual document rather than assumed from the mockup script alone.
    const idLabels = items
      .filter((item) => /^\s*tanda\s+tangan\s*:?\s*$/i.test(item.str))
      .sort((a, b) => b.y - a.y) // descending y = reading order, top of page first
    const enLabels = items
      .filter((item) => /^\s*signature\s*:?\s*$/i.test(item.str))
      .sort((a, b) => b.y - a.y)

    if (idLabels.length < 2 || enLabels.length < 2) continue

    const gapFor = (label: TextItem, column: readonly [number, number]): BoxGeometry => {
      const [x0, x1] = column
      const margin = 3
      const above = items
        .filter((item) => item.x >= x0 && item.x < x1 && item.y > label.y)
        .sort((a, b) => a.y - b.y)[0] // closest line above = smallest y greater than the label's
      const yTop = above ? above.y - above.height - margin : label.y + label.height + 40
      const yBottom = label.y + label.height + margin
      return { x0, x1, yTop, yBottom }
    }

    return {
      pageIndex,
      director: {
        indo: gapFor(idLabels[0], INDO_COLUMN),
        english: gapFor(enLabels[0], ENGLISH_COLUMN),
      },
      generalManager: {
        indo: gapFor(idLabels[1], INDO_COLUMN),
        english: gapFor(enLabels[1], ENGLISH_COLUMN),
      },
    }
  }
  return null
}

export interface SignatureMark {
  pageIndex: number
  box: BoxGeometry
  pngBytes: Uint8Array
  name: string
}

/**
 * Embeds each signature image inside its box (aspect-preserving, capped to
 * the box so a wide/tall drawn signature never spills over) and prints the
 * approver's name in the remaining space above it.
 */
export async function stampContractPdf(pdfBytes: Uint8Array, marks: SignatureMark[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const teal = rgb(0.055, 0.31, 0.28)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const nameSize = 6

  for (const mark of marks) {
    const page = pdfDoc.getPage(mark.pageIndex)
    const png = await pdfDoc.embedPng(mark.pngBytes)

    const { x0, x1, yTop, yBottom } = mark.box
    const boxWidth = x1 - x0
    const boxHeight = yTop - yBottom
    const nameHeight = 8
    const padding = 3

    const imageMaxWidth = boxWidth - padding * 2
    const imageMaxHeight = boxHeight - nameHeight - padding * 2
    const scale = Math.min(imageMaxWidth / png.width, imageMaxHeight / png.height, 1)
    const drawWidth = png.width * scale
    const drawHeight = png.height * scale

    page.drawImage(png, {
      x: x0 + (boxWidth - drawWidth) / 2,
      y: yBottom + padding,
      width: drawWidth,
      height: drawHeight,
    })

    const nameWidth = font.widthOfTextAtSize(mark.name, nameSize)
    page.drawText(mark.name, {
      x: x0 + (boxWidth - nameWidth) / 2,
      y: yTop - nameHeight,
      size: nameSize,
      font,
      color: teal,
    })
  }

  return pdfDoc.save()
}
