import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Trash2, Eye } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import { boqApi } from '../../services/procurement'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const STATUSES = ['draft', 'pending', 'approved', 'revised', 'cancelled']
const PER_PAGE = 15

export default function BillOfQuantities() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const [viewItem, setViewItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await boqApi.list({ search: debouncedSearch || undefined, status: statusFilter || undefined, page, per_page: PER_PAGE })
      setItems(extractItems(res))
      setMeta(extractMeta(res))
    } catch { /* keep current */ }
    finally { setLoading(false) }
  }, [debouncedSearch, statusFilter, page])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter])

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await boqApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      fetchList()
    } catch { setDeleteTarget(null) }
  }

  return (
    <>
      <div className="card animate-in">
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box"><Search size={16} className="search-icon" /><input type="text" placeholder="Search BOQs…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} /></div>
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
            </select>
            {can('procurement.boq.create') && (
              <button className="hr-btn-primary" onClick={() => navigate('/procurement/boq/create')}><Plus size={16} /> New BOQ</button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>BOQ #</th><th>Title</th><th>Project</th><th>Prepared By</th><th>Amount</th><th>Status</th><th>Date</th><th style={{ width: 120 }}>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '12px auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="hr-empty-cell">No BOQs found</td></tr>
              ) : items.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{r.boq_number}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{r.title}</td>
                  <td>{r.project || '—'}</td>
                  <td>{r.prepared_by || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{naira(r.grand_total ?? r.total_amount)}</td>
                  <td><span className={`status-badge ${r.status}`}><span className="status-dot" />{capitalize(r.status)}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(r.created_at)}</td>
                  <td>
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => setViewItem(r)} title="View"><Eye size={15} /></button>
                      {can('procurement.boq.delete') && (
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

      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="BOQ Details" size="md">
        {viewItem && (
          <div className="note-detail">
            <div className="note-detail-header"><h3>{viewItem.boq_number} — {viewItem.title}</h3></div>
            <div className="note-detail-meta">
              <span><strong>Project:</strong> {viewItem.project || '—'}</span>
              <span><strong>Department:</strong> {viewItem.department || '—'}</span>
              <span><strong>Category:</strong> {viewItem.category || '—'}</span>
              <span><strong>Prepared by:</strong> {viewItem.prepared_by || '—'}</span>
              <span><strong>Items:</strong> {viewItem.item_count ?? '—'}</span>
              <span><strong>Total:</strong> {naira(viewItem.grand_total ?? viewItem.total_amount)}</span>
              <span><strong>Status:</strong> {capitalize(viewItem.status)}</span>
              <span><strong>Created:</strong> {fmtDate(viewItem.created_at)}</span>
            </div>
            <div className="note-detail-content">{viewItem.description || 'No description'}</div>
            <div className="hr-form-actions">
              <button className="hr-btn-secondary" onClick={() => setViewItem(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete BOQ" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete <strong>{deleteTarget?.title || deleteTarget?.boq_number}</strong>? This cannot be undone.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
      </Modal>
    </>
  )
}
