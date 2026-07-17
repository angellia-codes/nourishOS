import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { useAuth, useToast } from '@/hooks'
import { PRIORITY } from '@/constants/statuses'
import * as employeeService from '@/features/hr/services/employeeService'
import * as dailyUpdateService from '../dailyUpdateService'
import { agingBadgeVariant, agingLabel } from '../dailyUpdateAging'
import { CHALLENGE_CATEGORY_LABELS, formatReportDate } from '../dailyUpdateFormat'
import type { ChallengeCategory, ChallengeSeverity, Employee, Task } from '@/types'

const TASK_STATUS_OPTIONS = [
  { value: 'assigned', label: 'Assigned' },
  { value: 'inProgress', label: 'In Progress' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'completed', label: 'Completed' },
]

interface CarriedForwardReview {
  task: Task
  status: string
  comment: string
}
interface Absence {
  id: string
  name: string
  reason: string
}
interface LateArrival {
  id: string
  name: string
  minutesLate: string
}
interface Achievement {
  id: string
  text: string
}
interface Challenge {
  id: string
  description: string
  category: ChallengeCategory
  severity: ChallengeSeverity
  requiresFollowUp: boolean
}
interface NewTaskRow {
  id: string
  title: string
  description: string
  assignedToId: string
  priority: string
  dueDate: string
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}
function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/**
 * Daily Update Submission Form — daily-updates.md §3 Sections A–F.
 * Section G (attachments) is dropped — nothing here blocks on it and the
 * form has no doc id to attach files against until after submission.
 */
export function DailyUpdateFormPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { profile } = useAuth()

  const [carriedForwardTasks, setCarriedForwardTasks] = useState<Task[] | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [reviews, setReviews] = useState<CarriedForwardReview[]>([])

  useEffect(() => {
    if (!profile?.uid) return
    return dailyUpdateService.subscribeToMyCarriedForwardTasks(profile.uid, (tasks) => {
      setCarriedForwardTasks(tasks)
      setReviews(tasks.map((task) => ({ task, status: task.taskStatus, comment: '' })))
    })
  }, [profile?.uid])

  useEffect(() => employeeService.subscribeToEmployees(setEmployees), [])

  const [staffScheduled, setStaffScheduled] = useState('')
  const [staffPresent, setStaffPresent] = useState('')
  const [absences, setAbsences] = useState<Absence[]>([])
  const [lateArrivals, setLateArrivals] = useState<LateArrival[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [newTasks, setNewTasks] = useState<NewTaskRow[]>([])
  const [submitting, setSubmitting] = useState(false)

  const allReviewed = useMemo(
    () => reviews.every((r) => r.status !== r.task.taskStatus || r.comment.trim().length > 0),
    [reviews],
  )
  const understaffed = Number(staffPresent) < Number(staffScheduled) && staffPresent !== '' && staffScheduled !== ''
  const canSubmit = allReviewed && staffScheduled !== '' && staffPresent !== '' && (!understaffed || absences.length > 0)

  function updateReview(id: string, patch: Partial<Pick<CarriedForwardReview, 'status' | 'comment'>>) {
    setReviews((prev) => prev.map((r) => (r.task.id === id ? { ...r, ...patch } : r)))
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await dailyUpdateService.submitDailyReport({
        staffScheduled: Number(staffScheduled),
        staffPresent: Number(staffPresent),
        absences: absences.map(({ name, reason }) => ({ name, reason })),
        lateArrivals: lateArrivals.map((l) => ({ name: l.name, minutesLate: Number(l.minutesLate) || 0 })),
        achievements: achievements.map((a) => a.text).filter(Boolean),
        challenges: challenges.map(({ description, category, severity, requiresFollowUp }) => ({
          description,
          category,
          severity,
          requiresFollowUp,
        })),
        newTasks: newTasks
          .filter((t) => t.title.trim() && t.assignedToId)
          .map((t) => ({
            title: t.title,
            description: t.description || undefined,
            assignedTo: t.assignedToId,
            priority: t.priority as (typeof PRIORITY)[keyof typeof PRIORITY],
            dueDate: t.dueDate || undefined,
          })),
        carriedForwardReviews: reviews.map((r) => ({ taskId: r.task.id, status: r.status, comment: r.comment })),
      })
      toast.success('Daily update submitted.')
      navigate('/operations')
    } catch {
      toast.error('Failed to submit daily update. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (carriedForwardTasks === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/operations')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">New Daily Update</h1>
          <p className="text-sm text-muted-foreground">
            {profile?.displayName} &middot; {profile?.outletId} &middot; {profile?.departmentId} &middot; {formatReportDate(new Date().toISOString().slice(0, 10))}
          </p>
        </div>
      </div>

      <Card className={allReviewed ? undefined : 'border-warning/40'}>
        <CardHeader>
          <CardTitle>Carried-Forward Tasks</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open tasks carried forward. You can proceed.</p>
          ) : (
            reviews.map((review) => (
              <div key={review.task.id} className="flex flex-col gap-2 rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{review.task.title}</p>
                  <Badge variant={agingBadgeVariant(review.task.daysOpen ?? 0)}>
                    Day {review.task.daysOpen ?? 0} &middot; {agingLabel(review.task.daysOpen ?? 0)}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Select
                    aria-label={`Status for ${review.task.title}`}
                    value={review.status}
                    onChange={(e) => updateReview(review.task.id, { status: e.target.value })}
                  >
                    {TASK_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                  <Input
                    placeholder="Update comment (required if status unchanged)"
                    value={review.comment}
                    onChange={(e) => updateReview(review.task.id, { comment: e.target.value })}
                  />
                </div>
              </div>
            ))
          )}
          {!allReviewed && (
            <p className="text-xs text-warning">Update the status or add a comment for every task above to unlock the rest of the form.</p>
          )}
        </CardContent>
      </Card>

      {!allReviewed ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          <Lock className="h-6 w-6" aria-hidden="true" />
          <p className="text-sm">Staffing, achievements, challenges, and new tasks unlock once every carried-forward task above is reviewed.</p>
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Staffing</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="staffScheduled">Staff Scheduled *</Label>
                  <Input id="staffScheduled" type="number" min={0} value={staffScheduled} onChange={(e) => setStaffScheduled(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="staffPresent">Staff Present *</Label>
                  <Input id="staffPresent" type="number" min={0} value={staffPresent} onChange={(e) => setStaffPresent(e.target.value)} />
                </div>
              </div>

              {understaffed && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Absences (name + reason) *</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setAbsences((prev) => [...prev, { id: newId('abs'), name: '', reason: '' }])}>
                      <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      Add
                    </Button>
                  </div>
                  {absences.map((absence) => (
                    <div key={absence.id} className="flex gap-2">
                      <Input placeholder="Name" value={absence.name} onChange={(e) => setAbsences((prev) => prev.map((a) => (a.id === absence.id ? { ...a, name: e.target.value } : a)))} />
                      <Input placeholder="Reason" value={absence.reason} onChange={(e) => setAbsences((prev) => prev.map((a) => (a.id === absence.id ? { ...a, reason: e.target.value } : a)))} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setAbsences((prev) => prev.filter((a) => a.id !== absence.id))} aria-label="Remove absence">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label>Late Arrivals</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setLateArrivals((prev) => [...prev, { id: newId('late'), name: '', minutesLate: '' }])}>
                    <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    Add
                  </Button>
                </div>
                {lateArrivals.map((late) => (
                  <div key={late.id} className="flex gap-2">
                    <Input placeholder="Name" value={late.name} onChange={(e) => setLateArrivals((prev) => prev.map((l) => (l.id === late.id ? { ...l, name: e.target.value } : l)))} />
                    <Input type="number" min={0} placeholder="Minutes late" value={late.minutesLate} onChange={(e) => setLateArrivals((prev) => prev.map((l) => (l.id === late.id ? { ...l, minutesLate: e.target.value } : l)))} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setLateArrivals((prev) => prev.filter((l) => l.id !== late.id))} aria-label="Remove late arrival">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {achievements.map((achievement) => (
                <div key={achievement.id} className="flex gap-2">
                  <Textarea placeholder="What went well today?" value={achievement.text} onChange={(e) => setAchievements((prev) => prev.map((a) => (a.id === achievement.id ? { ...a, text: e.target.value } : a)))} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setAchievements((prev) => prev.filter((a) => a.id !== achievement.id))} aria-label="Remove achievement">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={() => setAchievements((prev) => [...prev, { id: newId('ach'), text: '' }])} className="self-start">
                <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                Add Achievement
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Challenges / Issues</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {challenges.map((challenge) => (
                <div key={challenge.id} className="flex flex-col gap-2 rounded-md border border-border p-3">
                  <Textarea placeholder="Describe the challenge" value={challenge.description} onChange={(e) => setChallenges((prev) => prev.map((c) => (c.id === challenge.id ? { ...c, description: e.target.value } : c)))} />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Select aria-label="Category" value={challenge.category} onChange={(e) => setChallenges((prev) => prev.map((c) => (c.id === challenge.id ? { ...c, category: e.target.value as ChallengeCategory } : c)))}>
                      {Object.entries(CHALLENGE_CATEGORY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                    <Select aria-label="Severity" value={challenge.severity} onChange={(e) => setChallenges((prev) => prev.map((c) => (c.id === challenge.id ? { ...c, severity: e.target.value as ChallengeSeverity } : c)))}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </Select>
                    <Select aria-label="Requires follow-up task?" value={challenge.requiresFollowUp ? 'yes' : 'no'} onChange={(e) => setChallenges((prev) => prev.map((c) => (c.id === challenge.id ? { ...c, requiresFollowUp: e.target.value === 'yes' } : c)))}>
                      <option value="no">No follow-up needed</option>
                      <option value="yes">Requires follow-up task</option>
                    </Select>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setChallenges((prev) => prev.filter((c) => c.id !== challenge.id))} className="self-end">
                    <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={() => setChallenges((prev) => [...prev, { id: newId('chal'), description: '', category: 'other', severity: 'low', requiresFollowUp: false }])} className="self-start">
                <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                Log Challenge
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>New Open Tasks</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {newTasks.map((task) => (
                <div key={task.id} className="flex flex-col gap-2 rounded-md border border-border p-3">
                  <Input placeholder="Title *" value={task.title} onChange={(e) => setNewTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, title: e.target.value } : t)))} />
                  <Textarea placeholder="Description" value={task.description} onChange={(e) => setNewTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, description: e.target.value } : t)))} />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Select aria-label="Assigned to" value={task.assignedToId} onChange={(e) => setNewTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, assignedToId: e.target.value } : t)))}>
                      <option value="">Assigned to *</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.fullName}
                        </option>
                      ))}
                    </Select>
                    <Select aria-label="Priority" value={task.priority} onChange={(e) => setNewTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, priority: e.target.value } : t)))}>
                      {Object.values(PRIORITY).map((value) => (
                        <option key={value} value={value}>
                          {capitalize(value)}
                        </option>
                      ))}
                    </Select>
                    <Input type="date" aria-label="Due date" value={task.dueDate} onChange={(e) => setNewTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, dueDate: e.target.value } : t)))} />
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setNewTasks((prev) => prev.filter((t) => t.id !== task.id))} className="self-end">
                    <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={() => setNewTasks((prev) => [...prev, { id: newId('task'), title: '', description: '', assignedToId: '', priority: PRIORITY.MEDIUM, dueDate: '' }])} className="self-start">
                <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                Add Task
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/operations')} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting ? <Spinner className="h-4 w-4" /> : 'Submit Daily Update'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
