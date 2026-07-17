import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, Plus, Trash2, Upload } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Textarea } from '@/components/ui'
import { useToast } from '@/hooks'
import { PRIORITY } from '@/constants/statuses'
import { MOCK_EMPLOYEES } from '@/features/hr/pages/employeeDemoData'
import {
  MOCK_CARRIED_FORWARD_TASKS,
  type ChallengeCategory,
  type ChallengeSeverity,
  type MockCarriedForwardTask,
} from './dailyUpdateDemoData'
import { agingBadgeVariant, agingLabel } from './dailyUpdateAging'
import { CHALLENGE_CATEGORY_LABELS } from './dailyUpdateFormat'

const TASK_STATUS_OPTIONS: { value: MockCarriedForwardTask['currentStatus']; label: string }[] = [
  { value: 'assigned', label: 'Assigned' },
  { value: 'inProgress', label: 'In Progress' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'completed', label: 'Completed' },
]

interface CarriedForwardReview {
  task: MockCarriedForwardTask
  status: MockCarriedForwardTask['currentStatus']
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

interface NewTask {
  id: string
  title: string
  description: string
  assignedToId: string
  priority: string
  dueDate: string
}

interface Attachment {
  id: string
  fileName: string
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/**
 * Read-only visual preview of the Daily Update Submission Form —
 * daily-updates.md §3 Sections A–G. Mock data, no Firestore/Cloud Function
 * calls. Section B blocking (E10-US02, M17-F10) is reproduced client-side:
 * Sections C–G stay locked until every carried-forward task has either a
 * changed status or a comment.
 */
export function DailyUpdateFormDemoPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [reviews, setReviews] = useState<CarriedForwardReview[]>(
    MOCK_CARRIED_FORWARD_TASKS.map((task) => ({ task, status: task.currentStatus, comment: '' })),
  )

  const [staffScheduled, setStaffScheduled] = useState('')
  const [staffPresent, setStaffPresent] = useState('')
  const [absences, setAbsences] = useState<Absence[]>([])
  const [lateArrivals, setLateArrivals] = useState<LateArrival[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [newTasks, setNewTasks] = useState<NewTask[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])

  const allReviewed = useMemo(
    () => reviews.every((r) => r.status !== r.task.currentStatus || r.comment.trim().length > 0),
    [reviews],
  )
  const understaffed = Number(staffPresent) < Number(staffScheduled) && staffPresent !== '' && staffScheduled !== ''

  function updateReview(id: string, patch: Partial<Pick<CarriedForwardReview, 'status' | 'comment'>>) {
    setReviews((prev) => prev.map((r) => (r.task.id === id ? { ...r, ...patch } : r)))
  }

  function handleSubmit() {
    if (!allReviewed || !staffScheduled || !staffPresent) return
    toast.success('Daily update submitted (demo) — nothing was written to a backend.')
    navigate('/demo/operations')
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. Submitting shows a toast and returns to the feed; nothing is persisted.
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/demo/operations')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">New Daily Update</h1>
            <p className="text-sm text-muted-foreground">Ni Made Ayu Ratih &middot; outlet-sanur &middot; fnb &middot; 16 Jul 2026</p>
          </div>
        </div>

        {/* Section B — Carried-Forward Review (blocking) */}
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
                    <Badge variant={agingBadgeVariant(review.task.daysOpen)}>
                      Day {review.task.daysOpen} &middot; {agingLabel(review.task.daysOpen)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Select
                      aria-label={`Status for ${review.task.title}`}
                      value={review.status}
                      onChange={(e) => updateReview(review.task.id, { status: e.target.value as MockCarriedForwardTask['currentStatus'] })}
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
              <p className="text-xs text-warning">
                Update the status or add a comment for every task above to unlock the rest of the form.
              </p>
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
            {/* Section C — Staffing */}
            <Card>
              <CardHeader>
                <CardTitle>Staffing</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="staffScheduled">Staff Scheduled *</Label>
                    <Input
                      id="staffScheduled"
                      type="number"
                      min={0}
                      value={staffScheduled}
                      onChange={(e) => setStaffScheduled(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="staffPresent">Staff Present *</Label>
                    <Input
                      id="staffPresent"
                      type="number"
                      min={0}
                      value={staffPresent}
                      onChange={(e) => setStaffPresent(e.target.value)}
                    />
                  </div>
                </div>

                {understaffed && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Label>Absences (name + reason) *</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setAbsences((prev) => [...prev, { id: newId('abs'), name: '', reason: '' }])}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                        Add
                      </Button>
                    </div>
                    {absences.map((absence) => (
                      <div key={absence.id} className="flex gap-2">
                        <Input
                          placeholder="Name"
                          value={absence.name}
                          onChange={(e) =>
                            setAbsences((prev) => prev.map((a) => (a.id === absence.id ? { ...a, name: e.target.value } : a)))
                          }
                        />
                        <Input
                          placeholder="Reason"
                          value={absence.reason}
                          onChange={(e) =>
                            setAbsences((prev) => prev.map((a) => (a.id === absence.id ? { ...a, reason: e.target.value } : a)))
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setAbsences((prev) => prev.filter((a) => a.id !== absence.id))}
                          aria-label="Remove absence"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Late Arrivals</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLateArrivals((prev) => [...prev, { id: newId('late'), name: '', minutesLate: '' }])}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      Add
                    </Button>
                  </div>
                  {lateArrivals.map((late) => (
                    <div key={late.id} className="flex gap-2">
                      <Input
                        placeholder="Name"
                        value={late.name}
                        onChange={(e) =>
                          setLateArrivals((prev) => prev.map((l) => (l.id === late.id ? { ...l, name: e.target.value } : l)))
                        }
                      />
                      <Input
                        type="number"
                        min={0}
                        placeholder="Minutes late"
                        value={late.minutesLate}
                        onChange={(e) =>
                          setLateArrivals((prev) => prev.map((l) => (l.id === late.id ? { ...l, minutesLate: e.target.value } : l)))
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setLateArrivals((prev) => prev.filter((l) => l.id !== late.id))}
                        aria-label="Remove late arrival"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Section D — Achievements */}
            <Card>
              <CardHeader>
                <CardTitle>Achievements</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {achievements.map((achievement) => (
                  <div key={achievement.id} className="flex gap-2">
                    <Textarea
                      className="min-h-[60px]"
                      placeholder="What went well today?"
                      value={achievement.text}
                      onChange={(e) =>
                        setAchievements((prev) =>
                          prev.map((a) => (a.id === achievement.id ? { ...a, text: e.target.value } : a)),
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setAchievements((prev) => prev.filter((a) => a.id !== achievement.id))}
                      aria-label="Remove achievement"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setAchievements((prev) => [...prev, { id: newId('ach'), text: '' }])}
                  className="self-start"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  Add Achievement
                </Button>
              </CardContent>
            </Card>

            {/* Section E — Challenges / Issues */}
            <Card>
              <CardHeader>
                <CardTitle>Challenges / Issues</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {challenges.map((challenge) => (
                  <div key={challenge.id} className="flex flex-col gap-2 rounded-md border border-border p-3">
                    <Textarea
                      className="min-h-[60px]"
                      placeholder="Describe the challenge"
                      value={challenge.description}
                      onChange={(e) =>
                        setChallenges((prev) =>
                          prev.map((c) => (c.id === challenge.id ? { ...c, description: e.target.value } : c)),
                        )
                      }
                    />
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Select
                        aria-label="Category"
                        value={challenge.category}
                        onChange={(e) =>
                          setChallenges((prev) =>
                            prev.map((c) => (c.id === challenge.id ? { ...c, category: e.target.value as ChallengeCategory } : c)),
                          )
                        }
                      >
                        {Object.entries(CHALLENGE_CATEGORY_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                      <Select
                        aria-label="Severity"
                        value={challenge.severity}
                        onChange={(e) =>
                          setChallenges((prev) =>
                            prev.map((c) => (c.id === challenge.id ? { ...c, severity: e.target.value as ChallengeSeverity } : c)),
                          )
                        }
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </Select>
                      <Select
                        aria-label="Requires follow-up task?"
                        value={challenge.requiresFollowUp ? 'yes' : 'no'}
                        onChange={(e) =>
                          setChallenges((prev) =>
                            prev.map((c) =>
                              c.id === challenge.id ? { ...c, requiresFollowUp: e.target.value === 'yes' } : c,
                            ),
                          )
                        }
                      >
                        <option value="no">No follow-up needed</option>
                        <option value="yes">Requires follow-up task</option>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setChallenges((prev) => prev.filter((c) => c.id !== challenge.id))}
                      className="self-end"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setChallenges((prev) => [
                      ...prev,
                      { id: newId('chal'), description: '', category: 'other', severity: 'low', requiresFollowUp: false },
                    ])
                  }
                  className="self-start"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  Log Challenge
                </Button>
              </CardContent>
            </Card>

            {/* Section F — New Open Tasks */}
            <Card>
              <CardHeader>
                <CardTitle>New Open Tasks</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {newTasks.map((task) => (
                  <div key={task.id} className="flex flex-col gap-2 rounded-md border border-border p-3">
                    <Input
                      placeholder="Title *"
                      value={task.title}
                      onChange={(e) =>
                        setNewTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, title: e.target.value } : t)))
                      }
                    />
                    <Textarea
                      className="min-h-[60px]"
                      placeholder="Description"
                      value={task.description}
                      onChange={(e) =>
                        setNewTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, description: e.target.value } : t)))
                      }
                    />
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Select
                        aria-label="Assigned to"
                        value={task.assignedToId}
                        onChange={(e) =>
                          setNewTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, assignedToId: e.target.value } : t)))
                        }
                      >
                        <option value="">Assigned to *</option>
                        {MOCK_EMPLOYEES.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.fullName}
                          </option>
                        ))}
                      </Select>
                      <Select
                        aria-label="Priority"
                        value={task.priority}
                        onChange={(e) =>
                          setNewTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, priority: e.target.value } : t)))
                        }
                      >
                        {Object.values(PRIORITY).map((value) => (
                          <option key={value} value={value}>
                            {capitalize(value)}
                          </option>
                        ))}
                      </Select>
                      <Input
                        type="date"
                        aria-label="Due date"
                        value={task.dueDate}
                        onChange={(e) =>
                          setNewTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, dueDate: e.target.value } : t)))
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewTasks((prev) => prev.filter((t) => t.id !== task.id))}
                      className="self-end"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setNewTasks((prev) => [
                      ...prev,
                      { id: newId('task'), title: '', description: '', assignedToId: '', priority: PRIORITY.MEDIUM, dueDate: '' },
                    ])
                  }
                  className="self-start"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  Add Task
                </Button>
              </CardContent>
            </Card>

            {/* Section G — Attachments */}
            <Card>
              <CardHeader>
                <CardTitle>Attachments</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    setAttachments((prev) => [...prev, { id: newId('att'), fileName: `Photo ${prev.length + 1}.jpg` }])
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setAttachments((prev) => [...prev, { id: newId('att'), fileName: `Photo ${prev.length + 1}.jpg` }])
                    }
                  }}
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors duration-150 hover:border-primary/50"
                >
                  <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-primary">Click to add a demo attachment</span>
                  </p>
                </div>
                {attachments.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {attachments.map((att) => (
                      <li key={att.id} className="flex items-center gap-3 rounded-md border border-border p-2 text-sm">
                        <span className="flex-1 truncate text-foreground">{att.fileName}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                          aria-label={`Remove ${att.fileName}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => navigate('/demo/operations')}>
                Cancel
              </Button>
              <Button type="button" disabled={!staffScheduled || !staffPresent} onClick={handleSubmit}>
                Submit Daily Update
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
