import { callFunction } from '@/services/api'

export interface SearchResultItem {
  id: string
  module: string
  title: string
  description?: string
  status?: string
  departmentId?: string
  outletId?: string
  updatedAt: string // ISO
  actionUrl?: string
}

/**
 * Routed through a Cloud Function rather than queried client-side — per
 * search.md §19, RBAC filtering happens at query time, not by trusting the
 * client to only ask for what it's allowed to see.
 */
export function globalSearch(queryText: string): Promise<SearchResultItem[]> {
  return callFunction('search', { query: queryText })
}

export interface AdvancedSearchFilters {
  module?: string
  department?: string
  outlet?: string
  status?: string
  dateFrom?: string // ISO
  dateTo?: string // ISO
}

export function advancedSearch(
  queryText: string,
  filters: AdvancedSearchFilters,
): Promise<SearchResultItem[]> {
  return callFunction('advancedSearch', { query: queryText, filters })
}

export function saveSearch(name: string, queryText: string, filters?: AdvancedSearchFilters): Promise<void> {
  return callFunction('saveSearch', { name, query: queryText, filters })
}

export function deleteSavedSearch(searchId: string): Promise<void> {
  return callFunction('deleteSavedSearch', { searchId })
}

export function getRecentSearches(): Promise<string[]> {
  return callFunction('getRecentSearches')
}
