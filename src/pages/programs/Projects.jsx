import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Eye, Pencil, Trash2, AlertCircle, X } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import {
  projectsApi,
  projectDonorsApi,
  projectPartnersApi,
  projectTeamApi,
  projectActivitiesApi,
  projectBudgetApi,
  projectNotesApi,
  budgetCategoriesApi,
} from '../../services/projects'
import { departmentsApi, employeesApi } from '../../services/hr'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const STATUSES = ['draft', 'active', 'on_hold', 'completed', 'closed']
const PER_PAGE = 15
function fmtStatus(s) { return capitalize((s || '').replace(/_/g, ' ')) }

export default function Projects() {
  const { can } = useAuth()

  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const [departments, setDepartments] = useState([])
  const [viewItem, setViewItem] = useState(null)
  const [detailTab, setDetailTab] = useState('info')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  /* ─── Create / Edit ─── */
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState(null)

  const EMPTY_FORM = { name: '', description: '', objectives: '', department_id: '', start_date: '', end_date: '', location: '', currency: 'NGN', status: 'draft', notes: '' }
  const [form, setForm] = useState(EMPTY_FORM)

  /* ─── Fetch data ─── */
  useEffect(() => {
    departmentsApi.list({ per_page: 0 }).then((r) => setDepartments(extractItems(r))).catch(() => {})
  }, [])

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await projectsApi.list({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
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
  }, [debouncedSearch, statusFilter, page])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter])

  /* ─── CRUD handlers ─── */
  function openCreate() { setEditItem(null); setForm(EMPTY_FORM); setFormErrors(null); setFormOpen(true) }
  function openEdit(item) { setEditItem(item); setForm({ name: item.name || '', description: item.description || '', objectives: item.objectives || '', department_id: item.department_id || '', start_date: item.start_date || '', end_date: item.end_date || '', location: item.location || '', currency: item.currency || 'NGN', status: item.status || 'draft', notes: item.notes || '' }); setFormErrors(null); setFormOpen(true) }
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
      if (err.status === 422 && err.data?.errors) {
        setFormErrors(err.data.errors)
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
      setError(err.message || 'Failed to delete project')
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
            <div className="search-box"><Search size={16} className="search-icon" /><input type="text" placeholder="Search projects…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}
            </select>
            {can('projects.projects.create') && (
              <button className="hr-btn-primary" onClick={openCreate}><Plus size={16} /> New Project</button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Code</th><th>Project</th><th>Department</th><th>Manager</th><th>Budget</th><th>Progress</th><th>Status</th><th style={{ width: 120 }}>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '20px auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="hr-empty-cell">No projects found</td></tr>
              ) : items.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{p.project_code}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{p.name}</td>
                  <td>{p.department || '—'}</td>
                  <td>{p.project_manager || '—'}</td>
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
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => setViewItem(p)} title="View"><Eye size={15} /></button>
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

      {/* ─── View Detail (tabbed) ─── */}
      <Modal open={!!viewItem} onClose={() => { setViewItem(null); setDetailTab('info') }} title="Project Details" size="lg">
        {viewItem && <ProjectDetail project={viewItem} can={can} onClose={() => setViewItem(null)} onEdit={() => { setViewItem(null); openEdit(viewItem) }} />}
      </Modal>

      {/* ─── Create / Edit Form ─── */}
      <Modal open={formOpen} onClose={closeForm} title={editItem ? 'Edit Project' : 'New Project'} size="md">
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
              <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required placeholder="Project name" />
            </div>
            <div className="hr-form-field">
              <label>Department *</label>
              <select value={form.department_id} onChange={(e) => setForm((p) => ({ ...p, department_id: e.target.value }))} required>
                <option value="">— Select —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
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
              <input type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} />
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Location</label>
              <input type="text" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="e.g. Lagos" />
            </div>
            <div className="hr-form-field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                {STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}
              </select>
            </div>
          </div>
          <div className="hr-form-field">
            <label>Description</label>
            <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} placeholder="Project description" />
          </div>
          <div className="hr-form-field">
            <label>Objectives</label>
            <textarea value={form.objectives} onChange={(e) => setForm((p) => ({ ...p, objectives: e.target.value }))} rows={3} placeholder="Key objectives" />
          </div>
          <div className="hr-form-field">
            <label>Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Additional notes" />
          </div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeForm} disabled={submitting}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editItem ? 'Update Project' : 'Create Project'}</button>
          </div>
        </form>
      </Modal>

      {/* ─── Delete ─── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Close Project" size="sm">
        <div className="hr-confirm-delete">
          <p>Close project <strong>{deleteTarget?.name}</strong>? This will set its status to closed.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete} disabled={deleting}>{deleting ? 'Closing…' : 'Confirm'}</button>
          </div>
        </div>
      </Modal>
    </>
  )
}

/* ================================================================== */
/* ProjectDetail — tabbed sub-resource viewer inside the view modal   */
/* ================================================================== */
const DETAIL_TABS = [
  { key: 'info',       label: 'Info' },
  { key: 'donors',     label: 'Donors' },
  { key: 'partners',   label: 'Partners' },
  { key: 'team',       label: 'Team' },
  { key: 'activities', label: 'Activities' },
  { key: 'budget',     label: 'Budget' },
  { key: 'notes',      label: 'Notes' },
]

function ProjectDetail({ project, can, onClose, onEdit }) {
  const [tab, setTab] = useState('info')

  return (
    <div>
      <div className="hr-toolbar" style={{ borderBottom: '1px solid var(--border)', marginBottom: 16, paddingBottom: 0, flexWrap: 'wrap', gap: 0 }}>
        {DETAIL_TABS.map((t) => (
          <button key={t.key} className={`hr-action-btn${tab === t.key ? ' primary' : ''}`} style={{ borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent', borderRadius: 0, fontWeight: tab === t.key ? 600 : 400, padding: '8px 14px', fontSize: 13 }} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'info' && <InfoTab project={project} can={can} onClose={onClose} onEdit={onEdit} />}
      {tab === 'donors' && <SubResourceTab projectId={project.id} api={projectDonorsApi} label="Donor" canEdit={can('projects.projects.edit')} fields={DONOR_FIELDS} listKey="donors" />}
      {tab === 'partners' && <SubResourceTab projectId={project.id} api={projectPartnersApi} label="Partner" canEdit={can('projects.projects.edit')} fields={PARTNER_FIELDS} listKey="partners" />}
      {tab === 'team' && <TeamTab projectId={project.id} canEdit={can('projects.projects.edit')} />}
      {tab === 'activities' && <SubResourceTab projectId={project.id} api={projectActivitiesApi} label="Activity" canEdit={can('projects.activities.create')} fields={ACTIVITY_FIELDS} listKey="activities" />}
      {tab === 'budget' && <BudgetTab projectId={project.id} canEdit={can('projects.budget.create')} />}
      {tab === 'notes' && <SubResourceTab projectId={project.id} api={projectNotesApi} label="Note" canEdit={can('projects.notes.create')} fields={NOTE_FIELDS} listKey="notes" />}
    </div>
  )
}

/* ── Info tab ── */
function InfoTab({ project, can: canFn, onClose, onEdit }) {
  return (
    <div className="note-detail">
      <div className="note-detail-header"><h3>{project.name}</h3></div>
      <div className="note-detail-meta">
        <span><strong>Code:</strong> {project.project_code}</span>
        <span><strong>Department:</strong> {project.department || '—'}</span>
        <span><strong>Manager:</strong> {project.project_manager || '—'}</span>
        <span><strong>Start:</strong> {fmtDate(project.start_date)}</span>
        <span><strong>End:</strong> {fmtDate(project.end_date)}</span>
        <span><strong>Location:</strong> {project.location || '—'}</span>
        <span><strong>Budget:</strong> {naira(project.total_budget)}</span>
        <span><strong>Status:</strong> {fmtStatus(project.status)}</span>
        <span><strong>Created:</strong> {fmtDate(project.created_at)}</span>
      </div>
      {project.description && <div className="note-detail-content"><strong>Description:</strong><br />{project.description}</div>}
      {project.objectives && <div className="note-detail-content" style={{ marginTop: 8 }}><strong>Objectives:</strong><br />{project.objectives}</div>}
      <div className="hr-form-actions">
        <button className="hr-btn-secondary" onClick={onClose}>Close</button>
        {canFn('projects.projects.edit') && <button className="hr-btn-primary" onClick={onEdit}><Pencil size={14} /> Edit</button>}
      </div>
    </div>
  )
}

/* ── Field definitions for generic SubResourceTab ── */
const DONOR_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'type', label: 'Type', type: 'select', options: ['individual', 'organization', 'government', 'multilateral'] },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone' },
  { key: 'contribution_amount', label: 'Contribution', type: 'number' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]
const PARTNER_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'role', label: 'Role', type: 'select', options: ['implementing', 'technical', 'funding', 'logistics'] },
  { key: 'contact_person', label: 'Contact Person' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]
const ACTIVITY_FIELDS = [
  { key: 'title', label: 'Title', required: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'start_date', label: 'Start Date', type: 'date' },
  { key: 'end_date', label: 'End Date', type: 'date' },
  { key: 'target_date', label: 'Target Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['not_started', 'in_progress', 'completed', 'delayed', 'cancelled'] },
  { key: 'completion_percentage', label: 'Completion %', type: 'number' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]
const NOTE_FIELDS = [
  { key: 'title', label: 'Title', required: true },
  { key: 'content', label: 'Content', type: 'textarea' },
  { key: 'link_url', label: 'Link URL' },
  { key: 'link_label', label: 'Link Label' },
]

/* ── Table columns per type ── */
const TABLE_COLS = {
  donors: [{ key: 'name' }, { key: 'type' }, { key: 'email' }, { key: 'contribution_amount', label: 'Contribution', fmt: (v) => naira(v) }],
  partners: [{ key: 'name' }, { key: 'role' }, { key: 'contact_person', label: 'Contact' }, { key: 'email' }],
  activities: [{ key: 'title' }, { key: 'status' }, { key: 'completion_percentage', label: '%', fmt: (v) => `${v ?? 0}%` }, { key: 'end_date', label: 'End', fmt: fmtDate }],
  notes: [{ key: 'title' }, { key: 'creator_name', label: 'Author' }, { key: 'created_at', label: 'Date', fmt: fmtDate }],
}

/* ── Generic sub-resource tab with inline CRUD ── */
function SubResourceTab({ projectId, api, label, canEdit, fields, listKey }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await api.list(projectId)
      const data = res?.data || res
      setItems(data?.[listKey] || extractItems(res))
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [projectId, api, listKey])

  useEffect(() => { load() }, [load])

  function openAdd() {
    const empty = {}; fields.forEach((f) => { empty[f.key] = '' }); setForm(empty); setEditItem(null); setFormOpen(true)
  }
  function openEdit(item) {
    const vals = {}; fields.forEach((f) => { vals[f.key] = item[f.key] ?? '' }); setForm(vals); setEditItem(item); setFormOpen(true)
  }
  async function handleSubmit(e) {
    e.preventDefault(); setSubmitting(true)
    try {
      if (editItem) { await api.update(projectId, editItem.id, form) } else { await api.create(projectId, form) }
      setFormOpen(false); load()
    } catch (err) { setError(err.message) } finally { setSubmitting(false) }
  }
  async function handleDelete(item) {
    try { await api.delete(projectId, item.id); load() } catch (err) { setError(err.message) }
  }

  const cols = TABLE_COLS[listKey] || fields.slice(0, 4).map((f) => ({ key: f.key, label: f.label }))

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><div className="auth-spinner large" /></div>
  return (
    <div>
      {error && <div className="hr-error-banner" style={{ marginBottom: 8 }}><AlertCircle size={16} /><span>{error}</span><button onClick={() => setError('')} className="hr-error-dismiss">&times;</button></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <strong>{items.length} {label}{items.length !== 1 ? 's' : ''}</strong>
        {canEdit && <button className="hr-btn-primary" onClick={openAdd} style={{ padding: '6px 12px', fontSize: 12 }}><Plus size={14} /> Add {label}</button>}
      </div>
      {items.length ? (
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr>{cols.map((c) => <th key={c.key}>{c.label || capitalize(c.key.replace(/_/g, ' '))}</th>)}{canEdit && <th style={{ width: 80 }}>Actions</th>}</tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  {cols.map((c) => <td key={c.key} style={{ fontSize: 13 }}>{c.fmt ? c.fmt(item[c.key]) : (item[c.key] ?? '—')}</td>)}
                  {canEdit && (
                    <td>
                      <div className="hr-actions">
                        <button className="hr-action-btn" onClick={() => openEdit(item)} title="Edit"><Pencil size={14} /></button>
                        <button className="hr-action-btn danger" onClick={() => handleDelete(item)} title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p style={{ color: 'var(--text-muted)' }}>No {label.toLowerCase()}s yet.</p>}
      {formOpen && (
        <form onSubmit={handleSubmit} className="hr-form" style={{ marginTop: 16, padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
          <h4 style={{ marginBottom: 12 }}>{editItem ? `Edit ${label}` : `Add ${label}`}</h4>
          <div className="hr-form-row" style={{ flexWrap: 'wrap' }}>
            {fields.map((f) => (
              <div className="hr-form-field" key={f.key} style={f.type === 'textarea' ? { width: '100%' } : {}}>
                <label>{f.label}{f.required ? ' *' : ''}</label>
                {f.type === 'textarea' ? (
                  <textarea value={form[f.key] || ''} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} rows={2} />
                ) : f.type === 'select' ? (
                  <select value={form[f.key] || ''} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}>
                    <option value="">— Select —</option>
                    {f.options.map((o) => <option key={o} value={o}>{capitalize(o.replace(/_/g, ' '))}</option>)}
                  </select>
                ) : (
                  <input type={f.type || 'text'} value={form[f.key] || ''} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} required={f.required} />
                )}
              </div>
            ))}
          </div>
          <div className="hr-form-actions" style={{ marginTop: 12 }}>
            <button type="button" className="hr-btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editItem ? 'Update' : 'Add'}</button>
          </div>
        </form>
      )}
    </div>
  )
}

/* ── Team tab — uses employee_id dropdown ── */
function TeamTab({ projectId, canEdit }) {
  const [items, setItems] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ employee_id: '', role: 'member', start_date: '', end_date: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [res, empRes] = await Promise.all([projectTeamApi.list(projectId), employeesApi.list({ per_page: 0 })])
      setItems(res?.data?.team || extractItems(res))
      setEmployees(extractItems(empRes))
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { load() }, [load])

  function openAdd() { setForm({ employee_id: '', role: 'member', start_date: '', end_date: '', notes: '' }); setEditItem(null); setFormOpen(true) }
  function openEdit(item) { setForm({ employee_id: item.employee_id || '', role: item.role || 'member', start_date: item.start_date || '', end_date: item.end_date || '', notes: item.notes || '' }); setEditItem(item); setFormOpen(true) }
  async function handleSubmit(e) {
    e.preventDefault(); setSubmitting(true)
    try {
      if (editItem) { await projectTeamApi.update(projectId, editItem.id, form) } else { await projectTeamApi.create(projectId, form) }
      setFormOpen(false); load()
    } catch (err) { setError(err.message) } finally { setSubmitting(false) }
  }
  async function handleDelete(item) { try { await projectTeamApi.delete(projectId, item.id); load() } catch (err) { setError(err.message) } }

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><div className="auth-spinner large" /></div>
  return (
    <div>
      {error && <div className="hr-error-banner" style={{ marginBottom: 8 }}><AlertCircle size={16} /><span>{error}</span><button onClick={() => setError('')} className="hr-error-dismiss">&times;</button></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <strong>{items.length} Member{items.length !== 1 ? 's' : ''}</strong>
        {canEdit && <button className="hr-btn-primary" onClick={openAdd} style={{ padding: '6px 12px', fontSize: 12 }}><Plus size={14} /> Add Member</button>}
      </div>
      {items.length ? (
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Role</th><th>Start</th><th>End</th>{canEdit && <th style={{ width: 80 }}>Actions</th>}</tr></thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.employee_name || '—'}</td>
                  <td>{capitalize((m.role || 'member').replace(/_/g, ' '))}</td>
                  <td>{fmtDate(m.start_date)}</td>
                  <td>{fmtDate(m.end_date)}</td>
                  {canEdit && (
                    <td><div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => openEdit(m)}><Pencil size={14} /></button>
                      <button className="hr-action-btn danger" onClick={() => handleDelete(m)}><Trash2 size={14} /></button>
                    </div></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p style={{ color: 'var(--text-muted)' }}>No team members yet.</p>}
      {formOpen && (
        <form onSubmit={handleSubmit} className="hr-form" style={{ marginTop: 16, padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
          <h4 style={{ marginBottom: 12 }}>{editItem ? 'Edit Member' : 'Add Member'}</h4>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Employee *</label>
              <select value={form.employee_id} onChange={(e) => setForm((p) => ({ ...p, employee_id: e.target.value }))} required disabled={!!editItem}>
                <option value="">— Select —</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>)}
              </select>
            </div>
            <div className="hr-form-field">
              <label>Role</label>
              <input type="text" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} placeholder="e.g. Project Manager" />
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Start Date</label><input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} /></div>
            <div className="hr-form-field"><label>End Date</label><input type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} /></div>
          </div>
          <div className="hr-form-field"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          <div className="hr-form-actions" style={{ marginTop: 12 }}>
            <button type="button" className="hr-btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editItem ? 'Update' : 'Add'}</button>
          </div>
        </form>
      )}
    </div>
  )
}

/* ── Budget tab — uses budget_category_id dropdown ── */
function BudgetTab({ projectId, canEdit }) {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ budget_category_id: '', description: '', unit: '', quantity: '', unit_cost: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [res, catRes] = await Promise.all([projectBudgetApi.list(projectId), budgetCategoriesApi.list({ per_page: 0 })])
      const data = res?.data || res
      setItems(data?.budget_lines || extractItems(res))
      setSummary({ total: data?.total, by_category: data?.by_category })
      setCategories(extractItems(catRes))
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { load() }, [load])

  function openAdd() { setForm({ budget_category_id: '', description: '', unit: '', quantity: '', unit_cost: '', notes: '' }); setEditItem(null); setFormOpen(true) }
  function openEdit(item) { setForm({ budget_category_id: item.budget_category_id || '', description: item.description || '', unit: item.unit || '', quantity: item.quantity || '', unit_cost: item.unit_cost || '', notes: item.notes || '' }); setEditItem(item); setFormOpen(true) }
  async function handleSubmit(e) {
    e.preventDefault(); setSubmitting(true)
    try {
      if (editItem) { await projectBudgetApi.update(projectId, editItem.id, form) } else { await projectBudgetApi.create(projectId, form) }
      setFormOpen(false); load()
    } catch (err) { setError(err.message) } finally { setSubmitting(false) }
  }
  async function handleDelete(item) { try { await projectBudgetApi.delete(projectId, item.id); load() } catch (err) { setError(err.message) } }

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><div className="auth-spinner large" /></div>
  return (
    <div>
      {error && <div className="hr-error-banner" style={{ marginBottom: 8 }}><AlertCircle size={16} /><span>{error}</span><button onClick={() => setError('')} className="hr-error-dismiss">&times;</button></div>}
      {summary?.total != null && <p style={{ marginBottom: 12 }}><strong>Total Budget:</strong> {naira(summary.total)}</p>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <strong>{items.length} Line{items.length !== 1 ? 's' : ''}</strong>
        {canEdit && <button className="hr-btn-primary" onClick={openAdd} style={{ padding: '6px 12px', fontSize: 12 }}><Plus size={14} /> Add Line</button>}
      </div>
      {items.length ? (
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Category</th><th>Description</th><th>Qty</th><th>Unit Cost</th><th>Total</th>{canEdit && <th style={{ width: 80 }}>Actions</th>}</tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.budget_category || '—'}</td>
                  <td style={{ fontSize: 13 }}>{item.description}</td>
                  <td>{item.quantity} {item.unit}</td>
                  <td>{naira(item.unit_cost)}</td>
                  <td style={{ fontWeight: 600 }}>{naira(item.total_cost)}</td>
                  {canEdit && (
                    <td><div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => openEdit(item)}><Pencil size={14} /></button>
                      <button className="hr-action-btn danger" onClick={() => handleDelete(item)}><Trash2 size={14} /></button>
                    </div></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p style={{ color: 'var(--text-muted)' }}>No budget lines yet.</p>}
      {formOpen && (
        <form onSubmit={handleSubmit} className="hr-form" style={{ marginTop: 16, padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
          <h4 style={{ marginBottom: 12 }}>{editItem ? 'Edit Budget Line' : 'Add Budget Line'}</h4>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Category *</label>
              <select value={form.budget_category_id} onChange={(e) => setForm((p) => ({ ...p, budget_category_id: e.target.value }))} required>
                <option value="">— Select —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="hr-form-field">
              <label>Description *</label>
              <input type="text" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} required />
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Unit</label><input type="text" value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} placeholder="e.g. month, piece" /></div>
            <div className="hr-form-field"><label>Quantity *</label><input type="number" step="0.01" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} required /></div>
            <div className="hr-form-field"><label>Unit Cost *</label><input type="number" step="0.01" value={form.unit_cost} onChange={(e) => setForm((p) => ({ ...p, unit_cost: e.target.value }))} required /></div>
          </div>
          <div className="hr-form-field"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          <div className="hr-form-actions" style={{ marginTop: 12 }}>
            <button type="button" className="hr-btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editItem ? 'Update' : 'Add'}</button>
          </div>
        </form>
      )}
    </div>
  )
}
