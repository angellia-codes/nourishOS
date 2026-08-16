import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { useToast } from '@/hooks'
import { TRAINING_TYPE_LABELS, type TrainingType } from '@/constants/hr'
import * as trainingService from '../trainingService'

const TYPES = Object.keys(TRAINING_TYPE_LABELS) as TrainingType[]

export function TrainingFormPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { trainingId } = useParams<{ trainingId: string }>()
  const isEdit = Boolean(trainingId)

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<TrainingType>('sop')
  const [description, setDescription] = useState('')
  const [mandatory, setMandatory] = useState(false)

  useEffect(() => {
    if (!trainingId) return
    let cancelled = false

    void trainingService
      .getTraining(trainingId)
      .then((row) => {
        if (cancelled) return
        if (!row) {
          toast.error('That training no longer exists.')
          navigate('/hr/training')
          return
        }
        setTitle(row.title)
        setType(row.type)
        setDescription(row.description ?? '')
        setMandatory(row.mandatory)
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load that training.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [trainingId, navigate, toast])

  const canSubmit = title.trim() !== '' && !submitting

  async function handleSave() {
    setSubmitting(true)
    try {
      if (trainingId) {
        await trainingService.updateTraining({
          trainingId,
          title: title.trim(),
          type,
          description: description.trim(),
          mandatory,
        })
        toast.success('Training updated.')
        navigate(`/hr/training/${trainingId}`)
        return
      }

      const { trainingId: newId } = await trainingService.createTraining({
        title: title.trim(),
        type,
        description: description.trim() || undefined,
        mandatory,
      })
      toast.success('Training created.')
      navigate(`/hr/training/${newId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save that training.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">{isEdit ? 'Edit Training' : 'New Training'}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Training details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type">Type</Label>
            <Select id="type" value={type} onChange={(e) => setType(e.target.value as TrainingType)}>
              {TYPES.map((value) => (
                <option key={value} value={value}>
                  {TRAINING_TYPE_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} />
            Mandatory training
          </label>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={() => void handleSave()} disabled={!canSubmit}>
          {isEdit ? 'Save changes' : 'Create training'}
        </Button>
      </div>
    </div>
  )
}
