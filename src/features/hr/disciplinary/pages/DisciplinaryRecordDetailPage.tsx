import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Spinner, Textarea, Timeline, TimelineItem } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { useToast } from '@/hooks'
import { DISCIPLINARY_TYPE_LABELS } from '@/constants/hr'
import { formatDateTime } from '@/utils'
import * as disciplinaryService from '../disciplinaryService'
import type { DisciplinaryRecord } from '@/types'

export function DisciplinaryRecordDetailPage() {
  const { employeeId, recordId } = useParams<{ employeeId: string; recordId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [record, setRecord] = useState<DisciplinaryRecord | null | undefined>(undefined)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const backTo = `/hr/employees/${employeeId}`

  async function reload() {
    if (!recordId) return
    const row = await disciplinaryService.getDisciplinaryRecord(recordId)
    setRecord(row)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId])

  if (record === undefined) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (!record) {
    return (
      <EmptyState
        title="Record not found"
        action={
          <Button type="button" variant="secondary" onClick={() => navigate(backTo)}>
            Back to profile
          </Button>
        }
      />
    )
  }

  async function handleAddNote() {
    if (!recordId || !note.trim()) return
    setSubmitting(true)
    try {
      await disciplinaryService.addInvestigationNote({ recordId, note: note.trim() })
      setNote('')
      await reload()
    } catch {
      toast.error('Failed to add note. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleClose() {
    if (!recordId) return
    setSubmitting(true)
    try {
      await disciplinaryService.closeDisciplinaryRecord(recordId)
      toast.success('Record closed.')
      await reload()
    } catch {
      toast.error('Failed to close record. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate(backTo)} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">{DISCIPLINARY_TYPE_LABELS[record.type]}</h1>
        </div>
        <Badge variant={record.status === 'open' ? 'warning' : 'neutral'}>{record.status === 'open' ? 'Open' : 'Closed'}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-foreground">{record.description}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Investigation Notes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {record.investigationNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          ) : (
            <Timeline>
              {record.investigationNotes.map((entry, index) => (
                <TimelineItem key={index} title={entry.note} timestamp={formatDateTime(entry.authoredAt)} />
              ))}
            </Timeline>
          )}

          {record.status === 'open' && (
            <div className="flex flex-col gap-2">
              <Textarea placeholder="Add an investigation note…" value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex justify-end">
                <Button type="button" variant="secondary" disabled={!note.trim() || submitting} onClick={handleAddNote}>
                  {submitting ? <Spinner className="h-4 w-4" /> : 'Add Note'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {record.status === 'open' && (
        <div className="flex justify-end">
          <Button type="button" disabled={submitting} onClick={handleClose}>
            Close Record
          </Button>
        </div>
      )}
    </div>
  )
}
