import type { AppraisalTemplate } from '@/types'

type TemplateStatus = AppraisalTemplate['templateStatus']

export const TEMPLATE_STATUS_LABELS: Record<TemplateStatus, string> = {
  draft: 'Draft',
  pendingGm: 'Awaiting GM',
  approved: 'Approved',
  stale: 'Stale',
  archived: 'Archived',
}

export const TEMPLATE_STATUS_VARIANT: Record<TemplateStatus, 'success' | 'warning' | 'neutral'> = {
  draft: 'warning',
  pendingGm: 'warning',
  approved: 'success',
  stale: 'warning',
  archived: 'neutral',
}
