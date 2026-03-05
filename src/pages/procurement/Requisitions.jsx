import { capitalize } from '../../utils/capitalize'

const requisitions = [
  { id: 'REQ-1042', title: 'Medical Supplies Q2', requester: 'Sarah Johnson', dept: 'Programs', amount: '$15,200', status: 'pending', date: 'Mar 3, 2026' },
  { id: 'REQ-1041', title: 'Office Equipment', requester: 'Grace Mwangi', dept: 'Admin', amount: '$4,800', status: 'approved', date: 'Mar 1, 2026' },
  { id: 'REQ-1040', title: 'Vehicle Maintenance', requester: 'David Williams', dept: 'Operations', amount: '$2,500', status: 'active', date: 'Feb 28, 2026' },
  { id: 'REQ-1039', title: 'Training Materials', requester: 'Robert Okafor', dept: 'M&E', amount: '$1,200', status: 'approved', date: 'Feb 27, 2026' },
  { id: 'REQ-1038', title: 'Water Purification Tabs', requester: 'Fatima Al-Said', dept: 'Programs', amount: '$8,600', status: 'pending', date: 'Feb 25, 2026' },
  { id: 'REQ-1037', title: 'IT Infrastructure', requester: 'James Kimani', dept: 'IT', amount: '$22,000', status: 'approved', date: 'Feb 22, 2026' },
]

export default function Requisitions() {
  return (
    <div className="card animate-in">
      <div className="card-header">
        <h3>Requisitions</h3>
        <span className="card-badge blue">{requisitions.length} total</span>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>Title</th><th>Requester</th><th>Dept</th><th>Amount</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {requisitions.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '12px' }}>{r.id}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{r.title}</td>
                  <td>{r.requester}</td>
                  <td>{r.dept}</td>
                  <td style={{ fontWeight: 600 }}>{r.amount}</td>
                  <td>
                    <span className={`status-badge ${r.status}`}>
                      <span className="status-dot" />{capitalize(r.status)}
                    </span>
                  </td>
                  <td>{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
