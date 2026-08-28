import { db, COLLECTIONS } from '../../lib'
import { sendNotificationInternal } from './notifications'

export interface NotifyUsersByRoleInput {
  role: string
  /** equipment-master-design.md §5.2 — narrows to one outlet's holders of `role`, instead of every outlet's. */
  outletId?: string
  module: string
  title: string
  message: string
  referenceId?: string
  priority?: 'critical' | 'high' | 'medium' | 'low' | 'informational'
  /** Pass-through to sendNotificationInternal — see its doc comment. */
  whatsapp?: boolean
}

export async function notifyUsersByRole(input: NotifyUsersByRoleInput): Promise<void> {
  let query = db
    .collection(COLLECTIONS.USERS)
    .where('roleId', '==', input.role)
    .where('status', '==', 'active')
  if (input.outletId) {
    query = query.where('outletId', '==', input.outletId)
  }
  const usersSnap = await query.get()

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
        whatsapp: input.whatsapp,
      }),
    ),
  )
}
