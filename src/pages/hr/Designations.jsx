import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Pencil, Trash2, AlertCircle } from 'lucide-react'
import { designationsApi, departmentsApi } from '../../services/hr'
import { capitalize } from '../../utils/capitalize'
import { useDebounce } from '../../hooks/useDebounce'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const LEVELS = ['junior', 'mid', 'senior', 'lead', 'executive']
const INITIAL_FORM = { title: '', department_id: '', level: '', description: '', status: 'active' }

export default function Designations() {
  /* -------- List state -------- */
  const [designations, setDesignations] = useState([])
  const [meta, setMeta] = useState(null)
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [levelFilter, setLevelFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
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

  /* ---- Load departments for filter & form dropdown ---- */
  useEffect(() => {
    departmentsApi.list({ per_page: 0 })
      .then((res) => setDepartments(extractItems(res)))
      .catch(() => {})
  }, [])

  /* ================================================================ */
  /* Fetch list                                                       */
  /* ================================================================ */
  const fetchList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await designationsApi.list({
        search: debouncedSearch || undefined,
        level: levelFilter || undefined,
        department_id: deptFilter || undefined,
        status: statusFilter || undefined,
        page,
        per_page: 15,
      })
      setDesignations(extractItems(res))
      setMeta(extractMeta(res))
    } catch (err) {
      setError(err.message || 'Failed to load designations')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, levelFilter, deptFilter, statusFilter, page])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch, levelFilter, deptFilter, statusFilter])

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
      title:         item.title || '',
      department_id: item.department_id || item.department?.id || '',
      level:         item.level || '',
      description:   item.description || '',
      status:        item.status || 'active',
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
        await designationsApi.update(editing.id, form)
      } else {
        await designationsApi.create(form)
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
      await designationsApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      fetchList()
    } catch (err) {
      setError(err.message || 'Failed to delete designation')
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
        {/* Toolbar */}
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search designations…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select className="hr-filter-select" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
              <option value="">All Levels</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>{capitalize(l)}</option>
              ))}
            </select>
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button className="hr-btn-primary" onClick={openCreate}>
              <Plus size={16} /> Add Designation
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Department</th>
                <th>Level</th>
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
              ) : designations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="hr-empty-cell">No designations found</td>
                </tr>
              ) : (
                designations.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{d.title}</td>
                    <td>{d.department?.name || '—'}</td>
                    <td>
                      {d.level ? (
                        <span className="card-badge blue">{capitalize(d.level)}</span>
                      ) : '—'}
                    </td>
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
      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Designation' : 'Add Designation'}>
        <form onSubmit={handleSubmit} className="hr-form">
          {formErrors._general && <div className="hr-form-error">{formErrors._general}</div>}

          <div className="hr-form-field">
            <label>Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g. Senior Developer"
              required
            />
            {formErrors.title && <span className="hr-field-error">{formErrors.title[0]}</span>}
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Department</label>
              <select value={form.department_id} onChange={(e) => updateField('department_id', e.target.value)}>
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {formErrors.department_id && <span className="hr-field-error">{formErrors.department_id[0]}</span>}
            </div>
            <div className="hr-form-field">
              <label>Level</label>
              <select value={form.level} onChange={(e) => updateField('level', e.target.value)}>
                <option value="">Select level</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{capitalize(l)}</option>
                ))}
              </select>
              {formErrors.level && <span className="hr-field-error">{formErrors.level[0]}</span>}
            </div>
          </div>

          <div className="hr-form-field">
            <label>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Brief role description…"
              rows={3}
            />
            {formErrors.description && <span className="hr-field-error">{formErrors.description[0]}</span>}
          </div>

          <div className="hr-form-field">
            <label>Status *</label>
            <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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

      {/* ---------- Delete confirmation ---------- */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Designation" size="sm">
        <div className="hr-confirm-delete">
          <p>
            Are you sure you want to delete <strong>{deleteTarget?.title}</strong>?
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
