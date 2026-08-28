import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardContent, Input, Label, Select, Spinner, Textarea } from '@/components/ui'
import {
  DEPARTMENTS,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CATEGORY_CRITICALITY_DEFAULTS,
  EQUIPMENT_CATEGORY_LABELS,
  EQUIPMENT_CRITICALITIES,
  EQUIPMENT_CRITICALITY_LABELS,
  OUTLETS,
  OUTLET_AREAS,
  OUTLET_DEPARTMENTS,
} from '@/constants'
import { useAuth, useToast } from '@/hooks'
import * as equipmentService from '../equipmentService'
import type { EquipmentCategory, EquipmentCriticality } from '@/types'

const LIST_ROUTE = '/engineering/assets'

/**
 * equipment-master-design.md §7/§8 — single-record create/edit form.
 *
 * `outletId` is fixed once created: transferring outlets is its own flow
 * (transferEquipmentOutlet), because the destination's `area` list has to be
 * re-validated the same way import does — an edit form silently changing
 * outlet would bypass that.
 */
export function EquipmentFormPage() {
  const { equipmentId } = useParams<{ equipmentId: string }>()
  const isEdit = Boolean(equipmentId)
  const navigate = useNavigate()
  const toast = useToast()
  const { profile } = useAuth()

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)

  const [outletId, setOutletId] = useState(profile?.outletId ?? '')
  const [name, setName] = useState('')
  const [category, setCategory] = useState<EquipmentCategory>('utility')
  const [equipmentType, setEquipmentType] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [model, setModel] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [area, setArea] = useState('')
  const [locationDetail, setLocationDetail] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [criticalityOverride, setCriticalityOverride] = useState<EquipmentCriticality | ''>('')
  const [installDate, setInstallDate] = useState('')
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState('')
  const [serviceVendorName, setServiceVendorName] = useState('')
  const [notes, setNotes] = useState('')
  const [assetCode, setAssetCode] = useState('')

  useEffect(() => {
    if (!equipmentId) return
    let active = true
    void equipmentService.getEquipment(equipmentId).then((item) => {
      if (!active) return
      if (item) {
        setAssetCode(item.assetCode)
        setOutletId(item.outletId)
        setName(item.name)
        setCategory(item.category)
        setEquipmentType(item.equipmentType ?? '')
        setManufacturer(item.manufacturer ?? '')
        setModel(item.model ?? '')
        setSerialNumber(item.serialNumber ?? '')
        setArea(item.area)
        setLocationDetail(item.locationDetail ?? '')
        setDepartmentId(item.departmentId ?? '')
        setCriticalityOverride(item.criticalityOverridden ? item.criticality : '')
        setInstallDate(item.installDate ?? '')
        setWarrantyExpiryDate(item.warrantyExpiryDate ?? '')
        setServiceVendorName(item.serviceVendorName ?? '')
        setNotes(item.notes ?? '')
      }
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [equipmentId])

  const departmentOptions = useMemo(() => {
    const allowed = OUTLET_DEPARTMENTS[outletId] ?? []
    return DEPARTMENTS.filter((department) => allowed.includes(department.id))
  }, [outletId])

  const canSubmit = outletId !== '' && name.trim() !== '' && area !== ''

  function handleOutletChange(nextOutletId: string) {
    setOutletId(nextOutletId)
    if (!OUTLET_AREAS[nextOutletId]?.includes(area)) setArea('')
    if (!OUTLET_DEPARTMENTS[nextOutletId]?.includes(departmentId)) setDepartmentId('')
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    const payload = {
      outletId,
      name: name.trim(),
      category,
      equipmentType: equipmentType.trim() || undefined,
      manufacturer: manufacturer.trim() || undefined,
      model: model.trim() || undefined,
      serialNumber: serialNumber.trim() || undefined,
      area,
      locationDetail: locationDetail.trim() || undefined,
      departmentId: departmentId || undefined,
      criticality: criticalityOverride || undefined,
      installDate: installDate || undefined,
      warrantyExpiryDate: warrantyExpiryDate || undefined,
      serviceVendorName: serviceVendorName.trim() || undefined,
      notes: notes.trim() || undefined,
    }
    try {
      if (equipmentId) {
        await equipmentService.updateEquipment({ ...payload, equipmentId })
        toast.success(`${assetCode} updated.`)
        navigate(`${LIST_ROUTE}/${equipmentId}`)
      } else {
        const result = await equipmentService.createEquipment(payload)
        toast.success(`Registered ${result.assetCode}.`)
        navigate(`${LIST_ROUTE}/${result.equipmentId}`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save this asset. Please try again.')
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
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">
        {isEdit ? <span className="font-mono">{assetCode}</span> : 'Register Equipment'}
      </h1>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="equipment-outlet">Outlet *</Label>
            <Select
              id="equipment-outlet"
              value={outletId}
              // Immutable here — transferEquipmentOutlet is the dedicated flow (§5.4).
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
            <Label htmlFor="equipment-area">Area *</Label>
            <Select id="equipment-area" value={area} disabled={!outletId} onChange={(event) => setArea(event.target.value)}>
              <option value="">Select an area…</option>
              {(OUTLET_AREAS[outletId] ?? []).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="equipment-name">Name *</Label>
            <Input
              id="equipment-name"
              value={name}
              placeholder="Walk-in Chiller — Main Kitchen"
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="equipment-category">Category *</Label>
              <Select id="equipment-category" value={category} onChange={(event) => setCategory(event.target.value as EquipmentCategory)}>
                {EQUIPMENT_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {EQUIPMENT_CATEGORY_LABELS[value]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="equipment-type">Type (descriptive)</Label>
              <Input id="equipment-type" value={equipmentType} onChange={(event) => setEquipmentType(event.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="equipment-criticality">Criticality</Label>
            <Select
              id="equipment-criticality"
              value={criticalityOverride}
              onChange={(event) => setCriticalityOverride(event.target.value as EquipmentCriticality | '')}
            >
              <option value="">Inherit from category ({EQUIPMENT_CRITICALITY_LABELS[EQUIPMENT_CATEGORY_CRITICALITY_DEFAULTS[category]]})</option>
              {EQUIPMENT_CRITICALITIES.map((value) => (
                <option key={value} value={value}>
                  {EQUIPMENT_CRITICALITY_LABELS[value]} (override)
                </option>
              ))}
            </Select>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="equipment-manufacturer">Manufacturer</Label>
              <Input id="equipment-manufacturer" value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="equipment-model">Model</Label>
              <Input id="equipment-model" value={model} onChange={(event) => setModel(event.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="equipment-serial">Serial number</Label>
            <Input id="equipment-serial" value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="equipment-location-detail">Location detail</Label>
            <Input
              id="equipment-location-detail"
              value={locationDetail}
              placeholder="Under the pass, left side"
              onChange={(event) => setLocationDetail(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="equipment-department">Owning department</Label>
            <Select id="equipment-department" value={departmentId} disabled={!outletId} onChange={(event) => setDepartmentId(event.target.value)}>
              <option value="">None</option>
              {departmentOptions.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="equipment-installed">Installed on</Label>
              <Input id="equipment-installed" type="date" value={installDate} onChange={(event) => setInstallDate(event.target.value)} />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="equipment-warranty">Warranty expiry</Label>
              <Input
                id="equipment-warranty"
                type="date"
                value={warrantyExpiryDate}
                onChange={(event) => setWarrantyExpiryDate(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="equipment-vendor">Service vendor</Label>
            <Input id="equipment-vendor" value={serviceVendorName} onChange={(event) => setServiceVendorName(event.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="equipment-notes">Notes</Label>
            <Textarea id="equipment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>

          <div className="flex gap-2">
            <Button onClick={() => void handleSubmit()} disabled={!canSubmit || submitting}>
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Register equipment'}
            </Button>
            <Button variant="secondary" onClick={() => navigate(isEdit ? `${LIST_ROUTE}/${equipmentId}` : LIST_ROUTE)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
