import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BottomBar, Button, Card, Field, Input, Notice, Select, Spinner, Textarea } from '../ui'
import { UploadSlotField } from '../components/UploadSlot'
import { OPTIONS, STRINGS, fill, t, type Lang, type Pair } from '../strings'
import { cacheDraft, readCachedDraft } from '../token'
import { saveWelcomeDraft, submitWelcomeForm } from '../api'
import { WelcomeError, type FieldIssue } from '../firebase'

/**
 * welcome-portal.md §7.1 — five steps, then a review screen.
 *
 * Personal → Contact → Identity & Financial → Emergency Contact → Documents.
 * Five rather than the four of v1.0 because the confirmed field list roughly
 * doubled; the split is the spec's, not an invention.
 *
 * Two things worth knowing before editing this file:
 *
 * 1. **Autosave sends the whole draft, not a diff.** `saveWelcomeDraft` merges
 *    server-side and is idempotent, so a save that never lands costs nothing
 *    and a retry cannot half-commit a step. Same reasoning the candidate
 *    portal's FormPage gives for posting its whole form on every save.
 * 2. **The server owns validation.** The per-field checks here exist to keep a
 *    hire from reaching the review screen with an obviously wrong NIK; they
 *    are not the enforcement layer, and `submitWelcomeForm` re-validates the
 *    stored draft from scratch. When the two disagree, the server wins and its
 *    per-field issues are what get rendered.
 */

type Draft = Record<string, unknown>

const STEPS = [STRINGS.step1, STRINGS.step2, STRINGS.step3, STRINGS.step4, STRINGS.step5]
const REVIEW_STEP = STEPS.length

export function FormPage({
  token,
  lang,
  initialDraft,
  rejectionReason,
  onSubmitted,
}: {
  token: string
  lang: Lang
  initialDraft: Draft
  /**
   * §3.4 — HR sent the submission back. The form re-opens, and the reason has
   * to be on the form itself: the hire lands here directly, so a reason shown
   * only on Home would never be read, and they would resubmit the same thing.
   */
  rejectionReason: string | null
  onSubmitted: (fullName: string) => void
}) {
  // The server's copy wins on load; the local cache only fills gaps it has not
  // seen yet (§11 "Drafts cached locally").
  const [draft, setDraft] = useState<Draft>(() => ({ ...readCachedDraft(), ...initialDraft }))
  const [step, setStep] = useState(0)
  const [issues, setIssues] = useState<FieldIssue[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [online, setOnline] = useState(() => navigator.onLine)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // Move focus to the step heading on every transition, or a keyboard and
  // screen-reader user is left at the bottom of the previous step.
  useEffect(() => {
    headingRef.current?.focus()
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [step])

  const set = useCallback((field: string) => (value: string) => {
    setDraft((prev) => {
      const next = { ...prev, [field]: value }
      cacheDraft(next)
      return next
    })
    // Clear this field's error the moment it is touched; leaving it up while
    // someone fixes it reads as though the fix did not register.
    setIssues((prev) => prev.filter((issue) => issue.field !== field))
  }, [])

  const setFile = useCallback((field: string, value: unknown) => {
    setDraft((prev) => {
      const next = { ...prev, [field]: value }
      cacheDraft(next)
      return next
    })
  }, [])

  const errorFor = useCallback(
    (field: string) => issues.find((issue) => issue.field === field)?.message,
    [issues],
  )

  /** Fire-and-forget: the review screen's submit re-sends everything anyway. */
  const save = useCallback(async () => {
    if (!navigator.onLine) return
    setSaving(true)
    try {
      await saveWelcomeDraft(token, draft)
    } catch {
      // A failed autosave is not worth interrupting anyone over — the local
      // cache holds the same values and submit sends them again.
    } finally {
      setSaving(false)
    }
  }, [token, draft])

  async function goNext() {
    const stepIssues = validateStep(step, draft, lang)
    if (stepIssues.length > 0) {
      setIssues(stepIssues)
      return
    }
    setIssues([])
    void save()
    setStep((current) => Math.min(current + 1, REVIEW_STEP))
  }

  async function submit() {
    if (!navigator.onLine) {
      setFormError(t(STRINGS.offlineBody, lang))
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const result = await submitWelcomeForm(token, draft)
      onSubmitted(result.fullName)
    } catch (error) {
      if (error instanceof WelcomeError && error.issues.length > 0) {
        setIssues(error.issues)
        setFormError(t(STRINGS.fixBeforeSubmit, lang))
        // Land on the earliest step that actually has a problem, rather than
        // leaving the hire on the review screen guessing.
        const firstStep = earliestStepWithIssue(error.issues)
        if (firstStep !== null) setStep(firstStep)
      } else {
        setFormError(error instanceof Error ? error.message : 'Something went wrong.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const progress = step < REVIEW_STEP ? fill(t(STRINGS.stepOf, lang), { n: step + 1, total: STEPS.length }) : ''

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pb-4 pt-6">
      <header className="w-rise">
        <h1 className="text-xl font-bold">{t(STRINGS.formTitle, lang)}</h1>
        <p className="mt-1 text-sm text-[var(--w-cream-soft)]">{t(STRINGS.formIntro, lang)}</p>
      </header>

      <StepRail step={step} lang={lang} />

      {rejectionReason ? (
        <Notice tone="error">
          {t(STRINGS.rejectedNote, lang)}
          <span className="mt-2 block font-semibold">{rejectionReason}</span>
        </Notice>
      ) : null}

      {!online ? <Notice tone="error">{t(STRINGS.offlineBody, lang)}</Notice> : null}
      {formError ? <Notice tone="error">{formError}</Notice> : null}

      <Card index={1}>
        <h2 ref={headingRef} tabIndex={-1} className="mb-1 text-lg font-semibold outline-none">
          {step < REVIEW_STEP ? t(STEPS[step], lang) : t(STRINGS.reviewTitle, lang)}
        </h2>
        {progress ? <p className="mb-4 text-xs text-[var(--w-cream-soft)]">{progress}</p> : null}

        {step === 0 ? <PersonalStep draft={draft} set={set} errorFor={errorFor} lang={lang} /> : null}
        {step === 1 ? <ContactStep draft={draft} set={set} errorFor={errorFor} lang={lang} /> : null}
        {step === 2 ? <IdentityStep draft={draft} set={set} errorFor={errorFor} lang={lang} /> : null}
        {step === 3 ? <EmergencyStep draft={draft} set={set} errorFor={errorFor} lang={lang} /> : null}
        {step === 4 ? (
          <DocumentsStep draft={draft} setFile={setFile} errorFor={errorFor} lang={lang} token={token} />
        ) : null}
        {step === REVIEW_STEP ? <ReviewStep draft={draft} lang={lang} onEdit={setStep} /> : null}
      </Card>

      <BottomBar>
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep((current) => current - 1)}>
            {t(STRINGS.back, lang)}
          </Button>
        ) : null}
        <div className="flex-1" />
        {saving ? <span className="text-xs text-[var(--w-cream-soft)]">{t(STRINGS.saving, lang)}</span> : null}
        {step < REVIEW_STEP ? (
          <Button onClick={() => void goNext()}>
            {step === STEPS.length - 1 ? t(STRINGS.review, lang) : t(STRINGS.next, lang)}
          </Button>
        ) : (
          // §12 — submit is blocked offline, deliberately, rather than queued.
          // A hire fills this in once, at home; a queued submit that silently
          // fires hours later is worse than a clear "you are offline".
          <Button disabled={submitting || !online} onClick={() => void submit()}>
            {submitting ? <Spinner /> : null}
            {submitting ? t(STRINGS.submitting, lang) : t(STRINGS.submit, lang)}
          </Button>
        )}
      </BottomBar>
    </div>
  )
}

function StepRail({ step, lang }: { step: number; lang: Lang }) {
  return (
    <ol className="flex gap-1.5" aria-label={t(STRINGS.formTitle, lang)}>
      {STEPS.map((label, index) => (
        <li key={index} className="flex-1">
          <div
            className={`h-1.5 rounded-full ${index <= step ? 'bg-[var(--w-amber)]' : 'bg-white/15'}`}
            aria-current={index === step ? 'step' : undefined}
          />
          <span className="w-sr-only">{t(label, lang)}</span>
        </li>
      ))}
    </ol>
  )
}

// ---- Steps ----

interface StepProps {
  draft: Draft
  set: (field: string) => (value: string) => void
  errorFor: (field: string) => string | undefined
  lang: Lang
}

function str(draft: Draft, field: string): string {
  return typeof draft[field] === 'string' ? (draft[field] as string) : ''
}

function TextField({
  field,
  label,
  draft,
  set,
  errorFor,
  hint,
  optional,
  type = 'text',
  mono,
  inputMode,
  maxLength,
}: StepProps & {
  field: string
  label: string
  hint?: string
  optional?: string
  type?: string
  mono?: boolean
  inputMode?: 'text' | 'numeric' | 'tel' | 'email'
  maxLength?: number
}) {
  return (
    <Field label={label} hint={hint} optional={optional} error={errorFor(field)} htmlFor={field}>
      <Input
        id={field}
        type={type}
        mono={mono}
        inputMode={inputMode}
        maxLength={maxLength}
        value={str(draft, field)}
        onChange={(event) => set(field)(event.target.value)}
      />
    </Field>
  )
}

function SelectField({
  field,
  label,
  options,
  draft,
  set,
  errorFor,
  lang,
}: StepProps & { field: string; label: string; options: readonly { value: string; label: Pair }[] }) {
  return (
    <Field label={label} error={errorFor(field)} htmlFor={field}>
      <Select id={field} value={str(draft, field)} onChange={(event) => set(field)(event.target.value)}>
        <option value="">—</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.label, lang)}
          </option>
        ))}
      </Select>
    </Field>
  )
}

function PersonalStep(props: StepProps) {
  const { lang } = props
  return (
    <div className="flex flex-col gap-4">
      <TextField {...props} field="fullName" label={t(STRINGS.fullName, lang)} />
      <TextField {...props} field="placeOfBirth" label={t(STRINGS.placeOfBirth, lang)} />
      <TextField {...props} field="birthDate" label={t(STRINGS.birthDate, lang)} type="date" />
      <SelectField {...props} field="gender" label={t(STRINGS.gender, lang)} options={OPTIONS.gender} />
      <SelectField {...props} field="religion" label={t(STRINGS.religion, lang)} options={OPTIONS.religion} />
      <SelectField
        {...props}
        field="maritalStatus"
        label={t(STRINGS.maritalStatus, lang)}
        options={OPTIONS.maritalStatus}
      />
      <SelectField {...props} field="bloodType" label={t(STRINGS.bloodType, lang)} options={OPTIONS.bloodType} />
      <SelectField {...props} field="tshirtSize" label={t(STRINGS.tshirtSize, lang)} options={OPTIONS.tshirtSize} />
      <TextField {...props} field="motherName" label={t(STRINGS.motherName, lang)} />
    </div>
  )
}

function ContactStep(props: StepProps) {
  const { lang, draft, set, errorFor } = props
  return (
    <div className="flex flex-col gap-4">
      <TextField {...props} field="phone" label={t(STRINGS.phone, lang)} type="tel" inputMode="tel" mono />
      <TextField {...props} field="personalEmail" label={t(STRINGS.personalEmail, lang)} type="email" inputMode="email" />
      <Field
        label={t(STRINGS.permanentAddressKtp, lang)}
        error={errorFor('permanentAddressKtp')}
        htmlFor="permanentAddressKtp"
      >
        <Textarea
          id="permanentAddressKtp"
          value={str(draft, 'permanentAddressKtp')}
          onChange={(event) => set('permanentAddressKtp')(event.target.value)}
        />
      </Field>
      <Field label={t(STRINGS.domicileAddress, lang)} error={errorFor('domicileAddress')} htmlFor="domicileAddress">
        <Textarea
          id="domicileAddress"
          value={str(draft, 'domicileAddress')}
          onChange={(event) => set('domicileAddress')(event.target.value)}
        />
      </Field>
    </div>
  )
}

function IdentityStep(props: StepProps) {
  const { lang } = props
  return (
    <div className="flex flex-col gap-4">
      {/* Numeric keypad plus tabular figures, so a 16-digit NIK can be checked
          against the card digit by digit (§7.1). */}
      <TextField {...props} field="nik" label={t(STRINGS.nik, lang)} mono inputMode="numeric" maxLength={20} />
      <TextField {...props} field="npwp" label={t(STRINGS.npwp, lang)} mono inputMode="numeric" maxLength={25} />
      <TextField
        {...props}
        field="bpjsTk"
        label={t(STRINGS.bpjsTk, lang)}
        mono
        inputMode="numeric"
        optional={t(STRINGS.optional, lang)}
        hint={t(STRINGS.bpjsNote, lang)}
        maxLength={25}
      />
      <TextField
        {...props}
        field="bpjsKesehatan"
        label={t(STRINGS.bpjsKesehatan, lang)}
        mono
        inputMode="numeric"
        optional={t(STRINGS.optional, lang)}
        maxLength={25}
      />
      <Notice>{t(STRINGS.bankNote, lang)}</Notice>
      <TextField {...props} field="bankAccountName" label={t(STRINGS.bankAccountName, lang)} />
      <TextField
        {...props}
        field="bankAccountNumber"
        label={t(STRINGS.bankAccountNumber, lang)}
        mono
        inputMode="numeric"
        maxLength={15}
      />
    </div>
  )
}

function EmergencyStep(props: StepProps) {
  const { lang, draft, set, errorFor } = props
  return (
    <div className="flex flex-col gap-4">
      <TextField {...props} field="emergencyContactName" label={t(STRINGS.emergencyContactName, lang)} />
      <TextField
        {...props}
        field="emergencyContactPhone"
        label={t(STRINGS.emergencyContactPhone, lang)}
        type="tel"
        inputMode="tel"
        mono
      />
      <SelectField
        {...props}
        field="emergencyContactRelationship"
        label={t(STRINGS.emergencyContactRelationship, lang)}
        options={OPTIONS.emergencyContactRelationship}
      />
      {str(draft, 'emergencyContactRelationship') === 'other' ? (
        <TextField
          {...props}
          field="emergencyContactRelationshipOther"
          label={t(STRINGS.emergencyContactRelationshipOther, lang)}
        />
      ) : null}
      <Field
        label={t(STRINGS.emergencyContactAddress, lang)}
        error={errorFor('emergencyContactAddress')}
        htmlFor="emergencyContactAddress"
      >
        <Textarea
          id="emergencyContactAddress"
          value={str(draft, 'emergencyContactAddress')}
          onChange={(event) => set('emergencyContactAddress')(event.target.value)}
        />
      </Field>
    </div>
  )
}

function DocumentsStep({
  draft,
  setFile,
  errorFor,
  lang,
  token,
}: {
  draft: Draft
  setFile: (field: string, value: unknown) => void
  errorFor: (field: string) => string | undefined
  lang: Lang
  token: string
}) {
  const supporting = Array.isArray(draft.supportingFileIds) ? (draft.supportingFileIds as string[]) : []
  const single = (field: string) => (typeof draft[field] === 'string' && draft[field] ? [draft[field] as string] : [])

  return (
    <div className="flex flex-col gap-4">
      <Notice>{t(STRINGS.copyNote, lang)}</Notice>

      <UploadSlotField
        slot="ktp"
        token={token}
        lang={lang}
        label={t(STRINGS.slotKtp, lang)}
        hint={errorFor('ktpFileId') ?? t(STRINGS.slotKtpHint, lang)}
        fileIds={single('ktpFileId')}
        onUploaded={(fileId) => setFile('ktpFileId', fileId)}
        onRemove={() => setFile('ktpFileId', '')}
      />
      <UploadSlotField
        slot="kk"
        token={token}
        lang={lang}
        label={t(STRINGS.slotKk, lang)}
        hint={errorFor('kkFileId') ?? t(STRINGS.slotKkHint, lang)}
        fileIds={single('kkFileId')}
        onUploaded={(fileId) => setFile('kkFileId', fileId)}
        onRemove={() => setFile('kkFileId', '')}
      />
      <UploadSlotField
        slot="photo"
        token={token}
        lang={lang}
        imageOnly
        label={`${t(STRINGS.slotPhoto, lang)} (${t(STRINGS.optional, lang)})`}
        hint={t(STRINGS.slotPhotoHint, lang)}
        fileIds={single('photoFileId')}
        onUploaded={(fileId) => setFile('photoFileId', fileId)}
        onRemove={() => setFile('photoFileId', '')}
      />
      <UploadSlotField
        slot="supporting"
        token={token}
        lang={lang}
        maxFiles={2}
        label={`${t(STRINGS.slotSupporting, lang)} (${t(STRINGS.optional, lang)})`}
        hint={t(STRINGS.slotSupportingHint, lang)}
        fileIds={supporting}
        onUploaded={(fileId) => setFile('supportingFileIds', [...supporting, fileId])}
        onRemove={(fileId) =>
          setFile(
            'supportingFileIds',
            supporting.filter((id) => id !== fileId),
          )
        }
      />
    </div>
  )
}

/** Field name → which step it lives on, so a server issue can jump back to it. */
const FIELD_STEP: Record<string, number> = {
  fullName: 0,
  placeOfBirth: 0,
  birthDate: 0,
  gender: 0,
  religion: 0,
  maritalStatus: 0,
  bloodType: 0,
  tshirtSize: 0,
  motherName: 0,
  phone: 1,
  personalEmail: 1,
  permanentAddressKtp: 1,
  domicileAddress: 1,
  nik: 2,
  npwp: 2,
  bpjsTk: 2,
  bpjsKesehatan: 2,
  bankAccountName: 2,
  bankAccountNumber: 2,
  emergencyContactName: 3,
  emergencyContactPhone: 3,
  emergencyContactAddress: 3,
  emergencyContactRelationship: 3,
  emergencyContactRelationshipOther: 3,
  ktpFileId: 4,
  kkFileId: 4,
  photoFileId: 4,
  supportingFileIds: 4,
}

function earliestStepWithIssue(issues: FieldIssue[]): number | null {
  const steps = issues.map((issue) => FIELD_STEP[issue.field]).filter((step) => step !== undefined)
  return steps.length > 0 ? Math.min(...steps) : null
}

function ReviewStep({ draft, lang, onEdit }: { draft: Draft; lang: Lang; onEdit: (step: number) => void }) {
  const rows = useMemo(
    () =>
      Object.entries(FIELD_STEP)
        .filter(([field]) => field !== 'supportingFileIds')
        .map(([field, step]) => ({
          field,
          step,
          label: t(STRINGS[field as keyof typeof STRINGS] as Pair, lang),
          value: reviewValue(draft, field, lang),
        })),
    [draft, lang],
  )

  return (
    <div className="flex flex-col gap-4">
      <Notice>{t(STRINGS.reviewIntro, lang)}</Notice>
      <dl className="flex flex-col divide-y divide-white/10">
        {rows.map((row) => (
          <div key={row.field} className="flex items-baseline justify-between gap-3 py-2.5">
            <dt className="text-xs text-[var(--w-cream-soft)]">{row.label}</dt>
            <dd className="flex items-baseline gap-2 text-right text-sm">
              <span className={row.value ? '' : 'text-[var(--w-cream-faint)]'}>
                {row.value || t(STRINGS.notFilled, lang)}
              </span>
              <button
                type="button"
                className="w-focusable rounded text-xs font-semibold text-[var(--w-amber)] underline underline-offset-2"
                onClick={() => onEdit(row.step)}
              >
                {t(STRINGS.edit, lang)}
              </button>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function reviewValue(draft: Draft, field: string, lang: Lang): string {
  const raw = draft[field]
  if (typeof raw !== 'string' || !raw) return ''

  // A file id means nothing to a hire; "uploaded" does.
  if (field.endsWith('FileId')) return t(STRINGS.uploaded, lang)

  const options = OPTIONS[field as keyof typeof OPTIONS] as
    | readonly { value: string; label: Pair }[]
    | undefined
  if (options) {
    const match = options.find((option) => option.value === raw)
    return match ? t(match.label, lang) : raw
  }
  return raw
}

// ---- Client-side step gate ----
//
// Deliberately thinner than the server's rules: this exists so a hire does not
// walk five steps to be told their NIK is short, not to duplicate §11. Anything
// this misses, submitWelcomeForm catches and reports per field.

const REQUIRED_BY_STEP: string[][] = [
  ['fullName', 'placeOfBirth', 'birthDate', 'gender', 'religion', 'maritalStatus', 'bloodType', 'tshirtSize', 'motherName'],
  ['phone', 'personalEmail', 'permanentAddressKtp', 'domicileAddress'],
  ['nik', 'npwp', 'bankAccountName', 'bankAccountNumber'],
  ['emergencyContactName', 'emergencyContactPhone', 'emergencyContactAddress', 'emergencyContactRelationship'],
  ['ktpFileId', 'kkFileId'],
]

const DIGIT_LENGTHS: Record<string, number[]> = {
  nik: [16],
  npwp: [15, 16],
  bankAccountNumber: [10],
}

function validateStep(step: number, draft: Draft, lang: Lang): FieldIssue[] {
  const issues: FieldIssue[] = []
  const required = REQUIRED_BY_STEP[step] ?? []

  for (const field of required) {
    if (!str(draft, field).trim()) {
      issues.push({ field, message: requiredMessage(field, lang) })
    }
  }

  if (step === 3 && str(draft, 'emergencyContactRelationship') === 'other') {
    if (!str(draft, 'emergencyContactRelationshipOther').trim()) {
      issues.push({
        field: 'emergencyContactRelationshipOther',
        message: requiredMessage('emergencyContactRelationshipOther', lang),
      })
    }
  }

  for (const [field, lengths] of Object.entries(DIGIT_LENGTHS)) {
    const value = str(draft, field).replace(/\D/g, '')
    if (value && !lengths.includes(value.length)) {
      issues.push({
        field,
        message:
          lang === 'id'
            ? `Harus ${lengths.join(' atau ')} digit.`
            : `Must be ${lengths.join(' or ')} digits.`,
      })
    }
  }

  return issues.filter((issue) => FIELD_STEP[issue.field] === step)
}

function requiredMessage(field: string, lang: Lang): string {
  const label = t(STRINGS[field as keyof typeof STRINGS] as Pair, lang)
  return lang === 'id' ? `${label} wajib diisi.` : `${label} is required.`
}
