import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card, Field, Input, Notice, Select } from '../ui'
import { listOpenPositions, startApplication, type OpenPosition } from '../api'
import { SOURCES, titleCase } from '../labels'
import { readToken, storeToken } from '../token'

/**
 * candidate_portal.md §15 Screen 3 — "create an account", except there is no
 * account: the server hands back an application token and that is the whole
 * credential from here on (functions/src/recruitment/portal/token.ts).
 */
export function ApplyPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const requisitionId = params.get('requisitionId') ?? ''

  const [position, setPosition] = useState<OpenPosition | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState(SOURCES[0].value)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // Arriving on /apply from a WhatsApp link means the application already
    // exists — pick it up rather than starting a second one.
    if (!requisitionId && readToken()) {
      navigate('/status', { replace: true })
      return
    }
    if (requisitionId) {
      listOpenPositions()
        .then((result) => setPosition(result.positions.find((row) => row.requisitionId === requisitionId) ?? null))
        .catch(() => setPosition(null))
    }
  }, [requisitionId, navigate])

  async function handleSubmit() {
    setBusy(true)
    setError('')
    try {
      const result = await startApplication({
        requisitionId,
        fullName,
        phone,
        email: email.trim() || undefined,
        source,
      })
      storeToken(result.applicationToken)
      navigate('/apply/form')
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not start your application.')
    } finally {
      setBusy(false)
    }
  }

  if (!requisitionId) {
    return (
      <Card className="flex flex-col gap-3">
        <Notice>Pick a position first.</Notice>
        <div>
          <Button onClick={() => navigate('/')}>See open positions</Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Start your application</h1>
        {position && (
          <p className="text-sm text-muted-foreground">
            {position.positionLabel} · {titleCase(position.outletId)}
          </p>
        )}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <Field label="Full name">
        <Input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" />
      </Field>

      <Field label="WhatsApp number" hint="We send your application link here, e.g. 0812xxxxxxx.">
        <Input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" />
      </Field>

      <Field label="Email (optional)">
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />
      </Field>

      <Field label="How did you hear about this role?">
        <Select value={source} onChange={(event) => setSource(event.target.value)}>
          {SOURCES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} loading={busy} disabled={!fullName.trim() || !phone.trim()}>
          Continue
        </Button>
      </div>
    </Card>
  )
}
