import { db, COLLECTIONS } from '../../lib'
import { sendNotificationInternal } from '../notifications'

/**
 * Notifies every active user holding `approverRole` that a request needs
 * their action — used both when a request is first submitted (step 0) and
 * when it advances to the next step after an approval. Generic copy so it
 * works for any module without per-resourceType customization; a module
 * can layer nicer copy on top later without changing this contract.
 */
export async function notifyStepApprovers(input: {
  approverRole: string
  module: string
  resourceType: string
  resourceId: string
}): Promise<void> {
  const { approverRole, module, resourceType, resourceId } = input

  const usersSnap = await db
    .collection(COLLECTIONS.USERS)
    .where('roleId', '==', approverRole)
    .where('status', '==', 'active')
    .get()

  const label = resourceType.charAt(0).toUpperCase() + resourceType.slice(1)

  await Promise.all(
    usersSnap.docs.map((userDoc) =>
      sendNotificationInternal({
        type: 'approval',
        title: `${label} Awaiting Your Approval`,
        message: `A ${resourceType} has been submitted and requires your approval.`,
        module,
        priority: 'medium',
        recipientUid: userDoc.id,
        referenceModule: module,
        referenceId: resourceId,
      }),
    ),
  )
}
