import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Pencil, Trash2, Eye, Receipt, AlertCircle, Check, Send, CheckCheck, X, MinusCircle } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import { grnApi, purchaseOrdersApi } from '../../services/procurement'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { usePersistedScope } from '../../hooks/usePersistedScope'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import MineToggle from '../../components/MineToggle'
import DocumentChain from '../../components/DocumentChain'

const STATUSES = ['draft', 'pending_inspection', 'inspected', 'accepted', 'rejected', 'partial']
const PER_PAGE = 15
function fmtStatus(s) { return capitalize((s || 'draft').replace(/_/g, ' ')) }

const INITIAL_FORM = {
  po_reference: '', vendor: '', received_by: '',
  received_date: '', total_amount: '', status: 'draft',
  description: '', notes: '', office: '',
}

export default function GoodsReceivedNote() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canViewAll = can('procurement.grn.view_all')
  const [mine, setMine] = usePersistedScope('casi360.scope.grn', true)
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [viewItem, setViewItem] = useState(null)
  const [viewDetail, setViewDetail] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState(null)
  const [resolvingPo, setResolvingPo] = useState(null)

  /* Dual-confirmation flow */
  const [submitTarget, setSubmitTarget] = useState(null)
  const [submitting2, setSubmitting2] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [confirmAction, setConfirmAction] = useState('accept')
  const [confirmNotes, setConfirmNotes] = useState('')
  const [confirming, setConfirming] = useState(false)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  /* Click handler for the "Record Invoice" button on a GRN row.
     The GRN only stores a po_reference string, so we look up the PO
     by its number to get the UUID the Invoices page expects.
     If no exact match is found, fall back to the Invoices page with
     a search filter so the user can pick the right PO manually. */
  async function recordInvoiceFor(grn) {
    const ref = (grn?.po_reference || '').trim()
    if (!ref) {
      showToast('This GRN has no PO reference recorded.', 'error')
      return
    }
    setResolvingPo(grn.id)
    try {
      const res = await purchaseOrdersApi.list({ search: ref, per_page: 5 })
      const list = extractItems(res)
      const exact = list.find((po) => po.po_number === ref) || list[0]
      if (exact) {
        navigate(`/procurement/invoices?po_id=${exact.id}`)
      } else {
        showToast(`Couldn't find PO "${ref}". Open the Invoices list and pick the right PO.`, 'error')
        navigate('/procurement/invoices')
      }
    } catch {
      showToast('PO lookup failed. Open the Invoices list manually.', 'error')
    } finally {
      setResolvingPo(null)
    }
  }

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await grnApi.list({ search: debouncedSearch || undefined, status: statusFilter || undefined, page, per_page: PER_PAGE, mine: mine ? 1 : 0 })
      setItems(extractItems(res))
      setMeta(extractMeta(res))
    } catch { /* keep current */ }
    finally { setLoading(false) }
  }, [debouncedSearch, statusFilter, page, mine])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter, mine])

  /* Pull GRN detail (with chain) when view modal opens. */
  useEffect(() => {
    if (!viewItem?.id) { setViewDetail(null); return }
    let cancelled = false
    grnApi.get(viewItem.id)
      .then((res) => { if (!cancelled) setViewDetail(res?.data?.grn || null) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [viewItem?.id])

  function openEdit(item) {
    setEditing(item)
    setForm({ po_reference: item.po_reference || '', vendor: item.vendor || '', received_by: item.received_by || '', received_date: item.received_date || '', total_amount: item.total_amount, status: item.status, description: item.description || '', notes: item.notes || '', office: item.office || '' })
    setModalOpen(true)
  }
  function closeModal() { setModalOpen(false); setEditing(null) }
  function updateField(f, v) { setForm((p) => ({ ...p, [f]: v })) }

  /* ─── Dual-confirmation handlers ─── */

  async function confirmSubmit() {
    if (!submitTarget || submitting2) return
    setSubmitting2(true)
    try {
      await grnApi.submit(submitTarget.id)
      showToast('GRN submitted to budget holder for confirmation')
      setSubmitTarget(null)
      fetchList()
    } catch (err) {
      showToast(err.message || 'Submit failed', 'error')
    } finally {
      setSubmitting2(false)
    }
  }

  function openConfirmation(grn, defaultAction = 'accept') {
    setConfirmTarget(grn)
    setConfirmAction(defaultAction)
    setConfirmNotes('')
  }
  function closeConfirmation() {
    if (confirming) return
    setConfirmTarget(null)
    setConfirmNotes('')
  }
  async function submitConfirmation(e) {
    e.preventDefault()
    if (!confirmTarget || confirming) return
    if (confirmAction !== 'accept' && !confirmNotes.trim()) return
    setConfirming(true)
    try {
      await grnApi.processConfirmation(confirmTarget.id, {
        action: confirmAction,
        notes: confirmAction === 'accept' ? (confirmNotes.trim() || undefined) : confirmNotes.trim(),
      })
      const verb = confirmAction === 'accept' ? 'accepted' : confirmAction === 'partial' ? 'partially accepted' : 'rejected'
      showToast(`GRN ${verb}`)
      setConfirmTarget(null)
      setConfirmNotes('')
      fetchList()
    } catch (err) {
      showToast(err.message || 'Action failed', 'error')
    } finally {
      setConfirming(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = { ...form, total_amount: Number(form.total_amount) || 0 }
      if (editing) {
        await grnApi.update(editing.id, payload)
      } else {
        await grnApi.create(payload)
      }
      closeModal()
      fetchList()
    } catch { /* ignore */ }
    finally { setSubmitting(false) }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await grnApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      fetchList()
    } catch { setDeleteTarget(null) }
  }

  return (
    <>
      {toast && (
        <div className={`hr-error-banner ${toast.type === 'success' ? 'success' : ''}`} style={{ marginBottom: 12 }}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="hr-error-dismiss">&times;</button>
        </div>
      )}

      <div className="card animate-in">
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box"><Search size={16} className="search-icon" /><input type="text" placeholder="Search GRNs…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} /></div>
            <MineToggle value={mine} onChange={setMine} canViewAll={canViewAll} />
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}
            </select>
            {can('procurement.grn.create') && (
              <button className="hr-btn-primary" onClick={() => navigate('/procurement/grn/create')}><Plus size={16} /> New GRN</button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>GRN #</th><th>PO Ref</th><th>Vendor</th><th>Received By</th><th>Amount</th><th>Received</th><th>Status</th><th style={{ width: 120 }}>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '12px auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="hr-empty-cell">No GRNs found</td></tr>
              ) : items.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{r.grn_number}</td>
                  <td>{r.po_reference || '—'}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{r.vendor || '—'}</td>
                  <td>{r.received_by || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{naira(r.total_amount)}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(r.received_date)}</td>
                  <td><span className={`status-badge ${r.status.replace(/ /g, '_')}`}><span className="status-dot" />{fmtStatus(r.status)}</span></td>
                  <td>
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => setViewItem(r)} title="View"><Eye size={15} /></button>

                      {/* Receiver: submit draft for confirmation */}
                      {can('procurement.grn.edit') && r.status === 'draft' && (
                        <button
                          className="hr-action-btn success"
                          onClick={() => setSubmitTarget(r)}
                          title="Submit for budget-holder confirmation"
                        >
                          <Send size={15} />
                        </button>
                      )}

                      {/* Budget holder: confirm or reject */}
                      {can('procurement.grn.confirm') && r.status === 'pending_inspection' && (
                        <>
                          <button className="approval-action-btn approve" onClick={() => openConfirmation(r, 'accept')} title="Accept">
                            <CheckCheck size={12} />
                          </button>
                          <button className="approval-action-btn revision" onClick={() => openConfirmation(r, 'partial')} title="Partially accept">
                            <MinusCircle size={12} />
                          </button>
                          <button className="approval-action-btn reject" onClick={() => openConfirmation(r, 'reject')} title="Reject">
                            <X size={12} />
                          </button>
                        </>
                      )}

                      {can('procurement.invoices.create') && ['inspected', 'accepted', 'partial'].includes(r.status) && r.po_reference && (
                        <button
                          className="hr-action-btn"
                          onClick={() => recordInvoiceFor(r)}
                          disabled={resolvingPo === r.id}
                          title="Record vendor invoice for this PO"
                        >
                          <Receipt size={15} />
                        </button>
                      )}
                      {can('procurement.grn.edit') && r.status === 'draft' && (
                        <button className="hr-action-btn" onClick={() => openEdit(r)} title="Edit"><Pencil size={15} /></button>
                      )}
                      {can('procurement.grn.delete') && r.status === 'draft' && (
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

      <Modal open={!!viewItem} onClose={() => { setViewItem(null); setViewDetail(null) }} title="GRN Details" size="md">
        {viewItem && (
          <div className="note-detail">
            <div className="note-detail-header"><h3>{viewItem.grn_number}</h3></div>
            {viewDetail?.chain && <DocumentChain chain={viewDetail.chain} current="grn" />}
            <div className="note-detail-meta">
              <span><strong>PO Reference:</strong> {viewItem.po_reference || '—'}</span>
              <span><strong>Vendor:</strong> {viewItem.vendor || '—'}</span>
              <span><strong>Received by:</strong> {viewItem.received_by || '—'}</span>
              <span><strong>Date received:</strong> {fmtDate(viewItem.received_date)}</span>
              <span><strong>Amount:</strong> {naira(viewItem.total_amount)}</span>
              <span><strong>Status:</strong> {fmtStatus(viewItem.status)}</span>
            </div>

            {/* Confirmation history — visible once submitted/confirmed */}
            {(viewDetail?.submitted_at || viewDetail?.confirmed_at) && (
              <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-card-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 8 }}>Confirmation trail</p>
                {viewDetail.submitted_at && (
                  <div style={{ fontSize: 12, marginBottom: 4 }}>
                    <strong>Submitted:</strong> {fmtDate(viewDetail.submitted_at)}
                  </div>
                )}
                {viewDetail.confirmed_at && (
                  <div style={{ fontSize: 12, marginBottom: 4 }}>
                    <strong>{viewDetail.status === 'rejected' ? 'Rejected' : viewDetail.status === 'partial' ? 'Partially accepted' : 'Accepted'} by:</strong>{' '}
                    {viewDetail.confirmed_by_name || '—'} · {fmtDate(viewDetail.confirmed_at)}
                  </div>
                )}
                {viewDetail.confirmation_notes && (
                  <div style={{ fontSize: 12, marginTop: 6, fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                    “{viewDetail.confirmation_notes}”
                  </div>
                )}
              </div>
            )}

            <div className="note-detail-content">{viewItem.description || viewItem.notes || 'No description'}</div>
            <div className="hr-form-actions">
              <button className="hr-btn-secondary" onClick={() => setViewItem(null)}>Close</button>
              {can('procurement.grn.edit') && viewItem.status === 'draft' && (
                <button className="hr-btn-primary" onClick={() => { setViewItem(null); openEdit(viewItem) }}><Pencil size={14} /> Edit</button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Submit-for-confirmation modal ─── */}
      <Modal open={!!submitTarget} onClose={() => !submitting2 && setSubmitTarget(null)} title="Submit GRN for Confirmation" size="sm">
        {submitTarget && (
          <div className="hr-confirm-delete">
            <p>
              Submit GRN <strong>{submitTarget.grn_number}</strong> to the budget holder for confirmation?
              Once submitted, the GRN is locked from edits until they accept or reject it.
            </p>
            <div className="hr-form-actions">
              <button className="hr-btn-secondary" onClick={() => setSubmitTarget(null)} disabled={submitting2}>Cancel</button>
              <button className="hr-btn-primary" onClick={confirmSubmit} disabled={submitting2}>
                <Send size={14} /> {submitting2 ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Confirmation modal (accept / partial / reject) ─── */}
      <Modal
        open={!!confirmTarget}
        onClose={closeConfirmation}
        title={
          confirmAction === 'accept' ? 'Accept GRN' :
          confirmAction === 'partial' ? 'Partially Accept GRN' :
          'Reject GRN'
        }
        size="sm"
      >
        {confirmTarget && (
          <form onSubmit={submitConfirmation} className="hr-form">
            <div style={{ background: 'var(--bg-card-hover)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>
                {confirmTarget.grn_number}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {confirmTarget.vendor || '—'} · PO {confirmTarget.po_reference || '—'} · {naira(confirmTarget.total_amount)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="approval-action-btn approve"
                style={{ opacity: confirmAction === 'accept' ? 1 : 0.45, outline: confirmAction === 'accept' ? '2px solid currentColor' : 'none', outlineOffset: 2 }}
                onClick={() => setConfirmAction('accept')}
              >
                <CheckCheck size={13} /> Accept
              </button>
              <button
                type="button"
                className="approval-action-btn revision"
                style={{ opacity: confirmAction === 'partial' ? 1 : 0.45, outline: confirmAction === 'partial' ? '2px solid currentColor' : 'none', outlineOffset: 2 }}
                onClick={() => setConfirmAction('partial')}
              >
                <MinusCircle size={13} /> Partial
              </button>
              <button
                type="button"
                className="approval-action-btn reject"
                style={{ opacity: confirmAction === 'reject' ? 1 : 0.45, outline: confirmAction === 'reject' ? '2px solid currentColor' : 'none', outlineOffset: 2 }}
                onClick={() => setConfirmAction('reject')}
              >
                <X size={13} /> Reject
              </button>
            </div>

            <div className="hr-form-field">
              <label>
                {confirmAction === 'accept' ? 'Notes (optional)' :
                 confirmAction === 'partial' ? 'Tell receiver what was missing or short-shipped *' :
                 'Reason for rejection *'}
              </label>
              <textarea
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
                rows={3}
                required={confirmAction !== 'accept'}
                maxLength={2000}
                placeholder={
                  confirmAction === 'accept' ? 'Optional confirmation note…' :
                  confirmAction === 'partial' ? 'e.g. only 8 of 10 boxes received; balance pending.' :
                  'e.g. quantities do not match the PO; goods damaged on arrival.'
                }
                disabled={confirming}
              />
            </div>

            <div className="hr-form-actions">
              <button type="button" className="hr-btn-secondary" onClick={closeConfirmation} disabled={confirming}>Cancel</button>
              <button
                type="submit"
                className={confirmAction === 'reject' ? 'hr-btn-danger' : 'hr-btn-primary'}
                disabled={confirming}
              >
                {confirming ? 'Processing…' :
                 confirmAction === 'accept' ? 'Accept' :
                 confirmAction === 'partial' ? 'Partially Accept' :
                 'Reject'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit GRN' : 'New Goods Received Note'} size="md">
        <form onSubmit={handleSubmit} className="hr-form">
          <div className="hr-form-row">
            <div className="hr-form-field"><label>PO Reference *</label><input type="text" value={form.po_reference} onChange={(e) => updateField('po_reference', e.target.value)} required placeholder="e.g. PO-2026-001" /></div>
            <div className="hr-form-field"><label>Vendor</label><input type="text" value={form.vendor} onChange={(e) => updateField('vendor', e.target.value)} placeholder="Vendor name" /></div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Received By</label><input type="text" value={form.received_by} onChange={(e) => updateField('received_by', e.target.value)} placeholder="Name of receiver" /></div>
            <div className="hr-form-field"><label>Date Received</label><input type="date" value={form.received_date} onChange={(e) => updateField('received_date', e.target.value)} /></div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Total Amount (₦)</label><input type="number" value={form.total_amount} onChange={(e) => updateField('total_amount', e.target.value)} placeholder="0.00" min="0" step="0.01" /></div>
            <div className="hr-form-field"><label>Status</label><select value={form.status} onChange={(e) => updateField('status', e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}</select></div>
          </div>
          <div className="hr-form-field"><label>Description</label><textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} rows={4} placeholder="Items received, quantities, condition…" /></div>
          <div className="hr-form-field"><label>Notes</label><textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} rows={2} placeholder="Additional notes…" /></div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editing ? 'Update' : 'Create GRN'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete GRN" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete <strong>{deleteTarget?.grn_number}</strong>? This cannot be undone.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
      </Modal>
    </>
  )
}
