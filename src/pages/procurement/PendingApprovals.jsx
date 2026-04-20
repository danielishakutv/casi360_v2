import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { naira } from '../../utils/currency'
import { approvalsApi, purchaseOrdersApi, purchaseRequestsApi } from '../../services/procurement'
import Modal from '../../components/Modal'

function fmtStatus(s) { return capitalize((s || '').replace(/_/g, ' ')) }

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

  function openAction(type, item, defaultAction) {
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

      {/* Purchase Orders pending approval */}
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
                  <tr><th>PO #</th><th>Vendor</th><th>Amount</th><th>Status</th><th>Progress</th><th style={{ width: 140 }}>Actions</th></tr>
                </thead>
                <tbody>
                  {pos.map((po) => (
                    <tr key={po.id}>
                      <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{po.po_number}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{po.vendor}</td>
                      <td style={{ fontWeight: 600 }}>{naira(po.total_amount)}</td>
                      <td><span className={`status-badge ${po.status}`}><span className="status-dot" />{fmtStatus(po.status)}</span></td>
                      <td style={{ fontSize: 12 }}>{po.approval_progress?.completed ?? 0}/{po.approval_progress?.total ?? 0}</td>
                      <td>
                        <div className="hr-actions">
                          <button className="hr-action-btn" style={{ color: 'var(--success)' }} onClick={() => openAction('po', po, 'approve')} title="Approve"><CheckCircle size={16} /></button>
                          <button className="hr-action-btn danger" onClick={() => openAction('po', po, 'reject')} title="Reject"><XCircle size={16} /></button>
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

      {/* Requisitions pending approval */}
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
                  <tr><th>Req #</th><th>Title</th><th>Est. Cost</th><th>Status</th><th>Progress</th><th style={{ width: 140 }}>Actions</th></tr>
                </thead>
                <tbody>
                  {reqs.map((req) => (
                    <tr key={req.id}>
                      <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{req.requisition_number}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{req.title}</td>
                      <td style={{ fontWeight: 600 }}>{naira(req.estimated_cost)}</td>
                      <td><span className={`status-badge ${req.status}`}><span className="status-dot" />{fmtStatus(req.status)}</span></td>
                      <td style={{ fontSize: 12 }}>{req.approval_progress?.completed ?? 0}/{req.approval_progress?.total ?? 0}</td>
                      <td>
                        <div className="hr-actions">
                          <button className="hr-action-btn" style={{ color: 'var(--success)' }} onClick={() => openAction('req', req, 'approve')} title="Approve"><CheckCircle size={16} /></button>
                          <button className="hr-action-btn danger" onClick={() => openAction('req', req, 'reject')} title="Reject"><XCircle size={16} /></button>
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

      {/* Approve / Reject Modal */}
      <Modal open={!!target} onClose={closeAction} title={action === 'approve' ? 'Approve Item' : 'Reject Item'} size="sm">
        {target && (
          <form onSubmit={handleAction} className="hr-form">
            <p style={{ marginBottom: 12 }}>
              {action === 'approve' ? 'Approve' : 'Reject'}{' '}
              <strong>{target.type === 'po' ? target.item.po_number : target.item.requisition_number}</strong>?
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button type="button" className={`hr-btn-${action === 'approve' ? 'primary' : 'secondary'}`} onClick={() => setAction('approve')}>Approve</button>
              <button type="button" className={`hr-btn-${action === 'reject' ? 'danger' : 'secondary'}`} onClick={() => setAction('reject')}>Reject</button>
            </div>
            <div className="hr-form-field">
              <label>Comments {action === 'reject' ? '*' : ''}</label>
              <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} placeholder={action === 'reject' ? 'Reason for rejection (required)…' : 'Optional comments…'} required={action === 'reject'} />
            </div>
            <div className="hr-form-actions">
              <button type="button" className="hr-btn-secondary" onClick={closeAction}>Cancel</button>
              <button type="submit" className={action === 'approve' ? 'hr-btn-primary' : 'hr-btn-danger'} disabled={submitting}>
                {submitting ? 'Processing…' : action === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
