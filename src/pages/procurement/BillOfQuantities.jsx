import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Pencil, Trash2, Eye, AlertCircle, Send, CheckCircle } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import { boqApi } from '../../services/procurement'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const STATUSES = ['draft', 'submitted', 'approved', 'revised']
const PER_PAGE = 25

function fmtStatus(s) { return capitalize((s || 'draft').replace(/_/g, ' ')) }
function statusColor(s) {
  switch (s) { case 'draft': return 'gray'; case 'submitted': return 'blue'; case 'approved': return 'approved'; case 'revised': return 'orange'; default: return '' }
}

export default function BillOfQuantities() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)

  const [viewItem, setViewItem] = useState(null)
  const [viewDetail, setViewDetail] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [statusBusy, setStatusBusy] = useState(null) // { id, action }

  const fetchList = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await boqApi.list({ search: debouncedSearch || undefined, status: statusFilter || undefined, sort_by: sortBy, sort_dir: sortDir, page, per_page: PER_PAGE })
      const data = res?.data || res
      setItems(data?.boqs || extractItems(res))
      setMeta(data?.meta || extractMeta(res))
    } catch (err) { setError(err.message || 'Failed to load BOQs') }
    finally { setLoading(false) }
  }, [debouncedSearch, statusFilter, sortBy, sortDir, page])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter])

  function toggleSort(col) {
    if (sortBy === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  async function openView(item) {
    setViewItem(item); setViewDetail(null); setViewLoading(true)
    try {
      const res = await boqApi.get(item.id)
      const data = res?.data?.boq || res?.data || res
      setViewDetail(data)
    } catch { /* keep summary only */ }
    finally { setViewLoading(false) }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try { await boqApi.delete(deleteTarget.id); setDeleteTarget(null); fetchList() }
    catch (err) { setError(err.message || 'Failed to delete BOQ'); setDeleteTarget(null) }
    finally { setDeleting(false) }
  }

  async function handleStatusChange(item, action) {
    setStatusBusy({ id: item.id, action })
    setError('')
    try {
      if (action === 'submit') await boqApi.submit(item.id)
      else if (action === 'approve') await boqApi.approve(item.id)
      fetchList()
    } catch (err) {
      // Surface server message verbatim (likely a 403 or 422 for disallowed transitions)
      setError(err.errors ? Object.values(err.errors).flat().join(', ') : (err.message || 'Failed to update BOQ status'))
    } finally {
      setStatusBusy(null)
    }
  }

  const SortTh = ({ col, children }) => (
    <th onClick={() => toggleSort(col)} style={{ cursor: 'pointer', userSelect: 'none' }}>
      {children} {sortBy === col ? (sortDir === 'asc' ? '\u25B2' : '\u25BC') : ''}
    </th>
  )

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
            <div className="search-box"><Search size={16} className="search-icon" /><input type="text" placeholder="Search BOQs..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}
            </select>
            {can('procurement.boq.create') && (
              <button className="hr-btn-primary" onClick={() => navigate('/procurement/boq/create')}><Plus size={16} /> New BOQ</button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <SortTh col="boq_number">BOQ #</SortTh>
                <SortTh col="title">Title</SortTh>
                <th>Department</th>
                <SortTh col="status">Status</SortTh>
                <SortTh col="date">Date</SortTh>
                <th>Grand Total</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '12px auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="hr-empty-cell">No BOQs found</td></tr>
              ) : items.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{r.boq_number}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{r.title || '\u2014'}</td>
                  <td>{r.department || '\u2014'}</td>
                  <td><span className={`status-badge ${statusColor(r.status)}`}><span className="status-dot" />{fmtStatus(r.status)}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(r.date || r.created_at)}</td>
                  <td style={{ fontWeight: 600 }}>{naira(r.grand_total)}</td>
                  <td>
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => openView(r)} title="View"><Eye size={15} /></button>
                      {can('procurement.boq.edit') && (r.status === 'draft' || r.status === 'revised') && (
                        <button className="hr-action-btn" onClick={() => navigate(`/procurement/boq/${r.id}/edit`)} title="Edit"><Pencil size={15} /></button>
                      )}
                      {can('procurement.boq.edit') && (r.status === 'draft' || r.status === 'revised') && (
                        <button
                          className="hr-action-btn"
                          onClick={() => handleStatusChange(r, 'submit')}
                          disabled={statusBusy?.id === r.id}
                          title="Submit for approval"
                        >
                          <Send size={15} />
                        </button>
                      )}
                      {can('procurement.boq.approve') && r.status === 'submitted' && (
                        <button
                          className="hr-action-btn"
                          style={{ color: 'var(--success, #16a34a)' }}
                          onClick={() => handleStatusChange(r, 'approve')}
                          disabled={statusBusy?.id === r.id}
                          title="Approve BOQ"
                        >
                          <CheckCircle size={15} />
                        </button>
                      )}
                      {can('procurement.boq.delete') && r.status !== 'approved' && (
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

      {/* View Detail Modal */}
      <Modal open={!!viewItem} onClose={() => { setViewItem(null); setViewDetail(null) }} title="BOQ Details" size="lg">
        {viewItem && (
          <div>
            <div className="view-modal-grid" style={{ marginBottom: 20 }}>
              <div className="view-modal-field"><label>BOQ Number</label><p>{viewItem.boq_number}</p></div>
              <div className="view-modal-field"><label>Title</label><p>{viewItem.title || '\u2014'}</p></div>
              <div className="view-modal-field"><label>Department</label><p>{viewItem.department || '\u2014'}</p></div>
              <div className="view-modal-field"><label>Project Code</label><p>{viewItem.project_code || '\u2014'}</p></div>
              <div className="view-modal-field"><label>PR Reference</label><p>{viewItem.pr_reference || '\u2014'}</p></div>
              <div className="view-modal-field"><label>Prepared By</label><p>{viewItem.prepared_by || '\u2014'}</p></div>
              <div className="view-modal-field"><label>Category</label><p>{viewItem.category || '\u2014'}</p></div>
              <div className="view-modal-field"><label>Delivery Location</label><p>{viewItem.delivery_location || '\u2014'}</p></div>
              <div className="view-modal-field"><label>Date</label><p>{fmtDate(viewItem.date || viewItem.created_at)}</p></div>
              <div className="view-modal-field"><label>Status</label><p><span className={`status-badge ${statusColor(viewItem.status)}`}><span className="status-dot" />{fmtStatus(viewItem.status)}</span></p></div>
              <div className="view-modal-field"><label>Grand Total</label><p style={{ fontWeight: 700 }}>{naira(viewItem.grand_total)}</p></div>
              <div className="view-modal-field"><label>Items</label><p>{viewItem.item_count ?? '\u2014'}</p></div>
              {viewItem.notes && <div className="view-modal-field full"><label>Notes</label><p>{viewItem.notes}</p></div>}
            </div>

            {viewLoading ? (
              <div style={{ textAlign: 'center', padding: 16 }}><div className="auth-spinner" /></div>
            ) : viewDetail?.items?.length > 0 && (
              <>
                <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600 }}>Line Items</h4>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead><tr><th>#</th><th>Section</th><th>Description</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Total</th><th>Comment</th></tr></thead>
                    <tbody>
                      {viewDetail.items.map((it, i) => (
                        <tr key={it.id || i}>
                          <td>{i + 1}</td>
                          <td>{it.section || '\u2014'}</td>
                          <td>{it.description}</td>
                          <td>{it.unit || '\u2014'}</td>
                          <td>{it.quantity}</td>
                          <td>{naira(it.unit_rate)}</td>
                          <td style={{ fontWeight: 600 }}>{naira(it.total)}</td>
                          <td>{it.comment || '\u2014'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {viewDetail?.signoffs?.length > 0 && (
              <>
                <h4 style={{ margin: '16px 0 8px', fontSize: 13, fontWeight: 600 }}>Sign-offs</h4>
                <div className="view-modal-grid">
                  {viewDetail.signoffs.map((s, i) => (
                    <div key={i} className="view-modal-field">
                      <label>{capitalize((s.type || '').replace(/_/g, ' '))}</label>
                      <p>{s.name || '\u2014'} {s.position ? `(${s.position})` : ''}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete BOQ" size="sm">
        <div className="hr-confirm-delete">
          <p>Are you sure you want to delete this BOQ?</p>
          <p><strong>{deleteTarget?.boq_number}</strong> - {deleteTarget?.title}</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</button>
          </div>
        </div>
      </Modal>
    </>
  )
}
