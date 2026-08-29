// Pins src/utils/csv.ts's delimiter sniffing — the shared parser behind every
// bulk import in the app (employees, payroll, attendance, equipment).
//
//   npm test
//
// No emulator and no build: Node 24 strips the type annotations, so this
// imports the real frontend module rather than a copy. It is the one test here
// that reaches into src/ — there is no frontend test runner in this repo, and
// a second one is not worth adding for a pure function.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

const { parseCsv, toCsv } = await import(new URL('../../src/utils/csv.ts', import.meta.url))

const HEADER = ['Full Name', 'Gender', 'Phone']
const ROW = ['Jane Doe', 'Female', '62812345678']

function join(delimiter) {
  return `${HEADER.join(delimiter)}\r\n${ROW.join(delimiter)}`
}

const EXPECTED = { 'Full Name': 'Jane Doe', Gender: 'Female', Phone: '62812345678' }

describe('parseCsv delimiter sniffing', () => {
  // Excel on an Indonesian/European locale saves .csv with the system list
  // separator. Parsed as commas, the whole line is one cell, the header is one
  // unmatchable key, and every column reads back empty — which surfaces as
  // "Full Name is required" on every row instead of "wrong delimiter".
  for (const [name, delimiter] of [
    ['comma', ','],
    ['semicolon', ';'],
    ['tab', '\t'],
  ]) {
    test(`${name}-separated file parses`, () => {
      assert.deepEqual(parseCsv(join(delimiter)), [EXPECTED])
    })
  }

  test('what toCsv writes is what parseCsv reads back', () => {
    const columns = HEADER.map((header) => ({ header, value: (row) => row[header] }))
    assert.deepEqual(parseCsv(toCsv([EXPECTED], columns)), [EXPECTED])
  })

  test('a quoted header comma does not out-vote the real separator', () => {
    const text = '"Name, Full";Gender\r\nJane;Female'
    assert.deepEqual(parseCsv(text), [{ 'Name, Full': 'Jane', Gender: 'Female' }])
  })

  test('a quoted cell containing the delimiter stays one cell', () => {
    const text = 'Name;Address\r\nJane;"Jl. Bakung Sari, Kuta"'
    assert.deepEqual(parseCsv(text), [{ Name: 'Jane', Address: 'Jl. Bakung Sari, Kuta' }])
  })

  // A UTF-8 BOM lands on the first header cell; trim() strips it (U+FEFF is
  // ECMAScript WhiteSpace), so this pins behaviour rather than adding it.
  test('a UTF-8 BOM does not break the first column', () => {
    assert.deepEqual(parseCsv(`﻿${join(',')}`), [EXPECTED])
  })

  test('single-column files still parse, defaulting to comma', () => {
    assert.deepEqual(parseCsv('Full Name\r\nJane Doe'), [{ 'Full Name': 'Jane Doe' }])
  })

  test('blank lines are skipped and a header-only file yields no rows', () => {
    assert.deepEqual(parseCsv('a;b\r\n\r\n1;2\r\n\r\n'), [{ a: '1', b: '2' }])
    assert.deepEqual(parseCsv('a;b'), [])
  })
})
