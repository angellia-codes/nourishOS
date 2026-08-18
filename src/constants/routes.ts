/** Source: AUTHENTICATION.md §10 (public vs protected routes), DESIGN.md §4 (primary nav). */
export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  UNAUTHORIZED: '/unauthorized',
  DASHBOARD: '/',
  HR: '/hr',
  RECRUITMENT: '/recruitment',
  CALENDAR: '/calendar',
  OPERATIONS: '/operations',
  FINANCE: '/finance',
  DOCUMENTS: '/documents',
  COMMUNICATIONS: '/communications',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  SECURITY: '/security',
  SEARCH: '/search',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]
