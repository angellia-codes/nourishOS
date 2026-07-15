import { notifyUsersByRole } from '../notifications'

/**
 * Notifies every active user holding `approverRole` that a request needs
 * their action — used both when a request is first submitted (step 0) and
 * when it advances to the next step after an approval. Generic copy so it
 * works for any module without per-resourceType customization; a module
 * can layer nicer copy on top later without changing this contract.
 *
 * Thin wrapper over the shared notifyUsersByRole() primitive — the actual
 * "query users by role, send to each" logic lives in one place now,
 * shared with the Security module's checkpoint/overdue alerts.
 */
export async function notifyStepApprovers(input: {
  approverRole: string
  module: string
  resourceType: string
  resourceId: string
}): Promise<void> {
  const label = input.resourceType.charAt(0).toUpperCase() + input.resourceType.slice(1)

  await notifyUsersByRole({
    role: input.approverRole,
    module: input.module,
    title: `${label} Awaiting Your Approval`,
    message: `A ${input.resourceType} has been submitted and requires your approval.`,
    referenceId: input.resourceId,
  })
}
