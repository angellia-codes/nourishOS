import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, ShieldAlert, Trash2 } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Textarea } from '@/components/ui'
import { useToast } from '@/hooks'
import { POSITION_LABELS, type PositionId } from '@/constants/positions'
import { type RecruitmentSource } from './candidatePipelineDemoData'
import { CANDIDATE_SOURCE_LABELS } from './candidatePipelineFormat'

type LanguageLevel = 'excellent' | 'good' | 'basic'
type YesNo = 'yes' | 'no'

interface EducationRow {
  id: string
  institutionName: string
  major: string
  graduationYear: string
}

interface LanguageRow {
  id: string
  language: string
  speaking: LanguageLevel
  reading: LanguageLevel
  writing: LanguageLevel
}

interface WorkExperienceRow {
  id: string
  companyName: string
  position: string
  periodStart: string
  periodEnd: string
  reasonForResignation: string
  salary: string
}

interface ReferenceRow {
  id: string
  name: string
  phone: string
  company: string
  relationship: string
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

const LEVEL_OPTIONS: LanguageLevel[] = ['excellent', 'good', 'basic']

/**
 * Employment Application (digitized F010, full-time candidates) —
 * employment-application-form.md §4. Repeatable blocks have no fixed row cap
 * (AC-4); illness/criminal/salary answers are flagged as
 * candidates.view_sensitive (§3). Mock only; submit shows a toast.
 */
export function EmploymentApplicationFormDemoPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [recruitmentSource, setRecruitmentSource] = useState<RecruitmentSource>('jobPortal')
  const [positionApplied, setPositionApplied] = useState<PositionId>(Object.keys(POSITION_LABELS)[0] as PositionId)
  const [fullName, setFullName] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('female')
  const [placeOfBirth, setPlaceOfBirth] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [religion, setReligion] = useState('')
  const [maritalStatus, setMaritalStatus] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [permanentAddress, setPermanentAddress] = useState('')
  const [domicileAddress, setDomicileAddress] = useState('')
  const [education, setEducation] = useState<EducationRow[]>([
    { id: newId('edu'), institutionName: '', major: '', graduationYear: '' },
  ])
  const [languages, setLanguages] = useState<LanguageRow[]>([
    { id: newId('lang'), language: 'Indonesian', speaking: 'excellent', reading: 'excellent', writing: 'excellent' },
  ])
  const [workExperience, setWorkExperience] = useState<WorkExperienceRow[]>([])
  const [seriousIllness, setSeriousIllness] = useState<YesNo>('no')
  const [seriousIllnessDetail, setSeriousIllnessDetail] = useState('')
  const [criminalHistory, setCriminalHistory] = useState<YesNo>('no')
  const [criminalHistoryDetail, setCriminalHistoryDetail] = useState('')
  const [willingToRelocate, setWillingToRelocate] = useState<YesNo>('yes')
  const [willingToTravel, setWillingToTravel] = useState<YesNo>('yes')
  const [preferredEnvironment, setPreferredEnvironment] = useState<'office' | 'field'>('office')
  const [expectedRemuneration, setExpectedRemuneration] = useState('')
  const [references, setReferences] = useState<ReferenceRow[]>([])
  const [declarationAccepted, setDeclarationAccepted] = useState<YesNo>('no')

  const canSubmit =
    fullName.trim() !== '' &&
    dateOfBirth !== '' &&
    email.trim() !== '' &&
    phone.trim() !== '' &&
    permanentAddress.trim() !== '' &&
    (seriousIllness === 'no' || seriousIllnessDetail.trim() !== '') &&
    (criminalHistory === 'no' || criminalHistoryDetail.trim() !== '') &&
    declarationAccepted === 'yes'

  function handleSubmit() {
    if (!canSubmit) return
    toast.success(
      `Application submitted for ${POSITION_LABELS[positionApplied] ?? positionApplied} (demo) — candidate would enter the pipeline at ST-01. Nothing was written to a backend.`,
    )
    navigate('/demo/hr/pipeline')
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. Submitting shows a toast and returns to the pipeline; nothing is persisted.
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/demo/hr/pipeline')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Employment Application — F010</h1>
            <p className="text-sm text-muted-foreground">Full-time candidate intake (fuller than the quick Add Candidate form)</p>
          </div>
        </div>

        {/* Vacancy Information */}
        <Card>
          <CardHeader>
            <CardTitle>Vacancy Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appSource">How did you hear about this vacancy? *</Label>
              <Select
                id="appSource"
                value={recruitmentSource}
                onChange={(e) => setRecruitmentSource(e.target.value as RecruitmentSource)}
              >
                {Object.entries(CANDIDATE_SOURCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appPosition">Position Applied *</Label>
              <Select id="appPosition" value={positionApplied} onChange={(e) => setPositionApplied(e.target.value as PositionId)}>
                {Object.entries(POSITION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Personal Data + Address */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Data</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="appFullName">Full Name (per ID) *</Label>
              <Input id="appFullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appGender">Gender *</Label>
              <Select id="appGender" value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female')}>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appDob">Date of Birth *</Label>
              <Input id="appDob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appPob">Place of Birth</Label>
              <Input id="appPob" value={placeOfBirth} onChange={(e) => setPlaceOfBirth(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appReligion">Religion</Label>
              <Input id="appReligion" value={religion} onChange={(e) => setReligion(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appMarital">Marital Status</Label>
              <Input id="appMarital" value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appPhone">Phone (62xxx) *</Label>
              <Input id="appPhone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="appEmail">Email *</Label>
              <Input id="appEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="appPermanent">Permanent Address *</Label>
              <Textarea
                id="appPermanent"
                className="min-h-[60px]"
                value={permanentAddress}
                onChange={(e) => setPermanentAddress(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="appDomicile">Domicile Address</Label>
              <Textarea
                id="appDomicile"
                className="min-h-[60px]"
                placeholder="If different from permanent address"
                value={domicileAddress}
                onChange={(e) => setDomicileAddress(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Formal Education — repeatable */}
        <Card>
          <CardHeader>
            <CardTitle>Formal Education</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {education.map((row) => (
              <div key={row.id} className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center">
                <Input
                  placeholder="Institution"
                  value={row.institutionName}
                  onChange={(e) =>
                    setEducation((prev) => prev.map((r) => (r.id === row.id ? { ...r, institutionName: e.target.value } : r)))
                  }
                />
                <Input
                  placeholder="Major"
                  value={row.major}
                  onChange={(e) => setEducation((prev) => prev.map((r) => (r.id === row.id ? { ...r, major: e.target.value } : r)))}
                />
                <Input
                  placeholder="Graduation year"
                  className="sm:max-w-[140px]"
                  value={row.graduationYear}
                  onChange={(e) =>
                    setEducation((prev) => prev.map((r) => (r.id === row.id ? { ...r, graduationYear: e.target.value } : r)))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setEducation((prev) => prev.filter((r) => r.id !== row.id))}
                  aria-label="Remove education row"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={() => setEducation((prev) => [...prev, { id: newId('edu'), institutionName: '', major: '', graduationYear: '' }])}
            >
              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Add Education
            </Button>
          </CardContent>
        </Card>

        {/* Languages — repeatable */}
        <Card>
          <CardHeader>
            <CardTitle>Languages</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {languages.map((row) => (
              <div key={row.id} className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_repeat(3,110px)_40px] sm:items-center">
                <Input
                  placeholder="Language"
                  value={row.language}
                  onChange={(e) => setLanguages((prev) => prev.map((r) => (r.id === row.id ? { ...r, language: e.target.value } : r)))}
                />
                {(['speaking', 'reading', 'writing'] as const).map((skill) => (
                  <Select
                    key={skill}
                    aria-label={`${skill} level`}
                    value={row[skill]}
                    onChange={(e) =>
                      setLanguages((prev) =>
                        prev.map((r) => (r.id === row.id ? { ...r, [skill]: e.target.value as LanguageLevel } : r)),
                      )
                    }
                  >
                    {LEVEL_OPTIONS.map((level) => (
                      <option key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </option>
                    ))}
                  </Select>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setLanguages((prev) => prev.filter((r) => r.id !== row.id))}
                  aria-label="Remove language row"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Columns: Speaking · Reading · Writing</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={() =>
                setLanguages((prev) => [
                  ...prev,
                  { id: newId('lang'), language: '', speaking: 'basic', reading: 'basic', writing: 'basic' },
                ])
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Add Language
            </Button>
          </CardContent>
        </Card>

        {/* Work Experience — repeatable, salary sensitive */}
        <Card>
          <CardHeader>
            <CardTitle>Work Experience</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {workExperience.map((row) => (
              <div key={row.id} className="flex flex-col gap-2 rounded-md border border-border p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Company"
                    value={row.companyName}
                    onChange={(e) =>
                      setWorkExperience((prev) => prev.map((r) => (r.id === row.id ? { ...r, companyName: e.target.value } : r)))
                    }
                  />
                  <Input
                    placeholder="Position"
                    value={row.position}
                    onChange={(e) =>
                      setWorkExperience((prev) => prev.map((r) => (r.id === row.id ? { ...r, position: e.target.value } : r)))
                    }
                  />
                  <Input
                    type="month"
                    aria-label="Period start"
                    value={row.periodStart}
                    onChange={(e) =>
                      setWorkExperience((prev) => prev.map((r) => (r.id === row.id ? { ...r, periodStart: e.target.value } : r)))
                    }
                  />
                  <Input
                    type="month"
                    aria-label="Period end"
                    value={row.periodEnd}
                    onChange={(e) =>
                      setWorkExperience((prev) => prev.map((r) => (r.id === row.id ? { ...r, periodEnd: e.target.value } : r)))
                    }
                  />
                  <Input
                    placeholder="Reason for resignation"
                    value={row.reasonForResignation}
                    onChange={(e) =>
                      setWorkExperience((prev) =>
                        prev.map((r) => (r.id === row.id ? { ...r, reasonForResignation: e.target.value } : r)),
                      )
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Total salary (IDR) — sensitive"
                    value={row.salary}
                    onChange={(e) =>
                      setWorkExperience((prev) => prev.map((r) => (r.id === row.id ? { ...r, salary: e.target.value } : r)))
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="self-end"
                  onClick={() => setWorkExperience((prev) => prev.filter((r) => r.id !== row.id))}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={() =>
                setWorkExperience((prev) => [
                  ...prev,
                  { id: newId('work'), companyName: '', position: '', periodStart: '', periodEnd: '', reasonForResignation: '', salary: '' },
                ])
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Add Employer
            </Button>
          </CardContent>
        </Card>

        {/* Sensitive questions — Q7/Q9 */}
        <Card className="border-warning/40">
          <CardHeader>
            <CardTitle>Health &amp; Legal History</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-xs text-foreground">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <p>
                These answers (and salary history above) are restricted to <code>candidates.view_sensitive</code> — HR Manager
                and Super Admin only; interviewers never see them (employment-application-form.md §3).
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="appIllness">Q7. History of serious illness? *</Label>
                <Select id="appIllness" value={seriousIllness} onChange={(e) => setSeriousIllness(e.target.value as YesNo)}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="appCriminal">Q9. History of criminal acts? *</Label>
                <Select id="appCriminal" value={criminalHistory} onChange={(e) => setCriminalHistory(e.target.value as YesNo)}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </Select>
              </div>
            </div>
            {seriousIllness === 'yes' && (
              <Textarea
                aria-label="Illness detail"
                className="min-h-[60px]"
                placeholder="When, and what illness? *"
                value={seriousIllnessDetail}
                onChange={(e) => setSeriousIllnessDetail(e.target.value)}
              />
            )}
            {criminalHistory === 'yes' && (
              <Textarea
                aria-label="Criminal history detail"
                className="min-h-[60px]"
                placeholder="When, and for what reason? *"
                value={criminalHistoryDetail}
                onChange={(e) => setCriminalHistoryDetail(e.target.value)}
              />
            )}
          </CardContent>
        </Card>

        {/* Additional questions (condensed) */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Questions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appRelocate">Willing to relocate?</Label>
              <Select id="appRelocate" value={willingToRelocate} onChange={(e) => setWillingToRelocate(e.target.value as YesNo)}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appTravel">Willing to travel?</Label>
              <Select id="appTravel" value={willingToTravel} onChange={(e) => setWillingToTravel(e.target.value as YesNo)}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appEnvironment">Preferred environment</Label>
              <Select
                id="appEnvironment"
                value={preferredEnvironment}
                onChange={(e) => setPreferredEnvironment(e.target.value as 'office' | 'field')}
              >
                <option value="office">Office</option>
                <option value="field">Field</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appRemuneration">Expected remuneration (IDR)</Label>
              <Input id="appRemuneration" value={expectedRemuneration} onChange={(e) => setExpectedRemuneration(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* References — repeatable */}
        <Card>
          <CardHeader>
            <CardTitle>References</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {references.map((row) => (
              <div key={row.id} className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_40px] sm:items-center">
                <Input
                  placeholder="Name"
                  value={row.name}
                  onChange={(e) => setReferences((prev) => prev.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)))}
                />
                <Input
                  placeholder="Phone"
                  value={row.phone}
                  onChange={(e) => setReferences((prev) => prev.map((r) => (r.id === row.id ? { ...r, phone: e.target.value } : r)))}
                />
                <Input
                  placeholder="Company"
                  value={row.company}
                  onChange={(e) => setReferences((prev) => prev.map((r) => (r.id === row.id ? { ...r, company: e.target.value } : r)))}
                />
                <Input
                  placeholder="Relationship"
                  value={row.relationship}
                  onChange={(e) =>
                    setReferences((prev) => prev.map((r) => (r.id === row.id ? { ...r, relationship: e.target.value } : r)))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setReferences((prev) => prev.filter((r) => r.id !== row.id))}
                  aria-label="Remove reference"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={() =>
                setReferences((prev) => [...prev, { id: newId('ref'), name: '', phone: '', company: '', relationship: '' }])
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Add Reference
            </Button>
          </CardContent>
        </Card>

        {/* Declaration */}
        <Card>
          <CardHeader>
            <CardTitle>Declaration</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="rounded-md border border-border bg-sunken p-3 text-xs leading-relaxed text-foreground">
              Dengan ini saya menyatakan bahwa seluruh data yang saya tulis di atas adalah benar. Apabila di kemudian hari
              ditemukan data yang tidak benar, saya bersedia diberhentikan tanpa pesangon. / I hereby declare that all data
              written above is true. Should any of it later prove false, I accept termination without severance pay.
            </p>
            <div className="flex flex-col gap-1.5 sm:max-w-xs">
              <Label htmlFor="appDeclaration">Acknowledgment *</Label>
              <Select
                id="appDeclaration"
                value={declarationAccepted}
                onChange={(e) => setDeclarationAccepted(e.target.value as YesNo)}
              >
                <option value="no">Not accepted</option>
                <option value="yes">I accept the declaration</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/demo/hr/pipeline')}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
            Submit Application
          </Button>
        </div>
      </div>
    </div>
  )
}
