import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Pencil, Trash2, Eye, AlertCircle, DollarSign } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import { purchaseOrdersApi } from '../../services/procurement'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { usePersistedScope } from '../../hooks/usePersistedScope'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import MineToggle from '../../components/MineToggle'

const STATUSES = ['draft', 'submitted', 'pending_approval', 'approved', 'revision', 'partially_received', 'received', 'cancelled']
const PAYMENT_STATUSES = ['unpaid', 'partially_paid', 'paid']
const PER_PAGE = 15
function fmtStatus(s) { return capitalize((s || 'draft').replace(/_/g, ' ')) }

export default function PurchaseOrders() {
  const navigate = useNavigate()
  const { can } = useAuth()

  const canViewAll = can('procurement.purchase_orders.view_all')
  const [mine, setMine] = usePersistedScope('casi360.scope.purchase_orders', true)

  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const [viewItem, setViewItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  /* ─── Disbursement state ─── */
  const [disbursements, setDisbursements] = useState([])
  const [disbBalance, setDisbBalance] = useState(null)
  const [disbLoading, setDisbLoading] = useState(false)
  const [disbForm, setDisbForm] = useState({ amount: '', payment_method: 'bank_transfer', payment_reference: '', payment_date: '', notes: '' })
  const [disbSubmitting, setDisbSubmitting] = useState(false)
  const [disbError, setDisbError] = useState('')

  const fetchDisbursements = useCallback(async (poId) => {
    setDisbLoading(true)
    setDisbError('')
    try {
      const res = await purchaseOrdersApi.disbursements(poId)
      const d = res?.data || res
      setDisbursements(d.disbursements || [])
      setDisbBalance({ total_amount: d.total_amount, total_disbursed: d.total_disbursed, balance: d.balance })
    } catch {
      setDisbursements([])
      setDisbBalance(null)
    } finally {
      setDisbLoading(false)
    }
  }, [])

  const openView = useCallback((r) => {
    setViewItem(r)
    setDisbursements([])
    setDisbBalance(null)
    setDisbForm({ amount: '', payment_method: 'bank_transfer', payment_reference: '', payment_date: '', notes: '' })
    setDisbError('')
    if (r.status === 'approved' || r.status === 'disbursed' || r.payment_status === 'partially_paid') {
      fetchDisbursements(r.id)
    }
  }, [fetchDisbursements])

  async function submitDisbursement() {
    if (!viewItem) return
    setDisbSubmitting(true)
    setDisbError('')
    try {
      await purchaseOrdersApi.createDisbursement(viewItem.id, {
        amount: Number(disbForm.amount),
        payment_method: disbForm.payment_method,
        payment_reference: disbForm.payment_reference || undefined,
        payment_date: disbForm.payment_date,
        notes: disbForm.notes || undefined,
      })
      setDisbForm({ amount: '', payment_method: 'bank_transfer', payment_reference: '', payment_date: '', notes: '' })
      fetchDisbursements(viewItem.id)
      fetchList()
    } catch (err) {
      const msg = err.data?.errors ? Object.values(err.data.errors).flat()[0] : (err.message || 'Failed to record disbursement')
      setDisbError(msg)
    } finally {
      setDisbSubmitting(false)
    }
  }

  /* ─── Fetch list ─── */
  const fetchList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await purchaseOrdersApi.list({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        page,
        per_page: PER_PAGE,
        mine: mine ? 1 : 0,
      })
      setItems(extractItems(res))
      setMeta(extractMeta(res))
    } catch (err) {
      setError(err.message || 'Failed to load purchase orders')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, page, mine])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter, mine])

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await purchaseOrdersApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      fetchList()
    } catch (err) {
      setError(err.message || 'Failed to cancel purchase order')
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
            <div className="search-box"><Search size={16} className="search-icon" /><input type="text" placeholder="Search purchase orders…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <MineToggle value={mine} onChange={setMine} canViewAll={canViewAll} />
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
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
            <thead><tr><th>PO #</th><th>Vendor</th><th>Amount</th><th>Items</th><th>Payment</th><th>Status</th><th>Created</th><th style={{ width: 120 }}>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '20px auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="hr-empty-cell">No purchase orders found</td></tr>
              ) : items.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{r.po_number}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{r.vendor}</td>
                  <td style={{ fontWeight: 600 }}>{naira(r.total_amount)}</td>
                  <td>{r.item_count ?? 0}</td>
                  <td><span className={`card-badge ${r.payment_status === 'paid' ? 'green' : r.payment_status === 'partially_paid' ? 'orange' : 'red'}`}>{fmtStatus(r.payment_status)}</span></td>
                  <td><span className={`status-badge ${r.status}`}><span className="status-dot" />{fmtStatus(r.status)}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(r.created_at)}</td>
                  <td>
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => openView(r)} title="View"><Eye size={15} /></button>
                      {can('procurement.purchase_orders.edit') && (r.status === 'draft' || r.status === 'revision') && (
                        <button className="hr-action-btn" onClick={() => navigate(`/procurement/purchase-orders/${r.id}/edit`)} title="Edit"><Pencil size={15} /></button>
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
        {meta && <Pagination meta={meta} onPageChange={setPage} />}
      </div>

      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Purchase Order Details" size="lg">
        {viewItem && (
          <div className="note-detail">
            <div className="note-detail-header"><h3>{viewItem.po_number}</h3></div>
            <div className="note-detail-meta">
              <span><strong>Vendor:</strong> {viewItem.vendor}</span>
              <span><strong>Department:</strong> {viewItem.department || '—'}</span>
              <span><strong>Requested by:</strong> {viewItem.requested_by_name || '—'}</span>
              <span><strong>Order Date:</strong> {fmtDate(viewItem.order_date)}</span>
              <span><strong>Delivery:</strong> {fmtDate(viewItem.expected_delivery_date)}</span>
              <span><strong>Subtotal:</strong> {naira(viewItem.subtotal)}</span>
              <span><strong>Tax:</strong> {naira(viewItem.tax_amount)}</span>
              <span><strong>Total:</strong> {naira(viewItem.total_amount)}</span>
              <span><strong>Items:</strong> {viewItem.item_count ?? 0}</span>
              <span><strong>Payment:</strong> {fmtStatus(viewItem.payment_status)}</span>
              <span><strong>Status:</strong> {fmtStatus(viewItem.status)}</span>
              {viewItem.approval_progress && <span><strong>Approvals:</strong> {viewItem.approval_progress.completed}/{viewItem.approval_progress.total}</span>}
              <span><strong>Created:</strong> {fmtDate(viewItem.created_at)}</span>
            </div>
            <div className="note-detail-content">{viewItem.notes || 'No notes'}</div>

            {/* ── Disbursements Section ── */}
            {(viewItem.status === 'approved' || viewItem.status === 'disbursed' || viewItem.payment_status === 'partially_paid') && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <DollarSign size={16} /> Disbursements
                  {disbBalance && (
                    <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>
                      Disbursed: {naira(disbBalance.total_disbursed)} / {naira(disbBalance.total_amount)} — Balance: {naira(disbBalance.balance)}
                    </span>
                  )}
                </h4>

                {disbLoading ? (
                  <div className="auth-spinner" style={{ margin: '12px auto' }} />
                ) : disbursements.length > 0 ? (
                  <div className="table-wrapper" style={{ marginBottom: 16 }}>
                    <table className="data-table">
                      <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>By</th></tr></thead>
                      <tbody>
                        {disbursements.map((d) => (
                          <tr key={d.id}>
                            <td style={{ fontSize: 12 }}>{fmtDate(d.payment_date)}</td>
                            <td style={{ fontWeight: 600 }}>{naira(d.amount)}</td>
                            <td>{fmtStatus(d.payment_method)}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.payment_reference || '—'}</td>
                            <td style={{ fontSize: 12 }}>{d.disbursed_by_name || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>No disbursements recorded yet.</p>
                )}

                {/* New disbursement form */}
                {can('procurement.disbursements.create') && disbBalance && disbBalance.balance > 0 && (
                  <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: 'var(--surface)' }}>
                    <h5 style={{ marginBottom: 10 }}>Record Payment</h5>

                    {disbError && (
                      <div className="hr-error-banner" style={{ marginBottom: 12 }}>
                        <AlertCircle size={14} /><span>{disbError}</span>
                        <button type="button" onClick={() => setDisbError('')} className="hr-error-dismiss">&times;</button>
                      </div>
                    )}

                    <div className="hr-form-row">
                      <div className="hr-form-field">
                        <label>Amount *</label>
                        <input type="number" value={disbForm.amount} onChange={(e) => setDisbForm((p) => ({ ...p, amount: e.target.value }))} min="0.01" max={disbBalance.balance} step="0.01" placeholder={`Max ${naira(disbBalance.balance)}`} required />
                      </div>
                      <div className="hr-form-field">
                        <label>Payment Method *</label>
                        <select value={disbForm.payment_method} onChange={(e) => setDisbForm((p) => ({ ...p, payment_method: e.target.value }))}>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="cheque">Cheque</option>
                          <option value="cash">Cash</option>
                          <option value="mobile_money">Mobile Money</option>
                        </select>
                      </div>
                    </div>
                    <div className="hr-form-row">
                      <div className="hr-form-field">
                        <label>Payment Date *</label>
                        <input type="date" value={disbForm.payment_date} onChange={(e) => setDisbForm((p) => ({ ...p, payment_date: e.target.value }))} required />
                      </div>
                      <div className="hr-form-field">
                        <label>Reference</label>
                        <input type="text" value={disbForm.payment_reference} onChange={(e) => setDisbForm((p) => ({ ...p, payment_reference: e.target.value }))} placeholder="e.g. TRF-2024-001" />
                      </div>
                    </div>
                    <div className="hr-form-field">
                      <label>Notes</label>
                      <textarea value={disbForm.notes} onChange={(e) => setDisbForm((p) => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Optional payment notes" />
                    </div>
                    <div className="hr-form-actions" style={{ marginTop: 10 }}>
                      <button type="button" className="hr-btn-primary" onClick={submitDisbursement} disabled={disbSubmitting || !disbForm.amount || !disbForm.payment_date}>
                        {disbSubmitting ? 'Recording…' : 'Record Payment'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="hr-form-actions" style={{ marginTop: 16 }}>
              <button className="hr-btn-secondary" onClick={() => setViewItem(null)}>Close</button>
              {can('procurement.purchase_orders.edit') && (viewItem.status === 'draft' || viewItem.status === 'revision') && (
                <button className="hr-btn-primary" onClick={() => { setViewItem(null); navigate(`/procurement/purchase-orders/${viewItem.id}/edit`) }}><Pencil size={14} /> Edit</button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Cancel Purchase Order" size="sm">
        <div className="hr-confirm-delete">
          <p>Cancel <strong>{deleteTarget?.po_number}</strong>? This will set the status to cancelled.</p>
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
