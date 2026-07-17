import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Textarea } from '@/components/ui'
import { useToast } from '@/hooks'
import { FINANCE_OUTLETS } from '@/features/finance/financeDemoData'

/** security-control-point.md §5 — F&B geofence/interval guidance. */
const GUIDANCE_ROWS = [
  { type: 'Outdoor perimeter / gate', radius: '15–25m', interval: '60–120 min' },
  { type: 'Parking / loading area', radius: '20–30m', interval: '60–120 min' },
  { type: 'Indoor kitchen / storage / walk-in', radius: '40–60m', interval: '30–60 min' },
  { type: 'Bar / floor / dining area', radius: '30–50m', interval: '60–90 min' },
  { type: 'High-risk (cash office, liquor storage)', radius: '20–40m', interval: '30 min' },
]

/**
 * Security Control Point registration — security-control-point.md §3 (fields
 * match CreateCheckpointInput; outlet select per the §4 scoping flag). The
 * real build uses a map picker with a live radius overlay; the demo takes
 * lat/long directly. Mock only; submit shows a toast.
 */
export function CheckpointRegistrationDemoPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [outletId, setOutletId] = useState(FINANCE_OUTLETS[0].id)
  const [latitude, setLatitude] = useState('-8.65')
  const [longitude, setLongitude] = useState('115.13')
  const [radius, setRadius] = useState('30')
  const [intervalMinutes, setIntervalMinutes] = useState('60')

  const radiusValue = Number(radius)
  const intervalValue = Number(intervalMinutes)
  const canSubmit =
    name.trim() !== '' &&
    latitude !== '' &&
    longitude !== '' &&
    Number.isFinite(radiusValue) &&
    radiusValue > 0 &&
    Number.isFinite(intervalValue) &&
    intervalValue > 0

  function handleSubmit() {
    if (!canSubmit) return
    toast.success(
      `Control point "${name}" registered (demo) — createCheckpoint would validate, write, and audit-log it. Nothing was written to a backend.`,
    )
    navigate('/demo/security')
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-dashed border-border bg-surface p-3 text-center text-xs text-muted-foreground">
        Demo — mock data, no Firebase calls. Submitting shows a toast and returns to the checkpoint list; nothing is persisted.
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/demo/security')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Register Control Point</h1>
            <p className="text-sm text-muted-foreground">
              Supervisor action (<code>security.manageCheckpoints</code>) — the missing admin screen for the shipped
              createCheckpoint function
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Control Point</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cpName">Control Point Name *</Label>
              <Input
                id="cpName"
                placeholder='e.g. "Kitchen Rear Entrance", "Perimeter Gate 2"'
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cpDescription">Description</Label>
              <Textarea
                id="cpDescription"
                placeholder='Landmark/context for the guard, e.g. "Behind the walk-in chiller"'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:max-w-xs">
              <Label htmlFor="cpOutlet">Outlet *</Label>
              <Select id="cpOutlet" value={outletId} onChange={(e) => setOutletId(e.target.value)}>
                {FINANCE_OUTLETS.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                Outlet scoping is an additive schema flag (security-control-point.md §4) — shown here so the form doesn't need
                rework when it lands.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location &amp; Geofence</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              Real build: pin-drop map picker with a live radius overlay, pre-filled from device GPS (reuses
              getCurrentPosition from Patrol Capture). Demo takes coordinates directly.
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cpLat">Latitude *</Label>
                <Input id="cpLat" type="number" step="0.0001" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cpLng">Longitude *</Label>
                <Input id="cpLng" type="number" step="0.0001" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cpRadius">Geofence Radius (meters) *</Label>
                <Input id="cpRadius" type="number" min={1} value={radius} onChange={(e) => setRadius(e.target.value)} />
                {radiusValue <= 0 && <p className="text-xs text-destructive">Radius must be greater than 0.</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cpInterval">Patrol Interval (minutes) *</Label>
                <Input id="cpInterval" type="number" min={1} value={intervalMinutes} onChange={(e) => setIntervalMinutes(e.target.value)} />
                {intervalValue <= 0 && <p className="text-xs text-destructive">Interval must be greater than 0.</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suggested Settings (F&amp;B guidance)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Point type</th>
                  <th className="py-2 pr-3 font-medium">Radius</th>
                  <th className="py-2 font-medium">Interval</th>
                </tr>
              </thead>
              <tbody>
                {GUIDANCE_ROWS.map((row) => (
                  <tr key={row.type} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 text-foreground">{row.type}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{row.radius}</td>
                    <td className="py-2 text-muted-foreground">{row.interval}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">
              Set the radius generously — out-of-range patrols are flagged, not rejected (security-control-point.md §5).
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/demo/security')}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
            Register Control Point
          </Button>
        </div>
      </div>
    </div>
  )
}
