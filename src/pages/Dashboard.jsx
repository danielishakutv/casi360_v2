import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  DollarSign,
  FolderKanban,
  Bell,
  ClipboardList,
  ListOrdered,
  Inbox,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { dashboardApi } from '../services/dashboard'
import { capitalize } from '../utils/capitalize'
import { fmtDate, fmtDateTime } from '../utils/formatDate'
import { naira, formatMoney, ngnEquivalent } from '../utils/currency'

const PROGRESS_COLORS = ['blue', 'green', 'purple', 'orange']

/** USD primary + ₦ secondary for a document amount. */
function MoneyCell({ amount, currency, rate, ngn }) {
  const secondary = ngn != null ? naira(ngn) : ngnEquivalent(amount, rate)
  return (
    <div>
      <div>{formatMoney(amount, currency || 'USD')}</div>
      {secondary && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{secondary}</div>}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    dashboardApi.summary()
      .then((res) => { if (!cancelled) setData(res?.data || res) })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const firstName = user?.name?.split(' ')[0] || 'there'

  const scope = data?.scope || 'department'
  const stats = data?.stats || {}

  /* Stat cards differ by scope so a department user never sees org-wide
     finance / HR / procurement figures (only what concerns them). */
  const statCards = scope === 'org'
    ? [
        { label: 'Total Staff',     value: stats.total_staff ?? '—',                                          icon: Users,        color: 'blue' },
        { label: 'Active Projects', value: stats.active_projects ?? '—',                                      icon: FolderKanban, color: 'green' },
        { label: 'Notices',         value: stats.notices ?? '—',                                              icon: Bell,         color: 'purple' },
        { label: 'Total Budget',    value: stats.total_budget != null ? naira(stats.total_budget) : '—',      icon: DollarSign,   color: 'orange' },
      ]
    : [
        { label: 'My Purchase Requests', value: stats.my_open_prs ?? '—',         icon: ClipboardList, color: 'blue' },
        { label: 'My BOQs',              value: stats.my_boqs ?? '—',             icon: ListOrdered,   color: 'green' },
        { label: 'Dept. Projects',       value: stats.department_projects ?? '—', icon: FolderKanban,  color: 'purple' },
        { label: 'Notices',              value: stats.notices ?? '—',             icon: Bell,          color: 'orange' },
      ]

  const recentNotices = data?.recent_notices || []
  const activeProjects = scope === 'org' ? (data?.active_projects || []) : (data?.department_projects || [])
  const recentStaff = data?.recent_staff || []
  const myReqs = data?.my_requisitions || []
  const myBoqs = data?.my_boqs || []

  return (
    <>
      {/* Welcome Banner */}
      <div className="welcome-banner animate-in">
        <h2>{greeting}, {firstName}!</h2>
        <p>
          {scope === 'org'
            ? "Here's what's happening across the organization today."
            : `Here's what concerns ${data?.department ? data.department : 'you'} today.`}
        </p>
        <div className="welcome-date">
          {today}
          {data?.generated_at && (
            <span style={{ opacity: 0.85 }}> · as of {fmtDateTime(data.generated_at)}</span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div className={`stat-card ${stat.color} animate-in`} key={stat.label}>
              <div className="stat-top">
                <div className={`stat-icon ${stat.color}`}><Icon size={22} /></div>
              </div>
              <div className="stat-value">{loading ? '...' : stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          )
        })}
      </div>

      {/* Department view: my PRs + my BOQs */}
      {scope === 'department' && (
        <div className="dashboard-grid-full animate-in">
          <div className="card">
            <div className="card-header">
              <h3>My Purchase Requests</h3>
              <span className="card-badge blue">{myReqs.length} shown</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {loading ? (
                <div style={{ padding: 24, textAlign: 'center' }}><div className="auth-spinner large" /></div>
              ) : myReqs.length === 0 ? (
                <p style={{ padding: 16, color: 'var(--text-muted)' }}>No purchase requests yet. Use Quick Actions to raise one.</p>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead><tr><th>PR #</th><th>Title</th><th>Status</th><th>Est. Cost</th><th>Created</th></tr></thead>
                    <tbody>
                      {myReqs.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600 }}>{r.requisition_number}</td>
                          <td>{r.title || '—'}</td>
                          <td><span className={`status-badge ${r.status}`}><span className="status-dot" />{capitalize(r.status || 'draft')}</span></td>
                          <td><MoneyCell amount={r.estimated_cost} currency={r.currency} rate={r.exchange_rate} /></td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDateTime(r.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>My Bills of Quantities</h3>
              <span className="card-badge green">{myBoqs.length} shown</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {loading ? (
                <div style={{ padding: 24, textAlign: 'center' }}><div className="auth-spinner large" /></div>
              ) : myBoqs.length === 0 ? (
                <p style={{ padding: 16, color: 'var(--text-muted)' }}>No BOQs yet. Use Quick Actions to raise one.</p>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead><tr><th>BOQ #</th><th>Title</th><th>Status</th><th>Total</th><th>Created</th></tr></thead>
                    <tbody>
                      {myBoqs.map((b) => (
                        <tr key={b.id}>
                          <td style={{ fontWeight: 600 }}>{b.boq_number}</td>
                          <td>{b.title || '—'}</td>
                          <td><span className={`status-badge ${b.status}`}><span className="status-dot" />{capitalize(b.status || 'draft')}</span></td>
                          <td><MoneyCell amount={b.grand_total} currency={b.currency} rate={b.exchange_rate} ngn={b.grand_total_ngn} /></td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDateTime(b.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Org view: recent staff + recent notices */}
      {scope === 'org' && (
        <div className="dashboard-grid-full animate-in">
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
                    <thead><tr><th>Name</th><th>Department</th><th>Status</th><th>Joined</th></tr></thead>
                    <tbody>
                      {recentStaff.map((s) => (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{s.name}</td>
                          <td>{s.department || '—'}</td>
                          <td><span className={`status-badge ${s.status}`}><span className="status-dot" />{capitalize(s.status || 'active')}</span></td>
                          <td>{s.join_date ? fmtDate(s.join_date) : fmtDate(s.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <NoticesCard loading={loading} notices={recentNotices} />
        </div>
      )}

      {/* Bottom: Projects + (Notices for department scope) + Quick Actions */}
      {scope === 'department' ? (
        <>
          <div className="dashboard-grid animate-in">
            <ProjectsCard scope={scope} loading={loading} projects={activeProjects} />
            <NoticesCard loading={loading} notices={recentNotices} />
          </div>
          <div className="card animate-in" style={{ marginTop: 16 }}>
            <div className="card-header"><h3>Quick Actions</h3></div>
            <div className="card-body"><QuickActions /></div>
          </div>
        </>
      ) : (
        <div className="dashboard-grid animate-in">
          <ProjectsCard scope={scope} loading={loading} projects={activeProjects} />
          <div className="card">
            <div className="card-header"><h3>Quick Actions</h3></div>
            <div className="card-body"><QuickActions /></div>
          </div>
        </div>
      )}
    </>
  )
}

/* Project progress card, shared by both dashboard scopes. */
function ProjectsCard({ scope, loading, projects }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3>{scope === 'org' ? 'Active Projects' : 'My Department’s Projects'}</h3>
        <span className="card-badge blue">{projects.length} active</span>
      </div>
      <div className="card-body">
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center' }}><div className="auth-spinner large" /></div>
        ) : projects.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No active projects.</p>
        ) : (
          projects.map((p, i) => {
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
  )
}

/* Quick action links — everyone can raise a PR or BOQ. */
function QuickActions() {
  return (
    <div className="quick-actions">
      <Link to="/procurement/purchase-requests" className="quick-action-btn">
        <div className="quick-action-icon blue"><ClipboardList size={18} /></div>
        Raise Purchase Request
      </Link>
      <Link to="/procurement/boq" className="quick-action-btn">
        <div className="quick-action-icon green"><ListOrdered size={18} /></div>
        Raise BOQ
      </Link>
      <Link to="/communication/messages" className="quick-action-btn">
        <div className="quick-action-icon orange"><Inbox size={18} /></div>
        Messages
      </Link>
      <Link to="/communication/notices" className="quick-action-btn">
        <div className="quick-action-icon purple"><Bell size={18} /></div>
        Notices
      </Link>
    </div>
  )
}

/* Recent notices list with date + time. */
function NoticesCard({ loading, notices }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3>Recent Notices</h3>
        <span className="card-badge green">{notices.length} shown</span>
      </div>
      <div className="card-body">
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center' }}><div className="auth-spinner large" /></div>
        ) : notices.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No notices yet.</p>
        ) : (
          <div className="activity-list">
            {notices.map((n) => (
              <div className="activity-item" key={n.id}>
                <div className={`activity-dot ${n.priority === 'critical' ? 'orange' : n.priority === 'important' ? 'purple' : 'blue'}`} />
                <div className="activity-content">
                  <p>{n.title}</p>
                  <span>{fmtDateTime(n.created_at)}{n.priority && n.priority !== 'normal' ? ` · ${capitalize(n.priority)}` : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
