import { demoFinanceApprovals } from './financeDemo'
import { demoProjectsWithBudgets } from './projectsDemo'

const OVERLAYS_KEY = 'casi360.finance.demo.overlays'
const APPROVALS_KEY = 'casi360.finance.demo.approvals'

/**
 * Default finance overlays: financial tracking data for each project budget line.
 * pb-001 through pb-008 have tracking data matching the original demo.
 * pb-009, pb-010, pb-011 are intentionally untracked to show the "set up tracking" flow.
 */
const defaultFinanceOverlays = [
  {
    id: 'fo-001',
    project_budget_line_id: 'pb-001',
    project_id: 'proj-001',
    fiscal_year: '2026',
    allocated_amount: 2500000,
    committed_amount: 620000,
    actual_spent_amount: 830000,
    pending_request_amount: 200000,
    available_amount: 850000,
    utilization_percent: 66,
    status: 'healthy',
    last_activity_at: '2026-04-15T10:00:00Z',
  },
  {
    id: 'fo-002',
    project_budget_line_id: 'pb-002',
    project_id: 'proj-001',
    fiscal_year: '2026',
    allocated_amount: 1800000,
    committed_amount: 540000,
    actual_spent_amount: 920000,
    pending_request_amount: 180000,
    available_amount: 160000,
    utilization_percent: 91,
    status: 'low',
    last_activity_at: '2026-04-16T12:20:00Z',
  },
  {
    id: 'fo-003',
    project_budget_line_id: 'pb-003',
    project_id: 'proj-002',
    fiscal_year: '2026',
    allocated_amount: 4500000,
    committed_amount: 1250000,
    actual_spent_amount: 1950000,
    pending_request_amount: 300000,
    available_amount: 1000000,
    utilization_percent: 78,
    status: 'healthy',
    last_activity_at: '2026-04-14T09:40:00Z',
  },
  {
    id: 'fo-004',
    project_budget_line_id: 'pb-004',
    project_id: 'proj-003',
    fiscal_year: '2026',
    allocated_amount: 3200000,
    committed_amount: 760000,
    actual_spent_amount: 2010000,
    pending_request_amount: 350000,
    available_amount: 80000,
    utilization_percent: 98,
    status: 'critical',
    last_activity_at: '2026-04-17T08:00:00Z',
  },
  {
    id: 'fo-005',
    project_budget_line_id: 'pb-005',
    project_id: 'proj-004',
    fiscal_year: '2026',
    allocated_amount: 2100000,
    committed_amount: 420000,
    actual_spent_amount: 510000,
    pending_request_amount: 140000,
    available_amount: 1030000,
    utilization_percent: 51,
    status: 'healthy',
    last_activity_at: '2026-04-13T11:30:00Z',
  },
  {
    id: 'fo-006',
    project_budget_line_id: 'pb-006',
    project_id: 'proj-005',
    fiscal_year: '2026',
    allocated_amount: 1450000,
    committed_amount: 180000,
    actual_spent_amount: 810000,
    pending_request_amount: 90000,
    available_amount: 370000,
    utilization_percent: 74,
    status: 'healthy',
    last_activity_at: '2026-04-10T16:45:00Z',
  },
  {
    id: 'fo-007',
    project_budget_line_id: 'pb-007',
    project_id: 'proj-006',
    fiscal_year: '2026',
    allocated_amount: 1700000,
    committed_amount: 650000,
    actual_spent_amount: 940000,
    pending_request_amount: 220000,
    available_amount: -110000,
    utilization_percent: 106,
    status: 'overdrawn',
    last_activity_at: '2026-04-17T14:15:00Z',
  },
  {
    id: 'fo-008',
    project_budget_line_id: 'pb-008',
    project_id: 'proj-007',
    fiscal_year: '2026',
    allocated_amount: 1100000,
    committed_amount: 180000,
    actual_spent_amount: 260000,
    pending_request_amount: 70000,
    available_amount: 590000,
    utilization_percent: 46,
    status: 'healthy',
    last_activity_at: '2026-04-12T09:10:00Z',
  },
  // pb-009, pb-010, pb-011 have no overlay — they show as "Not tracked" in finance
]

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function canUseStorage() {
  return typeof window !== 'undefined' && !!window.localStorage
}

function loadFromStorage(key, fallback) {
  if (!canUseStorage()) return clone(fallback)
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return clone(fallback)
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return clone(fallback)
    return parsed
  } catch {
    return clone(fallback)
  }
}

function saveToStorage(key, value) {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage write errors in demo mode.
  }
}

export function makeDemoId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

/** Returns the demo projects list with their budget lines. */
export function getDemoProjectsWithBudgets() {
  return clone(demoProjectsWithBudgets)
}

/** Returns the persisted finance overlays (financial tracking per project budget line). */
export function getDemoFinanceOverlays() {
  return loadFromStorage(OVERLAYS_KEY, defaultFinanceOverlays)
}

export function setDemoFinanceOverlays(items) {
  saveToStorage(OVERLAYS_KEY, items)
}

/**
 * Returns merged finance budget lines: project budget lines enriched with finance overlay data.
 * Lines without an overlay default to zero financial values.
 * Used by Overview.jsx for aggregate stats.
 */
export function getMergedFinanceBudgetLines() {
  const projects = getDemoProjectsWithBudgets()
  const overlays = getDemoFinanceOverlays()

  return projects.flatMap((project) =>
    project.budget_lines.map((line) => {
      const overlay = overlays.find((o) => o.project_budget_line_id === line.id)
      return {
        id: overlay?.id ?? `untracked-${line.id}`,
        project_id: project.id,
        project_name: project.name,
        project_code: project.project_code,
        department: project.department,
        category: line.budget_category,
        line_name: line.description,
        planned_amount: line.total_cost,
        budget_line_id: line.id,
        fiscal_year: overlay?.fiscal_year ?? '2026',
        allocated_amount: overlay?.allocated_amount ?? line.total_cost,
        committed_amount: overlay?.committed_amount ?? 0,
        actual_spent_amount: overlay?.actual_spent_amount ?? 0,
        pending_request_amount: overlay?.pending_request_amount ?? 0,
        available_amount: overlay?.available_amount ?? line.total_cost,
        utilization_percent: overlay?.utilization_percent ?? 0,
        status: overlay?.status ?? 'healthy',
        is_tracked: !!overlay,
        last_activity_at: overlay?.last_activity_at ?? null,
      }
    })
  )
}

/**
 * Backward-compatible alias used by Overview.jsx.
 * Returns merged finance budget lines from the projects + overlays sources.
 */
export function getDemoBudgetLines() {
  return getMergedFinanceBudgetLines()
}

/** No-op: budget lines now derive from projects. Kept for backward compatibility. */
export function setDemoBudgetLines() {}

export function getDemoApprovals() {
  return loadFromStorage(APPROVALS_KEY, demoFinanceApprovals)
}

export function setDemoApprovals(items) {
  saveToStorage(APPROVALS_KEY, items)
}

export function resetFinanceDemoData() {
  if (canUseStorage()) {
    window.localStorage.removeItem(OVERLAYS_KEY)
    window.localStorage.removeItem(APPROVALS_KEY)
  }
}
