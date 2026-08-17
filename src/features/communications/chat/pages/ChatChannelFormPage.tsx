import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button, Card, CardContent, Input, Label, Select, Textarea } from '@/components/ui'
import { useToast } from '@/hooks'
import { DEPARTMENTS, OUTLETS } from '@/constants'
import * as chatService from '../chatService'
import type { ChatChannel } from '@/types'

export function ChatChannelFormPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [scopeType, setScopeType] = useState<ChatChannel['scopeType']>('company')
  const [departmentId, setDepartmentId] = useState('')
  const [outletId, setOutletId] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit() {
    setBusy(true)
    try {
      const { channelId } = await chatService.createChannel({
        name: name.trim(),
        description: description.trim() || undefined,
        scopeType,
        departmentId: scopeType === 'department' ? departmentId : undefined,
        outletId: scopeType === 'outlet' ? outletId : undefined,
      })
      toast.success('Channel created.')
      navigate(`/communications/chat/${channelId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the channel.')
    } finally {
      setBusy(false)
    }
  }

  const canSubmit =
    name.trim() !== '' && (scopeType !== 'department' || departmentId !== '') && (scopeType !== 'outlet' || outletId !== '')

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Button variant="ghost" className="self-start" onClick={() => navigate('/communications')}>
        <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
        Communications
      </Button>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <h1 className="text-lg font-semibold text-foreground">New Channel</h1>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="channel-name">Name</Label>
            <Input id="channel-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="channel-description">Description (optional)</Label>
            <Textarea
              id="channel-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="channel-scope">Who's it for?</Label>
            <Select
              id="channel-scope"
              value={scopeType}
              onChange={(e) => setScopeType(e.target.value as ChatChannel['scopeType'])}
            >
              <option value="company">Everyone (company-wide)</option>
              <option value="department">One department</option>
              <option value="outlet">One outlet</option>
            </Select>
          </div>

          {scopeType === 'department' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="channel-department">Department</Label>
              <Select id="channel-department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">Select a department</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {scopeType === 'outlet' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="channel-outlet">Outlet</Label>
              <Select id="channel-outlet" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
                <option value="">Select an outlet</option>
                {OUTLETS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <Button className="self-end" disabled={busy || !canSubmit} onClick={() => void handleSubmit()}>
            Create Channel
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
