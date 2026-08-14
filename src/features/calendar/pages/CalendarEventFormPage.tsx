import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
  Spinner,
  Textarea,
} from '@/components/ui'
import { useToast } from '@/hooks'
import { userService } from '@/services/shared'
import { PRIORITY, type Priority } from '@/constants/statuses'
import * as calendarService from '../calendarService'
import { EVENT_TYPE_LABELS, formatIsoDateTime, toIsoInstant } from '../calendarFormat'
import type { CalendarConflict, CalendarEventType } from '@/types'

const TODAY = new Date().toISOString().slice(0, 10)

/** Schedule an event — HR_OPERATIONS.md §9.2 E02-US01, with the §9.2-F07 conflict check on save. */
export function CalendarEventFormPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventType, setEventType] = useState<CalendarEventType>('executiveMeeting')
  const [date, setDate] = useState(TODAY)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [location, setLocation] = useState('')
  const [priority, setPriority] = useState<Priority>(PRIORITY.MEDIUM)
  const [participants, setParticipants] = useState<string[]>([])
  const [options, setOptions] = useState<userService.DirectoryUser[]>([])
  const [conflicts, setConflicts] = useState<CalendarConflict[] | null>(null)
  const [overrideReason, setOverrideReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    return userService.subscribeToDirectory(setOptions)
  }, [])

  const canSubmit =
    title.trim() !== '' && participants.length > 0 && date !== '' && startTime < endTime && !submitting

  function toggleParticipant(uid: string) {
    setParticipants((current) => (current.includes(uid) ? current.filter((id) => id !== uid) : [...current, uid]))
    // Membership changes invalidate a conflict list computed for the old set.
    setConflicts(null)
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await calendarService.createCalendarEvent({
        title,
        description: description || undefined,
        eventType,
        startAt: toIsoInstant(date, startTime),
        endAt: toIsoInstant(date, endTime),
        participants,
        location: location || undefined,
        priority,
        overrideReason: conflicts && overrideReason.trim() ? overrideReason.trim() : undefined,
      })
      toast.success('Event scheduled — participants notified and the Google Calendar push is queued.')
      navigate('/calendar')
    } catch (error) {
      const found = calendarService.conflictsFromError(error)
      if (found) {
        setConflicts(found)
        toast.error('Scheduling conflict — review the clash below or schedule anyway with a reason.')
      } else {
        toast.error('Could not schedule this event. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">New Calendar Event</h1>
        <p className="text-sm text-muted-foreground">
          Participants are notified immediately; the event syncs to the shared Google Calendar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="calTitle">Title *</Label>
            <Input
              id="calTitle"
              placeholder='e.g. "Weekly Ops Review"'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="calType">Event Type *</Label>
              <Select id="calType" value={eventType} onChange={(e) => setEventType(e.target.value as CalendarEventType)}>
                {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="calPriority">Priority *</Label>
              <Select id="calPriority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                {Object.values(PRIORITY).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="calDescription">Description</Label>
            <Textarea
              id="calDescription"
              className="min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>When & Where</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="calDate">Date *</Label>
            <Input
              id="calDate"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setConflicts(null)
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="calStart">Start *</Label>
            <Input
              id="calStart"
              type="time"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value)
                setConflicts(null)
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="calEnd">End *</Label>
            <Input
              id="calEnd"
              type="time"
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value)
                setConflicts(null)
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-3">
            <Label htmlFor="calLocation">Location</Label>
            <Input
              id="calLocation"
              placeholder='e.g. "HQ Meeting Room", "Zoom"'
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          {startTime >= endTime && (
            <p className="text-sm text-destructive sm:col-span-3">End time must be after the start time.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Participants *</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active users available to invite.</p>
          ) : (
            options.map((option) => (
              <label key={option.uid} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <Checkbox checked={participants.includes(option.uid)} onChange={() => toggleParticipant(option.uid)} />
                {option.displayName}
              </label>
            ))
          )}
        </CardContent>
      </Card>

      {conflicts && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Scheduling conflict
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {conflicts.map((conflict, index) => (
                <li key={`${conflict.eventId}-${index}`}>
                  <span className="font-medium text-foreground">{conflict.title}</span> —{' '}
                  {formatIsoDateTime(conflict.startAt)} to {formatIsoDateTime(conflict.endAt)}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="calOverride">Reason for scheduling anyway *</Label>
              <Input
                id="calOverride"
                placeholder="Recorded in the audit log"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => navigate('/calendar')} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!canSubmit || (conflicts !== null && overrideReason.trim() === '')}
          onClick={handleSubmit}
        >
          {submitting ? <Spinner className="h-4 w-4" /> : conflicts ? 'Schedule Anyway' : 'Schedule Event'}
        </Button>
      </div>
    </div>
  )
}
