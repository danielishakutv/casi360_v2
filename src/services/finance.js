/**
 * CASI360 — Finance Module API service
 *
 * Consolidated endpoints that power the Finance Overview dashboard.
 * Until the backend ships these, the FE falls back to composing the
 * same numbers from projects + approvals endpoints.
 */

import { api } from './api'

export const financeApi = {
  /**
   * Aggregate finance dashboard stats.
   * Response:
   *   data: {
   *     total_allocated, total_committed, total_actual_spent,
   *     total_pending_request_amount, total_available,
   *     total_projects, total_budget_lines, flagged_lines_count,
   *     pending_approvals_count, pending_approvals_amount,
   *     approved_finance_count, rejected_finance_count
   *   }
   */
  stats: () => api.get('/finance/stats'),

  /**
   * Budget lines with status in (low | critical | overdrawn).
   * Params: { page, per_page, status }
   */
  flaggedBudgetLines: (params) => api.get('/finance/budget-lines/flagged', params),

  /**
   * Chronological feed of finance-stage decisions (approved, rejected, forwarded, revision).
   * Params: { per_page }
   */
  recentActions: (params) => api.get('/finance/recent-actions', params),
}
