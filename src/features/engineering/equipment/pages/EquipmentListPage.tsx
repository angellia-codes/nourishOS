import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Download, Plus, Upload } from 'lucide-react'
import { Button, Card, CardContent, Input, Select, Spinner, StatusPill } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { EQUIPMENT_CATEGORY_LABELS, EQUIPMENT_CRITICALITY_LABELS, EQUIPMENT_CSV_COLUMNS, EQUIPMENT_STATUS_LABELS, OUTLETS, OUTLET_AREAS, PERMISSIONS } from '@/constants'
import { useAuth } from '@/hooks'
import { downloadCsv, toCsv, type CsvColumn } from '@/utils/csv'
import * as equipmentService from '../equipmentService'
import {
  EQUIPMENT_CRITICALITY_ICON,
  EQUIPMENT_CRITICALITY_TONE,
  EQUIPMENT_STATUS_ICON,
  EQUIPMENT_STATUS_TONE,
  formatCategorySpec,
} from '../equipmentFormat'
import type { Equipment } from '@/types'

const EXPORT_COLUMNS: CsvColumn<Equipment>[] = [
  { header: 'name', value: (e) => e.name },
  { header: 'category', value: (e) => e.category },
  { header: 'outletCode', value: (e) => e.outletId },
  { header: 'area', value: (e) => e.area },
  { header: 'equipmentType', value: (e) => e.equipmentType ?? '' },
  { header: 'manufacturer', value: (e) => e.manufacturer ?? '' },
  { header: 'model', value: (e) => e.model ?? '' },
  { header: 'serialNumber', value: (e) => e.serialNumber ?? '' },
  { header: 'locationDetail', value: (e) => e.locationDetail ?? '' },
  { header: 'departmentCode', value: (e) => e.departmentId ?? '' },
  { header: 'criticality', value: (e) => (e.criticalityOverridden ? e.criticality : '') },
  { header: 'installDate', value: (e) => e.installDate ?? '' },
  { header: 'warrantyExpiryDate', value: (e) => e.warrantyExpiryDate ?? '' },
  { header: 'serviceVendorName', value: (e) => e.serviceVendorName ?? '' },
  { header: 'assetCode', value: (e) => e.assetCode },
  { header: 'notes', value: (e) => e.notes ?? '' },
]

/** equipment-master-design.md §8 — list/filter/search over the register. */
export function EquipmentListPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [equipment, setEquipment] = useState<Equipment[] | null>(null)
  const [outletFilter, setOutletFilter] = useState(profile?.outletId ?? '')
  const [areaFilter, setAreaFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [criticalityFilter, setCriticalityFilter] = useState('')
  const [showDecommissioned, setShowDecommissioned] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => equipmentService.subscribeToRegister(setEquipment), [])

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (equipment ?? []).filter((item) => {
      if (!showDecommissioned && item.status === 'decommissioned') return false
      if (outletFilter && item.outletId !== outletFilter) return false
      if (areaFilter && item.area !== areaFilter) return false
      if (categoryFilter && item.category !== categoryFilter) return false
      if (criticalityFilter && item.criticality !== criticalityFilter) return false
      if (
        query &&
        !item.name.toLowerCase().includes(query) &&
        !item.assetCode.toLowerCase().includes(query) &&
        !(item.serialNumber ?? '').toLowerCase().includes(query)
      ) {
        return false
      }
      return true
    })
  }, [equipment, outletFilter, areaFilter, categoryFilter, criticalityFilter, showDecommissioned, search])

  function handleExport() {
    downloadCsv(toCsv(equipment ?? [], EXPORT_COLUMNS), 'equipment-register.csv')
  }

  if (equipment === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Equipment</h1>
          <p className="text-sm text-muted-foreground">
            {visible.length} asset{visible.length === 1 ? '' : 's'} &middot; equipment-master-design.md
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleExport}>
            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Export
          </Button>
          <PermissionGuard permission={PERMISSIONS.EQUIPMENT_IMPORT}>
            <Button variant="secondary" onClick={() => navigate('/engineering/assets/import')}>
              <Upload className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Import
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.EQUIPMENT_MANAGE}>
            <Button onClick={() => navigate('/engineering/assets/new')}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Register equipment
            </Button>
          </PermissionGuard>
        </div>
      </div>

      <Input
        aria-label="Search by name, asset code, or serial number"
        placeholder="Search name, asset code, or serial number…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <Select
          aria-label="Filter by outlet"
          value={outletFilter}
          onChange={(event) => {
            setOutletFilter(event.target.value)
            setAreaFilter('')
          }}
        >
          <option value="">All outlets</option>
          {OUTLETS.map((outlet) => (
            <option key={outlet.id} value={outlet.id}>
              {outlet.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by area"
          value={areaFilter}
          disabled={!outletFilter}
          onChange={(event) => setAreaFilter(event.target.value)}
        >
          <option value="">All areas</option>
          {(OUTLET_AREAS[outletFilter] ?? []).map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </Select>
        <Select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="">All categories</option>
          {Object.entries(EQUIPMENT_CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by criticality"
          value={criticalityFilter}
          onChange={(event) => setCriticalityFilter(event.target.value)}
        >
          <option value="">All criticalities</option>
          {Object.entries(EQUIPMENT_CRITICALITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Show decommissioned"
          value={showDecommissioned ? 'yes' : 'no'}
          onChange={(event) => setShowDecommissioned(event.target.value === 'yes')}
        >
          <option value="no">Active register</option>
          <option value="yes">Include decommissioned</option>
        </Select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No equipment found"
          description="Nothing matches these filters yet — register the first asset or adjust the filters above."
        />
      ) : (
        visible.map((item) => (
          <Card
            key={item.id}
            className="cursor-pointer transition-colors duration-150 hover:border-primary/40"
            onClick={() => navigate(`/engineering/assets/${item.id}`)}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-medium text-foreground">{item.assetCode}</span>
                  <StatusPill
                    tone={EQUIPMENT_STATUS_TONE[item.status]}
                    icon={EQUIPMENT_STATUS_ICON[item.status]}
                    label={EQUIPMENT_STATUS_LABELS[item.status]}
                  />
                  <StatusPill
                    tone={EQUIPMENT_CRITICALITY_TONE[item.criticality]}
                    icon={EQUIPMENT_CRITICALITY_ICON[item.criticality]}
                    label={EQUIPMENT_CRITICALITY_LABELS[item.criticality]}
                    className="hidden sm:inline-flex"
                  />
                </div>
                <p className="text-sm text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCategorySpec(item)} &middot; {OUTLETS.find((o) => o.id === item.outletId)?.name ?? item.outletId} &middot;{' '}
                  {item.area}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
