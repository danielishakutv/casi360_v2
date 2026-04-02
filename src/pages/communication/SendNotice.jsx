import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Eye, Trash2, Bell, Users, Building2, Globe, AlertCircle } from 'lucide-react'
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
const PER_PAGE = 15

function AudienceIcon({ type }) {
  if (type === 'department') return <Building2 size={13} />
  if (type === 'role') return <Users size={13} />
  return <Globe size={13} />
}

const INITIAL_FORM = {
  title: '', body: '', priority: 'normal', status: 'published',
  audience_type: 'all', audience_id: '', audience_role: '',
  is_pinned: false, publish_date: '', expiry_date: '',
}

export default function SendNotice() {
  const { can } = useAuth()

  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [page, setPage] = useState(1)

  const [departments, setDepartments] = useState([])
  const [composeOpen, setComposeOpen] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState(null)

  const [viewItem, setViewItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  /* ─── Fetch departments for audience selector ─── */
  useEffect(() => {
    departmentsApi.list({ per_page: 0 }).then((r) => setDepartments(extractItems(r))).catch(() => {})
  }, [])

  /* ─── Fetch notices ─── */
  const fetchList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await noticesApi.list({
        search: debouncedSearch || undefined,
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
  }, [debouncedSearch, page])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch])

  function openCompose() { setForm(INITIAL_FORM); setFormErrors(null); setComposeOpen(true) }
  function closeCompose() { setComposeOpen(false) }
  function updateField(f, v) { setForm((p) => ({ ...p, [f]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormErrors(null)
    try {
      const audience = { audience_type: form.audience_type }
      if (form.audience_type === 'department') audience.audience_id = form.audience_id
      if (form.audience_type === 'role') audience.audience_role = form.audience_role

      await noticesApi.create({
        title: form.title,
        body: form.body,
        priority: form.priority,
        status: form.status,
        is_pinned: form.is_pinned,
        publish_date: form.publish_date || undefined,
        expiry_date: form.expiry_date || undefined,
        audiences: [audience],
      })
      closeCompose()
      fetchList()
    } catch (err) {
      if (err.status === 422 && err.data?.errors) {
        setFormErrors(err.data.errors)
      } else {
        setFormErrors({ general: [err.message || 'Failed to send notice'] })
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await noticesApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      fetchList()
    } catch (err) {
      setError(err.message || 'Failed to delete notice')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  function audienceLabel(item) {
    if (!item.audiences || item.audiences.length === 0) return 'All'
    return item.audiences.map((a) => a.label || capitalize(a.audience_type)).join(', ')
  }

  return (
    <>
      {error && (
        <div className="hr-error-banner">
          <AlertCircle size={16} /><span>{error}</span>
          <button onClick={() => setError('')} className="hr-error-dismiss">&times;</button>
        </div>
      )}

      <div className="card animate-in">
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input type="text" placeholder="Search notices…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>
          <div className="hr-toolbar-right">
            {can('communication.notices.create') && (
              <button className="hr-btn-primary" onClick={openCompose}><Plus size={16} /> New Notice</button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Audience</th>
                <th>Priority</th>
                <th>Date</th>
                <th>Read</th>
                <th>Status</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '20px auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="hr-empty-cell">No notices found</td></tr>
              ) : items.map((n) => (
                <tr key={n.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{n.title}</td>
                  <td>
                    <span className="comm-audience-badge">
                      <AudienceIcon type={n.audiences?.[0]?.audience_type} />
                      {audienceLabel(n)}
                    </span>
                  </td>
                  <td><span className={`card-badge ${n.priority === 'critical' ? 'red' : n.priority === 'important' ? 'orange' : 'green'}`}>{capitalize(n.priority)}</span></td>
                  <td style={{ fontSize: 12 }}>{fmtDate(n.publish_date || n.created_at)}</td>
                  <td style={{ fontSize: 12 }}>{n.read_count ?? '—'}</td>
                  <td><span className={`status-badge ${n.status === 'published' ? 'active' : n.status === 'draft' ? 'pending' : 'inactive'}`}><span className="status-dot" />{capitalize(n.status)}</span></td>
                  <td>
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => setViewItem(n)} title="View"><Eye size={15} /></button>
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

      {/* ─── View ─── */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Notice Details" size="md">
        {viewItem && (
          <div className="note-detail">
            <div className="note-detail-header"><h3>{viewItem.title}</h3></div>
            <div className="note-detail-meta">
              <span><strong>Author:</strong> {viewItem.author_name || '—'}</span>
              <span><strong>Audience:</strong> {audienceLabel(viewItem)}</span>
              <span><strong>Priority:</strong> {capitalize(viewItem.priority)}</span>
              <span><strong>Published:</strong> {fmtDate(viewItem.publish_date || viewItem.created_at)}</span>
              {viewItem.expiry_date && <span><strong>Expires:</strong> {fmtDate(viewItem.expiry_date)}</span>}
              <span><strong>Read:</strong> {viewItem.read_count ?? 0}</span>
              <span><strong>Status:</strong> {capitalize(viewItem.status)}</span>
              {viewItem.is_pinned && <span><strong>Pinned</strong></span>}
            </div>
            <div className="note-detail-content">{viewItem.body}</div>
            <div className="hr-form-actions">
              <button className="hr-btn-secondary" onClick={() => setViewItem(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Compose ─── */}
      <Modal open={composeOpen} onClose={closeCompose} title="Compose Notice" size="md">
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
              <input type="text" value={form.title} onChange={(e) => updateField('title', e.target.value)} required placeholder="Notice title" />
            </div>
            <div className="hr-form-field">
              <label>Priority *</label>
              <select value={form.priority} onChange={(e) => updateField('priority', e.target.value)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{capitalize(p)}</option>)}
              </select>
            </div>
          </div>

          {/* Audience selector */}
          <div className="hr-form-field">
            <label>Send To *</label>
            <div className="comm-audience-tabs">
              <button type="button" className={`comm-audience-tab ${form.audience_type === 'all' ? 'active' : ''}`} onClick={() => updateField('audience_type', 'all')}>
                <Globe size={14} /> Everyone
              </button>
              <button type="button" className={`comm-audience-tab ${form.audience_type === 'department' ? 'active' : ''}`} onClick={() => updateField('audience_type', 'department')}>
                <Building2 size={14} /> Department
              </button>
              <button type="button" className={`comm-audience-tab ${form.audience_type === 'role' ? 'active' : ''}`} onClick={() => updateField('audience_type', 'role')}>
                <Users size={14} /> By Role
              </button>
            </div>
          </div>

          {form.audience_type === 'department' && (
            <div className="hr-form-field">
              <label>Select Department *</label>
              <select value={form.audience_id} onChange={(e) => updateField('audience_id', e.target.value)} required>
                <option value="">— Select department —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}

          {form.audience_type === 'role' && (
            <div className="hr-form-field">
              <label>Role Name *</label>
              <input type="text" value={form.audience_role} onChange={(e) => updateField('audience_role', e.target.value)} required placeholder="e.g. admin, manager" />
            </div>
          )}

          <div className="hr-form-field">
            <label>Message *</label>
            <textarea value={form.body} onChange={(e) => updateField('body', e.target.value)} rows={5} required placeholder="Type the notice content…" />
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div className="hr-form-field">
              <label>Pin Notice?</label>
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
            <button type="button" className="hr-btn-secondary" onClick={closeCompose} disabled={submitting}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting || !form.title || !form.body}>
              {submitting ? 'Sending…' : <><Bell size={14} /> Send Notice</>}
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
