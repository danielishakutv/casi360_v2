import { useMemo, useState } from 'react'
import { AlertCircle, ClipboardCheck, PieChart, ShieldAlert, Wallet } from 'lucide-react'
import { getDemoApprovals, getDemoBudgetLines, resetFinanceDemoData } from '../../data/financeDemoStore'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import { capitalize } from '../../utils/capitalize'

export default function FinanceOverview() {
  const [budgetLines, setBudgetLines] = useState(() => getDemoBudgetLines())
  const [approvals, setApprovals] = useState(() => getDemoApprovals())

  const stats = useMemo(() => {
    const allocated = budgetLines.reduce((sum, line) => sum + line.allocated_amount, 0)
    const committed = budgetLines.reduce((sum, line) => sum + line.committed_amount, 0)
    const spent = budgetLines.reduce((sum, line) => sum + line.actual_spent_amount, 0)
    const pending = budgetLines.reduce((sum, line) => sum + line.pending_request_amount, 0)
    const available = budgetLines.reduce((sum, line) => sum + line.available_amount, 0)
    const pendingApprovals = approvals.filter((item) => item.status === 'pending')
    return {
      totalAllocated: allocated,
      totalCommitted: committed,
      totalSpent: spent,
      totalPending: pending,
      totalAvailable: available,
      totalProjects: new Set(budgetLines.map((line) => line.project_name)).size,
      totalBudgetLines: budgetLines.length,
      flaggedLines: budgetLines.filter((line) => ['watch', 'over_budget', 'fully_used'].includes(line.status)).length,
      pendingApprovals: pendingApprovals.length,
      pendingApprovalAmount: pendingApprovals.reduce((sum, item) => sum + item.amount_requested, 0),
    }
  }, [budgetLines, approvals])

  const flaggedLines = budgetLines.filter((line) => ['watch', 'over_budget', 'fully_used'].includes(line.status))
  const recentApprovals = [...approvals]
    .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
    .slice(0, 6)

  function handleResetDemoData() {
    const shouldReset = window.confirm('Reset finance demo data to defaults? This will remove your local changes.')
    if (!shouldReset) return
    resetFinanceDemoData()
    setBudgetLines(getDemoBudgetLines())
    setApprovals(getDemoApprovals())
  }

  const statCards = [
    { label: 'Allocated Budget', value: naira(stats.totalAllocated), icon: PieChart, color: 'blue' },
    { label: 'Committed Amount', value: naira(stats.totalCommitted), icon: ClipboardCheck, color: 'orange' },
    { label: 'Actual Spent', value: naira(stats.totalSpent), icon: Wallet, color: 'green' },
    { label: 'Flagged Lines', value: stats.flaggedLines, icon: ShieldAlert, color: 'red' },
  ]

  return (
    <>
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
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="card-badge blue">Demo structure</span>
              <button type="button" className="hr-btn-secondary" onClick={handleResetDemoData}>Reset Demo Data</button>
            </div>
          </div>
          <div className="card-body">
            <div className="project-mini-stats">
              <div className="project-mini-stat">
                <div className="value">{stats.totalProjects}</div>
                <div className="label">Projects in Finance View</div>
              </div>
              <div className="project-mini-stat">
                <div className="value">{stats.totalBudgetLines}</div>
                <div className="label">Budget Lines</div>
              </div>
              <div className="project-mini-stat">
                <div className="value">{naira(stats.totalPending)}</div>
                <div className="label">Pending Requests</div>
              </div>
              <div className="project-mini-stat">
                <div className="value">{naira(stats.totalAvailable)}</div>
                <div className="label">Available Balance</div>
              </div>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
              This overview is fully demo-backed and models the target finance workflow: budget lines, commitments, actual spend, pending requests, and approval checkpoints.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Approval Pipeline</h3>
            <span className="card-badge orange">{stats.pendingApprovals} pending</span>
          </div>
          <div className="card-body">
            <div className="project-mini-stats">
              <div className="project-mini-stat">
                <div className="value">{naira(stats.pendingApprovalAmount)}</div>
                <div className="label">Awaiting Finance Decision</div>
              </div>
              <div className="project-mini-stat">
                <div className="value">{approvals.filter((item) => item.status === 'approved').length}</div>
                <div className="label">Moved to Procurement</div>
              </div>
              <div className="project-mini-stat">
                <div className="value">{approvals.filter((item) => item.status === 'rejected').length}</div>
                <div className="label">Rejected by Finance</div>
              </div>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
              The intended procurement cycle is represented here as: request, line manager approval, finance approval, procurement processing, vendor fulfillment, and payment release.
            </p>
          </div>
        </div>
      </div>

      <div className="card animate-in" style={{ marginTop: 16 }}>
        <div className="card-header">
          <h3>Budget Lines Requiring Attention</h3>
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
                {flaggedLines.length === 0 ? (
                  <tr><td colSpan={6} className="hr-empty-cell">No flagged budget lines.</td></tr>
                ) : flaggedLines.map((line) => (
                  <tr key={line.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{line.project_name}</td>
                    <td>{line.line_name}</td>
                    <td><span className={`status-badge ${line.status}`}><span className="status-dot" />{capitalize(line.status)}</span></td>
                    <td style={{ fontWeight: 600 }}>{naira(line.allocated_amount)}</td>
                    <td style={{ fontWeight: 600 }}>{naira(line.available_amount)}</td>
                    <td>{line.utilization_percent}%</td>
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
          <span className="card-badge orange">Demo approvals</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Project</th>
                  <th>Budget Line</th>
                  <th>Stage</th>
                  <th>Amount</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {recentApprovals.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{item.reference}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{item.project_name}</td>
                    <td>{item.budget_line_name}</td>
                    <td><span className={`status-badge ${item.status}`}><span className="status-dot" />{item.current_stage}</span></td>
                    <td style={{ fontWeight: 600 }}>{naira(item.amount_requested)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(item.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {stats.flaggedLines > 0 && (
        <div className="card animate-in" style={{ marginTop: 16 }}>
          <div className="card-header">
            <h3>Implementation Note</h3>
          </div>
          <div className="card-body">
            <div className="hr-error-banner" style={{ margin: 0 }}>
              <AlertCircle size={16} />
              <span>
                This module is currently driven by structured demo data so the UI and finance workflow can be finalized before backend implementation begins.
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}