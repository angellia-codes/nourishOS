import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge, Button, Card, CardContent, Select, Spinner, StatusPill } from '@/components/ui'
import { EmptyState, PermissionGuard } from '@/components/shared'
import { PERMISSIONS } from '@/constants'
import * as workOrderService from '../workOrderService'
import {
  WORK_ORDER_PRIORITY_LABELS,
  WORK_ORDER_PRIORITY_VARIANT,
  WORK_ORDER_STATUS_ICON,
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_TONE,
} from '../workOrderFormat'
import type { WorkOrder, WorkOrderStatus } from '@/types'

const OPEN_STATUSES: WorkOrderStatus[] = ['open', 'assigned', 'inProgress']

/** FEATURE_SPECIFICATIONS.md Module 5 — Engineering Work Orders. */
export function WorkOrderListPage() {
  const navigate = useNavigate()

  const [workOrders, setWorkOrders] = useState<WorkOrder[] | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | WorkOrderStatus>('all')

  useEffect(() => {
    return workOrderService.subscribeToWorkOrders(setWorkOrders, () => setWorkOrders([]))
  }, [])

  if (workOrders === null) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    )
  }

  const visible = workOrders.filter((wo) => statusFilter === 'all' || wo.status === statusFilter)
  const openCount = workOrders.filter((wo) => OPEN_STATUSES.includes(wo.status)).length

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Work Orders</h1>
          <p className="text-sm text-muted-foreground">{openCount} open</p>
        </div>
        <PermissionGuard permission={PERMISSIONS.WORK_ORDERS_ASSIGN}>
          <Button type="button" onClick={() => navigate('/operations/work-orders/new')}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            New Work Order
          </Button>
        </PermissionGuard>
      </div>

      <div className="max-w-xs">
        <Select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | WorkOrderStatus)}
        >
          <option value="all">All statuses</option>
          {Object.entries(WORK_ORDER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No work orders match"
          description={workOrders.length === 0 ? 'Nothing raised yet.' : 'Try a different status filter.'}
        />
      ) : (
        visible.map((wo) => (
          <Card
            key={wo.id}
            className="cursor-pointer transition-colors duration-150 hover:border-primary/40"
            onClick={() => navigate(`/operations/work-orders/${wo.id}`)}
          >
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-foreground">{wo.title}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={WORK_ORDER_PRIORITY_VARIANT[wo.priority]}>{WORK_ORDER_PRIORITY_LABELS[wo.priority]}</Badge>
                  <StatusPill
                    tone={WORK_ORDER_STATUS_TONE[wo.status]}
                    icon={WORK_ORDER_STATUS_ICON[wo.status]}
                    label={WORK_ORDER_STATUS_LABELS[wo.status]}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{wo.location}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
