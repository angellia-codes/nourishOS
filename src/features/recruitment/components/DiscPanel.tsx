import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { DISC_STYLE_LABELS, type DiscDimension, type DiscResult } from '@/types'
import { discInterviewFocus } from '../recruitmentFormat'

/**
 * candidate_portal.md §18/§20 — the DISC block of Candidate 360.
 *
 * Two things it deliberately does not do: it never shows the candidate's raw
 * answers (the scores are the artefact, the answer sheet is not), and the
 * focus areas are labelled as prompts for the interviewer, because §20 is
 * explicit that DISC is decision support and must not decide an outcome.
 */
export function DiscPanel({ result }: { result: DiscResult }) {
  const focus = discInterviewFocus(result.primaryStyle, result.secondaryStyle)

  return (
    <Card>
      <CardHeader>
        <CardTitle>DISC profile</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-4 pt-0">
        <p className="text-sm text-muted-foreground">
          Primary <span className="font-medium text-foreground">{DISC_STYLE_LABELS[result.primaryStyle]}</span> ·
          Secondary <span className="font-medium text-foreground">{DISC_STYLE_LABELS[result.secondaryStyle]}</span>
        </p>

        <div className="flex flex-col gap-2">
          {(Object.keys(DISC_STYLE_LABELS) as DiscDimension[]).map((dimension) => (
            <div key={dimension} className="flex items-center gap-3 text-sm">
              <span className="w-4 font-mono font-semibold text-foreground">{dimension}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-sunken">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${result.scores[dimension]}%` }}
                  role="meter"
                  aria-valuenow={result.scores[dimension]}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={DISC_STYLE_LABELS[dimension]}
                />
              </div>
              <span className="w-10 text-right tabular-nums text-muted-foreground">{result.scores[dimension]}%</span>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Strengths to explore</p>
            <ul className="mt-1 list-disc pl-4 text-sm">
              {focus.strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Areas to probe</p>
            <ul className="mt-1 list-disc pl-4 text-sm">
              {focus.probes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Interview prompts only. A DISC profile never decides a hiring outcome (candidate_portal.md §20).
        </p>
      </CardContent>
    </Card>
  )
}
