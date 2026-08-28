// Pins the F010 save gate against the exact payload portal/src/pages/FormPage.tsx
// posts — employment-application-form.md §4/§7 AC-1.
//
//   npm --prefix functions run build
//   npm test
//
// No emulator needed: parseApplicationForm / missingRequiredSections are pure.
// The bug this exists to stop is a client-side enum that drifts from the
// server's (a capitalised 'Good' made every save throw), and a completed form
// that still reports a missing section.
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { parseApplicationForm, missingRequiredSections } = require('../lib/recruitment/portal/applicationForm.js')

/** Exactly what FormPage.handleSave() sends for a fully completed form. */
function filledPayload(overrides = {}) {
  return {
    personalData: {
      fullName: 'Rina Putri',
      gender: 'female',
      placeOfBirth: 'Denpasar',
      dateOfBirth: '1998-04-12',
      nationality: 'Indonesia',
      maritalStatus: 'single',
      // The submitted value, not the display label — portal/src/labels.ts's
      // RELIGIONS is {value:'hindu', label:'Hindu'} and the <Select> posts the
      // value. The fixture said 'Hindu' and had failed every check here since
      // the enum landed; nothing ran it until `npm test` existed.
      religion: 'hindu',
      email: 'rina@example.com',
      phone: '081234567890',
    },
    address: { permanentAddress: 'Jl. Raya Ubud 12', domicileAddress: 'Jl. Raya Ubud 12' },
    formalEducation: [
      { schoolType: 'S1', institutionName: 'Udayana', city: 'Denpasar', major: 'Management', graduationYear: '2020' },
    ],
    informalEducation: [],
    training: [],
    languages: [{ language: 'Indonesian', speaking: 'good', reading: 'good', writing: 'good' }],
    workExperience: [],
    references: [],
    additionalQuestions: {
      knowsAboutCompany: 'Restaurant group in Bali.',
      willingToRelocate: true,
      willingToTravel: false,
      preferredEnvironment: 'field',
      willingToAttachReferenceLetter: true,
      referenceLetterDeclineReason: '',
      expectedRemuneration: '6000000',
    },
    sensitiveResponses: {
      seriousIllnessHistory: false,
      seriousIllnessDetail: '',
      criminalHistory: false,
      criminalHistoryDetail: '',
    },
    declarationAccepted: true,
    ...overrides,
  }
}

describe('F010 save gate', () => {
  test('a completed form parses and reports nothing missing', () => {
    const { form } = parseApplicationForm(filledPayload())
    assert.deepEqual(missingRequiredSections(form), [])
  })

  test('the language proficiency enum is lowercase — a capitalised value is rejected', () => {
    assert.throws(
      () => parseApplicationForm(filledPayload({ languages: [{ language: 'Indonesian', speaking: 'Good' }] })),
      /Speaking must be one of/,
    )
  })

  test('salary arrives as a number and never lands on the readable document', () => {
    const { form, sensitive } = parseApplicationForm(
      filledPayload({
        workExperience: [{ companyName: 'Warung A', position: 'Server', salary: 4500000 }],
      }),
    )
    assert.equal('salary' in form.workExperience[0], false)
    assert.equal(sensitive.workExperienceSalaries[0].salary, 4500000)
  })

  test('a blank education row does not satisfy Formal education', () => {
    const { form } = parseApplicationForm(
      filledPayload({
        formalEducation: [{ schoolType: '', institutionName: '', city: '', major: '', graduationYear: '' }],
      }),
    )
    assert.ok(missingRequiredSections(form).includes('Formal education'))
  })

  test('each gated field is named on its own', () => {
    const cases = [
      [{ personalData: { ...filledPayload().personalData, gender: '' } }, 'Personal information'],
      [{ address: { permanentAddress: '', domicileAddress: '' } }, 'Address'],
      [{ declarationAccepted: false }, 'Declaration'],
    ]
    for (const [override, expected] of cases) {
      const { form } = parseApplicationForm(filledPayload(override))
      assert.ok(missingRequiredSections(form).includes(expected), `${expected} not reported`)
    }
  })
})
