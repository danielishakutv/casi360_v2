import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Trash2, Send, AlertCircle, ArrowLeft, Inbox, SendHorizontal, X, MailOpen } from 'lucide-react'
import { fmtDate } from '../../utils/formatDate'
import { messagesApi } from '../../services/communication'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { usePolling } from '../../hooks/usePolling'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Avatar from '../../components/Avatar'
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
  const [composeForm, setComposeForm] = useState({ recipient_ids: [], subject: '', body: '' })
  const [composeSending, setComposeSending] = useState(false)
  const [composeErrors, setComposeErrors] = useState(null)
  const [staffList, setStaffList] = useState([])
  const [recipientQuery, setRecipientQuery] = useState('')

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

  /* ── Near real-time refresh ──
     Silently re-fetch (no spinner) every few seconds while the tab is open.
     When a thread is open we refresh its replies; otherwise the list + unread
     badge. The communication read endpoints are uncached server-side so new
     messages appear within seconds without a manual page refresh. */
  const pollList = useCallback(async () => {
    try {
      const res = await messagesApi.list({ box, search: debouncedSearch || undefined, page, per_page: PER_PAGE })
      const data = res?.data || res
      setItems(data?.messages || extractItems(res))
      setMeta(data?.meta || extractMeta(res))
      if (data?.unread_count != null) setUnreadCount(data.unread_count)
      else messagesApi.unreadCount().then((r) => setUnreadCount(r?.data?.unread_count ?? 0)).catch(() => {})
    } catch { /* silent — keep showing the last good data */ }
  }, [box, debouncedSearch, page])

  usePolling(async () => {
    if (thread) {
      try {
        const res = await messagesApi.thread(thread.id)
        const data = res?.data || res
        if (data?.replies) setReplies(data.replies)
      } catch { /* silent */ }
    } else {
      await pollList()
    }
  }, 8000)

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
  const staffName = (s) => s?.name || [s?.first_name, s?.last_name].filter(Boolean).join(' ') || s?.email || 'Unknown'

  function openCompose() {
    setComposeForm({ recipient_ids: [], subject: '', body: '' }); setComposeErrors(null); setRecipientQuery(''); setComposeOpen(true)
    if (!staffList.length) {
      messagesApi.recipients().then((r) => setStaffList(extractItems(r))).catch(() => {})
    }
  }

  const addRecipient = (id) => {
    setComposeForm((p) => p.recipient_ids.includes(id) ? p : { ...p, recipient_ids: [...p.recipient_ids, id] })
    setRecipientQuery('')
  }
  const removeRecipient = (id) =>
    setComposeForm((p) => ({ ...p, recipient_ids: p.recipient_ids.filter((r) => r !== id) }))

  async function handleCompose(e) {
    e.preventDefault(); setComposeErrors(null)
    if (!composeForm.recipient_ids.length) {
      setComposeErrors({ general: ['Select at least one recipient.'] }); return
    }
    setComposeSending(true)
    try {
      // Backend sends to one recipient per request — fan out so a group
      // selection delivers an individual copy to each person.
      await Promise.all(composeForm.recipient_ids.map((rid) =>
        messagesApi.send({ recipient_id: rid, subject: composeForm.subject, body: composeForm.body })
      ))
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
        <div className="card animate-in comm-thread-card">
          <div className="card-header comm-detail-header">
            <button className="hr-btn-secondary comm-back-btn" onClick={() => { setThread(null); fetchList() }}><ArrowLeft size={14} /> Back</button>
            <h3 className="comm-detail-title-flex">{thread.subject || '(No subject)'}</h3>
            <button className="hr-action-btn danger" onClick={() => deleteMessage(thread.id)} title="Delete"><Trash2 size={15} /></button>
          </div>
          <div className="card-body comm-thread-body">
            {threadLoading ? (
              <div className="comm-loading"><div className="auth-spinner large" /></div>
            ) : (
              <>
                <div className="comm-chat">
                  {/* Original message */}
                  {(() => {
                    const mine = thread.sender_name === user?.name
                    return (
                      <div className={`comm-bubble-row${mine ? ' mine' : ''}`}>
                        {!mine && <Avatar name={thread.sender_name} size="sm" />}
                        <div className="comm-bubble">
                          <div className="comm-bubble-head">
                            <strong className="comm-bubble-author">{thread.sender_name}</strong>
                            <span className="comm-time">{fmtDate(thread.created_at)}</span>
                          </div>
                          <p className="comm-bubble-body">{thread.body}</p>
                        </div>
                        {mine && <Avatar name={thread.sender_name} size="sm" />}
                      </div>
                    )
                  })()}
                  {/* Replies */}
                  {replies.map((r) => {
                    const mine = r.sender_name === user?.name
                    return (
                      <div key={r.id} className={`comm-bubble-row${mine ? ' mine' : ''}`}>
                        {!mine && <Avatar name={r.sender_name} size="sm" />}
                        <div className="comm-bubble">
                          <div className="comm-bubble-head">
                            <strong className="comm-bubble-author">{r.sender_name}</strong>
                            <span className="comm-time">{fmtDate(r.created_at)}</span>
                          </div>
                          <p className="comm-bubble-body">{r.body}</p>
                        </div>
                        {mine && <Avatar name={r.sender_name} size="sm" />}
                      </div>
                    )
                  })}
                </div>
                {/* Reply input */}
                {can('communication.messages.create') && (
                  <form onSubmit={sendReply} className="comm-composer comm-thread-composer">
                    <Avatar name={user?.name} size="md" />
                    <div className="comm-composer-main">
                      <textarea className="comm-composer-input" value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2} placeholder="Type a reply…" />
                      <div className="comm-composer-actions">
                        <button className="hr-btn-primary" type="submit" disabled={replySending || !replyText.trim()}>
                          <Send size={14} /> {replySending ? '…' : 'Send'}
                        </button>
                      </div>
                    </div>
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
            <div className="comm-tabs">
              <button className={`comm-tab${box === 'inbox' ? ' active' : ''}`} onClick={() => setBox('inbox')}>
                <Inbox size={14} /> Inbox {unreadCount > 0 && <span className="comm-tab-badge">{unreadCount}</span>}
              </button>
              <button className={`comm-tab${box === 'sent' ? ' active' : ''}`} onClick={() => setBox('sent')}>
                <SendHorizontal size={14} /> Sent
              </button>
            </div>
            <div className="search-box"><Search size={16} className="search-icon" /><input type="text" placeholder="Search messages…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          </div>
          <div className="hr-toolbar-right">
            {can('communication.messages.create') && (
              <button className="hr-btn-primary" onClick={openCompose}><Plus size={16} /> Compose</button>
            )}
          </div>
        </div>

        <div className="comm-msg-list">
          {loading ? (
            <div className="comm-loading"><div className="auth-spinner large" /></div>
          ) : items.length === 0 ? (
            <div className="comm-empty">
              <MailOpen size={28} />
              <p>No messages</p>
            </div>
          ) : items.map((m) => {
            const who = box === 'inbox' ? m.sender_name : m.recipient_name
            const unread = !m.is_read && box === 'inbox'
            return (
              <button key={m.id} type="button" className={`comm-msg-row${unread ? ' unread' : ''}`} onClick={() => openThread(m)}>
                {unread && <span className="comm-unread-dot" aria-label="Unread" />}
                <Avatar name={who} size="sm" />
                <span className="comm-msg-main">
                  <span className="comm-msg-name">{who}</span>
                  <span className="comm-msg-subject">{m.subject || '(No subject)'}</span>
                </span>
                {(m.reply_count ?? 0) > 0 && <span className="comm-msg-chip">{m.reply_count}</span>}
                <span className="comm-msg-date">{fmtDate(m.latest_reply_at || m.created_at)}</span>
              </button>
            )
          })}
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
            {/* Selected recipients as removable chips */}
            {composeForm.recipient_ids.length > 0 && (
              <div className="comm-chips">
                {composeForm.recipient_ids.map((rid) => {
                  const s = staffList.find((x) => x.id === rid)
                  return (
                    <span key={rid} className="comm-chip">
                      <Avatar name={staffName(s)} size="sm" />
                      {staffName(s)}
                      <button type="button" onClick={() => removeRecipient(rid)} aria-label="Remove recipient" className="comm-chip-remove">
                        <X size={12} />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
            <input
              type="text"
              value={recipientQuery}
              onChange={(e) => setRecipientQuery(e.target.value)}
              placeholder="Search staff by name or email…"
            />
            {/* Always-visible scrollable candidate list */}
            <div className="comm-candidate-list">
              {(() => {
                const q = recipientQuery.trim().toLowerCase()
                const candidates = staffList
                  .filter((s) => s.id !== user?.id && !composeForm.recipient_ids.includes(s.id))
                  .filter((s) => !q || staffName(s).toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q))
                if (!staffList.length) return <div className="comm-candidate-empty">Loading staff…</div>
                if (!candidates.length) return <div className="comm-candidate-empty">No matching staff</div>
                return candidates.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => addRecipient(s.id)}
                    className="comm-candidate"
                  >
                    <Avatar name={staffName(s)} size="sm" />
                    <span className="comm-candidate-text">
                      <span className="comm-candidate-name">{staffName(s)}</span>
                      {s.email ? <span className="comm-candidate-email">{s.email}</span> : null}
                    </span>
                  </button>
                ))
              })()}
            </div>
            <span className="comm-field-hint">
              Select one or more recipients. Each person receives their own copy.
            </span>
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
