import { api } from './api'

/**
 * Dashboard summary — role/department-aware landing data.
 * Returns { scope: 'org'|'department', stats, recent_*, generated_at, ... }.
 * Privileged users (admin / country_director / Operations managers) get the
 * organisation-wide view; everyone else gets only their own data.
 */
export const dashboardApi = {
  summary: () => api.get('/dashboard/summary'),
}
