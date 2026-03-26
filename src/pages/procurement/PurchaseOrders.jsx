import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import { demoPurchaseOrders, nextId } from '../../data/procurementDemo'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const STATUSES = ['draft', 'issued', 'approved', 'partially_received', 'received', 'cancelled']
const PER_PAGE = 15
function fmtStatus(s) { return capitalize((s || 'draft').replace(/_/g, ' ')) }

const INITIAL_FORM = {
  title: '', vendor: '', pr_reference: '', rfq_reference: '',
  total_amount: '', delivery_date: '', status: 'draft',
  description: '', notes: '',
}

export default function PurchaseOrders() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const [items, setItems] = useState(demoPurchaseOrders)
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
    if (search) { const q = search.toLowerCase(); r = r.filter((i) => (i.title + i.vendor + i.po_number + i.pr_reference).toLowerCase().includes(q)) }
    if (statusFilter) r = r.filter((i) => i.status === statusFilter)
    return r
  }, [items, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const meta = { current_page: page, last_page: totalPages, per_page: PER_PAGE, total: filtered.length, from: filtered.length ? (page - 1) * PER_PAGE + 1 : 0, to: Math.min(page * PER_PAGE, filtered.length) }

  function openCreate() { setEditing(null); setForm(INITIAL_FORM); setModalOpen(true) }
  function openEdit(item) {
    setEditing(item)
    setForm({ title: item.title || '', vendor: item.vendor, pr_reference: item.pr_reference || '', rfq_reference: item.rfq_reference || '', total_amount: item.total_amount, delivery_date: item.delivery_date || '', status: item.status, description: item.description || '', notes: item.notes || '' })
    setModalOpen(true)
  }
  function closeModal() { setModalOpen(false); setEditing(null) }
  function updateField(f, v) { setForm((p) => ({ ...p, [f]: v })) }

  function handleSubmit(e) {
    e.preventDefault()
    if (editing) {
      setItems((prev) => prev.map((i) => i.id === editing.id ? { ...i, ...form, total_amount: Number(form.total_amount) || 0 } : i))
    } else {
      const id = nextId()
      setItems((prev) => [{ id, po_number: `PO-2026-${String(id).padStart(3, '0')}`, ...form, total_amount: Number(form.total_amount) || 0, created_at: new Date().toISOString().slice(0, 10) }, ...prev])
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
            <div className="search-box"><Search size={16} className="search-icon" /><input type="text" placeholder="Search purchase orders…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} /></div>
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}
            </select>
            {can('procurement.purchase_orders.create') && (
              <button className="hr-btn-primary" onClick={() => navigate('/procurement/purchase-orders/create')}><Plus size={16} /> New PO</button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>PO #</th><th>Vendor</th><th>PR Ref</th><th>Amount</th><th>Delivery</th><th>Status</th><th>Created</th><th style={{ width: 120 }}>Actions</th></tr></thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={8} className="hr-empty-cell">No purchase orders found</td></tr>
              ) : paged.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{r.po_number}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{r.vendor}</td>
                  <td>{r.pr_reference || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{naira(r.total_amount)}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(r.delivery_date)}</td>
                  <td><span className={`status-badge ${r.status.replace(/ /g, '_')}`}><span className="status-dot" />{fmtStatus(r.status)}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(r.created_at)}</td>
                  <td>
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => setViewItem(r)} title="View"><Eye size={15} /></button>
                      {can('procurement.purchase_orders.edit') && (
                        <button className="hr-action-btn" onClick={() => openEdit(r)} title="Edit"><Pencil size={15} /></button>
                      )}
                      {can('procurement.purchase_orders.delete') && (
                        <button className="hr-action-btn danger" onClick={() => setDeleteTarget(r)} title="Delete"><Trash2 size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination meta={meta} onPageChange={setPage} />
      </div>

      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Purchase Order Details" size="md">
        {viewItem && (
          <div className="note-detail">
            <div className="note-detail-header"><h3>{viewItem.po_number} — {viewItem.title || viewItem.vendor}</h3></div>
            <div className="note-detail-meta">
              <span><strong>Vendor:</strong> {viewItem.vendor}</span>
              <span><strong>PR Ref:</strong> {viewItem.pr_reference || '—'}</span>
              <span><strong>RFQ Ref:</strong> {viewItem.rfq_reference || '—'}</span>
              <span><strong>Amount:</strong> {naira(viewItem.total_amount)}</span>
              <span><strong>Delivery:</strong> {fmtDate(viewItem.delivery_date)}</span>
              <span><strong>Status:</strong> {fmtStatus(viewItem.status)}</span>
              <span><strong>Created:</strong> {fmtDate(viewItem.created_at)}</span>
            </div>
            <div className="note-detail-content">{viewItem.description || viewItem.notes || 'No description'}</div>
            <div className="hr-form-actions">
              <button className="hr-btn-secondary" onClick={() => setViewItem(null)}>Close</button>
              {can('procurement.purchase_orders.edit') && (
                <button className="hr-btn-primary" onClick={() => { setViewItem(null); openEdit(viewItem) }}><Pencil size={14} /> Edit</button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Purchase Order' : 'New Purchase Order'} size="md">
        <form onSubmit={handleSubmit} className="hr-form">
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Title</label><input type="text" value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="PO title" /></div>
            <div className="hr-form-field"><label>Vendor *</label><input type="text" value={form.vendor} onChange={(e) => updateField('vendor', e.target.value)} required placeholder="Vendor name" /></div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>PR Reference</label><input type="text" value={form.pr_reference} onChange={(e) => updateField('pr_reference', e.target.value)} placeholder="e.g. PR-2026-001" /></div>
            <div className="hr-form-field"><label>RFQ Reference</label><input type="text" value={form.rfq_reference} onChange={(e) => updateField('rfq_reference', e.target.value)} placeholder="e.g. RFQ-2026-001" /></div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Total Amount (₦) *</label><input type="number" value={form.total_amount} onChange={(e) => updateField('total_amount', e.target.value)} required placeholder="0.00" min="0" step="0.01" /></div>
            <div className="hr-form-field"><label>Delivery Date</label><input type="date" value={form.delivery_date} onChange={(e) => updateField('delivery_date', e.target.value)} /></div>
          </div>
          <div className="hr-form-field"><label>Status</label><select value={form.status} onChange={(e) => updateField('status', e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}</select></div>
          <div className="hr-form-field"><label>Description</label><textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} rows={4} placeholder="Line items and details…" /></div>
          <div className="hr-form-field"><label>Notes</label><textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} rows={2} placeholder="Additional notes…" /></div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="hr-btn-primary">{editing ? 'Update' : 'Create PO'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Purchase Order" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete <strong>{deleteTarget?.po_number || deleteTarget?.title}</strong>? This cannot be undone.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
      </Modal>
    </>
  )
}
