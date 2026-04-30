import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Trash2, Eye } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import { rfpApi } from '../../services/procurement'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { usePersistedScope } from '../../hooks/usePersistedScope'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import MineToggle from '../../components/MineToggle'

const STATUSES = ['draft', 'pending', 'submitted', 'approved', 'paid', 'rejected', 'on_hold']
const PER_PAGE = 15
function fmtStatus(s) { return capitalize((s || 'draft').replace(/_/g, ' ')) }

export default function RequestForPayment() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canViewAll = can('procurement.rfp.view_all')
  const [mine, setMine] = usePersistedScope('casi360.scope.rfp', true)
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
      const res = await rfpApi.list({ search: debouncedSearch || undefined, status: statusFilter || undefined, page, per_page: PER_PAGE, mine: mine ? 1 : 0 })
      setItems(extractItems(res))
      setMeta(extractMeta(res))
    } catch { /* keep current */ }
    finally { setLoading(false) }
  }, [debouncedSearch, statusFilter, page, mine])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter, mine])

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await rfpApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      fetchList()
    } catch { setDeleteTarget(null) }
  }

  return (
    <>
      <div className="card animate-in">
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box"><Search size={16} className="search-icon" /><input type="text" placeholder="Search payment requests…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} /></div>
            <MineToggle value={mine} onChange={setMine} canViewAll={canViewAll} />
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}
            </select>
            {can('procurement.rfp.create') && (
              <button className="hr-btn-primary" onClick={() => navigate('/procurement/rfp/create')}><Plus size={16} /> New RFP</button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>RFP #</th><th>PO Ref</th><th>GRN Ref</th><th>Payee</th><th>Amount</th><th>Due Date</th><th>Method</th><th>Status</th><th style={{ width: 120 }}>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="hr-empty-cell">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="hr-empty-cell">No payment requests found</td></tr>
              ) : items.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{r.rfp_number}</td>
                  <td style={{ fontSize: 12 }}>{r.po_reference || '—'}</td>
                  <td style={{ fontSize: 12 }}>{r.grn_reference || '—'}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{r.payee || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{naira(r.total_amount)}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(r.due_date)}</td>
                  <td style={{ fontSize: 12 }}>{r.payment_method ? capitalize(r.payment_method.replace(/_/g, ' ')) : '—'}</td>
                  <td><span className={`status-badge ${r.status.replace(/ /g, '_')}`}><span className="status-dot" />{fmtStatus(r.status)}</span></td>
                  <td>
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => setViewItem(r)} title="View"><Eye size={15} /></button>
                      {can('procurement.rfp.delete') && (
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

      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Payment Request Details" size="lg">
        {viewItem && (
          <div className="note-detail">
            <div className="note-detail-header"><h3>{viewItem.rfp_number}</h3></div>
            <div className="note-detail-meta">
              <span><strong>PO Reference:</strong> {viewItem.po_reference || '—'}</span>
              <span><strong>GRN Reference:</strong> {viewItem.grn_reference || '—'}</span>
              <span><strong>Payee:</strong> {viewItem.payee || '—'}</span>
              <span><strong>Due date:</strong> {fmtDate(viewItem.due_date)}</span>
              <span><strong>Payment method:</strong> {viewItem.payment_method ? capitalize(viewItem.payment_method.replace(/_/g, ' ')) : '—'}</span>
              <span><strong>Status:</strong> {fmtStatus(viewItem.status)}</span>
            </div>
            {viewItem.items && viewItem.items.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ marginBottom: 8 }}>Line Items</h4>
                <div className="table-wrapper">
                  <table className="data-table" style={{ fontSize: 12 }}>
                    <thead><tr><th>Description</th><th>Project Code</th><th>Budget Line</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr></thead>
                    <tbody>
                      {viewItem.items.map((it, idx) => (
                        <tr key={idx}>
                          <td>{it.description}</td>
                          <td>{it.project_code || '—'}</td>
                          <td>{it.budget_line || '—'}</td>
                          <td>{it.quantity}</td>
                          <td>{naira(it.unit_cost)}</td>
                          <td>{naira(it.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ textAlign: 'right', marginTop: 8, fontSize: 13 }}>
                  <div><strong>Subtotal:</strong> {naira(viewItem.subtotal)}</div>
                  <div><strong>Sales Tax:</strong> {naira(viewItem.sales_tax)}</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}><strong>Total:</strong> {naira(viewItem.total_amount)}</div>
                </div>
              </div>
            )}
            {viewItem.description && <div className="note-detail-content">{viewItem.description}</div>}
            <div className="hr-form-actions">
              <button className="hr-btn-secondary" onClick={() => setViewItem(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Payment Request" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete <strong>{deleteTarget?.rfp_number}</strong>? This cannot be undone.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
      </Modal>
    </>
  )
}
