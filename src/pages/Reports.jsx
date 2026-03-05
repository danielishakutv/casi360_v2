import { capitalize } from '../utils/capitalize'

const reports = [
  { name: 'Monthly Staff Report', category: 'HR', generated: 'Mar 1, 2026', format: 'PDF', status: 'active' },
  { name: 'Q1 Financial Summary', category: 'Finance', generated: 'Feb 28, 2026', format: 'Excel', status: 'active' },
  { name: 'Program Impact Assessment', category: 'Programs', generated: 'Feb 25, 2026', format: 'PDF', status: 'active' },
  { name: 'Procurement Audit Report', category: 'Procurement', generated: 'Feb 20, 2026', format: 'PDF', status: 'pending' },
  { name: 'Donor Expenditure Report', category: 'Finance', generated: 'Feb 18, 2026', format: 'Excel', status: 'active' },
  { name: 'Beneficiary Demographics', category: 'Programs', generated: 'Feb 15, 2026', format: 'PDF', status: 'active' },
  { name: 'Annual Performance Review', category: 'HR', generated: 'Feb 10, 2026', format: 'PDF', status: 'approved' },
]

export default function Reports() {
  return (
    <div className="card animate-in">
      <div className="card-header">
        <h3>All Reports</h3>
        <span className="card-badge blue">{reports.length} reports</span>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Report Name</th><th>Category</th><th>Generated</th><th>Format</th><th>Status</th></tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.name}>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{r.name}</td>
                  <td><span className="card-badge blue">{r.category}</span></td>
                  <td>{r.generated}</td>
                  <td style={{ fontWeight: 600 }}>{r.format}</td>
                  <td>
                    <span className={`status-badge ${r.status}`}>
                      <span className="status-dot" />{capitalize(r.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
