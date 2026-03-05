import {
  Users,
  DollarSign,
  FolderKanban,
  TrendingUp,
  TrendingDown,
  Heart,
  Mail,
  FileText,
  UserPlus,
  ClipboardList,
} from 'lucide-react'
import { capitalize } from '../utils/capitalize'

const stats = [
  {
    label: 'Total Staff',
    value: '248',
    change: '+12%',
    up: true,
    icon: Users,
    color: 'blue',
  },
  {
    label: 'Active Programs',
    value: '18',
    change: '+3',
    up: true,
    icon: FolderKanban,
    color: 'green',
  },
  {
    label: 'Beneficiaries',
    value: '12,450',
    change: '+8.2%',
    up: true,
    icon: Heart,
    color: 'purple',
  },
  {
    label: 'Monthly Budget',
    value: '$284K',
    change: '-2.4%',
    up: false,
    icon: DollarSign,
    color: 'orange',
  },
]

const recentStaff = [
  { name: 'Sarah Johnson',   dept: 'Programs',     status: 'active',  date: 'Mar 1, 2026' },
  { name: 'Michael Chen',    dept: 'Finance',      status: 'active',  date: 'Feb 28, 2026' },
  { name: 'Amara Osei',      dept: 'Operations',   status: 'pending', date: 'Feb 25, 2026' },
  { name: 'David Williams',  dept: 'HR',           status: 'active',  date: 'Feb 22, 2026' },
  { name: 'Fatima Al-Said',  dept: 'Programs',     status: 'active',  date: 'Feb 20, 2026' },
]

const activities = [
  { text: 'New requisition #1042 submitted by Sarah Johnson', time: '2 hours ago', color: 'blue' },
  { text: 'Program "Clean Water Initiative" report published', time: '4 hours ago', color: 'green' },
  { text: 'Vendor "MedSupply Co." invoice approved', time: '6 hours ago', color: 'orange' },
  { text: '15 new beneficiaries added to "Education for All"', time: '1 day ago', color: 'purple' },
  { text: 'Monthly staff meeting notice sent', time: '1 day ago', color: 'blue' },
]

const programProgress = [
  { name: 'Clean Water Initiative',  progress: 78, color: 'blue' },
  { name: 'Education for All',       progress: 65, color: 'green' },
  { name: 'Health Outreach',         progress: 92, color: 'purple' },
  { name: 'Food Security Program',   progress: 45, color: 'orange' },
]

export default function Dashboard() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <>
      {/* Welcome Banner */}
      <div className="welcome-banner animate-in">
        <h2>Good Morning, John! 👋</h2>
        <p>Here's what's happening with your organization today.</p>
        <div className="welcome-date">{today}</div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div className={`stat-card ${stat.color} animate-in`} key={stat.label}>
              <div className="stat-top">
                <div className={`stat-icon ${stat.color}`}>
                  <Icon size={22} />
                </div>
                <div className={`stat-change ${stat.up ? 'up' : 'down'}`}>
                  {stat.up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {stat.change}
                </div>
              </div>
              <div className="stat-value">{stat.value}</div>
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
            <span className="card-badge blue">{recentStaff.length} new</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Join Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentStaff.map((s) => (
                    <tr key={s.name}>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{s.name}</td>
                      <td>{s.dept}</td>
                      <td>
                        <span className={`status-badge ${s.status}`}>
                          <span className="status-dot" />
                          {capitalize(s.status)}
                        </span>
                      </td>
                      <td>{s.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Activity</h3>
            <span className="card-badge green">Live</span>
          </div>
          <div className="card-body">
            <div className="activity-list">
              {activities.map((a) => (
                <div className="activity-item" key={a.text}>
                  <div className={`activity-dot ${a.color}`} />
                  <div className="activity-content">
                    <p>{a.text}</p>
                    <span>{a.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom grid: Program Progress + Quick Actions */}
      <div className="dashboard-grid animate-in">
        {/* Program Progress */}
        <div className="card">
          <div className="card-header">
            <h3>Program Progress</h3>
            <span className="card-badge blue">4 active</span>
          </div>
          <div className="card-body">
            {programProgress.map((p) => (
              <div className="progress-bar-wrapper" key={p.name}>
                <div className="progress-label">
                  <span>{p.name}</span>
                  <span>{p.progress}%</span>
                </div>
                <div className="progress-track" role="progressbar" aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} progress`}>
                  <div
                    className={`progress-fill ${p.color}`}
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="card-body">
            <div className="quick-actions">
              <button className="quick-action-btn">
                <div className="quick-action-icon blue">
                  <UserPlus size={18} />
                </div>
                Add Staff
              </button>
              <button className="quick-action-btn">
                <div className="quick-action-icon green">
                  <ClipboardList size={18} />
                </div>
                New Requisition
              </button>
              <button className="quick-action-btn">
                <div className="quick-action-icon orange">
                  <Mail size={18} />
                </div>
                Send Email
              </button>
              <button className="quick-action-btn">
                <div className="quick-action-icon purple">
                  <FileText size={18} />
                </div>
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
