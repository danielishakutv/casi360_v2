import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { fmtDate } from '../../utils/formatDate'
import { demoRFQ, nextId } from '../../data/procurementDemo'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const STATUSES = ['draft', 'open', 'closed', 'awarded', 'cancelled']
const PER_PAGE = 15

const INITIAL_FORM = {
  title: '', description: '', pr_reference: '',
  deadline: '', status: 'draft', notes: '',
}

export default function RequestForQuotation() {
  const navigate = useNavigate()
  const [items, setItems] = useState(demoRFQ)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [viewItem, setViewItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const filtered = useMemo(() => {
    let r = items
    if (search) { const q = search.toLowerCase(); r = r.filter((i) => (i.title + i.pr_reference + i.rfq_number).toLowerCase().includes(q)) }
    if (statusFilter) r = r.filter((i) => i.status === statusFilter)
    return r
  }, [items, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const meta = { current_page: page, last_page: totalPages, per_page: PER_PAGE, total: filtered.length, from: filtered.length ? (page - 1) * PER_PAGE + 1 : 0, to: Math.min(page * PER_PAGE, filtered.length) }

  function openCreate() { setEditing(null); setForm(INITIAL_FORM); setModalOpen(true) }
  function openEdit(item) {
    setEditing(item)
    setForm({ title: item.title, description: item.description || '', pr_reference: item.pr_reference || '', deadline: item.deadline || '', status: item.status, notes: item.notes || '' })
    setModalOpen(true)
  }
  function closeModal() { setModalOpen(false); setEditing(null) }
  function updateField(f, v) { setForm((p) => ({ ...p, [f]: v })) }

  function handleSubmit(e) {
    e.preventDefault()
    if (editing) {
      setItems((prev) => prev.map((i) => i.id === editing.id ? { ...i, ...form } : i))
    } else {
      const id = nextId()
      setItems((prev) => [{ id, rfq_number: `RFQ-2026-${String(id).padStart(3, '0')}`, ...form, quotes_count: 0, created_at: new Date().toISOString().slice(0, 10) }, ...prev])
    }
    closeModal()
  }

  function confirmDelete() {
    if (!deleteTarget) return
    setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  return (
    <>
      <div className="card animate-in">
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box"><Search size={16} className="search-icon" /><input type="text" placeholder="Search RFQs…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} /></div>
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
            </select>
            <button className="hr-btn-primary" onClick={() => navigate('/procurement/rfq/create')}><Plus size={16} /> New RFQ</button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>RFQ #</th><th>Title</th><th>PR Ref</th><th>Deadline</th><th>Quotes</th><th>Status</th><th>Created</th><th style={{ width: 120 }}>Actions</th></tr></thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={8} className="hr-empty-cell">No RFQs found</td></tr>
              ) : paged.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{r.rfq_number}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{r.title}</td>
                  <td>{r.pr_reference || '—'}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(r.deadline)}</td>
                  <td>{r.quotes_count ?? '—'}</td>
                  <td><span className={`status-badge ${r.status}`}><span className="status-dot" />{capitalize(r.status)}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(r.created_at)}</td>
                  <td>
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => setViewItem(r)} title="View"><Eye size={15} /></button>
                      <button className="hr-action-btn" onClick={() => openEdit(r)} title="Edit"><Pencil size={15} /></button>
                      <button className="hr-action-btn danger" onClick={() => setDeleteTarget(r)} title="Delete"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination meta={meta} onPageChange={setPage} />
      </div>

      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="RFQ Details" size="md">
        {viewItem && (
          <div className="note-detail">
            <div className="note-detail-header"><h3>{viewItem.rfq_number} — {viewItem.title}</h3></div>
            <div className="note-detail-meta">
              <span><strong>PR Reference:</strong> {viewItem.pr_reference || '—'}</span>
              <span><strong>Deadline:</strong> {fmtDate(viewItem.deadline)}</span>
              <span><strong>Quotes:</strong> {viewItem.quotes_count ?? '—'}</span>
              <span><strong>Status:</strong> {capitalize(viewItem.status)}</span>
              <span><strong>Created:</strong> {fmtDate(viewItem.created_at)}</span>
            </div>
            <div className="note-detail-content">{viewItem.description || 'No description'}</div>
            <div className="hr-form-actions">
              <button className="hr-btn-secondary" onClick={() => setViewItem(null)}>Close</button>
              <button className="hr-btn-primary" onClick={() => { setViewItem(null); openEdit(viewItem) }}><Pencil size={14} /> Edit</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit RFQ' : 'New Request for Quotation'} size="md">
        <form onSubmit={handleSubmit} className="hr-form">
          <div className="hr-form-field"><label>Title *</label><input type="text" value={form.title} onChange={(e) => updateField('title', e.target.value)} required placeholder="RFQ title" /></div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>PR Reference</label><input type="text" value={form.pr_reference} onChange={(e) => updateField('pr_reference', e.target.value)} placeholder="e.g. PR-2026-001" /></div>
            <div className="hr-form-field"><label>Deadline</label><input type="date" value={form.deadline} onChange={(e) => updateField('deadline', e.target.value)} /></div>
          </div>
          <div className="hr-form-field"><label>Status</label><select value={form.status} onChange={(e) => updateField('status', e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}</select></div>
          <div className="hr-form-field"><label>Description</label><textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} rows={4} placeholder="Items & quantities being quoted…" /></div>
          <div className="hr-form-field"><label>Notes</label><textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} rows={2} placeholder="Additional notes…" /></div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="hr-btn-primary">{editing ? 'Update' : 'Create RFQ'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete RFQ" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete <strong>{deleteTarget?.title || deleteTarget?.rfq_number}</strong>? This cannot be undone.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
      </Modal>
    </>
  )
}
