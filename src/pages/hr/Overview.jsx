import { useState, useEffect } from 'react'
import {
  Users, UserCheck, Building2, Clock,
  TrendingUp, TrendingDown, AlertCircle, RefreshCw,
} from 'lucide-react'
import { employeesApi, departmentsApi } from '../../services/hr'
import { capitalize } from '../../utils/capitalize'
import { extractItems, extractStats } from '../../utils/apiHelpers'

/** Maps API stat keys → card config */
const STAT_CONFIG = [
  { key: 'total_employees',  label: 'Total Employees', icon: Users,     color: 'blue' },
  { key: 'active_employees', label: 'Active Staff',     icon: UserCheck, color: 'green' },
  { key: 'departments_count', label: 'Departments',     icon: Building2, color: 'purple' },
  { key: 'on_leave',         label: 'On Leave',         icon: Clock,     color: 'orange' },
]

export default function HROverview() {
  const [stats, setStats] = useState(null)
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [statsRes, deptsRes] = await Promise.all([
        employeesApi.stats(),
        departmentsApi.list({ per_page: 0 }),
      ])
      setStats(extractStats(statsRes))
      setDepartments(extractItems(deptsRes))
    } catch (err) {
      setError(err.message || 'Failed to load HR data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  /* ---------- Loading state ---------- */
  if (loading) {
    return (
      <div className="hr-loading">
        <div className="auth-spinner large" />
        <p>Loading HR overview…</p>
      </div>
    )
  }

  /* ---------- Error state ---------- */
  if (error) {
    return (
      <div className="hr-error-banner">
        <AlertCircle size={16} />
        <span>{error}</span>
        <button className="hr-btn-secondary" onClick={loadData} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    )
  }

  /* ---------- Stat cards ---------- */
  const statCards = STAT_CONFIG.map((cfg) => {
    const value  = stats?.[cfg.key] ?? 0
    const change = stats?.[`${cfg.key}_change`] ?? null
    return { ...cfg, value, change }
  })

  return (
    <>
      <div className="stats-grid">
        {statCards.map((stat) => {
          const Icon = stat.icon
          const up = stat.change != null ? stat.change >= 0 : null
          return (
            <div className={`stat-card ${stat.color} animate-in`} key={stat.key}>
              <div className="stat-top">
                <div className={`stat-icon ${stat.color}`}><Icon size={22} /></div>
                {stat.change != null && (
                  <div className={`stat-change ${up ? 'up' : 'down'}`}>
                    {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {up && stat.change > 0 ? '+' : ''}{stat.change}
                  </div>
                )}
              </div>
              <div className="stat-value">{Number(stat.value).toLocaleString()}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          )
        })}
      </div>

      <div className="card animate-in">
        <div className="card-header">
          <h3>Departments Overview</h3>
          <span className="card-badge blue">{departments.length} departments</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Head</th>
                  <th>Staff Count</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="hr-empty-cell">No departments found</td>
                  </tr>
                ) : (
                  departments.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <span className="hr-dept-name-cell">
                          {d.color && <span className="hr-color-dot" style={{ background: d.color }} />}
                          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{d.name}</span>
                        </span>
                      </td>
                      <td>{d.head || '—'}</td>
                      <td>{d.employees_count ?? 0}</td>
                      <td>
                        <span className={`status-badge ${d.status || 'inactive'}`}>
                          <span className="status-dot" />
                          {capitalize(d.status || 'inactive')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
