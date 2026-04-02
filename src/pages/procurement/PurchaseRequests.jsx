import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Pencil, Trash2, Eye, AlertCircle } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import { purchaseRequestsApi } from '../../services/procurement'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const STATUSES = ['draft', 'submitted', 'pending_approval', 'approved', 'rejected', 'revision', 'cancelled']
const PRIORITIES = ['low', 'medium', 'high', 'urgent']
const PER_PAGE = 15

function fmtStatus(s) { return capitalize((s || 'draft').replace(/_/g, ' ')) }

export default function PurchaseRequests() {
  const navigate = useNavigate()
  const { can } = useAuth()

  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [page, setPage] = useState(1)

  const [viewItem, setViewItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  /* ─── Fetch list ─── */
  const fetchList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await purchaseRequestsApi.list({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        page,
        per_page: PER_PAGE,
      })
      setItems(extractItems(res))
      setMeta(extractMeta(res))
    } catch (err) {
      setError(err.message || 'Failed to load purchase requests')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, priorityFilter, page])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter, priorityFilter])

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await purchaseRequestsApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      fetchList()
    } catch (err) {
      setError(err.message || 'Failed to delete purchase request')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {error && (
        <div className="hr-error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="hr-error-dismiss">&times;</button>
        </div>
      )}

      <div className="card animate-in">
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box"><Search size={16} className="search-icon" /><input type="text" placeholder="Search purchase requests…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}
            </select>
            <select className="hr-filter-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="">All Priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{capitalize(p)}</option>)}
            </select>
            {can('procurement.purchase_requests.create') && (
              <button className="hr-btn-primary" onClick={() => navigate('/procurement/purchase-requests/create')}><Plus size={16} /> New PR</button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Req #</th><th>Title</th><th>Requester</th><th>Dept</th><th>Est. Cost</th><th>Priority</th><th>Status</th><th>Needed By</th><th style={{ width: 120 }}>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '20px auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="hr-empty-cell">No purchase requests found</td></tr>
              ) : items.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{r.requisition_number}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{r.title}</td>
                  <td>{r.requested_by_name || '—'}</td>
                  <td>{r.department || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{naira(r.estimated_cost)}</td>
                  <td><span className={`card-badge ${r.priority === 'high' || r.priority === 'urgent' ? 'red' : r.priority === 'medium' ? 'orange' : 'green'}`}>{capitalize(r.priority)}</span></td>
                  <td><span className={`status-badge ${r.status}`}><span className="status-dot" />{fmtStatus(r.status)}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.needed_by ? fmtDate(r.needed_by) : '—'}</td>
                  <td>
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => setViewItem(r)} title="View"><Eye size={15} /></button>
                      {can('procurement.purchase_requests.edit') && r.status === 'draft' && (
                        <button className="hr-action-btn" onClick={() => navigate(`/procurement/purchase-requests/${r.id}/edit`)} title="Edit"><Pencil size={15} /></button>
                      )}
                      {can('procurement.purchase_requests.delete') && (
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

      {/* View modal */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Purchase Request Details" size="lg">
        {viewItem && (
          <div className="note-detail">
            <div className="note-detail-header">
              <h3>{viewItem.requisition_number} — {viewItem.title}</h3>
              <div className="note-detail-badges">
                <span className={`card-badge ${viewItem.priority === 'high' || viewItem.priority === 'urgent' ? 'red' : 'orange'}`}>{capitalize(viewItem.priority)}</span>
                <span className={`status-badge ${viewItem.status}`}><span className="status-dot" />{fmtStatus(viewItem.status)}</span>
              </div>
            </div>
            <div className="note-detail-meta">
              <span><strong>Requester:</strong> {viewItem.requested_by_name || '—'}</span>
              <span><strong>Department:</strong> {viewItem.department || '—'}</span>
              <span><strong>Est. Cost:</strong> {naira(viewItem.estimated_cost)}</span>
              <span><strong>Items:</strong> {viewItem.item_count ?? 0}</span>
              {viewItem.needed_by && <span><strong>Needed by:</strong> {fmtDate(viewItem.needed_by)}</span>}
              {viewItem.purchase_order_number && <span><strong>PO:</strong> {viewItem.purchase_order_number}</span>}
              <span><strong>Created:</strong> {fmtDate(viewItem.created_at)}</span>
            </div>
            <div className="note-detail-content">{viewItem.justification || viewItem.notes || 'No description'}</div>
            <div className="hr-form-actions">
              <button className="hr-btn-secondary" onClick={() => setViewItem(null)}>Close</button>
              {can('procurement.purchase_requests.edit') && viewItem.status === 'draft' && (
                <button className="hr-btn-primary" onClick={() => { setViewItem(null); navigate(`/procurement/purchase-requests/${viewItem.id}/edit`) }}><Pencil size={14} /> Edit</button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Cancel Purchase Request" size="sm">
        <div className="hr-confirm-delete">
          <p>Cancel <strong>{deleteTarget?.title || deleteTarget?.requisition_number}</strong>? This will set the status to cancelled.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Cancelling…' : 'Confirm'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
