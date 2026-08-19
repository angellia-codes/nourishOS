import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, Pencil } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Spinner } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { COLLECTIONS, PERMISSIONS } from '@/constants'
import { TRAINING_TYPE_LABELS } from '@/constants/hr'
import { useFirestoreDoc, useToast } from '@/hooks'
import { formatDate } from '@/utils'
import * as trainingService from '../trainingService'
import * as employeeService from '@/features/hr/services/employeeService'
import type { Employee, Training, TrainingAssignment } from '@/types'

/** Catalog info, assigned employees + completion status, and an inline "Assign to employees" picker. */
export function TrainingDetailPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { trainingId } = useParams<{ trainingId: string }>()

  const { data: training, loading, error } = useFirestoreDoc<Training>(COLLECTIONS.TRAININGS, trainingId)
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [assigning, setAssigning] = useState(false)
  const [completingId, setCompletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!trainingId) return
    return trainingService.subscribeToAssignmentsForTraining(trainingId, setAssignments)
  }, [trainingId])

  useEffect(() => employeeService.subscribeToEmployees(setEmployees), [])

  const employeeName = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e.fullName])),
    [employees],
  )

  const assignedEmployeeIds = useMemo(() => new Set(assignments.map((a) => a.employeeId)), [assignments])
  const assignableEmployees = useMemo(
    () => employees.filter((e) => e.status === 'active' && !assignedEmployeeIds.has(e.id)),
    [employees, assignedEmployeeIds],
  )

  async function handleAssign() {
    if (!trainingId || selected.length === 0) return
    setAssigning(true)
    try {
      await trainingService.assignTraining({ trainingId, employeeIds: selected })
      toast.success('Training assigned.')
      setSelected([])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign training.')
    } finally {
      setAssigning(false)
    }
  }

  async function handleComplete(assignmentId: string) {
    setCompletingId(assignmentId)
    try {
      await trainingService.completeTraining(assignmentId)
      toast.success('Marked complete.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark complete.')
    } finally {
      setCompletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (error || !training || !trainingId) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={<Lock className="h-8 w-8" aria-hidden="true" />}
          title="Training unavailable"
          description="That course may have been removed, or your account can't read this register."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Button variant="ghost" className="self-start" onClick={() => navigate('/hr/training')}>
        <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
        Training
      </Button>

      <Card>
        <CardHeader className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral">{TRAINING_TYPE_LABELS[training.type]}</Badge>
            {training.mandatory && <Badge variant="warning">Mandatory</Badge>}
            {training.isArchived && <Badge variant="neutral">Archived</Badge>}
          </div>
          <CardTitle>{training.title}</CardTitle>
          {training.description && <p className="text-sm text-muted-foreground">{training.description}</p>}
        </CardHeader>
        <CardContent className="flex flex-wrap justify-end gap-2">
          <PermissionGuard permission={PERMISSIONS.TRAINING_ASSIGN}>
            <Button variant="secondary" onClick={() => navigate(`/hr/training/${trainingId}/edit`)}>
              <Pencil className="mr-1 h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
          </PermissionGuard>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assigned employees</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not assigned to anyone yet.</p>
          ) : (
            assignments.map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-foreground">{employeeName[assignment.employeeId] ?? assignment.employeeId}</p>
                  {assignment.dueDate && (
                    <p className="text-xs text-muted-foreground">Due {formatDate(assignment.dueDate)}</p>
                  )}
                </div>
                {assignment.status === 'completed' ? (
                  <Badge variant="success">Completed</Badge>
                ) : (
                  <PermissionGuard permission={PERMISSIONS.TRAINING_ASSIGN}>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={completingId === assignment.id}
                      onClick={() => void handleComplete(assignment.id)}
                    >
                      {completingId === assignment.id ? <Spinner className="h-4 w-4" /> : 'Mark complete'}
                    </Button>
                  </PermissionGuard>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <PermissionGuard permission={PERMISSIONS.TRAINING_ASSIGN}>
        <Card>
          <CardHeader>
            <CardTitle>Assign to employees</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {assignableEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground">Every active employee is already assigned.</p>
            ) : (
              <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                {assignableEmployees.map((employee) => (
                  <label key={employee.id} className="flex items-center gap-2 rounded-md p-1.5 text-sm text-foreground hover:bg-border/30">
                    <Checkbox
                      checked={selected.includes(employee.id)}
                      onChange={(e) =>
                        setSelected((current) =>
                          e.target.checked ? [...current, employee.id] : current.filter((id) => id !== employee.id),
                        )
                      }
                    />
                    {employee.fullName}
                  </label>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button disabled={selected.length === 0 || assigning} onClick={() => void handleAssign()}>
                {assigning ? <Spinner className="h-4 w-4" /> : `Assign (${selected.length})`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </PermissionGuard>
    </div>
  )
}
