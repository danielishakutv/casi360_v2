import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, Plus, Eye, Pencil, Trash2, AlertCircle, ArrowUpDown } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import { projectsApi } from '../../services/projects'
import { departmentsApi, employeesApi } from '../../services/hr'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const STATUSES = ['draft', 'active', 'on_hold', 'completed', 'closed']
const PER_PAGE = 25

function fmtStatus(s) { return capitalize((s || '').replace(/_/g, ' ')) }

const STATUS_COLORS = { draft: 'gray', active: 'green', on_hold: 'orange', completed: 'blue', closed: 'red' }

const SORTABLE = [
  { key: 'name', label: 'Name' },
  { key: 'project_code', label: 'Code' },
  { key: 'status', label: 'Status' },
  { key: 'start_date', label: 'Start Date' },
  { key: 'total_budget', label: 'Budget' },
  { key: 'created_at', label: 'Created' },
]

const EMPTY_FORM = {
  name: '', description: '', objectives: '', department_id: '',
  project_manager_id: '', start_date: '', end_date: '', location: '',
  status: 'draft', notes: '',
}

export default function ProjectsList() {
  const navigate = useNavigate()
  const location = useLocation()
  const { can } = useAuth()

  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)

  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])

  /* ─── Create / Edit modal ─── */
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState(null)

  /* ─── Delete modal ─── */
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  /* Fetch lookups once */
  useEffect(() => {
    Promise.all([
      departmentsApi.list({ per_page: 0 }),
      employeesApi.list({ per_page: 0 }),
    ]).then(([deptRes, empRes]) => {
      setDepartments(extractItems(deptRes))
      setEmployees(extractItems(empRes))
    }).catch(() => {})
  }, [])

  /* Auto-open create if navigated with state */
  useEffect(() => {
    if (location.state?.openCreate && can('projects.projects.create')) {
      openCreate()
      window.history.replaceState({}, '')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* Fetch projects */
  const fetchList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await projectsApi.list({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        department_id: deptFilter || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
        page,
        per_page: PER_PAGE,
      })
      setItems(extractItems(res))
      setMeta(extractMeta(res))
    } catch (err) {
      setError(err.message || 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, statusFilter, deptFilter, sortBy, sortDir, page])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter, deptFilter, sortBy, sortDir])

  /* ─── Sort toggle ─── */
  function toggleSort(key) {
    if (sortBy === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortDir('asc')
    }
  }

  /* ─── CRUD handlers ─── */
  function openCreate() {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setFormErrors(null)
    setFormOpen(true)
  }

  function openEdit(item) {
    setEditItem(item)
    setForm({
      name: item.name || '',
      description: item.description || '',
      objectives: item.objectives || '',
      department_id: item.department_id || '',
      project_manager_id: item.project_manager_id || '',
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      location: item.location || '',

      status: item.status || 'draft',
      notes: item.notes || '',
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
      if (editItem) {
        await projectsApi.update(editItem.id, form)
      } else {
        await projectsApi.create(form)
      }
      closeForm()
      fetchList()
    } catch (err) {
      if (err.status === 422 && err.errors) {
        setFormErrors(err.errors)
      } else {
        setFormErrors({ general: [err.message || 'Failed to save project'] })
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await projectsApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      fetchList()
    } catch (err) {
      setError(err.message || 'Failed to close project')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  function SortHeader({ col }) {
    const active = sortBy === col
    return (
      <th onClick={() => toggleSort(col)} style={{ cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {SORTABLE.find((s) => s.key === col)?.label || capitalize(col.replace(/_/g, ' '))}
          <ArrowUpDown size={12} style={{ opacity: active ? 1 : 0.3 }} />
        </span>
      </th>
    )
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
              <input type="text" placeholder="Search projects…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}
            </select>
            <select className="hr-filter-select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            {can('projects.projects.create') && (
              <button className="hr-btn-primary" onClick={openCreate}><Plus size={16} /> Create Project</button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <SortHeader col="project_code" />
                <SortHeader col="name" />
                <SortHeader col="start_date" />
                <SortHeader col="total_budget" />
                <th>Progress</th>
                <SortHeader col="status" />
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '20px auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="hr-empty-cell">No projects found. {can('projects.projects.create') ? 'Create your first project to get started.' : ''}</td></tr>
              ) : items.map((p) => (
                <tr key={p.id} onClick={() => navigate(`/projects/list/${p.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{p.project_code}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{p.name}</td>
                  <td style={{ fontSize: 12 }}>
                    {p.start_date || p.end_date
                      ? `${fmtDate(p.start_date)} — ${fmtDate(p.end_date)}`
                      : '—'}
                  </td>
                  <td style={{ fontWeight: 600 }}>{naira(p.total_budget)}</td>
                  <td style={{ width: 130 }}>
                    {p.activity_progress ? (
                      <div className="progress-track" style={{ height: 6 }} role="progressbar" aria-valuenow={p.activity_progress.percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} progress`}>
                        <div className="progress-fill blue" style={{ width: `${p.activity_progress.percentage}%` }} />
                      </div>
                    ) : '—'}
                  </td>
                  <td><span className={`status-badge ${p.status}`}><span className="status-dot" />{fmtStatus(p.status)}</span></td>
                  <td>
                    <div className="hr-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="hr-action-btn" onClick={() => navigate(`/projects/list/${p.id}`)} title="View"><Eye size={15} /></button>
                      {can('projects.projects.edit') && (
                        <button className="hr-action-btn" onClick={() => openEdit(p)} title="Edit"><Pencil size={15} /></button>
                      )}
                      {can('projects.projects.delete') && (
                        <button className="hr-action-btn danger" onClick={() => setDeleteTarget(p)} title="Close"><Trash2 size={15} /></button>
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

      {/* ─── Create / Edit Form ─── */}
      <Modal open={formOpen} onClose={closeForm} title={editItem ? 'Edit Project' : 'Create Project'} size="lg">
        <form onSubmit={handleSubmit} className="hr-form">
          {formErrors && (
            <div className="hr-error-banner" style={{ marginBottom: 12 }}>
              <AlertCircle size={16} />
              <span>{formErrors.general ? formErrors.general[0] : 'Please fix the errors below.'}</span>
              <button type="button" onClick={() => setFormErrors(null)} className="hr-error-dismiss">&times;</button>
            </div>
          )}

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Project Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required maxLength={255} placeholder="Project name" />
              {formErrors?.name && <small style={{ color: 'var(--danger)' }}>{formErrors.name[0]}</small>}
            </div>
            <div className="hr-form-field">
              <label>Department</label>
              <select value={form.department_id} onChange={(e) => setForm((p) => ({ ...p, department_id: e.target.value }))}>
                <option value="">— None —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {formErrors?.department_id && <small style={{ color: 'var(--danger)' }}>{formErrors.department_id[0]}</small>}
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Project Manager</label>
              <select value={form.project_manager_id} onChange={(e) => setForm((p) => ({ ...p, project_manager_id: e.target.value }))}>
                <option value="">— None —</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </div>
            <div className="hr-form-field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                {STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}
              </select>
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Start Date</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} />
            </div>
            <div className="hr-form-field">
              <label>End Date</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} min={form.start_date || undefined} />
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Location</label>
              <input type="text" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} maxLength={255} placeholder="e.g. Lagos" />
            </div>
          </div>

          <div className="hr-form-field">
            <label>Description</label>
            <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} maxLength={10000} placeholder="Project description" />
          </div>

          <div className="hr-form-field">
            <label>Objectives</label>
            <textarea value={form.objectives} onChange={(e) => setForm((p) => ({ ...p, objectives: e.target.value }))} rows={3} maxLength={10000} placeholder="Key objectives" />
          </div>

          <div className="hr-form-field">
            <label>Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} maxLength={5000} placeholder="Additional notes" />
          </div>

          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeForm} disabled={submitting}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : editItem ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Delete Confirmation ─── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Close Project" size="sm">
        <div className="hr-confirm-delete">
          <p>Are you sure you want to close project <strong>{deleteTarget?.name}</strong>? This will set its status to Closed.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Closing…' : 'Confirm Close'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
