import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, CheckCircle, ChevronDown, Download, Eye, FileText, RefreshCw, RotateCcw, Search, XCircle } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import { approvalsApi, boqApi, purchaseOrdersApi, purchaseRequestsApi } from '../../services/procurement'
import { exportPRtoPDF, exportPRtoCSV } from '../../utils/prExport'
import { exportBOQtoPDF, exportBOQtoCSV } from '../../utils/boqExport'
import { useAuth } from '../../contexts/AuthContext'
import { useDebounce } from '../../hooks/useDebounce'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import ApprovalChain, { buildChainFromPR } from '../../components/ApprovalChain'

function fmtStatus(s) { return capitalize((s || '').replace(/_/g, ' ')) }

const ACTIONS = [
  { key: 'approve',  label: 'Approve',          icon: <CheckCircle size={13} />,  cls: 'approve'  },
  { key: 'revision', label: 'Request Revision',  icon: <RotateCcw size={13} />,   cls: 'revision' },
  { key: 'reject',   label: 'Reject',            icon: <XCircle size={13} />,     cls: 'reject'   },
]

const AUDIT_LABELS = {
  created: 'Created', updated: 'Updated', submitted: 'Submitted for Approval',
  approved: 'Approved', forwarded: 'Forwarded to Procurement',
  revision: 'Revision Requested', rejected: 'Rejected',
}
const STAGE_LABELS = { budget_holder: 'Budget Holder', finance: 'Finance', procurement: 'Procurement', operations: 'Procurement' }

export default function PendingApprovals() {
  const { can, user } = useAuth()
  // Org-wide history is gated on procurement.approvals.view_all.
  // Without it, send mine=1 so the backend scopes results to records that
  // concern the current user (created, named on, acted on, or department-mate).
  const canViewAllHistory = can('procurement.approvals.view_all')

  const [pos, setPos] = useState([])
  const [reqs, setReqs] = useState([])
  const [boqs, setBoqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /* BOQ detail modal */
  const [boqView, setBoqView] = useState(null)
  const [boqDetail, setBoqDetail] = useState(null)
  const [boqDetailLoading, setBoqDetailLoading] = useState(false)
  const [boqAuditLog, setBoqAuditLog] = useState([])
  const [boqAuditLoading, setBoqAuditLoading] = useState(false)

  /* History section */
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState([])
  const [historyMeta, setHistoryMeta] = useState(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const debouncedHistorySearch = useDebounce(historySearch)
  const [historyPage, setHistoryPage] = useState(1)

  /* Detail view modal (PRs only) */
  const [viewTarget, setViewTarget] = useState(null)
  const [viewExtra, setViewExtra] = useState(null)
  const [viewExtraLoading, setViewExtraLoading] = useState(false)
  const [viewAuditLog, setViewAuditLog] = useState([])
  const [viewAuditLoading, setViewAuditLoading] = useState(false)
  const [viewIsHistory, setViewIsHistory] = useState(false)

  /* Action modal */
  const [target, setTarget] = useState(null) // { type: 'po'|'req'|'boq', item }
  const [action, setAction] = useState('approve')
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await approvalsApi.pending()
      const d = res?.data || res || {}
      setPos(d.purchase_orders || [])
      setReqs(d.requisitions || [])
      // Pending-approvals endpoint may already include BOQs. If not, fetch them separately.
      if (Array.isArray(d.boqs)) {
        setBoqs(d.boqs)
      } else {
        try {
          const bres = await boqApi.list({ status: 'submitted', per_page: 0 })
          const bd = bres?.data || bres || {}
          setBoqs(bd.boqs || bd.items || [])
        } catch {
          setBoqs([])
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load pending approvals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError('')
    try {
      const res = await approvalsApi.pending({
        scope: 'history',
        page: historyPage,
        per_page: 10,
        search: debouncedHistorySearch || undefined,
        mine: canViewAllHistory ? undefined : 1,
      })
      const d = res?.data || res || {}
      setHistory(d.requisitions || [])
      setHistoryMeta(d.meta || null)
    } catch (err) {
      setHistoryError(err.message || 'Failed to load history')
    } finally {
      setHistoryLoading(false)
    }
  }, [historyPage, debouncedHistorySearch, canViewAllHistory])

  useEffect(() => { if (historyOpen) fetchHistory() }, [historyOpen, fetchHistory])

  function openDetail(item, isHistory = false) {
    setViewTarget(item)
    setViewIsHistory(isHistory)
    setViewExtra(null)
    setViewAuditLog([])
    setViewExtraLoading(true)
    setViewAuditLoading(true)
    purchaseRequestsApi.get(item.id)
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
    purchaseRequestsApi.auditLog(item.id)
      .then((res) => { const d = res?.data || res || {}; setViewAuditLog(d.audit_log || []) })
      .catch(() => setViewAuditLog([]))
      .finally(() => setViewAuditLoading(false))
  }
  function closeDetail() { setViewTarget(null); setViewExtra(null); setViewAuditLog([]) }

  function openAction(type, item, defaultAction = 'approve') {
    setTarget({ type, item })
    setAction(defaultAction)
    setComments('')
  }
  function closeAction() { setTarget(null); setComments('') }

  async function handleAction(e) {
    e.preventDefault()
    if (!target) return
    setSubmitting(true)
    setError('')
    try {
      const payload = { action, comments: comments || undefined }
      if (target.type === 'po') {
        await purchaseOrdersApi.processApproval(target.item.id, payload)
      } else if (target.type === 'boq') {
        // When approving a BOQ, stamp the Budget Holder sign-off with the approver's details.
        if (action === 'approve' && user) {
          try {
            const cur = await boqApi.get(target.item.id)
            const boq = cur?.data?.boq || cur?.data || cur || {}
            const existing = (boq.signoffs || []).filter((s) => s.type !== 'budget_holder')
            const today = new Date().toISOString().slice(0, 10)
            const bhSignoff = {
              type: 'budget_holder',
              name: user.name || '',
              position: user.department || (user.role ? user.role.replace(/_/g, ' ') : ''),
              email: user.email || '',
              signature: user.name || '',
              date: today,
              budget_available: 'YES',
            }
            await boqApi.update(target.item.id, { signoffs: [...existing, bhSignoff] })
          } catch {
            // Non-fatal: approval still proceeds even if signoff write fails
          }
        }
        await boqApi.processApproval(target.item.id, payload)
      } else {
        await purchaseRequestsApi.processApproval(target.item.id, payload)
      }
      closeAction()
      fetchAll()
    } catch (err) {
      setError(err.message || 'Approval action failed')
    } finally {
      setSubmitting(false)
    }
  }

  function openBoqDetail(boq) {
    setBoqView(boq)
    setBoqDetail(null)
    setBoqAuditLog([])
    setBoqDetailLoading(true)
    setBoqAuditLoading(true)
    boqApi.get(boq.id)
      .then((res) => {
        const d = res?.data?.boq || res?.data || res
        setBoqDetail(d)
      })
      .catch(() => setBoqDetail({}))
      .finally(() => setBoqDetailLoading(false))
    boqApi.auditLog(boq.id)
      .then((res) => { const d = res?.data || res || {}; setBoqAuditLog(d.audit_log || []) })
      .catch(() => setBoqAuditLog([]))
      .finally(() => setBoqAuditLoading(false))
  }
  function closeBoqDetail() { setBoqView(null); setBoqDetail(null); setBoqAuditLog([]) }

  const canApproveBoq = can('procurement.boq.approve')
  const empty = !loading && pos.length === 0 && reqs.length === 0 && boqs.length === 0

  return (
    <>
      {error && (
        <div className="hr-error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="hr-error-dismiss">&times;</button>
        </div>
      )}

      {loading && (
        <div className="card animate-in" style={{ textAlign: 'center', padding: 40 }}>
          <div className="auth-spinner large" style={{ margin: '0 auto' }} />
        </div>
      )}

      {empty && (
        <div className="card animate-in" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          No items pending your approval.
        </div>
      )}

      {/* Purchase Orders */}
      {pos.length > 0 && (
        <div className="card animate-in">
          <div className="card-header">
            <h3>Purchase Orders</h3>
            <span className="card-badge orange">{pos.length} pending</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>PO #</th><th>Vendor</th><th>Amount</th><th>Status</th><th>Approval Chain</th><th style={{ width: 160 }}>Actions</th></tr>
                </thead>
                <tbody>
                  {pos.map((po) => (
                    <tr key={po.id}>
                      <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{po.po_number}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{po.vendor}</td>
                      <td style={{ fontWeight: 600 }}>{naira(po.total_amount)}</td>
                      <td><span className={`status-badge ${po.status}`}><span className="status-dot" />{fmtStatus(po.status)}</span></td>
                      <td>
                        {po.approval_chain?.length
                          ? <ApprovalChain chain={po.approval_chain} />
                          : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{po.approval_progress?.completed ?? 0}/{po.approval_progress?.total ?? 0} stages</span>
                        }
                      </td>
                      <td>
                        <div className="approvals-action-row">
                          <button className="approval-action-btn approve"  onClick={() => openAction('po', po, 'approve')}  title="Approve"><CheckCircle size={13} /> Approve</button>
                          <button className="approval-action-btn revision" onClick={() => openAction('po', po, 'revision')} title="Request Revision"><RotateCcw size={13} /></button>
                          <button className="approval-action-btn reject"   onClick={() => openAction('po', po, 'reject')}   title="Reject"><XCircle size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Requests */}
      {reqs.length > 0 && (
        <div className="card animate-in">
          <div className="card-header">
            <h3>Purchase Requests</h3>
            <span className="card-badge blue">{reqs.length} pending</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {/* Mobile cards */}
            <div className="approval-cards-mobile">
              {reqs.map((req) => {
                const priorityCls = req.priority === 'high' || req.priority === 'urgent' ? 'red' : req.priority === 'medium' ? 'orange' : 'green'
                return (
                  <div key={req.id} className="approval-card">
                    <div className="approval-card-header">
                      <div className="approval-card-ref">{req.requisition_number}</div>
                      <span className={`card-badge ${priorityCls}`}>{capitalize(req.priority)}</span>
                    </div>
                    <div className="approval-card-title">{req.title}</div>
                    <div className="approval-card-meta">
                      <span>{req.requested_by_name || '—'}</span>
                      <span className="approval-card-amount">{naira(req.estimated_cost)}</span>
                    </div>
                    <div className="approval-card-chain"><ApprovalChain chain={buildChainFromPR(req)} /></div>
                    <div className="approval-card-actions">
                      <button className="approval-card-view-btn" onClick={() => openDetail(req)}><Eye size={14} /> View Details</button>
                      <div className="approval-card-quick">
                        <button className="approval-action-btn approve"  onClick={() => openAction('req', req, 'approve')}><CheckCircle size={12} /> Approve</button>
                        <button className="approval-action-btn revision" onClick={() => openAction('req', req, 'revision')}><RotateCcw size={12} /></button>
                        <button className="approval-action-btn reject"   onClick={() => openAction('req', req, 'reject')}><XCircle size={12} /></button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Desktop table */}
            <div className="approval-table-desktop">
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>Title / Project</th><th>Requester</th><th>Est. Cost</th><th>Approval Chain</th><th style={{ width: 160 }}>Actions</th></tr>
                  </thead>
                  <tbody>
                    {reqs.map((req) => (
                      <tr key={req.id}>
                        <td>
                          <div className="approvals-meta">
                            <span className="approvals-meta-main">{req.title}</span>
                            <span className="approvals-meta-sub" style={{ color: 'var(--primary)', fontSize: 11 }}>{req.requisition_number}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 12 }}>{req.requested_by_name || '—'}</td>
                        <td style={{ fontWeight: 600 }}>{naira(req.estimated_cost)}</td>
                        <td><ApprovalChain chain={buildChainFromPR(req)} /></td>
                        <td>
                          <div className="approvals-action-row">
                            <button className="hr-action-btn" onClick={() => openDetail(req)} title="View full details"><Eye size={13} /></button>
                            <button className="approval-action-btn approve"  onClick={() => openAction('req', req, 'approve')}  title="Approve"><CheckCircle size={13} /> Approve</button>
                            <button className="approval-action-btn revision" onClick={() => openAction('req', req, 'revision')} title="Revision"><RotateCcw size={13} /></button>
                            <button className="approval-action-btn reject"   onClick={() => openAction('req', req, 'reject')}   title="Reject"><XCircle size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bill of Quantities */}
      {boqs.length > 0 && (
        <div className="card animate-in">
          <div className="card-header">
            <h3>Bills of Quantities</h3>
            <span className="card-badge purple">{boqs.length} pending</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {/* Mobile cards */}
            <div className="approval-cards-mobile">
              {boqs.map((boq) => (
                <div key={boq.id} className="approval-card">
                  <div className="approval-card-header">
                    <div className="approval-card-ref">{boq.boq_number}</div>
                    <span className="card-badge blue">{capitalize(boq.category || 'boq')}</span>
                  </div>
                  <div className="approval-card-title">{boq.title}</div>
                  <div className="approval-card-meta">
                    <span>{boq.prepared_by || '—'}</span>
                    <span className="approval-card-amount">{naira(boq.grand_total)}</span>
                  </div>
                  <div className="approval-card-actions">
                    <button className="approval-card-view-btn" onClick={() => openBoqDetail(boq)}><Eye size={14} /> View Details</button>
                    {canApproveBoq && (
                      <div className="approval-card-quick">
                        <button className="approval-action-btn approve"  onClick={() => openAction('boq', boq, 'approve')}><CheckCircle size={12} /> Approve</button>
                        <button className="approval-action-btn revision" onClick={() => openAction('boq', boq, 'revision')}><RotateCcw size={12} /></button>
                        <button className="approval-action-btn reject"   onClick={() => openAction('boq', boq, 'reject')}><XCircle size={12} /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="approval-table-desktop">
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>BOQ # / Title</th><th>Prepared By</th><th>Department</th><th>Grand Total</th><th>Date</th><th style={{ width: 180 }}>Actions</th></tr>
                  </thead>
                  <tbody>
                    {boqs.map((boq) => (
                      <tr key={boq.id}>
                        <td>
                          <div className="approvals-meta">
                            <span className="approvals-meta-main">{boq.title}</span>
                            <span className="approvals-meta-sub" style={{ color: 'var(--primary)', fontSize: 11 }}>{boq.boq_number}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 12 }}>{boq.prepared_by || '—'}</td>
                        <td style={{ fontSize: 12 }}>{boq.department || '—'}</td>
                        <td style={{ fontWeight: 600 }}>{naira(boq.grand_total)}</td>
                        <td style={{ fontSize: 12 }}>{fmtDate(boq.date || boq.created_at)}</td>
                        <td>
                          <div className="approvals-action-row">
                            <button className="hr-action-btn" onClick={() => openBoqDetail(boq)} title="View full details"><Eye size={13} /></button>
                            {canApproveBoq && (
                              <>
                                <button className="approval-action-btn approve"  onClick={() => openAction('boq', boq, 'approve')}  title="Approve"><CheckCircle size={13} /> Approve</button>
                                <button className="approval-action-btn revision" onClick={() => openAction('boq', boq, 'revision')} title="Request Revision"><RotateCcw size={13} /></button>
                                <button className="approval-action-btn reject"   onClick={() => openAction('boq', boq, 'reject')}   title="Reject"><XCircle size={13} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Approval History ─── */}
      <div className="card animate-in" style={{ marginTop: 16 }}>
        <div className="approvals-history-header" onClick={() => setHistoryOpen((o) => !o)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Approval History</h3>
            {historyMeta && <span className="card-badge gray">{historyMeta.total}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {historyOpen && (
              <button
                type="button"
                className="hr-action-btn"
                style={{ width: 28, height: 28 }}
                onClick={(e) => { e.stopPropagation(); fetchHistory() }}
                title="Refresh"
              >
                <RefreshCw size={13} />
              </button>
            )}
            <ChevronDown size={16} style={{ color: 'var(--text-muted)', transition: 'transform 0.2s', transform: historyOpen ? 'rotate(180deg)' : 'none' }} />
          </div>
        </div>

        {historyOpen && (
          <div>
            {historyError && (
              <div className="hr-error-banner" style={{ margin: '0 16px 12px' }}>
                <AlertCircle size={14} /><span>{historyError}</span>
              </div>
            )}
            <div className="hr-toolbar" style={{ borderTop: '1px solid var(--border-color)', padding: '10px 16px' }}>
              <div className="search-box">
                <Search size={15} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search history…"
                  value={historySearch}
                  onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1) }}
                />
              </div>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title / Project</th>
                    <th>Requester</th>
                    <th>Amount</th>
                    <th>Approval Chain</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th style={{ width: 56 }}>View</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr><td colSpan={7} className="hr-empty-cell"><div className="auth-spinner" style={{ margin: '16px auto' }} /></td></tr>
                  ) : history.length === 0 ? (
                    <tr><td colSpan={7} className="hr-empty-cell">No processed approvals yet.</td></tr>
                  ) : history.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="approvals-meta">
                          <span className="approvals-meta-main">{item.title}</span>
                          <span className="approvals-meta-sub" style={{ color: 'var(--primary)', fontSize: 11 }}>{item.requisition_number}</span>
                          <span className="approvals-meta-sub">{item.project_name || item.project_code}</span>
                        </div>
                      </td>
                      <td>
                        <div className="approvals-meta">
                          <span className="approvals-meta-main">{item.requested_by_name || '—'}</span>
                          <span className="approvals-meta-sub">{item.department}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, fontSize: 13 }}>{naira(item.estimated_cost)}</td>
                      <td><ApprovalChain chain={buildChainFromPR(item)} /></td>
                      <td><span className={`status-badge ${item.status}`}><span className="status-dot" />{capitalize((item.status || '').replace(/_/g, ' '))}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(item.submitted_at || item.created_at)}</td>
                      <td><button className="hr-action-btn" onClick={() => openDetail(item, true)} title="View details"><Eye size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {historyMeta && historyMeta.last_page > 1 && <Pagination meta={historyMeta} onPageChange={setHistoryPage} />}
          </div>
        )}
      </div>

      {/* Detail Modal (PRs) */}
      <Modal open={!!viewTarget} onClose={closeDetail} title="Purchase Request Details" size="xl">
        {viewTarget && (() => {
          const pr = viewTarget
          const priorityCls = pr.priority === 'high' || pr.priority === 'urgent' ? 'red' : pr.priority === 'medium' ? 'orange' : 'green'
          return (
            <div className="note-detail">
              <div className="note-detail-header">
                <h3>{pr.requisition_number} — {pr.title}</h3>
                <div className="note-detail-badges">
                  <span className={`card-badge ${priorityCls}`}>{capitalize(pr.priority || 'normal')}</span>
                  <span className={`status-badge ${pr.status}`}><span className="status-dot" />{capitalize((pr.status || '').replace(/_/g, ' '))}</span>
                </div>
              </div>

              <div className="pr-detail-meta-grid">
                <div><strong>Requester</strong><span>{pr.requested_by_name || '—'}</span></div>
                <div><strong>Department</strong><span>{pr.department || '—'}</span></div>
                <div><strong>Project</strong><span>{pr.project_name || pr.project_code || '—'}</span></div>
                {(pr.project_manager_name || pr.project_manager?.name) && <div><strong>Project Manager</strong><span>{pr.project_manager_name || pr.project_manager?.name}</span></div>}
                {pr.budget_holder_name && <div><strong>Budget Holder</strong><span>{pr.budget_holder_name}</span></div>}
                <div><strong>Est. Cost</strong><span style={{ fontWeight: 700 }}>{naira(pr.estimated_cost)}</span></div>
                <div><strong>Items</strong><span>{viewExtra?.item_count ?? pr.item_count ?? 0}</span></div>
                <div><strong>Priority</strong><span>{capitalize(pr.priority || 'normal')}</span></div>
                {(viewExtra?.needed_by ?? pr.needed_by) && <div><strong>Needed By</strong><span>{fmtDate(viewExtra?.needed_by ?? pr.needed_by)}</span></div>}
                {pr.due_date && <div><strong>Due Date</strong><span>{fmtDate(pr.due_date)}</span></div>}
                <div><strong>Submitted</strong><span>{fmtDate(pr.submitted_at || pr.created_at)}</span></div>
                {pr.request_type && <div><strong>Type</strong><span>{pr.request_type.replace(/_/g, ' ')}</span></div>}
              </div>

              {viewExtraLoading
                ? <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}><div className="auth-spinner" /></div>
                : <div className="note-detail-content">
                    {viewExtra?.justification ?? pr.justification ?? pr.notes ?? 'No description provided.'}
                  </div>
              }

              {/* Line Items */}
              {viewExtraLoading ? null : (
                <div className="pr-items-section">
                  <p className="pr-audit-title">Line Items {viewExtra?.items?.length ? `(${viewExtra.items.length})` : ''}</p>
                  {!viewExtra?.items || viewExtra.items.length === 0 ? (
                    <p className="pr-audit-empty">No line items recorded.</p>
                  ) : (
                    <div className="pr-items-table-wrap">
                      <table className="pr-items-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Description</th>
                            <th>Unit</th>
                            <th>Qty</th>
                            <th>Unit Cost</th>
                            <th>Total</th>
                          </tr>
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
                {viewAuditLoading
                  ? <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}><div className="auth-spinner" /></div>
                  : viewAuditLog.length === 0
                    ? <p className="pr-audit-empty">No activity recorded yet.</p>
                    : viewAuditLog.map((entry) => (
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
                <button className="hr-btn-secondary" onClick={closeDetail}>Close</button>
                <button className="hr-btn-secondary" onClick={() => exportPRtoCSV({ ...pr, justification: viewExtra?.justification ?? pr.justification }, viewExtra?.items || [])} title="Download CSV">
                  <Download size={14} /> CSV
                </button>
                <button className="hr-btn-secondary" onClick={() => exportPRtoPDF({ ...pr, justification: viewExtra?.justification ?? pr.justification }, viewExtra?.items || [])} title="Download PDF">
                  <FileText size={14} /> PDF
                </button>
                {!viewIsHistory && (
                  <button className="hr-btn-primary" onClick={() => { closeDetail(); openAction('req', viewTarget, 'approve') }}>
                    Take Action
                  </button>
                )}
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* BOQ Detail Modal */}
      <Modal open={!!boqView} onClose={closeBoqDetail} title="Bill of Quantities Details" size="xl">
        {boqView && (() => {
          const merged = { ...boqView, ...(boqDetail || {}) }
          const items = boqDetail?.items || []
          const signoffs = boqDetail?.signoffs || []
          const grandTotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_rate) || 0), 0) || Number(merged.grand_total) || 0
          return (
            <div className="note-detail">
              <div className="note-detail-header">
                <h3>{merged.boq_number} — {merged.title}</h3>
                <div className="note-detail-badges">
                  <span className="card-badge blue">{capitalize(merged.category || 'boq')}</span>
                  <span className={`status-badge ${merged.status}`}><span className="status-dot" />{capitalize((merged.status || '').replace(/_/g, ' '))}</span>
                </div>
              </div>

              <div className="pr-detail-meta-grid">
                <div><strong>Prepared By</strong><span>{merged.prepared_by || '—'}</span></div>
                <div><strong>Department</strong><span>{merged.department || '—'}</span></div>
                <div><strong>Project</strong><span>{merged.project_code || '—'}</span></div>
                <div><strong>PR Reference</strong><span>{merged.pr_reference || '—'}</span></div>
                <div><strong>Category</strong><span>{merged.category || '—'}</span></div>
                <div><strong>Delivery Location</strong><span>{merged.delivery_location || '—'}</span></div>
                <div><strong>Items</strong><span>{merged.item_count ?? items.length}</span></div>
                <div><strong>Grand Total</strong><span style={{ fontWeight: 700 }}>{naira(grandTotal)}</span></div>
                <div><strong>Date</strong><span>{fmtDate(merged.date || merged.created_at)}</span></div>
              </div>

              {merged.notes && (
                <div className="note-detail-content">{merged.notes}</div>
              )}

              {boqDetailLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}><div className="auth-spinner" /></div>
              ) : (
                <div className="pr-items-section">
                  <p className="pr-audit-title">Line Items {items.length ? `(${items.length})` : ''}</p>
                  {items.length === 0 ? (
                    <p className="pr-audit-empty">No line items recorded.</p>
                  ) : (
                    <div className="pr-items-table-wrap">
                      <table className="pr-items-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Section</th>
                            <th>Description</th>
                            <th>Unit</th>
                            <th>Qty</th>
                            <th>Unit Rate</th>
                            <th>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((it, i) => {
                            const total = (Number(it.quantity) || 0) * (Number(it.unit_rate) || 0)
                            return (
                              <tr key={i}>
                                <td>{i + 1}</td>
                                <td>{it.section || '—'}</td>
                                <td>{it.description || '—'}{it.comment ? <span className="pr-item-sub">{it.comment}</span> : null}</td>
                                <td>{it.unit || '—'}</td>
                                <td style={{ textAlign: 'right' }}>{it.quantity ?? '—'}</td>
                                <td style={{ textAlign: 'right' }}>{naira(it.unit_rate)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{naira(total)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'right', fontWeight: 700 }}>Grand Total</td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>{naira(grandTotal)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {signoffs.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p className="pr-audit-title">Sign-offs</p>
                  <div className="pr-items-table-wrap">
                    <table className="pr-items-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Name</th>
                          <th>Position</th>
                          <th>Email</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {signoffs.map((s, i) => (
                          <tr key={i}>
                            <td>{capitalize((s.type || '').replace(/_/g, ' '))}</td>
                            <td>{s.name || '—'}</td>
                            <td>{s.position || '—'}</td>
                            <td>{s.email || '—'}</td>
                            <td>{s.date ? fmtDate(s.date) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="pr-audit-log">
                <p className="pr-audit-title">Activity Log</p>
                {boqAuditLoading
                  ? <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}><div className="auth-spinner" /></div>
                  : boqAuditLog.length === 0
                    ? <p className="pr-audit-empty">No activity recorded yet.</p>
                    : boqAuditLog.map((entry) => (
                      <div key={entry.id} className={`pr-audit-entry pr-audit-${entry.action}`}>
                        <div className="pr-audit-dot" />
                        <div className="pr-audit-body">
                          <div className="pr-audit-row">
                            <span className="pr-audit-action">{AUDIT_LABELS[entry.action] || entry.action}</span>
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
                <button className="hr-btn-secondary" onClick={closeBoqDetail}>Close</button>
                <button className="hr-btn-secondary" disabled={boqDetailLoading}
                  onClick={() => exportBOQtoCSV(merged, items, signoffs)}
                  title="Download CSV"><Download size={14} /> CSV</button>
                <button className="hr-btn-secondary" disabled={boqDetailLoading}
                  onClick={() => exportBOQtoPDF(merged, items, signoffs)}
                  title="Download PDF"><FileText size={14} /> PDF</button>
                {canApproveBoq && merged.status === 'submitted' && (
                  <button className="hr-btn-primary" onClick={() => { closeBoqDetail(); openAction('boq', boqView, 'approve') }}>
                    Take Action
                  </button>
                )}
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Action Modal */}
      <Modal open={!!target} onClose={closeAction} title="Process Approval" size="sm">
        {target && (
          <form onSubmit={handleAction} className="hr-form">
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>
                {target.type === 'po' ? target.item.po_number
                  : target.type === 'boq' ? target.item.boq_number
                  : target.item.requisition_number}
              </div>
              {(target.type === 'req' || target.type === 'boq') && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{target.item.title}</div>}
            </div>

            {/* Action selector */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {ACTIONS.map(({ key, label, icon, cls }) => (
                <button
                  key={key}
                  type="button"
                  className={`approval-action-btn ${cls}`}
                  style={{ opacity: action === key ? 1 : 0.45, outline: action === key ? '2px solid currentColor' : 'none', outlineOffset: 2 }}
                  onClick={() => setAction(key)}
                >
                  {icon} {label}
                </button>
              ))}
            </div>

            <div className="hr-form-field">
              <label>Comments {(action === 'reject' || action === 'revision') ? '*' : '(optional)'}</label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                placeholder={
                  action === 'reject'   ? 'Reason for rejection (required)…' :
                  action === 'revision' ? 'What needs to be corrected? (required)…' :
                  'Optional comments…'
                }
                required={action === 'reject' || action === 'revision'}
              />
            </div>

            <div className="hr-form-actions">
              <button type="button" className="hr-btn-secondary" onClick={closeAction}>Cancel</button>
              <button
                type="submit"
                className={action === 'reject' ? 'hr-btn-danger' : 'hr-btn-primary'}
                disabled={submitting}
              >
                {submitting ? 'Processing…' : ACTIONS.find((a) => a.key === action)?.label}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
