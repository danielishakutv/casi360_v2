import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3, Wallet, Activity, AlertCircle, FolderKanban,
} from 'lucide-react'
import { naira } from '../../utils/currency'
import { capitalize } from '../../utils/capitalize'
import { projectReportsApi } from '../../services/projects'

export default function ProjectReports() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [budgetUtil, setBudgetUtil] = useState(null)
  const [activityProg, setActivityProg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const results = await Promise.allSettled([
          projectReportsApi.summary(),
          projectReportsApi.budgetUtilization(),
          projectReportsApi.activityProgress(),
        ])
        if (results[0].status === 'fulfilled') setSummary(results[0].value?.data || results[0].value)
        if (results[1].status === 'fulfilled') setBudgetUtil(results[1].value?.data || results[1].value)
        if (results[2].status === 'fulfilled') setActivityProg(results[2].value?.data || results[2].value)
        // If all failed, show error
        if (results.every((r) => r.status === 'rejected')) {
          setError(results[0].reason?.message || 'Failed to load reports')
        }
      } catch (err) {
        setError(err.message || 'Failed to load reports')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="card animate-in" style={{ padding: 48, textAlign: 'center' }}>
        <div className="auth-spinner large" />
        <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>Loading reports…</p>
      </div>
    )
  }

  if (error && !summary && !budgetUtil && !activityProg) {
    return (
      <div className="hr-error-banner">
        <AlertCircle size={16} /><span>{error}</span>
        <button onClick={() => setError('')} className="hr-error-dismiss">&times;</button>
      </div>
    )
  }

  /* Extract summary stats safely */
  const s = summary || {}
  const statCards = [
    { label: 'Total Projects', value: s.total_projects ?? s.total ?? 0, icon: FolderKanban, color: 'blue' },
    { label: 'Active Projects', value: s.active_projects ?? s.active ?? 0, icon: Activity, color: 'green' },
    { label: 'Total Budget', value: naira(s.total_budget ?? 0), icon: Wallet, color: 'orange' },
    { label: 'Avg Completion', value: `${s.avg_completion ?? s.average_progress ?? 0}%`, icon: BarChart3, color: 'purple' },
  ]

  /* Budget utilization data — handle array or object shape */
  const budgetItems = Array.isArray(budgetUtil) ? budgetUtil
    : budgetUtil?.projects || budgetUtil?.data || []

  /* Activity progress data */
  const activityItems = Array.isArray(activityProg) ? activityProg
    : activityProg?.projects || activityProg?.data || []

  return (
    <div className="animate-in">
      {error && (
        <div className="hr-error-banner" style={{ marginBottom: 16 }}>
          <AlertCircle size={16} /><span>{error}</span>
          <button onClick={() => setError('')} className="hr-error-dismiss">&times;</button>
        </div>
      )}

      {/* Stat cards */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
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

      {/* Status breakdown */}
      {s.by_status && (
        <div className="card animate-in" style={{ marginBottom: 16 }}>
          <div className="card-header"><h3>Projects by Status</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>Status</th><th>Count</th></tr></thead>
                <tbody>
                  {Object.entries(s.by_status).map(([status, count]) => (
                    <tr key={status}>
                      <td><span className={`status-badge ${status}`}><span className="status-dot" />{capitalize(status.replace(/_/g, ' '))}</span></td>
                      <td style={{ fontWeight: 600 }}>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-grid animate-in">
        {/* Budget utilization */}
        <div className="card">
          <div className="card-header"><h3>Budget Utilization</h3></div>
          <div className="card-body">
            {budgetItems.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No budget data available</p>
            ) : budgetItems.slice(0, 10).map((item) => {
              const budget = item.total_budget || item.budget || 0
              const spent = item.amount_spent || item.spent || 0
              const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0
              return (
                <div key={item.project_id || item.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(`/projects/list/${item.project_id || item.id}`)}>
                      {item.project_name || item.name}
                    </span>
                    <span>{naira(spent)} / {naira(budget)}</span>
                  </div>
                  <div className="progress-track" style={{ height: 6 }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className={`progress-fill ${pct > 90 ? 'orange' : 'blue'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Activity progress */}
        <div className="card">
          <div className="card-header"><h3>Activity Progress</h3></div>
          <div className="card-body">
            {activityItems.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No activity data available</p>
            ) : activityItems.slice(0, 10).map((item, i) => {
              const pct = item.completion_percentage ?? item.progress ?? 0
              return (
                <div className="progress-bar-wrapper" key={item.project_id || item.id}>
                  <div className="progress-label">
                    <span style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => navigate(`/projects/list/${item.project_id || item.id}`)}>
                      {item.project_name || item.name}
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className={`progress-fill ${['blue', 'green', 'purple', 'orange'][i % 4]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
