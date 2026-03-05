import {
  FolderKanban, Briefcase, Heart, PieChart, TrendingUp, TrendingDown
} from 'lucide-react'

const stats = [
  { label: 'Active Programs', value: '18', change: '+3', up: true, icon: FolderKanban, color: 'blue' },
  { label: 'Active Projects', value: '42', change: '+7', up: true, icon: Briefcase, color: 'green' },
  { label: 'Beneficiaries', value: '12,450', change: '+8.2%', up: true, icon: Heart, color: 'purple' },
  { label: 'Reports Generated', value: '156', change: '+12', up: true, icon: PieChart, color: 'orange' },
]

const programs = [
  { name: 'Clean Water Initiative', status: 'active', beneficiaries: 3200, budget: '$450K', progress: 78 },
  { name: 'Education for All', status: 'active', beneficiaries: 4500, budget: '$380K', progress: 65 },
  { name: 'Health Outreach', status: 'active', beneficiaries: 2800, budget: '$520K', progress: 92 },
  { name: 'Food Security Program', status: 'active', beneficiaries: 1950, budget: '$290K', progress: 45 },
]

export default function ProgOverview() {
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

      <div className="dashboard-grid animate-in">
        <div className="card">
          <div className="card-header">
            <h3>Program Status</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Program</th><th>Beneficiaries</th><th>Budget</th><th>Progress</th></tr>
                </thead>
                <tbody>
                  {programs.map((p) => (
                    <tr key={p.name}>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{p.name}</td>
                      <td>{p.beneficiaries.toLocaleString()}</td>
                      <td style={{ fontWeight: 600 }}>{p.budget}</td>
                      <td style={{ width: 180 }}>
                        <div className="progress-track" style={{ height: 6 }} role="progressbar" aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} progress`}>
                          <div className="progress-fill blue" style={{ width: `${p.progress}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Program Progress</h3></div>
          <div className="card-body">
            {programs.map((p, i) => (
              <div className="progress-bar-wrapper" key={p.name}>
                <div className="progress-label">
                  <span>{p.name}</span>
                  <span>{p.progress}%</span>
                </div>
                <div className="progress-track" role="progressbar" aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} progress`}>
                  <div className={`progress-fill ${['blue', 'green', 'purple', 'orange'][i]}`} style={{ width: `${p.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
