import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Pencil, Trash2, Eye, AlertCircle, PackageCheck } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { fmtDate } from '../../utils/formatDate'
import { naira } from '../../utils/currency'
import { inventoryApi } from '../../services/procurement'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const STATUSES = ['active', 'inactive', 'out_of_stock']
const PER_PAGE = 15

const INITIAL_FORM = {
  name: '', sku: '', category: '', description: '',
  unit: '', quantity_in_stock: '', reorder_level: '',
  unit_cost: '', location: '', status: 'active',
}

export default function InventoryItems() {
  const { can } = useAuth()

  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [page, setPage] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const [viewItem, setViewItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  /* ─── Fetch ─── */
  const fetchList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await inventoryApi.list({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        low_stock: lowStockOnly || undefined,
        page,
        per_page: PER_PAGE,
      })
      setItems(extractItems(res))
      setMeta(extractMeta(res))
    } catch (err) {
      setError(err.message || 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, lowStockOnly, page])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter, lowStockOnly])

  /* ─── Modal ─── */
  function openCreate() { setEditing(null); setForm(INITIAL_FORM); setFormErrors({}); setModalOpen(true) }
  function openEdit(item) {
    setEditing(item)
    setForm({
      name: item.name || '',
      sku: item.sku || '',
      category: item.category || '',
      description: item.description || '',
      unit: item.unit || '',
      quantity_in_stock: item.quantity_in_stock ?? '',
      reorder_level: item.reorder_level ?? '',
      unit_cost: item.unit_cost ?? '',
      location: item.location || '',
      status: item.status || 'active',
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
      const payload = {
        ...form,
        quantity_in_stock: form.quantity_in_stock !== '' ? Number(form.quantity_in_stock) : undefined,
        reorder_level: form.reorder_level !== '' ? Number(form.reorder_level) : undefined,
        unit_cost: form.unit_cost !== '' ? Number(form.unit_cost) : undefined,
      }
      if (editing) {
        await inventoryApi.update(editing.id, payload)
      } else {
        await inventoryApi.create(payload)
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

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await inventoryApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      fetchList()
    } catch (err) {
      setError(err.message || 'Failed to delete item')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  function isLowStock(item) {
    return item.reorder_level && item.quantity_in_stock <= item.reorder_level
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
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input type="text" placeholder="Search inventory…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s.replace(/_/g, ' '))}</option>)}
            </select>
            <label className="hr-filter-checkbox">
              <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
              Low Stock
            </label>
            {can('procurement.inventory.create') && (
              <button className="hr-btn-primary" onClick={openCreate}><Plus size={16} /> Add Item</button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>In Stock</th>
                <th>Reorder</th>
                <th>Unit Cost</th>
                <th>Location</th>
                <th>Status</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '20px auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="hr-empty-cell">No inventory items found</td></tr>
              ) : items.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{item.name}</td>
                  <td style={{ fontSize: 12, color: 'var(--primary)' }}>{item.sku || '—'}</td>
                  <td style={{ fontSize: 12 }}>{item.category || '—'}</td>
                  <td style={{ fontWeight: 600, color: isLowStock(item) ? 'var(--danger)' : 'inherit' }}>{item.quantity_in_stock ?? 0}</td>
                  <td>{item.reorder_level ?? '—'}</td>
                  <td>{item.unit_cost ? naira(item.unit_cost) : '—'}</td>
                  <td style={{ fontSize: 12 }}>{item.location || '—'}</td>
                  <td><span className={`status-badge ${item.status}`}><span className="status-dot" />{capitalize((item.status || '').replace(/_/g, ' '))}</span></td>
                  <td>
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => setViewItem(item)} title="View"><Eye size={15} /></button>
                      {can('procurement.inventory.edit') && (
                        <button className="hr-action-btn" onClick={() => openEdit(item)} title="Edit"><Pencil size={15} /></button>
                      )}
                      {can('procurement.inventory.delete') && (
                        <button className="hr-action-btn danger" onClick={() => setDeleteTarget(item)} title="Delete"><Trash2 size={15} /></button>
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

      {/* View */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Inventory Item" size="md">
        {viewItem && (
          <div className="note-detail">
            <div className="note-detail-header"><h3>{viewItem.name}</h3></div>
            <div className="note-detail-meta">
              <span><strong>SKU:</strong> {viewItem.sku || '—'}</span>
              <span><strong>Category:</strong> {viewItem.category || '—'}</span>
              <span><strong>Unit:</strong> {viewItem.unit || '—'}</span>
              <span><strong>In Stock:</strong> {viewItem.quantity_in_stock ?? 0}</span>
              <span><strong>Reorder Level:</strong> {viewItem.reorder_level ?? '—'}</span>
              <span><strong>Unit Cost:</strong> {viewItem.unit_cost ? naira(viewItem.unit_cost) : '—'}</span>
              <span><strong>Location:</strong> {viewItem.location || '—'}</span>
              <span><strong>Status:</strong> {capitalize((viewItem.status || '').replace(/_/g, ' '))}</span>
              <span><strong>Added:</strong> {fmtDate(viewItem.created_at)}</span>
            </div>
            <div className="note-detail-content">{viewItem.description || 'No description'}</div>
            <div className="hr-form-actions">
              <button className="hr-btn-secondary" onClick={() => setViewItem(null)}>Close</button>
              {can('procurement.inventory.edit') && (
                <button className="hr-btn-primary" onClick={() => { setViewItem(null); openEdit(viewItem) }}><Pencil size={14} /> Edit</button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Create / Edit */}
      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Item' : 'Add Inventory Item'} size="md">
        <form onSubmit={handleSubmit} className="hr-form">
          {formErrors._general && <div className="hr-form-error">{formErrors._general}</div>}
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Name *</label>
              <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} required placeholder="Item name" />
              {formErrors.name && <span className="hr-field-error">{formErrors.name[0]}</span>}
            </div>
            <div className="hr-form-field">
              <label>SKU</label>
              <input type="text" value={form.sku} onChange={(e) => updateField('sku', e.target.value)} placeholder="e.g. PAPER-A4-001" />
              {formErrors.sku && <span className="hr-field-error">{formErrors.sku[0]}</span>}
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Category</label>
              <input type="text" value={form.category} onChange={(e) => updateField('category', e.target.value)} placeholder="e.g. Office Supplies" />
            </div>
            <div className="hr-form-field">
              <label>Unit</label>
              <input type="text" value={form.unit} onChange={(e) => updateField('unit', e.target.value)} placeholder="e.g. ream, box, pcs" />
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Quantity in Stock</label>
              <input type="number" value={form.quantity_in_stock} onChange={(e) => updateField('quantity_in_stock', e.target.value)} min="0" placeholder="0" />
            </div>
            <div className="hr-form-field">
              <label>Reorder Level</label>
              <input type="number" value={form.reorder_level} onChange={(e) => updateField('reorder_level', e.target.value)} min="0" placeholder="0" />
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Unit Cost (NGN)</label>
              <input type="number" value={form.unit_cost} onChange={(e) => updateField('unit_cost', e.target.value)} min="0" step="0.01" placeholder="0.00" />
            </div>
            <div className="hr-form-field">
              <label>Location</label>
              <input type="text" value={form.location} onChange={(e) => updateField('location', e.target.value)} placeholder="e.g. Store Room A" />
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s.replace(/_/g, ' '))}</option>)}
              </select>
            </div>
          </div>
          <div className="hr-form-field">
            <label>Description</label>
            <textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} rows={3} placeholder="Item description…" />
          </div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Inventory Item" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete <strong>{deleteTarget?.name}</strong>? This will set the item as inactive.</p>
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
