import { Card, CardContent } from '@/components/ui'

interface ModulePlaceholderProps {
  title: string
  description?: string
}

export function ModulePlaceholder({ title, description }: ModulePlaceholderProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 p-12 text-center">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          {description ?? 'This module is scheduled for a future milestone.'}
        </p>
      </CardContent>
    </Card>
  )
}
