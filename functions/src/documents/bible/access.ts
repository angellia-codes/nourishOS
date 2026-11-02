import type { MenuOwner } from './edition'

/**
 * Who may open what in Nourish's Bible (nourish-bible.md §8.1–8.2). Pure so
 * npm test can pin every group without the Admin SDK; getBibleAccess feeds it
 * the live users/{uid} and employees/{id} documents.
 */

/** §8.2 Leadership — every recipe, never menu-only. */
export const BIBLE_LEADERSHIP_ROLES = ['restaurantManager', 'hrManager', 'generalManager', 'director', 'superAdmin']

const MENU_ONLY_STATUSES = ['dailyWorker', 'ojt']
const MENU_ONLY_POSITIONS = ['dailyWorker', 'trainee']
const BAKERY_OUTLET = 'the_bakery_kitchen'

export interface BibleAccessUser {
  roleId: string
  departmentId: string | null
  outletId: string | null
}

export interface BibleAccessEmployee {
  employmentStatus?: string | null
  /** Holds the PositionId — there is no separate positionId field on Employee. */
  position?: string | null
}

export interface BibleAccess {
  /** D9 — Daily Workers and Trainees see the menu only (client-side hiding, §8.3). */
  menuOnly: boolean
  /** Owners whose recipes this user may open. Display aid now; enforced by getBibleRecipe in Phase 3. */
  recipeOwners: MenuOwner[]
}

/**
 * `employee` is null when users/{uid}.employeeId is unset, which today is
 * every account — nothing links them yet (OI-8). Phase 1 deliberately treats
 * that as full staff rather than §8.2's fail-closed menu-only, or every
 * non-leader would lose Sequence of Service and SOPs (deviation, PRD §18).
 * Recipes stay fail-closed: an unlinked non-leader gets no recipe owners.
 */
export function resolveBibleAccess(user: BibleAccessUser, employee: BibleAccessEmployee | null): BibleAccess {
  if (BIBLE_LEADERSHIP_ROLES.includes(user.roleId)) {
    return { menuOnly: false, recipeOwners: ['kitchen', 'bar', 'bakery'] }
  }

  const menuOnly =
    employee !== null &&
    (MENU_ONLY_STATUSES.includes(employee.employmentStatus ?? '') || MENU_ONLY_POSITIONS.includes(employee.position ?? ''))
  if (menuOnly || employee === null) return { menuOnly, recipeOwners: [] }

  // §8.2 — "own department" means every role in it, Cook Helper and Steward included.
  const { departmentId, outletId } = user
  if (departmentId === 'central_kitchen') return { menuOnly, recipeOwners: ['kitchen'] } // D14
  if (departmentId === 'kitchen') return { menuOnly, recipeOwners: [outletId === BAKERY_OUTLET ? 'bakery' : 'kitchen'] }
  if (departmentId === 'bar') return { menuOnly, recipeOwners: ['bar'] }
  return { menuOnly, recipeOwners: [] }
}
