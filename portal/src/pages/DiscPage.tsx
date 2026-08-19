import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Notice } from '../ui'
import { completeApplication, getDiscQuestions, submitDiscAssessment, type DiscQuestion } from '../api'
import { readToken } from '../token'

/**
 * candidate_portal.md §15 Screen 6 — one question at a time, no back-and-forth
 * scrolling on a phone. Answers go to the server unscored: §10 is explicit that
 * the client must never compute or send a DISC result.
 *
 * Submitting the assessment also submits the whole application, because it is
 * the last step — one press, one confirmation, no "now press Submit" screen
 * that people close the tab on.
 */
export function DiscPage() {
  const navigate = useNavigate()
  const token = readToken()

  const [questions, setQuestions] = useState<DiscQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [index, setIndex] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) {
      navigate('/', { replace: true })
      return
    }
    getDiscQuestions()
      .then((result) => setQuestions(result.questions))
      .catch((problem: Error) => setError(problem.message))
  }, [token, navigate])

  async function handleFinish() {
    if (!token) return
    setBusy(true)
    setError('')
    try {
      await submitDiscAssessment(
        token,
        questions.map((question) => ({ questionId: question.id, answer: answers[question.id] })),
      )
      await completeApplication(token)
      navigate('/done')
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not submit your assessment.')
    } finally {
      setBusy(false)
    }
  }

  if (questions.length === 0) {
    return (
      <Card className="flex flex-col gap-3">
        {error ? <Notice tone="error">{error}</Notice> : <p className="text-muted-foreground">Loading…</p>}
      </Card>
    )
  }

  const question = questions[index]
  const answered = Object.keys(answers).length
  const isLast = index === questions.length - 1

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">Personality assessment / Asesmen kepribadian</h1>
        <p className="text-sm text-muted-foreground">
          There are no right answers — pick what fits you best. About 10 minutes.
        </p>
        <p className="text-sm text-muted-foreground">
          Tidak ada jawaban benar atau salah — pilih yang paling sesuai dengan diri Anda. Sekitar 10 menit.
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-sunken">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(answered / questions.length) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Question {index + 1} of {questions.length}
        </p>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <Card className="flex flex-col gap-3">
        <p className="text-base font-medium">{question.prompt}</p>
        <p className="-mt-2 text-base font-medium text-muted-foreground">{question.promptId}</p>
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              setAnswers((current) => ({ ...current, [question.id]: option.id }))
              if (!isLast) setIndex(index + 1)
            }}
            className={`rounded-md border p-3 text-left text-sm transition ${
              answers[question.id] === option.id
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-sunken text-foreground hover:border-primary/50'
            }`}
          >
            {option.text}
            <span className="block text-muted-foreground">{option.textId}</span>
          </button>
        ))}
      </Card>

      <div className="flex justify-between pb-8">
        <Button variant="secondary" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0}>
          Previous
        </Button>
        {isLast ? (
          <Button onClick={handleFinish} loading={busy} disabled={answered < questions.length}>
            Submit application
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => setIndex(index + 1)} disabled={!answers[question.id]}>
            Next
          </Button>
        )}
      </div>
    </>
  )
}
