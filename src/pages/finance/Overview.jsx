import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ClipboardCheck, PieChart, ShieldAlert, Wallet } from 'lucide-react'
import { projectReportsApi } from '../../services/projects'
import { financeApi } from '../../services/finance'
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
  const [financeStats, setFinanceStats] = useState(null)
  const [flaggedLines, setFlaggedLines] = useState([])
  const [recentActions, setRecentActions] = useState([])
  const [budgetRows, setBudgetRows] = useState([])

  const [loading, setLoading] = useState(true)
  const [partialErrors, setPartialErrors] = useState([])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => { if (!cancelled) setLoading(true) })

    Promise.allSettled([
      financeApi.stats(),
      financeApi.flaggedBudgetLines({ per_page: 25 }),
      financeApi.recentActions({ per_page: HISTORY_LIMIT }),
      projectReportsApi.budgetUtilization(),
    ]).then((results) => {
      if (cancelled) return

      const errs = []
      const [statsRes, flaggedRes, actionsRes, budgetRes] = results

      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value?.data ?? statsRes.value
        if (d && typeof d === 'object') setFinanceStats(d)
        else errs.push('finance stats')
      } else {
        errs.push('finance stats')
      }

      if (flaggedRes.status === 'fulfilled') {
        const d = flaggedRes.value?.data ?? flaggedRes.value ?? {}
        setFlaggedLines(d.budget_lines || d.flagged_lines || [])
      } else {
        errs.push('flagged budget lines')
      }

      if (actionsRes.status === 'fulfilled') {
        const d = actionsRes.value?.data ?? actionsRes.value ?? {}
        setRecentActions(d.actions || d.recent_actions || [])
      } else {
        errs.push('recent finance actions')
      }

      if (budgetRes.status === 'fulfilled') {
        const data = budgetRes.value?.data ?? budgetRes.value
        setBudgetRows(normaliseBudgetUtilizationRows(data))
      } else {
        errs.push('budget utilization report')
      }

      setPartialErrors(errs)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [])

  const stats = useMemo(() => {
    const s = financeStats || {}
    return {
      allocated:   toNumber(s.total_allocated),
      committed:   toNumber(s.total_committed),
      spent:       toNumber(s.total_actual_spent),
      pending:     toNumber(s.total_pending_request_amount),
      available:   toNumber(s.total_available),
      projects:    toNumber(s.total_projects),
      budgetLines: toNumber(s.total_budget_lines),
      flagged:     toNumber(s.flagged_lines_count),
      pendingCount: toNumber(s.pending_approvals_count),
      pendingAmount: toNumber(s.pending_approvals_amount),
      approved:    toNumber(s.approved_finance_count),
      rejected:    toNumber(s.rejected_finance_count),
    }
  }, [financeStats])

  const statCards = [
    { label: 'Allocated Budget', value: naira(stats.allocated), icon: PieChart,       color: 'blue',   amount: true },
    { label: 'Committed',        value: naira(stats.committed), icon: Wallet,         color: 'green',  amount: true },
    { label: 'Pending Finance Approvals', value: stats.pendingCount, icon: ClipboardCheck, color: 'orange', amount: false },
    { label: 'Flagged Budget Lines',      value: stats.flagged,      icon: ShieldAlert,    color: 'red',    amount: false },
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
              <div className={`stat-value${stat.amount ? ' stat-value-amount' : ''}`}>{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          )
        })}
      </div>

      <div className="dashboard-grid animate-in">
        <div className="card">
          <div className="card-header">
            <h3>Finance Control Snapshot</h3>
            <span className="card-badge blue">Live</span>
          </div>
          <div className="card-body">
            <div className="project-mini-stats">
              <div className="project-mini-stat">
                <div className="value">{stats.projects}</div>
                <div className="label">Projects Tracked</div>
              </div>
              <div className="project-mini-stat">
                <div className="value">{stats.budgetLines}</div>
                <div className="label">Budget Lines</div>
              </div>
              <div className="project-mini-stat">
                <div className="value value-amount">{naira(stats.pending)}</div>
                <div className="label">Pending Requests</div>
              </div>
              <div className="project-mini-stat">
                <div className="value value-amount">{naira(stats.available)}</div>
                <div className="label">Available Balance</div>
              </div>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
              Allocation pulls from Projects; committed, spent, and pending-request values come from purchase orders, disbursements, and in-flight requisitions.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Approval Pipeline</h3>
            <span className="card-badge orange">{stats.pendingCount} pending</span>
          </div>
          <div className="card-body">
            <div className="project-mini-stats">
              <div className="project-mini-stat">
                <div className="value value-amount">{naira(stats.pendingAmount)}</div>
                <div className="label">Awaiting Finance Decision</div>
              </div>
              <div className="project-mini-stat">
                <div className="value">{stats.approved}</div>
                <div className="label">Approved by Finance</div>
              </div>
              <div className="project-mini-stat">
                <div className="value">{stats.rejected}</div>
                <div className="label">Rejected by Finance</div>
              </div>
            </div>
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

      {budgetRows.length > 0 && (
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
                  {[...budgetRows]
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
      )}

      <div className="card animate-in" style={{ marginTop: 16 }}>
        <div className="card-header">
          <h3>Recent Finance Actions</h3>
          <span className="card-badge gray">Latest {recentActions.length}</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Project</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Amount</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {recentActions.length === 0 ? (
                  <tr><td colSpan={6} className="hr-empty-cell">No finance actions yet.</td></tr>
                ) : recentActions.map((a) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
