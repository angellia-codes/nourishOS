import { useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import type { ApplicationForm, ApplicationFormSensitive } from '@/types'

/**
 * F010 as HR reads it — employment-application-form.md §4.
 *
 * `sensitive` is whatever `candidates/{id}/confidential/application` returned:
 * null for anyone without `recruitment.viewSensitive`, because the rules deny
 * that read outright. The panel does not ask permission separately — a denied
 * read and a genuinely empty answer look the same here on purpose (§6).
 */
export function ApplicationFormPanel({
  form,
  sensitive,
}: {
  form: ApplicationForm
  sensitive: ApplicationFormSensitive | null
}) {
  const [expanded, setExpanded] = useState(false)
  const experienceYears = totalExperienceYears(form)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>Employment profile</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Hide full form' : 'View full form'}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-4 pt-0 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Experience" value={experienceYears === null ? '—' : `${experienceYears} years`} />
          <Field label="Most recent role" value={form.workExperience[0]?.position || '—'} />
          <Field label="Highest education" value={form.formalEducation.at(-1)?.institutionName || '—'} />
          <Field label="Expected remuneration" value={form.additionalQuestions.expectedRemuneration || '—'} />
          <Field
            label="Declaration"
            value={form.declarationAccepted ? `Accepted ${(form.declarationAcceptedAt ?? '').slice(0, 10)}` : 'Not accepted'}
          />
        </div>

        {expanded && (
          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <Section title="Personal">
              <Field label="Full name" value={form.personalData.fullName} />
              <Field label="Gender" value={form.personalData.gender ?? '—'} />
              <Field
                label="Born"
                value={[form.personalData.placeOfBirth, form.personalData.dateOfBirth].filter(Boolean).join(', ') || '—'}
              />
              <Field label="Nationality" value={form.personalData.nationality || '—'} />
              <Field label="Marital status" value={form.personalData.maritalStatus || '—'} />
              <Field label="Religion" value={form.personalData.religion || '—'} />
              <Field label="Permanent address" value={form.address.permanentAddress || '—'} />
              <Field label="Domicile" value={form.address.domicileAddress || '—'} />
            </Section>

            <Rows
              title="Formal education"
              rows={form.formalEducation.map((row) =>
                [row.schoolType, row.institutionName, row.major, row.graduationYear].filter(Boolean).join(' · '),
              )}
            />
            <Rows
              title="Informal education & training"
              rows={[
                ...form.informalEducation.map((row) =>
                  [row.institutionName, row.major, row.graduationYear].filter(Boolean).join(' · '),
                ),
                ...form.training.map((row) => [row.name, row.organizerLocation, row.monthYear].filter(Boolean).join(' · ')),
              ]}
            />
            <Rows
              title="Work experience"
              rows={form.workExperience.map((row) =>
                [
                  row.position,
                  row.companyName,
                  [row.periodStart, row.periodEnd].filter(Boolean).join('–'),
                  row.reasonForResignation && `left: ${row.reasonForResignation}`,
                ]
                  .filter(Boolean)
                  .join(' · '),
              )}
            />
            <Rows
              title="Languages"
              rows={form.languages.map((row) =>
                `${row.language}: speak ${row.speaking ?? '—'}, read ${row.reading ?? '—'}, write ${row.writing ?? '—'}`,
              )}
            />
            <Rows
              title="References"
              rows={form.references.map((row) =>
                [row.name, row.position, row.company, row.phone, row.relationship].filter(Boolean).join(' · '),
              )}
            />

            <Section title="Additional questions">
              <Field label="Knows about us" value={form.additionalQuestions.knowsAboutCompany || '—'} />
              <Field label="Expectations" value={form.additionalQuestions.expectationsIfHired || '—'} />
              <Field label="Strengths" value={form.additionalQuestions.strengths.filter(Boolean).join(', ') || '—'} />
              <Field label="Weaknesses" value={form.additionalQuestions.weaknesses.filter(Boolean).join(', ') || '—'} />
              <Field label="Willing to relocate" value={form.additionalQuestions.willingToRelocate ? 'Yes' : 'No'} />
              <Field label="Willing to travel" value={form.additionalQuestions.willingToTravel ? 'Yes' : 'No'} />
              <Field label="Prefers" value={form.additionalQuestions.preferredEnvironment ?? '—'} />
            </Section>

            {sensitive && (
              <div className="rounded-md border border-warning/40 bg-warning/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-warning">
                  Restricted — HR Manager only
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Field
                    label="Serious illness history"
                    value={
                      sensitive.seriousIllnessHistory ? sensitive.seriousIllnessDetail || 'Yes (no detail given)' : 'No'
                    }
                  />
                  <Field
                    label="Criminal record"
                    value={
                      sensitive.criminalHistory ? sensitive.criminalHistoryDetail || 'Yes (no detail given)' : 'No'
                    }
                  />
                  <div className="sm:col-span-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Previous salary</p>
                    <ul className="list-disc pl-4">
                      {sensitive.workExperienceSalaries
                        .filter((row) => row.salary !== null)
                        .map((row) => (
                          <li key={row.index}>
                            {row.companyName || `Employer ${row.index + 1}`}: {row.salary?.toLocaleString('id-ID')}
                          </li>
                        ))}
                      {sensitive.workExperienceSalaries.every((row) => row.salary === null) && <li>Not disclosed</li>}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap">{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-foreground">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  )
}

function Rows({ title, rows }: { title: string; rows: string[] }) {
  const filled = rows.filter((row) => row.trim())
  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-foreground">{title}</p>
      {filled.length === 0 ? (
        <p className="text-muted-foreground">—</p>
      ) : (
        <ul className="list-disc pl-4">
          {filled.map((row, index) => (
            <li key={`${row}-${index}`}>{row}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Rough total from the period strings the form collects (free text like
 * "2022-01"), so it degrades to null rather than lying when they aren't dates.
 */
function totalExperienceYears(form: ApplicationForm): number | null {
  const months = form.workExperience.reduce((sum, row) => {
    const start = Date.parse(`${row.periodStart}-01`)
    const end = row.periodEnd ? Date.parse(`${row.periodEnd}-01`) : Date.now()
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) return sum
    return sum + (end - start) / 2_629_800_000
  }, 0)
  return months === 0 ? null : Math.round((months / 12) * 10) / 10
}
