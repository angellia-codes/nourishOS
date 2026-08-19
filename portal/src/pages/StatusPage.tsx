import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Notice } from '../ui'
import { getApplicationStatus, type ApplicationStatus } from '../api'
import { readToken } from '../token'

/**
 * candidate_portal.md §16 — the candidate's own progress view. It shows only
 * what the server chooses to return: no interview scores, no DISC result, no
 * internal notes.
 */
export function StatusPage() {
  const navigate = useNavigate()
  const token = readToken()

  const [status, setStatus] = useState<ApplicationStatus | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setError('Open the link we sent you on WhatsApp to see your application.')
      return
    }
    getApplicationStatus(token)
      .then(setStatus)
      .catch((problem: Error) => setError(problem.message))
  }, [token])

  if (error) {
    return (
      <Card className="flex flex-col gap-3">
        <Notice tone="error">{error}</Notice>
        <div>
          <Button onClick={() => navigate('/')}>See Open Positions</Button>
        </div>
      </Card>
    )
  }

  if (!status) {
    return <p className="text-muted-foreground">Loading…</p>
  }

  return (
    <>
      <Card className="flex flex-col gap-1">
        <p className="font-mono text-xs text-muted-foreground">{status.candidateNumber}</p>
        <h1 className="text-xl font-semibold">{status.position}</h1>
        <p className="text-muted-foreground">{status.fullName}</p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Progress</h2>
        {status.closed ? (
          <Notice>
            This application is closed ({status.stageLabel}). Thank you for your interest — you are welcome to apply
            again for another role.
          </Notice>
        ) : (
          <ol className="flex flex-col gap-2">
            {status.stages.map((step, index) => (
              <li key={step.stage} className="flex items-center gap-2 text-sm">
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    index <= status.stageIndex ? 'bg-primary text-primary-foreground' : 'bg-sunken text-muted-foreground'
                  }`}
                  aria-hidden="true"
                >
                  {index <= status.stageIndex ? '✓' : index + 1}
                </span>
                <span className={index === status.stageIndex ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {!status.submittedAt && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Still to do</h2>
          <ul className="flex flex-col gap-1 text-sm">
            <li>{status.steps.form ? '✓' : '○'} Employment Form</li>
            <li>{status.steps.cv ? '✓' : '○'} CV Uploaded</li>
            <li>{status.steps.disc ? '✓' : '○'} Personality Assessment</li>
          </ul>
          {status.missing.length > 0 && <Notice>Missing: {status.missing.join(', ')}.</Notice>}
          <div className="flex gap-2">
            <Button onClick={() => navigate('/apply/form')}>Continue Application</Button>
          </div>
        </Card>
      )}
    </>
  )
}
