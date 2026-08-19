import { subscribeToCollection, where } from '@/services/firestore'
import { COLLECTIONS } from '@/constants'
import type { UserProfile } from '@/types'
import type { Unsubscribe } from '@/services/firestore'

export interface DirectoryUser {
  uid: string
  displayName: string
  roleId: string
  departmentId: string
  outletId: string
}

/**
 * The staff directory — the source for every "pick a person" control (calendar
 * participants, task assignees). Readable by any signed-in user: users/{uid}
 * holds only work email, name, role, department and outlet (firestore.rules).
 *
 * Lives here rather than in a feature service because two features already need
 * it and neither owns it.
 */
export function subscribeToDirectory(
  onChange: (users: DirectoryUser[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return subscribeToCollection<UserProfile & { id: string }>(
    COLLECTIONS.USERS,
    [where('status', '==', 'active')],
    (users) =>
      onChange(
        users
          // The doc id IS the uid (users/{uid}); falling back to it keeps the
          // picker working for older docs written without the field.
          .map((user) => ({
            uid: user.uid ?? user.id,
            displayName: user.displayName || user.email,
            roleId: user.roleId,
            departmentId: user.departmentId,
            outletId: user.outletId,
          }))
          .sort((a, b) => a.displayName.localeCompare(b.displayName)),
      ),
    onError,
  )
}
