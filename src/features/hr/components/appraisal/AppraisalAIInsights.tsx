import { Sparkles } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui'
import type { AppraisalAIInsights as AIInsightsData } from '@/types'

interface AppraisalAIInsightsProps {
  insights: AIInsightsData | null
  onGenerate: () => void
  isGenerating: boolean
  canGenerate: boolean
}

export function AppraisalAIInsights({ insights, onGenerate, isGenerating, canGenerate }: AppraisalAIInsightsProps) {
  return (
    <Card className="border-accent/30 bg-accent/[0.03]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
            AI Development Insights
          </CardTitle>
          <CardDescription>Generated on demand — never automatic.</CardDescription>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onGenerate}
          loading={isGenerating}
          disabled={!canGenerate || isGenerating}
        >
          {insights ? 'Regenerate' : 'Generate AI Insights'}
        </Button>
      </CardHeader>

      {insights && (
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Suggested Training
            </p>
            <div className="flex flex-wrap gap-2">
              {insights.trainingSuggestions.map((suggestion, i) => (
                <span
                  key={i}
                  className="rounded-full border border-accent/30 bg-surface px-3 py-1 text-xs text-foreground"
                >
                  {suggestion}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Development Comment
            </p>
            <p className="rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed text-foreground">
              {insights.developmentComment}
            </p>
          </div>
        </CardContent>
      )}

      {!insights && !canGenerate && (
        <CardContent>
          <p className="text-sm text-muted-foreground">Submit the review to unlock AI insights.</p>
        </CardContent>
      )}
    </Card>
  )
}
