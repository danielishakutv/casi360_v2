import { useState, useEffect } from 'react'
import { Search, BookOpen, Send, AlertCircle } from 'lucide-react'
import { helpApi } from '../services/projects'
import { extractItems } from '../utils/apiHelpers'
import { useDebounce } from '../hooks/useDebounce'

const PRIORITIES = ['low', 'medium', 'high']

export default function HelpCenter() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [expandedId, setExpandedId] = useState(null)

  // Ticket form
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState('medium')
  const [submitting, setSubmitting] = useState(false)
  const [ticketMsg, setTicketMsg] = useState('')

  useEffect(() => {
    setLoading(true)
    helpApi.listArticles({ search: debouncedSearch || undefined })
      .then((res) => setArticles(extractItems(res)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [debouncedSearch])

  async function submitTicket(e) {
    e.preventDefault()
    setSubmitting(true)
    setTicketMsg('')
    try {
      await helpApi.submitTicket({ subject, message, priority })
      setTicketMsg('Ticket submitted successfully. Our team will respond soon.')
      setSubject(''); setMessage(''); setPriority('medium')
    } catch { setTicketMsg('Failed to submit ticket. Please try again.') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="animate-in">
      {/* Search */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="hr-toolbar">
          <div className="hr-toolbar-left" style={{ flex: 1 }}>
            <div className="search-box" style={{ maxWidth: 480 }}>
              <Search size={16} className="search-icon" />
              <input type="text" placeholder="Search help articles…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Articles */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><h3><BookOpen size={18} /> Knowledge Base</h3></div>
        <div className="card-body" style={{ padding: '0 16px 16px' }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Loading articles…</div>
          ) : articles.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No articles found</div>
          ) : articles.map((a) => (
            <div key={a.id} style={{ borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
              <button
                type="button"
                onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', padding: 0 }}
              >
                <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 14 }}>{a.title}</div>
                {a.category && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.category}</span>}
              </button>
              {expandedId === a.id && (
                <div style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {a.body || a.content || 'No content available.'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ticket Form */}
      <div className="card">
        <div className="card-header"><h3><Send size={18} /> Submit a Support Ticket</h3></div>
        <div className="card-body" style={{ padding: '0 16px 16px' }}>
          {ticketMsg && (
            <div className="hr-error-banner" style={{ margin: '0 0 12px', display: 'flex', gap: 8, alignItems: 'center', color: ticketMsg.includes('success') ? 'var(--success)' : 'var(--danger)' }}>
              <AlertCircle size={16} /> {ticketMsg}
            </div>
          )}
          <form onSubmit={submitTicket} className="hr-form">
            <div className="hr-form-row">
              <div className="hr-form-field"><label>Subject *</label><input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required placeholder="Brief description of your issue" /></div>
              <div className="hr-form-field"><label>Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="hr-form-field"><label>Message *</label><textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={5} placeholder="Describe your issue in detail…" /></div>
            <div className="hr-form-actions">
              <button type="submit" className="hr-btn-primary" disabled={submitting}><Send size={14} /> {submitting ? 'Submitting…' : 'Submit Ticket'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
