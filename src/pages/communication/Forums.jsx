import { useState, useEffect, useCallback } from 'react'
import { Plus, Send, AlertCircle, ArrowLeft, MessageSquare, Trash2, Pencil, Hash, ChevronDown } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { fmtDate } from '../../utils/formatDate'
import { forumsApi } from '../../services/communication'
import { departmentsApi } from '../../services/hr'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { usePolling } from '../../hooks/usePolling'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Avatar from '../../components/Avatar'
import Pagination from '../../components/Pagination'

export default function Forums() {
  const { user, can } = useAuth()
  const [forums, setForums] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /* Forum detail view */
  const [activeForum, setActiveForum] = useState(null)
  const [messages, setMessages] = useState([])
  const [msgMeta, setMsgMeta] = useState(null)
  const [msgPage, setMsgPage] = useState(1)
  const [msgLoading, setMsgLoading] = useState(false)
  const [newPost, setNewPost] = useState('')
  const [posting, setPosting] = useState(false)

  /* Replies */
  const [expandedMsg, setExpandedMsg] = useState(null)
  const [msgReplies, setMsgReplies] = useState([])
  const [repliesLoading, setRepliesLoading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replySending, setReplySending] = useState(false)

  /* Create forum (admin) */
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '', type: 'general', department_id: '' })
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [departments, setDepartments] = useState([])

  /* Load forums */
  const loadForums = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await forumsApi.list()
      setForums(res?.data?.forums || extractItems(res))
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [])
  useEffect(() => { loadForums() }, [loadForums])

  /* Load forum messages */
  const loadMessages = useCallback(async (forumId, pg) => {
    setMsgLoading(true)
    try {
      const res = await forumsApi.listMessages(forumId, { page: pg, per_page: 20 })
      const data = res?.data || res
      setMessages(data?.messages || extractItems(res))
      setMsgMeta(data?.meta || extractMeta(res))
    } catch (e) { setError(e.message) } finally { setMsgLoading(false) }
  }, [])

  function openForum(forum) {
    setActiveForum(forum); setMsgPage(1); setExpandedMsg(null)
    loadMessages(forum.id, 1)
  }

  useEffect(() => {
    if (activeForum) loadMessages(activeForum.id, msgPage)
  }, [msgPage]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Near real-time refresh ──
     While viewing a forum, silently re-fetch its posts (and the open reply
     thread) every few seconds so new messages appear without a manual refresh.
     No spinner is toggled, so it never disrupts reading or typing. */
  usePolling(async () => {
    if (!activeForum) return
    try {
      const res = await forumsApi.listMessages(activeForum.id, { page: msgPage, per_page: 20 })
      const data = res?.data || res
      setMessages(data?.messages || extractItems(res))
      setMsgMeta(data?.meta || extractMeta(res))
    } catch { /* silent */ }
    if (expandedMsg) {
      try {
        const res = await forumsApi.listReplies(activeForum.id, expandedMsg)
        const data = res?.data || res
        setMsgReplies(data?.replies || data?.messages || extractItems(res))
      } catch { /* silent */ }
    }
  }, 8000)

  /* Post new message */
  async function handlePost(e) {
    e.preventDefault()
    if (!newPost.trim()) return
    setPosting(true)
    try {
      await forumsApi.postMessage(activeForum.id, { body: newPost })
      setNewPost(''); loadMessages(activeForum.id, msgPage)
    } catch (err) { setError(err.message) } finally { setPosting(false) }
  }

  /* Expand replies */
  async function toggleReplies(msgId) {
    if (expandedMsg === msgId) { setExpandedMsg(null); return }
    setExpandedMsg(msgId); setRepliesLoading(true); setMsgReplies([])
    try {
      const res = await forumsApi.listReplies(activeForum.id, msgId)
      const data = res?.data || res
      setMsgReplies(data?.replies || data?.messages || extractItems(res))
    } catch (e) { setError(e.message) } finally { setRepliesLoading(false) }
  }

  async function sendReply(e, msgId) {
    e.preventDefault()
    if (!replyText.trim()) return
    setReplySending(true)
    try {
      await forumsApi.postMessage(activeForum.id, { body: replyText, reply_to_id: msgId })
      setReplyText(''); toggleReplies(msgId)
    } catch (err) { setError(err.message) } finally { setReplySending(false) }
  }

  async function deleteMsg(msgId) {
    try { await forumsApi.deleteMessage(activeForum.id, msgId); loadMessages(activeForum.id, msgPage) } catch (e) { setError(e.message) }
  }

  /* Create forum */
  function openCreate() {
    setCreateForm({ name: '', description: '', type: 'general', department_id: '' }); setCreateOpen(true)
    if (!departments.length) departmentsApi.list({ per_page: 0 }).then((r) => setDepartments(extractItems(r))).catch(() => {})
  }
  async function handleCreate(e) {
    e.preventDefault(); setCreateSubmitting(true)
    try {
      const payload = { ...createForm }
      if (payload.type !== 'department') delete payload.department_id
      await forumsApi.create(payload)
      setCreateOpen(false); loadForums()
    } catch (err) { setError(err.message) } finally { setCreateSubmitting(false) }
  }

  /* ── Forum detail view ── */
  if (activeForum) {
    return (
      <>
        {error && <div className="hr-error-banner"><AlertCircle size={16} /><span>{error}</span><button onClick={() => setError('')} className="hr-error-dismiss">&times;</button></div>}
        <div className="card animate-in">
          <div className="card-header comm-detail-header">
            <button className="hr-btn-secondary comm-back-btn" onClick={() => setActiveForum(null)}><ArrowLeft size={14} /> Back</button>
            <div className="comm-detail-title">
              <h3>{activeForum.name}</h3>
              {activeForum.description && <p className="comm-detail-desc">{activeForum.description}</p>}
            </div>
            <span className="card-badge blue comm-detail-count">{activeForum.message_count ?? messages.length} posts</span>
          </div>
          <div className="card-body">
            {/* New post */}
            {can('communication.forums.create') && (
              <form onSubmit={handlePost} className="comm-composer">
                <Avatar name={user?.name} size="md" />
                <div className="comm-composer-main">
                  <textarea className="comm-composer-input" value={newPost} onChange={(e) => setNewPost(e.target.value)} rows={2} placeholder="Start a new discussion…" />
                  <div className="comm-composer-actions">
                    <button className="hr-btn-primary" type="submit" disabled={posting || !newPost.trim()}>
                      <Send size={14} /> {posting ? '…' : 'Post'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {msgLoading ? (
              <div className="comm-loading"><div className="auth-spinner large" /></div>
            ) : messages.length === 0 ? (
              <div className="comm-empty">
                <MessageSquare size={28} />
                <p>No posts yet. Be the first!</p>
              </div>
            ) : (
              <div className="comm-post-list">
                {messages.map((m) => {
                  const replyCount = m.reply_count ?? 0
                  const open = expandedMsg === m.id
                  return (
                  <div key={m.id} className="comm-post">
                    <Avatar name={m.user_name} size="md" />
                    <div className="comm-post-main">
                      <div className="comm-post-head">
                        <strong className="comm-post-author">{m.user_name}</strong>
                        <div className="comm-post-meta">
                          <span className="comm-time">{fmtDate(m.created_at)}</span>
                          {(m.user_id === user?.id || can('communication.forums.manage')) && (
                            <button className="hr-action-btn danger comm-icon-btn" onClick={() => deleteMsg(m.id)} title="Delete"><Trash2 size={13} /></button>
                          )}
                        </div>
                      </div>
                      <p className="comm-post-body">{m.body}</p>
                      <button className={`comm-replies-toggle${open ? ' open' : ''}`} onClick={() => toggleReplies(m.id)}>
                        <MessageSquare size={13} /> {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                        <ChevronDown size={14} className="comm-chevron" />
                      </button>

                      {open && (
                        <div className="comm-thread">
                          {repliesLoading ? (
                            <div className="comm-loading sm"><div className="auth-spinner" /></div>
                          ) : (
                            msgReplies.map((r) => (
                              <div key={r.id} className="comm-reply">
                                <Avatar name={r.user_name} size="sm" />
                                <div className="comm-reply-main">
                                  <div className="comm-reply-head">
                                    <strong className="comm-reply-author">{r.user_name}</strong>
                                    <span className="comm-time">{fmtDate(r.created_at)}</span>
                                  </div>
                                  <p className="comm-reply-body">{r.body}</p>
                                </div>
                              </div>
                            ))
                          )}
                          {can('communication.forums.create') && (
                            <form onSubmit={(e) => sendReply(e, m.id)} className="comm-reply-form">
                              <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a reply…" className="comm-reply-input" />
                              <button className="hr-btn-primary comm-reply-send" type="submit" disabled={replySending || !replyText.trim()} title="Send reply">
                                <Send size={14} />
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            )}
            {msgMeta && <Pagination meta={msgMeta} onPageChange={setMsgPage} />}
          </div>
        </div>
      </>
    )
  }

  /* ── Forum list ── */
  return (
    <>
      {error && <div className="hr-error-banner"><AlertCircle size={16} /><span>{error}</span><button onClick={() => setError('')} className="hr-error-dismiss">&times;</button></div>}

      <div className="card animate-in">
        <div className="card-header">
          <h3>Forums</h3>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <span className="card-badge blue">{forums.length} forums</span>
            {can('communication.forums.manage') && (
              <button className="hr-btn-primary" onClick={openCreate} style={{ padding: '6px 12px', fontSize: 12 }}><Plus size={14} /> New Forum</button>
            )}
          </div>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="comm-loading"><div className="auth-spinner large" /></div>
          ) : forums.length === 0 ? (
            <div className="comm-empty">
              <MessageSquare size={28} />
              <p>No forums found.</p>
            </div>
          ) : (
            <div className="comm-forum-grid">
              {forums.map((f) => {
                const isGeneral = f.type === 'general'
                return (
                  <button key={f.id} type="button" className="comm-forum-card" onClick={() => openForum(f)}>
                    <span className={`comm-forum-icon ${isGeneral ? 'blue' : 'green'}`}>
                      {isGeneral ? <MessageSquare size={20} /> : <Hash size={20} />}
                    </span>
                    <span className="comm-forum-body">
                      <span className="comm-forum-name">{f.name}</span>
                      {f.description && <span className="comm-forum-desc">{f.description}</span>}
                      <span className="comm-forum-footer">
                        <span className={`card-badge ${isGeneral ? 'blue' : 'green'}`}>{capitalize(f.type)}</span>
                        <span className="comm-forum-stat"><MessageSquare size={12} /> {f.message_count ?? 0} posts</span>
                        <span className="comm-forum-stat comm-forum-date">{f.last_activity_at ? fmtDate(f.last_activity_at) : 'No activity'}</span>
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Forum Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Forum" size="sm">
        <form onSubmit={handleCreate} className="hr-form">
          <div className="hr-form-field">
            <label>Name *</label>
            <input type="text" value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} required placeholder="Forum name" />
          </div>
          <div className="hr-form-field">
            <label>Description</label>
            <textarea value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} rows={2} />
          </div>
          <div className="hr-form-field">
            <label>Type *</label>
            <select value={createForm.type} onChange={(e) => setCreateForm((p) => ({ ...p, type: e.target.value }))}>
              <option value="general">General</option>
              <option value="department">Department</option>
            </select>
          </div>
          {createForm.type === 'department' && (
            <div className="hr-form-field">
              <label>Department *</label>
              <select value={createForm.department_id} onChange={(e) => setCreateForm((p) => ({ ...p, department_id: e.target.value }))} required>
                <option value="">— Select —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={createSubmitting}>{createSubmitting ? 'Creating…' : 'Create Forum'}</button>
          </div>
        </form>
      </Modal>
    </>
  )
}
