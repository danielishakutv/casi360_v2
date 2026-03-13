import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import { demoPurchaseRequests } from '../../data/procurementDemo'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const STATUSES = ['draft', 'pending', 'approved', 'rejected', 'cancelled']
const PRIORITIES = ['low', 'medium', 'high', 'urgent']
const PER_PAGE = 15

export default function PurchaseRequests() {
  const navigate = useNavigate()
  const [items, setItems] = useState(demoPurchaseRequests)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [page, setPage] = useState(1)

  const [viewItem, setViewItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  /* ─── Client-side filter + paginate ─── */
  const filtered = useMemo(() => {
    let r = items
    if (search) { const q = search.toLowerCase(); r = r.filter((i) => ((i.title || '') + (i.requester || '') + (i.department || '') + (i.pr_number || '')).toLowerCase().includes(q)) }
    if (statusFilter) r = r.filter((i) => i.status === statusFilter)
    if (priorityFilter) r = r.filter((i) => i.priority === priorityFilter)
    return r
  }, [items, search, statusFilter, priorityFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const meta = { current_page: page, last_page: totalPages, per_page: PER_PAGE, total: filtered.length, from: filtered.length ? (page - 1) * PER_PAGE + 1 : 0, to: Math.min(page * PER_PAGE, filtered.length) }

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
            <div className="search-box"><Search size={16} className="search-icon" /><input type="text" placeholder="Search purchase requests…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} /></div>
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
            </select>
            <select className="hr-filter-select" value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1) }}>
              <option value="">All Priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{capitalize(p)}</option>)}
            </select>
            <button className="hr-btn-primary" onClick={() => navigate('/procurement/purchase-requests/create')}><Plus size={16} /> New PR</button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>PR #</th><th>Title</th><th>Requester</th><th>Dept</th><th>Amount</th><th>Priority</th><th>Status</th><th>Date</th><th style={{ width: 120 }}>Actions</th></tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={9} className="hr-empty-cell">No purchase requests found</td></tr>
              ) : paged.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{r.pr_number}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{r.title}</td>
                  <td>{r.requester}</td>
                  <td>{r.department}</td>
                  <td style={{ fontWeight: 600 }}>{naira(r.total_amount)}</td>
                  <td><span className={`card-badge ${r.priority === 'high' || r.priority === 'urgent' ? 'red' : r.priority === 'medium' ? 'orange' : 'green'}`}>{capitalize(r.priority)}</span></td>
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

      {/* View modal */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Purchase Request Details" size="lg">
        {viewItem && (
          <div className="note-detail">
            <div className="note-detail-header">
              <h3>{viewItem.pr_number} — {viewItem.title}</h3>
              <div className="note-detail-badges">
                <span className={`card-badge ${viewItem.priority === 'high' || viewItem.priority === 'urgent' ? 'red' : 'orange'}`}>{capitalize(viewItem.priority)}</span>
                <span className={`status-badge ${viewItem.status}`}><span className="status-dot" />{capitalize(viewItem.status)}</span>
              </div>
            </div>
            <div className="note-detail-meta">
              <span><strong>Requester:</strong> {viewItem.requester}</span>
              <span><strong>Department:</strong> {viewItem.department}</span>
              <span><strong>Amount:</strong> {naira(viewItem.total_amount)}</span>
              {viewItem.needed_by && <span><strong>Needed by:</strong> {fmtDate(viewItem.needed_by)}</span>}
              <span><strong>Created:</strong> {fmtDate(viewItem.created_at)}</span>
            </div>
            <div className="note-detail-content">{viewItem.description || 'No description'}</div>
            <div className="hr-form-actions">
              <button className="hr-btn-secondary" onClick={() => setViewItem(null)}>Close</button>
              <button className="hr-btn-primary" onClick={() => { setViewItem(null); navigate(`/procurement/purchase-requests/${viewItem.id}/edit`) }}><Pencil size={14} /> Edit</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Purchase Request" size="sm">
        <div className="hr-confirm-delete">
          <p>Are you sure you want to delete <strong>{deleteTarget?.title || deleteTarget?.pr_number}</strong>? This cannot be undone.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
      </Modal>
    </>
  )
}
