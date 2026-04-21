import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, CheckCircle, XCircle, RotateCcw } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { naira } from '../../utils/currency'
import { approvalsApi, purchaseOrdersApi, purchaseRequestsApi } from '../../services/procurement'
import Modal from '../../components/Modal'
import ApprovalChain, { buildChainFromPR } from '../../components/ApprovalChain'

function fmtStatus(s) { return capitalize((s || '').replace(/_/g, ' ')) }

const ACTIONS = [
  { key: 'approve',  label: 'Approve',          icon: <CheckCircle size={13} />,  cls: 'approve'  },
  { key: 'revision', label: 'Request Revision',  icon: <RotateCcw size={13} />,   cls: 'revision' },
  { key: 'reject',   label: 'Reject',            icon: <XCircle size={13} />,     cls: 'reject'   },
]

export default function PendingApprovals() {
  const [pos, setPos] = useState([])
  const [reqs, setReqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /* Action modal */
  const [target, setTarget] = useState(null) // { type: 'po'|'req', item }
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
    } catch (err) {
      setError(err.message || 'Failed to load pending approvals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

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

  const empty = !loading && pos.length === 0 && reqs.length === 0

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
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Req #</th><th>Title</th><th>Requester</th><th>Est. Cost</th><th>Priority</th><th>Approval Chain</th><th style={{ width: 160 }}>Actions</th></tr>
                </thead>
                <tbody>
                  {reqs.map((req) => (
                    <tr key={req.id}>
                      <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{req.requisition_number}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{req.title}</td>
                      <td style={{ fontSize: 12 }}>{req.requested_by_name || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{naira(req.estimated_cost)}</td>
                      <td>
                        <span className={`card-badge ${req.priority === 'high' || req.priority === 'urgent' ? 'red' : req.priority === 'medium' ? 'orange' : 'green'}`}>
                          {capitalize(req.priority)}
                        </span>
                      </td>
                      <td><ApprovalChain chain={buildChainFromPR(req)} /></td>
                      <td>
                        <div className="approvals-action-row">
                          <button className="approval-action-btn approve"  onClick={() => openAction('req', req, 'approve')}  title="Approve"><CheckCircle size={13} /> Approve</button>
                          <button className="approval-action-btn revision" onClick={() => openAction('req', req, 'revision')} title="Request Revision"><RotateCcw size={13} /></button>
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
      )}

      {/* Action Modal */}
      <Modal open={!!target} onClose={closeAction} title="Process Approval" size="sm">
        {target && (
          <form onSubmit={handleAction} className="hr-form">
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>
                {target.type === 'po' ? target.item.po_number : target.item.requisition_number}
              </div>
              {target.type === 'req' && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{target.item.title}</div>}
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
