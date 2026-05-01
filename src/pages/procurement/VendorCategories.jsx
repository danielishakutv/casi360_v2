import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Pencil, Trash2, Tag, AlertCircle, Check } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { fmtDate } from '../../utils/formatDate'
import { vendorCategoriesApi } from '../../services/procurement'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const STATUSES = ['active', 'inactive']
const PER_PAGE = 15
const INITIAL_FORM = { name: '', description: '', status: 'active' }

export default function VendorCategories() {
  const { can } = useAuth()

  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [formErrors, setFormErrors] = useState({})

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [statusBusyId, setStatusBusyId] = useState(null)

  /* ─── Fetch list ─── */
  const fetchList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await vendorCategoriesApi.list({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        page,
        per_page: PER_PAGE,
      })
      setItems(extractItems(res))
      setMeta(extractMeta(res))
    } catch (err) {
      setError(err.message || 'Failed to load vendor categories')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, page])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  function openCreate() {
    setEditing(null)
    setForm(INITIAL_FORM)
    setFormErrors({})
    setModalOpen(true)
  }
  function openEdit(item) {
    setEditing(item)
    setForm({ name: item.name || '', description: item.description || '', status: item.status || 'active' })
    setFormErrors({})
    setModalOpen(true)
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
      if (editing) {
        await vendorCategoriesApi.update(editing.id, form)
        showToast('Category updated')
      } else {
        await vendorCategoriesApi.create(form)
        showToast('Category created')
      }
      setModalOpen(false)
      setEditing(null)
      fetchList()
    } catch (err) {
      // Laravel 422 validation errors come through err.errors
      if (err.errors) {
        setFormErrors(err.errors)
      } else {
        showToast(err.message || 'Save failed', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(item) {
    if (statusBusyId) return
    if (!can('procurement.vendor_categories.edit')) return
    const next = item.status === 'active' ? 'inactive' : 'active'
    setStatusBusyId(item.id)
    // Optimistic UI
    setItems((prev) => prev.map((c) => c.id === item.id ? { ...c, status: next } : c))
    try {
      await vendorCategoriesApi.update(item.id, { status: next })
    } catch (err) {
      // Revert on failure
      setItems((prev) => prev.map((c) => c.id === item.id ? { ...c, status: item.status } : c))
      showToast(err.message || 'Failed to change status', 'error')
    } finally {
      setStatusBusyId(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      await vendorCategoriesApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      showToast('Category deactivated')
      fetchList()
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error')
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
              <input type="text" placeholder="Search categories…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
            </select>
            {can('procurement.vendor_categories.create') && (
              <button className="hr-btn-primary" onClick={openCreate}><Plus size={16} /> Add Category</button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Description</th>
                <th>Vendors</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="hr-empty-cell"><div className="auth-spinner" style={{ margin: '16px auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="hr-empty-cell">No categories found</td></tr>
              ) : items.map((cat) => (
                <tr key={cat.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Tag size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{cat.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 300 }}>{cat.description || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{cat.vendor_count ?? 0}</td>
                  <td>
                    <button
                      className={`status-toggle ${cat.status}`}
                      onClick={() => toggleStatus(cat)}
                      disabled={!can('procurement.vendor_categories.edit') || statusBusyId === cat.id}
                      title={`Click to ${cat.status === 'active' ? 'deactivate' : 'activate'}`}
                    >
                      <span className="status-toggle-dot" />
                      <span>{capitalize(cat.status)}</span>
                    </button>
                  </td>
                  <td style={{ fontSize: 12 }}>{fmtDate(cat.created_at)}</td>
                  <td>
                    <div className="hr-actions">
                      {can('procurement.vendor_categories.edit') && (
                        <button className="hr-action-btn" onClick={() => openEdit(cat)} title="Edit"><Pencil size={15} /></button>
                      )}
                      {can('procurement.vendor_categories.delete') && (
                        <button
                          className="hr-action-btn danger"
                          onClick={() => setDeleteTarget(cat)}
                          title={cat.vendor_count > 0 ? 'Cannot delete — has vendors' : 'Delete'}
                          disabled={cat.vendor_count > 0}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta && meta.last_page > 1 && <Pagination meta={meta} onPageChange={setPage} />}
      </div>

      {/* ─── Create / Edit Modal ─── */}
      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Category' : 'Add New Category'} size="sm">
        <form onSubmit={handleSubmit} className="hr-form">
          <div className="hr-form-field">
            <label>Category Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              required
              maxLength={100}
              placeholder="e.g. Office Supplies"
              disabled={saving}
            />
            {formErrors.name && <p className="hr-form-error">{formErrors.name[0]}</p>}
          </div>
          <div className="hr-form-field">
            <label>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Brief description of this category…"
              disabled={saving}
            />
            {formErrors.description && <p className="hr-form-error">{formErrors.description[0]}</p>}
          </div>
          <div className="hr-form-field">
            <label>Status</label>
            <select value={form.status} onChange={(e) => updateField('status', e.target.value)} disabled={saving}>
              {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
            </select>
          </div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update Category' : 'Add Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Delete Confirm ─── */}
      <Modal open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} title="Delete Category" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete category <strong>"{deleteTarget?.name}"</strong>? It will be deactivated rather than removed permanently.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deactivating…' : 'Deactivate'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
