import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Trash2, Send, AlertCircle, ArrowLeft, Inbox, SendHorizontal } from 'lucide-react'
import { fmtDate } from '../../utils/formatDate'
import { messagesApi } from '../../services/communication'
import { usersApi } from '../../services/api'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const PER_PAGE = 20

export default function Messages() {
  const { user, can } = useAuth()
  const [box, setBox] = useState('inbox')
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [page, setPage] = useState(1)
  const [unreadCount, setUnreadCount] = useState(0)

  /* Thread view */
  const [thread, setThread] = useState(null)
  const [replies, setReplies] = useState([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replySending, setReplySending] = useState(false)

  /* Compose */
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeForm, setComposeForm] = useState({ recipient_id: '', subject: '', body: '' })
  const [composeSending, setComposeSending] = useState(false)
  const [composeErrors, setComposeErrors] = useState(null)
  const [staffList, setStaffList] = useState([])

  /* Fetch messages */
  const fetchList = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await messagesApi.list({ box, search: debouncedSearch || undefined, page, per_page: PER_PAGE })
      const data = res?.data || res
      setItems(data?.messages || extractItems(res))
      setMeta(data?.meta || extractMeta(res))
      if (data?.unread_count != null) setUnreadCount(data.unread_count)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [box, debouncedSearch, page])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch, box])

  useEffect(() => {
    messagesApi.unreadCount().then((r) => setUnreadCount(r?.data?.unread_count ?? 0)).catch(() => {})
  }, [])

  /* Open thread */
  async function openThread(msg) {
    setThreadLoading(true); setThread(msg); setReplies([]); setReplyText('')
    try {
      const res = await messagesApi.thread(msg.id)
      const data = res?.data || res
      setThread(data?.thread || msg)
      setReplies(data?.replies || [])
      // Opening marks as read, decrement unread
      if (!msg.is_read) setUnreadCount((n) => Math.max(0, n - 1))
    } catch (e) { setError(e.message) } finally { setThreadLoading(false) }
  }

  async function sendReply(e) {
    e.preventDefault()
    if (!replyText.trim()) return
    setReplySending(true)
    try {
      await messagesApi.send({ thread_id: thread.id, recipient_id: box === 'inbox' ? thread.sender_id : thread.recipient_id, body: replyText })
      setReplyText('')
      openThread(thread)
    } catch (err) { setError(err.message) } finally { setReplySending(false) }
  }

  async function deleteMessage(id) {
    try { await messagesApi.delete(id); setThread(null); fetchList() } catch (e) { setError(e.message) }
  }

  /* Compose */
  function openCompose() {
    setComposeForm({ recipient_id: '', subject: '', body: '' }); setComposeErrors(null); setComposeOpen(true)
    if (!staffList.length) {
      usersApi.list({ per_page: 0 }).then((r) => setStaffList(extractItems(r))).catch(() => {})
    }
  }
  async function handleCompose(e) {
    e.preventDefault(); setComposeSending(true); setComposeErrors(null)
    try {
      await messagesApi.send(composeForm)
      setComposeOpen(false); fetchList()
    } catch (err) {
      if (err.status === 422 && err.errors) setComposeErrors(err.errors)
      else setComposeErrors({ general: [err.message] })
    } finally { setComposeSending(false) }
  }

  /* ─── Thread view ─── */
  if (thread) {
    return (
      <>
        {error && <div className="hr-error-banner"><AlertCircle size={16} /><span>{error}</span><button onClick={() => setError('')} className="hr-error-dismiss">&times;</button></div>}
        <div className="card animate-in">
          <div className="card-header">
            <button className="hr-btn-secondary" onClick={() => { setThread(null); fetchList() }} style={{ marginRight: 12 }}><ArrowLeft size={14} /> Back</button>
            <h3 style={{ flex: 1 }}>{thread.subject || '(No subject)'}</h3>
            <button className="hr-action-btn danger" onClick={() => deleteMessage(thread.id)} title="Delete"><Trash2 size={15} /></button>
          </div>
          <div className="card-body">
            {threadLoading ? (
              <div style={{ padding: 24, textAlign: 'center' }}><div className="auth-spinner large" /></div>
            ) : (
              <>
                {/* Original message */}
                <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong>{thread.sender_name}</strong>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(thread.created_at)}</span>
                  </div>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{thread.body}</p>
                </div>
                {/* Replies */}
                {replies.map((r) => (
                  <div key={r.id} style={{ padding: 12, borderBottom: '1px solid var(--border)', background: r.sender_name === user?.name ? 'var(--bg-secondary)' : 'transparent' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <strong>{r.sender_name}</strong>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(r.created_at)}</span>
                    </div>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{r.body}</p>
                  </div>
                ))}
                {/* Reply input */}
                {can('communication.messages.create') && (
                  <form onSubmit={sendReply} style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'flex-end' }}>
                    <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2} placeholder="Type a reply…" style={{ flex: 1, resize: 'vertical' }} />
                    <button className="hr-btn-primary" type="submit" disabled={replySending || !replyText.trim()} style={{ height: 40 }}>
                      <Send size={14} /> {replySending ? '…' : 'Send'}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </>
    )
  }

  /* ─── Inbox / Sent list ─── */
  return (
    <>
      {error && <div className="hr-error-banner"><AlertCircle size={16} /><span>{error}</span><button onClick={() => setError('')} className="hr-error-dismiss">&times;</button></div>}

      <div className="card animate-in">
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <button className={`hr-action-btn${box === 'inbox' ? ' primary' : ''}`} onClick={() => setBox('inbox')} style={{ borderBottom: box === 'inbox' ? '2px solid var(--primary)' : 'none' }}>
              <Inbox size={14} /> Inbox {unreadCount > 0 && <span className="card-badge blue" style={{ marginLeft: 4 }}>{unreadCount}</span>}
            </button>
            <button className={`hr-action-btn${box === 'sent' ? ' primary' : ''}`} onClick={() => setBox('sent')} style={{ borderBottom: box === 'sent' ? '2px solid var(--primary)' : 'none' }}>
              <SendHorizontal size={14} /> Sent
            </button>
            <div className="search-box" style={{ marginLeft: 12 }}><Search size={16} className="search-icon" /><input type="text" placeholder="Search messages…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          </div>
          <div className="hr-toolbar-right">
            {can('communication.messages.create') && (
              <button className="hr-btn-primary" onClick={openCompose}><Plus size={16} /> Compose</button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>{box === 'inbox' ? 'From' : 'To'}</th><th>Subject</th><th>Replies</th><th>Date</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '20px auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={4} className="hr-empty-cell">No messages</td></tr>
              ) : items.map((m) => (
                <tr key={m.id} onClick={() => openThread(m)} style={{ cursor: 'pointer', fontWeight: !m.is_read && box === 'inbox' ? 700 : 400 }}>
                  <td style={{ color: 'var(--text-secondary)' }}>{box === 'inbox' ? m.sender_name : m.recipient_name}</td>
                  <td>{m.subject || '(No subject)'}</td>
                  <td><span className="card-badge blue">{m.reply_count ?? 0}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(m.latest_reply_at || m.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta && <Pagination meta={meta} onPageChange={setPage} />}
      </div>

      {/* ─── Compose ─── */}
      <Modal open={composeOpen} onClose={() => setComposeOpen(false)} title="New Message" size="md">
        <form onSubmit={handleCompose} className="hr-form">
          {composeErrors && (
            <div className="hr-error-banner" style={{ marginBottom: 12 }}>
              <AlertCircle size={16} />
              <span>{composeErrors.general ? composeErrors.general[0] : 'Please fix the errors below.'}</span>
            </div>
          )}
          <div className="hr-form-field">
            <label>To *</label>
            <select value={composeForm.recipient_id} onChange={(e) => setComposeForm((p) => ({ ...p, recipient_id: e.target.value }))} required>
              <option value="">— Select recipient —</option>
              {staffList.filter((s) => s.id !== user?.id).map((s) => <option key={s.id} value={s.id}>{s.name || `${s.first_name} ${s.last_name}`}</option>)}
            </select>
          </div>
          <div className="hr-form-field">
            <label>Subject *</label>
            <input type="text" value={composeForm.subject} onChange={(e) => setComposeForm((p) => ({ ...p, subject: e.target.value }))} required placeholder="Message subject" />
          </div>
          <div className="hr-form-field">
            <label>Message *</label>
            <textarea value={composeForm.body} onChange={(e) => setComposeForm((p) => ({ ...p, body: e.target.value }))} required rows={6} placeholder="Type your message…" />
          </div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={() => setComposeOpen(false)}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={composeSending}><Send size={14} /> {composeSending ? 'Sending…' : 'Send Message'}</button>
          </div>
        </form>
      </Modal>
    </>
  )
}
