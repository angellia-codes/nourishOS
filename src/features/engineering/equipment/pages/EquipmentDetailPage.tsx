import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRightLeft, Pencil, Wrench } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle, Label, Select, Spinner, StatusPill, Textarea } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { COLLECTIONS, DEPARTMENTS, OUTLETS, OUTLET_AREAS, PERMISSIONS } from '@/constants'
import { useFirestoreDoc, useToast } from '@/hooks'
import { approvalService, userService } from '@/services/shared'
import { formatDate, formatDateTime } from '@/utils'
import * as equipmentService from '../equipmentService'
import {
  EQUIPMENT_CRITICALITY_ICON,
  EQUIPMENT_CRITICALITY_TONE,
  EQUIPMENT_STATUS_ICON,
  EQUIPMENT_STATUS_TONE,
  formatCategorySpec,
  formatCriticalityLabel,
  formatStatusLabel,
} from '../equipmentFormat'
import type { ApprovalHistoryEntry, Equipment } from '@/types'

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

/**
 * equipment-master-design.md §8 — read-only summary, edit, status control,
 * outlet transfer, decommission request, and an empty maintenance-history
 * placeholder until Module B exists. Approve/reject the pending decommission
 * request is deliberately absent here — same reasoning ExpenseDetailPage
 * gives: that belongs to the dashboard's Pending Approvals widget, not the
 * requester's own view of the record.
 */
export function EquipmentDetailPage() {
  const { equipmentId } = useParams<{ equipmentId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const { data: equipment, loading } = useFirestoreDoc<Equipment>(COLLECTIONS.EQUIPMENT, equipmentId)

  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [statusBusy, setStatusBusy] = useState(false)

  const [transferOutletId, setTransferOutletId] = useState('')
  const [transferArea, setTransferArea] = useState('')
  const [transferring, setTransferring] = useState(false)

  const [decommissionReason, setDecommissionReason] = useState('')
  const [requestingDecommission, setRequestingDecommission] = useState(false)

  const approvalRequestId = equipment?.decommissionApprovalRequestId ?? null

  useEffect(() => {
    if (!approvalRequestId) {
      setHistory([])
      return
    }
    let cancelled = false
    void approvalService
      .getApprovalHistory(approvalRequestId)
      .then((entries) => {
        if (!cancelled) setHistory(entries)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [approvalRequestId, equipment?.status])

  useEffect(() => {
    return userService.subscribeToDirectory((users) =>
      setNames(Object.fromEntries(users.map((entry) => [entry.uid, entry.displayName]))),
    )
  }, [])

  async function handleStatusChange(status: 'active' | 'underRepair') {
    if (!equipmentId) return
    setStatusBusy(true)
    try {
      await equipmentService.updateEquipmentStatus(equipmentId, status)
      toast.success(`Status set to ${formatStatusLabel(status)}.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not change status.')
    } finally {
      setStatusBusy(false)
    }
  }

  async function handleTransfer() {
    if (!equipmentId || !transferOutletId || !transferArea) return
    setTransferring(true)
    try {
      await equipmentService.transferEquipmentOutlet({ equipmentId, outletId: transferOutletId, area: transferArea })
      toast.success('Transferred. The asset code stays the same.')
      setTransferOutletId('')
      setTransferArea('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not transfer this asset.')
    } finally {
      setTransferring(false)
    }
  }

  async function handleRequestDecommission() {
    if (!equipmentId || !decommissionReason.trim()) return
    setRequestingDecommission(true)
    try {
      await equipmentService.requestEquipmentDecommission(equipmentId, decommissionReason.trim())
      toast.success('Sent to the outlet manager for approval.')
      setDecommissionReason('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not submit the decommission request.')
    } finally {
      setRequestingDecommission(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  if (!equipment) {
    return <EmptyState title="Equipment not found" description="This asset may have been removed." />
  }

  const isDecommissioned = equipment.status === 'decommissioned'
  const hasPendingDecommission = Boolean(equipment.decommissionApprovalRequestId) && !isDecommissioned

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/engineering/assets')} aria-label="Back">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <div className="flex-1">
          <h1 className="font-mono text-xl font-semibold text-foreground">{equipment.assetCode}</h1>
          <p className="text-sm text-muted-foreground">{equipment.name}</p>
        </div>
        {!isDecommissioned && (
          <PermissionGuard permission={PERMISSIONS.EQUIPMENT_MANAGE}>
            <Button variant="secondary" onClick={() => navigate(`/engineering/assets/${equipmentId}/edit`)}>
              <Pencil className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
          </PermissionGuard>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusPill tone={EQUIPMENT_STATUS_TONE[equipment.status]} icon={EQUIPMENT_STATUS_ICON[equipment.status]} label={formatStatusLabel(equipment.status)} />
        <StatusPill
          tone={EQUIPMENT_CRITICALITY_TONE[equipment.criticality]}
          icon={EQUIPMENT_CRITICALITY_ICON[equipment.criticality]}
          label={formatCriticalityLabel(equipment)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Category" value={formatCategorySpec(equipment)} />
          <Field label="Outlet" value={OUTLETS.find((o) => o.id === equipment.outletId)?.name ?? equipment.outletId} />
          <Field label="Area" value={equipment.area} />
          <Field label="Location detail" value={equipment.locationDetail ?? '—'} />
          <Field label="Department" value={DEPARTMENTS.find((d) => d.id === equipment.departmentId)?.name ?? '—'} />
          <Field label="Manufacturer / Model" value={[equipment.manufacturer, equipment.model].filter(Boolean).join(' / ') || '—'} />
          <Field label="Serial number" value={equipment.serialNumber ?? '—'} />
          <Field label="Installed" value={equipment.installDate ? formatDate(equipment.installDate) : '—'} />
          <Field label="Warranty expiry" value={equipment.warrantyExpiryDate ? formatDate(equipment.warrantyExpiryDate) : '—'} />
          <Field label="Service vendor" value={equipment.serviceVendorName ?? '—'} />
          {equipment.notes && (
            <div className="col-span-2">
              <Field label="Notes" value={equipment.notes} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Maintenance history</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Not tracked yet"
            description="Preventive Maintenance (Module B) will schedule and log service against this asset once it ships."
          />
        </CardContent>
      </Card>

      {isDecommissioned ? (
        <Card>
          <CardHeader>
            <CardTitle>Decommissioned</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Decommissioned" value={equipment.decommissionedAt ? formatDateTime(equipment.decommissionedAt) : '—'} />
            <Field label="Approved by" value={equipment.decommissionedBy ? names[equipment.decommissionedBy] ?? equipment.decommissionedBy : '—'} />
            <div className="col-span-2">
              <Field label="Reason" value={equipment.decommissionReason ?? '—'} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <PermissionGuard permission={PERMISSIONS.EQUIPMENT_MANAGE}>
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button
                  variant={equipment.status === 'active' ? 'secondary' : 'primary'}
                  disabled={statusBusy || equipment.status === 'underRepair'}
                  onClick={() => void handleStatusChange('underRepair')}
                >
                  <Wrench className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Mark under repair
                </Button>
                <Button
                  variant="secondary"
                  disabled={statusBusy || equipment.status === 'active'}
                  onClick={() => void handleStatusChange('active')}
                >
                  Mark active
                </Button>
              </CardContent>
            </Card>
          </PermissionGuard>

          <PermissionGuard permission={PERMISSIONS.EQUIPMENT_MANAGE}>
            <Card>
              <CardHeader>
                <CardTitle>Transfer outlet</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  The asset code stays the same after a transfer — codes are immutable once issued (§3.5).
                </p>
                <div className="flex gap-3">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor="transfer-outlet">Destination outlet</Label>
                    <Select
                      id="transfer-outlet"
                      value={transferOutletId}
                      onChange={(event) => {
                        setTransferOutletId(event.target.value)
                        setTransferArea('')
                      }}
                    >
                      <option value="">Select…</option>
                      {OUTLETS.filter((o) => o.id !== equipment.outletId).map((outlet) => (
                        <option key={outlet.id} value={outlet.id}>
                          {outlet.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor="transfer-area">Destination area</Label>
                    <Select
                      id="transfer-area"
                      value={transferArea}
                      disabled={!transferOutletId}
                      onChange={(event) => setTransferArea(event.target.value)}
                    >
                      <option value="">Select…</option>
                      {(OUTLET_AREAS[transferOutletId] ?? []).map((area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  disabled={!transferOutletId || !transferArea || transferring}
                  onClick={() => void handleTransfer()}
                >
                  <ArrowRightLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  {transferring ? 'Transferring…' : 'Transfer'}
                </Button>
              </CardContent>
            </Card>
          </PermissionGuard>

          <PermissionGuard permission={PERMISSIONS.EQUIPMENT_DECOMMISSION}>
            <Card>
              <CardHeader>
                <CardTitle>Decommission</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {hasPendingDecommission ? (
                  <p className="text-sm text-muted-foreground">
                    A decommission request is pending with this asset's outlet manager.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Ends this asset's PM obligation and removes it from scheduling once the outlet manager approves.
                    </p>
                    <Textarea
                      aria-label="Reason for decommissioning"
                      value={decommissionReason}
                      placeholder="Beyond economical repair after compressor failure"
                      onChange={(event) => setDecommissionReason(event.target.value)}
                    />
                    <Button
                      variant="secondary"
                      disabled={!decommissionReason.trim() || requestingDecommission}
                      onClick={() => void handleRequestDecommission()}
                    >
                      {requestingDecommission ? 'Submitting…' : 'Request decommission'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </PermissionGuard>
        </>
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Approval history</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {history.map((entry) => (
              <p key={entry.id} className="text-sm text-foreground">
                <span className="font-medium">{names[entry.approverUid] ?? 'Approver'}</span> — {entry.action}
                {entry.comments ? `: ${entry.comments}` : ''}
                <span className="ml-2 text-xs text-muted-foreground">{formatDateTime(entry.timestamp)}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
