import { useState, useEffect, useCallback } from 'react'
import { Plus, Send, AlertCircle, ArrowLeft, MessageSquare, Trash2, Pencil } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { fmtDate } from '../../utils/formatDate'
import { forumsApi } from '../../services/communication'
import { departmentsApi } from '../../services/hr'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
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
          <div className="card-header">
            <button className="hr-btn-secondary" onClick={() => setActiveForum(null)} style={{ marginRight: 12 }}><ArrowLeft size={14} /> Back</button>
            <div>
              <h3>{activeForum.name}</h3>
              {activeForum.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{activeForum.description}</p>}
            </div>
            <span className="card-badge blue" style={{ marginLeft: 'auto' }}>{activeForum.message_count ?? messages.length} posts</span>
          </div>
          <div className="card-body">
            {/* New post */}
            {can('communication.forums.create') && (
              <form onSubmit={handlePost} style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'flex-end' }}>
                <textarea value={newPost} onChange={(e) => setNewPost(e.target.value)} rows={2} placeholder="Start a new discussion…" style={{ flex: 1, resize: 'vertical' }} />
                <button className="hr-btn-primary" type="submit" disabled={posting || !newPost.trim()} style={{ height: 42 }}>
                  <Send size={14} /> {posting ? '…' : 'Post'}
                </button>
              </form>
            )}

            {msgLoading ? (
              <div style={{ padding: 24, textAlign: 'center' }}><div className="auth-spinner large" /></div>
            ) : messages.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No posts yet. Be the first!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {messages.map((m) => (
                  <div key={m.id} style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <strong style={{ fontSize: 13 }}>{m.user_name}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(m.created_at)}</span>
                        {(m.user_id === user?.id || can('communication.forums.manage')) && (
                          <button className="hr-action-btn danger" onClick={() => deleteMsg(m.id)} title="Delete" style={{ padding: 2 }}><Trash2 size={13} /></button>
                        )}
                      </div>
                    </div>
                    <p style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{m.body}</p>
                    <button className="hr-action-btn" onClick={() => toggleReplies(m.id)} style={{ marginTop: 6, fontSize: 12 }}>
                      <MessageSquare size={12} /> {m.reply_count ?? 0} {(m.reply_count ?? 0) === 1 ? 'reply' : 'replies'}
                    </button>

                    {expandedMsg === m.id && (
                      <div style={{ marginTop: 8, paddingLeft: 16, borderLeft: '2px solid var(--border)' }}>
                        {repliesLoading ? (
                          <div style={{ padding: 8 }}><div className="auth-spinner" /></div>
                        ) : (
                          msgReplies.map((r) => (
                            <div key={r.id} style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <strong style={{ fontSize: 12 }}>{r.user_name}</strong>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(r.created_at)}</span>
                              </div>
                              <p style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{r.body}</p>
                            </div>
                          ))
                        )}
                        {can('communication.forums.create') && (
                          <form onSubmit={(e) => sendReply(e, m.id)} style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a reply…" style={{ flex: 1, fontSize: 13 }} />
                            <button className="hr-btn-primary" type="submit" disabled={replySending || !replyText.trim()} style={{ padding: '4px 10px', fontSize: 12 }}>
                              <Send size={12} />
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                ))}
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
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center' }}><div className="auth-spinner large" /></div>
          ) : forums.length === 0 ? (
            <p style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No forums found.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>Forum</th><th>Type</th><th>Posts</th><th>Last Activity</th><th>Status</th></tr></thead>
                <tbody>
                  {forums.map((f) => (
                    <tr key={f.id} onClick={() => openForum(f)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{f.name}</div>
                        {f.description && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.description}</div>}
                      </td>
                      <td><span className={`card-badge ${f.type === 'general' ? 'blue' : 'green'}`}>{capitalize(f.type)}</span></td>
                      <td style={{ fontWeight: 600 }}>{f.message_count ?? 0}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.last_activity_at ? fmtDate(f.last_activity_at) : '—'}</td>
                      <td><span className={`status-badge ${f.status}`}><span className="status-dot" />{capitalize(f.status || 'active')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
