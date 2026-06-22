import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Trash2, Send, AlertCircle, ArrowLeft, Inbox, SendHorizontal, MailOpen } from 'lucide-react'
import { fmtDateTime } from '../../utils/formatDate'
import { messagesApi } from '../../services/communication'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { usePolling } from '../../hooks/usePolling'
import { useAuth } from '../../contexts/AuthContext'
import { renderRichText } from '../../utils/richText'
import Avatar from '../../components/Avatar'
import Pagination from '../../components/Pagination'
import FormatToolbar from '../../components/FormatToolbar'

const PER_PAGE = 20

export default function Messages() {
  const { user, can } = useAuth()
  const navigate = useNavigate()
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

  /* Chat scroll panel — autoscroll to newest, but never yank a reader. */
  const chatRef = useRef(null)
  const replyRef = useRef(null)
  const scrollToBottom = () => {
    const el = chatRef.current
    if (el) el.scrollTop = el.scrollHeight
  }
  const nearBottom = () => {
    const el = chatRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

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

  /* Autoscroll the chat panel to the newest message after the thread/replies
     change. On the silent poll we only scroll when the user is already near the
     bottom (see usePolling below) so it never disrupts someone reading older
     posts. */
  useEffect(() => {
    if (thread) requestAnimationFrame(scrollToBottom)
  }, [thread?.id, replies.length]) // eslint-disable-line react-hooks/exhaustive-deps

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
        const stick = nearBottom()
        const res = await messagesApi.thread(thread.id)
        const data = res?.data || res
        if (data?.replies) {
          setReplies(data.replies)
          if (stick) requestAnimationFrame(scrollToBottom)
        }
      } catch { /* silent */ }
    } else {
      await pollList()
    }
  }, 5000)

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
                <div className="comm-chat comm-chat-scroll" ref={chatRef}>
                  {/* Original message (oldest — top) */}
                  {(() => {
                    const mine = thread.sender_name === user?.name
                    return (
                      <div className={`comm-bubble-row${mine ? ' mine' : ''}`}>
                        {!mine && <Avatar name={thread.sender_name} size="sm" />}
                        <div className="comm-bubble">
                          <div className="comm-bubble-head">
                            <strong className="comm-bubble-author">{thread.sender_name}</strong>
                            <span className="comm-time">{fmtDateTime(thread.created_at)}</span>
                          </div>
                          <p className="comm-bubble-body">{renderRichText(thread.body)}</p>
                        </div>
                        {mine && <Avatar name={thread.sender_name} size="sm" />}
                      </div>
                    )
                  })()}
                  {/* Replies (chronological — newest at bottom) */}
                  {replies.map((r) => {
                    const mine = r.sender_name === user?.name
                    return (
                      <div key={r.id} className={`comm-bubble-row${mine ? ' mine' : ''}`}>
                        {!mine && <Avatar name={r.sender_name} size="sm" />}
                        <div className="comm-bubble">
                          <div className="comm-bubble-head">
                            <strong className="comm-bubble-author">{r.sender_name}</strong>
                            <span className="comm-time">{fmtDateTime(r.created_at)}</span>
                          </div>
                          <p className="comm-bubble-body">{renderRichText(r.body)}</p>
                        </div>
                        {mine && <Avatar name={r.sender_name} size="sm" />}
                      </div>
                    )
                  })}
                </div>
                {/* Reply composer (pinned at bottom) */}
                {can('communication.messages.create') && (
                  <form onSubmit={sendReply} className="comm-composer comm-thread-composer">
                    <Avatar name={user?.name} size="md" />
                    <div className="comm-composer-main">
                      <div className="comm-composer-box">
                        <FormatToolbar targetRef={replyRef} value={replyText} onChange={setReplyText} compact />
                        <textarea ref={replyRef} className="comm-composer-input comm-composer-input-flush" value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2} placeholder="Type a reply…" />
                      </div>
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
              <button className="hr-btn-primary" onClick={() => navigate('/communication/messages/new')}><Plus size={16} /> Compose</button>
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
            // Always show the OTHER participant, so a thread you started that
            // now has a reply doesn't show your own name in the Inbox.
            const who = m.sender_id === user?.id ? m.recipient_name : m.sender_name
            const unread = box === 'inbox' && ((m.unread_replies ?? 0) > 0 || (!m.is_read && m.recipient_id === user?.id))
            return (
              <button key={m.id} type="button" className={`comm-msg-row${unread ? ' unread' : ''}`} onClick={() => openThread(m)}>
                {unread && <span className="comm-unread-dot" aria-label="Unread" />}
                <Avatar name={who} size="sm" />
                <span className="comm-msg-main">
                  <span className="comm-msg-name">{who}</span>
                  <span className="comm-msg-subject">{m.subject || '(No subject)'}</span>
                </span>
                {(m.reply_count ?? 0) > 0 && <span className="comm-msg-chip">{m.reply_count}</span>}
                <span className="comm-msg-date">{fmtDateTime(m.latest_reply_at || m.created_at)}</span>
              </button>
            )
          })}
        </div>
        {meta && <Pagination meta={meta} onPageChange={setPage} />}
      </div>
    </>
  )
}
