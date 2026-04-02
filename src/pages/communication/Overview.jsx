import { useState, useEffect } from 'react'
import {
  MessageSquare, Mail, Smartphone, Bell, AlertCircle
} from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { fmtDate } from '../../utils/formatDate'
import { noticesApi } from '../../services/communication'
import { extractItems } from '../../utils/apiHelpers'

export default function CommOverview() {
  const [noticeStats, setNoticeStats] = useState(null)
  const [recentNotices, setRecentNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [statsRes, listRes] = await Promise.all([
          noticesApi.stats().catch(() => null),
          noticesApi.list({ per_page: 5, sort_by: 'created_at', sort_dir: 'desc' }),
        ])
        setNoticeStats(statsRes?.data?.stats || statsRes?.data || null)
        setRecentNotices(extractItems(listRes))
      } catch (err) {
        setError(err.message || 'Failed to load overview')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const stats = [
    { label: 'Total Notices', value: loading ? '…' : String(noticeStats?.total ?? 0), icon: Bell, color: 'orange' },
    { label: 'Published', value: loading ? '…' : String(noticeStats?.published ?? 0), icon: MessageSquare, color: 'blue' },
    { label: 'Drafts', value: loading ? '…' : String(noticeStats?.draft ?? 0), icon: Mail, color: 'green' },
    { label: 'Archived', value: loading ? '…' : String(noticeStats?.archived ?? 0), icon: Smartphone, color: 'purple' },
  ]

  return (
    <>
      {error && (
        <div className="hr-error-banner">
          <AlertCircle size={16} /><span>{error}</span>
          <button onClick={() => setError('')} className="hr-error-dismiss">&times;</button>
        </div>
      )}

      <div className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div className={`stat-card ${stat.color} animate-in`} key={stat.label}>
              <div className="stat-top">
                <div className={`stat-icon ${stat.color}`}><Icon size={22} /></div>
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          )
        })}
      </div>

      <div className="card animate-in">
        <div className="card-header">
          <h3>Recent Notices</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Title</th><th>Priority</th><th>Read</th><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '16px auto' }} /></td></tr>
                ) : recentNotices.length === 0 ? (
                  <tr><td colSpan={5} className="hr-empty-cell">No notices yet</td></tr>
                ) : recentNotices.map((n) => (
                  <tr key={n.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{n.title}</td>
                    <td><span className={`card-badge ${n.priority === 'critical' ? 'red' : n.priority === 'important' ? 'orange' : 'green'}`}>{capitalize(n.priority)}</span></td>
                    <td>{n.read_count ?? 0}</td>
                    <td style={{ fontSize: 12 }}>{fmtDate(n.publish_date || n.created_at)}</td>
                    <td>
                      <span className={`status-badge ${n.status === 'published' ? 'active' : 'pending'}`}>
                        <span className="status-dot" />{capitalize(n.status)}
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
