import { db, COLLECTIONS } from '../../lib'
import { sendNotificationInternal } from './notifications'

export interface NotifyUsersByRoleInput {
  role: string
  module: string
  title: string
  message: string
  referenceId?: string
  priority?: 'critical' | 'high' | 'medium' | 'low' | 'informational'
}

export async function notifyUsersByRole(input: NotifyUsersByRoleInput): Promise<void> {
  const usersSnap = await db
    .collection(COLLECTIONS.USERS)
    .where('roleId', '==', input.role)
    .where('status', '==', 'active')
    .get()

  await Promise.all(
    usersSnap.docs.map((userDoc) =>
      sendNotificationInternal({
        type: 'alert',
        title: input.title,
        message: input.message,
        module: input.module,
        priority: input.priority ?? 'medium',
        recipientUid: userDoc.id,
        referenceModule: input.module,
        referenceId: input.referenceId,
      }),
    ),
  )
}
