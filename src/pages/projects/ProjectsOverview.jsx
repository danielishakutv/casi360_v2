import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderKanban, Briefcase, CheckCircle, PieChart, Plus, ArrowRight, AlertCircle,
} from 'lucide-react'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import { capitalize } from '../../utils/capitalize'
import { projectsApi } from '../../services/projects'
import { extractItems } from '../../utils/apiHelpers'
import { useAuth } from '../../contexts/AuthContext'

const STATUS_COLORS = { draft: 'gray', active: 'green', on_hold: 'orange', completed: 'blue', closed: 'red' }

function fmtStatus(s) { return capitalize((s || '').replace(/_/g, ' ')) }

export default function ProjectsOverview() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [statsRes, recentRes] = await Promise.all([
          projectsApi.stats(),
          projectsApi.list({ per_page: 5, sort_by: 'created_at', sort_dir: 'desc' }),
        ])
        setStats(statsRes?.data || statsRes)
        setRecent(extractItems(recentRes))
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
    { label: 'Completed', value: stats.completed ?? 0, icon: CheckCircle, color: 'purple' },
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

      {/* Stat cards */}
      <div className="stats-grid">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div className="stat-card animate-in" key={i}><div className="auth-spinner" style={{ margin: '18px auto' }} /></div>
          ))
        ) : statCards.map((stat) => {
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

      {/* Quick action buttons */}
      <div className="hr-toolbar" style={{ marginBottom: 16, justifyContent: 'flex-end', gap: 8 }}>
        {can('projects.projects.create') && (
          <button className="hr-btn-primary" onClick={() => navigate('/projects/list', { state: { openCreate: true } })}>
            <Plus size={16} /> Create New Project
          </button>
        )}
        <button className="hr-btn-secondary" onClick={() => navigate('/projects/list')}>
          <ArrowRight size={16} /> View All Projects
        </button>
      </div>

      {/* Status breakdown */}
      {stats && (
        <div className="card animate-in" style={{ marginBottom: 16 }}>
          <div className="card-header"><h3>Status Breakdown</h3></div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {['draft', 'active', 'on_hold', 'completed', 'closed'].map((s) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: 'var(--bg-muted)', fontSize: 13 }}>
                  <span className={`status-badge ${s}`} style={{ margin: 0 }}><span className="status-dot" />{fmtStatus(s)}</span>
                  <strong>{stats[s] ?? 0}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-grid animate-in">
        {/* Recent projects */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Projects</h3>
            {stats && <span className="card-badge blue">{stats.active ?? 0} active</span>}
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>Project</th><th>Status</th><th>Budget</th><th>Progress</th></tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '16px auto' }} /></td></tr>
                  ) : recent.length === 0 ? (
                    <tr><td colSpan={4} className="hr-empty-cell">No projects yet. Create your first project to get started.</td></tr>
                  ) : recent.map((p) => (
                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/list/${p.id}`)}>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{p.name}</td>
                      <td><span className={`status-badge ${p.status}`}><span className="status-dot" />{fmtStatus(p.status)}</span></td>
                      <td style={{ fontWeight: 600 }}>{naira(p.total_budget)}</td>
                      <td style={{ width: 140 }}>
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

        {/* Project progress chart */}
        <div className="card">
          <div className="card-header"><h3>Project Progress</h3></div>
          <div className="card-body">
            {loading ? (
              <div className="auth-spinner" style={{ margin: '20px auto' }} />
            ) : recent.filter((p) => p.activity_progress).length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No activity data yet</p>
            ) : recent.filter((p) => p.activity_progress).map((p, i) => (
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
