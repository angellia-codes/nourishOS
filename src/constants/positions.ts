/**
 * Positions are distinct from RBAC Roles (settings.md §7: "Each position may
 * have a default role"). Waiter and Barista might both carry the "staff"
 * RBAC role but need entirely different appraisal criteria — appraisal
 * templates key off positionId, not roleId.
 *
 * This is a starter set covering common F&B outlet positions for the
 * Appraisal module specifically — not the full org-wide Positions catalog
 * from settings.md §7 (Director, Engineer, Security Officer, etc.). Extend
 * as more positions need their own appraisal template, or move this to the
 * Settings module once that's built.
 */
export const POSITIONS = {
  WAITER: 'waiter',
  BARISTA: 'barista',
  COOK: 'cook',
  CASHIER: 'cashier',
  OUTLET_LEADER: 'outletLeader',
} as const

export type PositionId = (typeof POSITIONS)[keyof typeof POSITIONS]

export const POSITION_LABELS: Record<PositionId, string> = {
  waiter: 'F&B Service - Waiter/Waitress',
  barista: 'Barista/Bartender',
  cook: 'Cook / Kitchen Staff',
  cashier: 'Cashier',
  outletLeader: 'Outlet / Department Leader',
}
