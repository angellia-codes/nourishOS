import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Plus } from 'lucide-react'
import { Badge, Button, Card, CardContent, Spinner } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import { TRAINING_TYPE_LABELS } from '@/constants/hr'
import * as trainingService from '../trainingService'
import type { Training } from '@/types'

/** HR.md §11 — the Training catalog. */
export function TrainingCatalogListPage() {
  const navigate = useNavigate()
  const [trainings, setTrainings] = useState<Training[] | null>(null)

  useEffect(() => trainingService.subscribeToTrainings(setTrainings), [])

  if (trainings === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  const active = trainings.filter((t) => !t.isArchived)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Training</h1>
          <p className="text-sm text-muted-foreground">Catalog, assignment and completion tracking.</p>
        </div>
        <PermissionGuard permission={PERMISSIONS.TRAINING_ASSIGN}>
          <Button onClick={() => navigate('/hr/training/new')}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            New Training
          </Button>
        </PermissionGuard>
      </div>

      {active.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-8 w-8" aria-hidden="true" />}
          title="No training courses yet"
          description="Add a course to start assigning it to employees."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {active.map((training) => (
            <Card key={training.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <button
                  type="button"
                  onClick={() => navigate(`/hr/training/${training.id}`)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate font-medium text-foreground">{training.title}</p>
                  <p className="text-xs text-muted-foreground">{TRAINING_TYPE_LABELS[training.type]}</p>
                </button>
                {training.mandatory && <Badge variant="warning">Mandatory</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
