import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Pencil, Trash2, AlertCircle } from 'lucide-react'
import { departmentsApi } from '../../services/hr'
import { capitalize } from '../../utils/capitalize'
import { useDebounce } from '../../hooks/useDebounce'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const INITIAL_FORM = { name: '', head: '', description: '', color: '#4361ee', status: 'active' }

export default function Departments() {
  /* -------- List state -------- */
  const [departments, setDepartments] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
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

  /* -------- Delete state -------- */
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [error, setError] = useState('')

  /* ================================================================ */
  /* Fetch list                                                       */
  /* ================================================================ */
  const fetchList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await departmentsApi.list({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        page,
        per_page: 15,
      })
      setDepartments(extractItems(res))
      setMeta(extractMeta(res))
    } catch (err) {
      setError(err.message || 'Failed to load departments')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, page])

  useEffect(() => { fetchList() }, [fetchList])

  // Reset to page 1 when filters change
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

  function openEdit(dept) {
    setEditing(dept)
    setForm({
      name:        dept.name || '',
      head:        dept.head || '',
      description: dept.description || '',
      color:       dept.color || '#4361ee',
      status:      dept.status || 'active',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setFormErrors({})
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormErrors({})
    try {
      if (editing) {
        await departmentsApi.update(editing.id, form)
      } else {
        await departmentsApi.create(form)
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
      await departmentsApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      fetchList()
    } catch (err) {
      setError(err.message || 'Failed to delete department')
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
      {/* Error banner */}
      {error && (
        <div className="hr-error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="hr-error-dismiss">&times;</button>
        </div>
      )}

      <div className="card animate-in">
        {/* Toolbar */}
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search departments…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="hr-toolbar-right">
            <select
              className="hr-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button className="hr-btn-primary" onClick={openCreate}>
              <Plus size={16} /> Add Department
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Head</th>
                <th>Employees</th>
                <th>Status</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="hr-empty-cell">
                    <div className="auth-spinner large" style={{ margin: '20px auto' }} />
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="hr-empty-cell">No departments found</td>
                </tr>
              ) : (
                departments.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span className="hr-dept-name-cell">
                        {d.color && <span className="hr-color-dot" style={{ background: d.color }} />}
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{d.name}</span>
                      </span>
                    </td>
                    <td>{d.head || '—'}</td>
                    <td>{d.employee_count ?? d.employees_count ?? 0}</td>
                    <td>
                      <span className={`status-badge ${d.status || 'inactive'}`}>
                        <span className="status-dot" />
                        {capitalize(d.status || 'inactive')}
                      </span>
                    </td>
                    <td>
                      <div className="hr-actions">
                        <button className="hr-action-btn" onClick={() => openEdit(d)} title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button className="hr-action-btn danger" onClick={() => setDeleteTarget(d)} title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination meta={meta} onPageChange={setPage} />
      </div>

      {/* ---------- Create / Edit modal ---------- */}
      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Department' : 'Add Department'}>
        <form onSubmit={handleSubmit} className="hr-form">
          {formErrors._general && (
            <div className="hr-form-error">{formErrors._general}</div>
          )}

          <div className="hr-form-field">
            <label>Department Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g. Finance & Accounting"
              required
            />
            {formErrors.name && <span className="hr-field-error">{formErrors.name[0]}</span>}
          </div>

          <div className="hr-form-field">
            <label>Department Head</label>
            <input
              type="text"
              value={form.head}
              onChange={(e) => updateField('head', e.target.value)}
              placeholder="e.g. John Smith"
            />
            {formErrors.head && <span className="hr-field-error">{formErrors.head[0]}</span>}
          </div>

          <div className="hr-form-field">
            <label>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Brief department description…"
              rows={3}
            />
            {formErrors.description && <span className="hr-field-error">{formErrors.description[0]}</span>}
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Color</label>
              <div className="hr-color-field">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => updateField('color', e.target.value)}
                />
                <span>{form.color}</span>
              </div>
            </div>
            <div className="hr-form-field">
              <label>Status *</label>
              <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>
              {submitting && <span className="auth-spinner" />}
              {editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------- Delete confirmation modal ---------- */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Department" size="sm">
        <div className="hr-confirm-delete">
          <p>
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
            This action cannot be undone.
          </p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete} disabled={deleting}>
              {deleting && <span className="auth-spinner" />}
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
