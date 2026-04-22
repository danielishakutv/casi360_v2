import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Pencil, Trash2, Eye, Send, AlertCircle, Download, FileText } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import { purchaseRequestsApi } from '../../services/procurement'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../contexts/AuthContext'
import { exportPRtoPDF, exportPRtoCSV } from '../../utils/prExport'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import ApprovalChain, { buildChainFromPR } from '../../components/ApprovalChain'

const STATUSES = ['draft', 'submitted', 'pending_approval', 'approved', 'rejected', 'revision', 'fulfilled', 'cancelled']
const PRIORITIES = ['low', 'medium', 'high', 'urgent']
const PER_PAGE = 15

const AUDIT_LABELS = {
  created:   'Created',
  updated:   'Updated',
  submitted: 'Submitted for Approval',
  approved:  'Approved',
  forwarded: 'Forwarded to Operations',
  revision:  'Revision Requested',
  rejected:  'Rejected',
}

const STAGE_LABELS = {
  budget_holder: 'Budget Holder',
  finance:       'Finance',
  operations:    'Operations',
}

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
  const [viewExtra, setViewExtra] = useState(null)
  const [viewExtraLoading, setViewExtraLoading] = useState(false)
  const [auditLog, setAuditLog] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [submitTarget, setSubmitTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)

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

  useEffect(() => {
    if (!viewItem) { setViewExtra(null); setAuditLog([]); return }
    setViewExtraLoading(true)
    setAuditLoading(true)
    purchaseRequestsApi.get(viewItem.id)
      .then((res) => {
        const d = res?.data?.data ?? res?.data?.requisition ?? res?.data ?? res ?? {}
        setViewExtra({
          justification: d?.justification ?? d?.notes ?? null,
          item_count:    d?.item_count    ?? null,
          needed_by:     d?.needed_by     ?? null,
          items:         Array.isArray(d?.items) ? d.items : null,
        })
      })
      .catch(() => setViewExtra({}))
      .finally(() => setViewExtraLoading(false))
    purchaseRequestsApi.auditLog(viewItem.id)
      .then((res) => { const d = res?.data || res || {}; setAuditLog(d.audit_log || []) })
      .catch(() => setAuditLog([]))
      .finally(() => setAuditLoading(false))
  }, [viewItem?.id])

  async function confirmSubmit() {
    if (!submitTarget) return
    setSubmitting(true)
    try {
      await purchaseRequestsApi.submit(submitTarget.id)
      setSubmitTarget(null)
      fetchList()
    } catch (err) {
      setError(err.message || 'Failed to submit purchase request')
      setSubmitTarget(null)
    } finally {
      setSubmitting(false)
    }
  }

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
            {can('procurement.requisitions.create') && (
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
                      {can('procurement.requisitions.edit') && (r.status === 'draft' || r.status === 'revision' || r.status === 'rejected') && (
                        <button className="hr-action-btn" onClick={() => navigate(`/procurement/purchase-requests/${r.id}/edit`)} title="Edit"><Pencil size={15} /></button>
                      )}
                      {(r.status === 'draft' || r.status === 'revision' || r.status === 'rejected') && (
                        <button className="hr-action-btn success" onClick={() => setSubmitTarget(r)} title="Submit for Approval"><Send size={15} /></button>
                      )}
                      {can('procurement.requisitions.delete') && (
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
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Purchase Request Details" size="xl">
        {viewItem && (() => {
          const pr = viewItem
          const priorityCls = pr.priority === 'high' || pr.priority === 'urgent' ? 'red' : pr.priority === 'medium' ? 'orange' : 'green'
          return (
            <div className="note-detail">
              <div className="note-detail-header">
                <h3>{pr.requisition_number} — {pr.title}</h3>
                <div className="note-detail-badges">
                  <span className={`card-badge ${priorityCls}`}>{capitalize(pr.priority || 'normal')}</span>
                  <span className={`status-badge ${pr.status}`}><span className="status-dot" />{fmtStatus(pr.status)}</span>
                </div>
              </div>

              <div className="pr-detail-meta-grid">
                <div><strong>Requester</strong><span>{pr.requested_by_name || '—'}</span></div>
                <div><strong>Department</strong><span>{pr.department || '—'}</span></div>
                <div><strong>Project</strong><span>{pr.project_name || pr.project_code || '—'}</span></div>
                <div><strong>Est. Cost</strong><span style={{ fontWeight: 700 }}>{naira(pr.estimated_cost)}</span></div>
                <div><strong>Items</strong><span>{viewExtra?.item_count ?? pr.item_count ?? 0}</span></div>
                <div><strong>Priority</strong><span>{capitalize(pr.priority || 'normal')}</span></div>
                {(viewExtra?.needed_by ?? pr.needed_by) && <div><strong>Needed By</strong><span>{fmtDate(viewExtra?.needed_by ?? pr.needed_by)}</span></div>}
                {pr.purchase_order_number && <div><strong>PO</strong><span>{pr.purchase_order_number}</span></div>}
                <div><strong>Created</strong><span>{fmtDate(pr.created_at)}</span></div>
              </div>

              {viewExtraLoading
                ? <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}><div className="auth-spinner" /></div>
                : <div className="note-detail-content">{viewExtra?.justification ?? pr.justification ?? pr.notes ?? 'No description provided.'}</div>
              }

              {/* Line Items */}
              {!viewExtraLoading && (
                <div className="pr-items-section">
                  <p className="pr-audit-title">Line Items {viewExtra?.items?.length ? `(${viewExtra.items.length})` : ''}</p>
                  {!viewExtra?.items || viewExtra.items.length === 0 ? (
                    <p className="pr-audit-empty">No line items recorded.</p>
                  ) : (
                    <div className="pr-items-table-wrap">
                      <table className="pr-items-table">
                        <thead>
                          <tr><th>#</th><th>Description</th><th>Unit</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr>
                        </thead>
                        <tbody>
                          {viewExtra.items.map((it, i) => {
                            const total = (Number(it.quantity) || 0) * (Number(it.estimated_unit_cost) || 0)
                            return (
                              <tr key={i}>
                                <td>{i + 1}</td>
                                <td>{it.description || '—'}{it.budget_line ? <span className="pr-item-sub">{it.budget_line}</span> : null}</td>
                                <td>{it.unit || '—'}</td>
                                <td style={{ textAlign: 'right' }}>{it.quantity ?? '—'}</td>
                                <td style={{ textAlign: 'right' }}>{naira(it.estimated_unit_cost)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{naira(total)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700 }}>Grand Total</td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>
                              {naira(viewExtra.items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.estimated_unit_cost) || 0), 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <p className="pr-audit-title">Approval Chain</p>
                <ApprovalChain chain={buildChainFromPR(pr)} compact={false} />
              </div>

              <div className="pr-audit-log">
                <p className="pr-audit-title">Activity Log</p>
                {auditLoading
                  ? <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}><div className="auth-spinner" /></div>
                  : auditLog.length === 0
                    ? <p className="pr-audit-empty">No activity recorded yet.</p>
                    : auditLog.map((entry) => (
                      <div key={entry.id} className={`pr-audit-entry pr-audit-${entry.action}`}>
                        <div className="pr-audit-dot" />
                        <div className="pr-audit-body">
                          <div className="pr-audit-row">
                            <span className="pr-audit-action">{AUDIT_LABELS[entry.action] || entry.action}</span>
                            {entry.stage && <span className="pr-audit-stage">{STAGE_LABELS[entry.stage] || entry.stage}</span>}
                            <span className="pr-audit-actor">{entry.actor_name}</span>
                            <span className="pr-audit-time">{fmtDate(entry.created_at)}</span>
                          </div>
                          {entry.comments && <div className="pr-audit-comments">"{entry.comments}"</div>}
                        </div>
                      </div>
                    ))
                }
              </div>

              <div className="hr-form-actions">
                <button className="hr-btn-secondary" onClick={() => setViewItem(null)}>Close</button>
                <button className="hr-btn-secondary" onClick={() => exportPRtoCSV({ ...pr, justification: viewExtra?.justification ?? pr.justification }, viewExtra?.items || [])} title="Download CSV">
                  <Download size={14} /> CSV
                </button>
                <button className="hr-btn-secondary" onClick={() => exportPRtoPDF({ ...pr, justification: viewExtra?.justification ?? pr.justification }, viewExtra?.items || [])} title="Download PDF">
                  <FileText size={14} /> PDF
                </button>
                {can('procurement.requisitions.edit') && (pr.status === 'draft' || pr.status === 'revision' || pr.status === 'rejected') && (
                  <button className="hr-btn-primary" onClick={() => { setViewItem(null); navigate(`/procurement/purchase-requests/${pr.id}/edit`) }}><Pencil size={14} /> Edit</button>
                )}
                {(pr.status === 'draft' || pr.status === 'revision' || pr.status === 'rejected') && (
                  <button className="hr-btn-primary" style={{ background: 'var(--success, #16a34a)' }} onClick={() => { setViewItem(null); setSubmitTarget(pr) }}><Send size={14} /> Submit</button>
                )}
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Submit confirm */}
      <Modal open={!!submitTarget} onClose={() => setSubmitTarget(null)} title="Submit for Approval" size="sm">
        <div className="hr-confirm-delete">
          <p>Submit <strong>{submitTarget?.title || submitTarget?.requisition_number}</strong> for approval? Once submitted it will enter the approval workflow and can no longer be edited.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setSubmitTarget(null)}>Cancel</button>
            <button className="hr-btn-primary" onClick={confirmSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>
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
