import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  DollarSign,
  FolderKanban,
  Bell,
  Mail,
  FileText,
  UserPlus,
  ClipboardList,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { employeesApi } from '../services/hr'
import { projectsApi } from '../services/projects'
import { noticesApi } from '../services/communication'
import { extractItems } from '../utils/apiHelpers'
import { capitalize } from '../utils/capitalize'
import { fmtDate } from '../utils/formatDate'
import { naira } from '../utils/currency'

const PROGRESS_COLORS = ['blue', 'green', 'purple', 'orange']

export default function Dashboard() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [staffStats, setStaffStats] = useState(null)
  const [projectStats, setProjectStats] = useState(null)
  const [noticeStats, setNoticeStats] = useState(null)
  const [recentStaff, setRecentStaff] = useState([])
  const [recentNotices, setRecentNotices] = useState([])
  const [activeProjects, setActiveProjects] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [empRes, projRes, notiRes, staffRes, noticeListRes, projListRes] = await Promise.allSettled([
          employeesApi.stats(),
          projectsApi.stats(),
          noticesApi.stats(),
          employeesApi.list({ per_page: 5, sort: '-created_at' }),
          noticesApi.list({ per_page: 5, sort: '-created_at' }),
          projectsApi.list({ per_page: 5, status: 'active' }),
        ])
        if (cancelled) return
        if (empRes.status === 'fulfilled')        setStaffStats(empRes.value?.data || empRes.value)
        if (projRes.status === 'fulfilled')       setProjectStats(projRes.value?.data || projRes.value)
        if (notiRes.status === 'fulfilled')       setNoticeStats(notiRes.value?.data || notiRes.value)
        if (staffRes.status === 'fulfilled')      setRecentStaff(extractItems(staffRes.value))
        if (noticeListRes.status === 'fulfilled') setRecentNotices(extractItems(noticeListRes.value))
        if (projListRes.status === 'fulfilled')   setActiveProjects(extractItems(projListRes.value))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const firstName = user?.first_name || user?.name?.split(' ')[0] || 'there'

  const statCards = [
    { label: 'Total Staff',      value: staffStats?.total ?? '—',   icon: Users,        color: 'blue' },
    { label: 'Active Projects',  value: projectStats?.active ?? '—', icon: FolderKanban, color: 'green' },
    { label: 'Notices',          value: noticeStats?.total ?? '—',   icon: Bell,         color: 'purple' },
    { label: 'Total Budget',     value: projectStats?.total_budget != null ? naira(projectStats.total_budget) : '—', icon: DollarSign, color: 'orange' },
  ]

  return (
    <>
      {/* Welcome Banner */}
      <div className="welcome-banner animate-in">
        <h2>{greeting}, {firstName}!</h2>
        <p>Here's what's happening with your organization today.</p>
        <div className="welcome-date">{today}</div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div className={`stat-card ${stat.color} animate-in`} key={stat.label}>
              <div className="stat-top">
                <div className={`stat-icon ${stat.color}`}>
                  <Icon size={22} />
                </div>
              </div>
              <div className="stat-value">{loading ? '...' : stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          )
        })}
      </div>

      {/* Main grid: Table + Activity */}
      <div className="dashboard-grid-full animate-in">
        {/* Recent Staff */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Staff</h3>
            <span className="card-badge blue">{recentStaff.length} shown</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center' }}><div className="auth-spinner large" /></div>
            ) : recentStaff.length === 0 ? (
              <p style={{ padding: 16, color: 'var(--text-muted)' }}>No recent staff found.</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>Name</th><th>Department</th><th>Status</th><th>Join Date</th></tr>
                  </thead>
                  <tbody>
                    {recentStaff.map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {s.first_name} {s.last_name}
                        </td>
                        <td>{s.department?.name || '—'}</td>
                        <td>
                          <span className={`status-badge ${s.status}`}>
                            <span className="status-dot" />{capitalize(s.status || 'active')}
                          </span>
                        </td>
                        <td>{s.date_of_joining ? fmtDate(s.date_of_joining) : fmtDate(s.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Notices */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Notices</h3>
            <span className="card-badge green">{noticeStats?.published ?? 0} published</span>
          </div>
          <div className="card-body">
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center' }}><div className="auth-spinner large" /></div>
            ) : recentNotices.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No notices yet.</p>
            ) : (
              <div className="activity-list">
                {recentNotices.map((n) => (
                  <div className="activity-item" key={n.id}>
                    <div className={`activity-dot ${n.priority === 'critical' ? 'orange' : n.priority === 'important' ? 'purple' : 'blue'}`} />
                    <div className="activity-content">
                      <p>{n.title}</p>
                      <span>{fmtDate(n.created_at)}{n.priority !== 'normal' ? ` · ${capitalize(n.priority)}` : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom grid: Program Progress + Quick Actions */}
      <div className="dashboard-grid animate-in">
        {/* Project Progress */}
        <div className="card">
          <div className="card-header">
            <h3>Active Projects</h3>
            <span className="card-badge blue">{activeProjects.length} active</span>
          </div>
          <div className="card-body">
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center' }}><div className="auth-spinner large" /></div>
            ) : activeProjects.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No active projects.</p>
            ) : (
              activeProjects.map((p, i) => {
                const pct = p.activity_progress?.percentage ?? 0
                return (
                  <div className="progress-bar-wrapper" key={p.id}>
                    <div className="progress-label">
                      <span>{p.name}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} progress`}>
                      <div className={`progress-fill ${PROGRESS_COLORS[i % PROGRESS_COLORS.length]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="card-body">
            <div className="quick-actions">
              <Link to="/hr/staff" className="quick-action-btn">
                <div className="quick-action-icon blue"><UserPlus size={18} /></div>
                Staff List
              </Link>
              <Link to="/procurement/purchase-requests" className="quick-action-btn">
                <div className="quick-action-icon green"><ClipboardList size={18} /></div>
                Requisitions
              </Link>
              <Link to="/communication/send-email" className="quick-action-btn">
                <div className="quick-action-icon orange"><Mail size={18} /></div>
                Send Email
              </Link>
              <Link to="/reports" className="quick-action-btn">
                <div className="quick-action-icon purple"><FileText size={18} /></div>
                Reports
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
