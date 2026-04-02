import { useState, useMemo, useEffect, useCallback } from 'react'
import { Search, Plus, Eye, Trash2, X, Mail, Users, Building2, Globe } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { fmtDate } from '../../utils/formatDate'
import { emailsApi } from '../../services/communication'
import { departmentsApi } from '../../services/hr'
import { usersApi } from '../../services/api'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const PER_PAGE = 10

function AudienceIcon({ type }) {
  if (type === 'individual') return <Users size={13} />
  if (type === 'department') return <Building2 size={13} />
  return <Globe size={13} />
}

const INITIAL_FORM = {
  subject: '', body: '',
  audience: 'general', recipients: [], departments: [],
}

export default function SendEmail() {
  const { can } = useAuth()
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [page, setPage] = useState(1)

  const [composeOpen, setComposeOpen] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [staffSearch, setStaffSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [deptList, setDeptList] = useState([])
  const [staffResults, setStaffResults] = useState([])

  const [viewItem, setViewItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await emailsApi.list({ search: debouncedSearch || undefined, page, per_page: PER_PAGE })
      setItems(extractItems(res))
      setMeta(extractMeta(res))
    } catch { /* keep */ }
    finally { setLoading(false) }
  }, [debouncedSearch, page])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch])

  useEffect(() => {
    departmentsApi.list({ per_page: 0 }).then((res) => {
      const depts = extractItems(res)
      setDeptList(depts.map((d) => d.name))
    }).catch(() => {})
  }, [])

  /* Staff search for individual recipients */
  const debouncedStaff = useDebounce(staffSearch)
  useEffect(() => {
    if (!debouncedStaff || debouncedStaff.length < 2) { setStaffResults([]); return }
    usersApi.list({ search: debouncedStaff, per_page: 6 }).then((res) => {
      const users = extractItems(res)
      setStaffResults(users.filter((u) => !form.recipients.find((r) => r.id === u.id)))
    }).catch(() => {})
  }, [debouncedStaff, form.recipients])

  function openCompose() { setForm(INITIAL_FORM); setStaffSearch(''); setComposeOpen(true) }
  function closeCompose() { setComposeOpen(false) }
  function updateField(f, v) { setForm((p) => ({ ...p, [f]: v })) }

  function addRecipient(staff) {
    if (form.recipients.find((r) => r.id === staff.id)) return
    setForm((p) => ({ ...p, recipients: [...p.recipients, { id: staff.id, name: staff.name, email: staff.email }] }))
    setStaffSearch('')
  }
  function removeRecipient(id) {
    setForm((p) => ({ ...p, recipients: p.recipients.filter((r) => r.id !== id) }))
  }

  function toggleDept(dept) {
    setForm((p) => ({
      ...p,
      departments: p.departments.includes(dept)
        ? p.departments.filter((d) => d !== dept)
        : [...p.departments, dept],
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await emailsApi.create({
        subject: form.subject,
        body: form.body,
        audience: form.audience,
        recipient_ids: form.audience === 'individual' ? form.recipients.map((r) => r.id) : undefined,
        department_ids: form.audience === 'department' ? form.departments : undefined,
      })
      closeCompose()
      fetchList()
    } catch { /* keep modal open */ }
    finally { setSubmitting(false) }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await emailsApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      fetchList()
    } catch { setDeleteTarget(null) }
  }

  function audienceLabel(item) {
    if (item.audience === 'general') return 'All Staff'
    if (item.audience === 'department') return item.departments.join(', ')
    return item.recipients.map((r) => r.name).join(', ')
  }

  return (
    <>
      <div className="card animate-in">
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input type="text" placeholder="Search emails…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>
          <div className="hr-toolbar-right">
            {can('communication.email.create') && (
              <button className="hr-btn-primary" onClick={openCompose}><Plus size={16} /> Compose Email</button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Audience</th>
                <th>Date</th>
                <th>Status</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="hr-empty-cell">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="hr-empty-cell">No emails found</td></tr>
              ) : items.map((em) => (
                <tr key={em.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{em.subject}</td>
                  <td>
                    <span className="comm-audience-badge">
                      <AudienceIcon type={em.audience} />
                      {em.audience === 'general' ? 'All Staff' : em.audience === 'department' ? em.departments.join(', ') : `${em.recipients.length} recipient(s)`}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{fmtDate(em.created_at)}</td>
                  <td><span className={`status-badge ${em.status === 'sent' ? 'active' : 'pending'}`}><span className="status-dot" />{em.status === 'sent' ? 'Sent' : 'Draft'}</span></td>
                  <td>
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => setViewItem(em)} title="View"><Eye size={15} /></button>
                      {can('communication.email.delete') && (
                        <button className="hr-action-btn danger" onClick={() => setDeleteTarget(em)} title="Delete"><Trash2 size={15} /></button>
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
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Email Details" size="md">
        {viewItem && (
          <div className="note-detail">
            <div className="note-detail-header"><h3>{viewItem.subject}</h3></div>
            <div className="note-detail-meta">
              <span><strong>To:</strong> {audienceLabel(viewItem)}</span>
              <span><strong>Date:</strong> {fmtDate(viewItem.created_at)}</span>
              <span><strong>Status:</strong> {capitalize(viewItem.status)}</span>
            </div>
            <div className="note-detail-content" style={{ whiteSpace: 'pre-wrap' }}>{viewItem.body}</div>
            <div className="hr-form-actions">
              <button className="hr-btn-secondary" onClick={() => setViewItem(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Compose ─── */}
      <Modal open={composeOpen} onClose={closeCompose} title="Compose Email" size="md">
        <form onSubmit={handleSubmit} className="hr-form">
          <div className="hr-form-field">
            <label>Subject *</label>
            <input type="text" value={form.subject} onChange={(e) => updateField('subject', e.target.value)} required placeholder="Email subject" />
          </div>

          {/* Audience selector */}
          <div className="hr-form-field">
            <label>Send To *</label>
            <div className="comm-audience-tabs">
              <button type="button" className={`comm-audience-tab ${form.audience === 'general' ? 'active' : ''}`} onClick={() => updateField('audience', 'general')}>
                <Globe size={14} /> Everyone
              </button>
              <button type="button" className={`comm-audience-tab ${form.audience === 'department' ? 'active' : ''}`} onClick={() => updateField('audience', 'department')}>
                <Building2 size={14} /> By Department
              </button>
              <button type="button" className={`comm-audience-tab ${form.audience === 'individual' ? 'active' : ''}`} onClick={() => updateField('audience', 'individual')}>
                <Users size={14} /> Individuals
              </button>
            </div>
          </div>

          {form.audience === 'department' && (
            <div className="hr-form-field">
              <label>Select Departments *</label>
              <div className="comm-dept-grid">
                {deptList.map((d) => (
                  <label key={d} className="comm-dept-chip">
                    <input type="checkbox" checked={form.departments.includes(d)} onChange={() => toggleDept(d)} />
                    <span>{d}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {form.audience === 'individual' && (
            <div className="hr-form-field">
              <label>Add Recipients *</label>
              <div className="comm-recipient-input-wrap">
                <input type="text" value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} placeholder="Type a name or email…" />
                {staffResults.length > 0 && (
                  <div className="comm-staff-dropdown">
                    {staffResults.map((s) => (
                      <button key={s.id} type="button" className="comm-staff-option" onClick={() => addRecipient(s)}>
                        <span className="comm-staff-name">{s.name}</span>
                        <span className="comm-staff-dept">{s.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {form.recipients.length > 0 && (
                <div className="comm-recipient-chips">
                  {form.recipients.map((r) => (
                    <span key={r.id} className="comm-chip">
                      {r.name} ({r.email})
                      <button type="button" onClick={() => removeRecipient(r.id)}><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="hr-form-field">
            <label>Body *</label>
            <textarea value={form.body} onChange={(e) => updateField('body', e.target.value)} rows={8} required placeholder="Compose your email…" />
          </div>

          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeCompose}>Cancel</button>
            <button
              type="submit"
              className="hr-btn-primary"
              disabled={
                !form.subject || !form.body ||
                (form.audience === 'department' && form.departments.length === 0) ||
                (form.audience === 'individual' && form.recipients.length === 0)
              }
            >
              <Mail size={14} /> {submitting ? 'Sending…' : 'Send Email'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Delete ─── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Email" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete email <strong>"{deleteTarget?.subject}"</strong>? This cannot be undone.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
      </Modal>
    </>
  )
}
