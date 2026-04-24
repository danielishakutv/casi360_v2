import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ClipboardCheck, Info, PieChart, ShieldAlert, Wallet } from 'lucide-react'
import { projectsApi, projectReportsApi } from '../../services/projects'
import { approvalsApi, purchaseRequestsApi } from '../../services/procurement'
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
    ]).then((results) => {
      if (cancelled) return

      const errs = []
      const [statsRes, budgetRes, pendingRes, historyRes, approvedRes, rejectedRes] = results

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

      setPartialErrors(errs)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [])

  const aggregates = useMemo(() => {
    const allocated = budgetRows.reduce((s, r) => s + toNumber(r.total_budget ?? r.budget ?? r.allocated_amount), 0)
    const spent = budgetRows.reduce((s, r) => s + toNumber(r.amount_spent ?? r.spent ?? r.actual_spent_amount), 0)
    const pendingAmount = pending.reduce((s, r) => s + toNumber(r.estimated_cost), 0)
    return {
      allocated,
      spent,
      pendingAmount,
      projects: toNumber(projectStats?.total_projects ?? projectStats?.total ?? budgetRows.length),
    }
  }, [budgetRows, pending, projectStats])

  const statCards = [
    { label: 'Allocated Budget', value: naira(aggregates.allocated), icon: PieChart, color: 'blue' },
    { label: 'Actual Spent', value: naira(aggregates.spent), icon: Wallet, color: 'green' },
    { label: 'Pending Finance Approvals', value: pending.length, icon: ClipboardCheck, color: 'orange' },
    { label: 'Projects Tracked', value: aggregates.projects, icon: ShieldAlert, color: 'red' },
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
            <span className="card-badge orange">{pending.length} pending</span>
          </div>
          <div className="card-body">
            <div className="project-mini-stats">
              <div className="project-mini-stat">
                <div className="value">{naira(aggregates.pendingAmount)}</div>
                <div className="label">Awaiting Finance Decision</div>
              </div>
              <div className="project-mini-stat">
                <div className="value">{approvedCount ?? '—'}</div>
                <div className="label">Approved PRs</div>
              </div>
              <div className="project-mini-stat">
                <div className="value">{rejectedCount ?? '—'}</div>
                <div className="label">Rejected PRs</div>
              </div>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
              Pending items come from the shared approvals endpoint. Approved/rejected counts reflect all purchase requests at those statuses,
              not just finance-stage actions (the API doesn't yet filter by approver stage).
            </p>
          </div>
        </div>
      </div>

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
          <span className="card-badge gray">Latest {history.length}</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Project</th>
                  <th>Requester</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
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

      <div className="card animate-in" style={{ marginTop: 16 }}>
        <div className="card-header">
          <h3>Implementation Note</h3>
        </div>
        <div className="card-body">
          <div className="hr-error-banner" style={{ margin: 0, background: 'var(--badge-blue-bg, #eff6ff)', color: 'var(--badge-blue-fg, #1e40af)', border: '1px solid #bfdbfe' }}>
            <Info size={16} />
            <span>
              Finance Overview is wired to live endpoints where available. The following metrics still require backend work:
              committed-amount tracking, per-budget-line pending-request totals, utilization status per line (healthy / low / critical / overdrawn),
              and a &ldquo;flagged budget lines&rdquo; list. See the changelog for the proposed endpoints.
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
