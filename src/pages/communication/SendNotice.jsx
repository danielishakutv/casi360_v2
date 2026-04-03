import { useState, useEffect, useCallback } from 'react'
import {
  Search, Plus, Eye, Pencil, Trash2, Bell, Users, Building2, Globe,
  AlertCircle, Pin, ArrowUpDown, X,
} from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { fmtDate } from '../../utils/formatDate'
import { noticesApi } from '../../services/communication'
import { departmentsApi } from '../../services/hr'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const PRIORITIES = ['normal', 'important', 'critical']
const STATUSES = ['draft', 'published', 'archived']
const ROLES = ['admin', 'manager', 'staff']
const PER_PAGE = 25

const PRIORITY_COLOR = { normal: 'green', important: 'orange', critical: 'red' }
const STATUS_MAP = { published: 'active', draft: 'pending', archived: 'inactive' }

function AudienceIcon({ type }) {
  if (type === 'department') return <Building2 size={13} />
  if (type === 'role') return <Users size={13} />
  return <Globe size={13} />
}

function audienceLabel(item) {
  if (!item.audiences || item.audiences.length === 0) return 'All'
  return item.audiences.map((a) => a.label || capitalize(a.audience_type)).join(', ')
}

const EMPTY_FORM = {
  title: '', body: '', priority: 'normal', status: 'published',
  is_pinned: false, publish_date: '', expiry_date: '',
  audiences: [{ audience_type: 'all', audience_id: '', audience_role: '' }],
}

export default function SendNotice() {
  const { can, user } = useAuth()
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin'

  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)

  const [departments, setDepartments] = useState([])

  /* Create / Edit */
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState(null)

  /* View detail */
  const [viewItem, setViewItem] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)

  /* Read receipts */
  const [readData, setReadData] = useState(null)
  const [readOpen, setReadOpen] = useState(false)
  const [readLoading, setReadLoading] = useState(false)

  /* Delete */
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  /* Load departments */
  useEffect(() => {
    departmentsApi.list({ per_page: 0 }).then((r) => setDepartments(extractItems(r))).catch(() => {})
  }, [])

  /* Fetch stats */
  const fetchStats = useCallback(async () => {
    try {
      const res = await noticesApi.stats()
      setStats(res?.data || res)
    } catch { /* ignore */ }
  }, [])

  /* Fetch list */
  const fetchList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await noticesApi.list({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
        page,
        per_page: PER_PAGE,
      })
      setItems(extractItems(res))
      setMeta(extractMeta(res))
    } catch (err) {
      setError(err.message || 'Failed to load notices')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, priorityFilter, sortBy, sortDir, page])

  useEffect(() => { fetchList(); fetchStats() }, [fetchList, fetchStats])
  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter, priorityFilter, sortBy, sortDir])

  /* Sort toggle */
  function toggleSort(key) {
    if (sortBy === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
  }

  function SortHeader({ col, label }) {
    const active = sortBy === col
    return (
      <th onClick={() => toggleSort(col)} style={{ cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {label}<ArrowUpDown size={12} style={{ opacity: active ? 1 : 0.3 }} />
        </span>
      </th>
    )
  }

  /* ─── View notice (full detail via API) ─── */
  async function openView(n) {
    setViewItem(n)
    setViewLoading(true)
    try {
      const res = await noticesApi.get(n.id)
      setViewItem(res?.data?.notice || res?.data || res)
    } catch { /* keep preview */ }
    finally { setViewLoading(false) }
  }

  /* ─── Read receipts ─── */
  async function openReads(n) {
    setReadOpen(true)
    setReadLoading(true)
    setReadData(null)
    try {
      const res = await noticesApi.reads(n.id)
      setReadData(res?.data || res)
    } catch { setReadData(null) }
    finally { setReadLoading(false) }
  }

  /* ─── Create / Edit ─── */
  function openCreate() {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setFormErrors(null)
    setFormOpen(true)
  }

  function openEdit(n) {
    setEditItem(n)
    setForm({
      title: n.title || '',
      body: n.body || '',
      priority: n.priority || 'normal',
      status: n.status || 'published',
      is_pinned: !!n.is_pinned,
      publish_date: n.publish_date || '',
      expiry_date: n.expiry_date || '',
      audiences: n.audiences && n.audiences.length
        ? n.audiences.map((a) => ({
            audience_type: a.audience_type || 'all',
            audience_id: a.audience_id || '',
            audience_role: a.audience_role || '',
          }))
        : [{ audience_type: 'all', audience_id: '', audience_role: '' }],
    })
    setFormErrors(null)
    setFormOpen(true)
  }

  function closeForm() { setFormOpen(false); setEditItem(null) }
  function updateField(f, v) { setForm((p) => ({ ...p, [f]: v })) }

  function updateAudience(idx, field, value) {
    setForm((p) => {
      const audiences = [...p.audiences]
      audiences[idx] = { ...audiences[idx], [field]: value }
      if (field === 'audience_type') {
        audiences[idx].audience_id = ''
        audiences[idx].audience_role = ''
      }
      return { ...p, audiences }
    })
  }

  function addAudience() {
    setForm((p) => ({
      ...p,
      audiences: [...p.audiences, { audience_type: 'all', audience_id: '', audience_role: '' }],
    }))
  }

  function removeAudience(idx) {
    setForm((p) => ({
      ...p,
      audiences: p.audiences.filter((_, i) => i !== idx),
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormErrors(null)
    try {
      const payload = {
        title: form.title,
        body: form.body,
        priority: form.priority,
        status: form.status,
        is_pinned: form.is_pinned,
        publish_date: form.publish_date || undefined,
        expiry_date: form.expiry_date || undefined,
        audiences: form.audiences.map((a) => {
          const entry = { audience_type: a.audience_type }
          if (a.audience_type === 'department') entry.audience_id = a.audience_id
          if (a.audience_type === 'role') entry.audience_role = a.audience_role
          return entry
        }),
      }
      if (editItem) await noticesApi.update(editItem.id, payload)
      else await noticesApi.create(payload)
      closeForm()
      fetchList()
      fetchStats()
    } catch (err) {
      if (err.status === 422 && err.errors) setFormErrors(err.errors)
      else setFormErrors({ general: [err.message || 'Failed to save notice'] })
    } finally {
      setSubmitting(false)
    }
  }

  /* Delete */
  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await noticesApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      fetchList()
      fetchStats()
    } catch (err) {
      setError(err.message || 'Failed to delete notice')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {error && (
        <div className="hr-error-banner">
          <AlertCircle size={16} /><span>{error}</span>
          <button onClick={() => setError('')} className="hr-error-dismiss">&times;</button>
        </div>
      )}

      {/* Stat cards */}
      {stats && (
        <div className="notice-stats animate-in">
          <div className="notice-stat-card"><div className="notice-stat-value">{stats.total ?? 0}</div><div className="notice-stat-label">Total</div></div>
          <div className="notice-stat-card"><div className="notice-stat-value">{stats.published ?? 0}</div><div className="notice-stat-label">Published</div></div>
          <div className="notice-stat-card"><div className="notice-stat-value">{stats.draft ?? 0}</div><div className="notice-stat-label">Drafts</div></div>
          <div className="notice-stat-card"><div className="notice-stat-value">{stats.archived ?? 0}</div><div className="notice-stat-label">Archived</div></div>
          <div className="notice-stat-card"><div className="notice-stat-value">{stats.pinned ?? 0}</div><div className="notice-stat-label">Pinned</div></div>
        </div>
      )}

      <div className="card animate-in">
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input type="text" placeholder="Search notices…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
            </select>
            <select className="hr-filter-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="">All Priority</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{capitalize(p)}</option>)}
            </select>
            {can('communication.notices.create') && (
              <button className="hr-btn-primary" onClick={openCreate}><Plus size={16} /> New Notice</button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 28 }}></th>
                <SortHeader col="title" label="Title" />
                <th>Audience</th>
                <SortHeader col="priority" label="Priority" />
                <th>Author</th>
                <SortHeader col="publish_date" label="Date" />
                <SortHeader col="status" label="Status" />
                <th>Read</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '20px auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="hr-empty-cell">No notices found</td></tr>
              ) : items.map((n) => (
                <tr key={n.id} className={n.is_read === false ? 'notice-unread-row' : ''}>
                  <td>{n.is_pinned ? <Pin size={14} style={{ color: 'var(--primary)' }} /> : null}</td>
                  <td>
                    <span style={{ fontWeight: n.is_read === false ? 700 : 600, color: 'var(--text-secondary)' }}>{n.title}</span>
                  </td>
                  <td>
                    <span className="comm-audience-badge">
                      <AudienceIcon type={n.audiences?.[0]?.audience_type} />
                      {audienceLabel(n)}
                    </span>
                  </td>
                  <td><span className={`card-badge ${PRIORITY_COLOR[n.priority] || 'green'}`}>{capitalize(n.priority)}</span></td>
                  <td style={{ fontSize: 12 }}>{n.author_name || '—'}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(n.publish_date || n.created_at)}</td>
                  <td><span className={`status-badge ${STATUS_MAP[n.status] || 'pending'}`}><span className="status-dot" />{capitalize(n.status)}</span></td>
                  <td style={{ fontSize: 12, cursor: isAdmin ? 'pointer' : 'default', color: isAdmin ? 'var(--primary)' : undefined }} onClick={() => isAdmin && openReads(n)}>{n.read_count ?? '—'}</td>
                  <td>
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => openView(n)} title="View"><Eye size={15} /></button>
                      {can('communication.notices.edit') && (
                        <button className="hr-action-btn" onClick={() => openEdit(n)} title="Edit"><Pencil size={15} /></button>
                      )}
                      {can('communication.notices.delete') && (
                        <button className="hr-action-btn danger" onClick={() => setDeleteTarget(n)} title="Delete"><Trash2 size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta && <Pagination meta={meta} onPageChange={setPage} />}
      </div>

      {/* ─── View Detail ─── */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Notice Details" size="md">
        {viewItem && (
          <div className="note-detail">
            <div className="note-detail-header">
              <h3>{viewItem.title}</h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                <span className={`card-badge ${PRIORITY_COLOR[viewItem.priority] || 'green'}`}>{capitalize(viewItem.priority)}</span>
                <span className={`status-badge ${STATUS_MAP[viewItem.status] || 'pending'}`}><span className="status-dot" />{capitalize(viewItem.status)}</span>
                {viewItem.is_pinned && <span className="card-badge blue">Pinned</span>}
              </div>
            </div>
            <div className="note-detail-meta">
              <span><strong>Author:</strong> {viewItem.author_name || '—'}</span>
              <span><strong>Published:</strong> {fmtDate(viewItem.publish_date || viewItem.created_at)}</span>
              {viewItem.expiry_date && <span><strong>Expires:</strong> {fmtDate(viewItem.expiry_date)}</span>}
              <span><strong>Read:</strong> {viewItem.read_count ?? 0}</span>
            </div>
            {viewItem.audiences && viewItem.audiences.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <strong style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>Audience</strong>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {viewItem.audiences.map((a, i) => (
                    <span key={i} className="comm-audience-badge">
                      <AudienceIcon type={a.audience_type} />
                      {a.label || capitalize(a.audience_type)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {viewLoading && <div style={{ padding: 12, textAlign: 'center' }}><div className="auth-spinner" /></div>}
            <div className="note-detail-content" style={{ whiteSpace: 'pre-wrap' }}>{viewItem.body}</div>
            <div className="hr-form-actions">
              {isAdmin && <button className="hr-btn-secondary" onClick={() => { openReads(viewItem) }}>Read Receipts</button>}
              <button className="hr-btn-secondary" onClick={() => setViewItem(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Read Receipts ─── */}
      <Modal open={readOpen} onClose={() => setReadOpen(false)} title="Read Receipts" size="md">
        {readLoading ? (
          <div style={{ padding: 24, textAlign: 'center' }}><div className="auth-spinner large" /></div>
        ) : readData ? (
          <div>
            <div style={{ marginBottom: 16 }}>
              <strong>{readData.title}</strong>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                {readData.total_reads ?? 0} of {readData.total_users ?? 0} users read ({readData.read_percentage ?? 0}%)
              </div>
              <div className="progress-track" style={{ marginTop: 8 }} role="progressbar" aria-valuenow={readData.read_percentage ?? 0} aria-valuemin={0} aria-valuemax={100}>
                <div className="progress-fill blue" style={{ width: `${readData.read_percentage ?? 0}%` }} />
              </div>
            </div>
            {readData.reads && readData.reads.length > 0 ? (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Read At</th></tr></thead>
                  <tbody>
                    {readData.reads.map((r) => (
                      <tr key={r.user_id}>
                        <td style={{ fontWeight: 600 }}>{r.user_name}</td>
                        <td style={{ fontSize: 12 }}>{fmtDate(r.read_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No one has read this notice yet.</p>}
          </div>
        ) : <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Failed to load read receipts.</p>}
      </Modal>

      {/* ─── Create / Edit Form ─── */}
      <Modal open={formOpen} onClose={closeForm} title={editItem ? 'Edit Notice' : 'Compose Notice'} size="lg">
        <form onSubmit={handleSubmit} className="hr-form">
          {formErrors && (
            <div className="hr-error-banner" style={{ marginBottom: 12 }}>
              <AlertCircle size={16} />
              <span>{formErrors.general ? formErrors.general[0] : 'Please fix the errors below.'}</span>
              <button type="button" onClick={() => setFormErrors(null)} className="hr-error-dismiss">&times;</button>
            </div>
          )}

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Title *</label>
              <input type="text" value={form.title} onChange={(e) => updateField('title', e.target.value)} required placeholder="Notice title" maxLength={255} />
            </div>
            <div className="hr-form-field">
              <label>Priority</label>
              <select value={form.priority} onChange={(e) => updateField('priority', e.target.value)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{capitalize(p)}</option>)}
              </select>
            </div>
          </div>

          <div className="hr-form-field">
            <label>Message *</label>
            <textarea value={form.body} onChange={(e) => updateField('body', e.target.value)} rows={6} required placeholder="Type the notice content…" maxLength={50000} />
          </div>

          {/* Audience builder */}
          <div className="hr-form-field">
            <label>Audience * <button type="button" className="hr-btn-sm" onClick={addAudience} style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px' }}><Plus size={12} /> Add</button></label>
            {form.audiences.map((aud, idx) => (
              <div key={idx} className="notice-audience-row">
                <select value={aud.audience_type} onChange={(e) => updateAudience(idx, 'audience_type', e.target.value)} style={{ flex: '0 0 140px' }}>
                  <option value="all">Everyone</option>
                  <option value="department">Department</option>
                  <option value="role">Role</option>
                </select>
                {aud.audience_type === 'department' && (
                  <select value={aud.audience_id} onChange={(e) => updateAudience(idx, 'audience_id', e.target.value)} required style={{ flex: 1 }}>
                    <option value="">— Select department —</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                )}
                {aud.audience_type === 'role' && (
                  <select value={aud.audience_role} onChange={(e) => updateAudience(idx, 'audience_role', e.target.value)} required style={{ flex: 1 }}>
                    <option value="">— Select role —</option>
                    {ROLES.map((r) => <option key={r} value={r}>{capitalize(r)}</option>)}
                  </select>
                )}
                {form.audiences.length > 1 && (
                  <button type="button" className="hr-action-btn danger" onClick={() => removeAudience(idx)} title="Remove"><X size={14} /></button>
                )}
              </div>
            ))}
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
              </select>
            </div>
            <div className="hr-form-field">
              <label>Pin Notice</label>
              <select value={form.is_pinned ? 'yes' : 'no'} onChange={(e) => updateField('is_pinned', e.target.value === 'yes')}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Publish Date</label>
              <input type="date" value={form.publish_date} onChange={(e) => updateField('publish_date', e.target.value)} />
            </div>
            <div className="hr-form-field">
              <label>Expiry Date</label>
              <input type="date" value={form.expiry_date} onChange={(e) => updateField('expiry_date', e.target.value)} />
            </div>
          </div>

          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeForm} disabled={submitting}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting || !form.title || !form.body}>
              {submitting ? 'Saving…' : editItem ? 'Update Notice' : <><Bell size={14} /> Send Notice</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Delete ─── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Notice" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete notice <strong>"{deleteTarget?.title}"</strong>? This cannot be undone.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</button>
          </div>
        </div>
      </Modal>
    </>
  )
}
