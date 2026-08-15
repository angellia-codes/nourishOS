import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireActiveUser,
  requireSuperAdmin,
  recordAuditEvent,
  newDocumentBaseFields,
  updatedFields,
  AppError,
  handleError,
  successResponse,
} from '../lib'
import { ROLE_PERMISSIONS } from '../lib/organization'

/**
 * Settings: Roles & Permissions — RBAC.md §4/§5/§16. `roles/{roleId}` docs
 * were previously only ever written once, by registerUser seeding them from
 * ROLE_PERMISSIONS the first time a role was claimed — every module since has
 * had to note "existing role docs need the new permission string added by
 * hand." This is the callable that finally lets a super admin edit them.
 *
 * Every role id the app knows about. ROLE_PERMISSIONS covers all 17
 * assignable roles; superAdmin is added back because it is omitted there on
 * purpose (see organization.ts) and is still a valid target here.
 */
const VALID_ROLE_IDS = ['superAdmin', ...Object.keys(ROLE_PERMISSIONS)]

/**
 * Gated by role identity, not a permission string — requirePermission(user,
 * PERMISSIONS.ROLES_MANAGE) would be circular, since that string's grant
 * lives in the very roles collection this callable edits. Same reasoning
 * setJobDescriptionAccess/setSopAccess already apply to their access-config
 * writes.
 *
 * permissions is validated for shape only (array of non-empty strings), not
 * against a full whitelist of every known permission string: the complete
 * catalog lives in src/constants/permissions.ts (client-only by design,
 * functions/src/lib/permissions.ts is a deliberate subset mirror of only
 * what's requirePermission-checked server-side). The UI only ever emits
 * strings from that catalog; requireSuperAdmin is the trust boundary here.
 */
export const updateRolePermissions = onCall({ region: REGION }, async (request) => {
  try {
    const user = await requireActiveUser(request)
    requireSuperAdmin(user, 'change role permissions')

    const { roleId, permissions } = (request.data ?? {}) as { roleId?: unknown; permissions?: unknown }

    if (typeof roleId !== 'string' || !VALID_ROLE_IDS.includes(roleId)) {
      throw new AppError('invalid-argument', 'Select a valid role.')
    }
    if (!Array.isArray(permissions) || permissions.some((p) => typeof p !== 'string' || p.trim() === '')) {
      throw new AppError('invalid-argument', 'permissions must be an array of non-empty strings.')
    }

    const unique = [...new Set(permissions as string[])]

    const ref = db.collection(COLLECTIONS.ROLES).doc(roleId)
    const snap = await ref.get()
    const previous = (snap.data()?.permissions as string[] | undefined) ?? []

    await ref.set(
      snap.exists
        ? { permissions: unique, ...updatedFields(user.uid) }
        : { name: roleId, description: 'Managed via Settings.', permissions: unique, ...newDocumentBaseFields(user.uid) },
      { merge: true },
    )

    await recordAuditEvent({
      eventType: 'RolePermissionsUpdated',
      category: 'Settings',
      module: 'settings',
      resourceType: 'role',
      resourceId: roleId,
      action: 'update',
      user,
      severity: 'high',
      previousValues: { permissions: previous },
      newValues: { permissions: unique },
    })

    return successResponse({ roleId, permissions: unique }, 'Role permissions updated.')
  } catch (error) {
    return handleError(error)
  }
})
