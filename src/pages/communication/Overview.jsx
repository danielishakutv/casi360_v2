import {
  MessageSquare, Mail, Smartphone, Bell, TrendingUp, TrendingDown
} from 'lucide-react'

const stats = [
  { label: 'Emails Sent', value: '1,248', change: '+124', up: true, icon: Mail, color: 'blue' },
  { label: 'SMS Sent', value: '3,560', change: '+302', up: true, icon: Smartphone, color: 'green' },
  { label: 'Notices', value: '45', change: '+8', up: true, icon: Bell, color: 'orange' },
  { label: 'Delivery Rate', value: '98.2%', change: '+0.5%', up: true, icon: MessageSquare, color: 'purple' },
]

const recent = [
  { type: 'Email', subject: 'Monthly Report - February 2026', to: 'All Staff', date: 'Mar 3, 2026', status: 'active' },
  { type: 'SMS', subject: 'Meeting Reminder', to: 'Program Managers', date: 'Mar 2, 2026', status: 'active' },
  { type: 'Notice', subject: 'Office Closure - Public Holiday', to: 'All Staff', date: 'Feb 28, 2026', status: 'active' },
  { type: 'Email', subject: 'Q1 Donor Report Submission', to: 'Finance Team', date: 'Feb 25, 2026', status: 'pending' },
]

export default function CommOverview() {
  return (
    <>
      <div className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div className={`stat-card ${stat.color} animate-in`} key={stat.label}>
              <div className="stat-top">
                <div className={`stat-icon ${stat.color}`}><Icon size={22} /></div>
                <div className={`stat-change ${stat.up ? 'up' : 'down'}`}>
                  {stat.up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{stat.change}
                </div>
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          )
        })}
      </div>

      <div className="card animate-in">
        <div className="card-header">
          <h3>Recent Communications</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Type</th><th>Subject</th><th>To</th><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.subject}>
                    <td><span className="card-badge blue">{r.type}</span></td>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{r.subject}</td>
                    <td>{r.to}</td>
                    <td>{r.date}</td>
                    <td>
                      <span className={`status-badge ${r.status}`}>
                        <span className="status-dot" />{r.status === 'active' ? 'Sent' : 'Draft'}
                      </span>
                    </td>
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
