import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ClipboardCheck, Info, PieChart, ShieldAlert, Wallet } from 'lucide-react'
import { projectsApi, projectReportsApi } from '../../services/projects'
import { approvalsApi, purchaseRequestsApi } from '../../services/procurement'
import { financeApi } from '../../services/finance'
import { extractStats } from '../../utils/apiHelpers'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import { capitalize } from '../../utils/capitalize'

const HISTORY_LIMIT = 6

function toNumber(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function normaliseBudgetUtilizationRows(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.projects)) return payload.projects
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

export default function FinanceOverview() {
  const [projectStats, setProjectStats] = useState(null)
  const [budgetRows, setBudgetRows] = useState([])
  const [pending, setPending] = useState([])
  const [history, setHistory] = useState([])
  const [approvedCount, setApprovedCount] = useState(null)
  const [rejectedCount, setRejectedCount] = useState(null)

  // Opportunistic: populated if the consolidated finance endpoints are live.
  const [financeStats, setFinanceStats] = useState(null)
  const [flaggedLines, setFlaggedLines] = useState([])
  const [recentActions, setRecentActions] = useState([])

  const [loading, setLoading] = useState(true)
  const [partialErrors, setPartialErrors] = useState([])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => { if (!cancelled) setLoading(true) })

    Promise.allSettled([
      projectsApi.stats(),
      projectReportsApi.budgetUtilization(),
      approvalsApi.pending(),
      approvalsApi.pending({ scope: 'history', per_page: HISTORY_LIMIT }),
      purchaseRequestsApi.list({ status: 'approved', per_page: 1 }),
      purchaseRequestsApi.list({ status: 'rejected', per_page: 1 }),
      // Consolidated finance endpoints — silently skipped if BE hasn't shipped them yet.
      financeApi.stats(),
      financeApi.flaggedBudgetLines({ per_page: 25 }),
      financeApi.recentActions({ per_page: HISTORY_LIMIT }),
    ]).then((results) => {
      if (cancelled) return

      const errs = []
      const [statsRes, budgetRes, pendingRes, historyRes, approvedRes, rejectedRes,
             fStatsRes, fFlaggedRes, fActionsRes] = results

      if (statsRes.status === 'fulfilled') setProjectStats(extractStats(statsRes.value))
      else errs.push('project stats')

      if (budgetRes.status === 'fulfilled') {
        const data = budgetRes.value?.data ?? budgetRes.value
        setBudgetRows(normaliseBudgetUtilizationRows(data))
      } else {
        errs.push('budget utilization report')
      }

      if (pendingRes.status === 'fulfilled') {
        const d = pendingRes.value?.data ?? pendingRes.value ?? {}
        setPending(d.requisitions || [])
      } else {
        errs.push('pending approvals')
      }

      if (historyRes.status === 'fulfilled') {
        const d = historyRes.value?.data ?? historyRes.value ?? {}
        setHistory(d.requisitions || [])
      } else {
        errs.push('approvals history')
      }

      const countFromList = (res) => {
        if (res.status !== 'fulfilled') return null
        const d = res.value?.data ?? res.value ?? {}
        return d?.meta?.total ?? d?.total ?? (Array.isArray(d?.requisitions) ? d.requisitions.length : null)
      }
      setApprovedCount(countFromList(approvedRes))
      setRejectedCount(countFromList(rejectedRes))

      if (fStatsRes.status === 'fulfilled') {
        const d = fStatsRes.value?.data ?? fStatsRes.value
        if (d && typeof d === 'object') setFinanceStats(d)
      }
      if (fFlaggedRes.status === 'fulfilled') {
        const d = fFlaggedRes.value?.data ?? fFlaggedRes.value ?? {}
        setFlaggedLines(d.budget_lines || d.flagged_lines || [])
      }
      if (fActionsRes.status === 'fulfilled') {
        const d = fActionsRes.value?.data ?? fActionsRes.value ?? {}
        setRecentActions(d.actions || d.recent_actions || [])
      }

      setPartialErrors(errs)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [])

  const aggregates = useMemo(() => {
    const composed = {
      allocated: budgetRows.reduce((s, r) => s + toNumber(r.total_budget ?? r.budget ?? r.allocated_amount), 0),
      spent: budgetRows.reduce((s, r) => s + toNumber(r.amount_spent ?? r.spent ?? r.actual_spent_amount), 0),
      pendingAmount: pending.reduce((s, r) => s + toNumber(r.estimated_cost), 0),
      projects: toNumber(projectStats?.total_projects ?? projectStats?.total ?? budgetRows.length),
    }
    if (!financeStats) return { ...composed, committed: null, available: null, budgetLines: null, flaggedCount: null }
    return {
      allocated: toNumber(financeStats.total_allocated ?? composed.allocated),
      spent: toNumber(financeStats.total_actual_spent ?? composed.spent),
      pendingAmount: toNumber(financeStats.total_pending_request_amount ?? composed.pendingAmount),
      projects: toNumber(financeStats.total_projects ?? composed.projects),
      committed: toNumber(financeStats.total_committed),
      available: toNumber(financeStats.total_available),
      budgetLines: toNumber(financeStats.total_budget_lines),
      flaggedCount: toNumber(financeStats.flagged_lines_count),
    }
  }, [budgetRows, pending, projectStats, financeStats])

  const statCards = [
    { label: 'Allocated Budget', value: naira(aggregates.allocated), icon: PieChart, color: 'blue' },
    {
      label: aggregates.committed != null ? 'Committed' : 'Actual Spent',
      value: naira(aggregates.committed != null ? aggregates.committed : aggregates.spent),
      icon: Wallet,
      color: 'green',
    },
    { label: 'Pending Finance Approvals', value: financeStats?.pending_approvals_count ?? pending.length, icon: ClipboardCheck, color: 'orange' },
    { label: aggregates.flaggedCount != null ? 'Flagged Budget Lines' : 'Projects Tracked',
      value: aggregates.flaggedCount != null ? aggregates.flaggedCount : aggregates.projects,
      icon: ShieldAlert, color: 'red' },
  ]

  if (loading) {
    return (
      <div className="card animate-in" style={{ textAlign: 'center', padding: 48 }}>
        <div className="auth-spinner large" style={{ margin: '0 auto' }} />
        <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>Loading finance overview…</p>
      </div>
    )
  }

  return (
    <>
      {partialErrors.length > 0 && (
        <div className="hr-error-banner" style={{ marginBottom: 16 }}>
          <AlertCircle size={16} />
          <span>Some data failed to load: {partialErrors.join(', ')}. The fields below may be incomplete.</span>
          <button onClick={() => setPartialErrors([])} className="hr-error-dismiss">&times;</button>
        </div>
      )}

      <div className="stats-grid">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div className={`stat-card ${stat.color} animate-in`} key={stat.label}>
              <div className="stat-top"><div className={`stat-icon ${stat.color}`}><Icon size={22} /></div></div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          )
        })}
      </div>

      <div className="dashboard-grid animate-in">
        <div className="card">
          <div className="card-header">
            <h3>Finance Control Snapshot</h3>
            <span className="card-badge blue">Sourced from Projects</span>
          </div>
          <div className="card-body">
            <div className="project-mini-stats">
              <div className="project-mini-stat">
                <div className="value">{aggregates.projects}</div>
                <div className="label">Projects in Finance View</div>
              </div>
              <div className="project-mini-stat">
                <div className="value">{budgetRows.length}</div>
                <div className="label">Projects with Budgets</div>
              </div>
              <div className="project-mini-stat">
                <div className="value">{naira(aggregates.pendingAmount)}</div>
                <div className="label">Pending Requests</div>
              </div>
              <div className="project-mini-stat">
                <div className="value">{naira(Math.max(aggregates.allocated - aggregates.spent, 0))}</div>
                <div className="label">Budget Remaining (allocated − spent)</div>
              </div>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
              Aggregates come from the project budget utilization report. Per-budget-line commitments, pending requests, and flagged
              statuses need a finance tracking endpoint (see implementation note below).
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Approval Pipeline</h3>
            <span className="card-badge orange">{financeStats?.pending_approvals_count ?? pending.length} pending</span>
          </div>
          <div className="card-body">
            <div className="project-mini-stats">
              <div className="project-mini-stat">
                <div className="value">{naira(aggregates.pendingAmount)}</div>
                <div className="label">Awaiting Finance Decision</div>
              </div>
              <div className="project-mini-stat">
                <div className="value">{financeStats?.approved_finance_count ?? approvedCount ?? '—'}</div>
                <div className="label">{financeStats?.approved_finance_count != null ? 'Approved by Finance' : 'Approved PRs'}</div>
              </div>
              <div className="project-mini-stat">
                <div className="value">{financeStats?.rejected_finance_count ?? rejectedCount ?? '—'}</div>
                <div className="label">{financeStats?.rejected_finance_count != null ? 'Rejected by Finance' : 'Rejected PRs'}</div>
              </div>
            </div>
            {!financeStats && (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
                Pending items come from the shared approvals endpoint. Approved/rejected counts reflect all purchase requests at those statuses,
                not just finance-stage actions (the API doesn't yet filter by approver stage).
              </p>
            )}
          </div>
        </div>
      </div>

      {flaggedLines.length > 0 && (
        <div className="card animate-in" style={{ marginTop: 16 }}>
          <div className="card-header">
            <h3>Flagged Budget Lines</h3>
            <span className="card-badge red">{flaggedLines.length} flagged</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Budget Line</th>
                    <th>Status</th>
                    <th>Allocated</th>
                    <th>Available</th>
                    <th>Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {flaggedLines.map((line) => (
                    <tr key={line.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{line.project_name || line.project_code || '—'}</td>
                      <td>{line.description || line.line_name || '—'}</td>
                      <td><span className={`status-badge ${line.status}`}><span className="status-dot" />{capitalize(line.status || '')}</span></td>
                      <td style={{ fontWeight: 600 }}>{naira(line.allocated_amount)}</td>
                      <td style={{ fontWeight: 600 }}>{naira(line.available_amount)}</td>
                      <td>{toNumber(line.utilization_percent)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="card animate-in" style={{ marginTop: 16 }}>
        <div className="card-header">
          <h3>Top Projects by Utilization</h3>
          <span className="card-badge blue">{budgetRows.length} projects</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Allocated</th>
                  <th>Spent</th>
                  <th>Remaining</th>
                  <th>Utilization</th>
                </tr>
              </thead>
              <tbody>
                {budgetRows.length === 0 ? (
                  <tr><td colSpan={5} className="hr-empty-cell">No budget utilization data available.</td></tr>
                ) : [...budgetRows]
                    .map((row) => {
                      const allocated = toNumber(row.total_budget ?? row.budget ?? row.allocated_amount)
                      const spent = toNumber(row.amount_spent ?? row.spent ?? row.actual_spent_amount)
                      const remaining = Math.max(allocated - spent, 0)
                      const pct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0
                      return { id: row.project_id || row.id, name: row.project_name || row.name || '—', allocated, spent, remaining, pct }
                    })
                    .sort((a, b) => b.pct - a.pct)
                    .slice(0, 10)
                    .map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{r.name}</td>
                        <td style={{ fontWeight: 600 }}>{naira(r.allocated)}</td>
                        <td>{naira(r.spent)}</td>
                        <td style={{ fontWeight: 600 }}>{naira(r.remaining)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="progress-track" style={{ height: 6, width: 120 }} role="progressbar" aria-valuenow={r.pct} aria-valuemin={0} aria-valuemax={100}>
                              <div className={`progress-fill ${r.pct > 90 ? 'orange' : 'blue'}`} style={{ width: `${Math.min(r.pct, 100)}%` }} />
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.pct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card animate-in" style={{ marginTop: 16 }}>
        <div className="card-header">
          <h3>Recent Finance Actions</h3>
          <span className="card-badge gray">Latest {recentActions.length || history.length}</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Project</th>
                  {recentActions.length > 0 ? <th>Actor</th> : <th>Requester</th>}
                  <th>{recentActions.length > 0 ? 'Action' : 'Status'}</th>
                  <th>Amount</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {recentActions.length > 0 ? recentActions.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{a.requisition_number || '—'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{a.project_name || a.project_code || '—'}</td>
                    <td>{a.actor_name || '—'}</td>
                    <td>
                      <span className={`status-badge ${a.action}`}>
                        <span className="status-dot" />{capitalize((a.action || '').replace(/_/g, ' '))}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{naira(a.amount)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(a.created_at)}</td>
                  </tr>
                )) : history.length === 0 ? (
                  <tr><td colSpan={6} className="hr-empty-cell">No processed approvals yet.</td></tr>
                ) : history.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{item.requisition_number}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{item.project_name || item.project_code || '—'}</td>
                    <td>{item.requested_by_name || '—'}</td>
                    <td>
                      <span className={`status-badge ${item.status}`}>
                        <span className="status-dot" />{capitalize((item.status || '').replace(/_/g, ' '))}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{naira(item.estimated_cost)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(item.submitted_at || item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {!financeStats && (
        <div className="card animate-in" style={{ marginTop: 16 }}>
          <div className="card-header">
            <h3>Implementation Note</h3>
          </div>
          <div className="card-body">
            <div className="hr-error-banner" style={{ margin: 0, background: 'var(--badge-blue-bg, #eff6ff)', color: 'var(--badge-blue-fg, #1e40af)', border: '1px solid #bfdbfe' }}>
              <Info size={16} />
              <span>
                Finance Overview is wired to live endpoints where available. Committed-amount tracking, per-budget-line pending-request totals,
                utilization status per line, and a &ldquo;flagged budget lines&rdquo; list need the new <code>/finance/stats</code>,
                <code>/finance/budget-lines/flagged</code>, and <code>/finance/recent-actions</code> endpoints. Once those ship, this panel auto-fills and this note disappears.
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
