import { useState, useEffect } from 'react'
import { Download, Users, UserCheck, BarChart3, AlertCircle } from 'lucide-react'
import { programReportsApi } from '../../services/projects'
import { capitalize } from '../../utils/capitalize'

export default function ProgReports() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    programReportsApi.summary()
      .then((res) => setSummary(res?.data?.data || res?.data || null))
      .catch((err) => setError(err.message || 'Failed to load reports'))
      .finally(() => setLoading(false))
  }, [])

  async function handleExport() {
    setExporting(true)
    try {
      await programReportsApi.export()
    } catch { /* ignore */ }
    finally { setExporting(false) }
  }

  if (loading) return <div className="card animate-in" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading reports…</div>
  if (error) return <div className="hr-error-banner"><AlertCircle size={16} /><span>{error}</span></div>

  const s = summary || {}

  return (
    <div className="animate-in">
      <div className="hr-toolbar" style={{ marginBottom: 16, justifyContent: 'flex-end' }}>
        <button className="hr-btn-secondary" onClick={handleExport} disabled={exporting}>
          <Download size={14} /> {exporting ? 'Exporting…' : 'Export Report'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card blue animate-in">
          <div className="stat-top"><div className="stat-icon blue"><Users size={22} /></div></div>
          <div className="stat-value">{s.total_beneficiaries ?? 0}</div>
          <div className="stat-label">Total Beneficiaries</div>
        </div>
        <div className="stat-card green animate-in">
          <div className="stat-top"><div className="stat-icon green"><UserCheck size={22} /></div></div>
          <div className="stat-value">{s.active_beneficiaries ?? 0}</div>
          <div className="stat-label">Active Beneficiaries</div>
        </div>
        <div className="stat-card purple animate-in">
          <div className="stat-top"><div className="stat-icon purple"><BarChart3 size={22} /></div></div>
          <div className="stat-value">{s.by_project ? Object.keys(s.by_project).length : 0}</div>
          <div className="stat-label">Active Projects</div>
        </div>
      </div>

      {s.by_project && Object.keys(s.by_project).length > 0 && (
        <div className="card animate-in">
          <div className="card-header"><h3>Beneficiaries by Project</h3></div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Project</th><th>Count</th></tr></thead>
              <tbody>
                {Object.entries(s.by_project).map(([name, count]) => (
                  <tr key={name}><td style={{ fontWeight: 600 }}>{name}</td><td>{count}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {s.by_status && Object.keys(s.by_status).length > 0 && (
        <div className="card animate-in">
          <div className="card-header"><h3>Beneficiaries by Status</h3></div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Status</th><th>Count</th></tr></thead>
              <tbody>
                {Object.entries(s.by_status).map(([status, count]) => (
                  <tr key={status}><td><span className={`status-badge ${status}`}><span className="status-dot" />{capitalize(status)}</span></td><td>{count}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {s.gender_distribution && Object.keys(s.gender_distribution).length > 0 && (
        <div className="card animate-in">
          <div className="card-header"><h3>Gender Distribution</h3></div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Gender</th><th>Count</th></tr></thead>
              <tbody>
                {Object.entries(s.gender_distribution).map(([gender, count]) => (
                  <tr key={gender}><td>{capitalize(gender)}</td><td>{count}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
