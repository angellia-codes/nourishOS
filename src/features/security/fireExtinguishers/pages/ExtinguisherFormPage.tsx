import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardContent, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import { PermissionGuard } from '@/components/shared'
import { DEPARTMENTS, OUTLETS, OUTLET_DEPARTMENTS, PERMISSIONS } from '@/constants'
import { useAuth, useToast } from '@/hooks'
import * as aparService from '../fireExtinguisherService'
import { EXTINGUISHER_TYPE_LABELS } from '../fireExtinguisherFormat'
import type { ExtinguisherType } from '@/types'

const LIST_ROUTE = '/security/fire-extinguishers'

const TYPES = Object.keys(EXTINGUISHER_TYPE_LABELS) as ExtinguisherType[]

/**
 * §9 register/edit form. Ten-plus fields including three dates, so it is a
 * single-column layout that works at 360px rather than a desk-only grid.
 *
 * Outlet is fixed after registration: the asset code encodes it and is
 * immutable (§4.2), so relocating a cylinder is a retire-and-re-register.
 */
export function ExtinguisherFormPage() {
  const { extinguisherId } = useParams<{ extinguisherId: string }>()
  const isEdit = Boolean(extinguisherId)
  const navigate = useNavigate()
  const toast = useToast()
  const { profile } = useAuth()

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [retiring, setRetiring] = useState(false)
  const [retireReason, setRetireReason] = useState('')

  const [outletId, setOutletId] = useState(profile?.outletId ?? '')
  const [departmentId, setDepartmentId] = useState('')
  const [locationLabel, setLocationLabel] = useState('')
  const [extinguisherType, setExtinguisherType] = useState<ExtinguisherType>('powder')
  const [weightKg, setWeightKg] = useState('6')
  const [serialNumber, setSerialNumber] = useState('')
  const [manufactureDate, setManufactureDate] = useState('')
  const [installedAt, setInstalledAt] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [lastRefillDate, setLastRefillDate] = useState('')
  const [nextHydrostaticTestDate, setNextHydrostaticTestDate] = useState('')
  const [assetCode, setAssetCode] = useState('')

  useEffect(() => {
    if (!extinguisherId) return
    let active = true
    void aparService.getFireExtinguisher(extinguisherId).then((unit) => {
      if (!active) return
      if (unit) {
        setAssetCode(unit.assetCode)
        setOutletId(unit.outletId)
        setDepartmentId(unit.departmentId)
        setLocationLabel(unit.locationLabel)
        setExtinguisherType(unit.extinguisherType)
        setWeightKg(String(unit.weightKg))
        setSerialNumber(unit.serialNumber ?? '')
        setManufactureDate(unit.manufactureDate ?? '')
        setInstalledAt(unit.installedAt)
        setExpiryDate(unit.expiryDate)
        setLastRefillDate(unit.lastRefillDate ?? '')
        setNextHydrostaticTestDate(unit.nextHydrostaticTestDate ?? '')
      }
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [extinguisherId])

  const departmentOptions = useMemo(() => {
    const allowed = OUTLET_DEPARTMENTS[outletId] ?? []
    return DEPARTMENTS.filter((department) => allowed.includes(department.id))
  }, [outletId])

  const canSubmit =
    outletId !== '' &&
    departmentId !== '' &&
    locationLabel.trim() !== '' &&
    Number(weightKg) > 0 &&
    installedAt !== '' &&
    expiryDate !== ''

  function handleOutletChange(nextOutletId: string) {
    setOutletId(nextOutletId)
    if (!OUTLET_DEPARTMENTS[nextOutletId]?.includes(departmentId)) setDepartmentId('')
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    const payload = {
      outletId,
      departmentId,
      locationLabel: locationLabel.trim(),
      extinguisherType,
      weightKg: Number(weightKg),
      serialNumber: serialNumber.trim() || undefined,
      manufactureDate: manufactureDate || undefined,
      installedAt,
      expiryDate,
      lastRefillDate: lastRefillDate || undefined,
      nextHydrostaticTestDate: nextHydrostaticTestDate || undefined,
    }
    try {
      if (extinguisherId) {
        await aparService.updateFireExtinguisher({ ...payload, extinguisherId })
        toast.success(`${assetCode} updated.`)
        navigate(`${LIST_ROUTE}/${extinguisherId}`)
      } else {
        const result = await aparService.registerFireExtinguisher(payload)
        toast.success(`Registered ${result.assetCode}.`)
        navigate(`${LIST_ROUTE}/${result.extinguisherId}`)
      }
    } catch {
      toast.error('Failed to save this unit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRetire() {
    if (!extinguisherId || !retireReason.trim()) return
    setRetiring(true)
    try {
      await aparService.retireFireExtinguisher(extinguisherId, retireReason.trim())
      toast.success(`${assetCode} retired.`)
      navigate(LIST_ROUTE)
    } catch {
      toast.error('Failed to retire this unit. Please try again.')
    } finally {
      setRetiring(false)
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
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">
        {isEdit ? <span className="font-mono">{assetCode}</span> : 'Register Extinguisher'}
      </h1>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apar-outlet">Outlet *</Label>
            <Select
              id="apar-outlet"
              value={outletId}
              // Immutable after registration — the asset code encodes the outlet.
              disabled={isEdit}
              onChange={(event) => handleOutletChange(event.target.value)}
            >
              <option value="">Select an outlet…</option>
              {OUTLETS.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apar-department">Area / Department *</Label>
            <Select
              id="apar-department"
              value={departmentId}
              disabled={!outletId}
              onChange={(event) => setDepartmentId(event.target.value)}
            >
              <option value="">Select a department…</option>
              {departmentOptions.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apar-location">Location *</Label>
            <Input
              id="apar-location"
              value={locationLabel}
              placeholder="Kitchen — beside the walk-in chiller"
              onChange={(event) => setLocationLabel(event.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="apar-type">Type *</Label>
              <Select
                id="apar-type"
                value={extinguisherType}
                onChange={(event) => setExtinguisherType(event.target.value as ExtinguisherType)}
              >
                {TYPES.map((type) => (
                  <option key={type} value={type}>
                    {EXTINGUISHER_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex w-28 flex-col gap-1.5">
              <Label htmlFor="apar-weight">Size (kg) *</Label>
              <Input
                id="apar-weight"
                type="number"
                min="0"
                step="0.5"
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apar-serial">Serial number</Label>
            <Input id="apar-serial" value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apar-installed">Installed on *</Label>
            <Input
              id="apar-installed"
              type="date"
              value={installedAt}
              onChange={(event) => setInstalledAt(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apar-expiry">Expiry date *</Label>
            <Input
              id="apar-expiry"
              type="date"
              value={expiryDate}
              onChange={(event) => setExpiryDate(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Alerts fire at 90, 30 and 7 days; the unit stops counting as coverage on the day it expires.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apar-manufacture">Manufactured on</Label>
            <Input
              id="apar-manufacture"
              type="date"
              value={manufactureDate}
              onChange={(event) => setManufactureDate(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apar-refill">Last refilled on</Label>
            <Input
              id="apar-refill"
              type="date"
              value={lastRefillDate}
              onChange={(event) => setLastRefillDate(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="apar-hydrostatic">Next hydrostatic test</Label>
            <Input
              id="apar-hydrostatic"
              type="date"
              value={nextHydrostaticTestDate}
              onChange={(event) => setNextHydrostaticTestDate(event.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={() => void handleSubmit()} disabled={!canSubmit || submitting}>
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Register unit'}
            </Button>
            <Button variant="secondary" onClick={() => navigate(LIST_ROUTE)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      {isEdit && (
        <PermissionGuard permission={PERMISSIONS.APAR_MANAGE}>
          <Card>
            <CardContent className="flex flex-col gap-3 p-4">
              <div>
                <h2 className="text-sm font-medium text-foreground">Retire this unit</h2>
                <p className="text-xs text-muted-foreground">
                  Drops it out of the register, the monthly rounds and the expiry sweep. Its inspection history stays
                  readable for audit.
                </p>
              </div>
              <Textarea
                aria-label="Reason for retiring"
                value={retireReason}
                placeholder="Replaced after hydrostatic test failure"
                onChange={(event) => setRetireReason(event.target.value)}
              />
              <Button
                variant="secondary"
                disabled={!retireReason.trim() || retiring}
                onClick={() => void handleRetire()}
              >
                {retiring ? 'Retiring…' : 'Retire unit'}
              </Button>
            </CardContent>
          </Card>
        </PermissionGuard>
      )}
    </div>
  )
}
