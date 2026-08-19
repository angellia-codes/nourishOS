import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Checkbox, Field, Input, Notice, RowList, Select, Textarea } from '../ui'
import { getApplicationStatus, saveApplicationForm } from '../api'
import { DECLARATION_EN, DECLARATION_ID } from '../labels'
import { readToken } from '../token'

/**
 * F010 Employment Application Form — candidate_portal.md §15 Screen 4,
 * employment-application-form.md §4.
 *
 * One page rather than a five-step wizard: the whole form is saved on every
 * "Save & continue" (the callable is idempotent), so there is no partial state
 * to reconcile and no step order to get wrong. Every repeatable section adds
 * and removes rows freely — §7 AC-4 forbids the paper form's fixed row counts.
 */

interface EducationRow {
  schoolType: string
  institutionName: string
  city: string
  major: string
  graduationYear: string
}

interface WorkRow {
  companyName: string
  companyType: string
  periodStart: string
  periodEnd: string
  position: string
  superiorName: string
  reasonForResignation: string
  salary: string
}

interface LanguageRow {
  language: string
  speaking: string
  reading: string
  writing: string
}

interface ReferenceRow {
  name: string
  phone: string
  company: string
  department: string
  position: string
  relationship: string
}

const BLANK_EDUCATION: EducationRow = { schoolType: '', institutionName: '', city: '', major: '', graduationYear: '' }
const BLANK_WORK: WorkRow = {
  companyName: '',
  companyType: '',
  periodStart: '',
  periodEnd: '',
  position: '',
  superiorName: '',
  reasonForResignation: '',
  salary: '',
}
const BLANK_LANGUAGE: LanguageRow = { language: '', speaking: 'Good', reading: 'Good', writing: 'Good' }
const BLANK_REFERENCE: ReferenceRow = {
  name: '',
  phone: '',
  company: '',
  department: '',
  position: '',
  relationship: '',
}

/** What getApplicationStatus returns for a resumed application — everything optional, because a draft is. */
interface SavedForm {
  personalData?: Partial<Record<keyof typeof BLANK_PERSONAL, string>>
  address?: { permanentAddress?: string; domicileAddress?: string }
  formalEducation?: EducationRow[]
  informalEducation?: EducationRow[]
  training?: { name: string; organizerLocation: string; monthYear: string }[]
  languages?: LanguageRow[]
  workExperience?: Partial<WorkRow>[]
  references?: ReferenceRow[]
  additionalQuestions?: Record<string, never>
  declarationAccepted?: boolean
}

const PROFICIENCIES = ['excellent', 'good', 'basic']

const BLANK_PERSONAL = {
  fullName: '',
  gender: '',
  placeOfBirth: '',
  dateOfBirth: '',
  nationality: 'Indonesia',
  maritalStatus: '',
  religion: '',
  email: '',
  phone: '',
}

export function FormPage() {
  const navigate = useNavigate()
  const token = readToken()

  const [personal, setPersonal] = useState({ ...BLANK_PERSONAL })
  const [address, setAddress] = useState({ permanentAddress: '', domicileAddress: '' })
  const [formalEducation, setFormalEducation] = useState<EducationRow[]>([{ ...BLANK_EDUCATION }])
  const [informalEducation, setInformalEducation] = useState<EducationRow[]>([])
  const [training, setTraining] = useState<{ name: string; organizerLocation: string; monthYear: string }[]>([])
  const [languages, setLanguages] = useState<LanguageRow[]>([{ ...BLANK_LANGUAGE, language: 'Indonesian' }])
  const [workExperience, setWorkExperience] = useState<WorkRow[]>([])
  const [references, setReferences] = useState<ReferenceRow[]>([])
  const [additional, setAdditional] = useState({
    knowsAboutCompany: '',
    willingToRelocate: false,
    willingToTravel: false,
    preferredEnvironment: '',
    willingToAttachReferenceLetter: false,
    referenceLetterDeclineReason: '',
    expectedRemuneration: '',
  })
  const [sensitive, setSensitive] = useState({
    seriousIllnessHistory: false,
    seriousIllnessDetail: '',
    criminalHistory: false,
    criminalHistoryDetail: '',
  })
  const [declarationAccepted, setDeclarationAccepted] = useState(false)

  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) {
      navigate('/', { replace: true })
      return
    }
    // Resume: the server holds the last save, so a new device picks up where
    // the old one stopped. Sensitive answers are never returned, so those
    // three fields start blank on a resumed device by design.
    getApplicationStatus(token)
      .then((status) => {
        const form = status.applicationForm as SavedForm | null
        if (!form) {
          setPersonal((current) => ({ ...current, fullName: status.fullName }))
          return
        }
        if (form.personalData) setPersonal((current) => ({ ...current, ...form.personalData }))
        if (form.address) setAddress((current) => ({ ...current, ...form.address }))
        if (form.formalEducation?.length) setFormalEducation(form.formalEducation)
        if (form.informalEducation) setInformalEducation(form.informalEducation)
        if (form.training) setTraining(form.training)
        if (form.languages?.length) setLanguages(form.languages)
        if (form.workExperience) setWorkExperience(form.workExperience.map((row) => ({ ...BLANK_WORK, ...row })))
        if (form.references) setReferences(form.references)
        if (form.additionalQuestions) setAdditional((current) => ({ ...current, ...form.additionalQuestions }))
        setDeclarationAccepted(Boolean(form.declarationAccepted))
      })
      .catch((problem: Error) => setError(problem.message))
  }, [token, navigate])

  async function handleSave() {
    if (!token) return
    setBusy(true)
    setError('')
    try {
      const result = await saveApplicationForm(token, {
        personalData: personal,
        address,
        formalEducation,
        informalEducation,
        training,
        languages,
        workExperience: workExperience.map((row) => ({
          ...row,
          salary: row.salary ? Number(row.salary) : undefined,
        })),
        references,
        additionalQuestions: additional,
        sensitiveResponses: sensitive,
        declarationAccepted,
      })
      if (result.missing.length > 0) {
        setError(`Saved. Still to complete: ${result.missing.join(', ')}.`)
        return
      }
      navigate('/apply/documents')
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not save your form.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Employment Application Form</h1>
      {error && <Notice tone={error.startsWith('Saved') ? 'info' : 'error'}>{error}</Notice>}

      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Personal Information</h2>
        <Field label="Full name">
          <Input value={personal.fullName} onChange={(e) => setPersonal({ ...personal, fullName: e.target.value })} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Gender">
            <Select value={personal.gender} onChange={(e) => setPersonal({ ...personal, gender: e.target.value })}>
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </Select>
          </Field>
          <Field label="Date of birth">
            <Input
              type="date"
              value={personal.dateOfBirth}
              onChange={(e) => setPersonal({ ...personal, dateOfBirth: e.target.value })}
            />
          </Field>
          <Field label="Place of birth">
            <Input
              value={personal.placeOfBirth}
              onChange={(e) => setPersonal({ ...personal, placeOfBirth: e.target.value })}
            />
          </Field>
          <Field label="Nationality">
            <Input
              value={personal.nationality}
              onChange={(e) => setPersonal({ ...personal, nationality: e.target.value })}
            />
          </Field>
          <Field label="Marital status">
            <Input
              value={personal.maritalStatus}
              onChange={(e) => setPersonal({ ...personal, maritalStatus: e.target.value })}
            />
          </Field>
          <Field label="Religion">
            <Input value={personal.religion} onChange={(e) => setPersonal({ ...personal, religion: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={personal.phone} onChange={(e) => setPersonal({ ...personal, phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={personal.email}
              onChange={(e) => setPersonal({ ...personal, email: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Permanent address">
          <Textarea
            rows={2}
            value={address.permanentAddress}
            onChange={(e) => setAddress({ ...address, permanentAddress: e.target.value })}
          />
        </Field>
        <Field label="Current address">
          <Textarea
            rows={2}
            value={address.domicileAddress}
            onChange={(e) => setAddress({ ...address, domicileAddress: e.target.value })}
          />
        </Field>
      </Card>

      <Card>
        <RowList
          title="Formal Education"
          rows={formalEducation}
          onAdd={() => setFormalEducation([...formalEducation, { ...BLANK_EDUCATION }])}
          onRemove={(index) => setFormalEducation(formalEducation.filter((_, i) => i !== index))}
        >
          {(index) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Level">
                <Input
                  value={formalEducation[index].schoolType}
                  onChange={(e) => setFormalEducation(patch(formalEducation, index, { schoolType: e.target.value }))}
                />
              </Field>
              <Field label="Institution">
                <Input
                  value={formalEducation[index].institutionName}
                  onChange={(e) =>
                    setFormalEducation(patch(formalEducation, index, { institutionName: e.target.value }))
                  }
                />
              </Field>
              <Field label="City">
                <Input
                  value={formalEducation[index].city}
                  onChange={(e) => setFormalEducation(patch(formalEducation, index, { city: e.target.value }))}
                />
              </Field>
              <Field label="Major">
                <Input
                  value={formalEducation[index].major}
                  onChange={(e) => setFormalEducation(patch(formalEducation, index, { major: e.target.value }))}
                />
              </Field>
              <Field label="Graduation Year">
                <Input
                  value={formalEducation[index].graduationYear}
                  onChange={(e) =>
                    setFormalEducation(patch(formalEducation, index, { graduationYear: e.target.value }))
                  }
                />
              </Field>
            </div>
          )}
        </RowList>
      </Card>

      <Card>
        <RowList
          title="Courses & Training"
          rows={training}
          onAdd={() => setTraining([...training, { name: '', organizerLocation: '', monthYear: '' }])}
          onRemove={(index) => setTraining(training.filter((_, i) => i !== index))}
        >
          {(index) => (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Name">
                <Input
                  value={training[index].name}
                  onChange={(e) => setTraining(patch(training, index, { name: e.target.value }))}
                />
              </Field>
              <Field label="Organizer / Location">
                <Input
                  value={training[index].organizerLocation}
                  onChange={(e) => setTraining(patch(training, index, { organizerLocation: e.target.value }))}
                />
              </Field>
              <Field label="Month / Year">
                <Input
                  value={training[index].monthYear}
                  onChange={(e) => setTraining(patch(training, index, { monthYear: e.target.value }))}
                />
              </Field>
            </div>
          )}
        </RowList>
      </Card>

      <Card>
        <RowList
          title="Work Experience"
          rows={workExperience}
          onAdd={() => setWorkExperience([...workExperience, { ...BLANK_WORK }])}
          onRemove={(index) => setWorkExperience(workExperience.filter((_, i) => i !== index))}
        >
          {(index) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Company">
                <Input
                  value={workExperience[index].companyName}
                  onChange={(e) => setWorkExperience(patch(workExperience, index, { companyName: e.target.value }))}
                />
              </Field>
              <Field label="Type of Business">
                <Input
                  value={workExperience[index].companyType}
                  onChange={(e) => setWorkExperience(patch(workExperience, index, { companyType: e.target.value }))}
                />
              </Field>
              <Field label="Position">
                <Input
                  value={workExperience[index].position}
                  onChange={(e) => setWorkExperience(patch(workExperience, index, { position: e.target.value }))}
                />
              </Field>
              <Field label="Supervisor's Name">
                <Input
                  value={workExperience[index].superiorName}
                  onChange={(e) => setWorkExperience(patch(workExperience, index, { superiorName: e.target.value }))}
                />
              </Field>
              <Field label="From" hint="YYYY-MM">
                <Input
                  value={workExperience[index].periodStart}
                  onChange={(e) => setWorkExperience(patch(workExperience, index, { periodStart: e.target.value }))}
                />
              </Field>
              <Field label="To" hint="YYYY-MM, blank if current">
                <Input
                  value={workExperience[index].periodEnd}
                  onChange={(e) => setWorkExperience(patch(workExperience, index, { periodEnd: e.target.value }))}
                />
              </Field>
              <Field label="Last Salary (optional)" hint="Only HR can see this.">
                <Input
                  inputMode="numeric"
                  value={workExperience[index].salary}
                  onChange={(e) => setWorkExperience(patch(workExperience, index, { salary: e.target.value }))}
                />
              </Field>
              <Field label="Reason for Leaving">
                <Input
                  value={workExperience[index].reasonForResignation}
                  onChange={(e) =>
                    setWorkExperience(patch(workExperience, index, { reasonForResignation: e.target.value }))
                  }
                />
              </Field>
            </div>
          )}
        </RowList>
      </Card>

      <Card>
        <RowList
          title="Languages"
          rows={languages}
          onAdd={() => setLanguages([...languages, { ...BLANK_LANGUAGE }])}
          onRemove={(index) => setLanguages(languages.filter((_, i) => i !== index))}
        >
          {(index) => (
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Language">
                <Input
                  value={languages[index].language}
                  onChange={(e) => setLanguages(patch(languages, index, { language: e.target.value }))}
                />
              </Field>
              {(['speaking', 'reading', 'writing'] as const).map((skill) => (
                <Field key={skill} label={skill[0].toUpperCase() + skill.slice(1)}>
                  <Select
                    value={languages[index][skill]}
                    onChange={(e) => setLanguages(patch(languages, index, { [skill]: e.target.value }))}
                  >
                    {PROFICIENCIES.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}
            </div>
          )}
        </RowList>
      </Card>

      <Card>
        <RowList
          title="References"
          rows={references}
          onAdd={() => setReferences([...references, { ...BLANK_REFERENCE }])}
          onRemove={(index) => setReferences(references.filter((_, i) => i !== index))}
        >
          {(index) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name">
                <Input
                  value={references[index].name}
                  onChange={(e) => setReferences(patch(references, index, { name: e.target.value }))}
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={references[index].phone}
                  onChange={(e) => setReferences(patch(references, index, { phone: e.target.value }))}
                />
              </Field>
              <Field label="Company">
                <Input
                  value={references[index].company}
                  onChange={(e) => setReferences(patch(references, index, { company: e.target.value }))}
                />
              </Field>
              <Field label="Position">
                <Input
                  value={references[index].position}
                  onChange={(e) => setReferences(patch(references, index, { position: e.target.value }))}
                />
              </Field>
              <Field label="Relationship">
                <Input
                  value={references[index].relationship}
                  onChange={(e) => setReferences(patch(references, index, { relationship: e.target.value }))}
                />
              </Field>
            </div>
          )}
        </RowList>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">A few more questions</h2>
        <Field label="What do you know about Nourish Group Indonesia?">
          <Textarea
            rows={3}
            value={additional.knowsAboutCompany}
            onChange={(e) => setAdditional({ ...additional, knowsAboutCompany: e.target.value })}
          />
        </Field>
        
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Preferred Work Environment">
            <Select
              value={additional.preferredEnvironment}
              onChange={(e) => setAdditional({ ...additional, preferredEnvironment: e.target.value })}
            >
              <option value="">Select…</option>
              <option value="office">Office</option>
              <option value="field">Field / Outlet</option>
            </Select>
          </Field>
          <Field label="Expected Salary">
            <Input
              value={additional.expectedRemuneration}
              onChange={(e) => setAdditional({ ...additional, expectedRemuneration: e.target.value })}
            />
          </Field>
        </div>
        <Checkbox
          label="I am willing to be placed at any of our outlets"
          checked={additional.willingToRelocate}
          onChange={(value) => setAdditional({ ...additional, willingToRelocate: value })}
        />
        <Checkbox
          label="I am willing to travel between outlets"
          checked={additional.willingToTravel}
          onChange={(value) => setAdditional({ ...additional, willingToTravel: value })}
        />
        <Checkbox
          label="I can provide a reference letter from a previous employer"
          checked={additional.willingToAttachReferenceLetter}
          onChange={(value) => setAdditional({ ...additional, willingToAttachReferenceLetter: value })}
        />
        {!additional.willingToAttachReferenceLetter && (
          <Field label="If not, why?">
            <Input
              value={additional.referenceLetterDeclineReason}
              onChange={(e) => setAdditional({ ...additional, referenceLetterDeclineReason: e.target.value })}
            />
          </Field>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Health & Background</h2>
        <p className="text-sm text-muted-foreground">Only the HR Manager can see these answers.</p>
        <Checkbox
          label="I have a history of serious illness"
          checked={sensitive.seriousIllnessHistory}
          onChange={(value) => setSensitive({ ...sensitive, seriousIllnessHistory: value })}
        />
        {sensitive.seriousIllnessHistory && (
          <Field label="When, and what illness?">
            <Input
              value={sensitive.seriousIllnessDetail}
              onChange={(e) => setSensitive({ ...sensitive, seriousIllnessDetail: e.target.value })}
            />
          </Field>
        )}
        <Checkbox
          label="I have been involved in a criminal case"
          checked={sensitive.criminalHistory}
          onChange={(value) => setSensitive({ ...sensitive, criminalHistory: value })}
        />
        {sensitive.criminalHistory && (
          <Field label="When, and what for?">
            <Input
              value={sensitive.criminalHistoryDetail}
              onChange={(e) => setSensitive({ ...sensitive, criminalHistoryDetail: e.target.value })}
            />
          </Field>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Declaration</h2>
        <p className="text-sm text-muted-foreground">{DECLARATION_ID}</p>
        <p className="text-sm text-muted-foreground">{DECLARATION_EN}</p>
        <Checkbox
          label="I have read and accept the declaration above."
          checked={declarationAccepted}
          onChange={setDeclarationAccepted}
        />
      </Card>

      <div className="flex justify-end gap-2 pb-8">
        <Button onClick={handleSave} loading={busy}>
          Save & Continue
        </Button>
      </div>
    </>
  )
}

function patch<T>(rows: T[], index: number, changes: Partial<T>): T[] {
  return rows.map((row, i) => (i === index ? { ...row, ...changes } : row))
}

function replaceAt(values: string[], index: number, value: string): string[] {
  return values.map((current, i) => (i === index ? value : current))
}
