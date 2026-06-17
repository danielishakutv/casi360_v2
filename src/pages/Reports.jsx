import { useState, useCallback } from 'react'
import {
  FileText, Download, Eye, AlertCircle, Users, ShoppingCart,
  FolderKanban, MessageSquare, Wallet, Shield,
} from 'lucide-react'
import { capitalize } from '../utils/capitalize'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import Modal from '../components/Modal'

const REPORT_CATALOG = [
  { key: 'hr-employees',                label: 'Employee Report',         category: 'HR',            endpoint: '/reports/hr/employees' },
  { key: 'hr-departments',              label: 'Department Report',       category: 'HR',            endpoint: '/reports/hr/departments' },
  { key: 'hr-designations',             label: 'Designation Report',      category: 'HR',            endpoint: '/reports/hr/designations' },
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
  { key: 'audit-logs',                  label: 'Audit Logs',              category: 'Audit',         endpoint: '/reports/audit/logs',          audit: true },
  { key: 'audit-logins',                label: 'Login History',           category: 'Audit',         endpoint: '/reports/audit/login-history', audit: true },
]

const FORMATS = [
  { key: 'csv', label: 'CSV' },
  { key: 'pdf', label: 'PDF' },
]

const CATEGORY_META = {
  HR:            { icon: Users,         color: '#6366f1' },
  Procurement:   { icon: ShoppingCart,  color: '#0ea5e9' },
  Projects:      { icon: FolderKanban,  color: '#10b981' },
  Communication: { icon: MessageSquare, color: '#f59e0b' },
  Finance:       { icon: Wallet,        color: '#ec4899' },
  Audit:         { icon: Shield,        color: '#64748b' },
}

export default function Reports() {
  const { can } = useAuth()
  const [previewReport, setPreviewReport] = useState(null)
  const [previewData, setPreviewData] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [error, setError] = useState('')

  const canPreview  = can('reports.reports.view')
  const canDownload = can('reports.reports.download')
  const visibleReports = REPORT_CATALOG.filter((r) => !r.audit || can('reports.reports.audit'))

  const handlePreview = useCallback(async (report) => {
    setPreviewReport(report)
    setPreviewLoading(true)
    setPreviewData(null)
    setError('')
    try {
      const res = await api.get(report.endpoint, { per_page: 10 })
      setPreviewData(res?.data || res)
    } catch (err) {
      setError(err.message || 'Failed to load report preview')
      setPreviewReport(null)
    } finally {
      setPreviewLoading(false)
    }
  }, [])

  function handleDownload(report, format) {
    // The API base is VITE_API_URL + '/api/v1' (same as the api client). The
    // env var is just the origin (e.g. https://api.casi360.com), so the
    // '/api/v1' prefix must be added here too — otherwise the download 404s.
    const apiBase = (import.meta.env.VITE_API_URL || 'https://api.casi360.com') + '/api/v1'
    window.open(`${apiBase}${report.endpoint}?format=${format}`, '_blank')
  }

  const categories = [...new Set(visibleReports.map((r) => r.category))]
  const previewCols = previewData?.rows?.length ? Object.keys(previewData.rows[0]).slice(0, 8) : []

  return (
    <>
      {error && (
        <div className="hr-error-banner">
          <AlertCircle size={16} /><span>{error}</span>
          <button onClick={() => setError('')} className="hr-error-dismiss">&times;</button>
        </div>
      )}

      {/* Intro */}
      <div className="card animate-in" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'var(--primary-50, #eef2ff)', color: 'var(--primary, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FileText size={22} />
          </div>
          <div style={{ minWidth: 200, flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Reports</h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              Preview any report on screen, or download it as CSV, Excel, or PDF.
            </p>
          </div>
        </div>
      </div>

      {/* Category sections */}
      {categories.map((cat) => {
        const meta = CATEGORY_META[cat] || { icon: FileText, color: 'var(--primary)' }
        const Icon = meta.icon
        const reports = visibleReports.filter((r) => r.category === cat)
        return (
          <div className="card animate-in" key={cat} style={{ marginBottom: 16 }}>
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: `${meta.color}1a`, color: meta.color,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={16} />
                </span>
                {cat} Reports
              </h3>
              <span className="card-badge gray">{reports.length}</span>
            </div>
            <div className="card-body">
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 270px), 1fr))',
                gap: 12,
              }}>
                {reports.map((r) => (
                  <div
                    key={r.key}
                    style={{
                      border: '1px solid var(--border-color, #e5e7eb)', borderRadius: 12,
                      padding: 14, display: 'flex', flexDirection: 'column', gap: 12,
                      background: 'var(--surface, #fff)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: meta.color, display: 'inline-flex', flexShrink: 0 }}><FileText size={18} /></span>
                      <span style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.25 }}>{r.label}</span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'auto' }}>
                      {canPreview && (
                        <button
                          className="hr-action-btn"
                          style={{ flex: '1 1 auto', justifyContent: 'center', minWidth: 90 }}
                          onClick={() => handlePreview(r)}
                        >
                          <Eye size={15} /> Preview
                        </button>
                      )}
                      {canDownload && FORMATS.map(({ key, label }) => (
                        <button
                          key={key}
                          className="hr-action-btn"
                          style={{ flex: '1 1 auto', justifyContent: 'center', minWidth: 64 }}
                          onClick={() => handleDownload(r, key)}
                          title={`Download ${label}`}
                        >
                          <Download size={14} /> {label}
                        </button>
                      ))}
                      {!canPreview && !canDownload && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No access</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}

      {visibleReports.length === 0 && (
        <div className="card animate-in" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          No reports available for your role.
        </div>
      )}

      {/* Preview modal */}
      <Modal
        open={!!previewReport}
        onClose={() => { setPreviewReport(null); setPreviewData(null) }}
        title={previewReport ? `Preview — ${previewReport.label}` : 'Preview'}
        size="xl"
      >
        {previewLoading ? (
          <div style={{ padding: 32, textAlign: 'center' }}><div className="auth-spinner large" style={{ margin: '0 auto' }} /></div>
        ) : previewData?.rows?.length ? (
          <div>
            <div className="table-wrapper" style={{ maxHeight: '60vh', overflow: 'auto' }}>
              <table className="data-table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>{previewCols.map((col) => <th key={col}>{capitalize(col.replace(/_/g, ' '))}</th>)}</tr>
                </thead>
                <tbody>
                  {previewData.rows.slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      {previewCols.map((col, j) => (
                        <td key={j}>{row[col] != null && row[col] !== '' ? String(row[col]) : '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Showing {Math.min(previewData.rows.length, 10)}{previewData.meta?.total != null ? ` of ${previewData.meta.total}` : ''} rows
              </span>
              {canDownload && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {FORMATS.map(({ key, label }) => (
                    <button key={key} className="hr-btn-secondary" onClick={() => handleDownload(previewReport, key)}>
                      <Download size={14} /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p style={{ padding: 16, color: 'var(--text-muted)' }}>No data available for this report yet.</p>
        )}
      </Modal>
    </>
  )
}
