import { useState, useEffect, useCallback } from 'react'
import {
  Search, Plus, Pencil, Trash2, Eye, AlertCircle, Check, X,
  CheckCheck, FileText,
} from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import { invoicesApi, purchaseOrdersApi } from '../../services/procurement'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { usePersistedScope } from '../../hooks/usePersistedScope'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import MineToggle from '../../components/MineToggle'

const STATUSES = ['pending', 'approved', 'rejected', 'paid', 'cancelled']
const PER_PAGE = 15

const STATUS_BADGE = {
  pending:   'orange',
  approved:  'green',
  rejected:  'red',
  paid:      'blue',
  cancelled: 'gray',
}

function fmtStatus(s) { return capitalize((s || 'pending').replace(/_/g, ' ')) }

const INITIAL_FORM = {
  po_id: '',
  invoice_number: '',
  amount: '',
  currency: 'NGN',
  invoice_date: new Date().toISOString().slice(0, 10),
  due_date: '',
  notes: '',
}

export default function Invoices() {
  const { can } = useAuth()
  const canViewAll = can('procurement.invoices.view_all')
  const [mine, setMine] = usePersistedScope('casi360.scope.invoices', true)

  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  /* Form modal state */
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [formErrors, setFormErrors] = useState({})

  /* PO picker — fetched lazily on first create-modal open */
  const [poOptions, setPoOptions] = useState([])
  const [poLoading, setPoLoading] = useState(false)

  /* View / approve / delete modal targets */
  const [viewItem, setViewItem] = useState(null)
  const [approvalTarget, setApprovalTarget] = useState(null)
  const [approvalAction, setApprovalAction] = useState('approve')
  const [approvalReason, setApprovalReason] = useState('')
  const [approving, setApproving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  /* ─── Fetch list ─── */
  const fetchList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await invoicesApi.list({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        page,
        per_page: PER_PAGE,
        mine: mine ? 1 : 0,
      })
      setItems(extractItems(res))
      setMeta(extractMeta(res))
    } catch (err) {
      setError(err.message || 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, page, mine])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter, mine])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  /* ─── Lazy-load POs the first time we need them ─── */
  async function ensurePoOptions() {
    if (poOptions.length || poLoading) return
    setPoLoading(true)
    try {
      const res = await purchaseOrdersApi.list({ per_page: 100, mine: 0, sort_by: 'created_at', sort_dir: 'desc' })
      const list = extractItems(res)
      setPoOptions(list)
    } catch {
      // Silent — the user will see an empty PO picker and can search/refresh
    } finally {
      setPoLoading(false)
    }
  }

  /* ─── Create / Edit ─── */
  async function openCreate() {
    setEditing(null)
    setForm(INITIAL_FORM)
    setFormErrors({})
    setModalOpen(true)
    ensurePoOptions()
  }
  async function openEdit(item) {
    setEditing(item)
    setForm({
      po_id: item.po_id || '',
      invoice_number: item.invoice_number || '',
      amount: item.amount ?? '',
      currency: item.currency || 'NGN',
      invoice_date: item.invoice_date || new Date().toISOString().slice(0, 10),
      due_date: item.due_date || '',
      notes: item.notes || '',
    })
    setFormErrors({})
    setModalOpen(true)
    ensurePoOptions()
  }
  function closeModal() {
    if (saving) return
    setModalOpen(false)
    setEditing(null)
    setFormErrors({})
  }
  function updateField(f, v) { setForm((p) => ({ ...p, [f]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setFormErrors({})
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        due_date: form.due_date || null,
        notes: form.notes || null,
      }
      if (editing) {
        await invoicesApi.update(editing.id, payload)
        showToast('Invoice updated')
      } else {
        await invoicesApi.create(payload)
        showToast('Invoice recorded')
      }
      setModalOpen(false)
      setEditing(null)
      fetchList()
    } catch (err) {
      if (err.errors) {
        setFormErrors(err.errors)
      } else {
        showToast(err.message || 'Save failed', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  /* ─── Approve / reject ─── */
  function openApproval(item, defaultAction = 'approve') {
    setApprovalTarget(item)
    setApprovalAction(defaultAction)
    setApprovalReason('')
  }
  function closeApproval() {
    if (approving) return
    setApprovalTarget(null)
    setApprovalReason('')
  }
  async function submitApproval(e) {
    e.preventDefault()
    if (!approvalTarget || approving) return
    if (approvalAction === 'reject' && !approvalReason.trim()) return
    setApproving(true)
    try {
      await invoicesApi.processApproval(approvalTarget.id, {
        action: approvalAction,
        rejected_reason: approvalAction === 'reject' ? approvalReason.trim() : undefined,
      })
      showToast(approvalAction === 'approve' ? 'Invoice approved' : 'Invoice rejected')
      setApprovalTarget(null)
      setApprovalReason('')
      fetchList()
    } catch (err) {
      showToast(err.message || 'Action failed', 'error')
    } finally {
      setApproving(false)
    }
  }

  /* ─── Delete ─── */
  async function confirmDelete() {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      await invoicesApi.delete(deleteTarget.id)
      showToast('Invoice cancelled')
      setDeleteTarget(null)
      fetchList()
    } catch (err) {
      showToast(err.message || 'Cancel failed', 'error')
    } finally {
      setDeleting(false)
    }
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
      {error && (
        <div className="hr-error-banner">
          <AlertCircle size={16} /><span>{error}</span>
          <button onClick={() => setError('')} className="hr-error-dismiss">&times;</button>
        </div>
      )}

      <div className="card animate-in">
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search by invoice #, PO #, vendor, or notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <MineToggle value={mine} onChange={setMine} canViewAll={canViewAll} />
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}
            </select>
            {can('procurement.invoices.create') && (
              <button className="hr-btn-primary" onClick={openCreate}>
                <Plus size={16} /> Record Invoice
              </button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>PO #</th>
                <th>Vendor</th>
                <th>Amount</th>
                <th>Invoice Date</th>
                <th>Due Date</th>
                <th>Status</th>
                <th style={{ width: 200 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="hr-empty-cell"><div className="auth-spinner" style={{ margin: '16px auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="hr-empty-cell">No invoices yet. Click <strong>Record Invoice</strong> to add the first one.</td></tr>
              ) : items.map((inv) => {
                const overdue = inv.due_date && inv.status === 'pending' && new Date(inv.due_date) < new Date()
                return (
                  <tr key={inv.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600 }}>{inv.invoice_number}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', color: 'var(--text-secondary)' }}>{inv.po_number || '—'}</td>
                    <td style={{ fontSize: 12 }}>{inv.vendor_name || '—'}</td>
                    <td style={{ fontWeight: 700, fontSize: 13 }}>{naira(inv.amount, inv.currency)}</td>
                    <td style={{ fontSize: 12 }}>{fmtDate(inv.invoice_date)}</td>
                    <td style={{ fontSize: 12, color: overdue ? 'var(--danger, #e74c3c)' : 'var(--text-muted)', fontWeight: overdue ? 600 : 400 }}>
                      {inv.due_date ? fmtDate(inv.due_date) : '—'}
                      {overdue && <span style={{ marginLeft: 4, fontSize: 10 }}>· OVERDUE</span>}
                    </td>
                    <td>
                      <span className={`card-badge ${STATUS_BADGE[inv.status] || ''}`}>{fmtStatus(inv.status)}</span>
                    </td>
                    <td>
                      <div className="hr-actions">
                        <button className="hr-action-btn" onClick={() => setViewItem(inv)} title="View"><Eye size={15} /></button>
                        {can('procurement.invoices.approve') && inv.status === 'pending' && (
                          <>
                            <button className="approval-action-btn approve" onClick={() => openApproval(inv, 'approve')} title="Approve">
                              <CheckCheck size={12} />
                            </button>
                            <button className="approval-action-btn reject" onClick={() => openApproval(inv, 'reject')} title="Reject">
                              <X size={12} />
                            </button>
                          </>
                        )}
                        {can('procurement.invoices.edit') && inv.status === 'pending' && (
                          <button className="hr-action-btn" onClick={() => openEdit(inv)} title="Edit"><Pencil size={15} /></button>
                        )}
                        {can('procurement.invoices.delete') && !['paid', 'cancelled'].includes(inv.status) && (
                          <button className="hr-action-btn danger" onClick={() => setDeleteTarget(inv)} title="Cancel invoice">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {meta && meta.last_page > 1 && <Pagination meta={meta} onPageChange={setPage} />}
      </div>

      {/* ─── Create / Edit Modal ─── */}
      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Invoice' : 'Record Vendor Invoice'} size="md">
        <form onSubmit={handleSubmit} className="hr-form">
          <div className="hr-form-field">
            <label>Purchase Order *</label>
            <select
              value={form.po_id}
              onChange={(e) => updateField('po_id', e.target.value)}
              required
              disabled={saving || !!editing}
            >
              <option value="">{poLoading ? 'Loading purchase orders…' : 'Select a purchase order'}</option>
              {poOptions.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.po_number}{po.vendor_name ? ` — ${po.vendor_name}` : ''}{po.total_amount ? ` (${naira(po.total_amount, po.currency)})` : ''}
                </option>
              ))}
              {editing && !poOptions.find((p) => p.id === editing.po_id) && (
                <option value={editing.po_id}>{editing.po_number || editing.po_id}</option>
              )}
            </select>
            {formErrors.po_id && <p className="hr-form-error">{formErrors.po_id[0]}</p>}
          </div>

          <div className="hr-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="hr-form-field">
              <label>Supplier Invoice # *</label>
              <input
                type="text"
                value={form.invoice_number}
                onChange={(e) => updateField('invoice_number', e.target.value)}
                placeholder="e.g. INV-2026-001"
                maxLength={100}
                required
                disabled={saving}
              />
              {formErrors.invoice_number && <p className="hr-form-error">{formErrors.invoice_number[0]}</p>}
            </div>
            <div className="hr-form-field">
              <label>Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => updateField('amount', e.target.value)}
                placeholder="0.00"
                required
                disabled={saving}
              />
              {formErrors.amount && <p className="hr-form-error">{formErrors.amount[0]}</p>}
            </div>
          </div>

          <div className="hr-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="hr-form-field">
              <label>Currency</label>
              <input
                type="text"
                value={form.currency}
                onChange={(e) => updateField('currency', e.target.value.toUpperCase())}
                maxLength={6}
                disabled={saving}
              />
            </div>
            <div className="hr-form-field">
              <label>Invoice Date *</label>
              <input
                type="date"
                value={form.invoice_date}
                onChange={(e) => updateField('invoice_date', e.target.value)}
                required
                disabled={saving}
              />
              {formErrors.invoice_date && <p className="hr-form-error">{formErrors.invoice_date[0]}</p>}
            </div>
            <div className="hr-form-field">
              <label>Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => updateField('due_date', e.target.value)}
                disabled={saving}
              />
              {formErrors.due_date && <p className="hr-form-error">{formErrors.due_date[0]}</p>}
            </div>
          </div>

          <div className="hr-form-field">
            <label>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Optional notes — line items, batch number, etc."
              disabled={saving}
            />
          </div>

          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update Invoice' : 'Record Invoice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── View Modal ─── */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Invoice Details" size="md">
        {viewItem && (
          <div className="note-detail">
            <div className="note-detail-header">
              <h3>{viewItem.invoice_number}</h3>
              <div className="note-detail-badges">
                <span className={`card-badge ${STATUS_BADGE[viewItem.status] || ''}`}>{fmtStatus(viewItem.status)}</span>
              </div>
            </div>
            <div className="pr-detail-meta-grid">
              <div><strong>PO Reference</strong><span>{viewItem.po_number || '—'}</span></div>
              <div><strong>Vendor</strong><span>{viewItem.vendor_name || '—'}</span></div>
              <div><strong>Amount</strong><span style={{ fontWeight: 700 }}>{naira(viewItem.amount, viewItem.currency)}</span></div>
              <div><strong>Currency</strong><span>{viewItem.currency || 'NGN'}</span></div>
              <div><strong>Invoice Date</strong><span>{fmtDate(viewItem.invoice_date)}</span></div>
              <div><strong>Due Date</strong><span>{viewItem.due_date ? fmtDate(viewItem.due_date) : '—'}</span></div>
              <div><strong>Recorded By</strong><span>{viewItem.created_by_name || '—'}</span></div>
              {viewItem.approved_by_name && <div><strong>Approved By</strong><span>{viewItem.approved_by_name}</span></div>}
              {viewItem.approved_at && <div><strong>Approved On</strong><span>{fmtDate(viewItem.approved_at)}</span></div>}
            </div>
            {viewItem.notes && (
              <div className="note-detail-content">{viewItem.notes}</div>
            )}
            {viewItem.rejected_reason && (
              <div className="hr-error-banner" style={{ marginTop: 12 }}>
                <AlertCircle size={14} />
                <span><strong>Rejected:</strong> {viewItem.rejected_reason}</span>
              </div>
            )}
            <div className="hr-form-actions">
              <button className="hr-btn-secondary" onClick={() => setViewItem(null)}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Approval Modal ─── */}
      <Modal open={!!approvalTarget} onClose={closeApproval} title={approvalAction === 'approve' ? 'Approve Invoice' : 'Reject Invoice'} size="sm">
        {approvalTarget && (
          <form onSubmit={submitApproval} className="hr-form">
            <div style={{ background: 'var(--bg-card-hover)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>
                {approvalTarget.invoice_number}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {approvalTarget.vendor_name || '—'} · {naira(approvalTarget.amount, approvalTarget.currency)} · PO {approvalTarget.po_number || '—'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              <button
                type="button"
                className="approval-action-btn approve"
                style={{ opacity: approvalAction === 'approve' ? 1 : 0.45, outline: approvalAction === 'approve' ? '2px solid currentColor' : 'none', outlineOffset: 2 }}
                onClick={() => setApprovalAction('approve')}
              >
                <CheckCheck size={13} /> Approve
              </button>
              <button
                type="button"
                className="approval-action-btn reject"
                style={{ opacity: approvalAction === 'reject' ? 1 : 0.45, outline: approvalAction === 'reject' ? '2px solid currentColor' : 'none', outlineOffset: 2 }}
                onClick={() => setApprovalAction('reject')}
              >
                <X size={13} /> Reject
              </button>
            </div>

            <div className="hr-form-field">
              <label>{approvalAction === 'reject' ? 'Reason for rejection *' : 'Comments (optional)'}</label>
              <textarea
                value={approvalReason}
                onChange={(e) => setApprovalReason(e.target.value)}
                rows={3}
                required={approvalAction === 'reject'}
                maxLength={1000}
                placeholder={approvalAction === 'reject' ? 'Tell procurement why this is being rejected so they can correct it…' : 'Optional approval note…'}
                disabled={approving}
              />
            </div>

            <div className="hr-form-actions">
              <button type="button" className="hr-btn-secondary" onClick={closeApproval} disabled={approving}>Cancel</button>
              <button
                type="submit"
                className={approvalAction === 'reject' ? 'hr-btn-danger' : 'hr-btn-primary'}
                disabled={approving}
              >
                {approving ? 'Processing…' : approvalAction === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ─── Delete Confirm ─── */}
      <Modal open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} title="Cancel Invoice" size="sm">
        <div className="hr-confirm-delete">
          <p>Cancel invoice <strong>"{deleteTarget?.invoice_number}"</strong>? It will be marked as cancelled rather than deleted, so the audit trail is preserved.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>Keep</button>
            <button className="hr-btn-danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Cancelling…' : 'Cancel Invoice'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
