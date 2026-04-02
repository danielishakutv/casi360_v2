import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Pencil, Trash2, AlertCircle } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { budgetCategoriesApi } from '../../services/projects'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const STATUS_OPTIONS = ['active', 'inactive']
const PER_PAGE = 25

const EMPTY_FORM = { name: '', description: '', sort_order: 0, status: 'active' }

export default function BudgetCategories() {
  const { can } = useAuth()
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await budgetCategoriesApi.list({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        page,
        per_page: PER_PAGE,
        sort_by: 'sort_order',
        sort_dir: 'asc',
      })
      setItems(extractItems(res))
      setMeta(extractMeta(res))
    } catch (err) {
      setError(err.message || 'Failed to load budget categories')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, page])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter])

  function openCreate() { setEditItem(null); setForm(EMPTY_FORM); setFormErrors(null); setFormOpen(true) }
  function openEdit(item) {
    setEditItem(item)
    setForm({
      name: item.name || '',
      description: item.description || '',
      sort_order: item.sort_order ?? 0,
      status: item.status || 'active',
    })
    setFormErrors(null)
    setFormOpen(true)
  }
  function closeForm() { setFormOpen(false); setEditItem(null) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormErrors(null)
    try {
      const payload = { ...form, sort_order: Number(form.sort_order) }
      if (editItem) {
        await budgetCategoriesApi.update(editItem.id, payload)
      } else {
        await budgetCategoriesApi.create(payload)
      }
      closeForm()
      fetchList()
    } catch (err) {
      if (err.status === 422 && err.errors) {
        setFormErrors(err.errors)
      } else {
        setFormErrors({ general: [err.message || 'Failed to save category'] })
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await budgetCategoriesApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      fetchList()
    } catch (err) {
      // 422 = category has budget lines
      setError(err.message || 'Cannot delete this category')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
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
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
            </select>
            {can('projects.budget_categories.create') && (
              <button className="hr-btn-primary" onClick={openCreate}><Plus size={16} /> Add Category</button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Sort Order</th>
                <th>Status</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '20px auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="hr-empty-cell">No budget categories found</td></tr>
              ) : items.map((cat) => (
                <tr key={cat.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{cat.name}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{cat.description || '—'}</td>
                  <td>{cat.sort_order ?? 0}</td>
                  <td><span className={`status-badge ${cat.status}`}><span className="status-dot" />{capitalize(cat.status)}</span></td>
                  <td>
                    <div className="hr-actions">
                      {can('projects.budget_categories.edit') && (
                        <button className="hr-action-btn" onClick={() => openEdit(cat)} title="Edit"><Pencil size={15} /></button>
                      )}
                      {can('projects.budget_categories.delete') && (
                        <button className="hr-action-btn danger" onClick={() => setDeleteTarget(cat)} title="Delete"><Trash2 size={15} /></button>
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

      {/* Create / Edit */}
      <Modal open={formOpen} onClose={closeForm} title={editItem ? 'Edit Budget Category' : 'Add Budget Category'} size="md">
        <form onSubmit={handleSubmit} className="hr-form">
          {formErrors && (
            <div className="hr-error-banner" style={{ marginBottom: 12 }}>
              <AlertCircle size={16} />
              <span>{formErrors.general ? formErrors.general[0] : 'Please fix the errors below.'}</span>
              <button type="button" onClick={() => setFormErrors(null)} className="hr-error-dismiss">&times;</button>
            </div>
          )}
          <div className="hr-form-field">
            <label>Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required maxLength={255} placeholder="e.g. Personnel, Equipment" />
            {formErrors?.name && <small style={{ color: 'var(--danger)' }}>{formErrors.name[0]}</small>}
          </div>
          <div className="hr-form-field">
            <label>Description</label>
            <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} maxLength={2000} placeholder="Brief description of this category" />
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Sort Order</label>
              <input type="number" min={0} value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))} />
            </div>
            <div className="hr-form-field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
              </select>
            </div>
          </div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeForm} disabled={submitting}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : editItem ? 'Update Category' : 'Add Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Budget Category" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete category <strong>{deleteTarget?.name}</strong>? This will fail if the category has existing budget lines.</p>
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
