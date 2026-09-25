// Pins the Welcome Portal's field whitelist and submission validator —
// welcome-portal.md §4.2, §10.4 and §11.
//
//   npm --prefix functions run build
//   npm test
//
// No emulator needed: functions/src/hr/welcome/whitelist.ts is deliberately
// pure (no db, no Firestore types), so the exact code that backs
// saveWelcomeDraft/submitWelcomeForm runs here unchanged.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  pickWelcomeDraft,
  validateWelcomeSubmission,
  ageOn,
  WELCOME_FIELD_TO_EMPLOYEE,
  WELCOME_BANK_FIELDS,
  MAX_SUPPORTING_FILES,
} = require('../lib/hr/welcome/whitelist.js')
const { normalizePhone } = require('../lib/lib/phone.js')

const TODAY = '2026-09-25'

/** A submission with every required field correct — each test breaks one thing. */
function goodDraft(overrides = {}) {
  return {
    fullName: 'Kadek Puspitasari',
    placeOfBirth: 'Denpasar',
    birthDate: '1999-04-12',
    gender: 'female',
    religion: 'hindu',
    maritalStatus: 'single',
    bloodType: 'O',
    tshirtSize: 'M',
    motherName: 'Ni Wayan Sari',
    phone: '081234567890',
    personalEmail: 'Kadek@Example.com',
    permanentAddressKtp: 'Jl. Raya Uluwatu No. 1',
    domicileAddress: 'Jl. Pantai Berawa No. 9',
    emergencyContactName: 'Made Puspitasari',
    emergencyContactPhone: '+6281100002222',
    emergencyContactAddress: 'Jl. Raya Uluwatu No. 1',
    emergencyContactRelationship: 'parents',
    nik: '5103014204990001',
    npwp: '123456789012345',
    bankAccountName: 'kadek puspitasari',
    bankAccountNumber: '1234567890',
    ktpFileId: 'file-ktp',
    kkFileId: 'file-kk',
    ...overrides,
  }
}

function fieldsWithIssues(draft) {
  return validateWelcomeSubmission(draft, TODAY).issues.map((issue) => issue.field)
}

describe('phone normalisation', () => {
  test('0…, +62…, 62… and 0062… collapse to one number', () => {
    assert.equal(normalizePhone('081234567890'), '6281234567890')
    assert.equal(normalizePhone('+62 812-3456-7890'), '6281234567890')
    assert.equal(normalizePhone('6281234567890'), '6281234567890')
    assert.equal(normalizePhone('006281234567890'), '6281234567890')
  })
})

describe('pickWelcomeDraft — §4.2 whitelist', () => {
  test('keeps a whitelisted field and trims it', () => {
    const { draft, rejected } = pickWelcomeDraft({ fullName: '  Kadek  ' })
    assert.deepEqual(draft, { fullName: 'Kadek' })
    assert.deepEqual(rejected, [])
  })

  test('rejects a privileged field rather than ignoring it', () => {
    for (const field of ['salary', 'outletId', 'status', 'employeeNumber', 'onboardingStatus']) {
      const { draft, rejected } = pickWelcomeDraft({ [field]: 'x' })
      assert.deepEqual(draft, {}, `${field} must not survive`)
      assert.equal(rejected.length, 1, `${field} must be reported`)
      assert.equal(rejected[0].field, field)
    }
  })

  test('rejects an unknown field', () => {
    const { rejected } = pickWelcomeDraft({ notAField: 'x' })
    assert.equal(rejected[0].message, 'Unknown field.')
  })

  test('caps supporting files at the documented limit', () => {
    const { rejected } = pickWelcomeDraft({ supportingFileIds: ['a', 'b', 'c'] })
    assert.equal(rejected.length, 1)
    assert.match(rejected[0].message, new RegExp(`${MAX_SUPPORTING_FILES}`))
  })

  test('a partial step still saves — nothing is required here', () => {
    const { draft, rejected } = pickWelcomeDraft({ nik: '5103' })
    assert.deepEqual(draft, { nik: '5103' })
    assert.deepEqual(rejected, [])
  })

  test('bank fields are whitelisted but are not employee fields', () => {
    for (const field of WELCOME_BANK_FIELDS) {
      const { rejected } = pickWelcomeDraft({ [field]: 'x' })
      assert.deepEqual(rejected, [], `${field} must be accepted`)
      assert.ok(!(field in WELCOME_FIELD_TO_EMPLOYEE), `${field} must never map onto the employee document`)
    }
  })
})

describe('validateWelcomeSubmission — happy path', () => {
  test('maps spec field names onto the shipped employee fields', () => {
    const { employeeUpdates, bank, issues } = validateWelcomeSubmission(goodDraft(), TODAY)
    assert.deepEqual(issues, [])
    assert.equal(employeeUpdates.birthPlace, 'Denpasar')
    assert.equal(employeeUpdates.permanentAddress, 'Jl. Raya Uluwatu No. 1')
    assert.equal(employeeUpdates.nationalId, '5103014204990001')
    assert.equal(employeeUpdates.taxNumber, '123456789012345')
    assert.equal(employeeUpdates.email, 'kadek@example.com')
    // The spec's own names must not leak through onto the document.
    for (const specName of ['placeOfBirth', 'permanentAddressKtp', 'nik', 'npwp', 'personalEmail']) {
      assert.ok(!(specName in employeeUpdates), `${specName} is not a field on employees/{id}`)
    }
    assert.ok(!('bankAccountNumber' in employeeUpdates), '§10.4 — bank details never reach the employee doc')
    assert.equal(bank.bankAccountNumber, '1234567890')
  })

  test('normalises the two phone numbers and uppercases the account name', () => {
    const { employeeUpdates, bank } = validateWelcomeSubmission(goodDraft(), TODAY)
    assert.equal(employeeUpdates.phone, '6281234567890')
    assert.equal(employeeUpdates.emergencyContactPhone, '6281100002222')
    assert.equal(bank.bankAccountName, 'KADEK PUSPITASARI')
  })

  test('BPJS is optional — it may follow after the hire starts', () => {
    const { employeeUpdates, issues } = validateWelcomeSubmission(goodDraft(), TODAY)
    assert.deepEqual(issues, [])
    assert.equal(employeeUpdates.bpjsTk, null)
    assert.equal(employeeUpdates.bpjsKesehatan, null)
  })

  test('photo and supporting files are optional; KTP and KK are not', () => {
    assert.deepEqual(fieldsWithIssues(goodDraft({ photoFileId: undefined })), [])
    assert.deepEqual(fieldsWithIssues(goodDraft({ ktpFileId: undefined })), ['ktpFileId'])
    assert.deepEqual(fieldsWithIssues(goodDraft({ kkFileId: undefined })), ['kkFileId'])
  })
})

describe('validateWelcomeSubmission — §11 field rules', () => {
  test('NIK is exactly 16 digits', () => {
    assert.deepEqual(fieldsWithIssues(goodDraft({ nik: '510301420499000' })), ['nik'])
    assert.deepEqual(fieldsWithIssues(goodDraft({ nik: '51030142049900012' })), ['nik'])
    assert.deepEqual(fieldsWithIssues(goodDraft({ nik: '5103-0142-0499-0001' })), [], 'punctuation is stripped')
  })

  test('NPWP is 15 or 16 digits', () => {
    assert.deepEqual(fieldsWithIssues(goodDraft({ npwp: '1234567890123456' })), [])
    assert.deepEqual(fieldsWithIssues(goodDraft({ npwp: '12345678901234' })), ['npwp'])
  })

  test('the bank account number is exactly 10 digits — BCA only', () => {
    assert.deepEqual(fieldsWithIssues(goodDraft({ bankAccountNumber: '123456789' })), ['bankAccountNumber'])
    assert.deepEqual(fieldsWithIssues(goodDraft({ bankAccountNumber: '12345678901' })), ['bankAccountNumber'])
  })

  test('date of birth must be real and plausible', () => {
    assert.deepEqual(fieldsWithIssues(goodDraft({ birthDate: '12/04/1999' })), ['birthDate'])
    assert.deepEqual(fieldsWithIssues(goodDraft({ birthDate: '2024-01-01' })), ['birthDate'], 'too young')
    assert.deepEqual(fieldsWithIssues(goodDraft({ birthDate: '1900-01-01' })), ['birthDate'], 'too old')
  })

  test('"other" relationship requires the free-text field', () => {
    assert.deepEqual(fieldsWithIssues(goodDraft({ emergencyContactRelationship: 'other' })), [
      'emergencyContactRelationshipOther',
    ])
    const ok = goodDraft({ emergencyContactRelationship: 'other', emergencyContactRelationshipOther: 'Neighbour' })
    assert.deepEqual(fieldsWithIssues(ok), [])
  })

  test('a named relationship clears the free-text field', () => {
    const { employeeUpdates } = validateWelcomeSubmission(
      goodDraft({ emergencyContactRelationshipOther: 'leftover' }),
      TODAY,
    )
    assert.equal(employeeUpdates.emergencyContactRelationshipOther, null)
  })

  test('dropdowns reject a value outside their enum', () => {
    assert.deepEqual(fieldsWithIssues(goodDraft({ bloodType: 'C' })), ['bloodType'])
    assert.deepEqual(fieldsWithIssues(goodDraft({ maritalStatus: 'divorced' })), ['maritalStatus'])
    assert.deepEqual(fieldsWithIssues(goodDraft({ tshirtSize: 'XXXL' })), ['tshirtSize'])
  })

  test('reports every problem at once, not just the first', () => {
    const issues = fieldsWithIssues(goodDraft({ nik: '1', npwp: '2', bankAccountNumber: '3' }))
    assert.deepEqual(issues.sort(), ['bankAccountNumber', 'nik', 'npwp'])
  })

  test('a field that failed validation is never written half-way', () => {
    const { employeeUpdates } = validateWelcomeSubmission(goodDraft({ nik: 'nope' }), TODAY)
    assert.ok(!('nationalId' in employeeUpdates))
  })

  test('an empty draft fails on every required field and writes nothing', () => {
    const { employeeUpdates, issues } = validateWelcomeSubmission({}, TODAY)
    assert.ok(issues.length >= 18, `expected every required field to report, got ${issues.length}`)
    assert.ok(!('fullName' in employeeUpdates))
  })
})

describe('ageOn', () => {
  test('counts whole years, birthday inclusive', () => {
    assert.equal(ageOn('2000-09-25', '2026-09-25'), 26)
    assert.equal(ageOn('2000-09-26', '2026-09-25'), 25)
    assert.equal(ageOn('2000-12-31', '2026-01-01'), 25)
  })
})
