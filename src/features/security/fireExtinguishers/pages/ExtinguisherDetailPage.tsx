import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { Button, Card, CardContent, Spinner, StatusPill } from '@/components/ui'
import { EmptyState, FileUpload, FileList, PermissionGuard } from '@/components/shared'
import { useFirestoreQuery } from '@/hooks'
import { COLLECTIONS, PERMISSIONS } from '@/constants'
import { where, orderBy } from '@/services/firestore'
import { outletName } from '@/features/security/securityFormat'
import { formatDate } from '@/utils'
import * as aparService from '../fireExtinguisherService'
import {
  EXTINGUISHER_STATUS_ICON,
  EXTINGUISHER_STATUS_LABELS,
  EXTINGUISHER_STATUS_TONE,
  ITEM_RESULT_SYMBOL,
  OVERALL_RESULT_LABELS,
  OVERALL_RESULT_TONE,
  APAR_CHECKLIST_ITEMS,
  formatPeriodMonth,
  formatUnitSpec,
} from '../fireExtinguisherFormat'
import type { FileMetadata, FireExtinguisher, FireExtinguisherInspection } from '@/types'

const LABEL_BY_KEY = new Map(APAR_CHECKLIST_ITEMS.map((item) => [item.key, item.en]))

/**
 * §9.2 — one view that answers "what has happened to this cylinder", which is
 * the question a regulatory audit asks. Self-resolved failures still read as
 * failures here (§4.6): the record shows what went wrong, not only that it
 * ended up fine.
 */
export function ExtinguisherDetailPage() {
  const { extinguisherId } = useParams<{ extinguisherId: string }>()
  const navigate = useNavigate()
  const [unit, setUnit] = useState<FireExtinguisher | null | undefined>(undefined)
  const [inspections, setInspections] = useState<FireExtinguisherInspection[]>([])

  // Same generic `files` convention every other module uses — no attachments
  // array on the unit document.
  const { data: photos } = useFirestoreQuery<FileMetadata>(
    COLLECTIONS.FILES,
    extinguisherId
      ? [
          where('resourceType', '==', 'fireExtinguisher'),
          where('resourceId', '==', extinguisherId),
          where('fileStatus', '==', 'available'),
          orderBy('createdAt', 'desc'),
        ]
      : [],
    [extinguisherId],
  )

  useEffect(() => {
    if (!extinguisherId) return
    let active = true
    void Promise.all([
      aparService.getFireExtinguisher(extinguisherId),
      aparService.getInspectionsForUnit(extinguisherId),
    ]).then(([loadedUnit, history]) => {
      if (!active) return
      setUnit(loadedUnit)
      setInspections(history)
    })
    return () => {
      active = false
    }
  }, [extinguisherId])

  if (unit === undefined) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }
  if (!unit) {
    return <EmptyState title="Extinguisher not found" description="It may have been removed from the register." />
  }

  const unitId = unit.id

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-xl font-semibold text-foreground">{unit.assetCode}</h1>
          <p className="text-sm text-muted-foreground">
            {unit.locationLabel} &middot; {outletName(unit.outletId)}
          </p>
        </div>
        <PermissionGuard permission={PERMISSIONS.APAR_MANAGE}>
          <Button variant="secondary" onClick={() => navigate(`/security/fire-extinguishers/${unitId}/edit`)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Edit
          </Button>
        </PermissionGuard>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
          <Field label="Status">
            <StatusPill
              tone={EXTINGUISHER_STATUS_TONE[unit.status]}
              icon={EXTINGUISHER_STATUS_ICON[unit.status]}
              label={EXTINGUISHER_STATUS_LABELS[unit.status]}
            />
          </Field>
          <Field label="Specification">{formatUnitSpec(unit)}</Field>
          <Field label="Serial number">{unit.serialNumber ?? '—'}</Field>
          <Field label="Installed">{formatDate(unit.installedAt)}</Field>
          <Field label="Expires">{formatDate(unit.expiryDate)}</Field>
          <Field label="Last refilled">{unit.lastRefillDate ? formatDate(unit.lastRefillDate) : '—'}</Field>
          <Field label="Next hydrostatic test">
            {unit.nextHydrostaticTestDate ? formatDate(unit.nextHydrostaticTestDate) : '—'}
          </Field>
          <Field label="Next inspection due">{formatDate(unit.nextInspectionDue)}</Field>
          {unit.retiredReason && <Field label="Retired because">{unit.retiredReason}</Field>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <h2 className="text-sm font-medium text-foreground">In-situ photo</h2>
          <p className="text-xs text-muted-foreground">So a guard can find the cylinder without hunting for it.</p>
          <FileList files={photos} />
          <PermissionGuard permission={PERMISSIONS.APAR_MANAGE}>
            <FileUpload module="security" resourceType="fireExtinguisher" resourceId={unitId} accept="image/*" camera />
          </PermissionGuard>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-foreground">Inspection history</h2>
        {inspections.length === 0 ? (
          <EmptyState title="No inspections recorded" description="Rounds are generated on the 1st of each month." />
        ) : (
          inspections.map((inspection) => (
            <Card key={inspection.id}>
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-foreground">{formatPeriodMonth(inspection.periodMonth)}</p>
                  <StatusPill
                    tone={OVERALL_RESULT_TONE[inspection.overallResult]}
                    icon={EXTINGUISHER_STATUS_ICON[inspection.overallResult === 'pass' ? 'active' : 'needsService']}
                    label={OVERALL_RESULT_LABELS[inspection.overallResult]}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {inspection.inspectedByName ?? 'Unknown inspector'} &middot; {formatDate(inspection.inspectedAt)}
                </p>

                <ul className="flex flex-col gap-1">
                  {inspection.items.map((item) => (
                    <li key={item.key} className="text-sm">
                      <span className="font-mono text-xs text-muted-foreground">{ITEM_RESULT_SYMBOL[item.result]}</span>{' '}
                      <span className={item.result === 'fail' ? 'text-status-rejected' : 'text-foreground'}>
                        {LABEL_BY_KEY.get(item.key) ?? item.key}
                      </span>
                      {item.note && <span className="text-muted-foreground"> — {item.note}</span>}
                      {item.resolution === 'resolvedOnSpot' && (
                        <span className="text-muted-foreground"> (resolved on the spot)</span>
                      )}
                    </li>
                  ))}
                </ul>

                {inspection.remarks && <p className="text-sm text-muted-foreground">{inspection.remarks}</p>}
                {inspection.workOrderId && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="self-start"
                    onClick={() => navigate(`/engineering/work-orders/${inspection.workOrderId}`)}
                  >
                    View work order
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  )
}
