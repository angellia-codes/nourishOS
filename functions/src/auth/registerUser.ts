import { onCall } from 'firebase-functions/v2/https'
import {
  db,
  COLLECTIONS,
  REGION,
  requireAuth,
  recordAuditEvent,
  newDocumentBaseFields,
  AppError,
  handleError,
  successResponse,
} from '../lib'
import { OUTLET_DEPARTMENTS, DEPARTMENT_ROLES, ROLE_PERMISSIONS } from '../lib/organization'

/**
 * Self-service registration for a signed-in Google account that has no
 * users/{uid} profile yet.
 *
 * Deviates from AUTHENTICATION.md §5 ("Users are not self-registered"): the
 * HR provisioning flow that section describes has no UI or callable, so
 * without this nobody but the bootstrap superAdmin can ever reach the app.
 * The doc's guarantee is preserved where it matters — the profile is written
 * only by this function, only for the caller's own uid, only once, and only
 * with an outlet/department/role triple that exists in the org chart.
 *
 * This is the one callable that cannot start with requireActiveUser: the
 * profile it reads is precisely what does not exist yet. requireAuth plus the
 * "already registered" guard is the whole trust boundary here.
 */

interface RegisterUserInput {
  fullName?: string
  outletId?: string
  departmentId?: string
  roleId?: string
}

export const registerUser = onCall({ region: REGION }, async (request) => {
  try {
    const uid = requireAuth(request)
    const { fullName, outletId, departmentId, roleId } = (request.data ?? {}) as RegisterUserInput

    const name = fullName?.trim()
    if (!name) {
      throw new AppError('invalid-argument', 'Full name is required.')
    }
    if (name.length > 120) {
      throw new AppError('invalid-argument', 'Full name must be 120 characters or fewer.')
    }

    if (!outletId || !OUTLET_DEPARTMENTS[outletId]) {
      throw new AppError('invalid-argument', 'Select a valid outlet.')
    }
    const departments = OUTLET_DEPARTMENTS[outletId]
    if (!departmentId || !departments.includes(departmentId)) {
      throw new AppError('invalid-argument', 'Select a department that exists at this outlet.')
    }
    const roles = DEPARTMENT_ROLES[departmentId] ?? []
    if (!roleId || !roles.includes(roleId)) {
      throw new AppError('invalid-argument', 'Select a role that exists in this department.')
    }

    const userRef = db.collection(COLLECTIONS.USERS).doc(uid)
    if ((await userRef.get()).exists) {
      throw new AppError('already-exists', 'This account is already registered.')
    }

    // roles/{roleId} is what the client and requireActiveUser both read
    // permissions from, so a role nobody has claimed yet has to be created
    // before the profile pointing at it exists. Seeded here rather than in a
    // separate script so registration can't hand out a role with no
    // permissions attached. Existing role docs are left alone — a superAdmin
    // may have edited them.
    const roleRef = db.collection(COLLECTIONS.ROLES).doc(roleId)
    if (!(await roleRef.get()).exists) {
      const permissions = ROLE_PERMISSIONS[roleId]
      if (!permissions) {
        throw new AppError('failed-precondition', 'This role has no permission set configured. Please contact HR.')
      }
      await roleRef.set({
        name: roleId,
        description: `Seeded on first registration — RBAC.md §4/§5.`,
        permissions,
        ...newDocumentBaseFields(uid),
      })
    }

    const email = request.auth?.token.email ?? null
    await userRef.set({
      uid,
      email,
      displayName: name,
      photoURL: request.auth?.token.picture ?? null,
      roleId,
      departmentId,
      outletId,
      // status 'active' — the registrant gets in immediately (confirmed
      // decision). syncUserClaims then mirrors role/department/outlet onto
      // the ID token, which is what firestore.rules reads.
      ...newDocumentBaseFields(uid),
    })

    const registrant = {
      uid,
      email,
      displayName: name,
      roleId,
      departmentId,
      outletId,
      permissions: [],
    }
    await recordAuditEvent({
      eventType: 'user.registered',
      category: 'auth',
      module: 'auth',
      resourceType: 'user',
      resourceId: uid,
      action: 'create',
      user: registrant,
      severity: 'high',
      newValues: { roleId, departmentId, outletId },
    })

    return successResponse({ uid, roleId, departmentId, outletId }, 'Registration complete.')
  } catch (error) {
    return handleError(error)
  }
})
