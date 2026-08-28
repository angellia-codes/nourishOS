import { useAuthStore } from '@/store'
import { OUTLETS, OUTLET_CODES } from '@/constants'
import { canAccessOutlet as canAccessOutletUtil } from '@/utils'

/**
 * The signed-in user's outlet, resolved from the OUTLETS constant.
 *
 * This previously read `getDocument(COLLECTIONS.OUTLETS, …)`, but there is no
 * `outlets` collection and no `firestore.rules` block for one — outlets are the
 * hand-maintained `OUTLETS`/`OUTLET_CODES` pair in constants/organization.ts
 * (mirrored in functions/src/lib/organization.ts), exactly as
 * equipment-master-design.md §3.1 had to work around. So the read resolved to
 * the deny-all match at the bottom of the rules file and `outlet` was always
 * null. Caught by `node functions/test/invariants.mjs` check 1.
 *
 * Consequently this is synchronous and returns no `loading` flag: the data is a
 * module constant, and reporting a load that never happens would be the same
 * lie in a different shape.
 */
export function useOutlet() {
  const profile = useAuthStore((s) => s.profile)
  const outletId = profile?.outletId ?? null
  const option = outletId ? OUTLETS.find((o) => o.id === outletId) : undefined

  return {
    outletId,
    outlet: option ? { id: option.id, name: option.name, code: OUTLET_CODES[option.id] ?? null } : null,
    canAccessOutlet: (targetOutletId: string) => (profile ? canAccessOutletUtil(profile, targetOutletId) : false),
  }
}
