import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import { grnApi } from '../../services/procurement'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { usePersistedScope } from '../../hooks/usePersistedScope'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import MineToggle from '../../components/MineToggle'

const STATUSES = ['draft', 'pending_inspection', 'inspected', 'accepted', 'rejected', 'partial']
const PER_PAGE = 15
function fmtStatus(s) { return capitalize((s || 'draft').replace(/_/g, ' ')) }

const INITIAL_FORM = {
  po_reference: '', vendor: '', received_by: '',
  received_date: '', total_amount: '', status: 'draft',
  description: '', notes: '', office: '',
}

export default function GoodsReceivedNote() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canViewAll = can('procurement.grn.view_all')
  const [mine, setMine] = usePersistedScope('casi360.scope.grn', true)
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [viewItem, setViewItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await grnApi.list({ search: debouncedSearch || undefined, status: statusFilter || undefined, page, per_page: PER_PAGE, mine: mine ? 1 : 0 })
      setItems(extractItems(res))
      setMeta(extractMeta(res))
    } catch { /* keep current */ }
    finally { setLoading(false) }
  }, [debouncedSearch, statusFilter, page, mine])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter, mine])

  function openEdit(item) {
    setEditing(item)
    setForm({ po_reference: item.po_reference || '', vendor: item.vendor || '', received_by: item.received_by || '', received_date: item.received_date || '', total_amount: item.total_amount, status: item.status, description: item.description || '', notes: item.notes || '', office: item.office || '' })
    setModalOpen(true)
  }
  function closeModal() { setModalOpen(false); setEditing(null) }
  function updateField(f, v) { setForm((p) => ({ ...p, [f]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = { ...form, total_amount: Number(form.total_amount) || 0 }
      if (editing) {
        await grnApi.update(editing.id, payload)
      } else {
        await grnApi.create(payload)
      }
      closeModal()
      fetchList()
    } catch { /* ignore */ }
    finally { setSubmitting(false) }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await grnApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      fetchList()
    } catch { setDeleteTarget(null) }
  }

  return (
    <>
      <div className="card animate-in">
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box"><Search size={16} className="search-icon" /><input type="text" placeholder="Search GRNs…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} /></div>
            <MineToggle value={mine} onChange={setMine} canViewAll={canViewAll} />
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}
            </select>
            {can('procurement.grn.create') && (
              <button className="hr-btn-primary" onClick={() => navigate('/procurement/grn/create')}><Plus size={16} /> New GRN</button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>GRN #</th><th>PO Ref</th><th>Vendor</th><th>Received By</th><th>Amount</th><th>Received</th><th>Status</th><th style={{ width: 120 }}>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '12px auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="hr-empty-cell">No GRNs found</td></tr>
              ) : items.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{r.grn_number}</td>
                  <td>{r.po_reference || '—'}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{r.vendor || '—'}</td>
                  <td>{r.received_by || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{naira(r.total_amount)}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(r.received_date)}</td>
                  <td><span className={`status-badge ${r.status.replace(/ /g, '_')}`}><span className="status-dot" />{fmtStatus(r.status)}</span></td>
                  <td>
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => setViewItem(r)} title="View"><Eye size={15} /></button>
                      {can('procurement.grn.edit') && (
                        <button className="hr-action-btn" onClick={() => openEdit(r)} title="Edit"><Pencil size={15} /></button>
                      )}
                      {can('procurement.grn.delete') && (
                        <button className="hr-action-btn danger" onClick={() => setDeleteTarget(r)} title="Delete"><Trash2 size={15} /></button>
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

      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="GRN Details" size="md">
        {viewItem && (
          <div className="note-detail">
            <div className="note-detail-header"><h3>{viewItem.grn_number}</h3></div>
            <div className="note-detail-meta">
              <span><strong>PO Reference:</strong> {viewItem.po_reference || '—'}</span>
              <span><strong>Vendor:</strong> {viewItem.vendor || '—'}</span>
              <span><strong>Received by:</strong> {viewItem.received_by || '—'}</span>
              <span><strong>Date received:</strong> {fmtDate(viewItem.received_date)}</span>
              <span><strong>Amount:</strong> {naira(viewItem.total_amount)}</span>
              <span><strong>Status:</strong> {fmtStatus(viewItem.status)}</span>
            </div>
            <div className="note-detail-content">{viewItem.description || viewItem.notes || 'No description'}</div>
            <div className="hr-form-actions">
              <button className="hr-btn-secondary" onClick={() => setViewItem(null)}>Close</button>
              {can('procurement.grn.edit') && (
                <button className="hr-btn-primary" onClick={() => { setViewItem(null); openEdit(viewItem) }}><Pencil size={14} /> Edit</button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit GRN' : 'New Goods Received Note'} size="md">
        <form onSubmit={handleSubmit} className="hr-form">
          <div className="hr-form-row">
            <div className="hr-form-field"><label>PO Reference *</label><input type="text" value={form.po_reference} onChange={(e) => updateField('po_reference', e.target.value)} required placeholder="e.g. PO-2026-001" /></div>
            <div className="hr-form-field"><label>Vendor</label><input type="text" value={form.vendor} onChange={(e) => updateField('vendor', e.target.value)} placeholder="Vendor name" /></div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Received By</label><input type="text" value={form.received_by} onChange={(e) => updateField('received_by', e.target.value)} placeholder="Name of receiver" /></div>
            <div className="hr-form-field"><label>Date Received</label><input type="date" value={form.received_date} onChange={(e) => updateField('received_date', e.target.value)} /></div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Total Amount (₦)</label><input type="number" value={form.total_amount} onChange={(e) => updateField('total_amount', e.target.value)} placeholder="0.00" min="0" step="0.01" /></div>
            <div className="hr-form-field"><label>Status</label><select value={form.status} onChange={(e) => updateField('status', e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}</select></div>
          </div>
          <div className="hr-form-field"><label>Description</label><textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} rows={4} placeholder="Items received, quantities, condition…" /></div>
          <div className="hr-form-field"><label>Notes</label><textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} rows={2} placeholder="Additional notes…" /></div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editing ? 'Update' : 'Create GRN'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete GRN" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete <strong>{deleteTarget?.grn_number}</strong>? This cannot be undone.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
      </Modal>
    </>
  )
}
