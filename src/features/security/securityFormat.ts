import { OUTLETS } from '@/constants'

/** Outlet ids are stored, not names — the checkpoint list shows the label. Same one-liner as shiftReportFormat.ts. */
export function outletName(outletId: string): string {
  return OUTLETS.find((outlet) => outlet.id === outletId)?.name ?? outletId
}
