export type ApprovalResolvedHandler = (event: {
  approvalRequestId: string
  module: string
  resourceType: string
  resourceId: string
  newStatus: 'approved' | 'rejected'
}) => Promise<void>

const handlers = new Map<string, ApprovalResolvedHandler>()

/**
 * Called once at module load time by each business module — e.g.
 * hr/appraisal/index.ts calls registerApprovalResolvedHandler('appraisal', ...).
 * Keeps the Approval Engine generic: it dispatches by resourceType string,
 * never imports HR/Finance/Operations code directly (no cross-module coupling).
 */
export function registerApprovalResolvedHandler(resourceType: string, handler: ApprovalResolvedHandler): void {
  handlers.set(resourceType, handler)
}

export function getApprovalResolvedHandler(resourceType: string): ApprovalResolvedHandler | undefined {
  return handlers.get(resourceType)
}
