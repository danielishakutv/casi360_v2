import { capitalize } from '../../utils/capitalize'

const projects = [
  { id: 'PRJ-001', name: 'Borehole Drilling - Turkana', program: 'Clean Water Initiative', manager: 'Sarah Johnson', status: 'active', budget: '$85,000' },
  { id: 'PRJ-002', name: 'School Renovation - Nairobi', program: 'Education for All', manager: 'David Williams', status: 'active', budget: '$120,000' },
  { id: 'PRJ-003', name: 'Mobile Clinic Deployment', program: 'Health Outreach', manager: 'Fatima Al-Said', status: 'active', budget: '$95,000' },
  { id: 'PRJ-004', name: 'Farming Equipment Distribution', program: 'Food Security Program', manager: 'Amara Osei', status: 'pending', budget: '$65,000' },
  { id: 'PRJ-005', name: 'Teacher Training Program', program: 'Education for All', manager: 'Robert Okafor', status: 'active', budget: '$45,000' },
  { id: 'PRJ-006', name: 'Water Testing Stations', program: 'Clean Water Initiative', manager: 'Michael Chen', status: 'approved', budget: '$38,000' },
]

export default function Projects() {
  return (
    <div className="card animate-in">
      <div className="card-header">
        <h3>Projects</h3>
        <span className="card-badge blue">{projects.length} projects</span>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>Project</th><th>Program</th><th>Manager</th><th>Budget</th><th>Status</th></tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '12px' }}>{p.id}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{p.name}</td>
                  <td>{p.program}</td>
                  <td>{p.manager}</td>
                  <td style={{ fontWeight: 600 }}>{p.budget}</td>
                  <td>
                    <span className={`status-badge ${p.status}`}>
                      <span className="status-dot" />{capitalize(p.status)}
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
