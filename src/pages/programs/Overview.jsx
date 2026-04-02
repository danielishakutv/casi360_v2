import { useState, useEffect } from 'react'
import {
  FolderKanban, Briefcase, Heart, PieChart, TrendingUp, TrendingDown, AlertCircle
} from 'lucide-react'
import { naira } from '../../utils/currency'
import { projectsApi } from '../../services/projects'
import { extractItems } from '../../utils/apiHelpers'

export default function ProgOverview() {
  const [stats, setStats] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [statsRes, projRes] = await Promise.all([
          projectsApi.stats(),
          projectsApi.list({ per_page: 6, sort_by: 'created_at', sort_dir: 'desc' }),
        ])
        setStats(statsRes?.data || statsRes)
        setProjects(extractItems(projRes))
      } catch (err) {
        setError(err.message || 'Failed to load overview')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const statCards = stats ? [
    { label: 'Total Projects', value: stats.total ?? 0, icon: FolderKanban, color: 'blue' },
    { label: 'Active Projects', value: stats.active ?? 0, icon: Briefcase, color: 'green' },
    { label: 'Draft Projects', value: stats.draft ?? 0, icon: Heart, color: 'purple' },
    { label: 'Total Budget', value: naira(stats.total_budget ?? 0), icon: PieChart, color: 'orange' },
  ] : []

  return (
    <>
      {error && (
        <div className="hr-error-banner">
          <AlertCircle size={16} /><span>{error}</span>
          <button onClick={() => setError('')} className="hr-error-dismiss">&times;</button>
        </div>
      )}

      <div className="stats-grid">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div className="stat-card animate-in" key={i}><div className="auth-spinner" style={{ margin: '18px auto' }} /></div>
          ))
        ) : statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div className={`stat-card ${stat.color} animate-in`} key={stat.label}>
              <div className="stat-top">
                <div className={`stat-icon ${stat.color}`}><Icon size={22} /></div>
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          )
        })}
      </div>

      <div className="dashboard-grid animate-in">
        <div className="card">
          <div className="card-header">
            <h3>Recent Projects</h3>
            {stats && <span className="card-badge blue">{stats.active ?? 0} active</span>}
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Project</th><th>Department</th><th>Budget</th><th>Progress</th></tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '16px auto' }} /></td></tr>
                  ) : projects.length === 0 ? (
                    <tr><td colSpan={4} className="hr-empty-cell">No projects yet</td></tr>
                  ) : projects.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{p.name}</td>
                      <td>{p.department || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{naira(p.total_budget)}</td>
                      <td style={{ width: 180 }}>
                        {p.activity_progress ? (
                          <div className="progress-track" style={{ height: 6 }} role="progressbar" aria-valuenow={p.activity_progress.percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} progress`}>
                            <div className="progress-fill blue" style={{ width: `${p.activity_progress.percentage}%` }} />
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Project Progress</h3></div>
          <div className="card-body">
            {loading ? (
              <div className="auth-spinner" style={{ margin: '20px auto' }} />
            ) : projects.filter((p) => p.activity_progress).length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No activity data yet</p>
            ) : projects.filter((p) => p.activity_progress).slice(0, 6).map((p, i) => (
              <div className="progress-bar-wrapper" key={p.id}>
                <div className="progress-label">
                  <span>{p.name}</span>
                  <span>{p.activity_progress.percentage}%</span>
                </div>
                <div className="progress-track" role="progressbar" aria-valuenow={p.activity_progress.percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} progress`}>
                  <div className={`progress-fill ${['blue', 'green', 'purple', 'orange'][i % 4]}`} style={{ width: `${p.activity_progress.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Department breakdown */}
      {stats?.by_department?.length > 0 && (
        <div className="card animate-in" style={{ marginTop: 16 }}>
          <div className="card-header"><h3>By Department</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>Department</th><th>Projects</th><th>Total Budget</th></tr></thead>
                <tbody>
                  {stats.by_department.map((d) => (
                    <tr key={d.department_id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{d.department}</td>
                      <td>{d.count}</td>
                      <td style={{ fontWeight: 600 }}>{naira(d.total_budget)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
