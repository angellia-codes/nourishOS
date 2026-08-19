import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Notice } from '../ui'
import { listOpenPositions, type OpenPosition } from '../api'
import { titleCase } from '../labels'

/** candidate_portal.md §15 Screens 1–2 — welcome and vacancy list. */
export function LandingPage() {
  const navigate = useNavigate()
  const [positions, setPositions] = useState<OpenPosition[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listOpenPositions()
      .then((result) => setPositions(result.positions))
      .catch((problem: Error) => setError(problem.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <section className="flex flex-col gap-2 py-4">
        <h1 className="text-2xl font-semibold">Nourish Your Future with Us.</h1>
        <p className="text-muted-foreground">
          We're on the lookout for the passionate individuals to join our growing team. Pick a role below to
          start your application — it takes about 20 minutes, and you can come back to it later.
        </p>
      </section>

      {error && <Notice tone="error">{error}</Notice>}
      {loading && <p className="text-muted-foreground">Loading positions…</p>}

      {!loading && positions.length === 0 && !error && (
        <Notice>There are no open positions right now. Please check back soon.</Notice>
      )}

      {positions.map((position) => (
        <Card key={position.requisitionId} className="flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold">{position.positionLabel}</h2>
            <p className="text-sm text-muted-foreground">
              {titleCase(position.outletId)} · {titleCase(position.departmentId)}
              {position.workSchedule ? ` · ${position.workSchedule}` : ''}
            </p>
          </div>
          {position.requirements && (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{position.requirements}</p>
          )}
          <div>
            <Button onClick={() => navigate(`/apply?requisitionId=${position.requisitionId}`)}>Apply</Button>
          </div>
        </Card>
      ))}
    </>
  )
}
