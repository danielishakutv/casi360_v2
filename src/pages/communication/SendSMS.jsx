import { useState, useMemo } from 'react'
import { Search, Plus, Eye, Trash2, X, Smartphone, Users, Building2, Globe } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { fmtDate } from '../../utils/formatDate'
import { demoSmsMessages, demoStaffList, demoDepartments, nextCommId } from '../../data/communicationDemo'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const PER_PAGE = 10

const INITIAL_FORM = {
  message: '',
  audience: 'general', recipients: [], departments: [],
}

export default function SendSMS() {
  const [items, setItems] = useState(demoSmsMessages)
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
    return items.filter((m) => m.message.toLowerCase().includes(q))
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
    setForm((p) => ({ ...p, recipients: [...p.recipients, { id: staff.id, name: staff.name, phone: staff.phone }] }))
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
      .filter((s) => (s.name.toLowerCase().includes(q) || s.phone.includes(q)) && !form.recipients.find((r) => r.id === s.id))
      .slice(0, 6)
  }, [staffSearch, form.recipients])

  function deliveryCount() {
    if (form.audience === 'general') return demoStaffList.length
    if (form.audience === 'department') return demoStaffList.filter((s) => form.departments.includes(s.department)).length
    return form.recipients.length
  }

  function handleSubmit(e) {
    e.preventDefault()
    const sms = {
      id: nextCommId(),
      message: form.message,
      audience: form.audience,
      recipients: form.audience === 'individual' ? form.recipients : [],
      departments: form.audience === 'department' ? form.departments : [],
      created_at: new Date().toISOString().slice(0, 10),
      status: 'sent',
      delivery_count: deliveryCount(),
    }
    setItems((prev) => [sms, ...prev])
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

  const AudienceIcon = ({ type }) => {
    if (type === 'individual') return <Users size={13} />
    if (type === 'department') return <Building2 size={13} />
    return <Globe size={13} />
  }

  return (
    <>
      <div className="card animate-in">
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input type="text" placeholder="Search messages…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>
          <div className="hr-toolbar-right">
            <button className="hr-btn-primary" onClick={openCompose}><Plus size={16} /> New SMS</button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Message</th>
                <th>Audience</th>
                <th>Delivered</th>
                <th>Date</th>
                <th>Status</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={6} className="hr-empty-cell">No messages found</td></tr>
              ) : paged.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.message}</td>
                  <td>
                    <span className="comm-audience-badge">
                      <AudienceIcon type={m.audience} />
                      {m.audience === 'general' ? 'All Staff' : m.audience === 'department' ? m.departments.join(', ') : `${m.recipients.length} recipient(s)`}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{m.delivery_count}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(m.created_at)}</td>
                  <td><span className={`status-badge ${m.status === 'sent' ? 'active' : 'pending'}`}><span className="status-dot" />{capitalize(m.status)}</span></td>
                  <td>
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => setViewItem(m)} title="View"><Eye size={15} /></button>
                      <button className="hr-action-btn danger" onClick={() => setDeleteTarget(m)} title="Delete"><Trash2 size={15} /></button>
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
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="SMS Details" size="md">
        {viewItem && (
          <div className="note-detail">
            <div className="note-detail-meta">
              <span><strong>Audience:</strong> {audienceLabel(viewItem)}</span>
              <span><strong>Delivered To:</strong> {viewItem.delivery_count} recipient(s)</span>
              <span><strong>Date:</strong> {fmtDate(viewItem.created_at)}</span>
              <span><strong>Status:</strong> {capitalize(viewItem.status)}</span>
            </div>
            <div className="note-detail-content">{viewItem.message}</div>
            <div className="hr-form-actions">
              <button className="hr-btn-secondary" onClick={() => setViewItem(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Compose ─── */}
      <Modal open={composeOpen} onClose={closeCompose} title="Compose SMS" size="md">
        <form onSubmit={handleSubmit} className="hr-form">
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
                <input type="text" value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} placeholder="Type a name or phone number…" />
                {staffResults.length > 0 && (
                  <div className="comm-staff-dropdown">
                    {staffResults.map((s) => (
                      <button key={s.id} type="button" className="comm-staff-option" onClick={() => addRecipient(s)}>
                        <span className="comm-staff-name">{s.name}</span>
                        <span className="comm-staff-dept">{s.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {form.recipients.length > 0 && (
                <div className="comm-recipient-chips">
                  {form.recipients.map((r) => (
                    <span key={r.id} className="comm-chip">
                      {r.name} ({r.phone})
                      <button type="button" onClick={() => removeRecipient(r.id)}><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="hr-form-field">
            <label>Message * <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>({form.message.length}/160 characters)</span></label>
            <textarea value={form.message} onChange={(e) => updateField('message', e.target.value)} rows={4} required placeholder="Type your SMS message…" maxLength={480} />
          </div>

          {form.message && (
            <div className="comm-sms-preview">
              <span className="comm-sms-count">Will be sent to <strong>{deliveryCount()}</strong> recipient(s)</span>
            </div>
          )}

          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeCompose}>Cancel</button>
            <button
              type="submit"
              className="hr-btn-primary"
              disabled={
                !form.message ||
                (form.audience === 'department' && form.departments.length === 0) ||
                (form.audience === 'individual' && form.recipients.length === 0)
              }
            >
              <Smartphone size={14} /> Send SMS
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Delete ─── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete SMS" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete this SMS message? This cannot be undone.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
      </Modal>
    </>
  )
}
