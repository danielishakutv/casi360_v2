import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Pencil, Trash2, Eye, Star, AlertCircle } from 'lucide-react'
import { vendorsApi } from '../../services/procurement'
import { capitalize } from '../../utils/capitalize'
import { fmtDate } from '../../utils/formatDate'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const STATUSES = ['active', 'inactive']
const PER_PAGE = 15

function RatingStars({ value }) {
  return (
    <span className="vendor-rating">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={13} className={s <= value ? 'star-filled' : 'star-empty'} />
      ))}
    </span>
  )
}

const INITIAL_FORM = {
  name: '', contact_person: '', email: '', phone: '',
  address: '', city: '', state: '', country: 'Nigeria',
  tax_id: '', bank_name: '', bank_account_number: '',
  status: 'active', notes: '',
}

export default function Vendors() {
  const { can } = useAuth()

  /* -------- List state -------- */
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  /* -------- Modal state -------- */
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  /* -------- View / Delete state -------- */
  const [viewItem, setViewItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  /* ================================================================ */
  /* Fetch list                                                       */
  /* ================================================================ */
  const fetchList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await vendorsApi.list({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        page,
        per_page: PER_PAGE,
      })
      setItems(extractItems(res))
      setMeta(extractMeta(res))
    } catch (err) {
      setError(err.message || 'Failed to load vendors')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, page])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter])

  /* ================================================================ */
  /* Modal handlers                                                   */
  /* ================================================================ */
  function openCreate() {
    setEditing(null)
    setForm(INITIAL_FORM)
    setFormErrors({})
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditing(item)
    setForm({
      name: item.name || '',
      contact_person: item.contact_person || '',
      email: item.email || '',
      phone: item.phone || '',
      address: item.address || '',
      city: item.city || '',
      state: item.state || '',
      country: item.country || 'Nigeria',
      tax_id: item.tax_id || '',
      bank_name: item.bank_name || '',
      bank_account_number: item.bank_account_number || '',
      status: item.status || 'active',
      notes: item.notes || '',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  function closeModal() { setModalOpen(false); setEditing(null); setFormErrors({}) }
  function updateField(f, v) {
    setForm((p) => ({ ...p, [f]: v }))
    if (formErrors[f]) setFormErrors((p) => ({ ...p, [f]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormErrors({})
    try {
      if (editing) {
        await vendorsApi.update(editing.id, form)
      } else {
        await vendorsApi.create(form)
      }
      closeModal()
      fetchList()
    } catch (err) {
      if (err.errors) setFormErrors(err.errors)
      else setFormErrors({ _general: err.message || 'Something went wrong' })
    } finally {
      setSubmitting(false)
    }
  }

  /* ================================================================ */
  /* Delete                                                           */
  /* ================================================================ */
  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await vendorsApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      fetchList()
    } catch (err) {
      setError(err.message || 'Failed to delete vendor')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  /* ================================================================ */
  /* Render                                                           */
  /* ================================================================ */
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
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input type="text" placeholder="Search vendors…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
            </select>
            {can('procurement.vendors.create') && (
              <button className="hr-btn-primary" onClick={openCreate}><Plus size={16} /> Add Vendor</button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vendor Name</th>
                <th>Contact Person</th>
                <th>Email</th>
                <th>Phone</th>
                <th>City</th>
                <th>Status</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '20px auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="hr-empty-cell">No vendors found</td></tr>
              ) : items.map((v) => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{v.name}</td>
                  <td>{v.contact_person || '—'}</td>
                  <td style={{ fontSize: 12 }}>{v.email || '—'}</td>
                  <td style={{ fontSize: 12 }}>{v.phone || '—'}</td>
                  <td style={{ fontSize: 12 }}>{v.city || '—'}</td>
                  <td><span className={`status-badge ${v.status}`}><span className="status-dot" />{capitalize(v.status)}</span></td>
                  <td>
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => setViewItem(v)} title="View"><Eye size={15} /></button>
                      {can('procurement.vendors.edit') && (
                        <button className="hr-action-btn" onClick={() => openEdit(v)} title="Edit"><Pencil size={15} /></button>
                      )}
                      {can('procurement.vendors.delete') && (
                        <button className="hr-action-btn danger" onClick={() => setDeleteTarget(v)} title="Delete"><Trash2 size={15} /></button>
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

      {/* ─── View Modal ─── */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Vendor Details" size="md">
        {viewItem && (
          <div className="note-detail">
            <div className="note-detail-header"><h3>{viewItem.name}</h3></div>
            <div className="note-detail-meta">
              <span><strong>Contact:</strong> {viewItem.contact_person || '—'}</span>
              <span><strong>Email:</strong> {viewItem.email || '—'}</span>
              <span><strong>Phone:</strong> {viewItem.phone || '—'}</span>
              <span><strong>Address:</strong> {viewItem.address || '—'}</span>
              <span><strong>City:</strong> {viewItem.city || '—'}</span>
              <span><strong>State:</strong> {viewItem.state || '—'}</span>
              <span><strong>Country:</strong> {viewItem.country || '—'}</span>
              <span><strong>Tax ID:</strong> {viewItem.tax_id || '—'}</span>
              <span><strong>Bank:</strong> {viewItem.bank_name || '—'}</span>
              <span><strong>Account No:</strong> {viewItem.bank_account_number || '—'}</span>
              <span><strong>PO Count:</strong> {viewItem.purchase_order_count ?? 0}</span>
              <span><strong>Status:</strong> {capitalize(viewItem.status)}</span>
              <span><strong>Added:</strong> {fmtDate(viewItem.created_at)}</span>
            </div>
            <div className="note-detail-content">{viewItem.notes || 'No notes'}</div>
            <div className="hr-form-actions">
              <button className="hr-btn-secondary" onClick={() => setViewItem(null)}>Close</button>
              {can('procurement.vendors.edit') && (
                <button className="hr-btn-primary" onClick={() => { setViewItem(null); openEdit(viewItem) }}><Pencil size={14} /> Edit</button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Create / Edit Modal ─── */}
      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Vendor' : 'Add New Vendor'} size="md">
        <form onSubmit={handleSubmit} className="hr-form">
          {formErrors._general && <div className="hr-form-error">{formErrors._general}</div>}

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Vendor Name *</label>
              <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} required placeholder="Company / business name" />
              {formErrors.name && <span className="hr-field-error">{formErrors.name[0]}</span>}
            </div>
            <div className="hr-form-field">
              <label>Contact Person</label>
              <input type="text" value={form.contact_person} onChange={(e) => updateField('contact_person', e.target.value)} placeholder="Full name" />
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="email@example.com" />
              {formErrors.email && <span className="hr-field-error">{formErrors.email[0]}</span>}
            </div>
            <div className="hr-form-field">
              <label>Phone</label>
              <input type="text" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="08012345678" />
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Address</label>
              <input type="text" value={form.address} onChange={(e) => updateField('address', e.target.value)} placeholder="Street address" />
            </div>
            <div className="hr-form-field">
              <label>City</label>
              <input type="text" value={form.city} onChange={(e) => updateField('city', e.target.value)} placeholder="City" />
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>State</label>
              <input type="text" value={form.state} onChange={(e) => updateField('state', e.target.value)} placeholder="State / province" />
            </div>
            <div className="hr-form-field">
              <label>Country</label>
              <input type="text" value={form.country} onChange={(e) => updateField('country', e.target.value)} placeholder="Country" />
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Tax ID</label>
              <input type="text" value={form.tax_id} onChange={(e) => updateField('tax_id', e.target.value)} placeholder="Tax Identification Number" />
            </div>
            <div className="hr-form-field">
              <label>Bank Name</label>
              <input type="text" value={form.bank_name} onChange={(e) => updateField('bank_name', e.target.value)} placeholder="Bank name" />
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Account Number</label>
              <input type="text" value={form.bank_account_number} onChange={(e) => updateField('bank_account_number', e.target.value)} placeholder="Bank account number" />
            </div>
            <div className="hr-form-field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
              </select>
            </div>
          </div>
          <div className="hr-form-field">
            <label>Notes</label>
            <textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} rows={3} placeholder="Additional notes about this vendor…" />
          </div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Update Vendor' : 'Add Vendor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Delete Confirm ─── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Vendor" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete <strong>{deleteTarget?.name}</strong>? This will set them as inactive.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
