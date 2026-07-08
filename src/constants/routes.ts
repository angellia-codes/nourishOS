/** Source: AUTHENTICATION.md §10 (public vs protected routes), DESIGN.md §4 (primary nav). */
export const ROUTES = {
  LOGIN: '/login',
  UNAUTHORIZED: '/unauthorized',
  DASHBOARD: '/',
  HR: '/hr',
  OPERATIONS: '/operations',
  FINANCE: '/finance',
  PURCHASING: '/purchasing',
  INVENTORY: '/inventory',
  CRM: '/crm',
  DOCUMENTS: '/documents',
  COMMUNICATIONS: '/communications',
  REPORTS: '/reports',
  SETTINGS: '/settings',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]
