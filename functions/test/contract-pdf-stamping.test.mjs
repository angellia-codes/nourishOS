// Pins the geometry detectors in src/hr/contracts/pdfStamping.ts against a
// synthetic fixture built in-memory (no real employee data ever touches this
// repo) that reproduces the shape of the real PKWT/PKWTT template this was
// designed against: a repeating "1.Initial / 2. Initial / 3. Initial" footer
// on every page, plus a bilingual "Tanda Tangan / Signature:" block with a
// deliberately similar-but-different phrase ("tanda tangani...") nearby —
// the exact false-positive this test caught during development, where the
// unanchored regex matched a paragraph sentence instead of only the caption.
//
//   npm --prefix functions run build
//   npm test
//
// No emulator needed — every function here takes PDF bytes and returns pure
// data; nothing touches Firestore or Storage.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const require = createRequire(import.meta.url)
const { locateInitialBoxes, locateSignatureGaps, stampContractPdf } = require('../lib/hr/contracts/pdfStamping.js')

// A valid, minimal 1x1 transparent PNG — a well-known public byte sequence,
// used only so stampContractPdf has something real to embed.
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

async function buildFixturePdf() {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const black = rgb(0, 0, 0)

  function drawFooter(page) {
    // Matches the real template's relative spacing closely enough for the
    // pitch-based column-width heuristic to produce sane, ordered boxes.
    page.drawText('1.Initial', { x: 414, y: 106, size: 8.4, font, color: black })
    page.drawText('2. Initial', { x: 477, y: 106, size: 8.4, font, color: black })
    page.drawText('3. Initial', { x: 533, y: 106, size: 8.4, font, color: black })
  }

  const page1 = doc.addPage([612, 792])
  page1.drawText('Clause 1. This is a sample clause about tanda tangani obligations.', {
    x: 50,
    y: 700,
    size: 8,
    font,
    color: black,
  })
  drawFooter(page1)

  const page2 = doc.addPage([612, 792])
  // Director block (Indonesian + English), with a blank gap above the caption.
  page2.drawText('Nama : Test Director', { x: 53, y: 600, size: 8, font, color: black })
  page2.drawText('Name : Test Director', { x: 312, y: 600, size: 8, font, color: black })
  page2.drawText('Tanda Tangan', { x: 53, y: 526, size: 8, font, color: black })
  page2.drawText('Signature:', { x: 312, y: 526, size: 8, font, color: black })

  // GM block.
  page2.drawText('Nama : Test GM', { x: 53, y: 460, size: 8, font, color: black })
  page2.drawText('Name : Test GM', { x: 312, y: 460, size: 8, font, color: black })
  page2.drawText('Tanda Tangan :', { x: 53, y: 388, size: 8, font, color: black })
  page2.drawText('Signature:', { x: 312, y: 388, size: 8, font, color: black })

  // Employee's own block — must never be picked up (only the first two
  // occurrences are used).
  page2.drawText('Tanda Tangan :', { x: 53, y: 250, size: 8, font, color: black })
  page2.drawText('Signature:', { x: 312, y: 250, size: 8, font, color: black })

  // The exact false-positive this module used to catch: a body sentence
  // containing "tanda tangani" (a different word than the "Tanda Tangan"
  // caption), positioned well above the real captions so a wrong match
  // would produce an obviously wrong (huge) gap.
  page2.drawText('PT Company witnesses your tanda tangani of this agreement.', {
    x: 53,
    y: 650,
    size: 8,
    font,
    color: black,
  })

  drawFooter(page2)

  return doc.save()
}

describe('locateInitialBoxes', () => {
  test('finds ordered, non-overlapping boxes on every page', async () => {
    const pdfBytes = await buildFixturePdf()
    const boxes = await locateInitialBoxes(pdfBytes)

    assert.equal(boxes.length, 2)
    for (const page of boxes) {
      assert.notEqual(page, null)
      assert.ok(page.director.x0 < page.director.x1)
      assert.ok(page.generalManager.x0 < page.generalManager.x1)
      // Director (column 1) sits to the left of the General Manager (column 2).
      assert.ok(page.director.x1 <= page.generalManager.x0 + 0.01)
      assert.ok(page.director.yTop > page.director.yBottom)
    }
  })
})

describe('locateSignatureGaps', () => {
  test('locates the Director then the GM row, skipping the Employee row and the false-positive sentence', async () => {
    const pdfBytes = await buildFixturePdf()
    const gap = await locateSignatureGaps(pdfBytes)

    assert.notEqual(gap, null)
    assert.equal(gap.pageIndex, 1)

    // Director's row sits above the GM's row (larger y = higher on the page).
    assert.ok(gap.director.indo.yBottom > gap.generalManager.indo.yBottom)

    // Neither box balloons up to the false-positive sentence at y=650 —
    // a regression guard for the exact bug this module shipped with once.
    assert.ok(gap.director.indo.yTop < 650)
    assert.ok(gap.director.english.yTop < 650)

    // Both boxes are a sane, non-trivial size — not the ~5pt sliver a
    // wrong-anchor match would have produced.
    assert.ok(gap.director.indo.yTop - gap.director.indo.yBottom > 20)
    assert.ok(gap.generalManager.indo.yTop - gap.generalManager.indo.yBottom > 20)
  })

  test('returns null when the template has no recognizable signature block', async () => {
    const doc = await PDFDocument.create()
    doc.addPage([612, 792])
    const pdfBytes = await doc.save()

    assert.equal(await locateSignatureGaps(pdfBytes), null)
  })
})

describe('stampContractPdf', () => {
  test('embeds an image into every requested box without throwing', async () => {
    const pdfBytes = await buildFixturePdf()
    const boxes = await locateInitialBoxes(pdfBytes)

    const stamped = await stampContractPdf(pdfBytes, [
      { pageIndex: 0, box: boxes[0].director, pngBytes: ONE_PIXEL_PNG, name: 'Test Director' },
      { pageIndex: 0, box: boxes[0].generalManager, pngBytes: ONE_PIXEL_PNG, name: 'Test GM' },
    ])

    assert.ok(stamped.byteLength > pdfBytes.byteLength)
    // The result is itself a valid, loadable PDF with the same page count.
    const reloaded = await PDFDocument.load(stamped)
    assert.equal(reloaded.getPageCount(), 2)
  })
})
