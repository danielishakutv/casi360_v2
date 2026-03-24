import { useState, useMemo } from 'react'
import { Search, Plus, Eye, Trash2, X, Mail, Users, Building2, Globe } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { fmtDate } from '../../utils/formatDate'
import { demoEmails, demoStaffList, demoDepartments, nextCommId } from '../../data/communicationDemo'
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
  const [items, setItems] = useState(demoEmails)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [composeOpen, setComposeOpen] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [staffSearch, setStaffSearch] = useState('')

  const [viewItem, setViewItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  /* ─── Filter & page ─── */
  const filtered = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter((e) => (e.subject + e.body).toLowerCase().includes(q))
  }, [items, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const meta = {
    current_page: page, last_page: totalPages, per_page: PER_PAGE,
    total: filtered.length,
    from: filtered.length ? (page - 1) * PER_PAGE + 1 : 0,
    to: Math.min(page * PER_PAGE, filtered.length),
  }

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

  const staffResults = useMemo(() => {
    if (!staffSearch || staffSearch.length < 2) return []
    const q = staffSearch.toLowerCase()
    return demoStaffList
      .filter((s) => (s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)) && !form.recipients.find((r) => r.id === s.id))
      .slice(0, 6)
  }, [staffSearch, form.recipients])

  function handleSubmit(e) {
    e.preventDefault()
    const email = {
      id: nextCommId(),
      subject: form.subject,
      body: form.body,
      audience: form.audience,
      recipients: form.audience === 'individual' ? form.recipients : [],
      departments: form.audience === 'department' ? form.departments : [],
      created_at: new Date().toISOString().slice(0, 10),
      status: 'sent',
    }
    setItems((prev) => [email, ...prev])
    closeCompose()
  }

  function confirmDelete() {
    if (!deleteTarget) return
    setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id))
    setDeleteTarget(null)
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
            <button className="hr-btn-primary" onClick={openCompose}><Plus size={16} /> Compose Email</button>
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
              {paged.length === 0 ? (
                <tr><td colSpan={5} className="hr-empty-cell">No emails found</td></tr>
              ) : paged.map((em) => (
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
                      <button className="hr-action-btn danger" onClick={() => setDeleteTarget(em)} title="Delete"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination meta={meta} onPageChange={setPage} />
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
                {demoDepartments.map((d) => (
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
              <Mail size={14} /> Send Email
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
