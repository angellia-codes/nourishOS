import { Badge, Card, CardContent } from '@/components/ui'
import type { AppraisalCriterion, PositionResponsibility } from '@/types'

interface AppraisalTemplateReviewPanelProps {
  criteria: AppraisalCriterion[]
  responsibilities: PositionResponsibility[]
}

/**
 * §6.2 — the side-by-side gate: generated criterion on the left, the cited
 * source responsibility text on the right, so HR can actually verify the
 * trace rather than rubber-stamping. Editing/reordering criteria in place is
 * out of scope for this pass — HR regenerates instead (generateAppraisalTemplate
 * creates a new draft version, never touches the live approved one, §6.2
 * point 2), which is the lazy-correct call given approveAppraisalTemplate.ts
 * already rejects a criterion with no valid sourceResponsibilityIds
 * server-side regardless of what the UI allows.
 */
export function AppraisalTemplateReviewPanel({ criteria, responsibilities }: AppraisalTemplateReviewPanelProps) {
  const responsibilityById = new Map(responsibilities.map((r) => [r.responsibilityId, r.text.en]))

  return (
    <div className="flex flex-col gap-3">
      {criteria
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((c, i) => (
          <Card key={c.criterionId}>
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">{i + 1}</span>
                  <p className="font-medium text-foreground">{c.label.en}</p>
                  {c.isLeadershipCriterion && <Badge variant="accent">Leadership</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{c.description.en}</p>
              </div>
              <div className="border-t border-border pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Source Key Responsibilit{c.sourceResponsibilityIds.length === 1 ? 'y' : 'ies'}
                </p>
                <ul className="list-disc space-y-1 pl-4 text-sm text-foreground">
                  {c.sourceResponsibilityIds.map((id) => (
                    <li key={id}>{responsibilityById.get(id) ?? `(removed responsibility: ${id})`}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  )
}
