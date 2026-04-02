import { useState, useCallback } from 'react'
import { FileText, Download, Eye, AlertCircle } from 'lucide-react'
import { capitalize } from '../utils/capitalize'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const REPORT_CATALOG = [
  { key: 'hr-employees',               label: 'Employee Report',          category: 'HR',            endpoint: '/reports/hr/employees' },
  { key: 'hr-departments',             label: 'Department Report',        category: 'HR',            endpoint: '/reports/hr/departments' },
  { key: 'hr-designations',            label: 'Designation Report',       category: 'HR',            endpoint: '/reports/hr/designations' },
  { key: 'procurement-purchase-orders', label: 'Purchase Orders Report',  category: 'Procurement',   endpoint: '/reports/procurement/purchase-orders' },
  { key: 'procurement-requisitions',    label: 'Requisitions Report',     category: 'Procurement',   endpoint: '/reports/procurement/requisitions' },
  { key: 'procurement-vendors',         label: 'Vendors Report',          category: 'Procurement',   endpoint: '/reports/procurement/vendors' },
  { key: 'procurement-inventory',       label: 'Inventory Report',        category: 'Procurement',   endpoint: '/reports/procurement/inventory' },
  { key: 'procurement-disbursements',   label: 'Disbursements Report',    category: 'Procurement',   endpoint: '/reports/procurement/disbursements' },
  { key: 'projects-summary',            label: 'Projects Summary',        category: 'Projects',      endpoint: '/reports/projects/summary' },
  { key: 'projects-budget',             label: 'Budget Utilization',      category: 'Projects',      endpoint: '/reports/projects/budget-utilization' },
  { key: 'projects-activities',         label: 'Activity Progress',       category: 'Projects',      endpoint: '/reports/projects/activity-progress' },
  { key: 'comm-notices',                label: 'Notices Report',          category: 'Communication', endpoint: '/reports/communication/notices' },
  { key: 'comm-forums',                 label: 'Forum Activity',          category: 'Communication', endpoint: '/reports/communication/forum-activity' },
  { key: 'finance-overview',            label: 'Finance Overview',        category: 'Finance',       endpoint: '/reports/finance/overview' },
  { key: 'audit-logs',                  label: 'Audit Logs',             category: 'Audit',         endpoint: '/reports/audit/logs',           audit: true },
  { key: 'audit-logins',                label: 'Login History',          category: 'Audit',         endpoint: '/reports/audit/login-history',  audit: true },
]

const FORMATS = ['csv', 'excel', 'pdf']

export default function Reports() {
  const { can } = useAuth()
  const [previewKey, setPreviewKey] = useState(null)
  const [previewData, setPreviewData] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [error, setError] = useState('')

  const visibleReports = REPORT_CATALOG.filter((r) => !r.audit || can('reports.reports.audit'))

  const handlePreview = useCallback(async (report) => {
    setPreviewKey(report.key)
    setPreviewLoading(true)
    setPreviewData(null)
    setError('')
    try {
      const res = await api.get(report.endpoint, { per_page: 10 })
      setPreviewData(res?.data || res)
    } catch (err) {
      setError(err.message || 'Failed to load report preview')
    } finally {
      setPreviewLoading(false)
    }
  }, [])

  function handleDownload(report, format) {
    const baseUrl = import.meta.env.VITE_API_URL || 'https://api.casi360.com/api/v1'
    window.open(`${baseUrl}${report.endpoint}?format=${format}`, '_blank')
  }

  const categories = [...new Set(visibleReports.map((r) => r.category))]

  return (
    <>
      {error && (
        <div className="hr-error-banner">
          <AlertCircle size={16} /><span>{error}</span>
          <button onClick={() => setError('')} className="hr-error-dismiss">&times;</button>
        </div>
      )}

      {categories.map((cat) => (
        <div className="card animate-in" key={cat} style={{ marginBottom: 16 }}>
          <div className="card-header">
            <h3>{cat} Reports</h3>
            <span className="card-badge blue">{visibleReports.filter((r) => r.category === cat).length}</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Report</th><th style={{ width: 120 }}>Preview</th><th style={{ width: 200 }}>Download</th></tr>
                </thead>
                <tbody>
                  {visibleReports.filter((r) => r.category === cat).map((r) => (
                    <tr key={r.key}>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                        <FileText size={14} style={{ marginRight: 6, verticalAlign: -2 }} />{r.label}
                      </td>
                      <td>
                        {can('reports.reports.view') && (
                          <button className="hr-action-btn" onClick={() => handlePreview(r)} title="Preview">
                            <Eye size={15} /> Preview
                          </button>
                        )}
                      </td>
                      <td>
                        {can('reports.reports.download') && (
                          <div className="hr-actions" style={{ gap: 4 }}>
                            {FORMATS.map((fmt) => (
                              <button key={fmt} className="hr-action-btn" onClick={() => handleDownload(r, fmt)} title={`Download ${fmt.toUpperCase()}`}>
                                <Download size={13} /> {fmt.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}

      {/* ─── Preview panel ─── */}
      {previewKey && (
        <div className="card animate-in" style={{ marginTop: 16 }}>
          <div className="card-header">
            <h3>Preview: {REPORT_CATALOG.find((r) => r.key === previewKey)?.label}</h3>
            <button className="hr-btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => setPreviewKey(null)}>Close</button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {previewLoading ? (
              <div style={{ padding: 24, textAlign: 'center' }}><div className="auth-spinner large" /></div>
            ) : previewData?.rows ? (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      {Object.keys(previewData.rows[0] || {}).slice(0, 8).map((col) => (
                        <th key={col}>{capitalize(col.replace(/_/g, ' '))}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).slice(0, 8).map((val, j) => (
                          <td key={j} style={{ fontSize: 12 }}>{val != null ? String(val) : '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.meta && (
                  <p style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                    Showing {previewData.rows.length} of {previewData.meta.total} rows
                  </p>
                )}
              </div>
            ) : (
              <p style={{ padding: 16, color: 'var(--text-muted)' }}>No data available for preview.</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
