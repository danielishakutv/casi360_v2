import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Pencil, Plus, Trash2, AlertCircle, Search,
  ExternalLink, Users, Activity, Wallet, Heart, Handshake, StickyNote,
} from 'lucide-react'
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
import { employeesApi } from '../../services/hr'
import { extractItems } from '../../utils/apiHelpers'
import { useAuth } from '../../contexts/AuthContext'
import { useDebounce } from '../../hooks/useDebounce'
import Modal from '../../components/Modal'

function fmtStatus(s) { return capitalize((s || '').replace(/_/g, ' ')) }

const TABS = [
  { key: 'overview',    label: 'Overview',    icon: Activity },
  { key: 'team',        label: 'Team',        icon: Users },
  { key: 'activities',  label: 'Activities',  icon: Activity },
  { key: 'budget',      label: 'Budget',      icon: Wallet },
  { key: 'donors',      label: 'Donors',      icon: Heart },
  { key: 'partners',    label: 'Partners',    icon: Handshake },
  { key: 'notes',       label: 'Notes',       icon: StickyNote },
]

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { can } = useAuth()

  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('overview')

  const fetchProject = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await projectsApi.get(id)
      setProject(res?.data?.project || res?.data || res)
    } catch (err) {
      setError(err.message || 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchProject() }, [fetchProject])

  if (loading) {
    return <div className="card animate-in" style={{ padding: 48, textAlign: 'center' }}><div className="auth-spinner large" /></div>
  }

  if (error) {
    return (
      <div className="hr-error-banner">
        <AlertCircle size={16} /><span>{error}</span>
        <button className="hr-btn-secondary" onClick={() => navigate('/projects/list')} style={{ marginLeft: 12 }}>Back to List</button>
      </div>
    )
  }

  if (!project) return null

  return (
    <>
      {/* Header */}
      <div className="card animate-in" style={{ marginBottom: 16 }}>
        <div className="project-detail-header">
          <div className="project-detail-header-left">
            <button className="hr-action-btn" onClick={() => navigate('/projects/list')} title="Back to list"><ArrowLeft size={18} /></button>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>{project.name}</h2>
                <span className={`status-badge ${project.status}`}><span className="status-dot" />{fmtStatus(project.status)}</span>
              </div>
              <div className="project-detail-meta">
                {project.project_code} &middot; {project.department || '—'} &middot; {project.project_manager || 'No manager'} &middot; {project.location || '—'}
              </div>
            </div>
          </div>
          <div className="project-detail-header-right">
            <div className="project-detail-budget-info">
              <div className="date-range">{fmtDate(project.start_date)} — {fmtDate(project.end_date)}</div>
              <div className="budget-amount">{naira(project.total_budget)}</div>
            </div>
            {can('projects.projects.edit') && (
              <button className="hr-btn-primary" onClick={() => navigate('/projects/list', { state: { editId: project.id } })} style={{ padding: '6px 12px' }}>
                <Pencil size={14} /> Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="card animate-in" style={{ padding: 0 }}>
        <div className="project-tab-nav">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`project-tab-btn${tab === t.key ? ' active' : ''}`}
            >
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </div>

        <div className="project-tab-body">
          {tab === 'overview' && <OverviewTab project={project} />}
          {tab === 'team' && <TeamTab projectId={id} canEdit={can('projects.projects.edit')} />}
          {tab === 'activities' && <ActivitiesTab projectId={id} canCreate={can('projects.activities.create')} canEdit={can('projects.activities.edit')} canDelete={can('projects.activities.delete')} />}
          {tab === 'budget' && <BudgetTab projectId={id} canCreate={can('projects.budget.create')} canEdit={can('projects.budget.edit')} canDelete={can('projects.budget.delete')} />}
          {tab === 'donors' && <DonorsTab projectId={id} canEdit={can('projects.projects.edit')} />}
          {tab === 'partners' && <PartnersTab projectId={id} canEdit={can('projects.projects.edit')} />}
          {tab === 'notes' && <NotesTab projectId={id} canCreate={can('projects.notes.create')} canEdit={can('projects.notes.edit')} canDelete={can('projects.notes.delete')} />}
        </div>
      </div>
    </>
  )
}

/* ================================================================== */
/* TAB 1: OVERVIEW                                                    */
/* ================================================================== */
function OverviewTab({ project }) {
  const p = project
  return (
    <div>
      <div className="project-mini-stats">
        <MiniStat label="Team Members" value={p.team_member_count ?? 0} />
        <MiniStat label="Activities" value={p.activity_count ?? 0} />
        <MiniStat label="Budget Lines" value={p.budget_line_count ?? 0} />
        <MiniStat label="Donors" value={p.donor_count ?? 0} />
        <MiniStat label="Partners" value={p.partner_count ?? 0} />
        <MiniStat label="Notes" value={p.note_count ?? 0} />
      </div>

      {p.activity_progress && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span>Activity Progress</span>
            <span>{p.activity_progress.completed}/{p.activity_progress.total} ({p.activity_progress.percentage}%)</span>
          </div>
          <div className="progress-track" role="progressbar" aria-valuenow={p.activity_progress.percentage} aria-valuemin={0} aria-valuemax={100}>
            <div className="progress-fill blue" style={{ width: `${p.activity_progress.percentage}%` }} />
          </div>
        </div>
      )}

      {p.description && (
        <div className="project-section-text" style={{ marginBottom: 16 }}>
          <h4>Description</h4>
          <p>{p.description}</p>
        </div>
      )}

      {p.objectives && (
        <div className="project-section-text" style={{ marginBottom: 16 }}>
          <h4>Objectives</h4>
          <p>{p.objectives}</p>
        </div>
      )}

      {typeof p.notes === 'string' && p.notes && (
        <div className="project-section-text">
          <h4>Notes</h4>
          <p>{p.notes}</p>
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="project-mini-stat">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  )
}

/* ================================================================== */
/* TAB 2: TEAM MEMBERS                                                */
/* ================================================================== */
function TeamTab({ projectId, canEdit }) {
  const [items, setItems] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ employee_id: '', role: '', start_date: '', end_date: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [res, empRes] = await Promise.all([
        projectTeamApi.list(projectId),
        employeesApi.list({ per_page: 0 }),
      ])
      const data = res?.data || res
      setItems(data?.team_members || data?.team || extractItems(res))
      setEmployees(extractItems(empRes))
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { load() }, [load])

  function openAdd() { setEditItem(null); setForm({ employee_id: '', role: '', start_date: '', end_date: '', notes: '' }); setFormOpen(true) }
  function openEdit(item) { setEditItem(item); setForm({ employee_id: item.employee_id || '', role: item.role || '', start_date: item.start_date || '', end_date: item.end_date || '', notes: item.notes || '' }); setFormOpen(true) }

  async function handleSubmit(e) {
    e.preventDefault(); setSubmitting(true); setError('')
    try {
      if (editItem) await projectTeamApi.update(projectId, editItem.id, form)
      else await projectTeamApi.create(projectId, form)
      setFormOpen(false); load()
    } catch (err) { setError(err.message) } finally { setSubmitting(false) }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try { await projectTeamApi.delete(projectId, deleteTarget.id); setDeleteTarget(null); load() }
    catch (err) { setError(err.message); setDeleteTarget(null) }
  }

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><div className="auth-spinner large" /></div>
  return (
    <div>
      {error && <ErrorBanner msg={error} onDismiss={() => setError('')} />}
      <div className="project-tab-toolbar">
        <strong>{items.length} Member{items.length !== 1 ? 's' : ''}</strong>
        {canEdit && <button className="hr-btn-primary" onClick={openAdd} style={{ padding: '6px 12px', fontSize: 12 }}><Plus size={14} /> Add Member</button>}
      </div>
      {items.length ? (
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Department</th><th>Role</th><th>Start</th><th>End</th>{canEdit && <th style={{ width: 80 }}>Actions</th>}</tr></thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.employee_name || '—'}</td>
                  <td style={{ fontSize: 12 }}>{m.employee_department || '—'}</td>
                  <td>{m.role ? capitalize(m.role.replace(/_/g, ' ')) : '—'}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(m.start_date)}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(m.end_date)}</td>
                  {canEdit && (
                    <td><div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => openEdit(m)} title="Edit"><Pencil size={14} /></button>
                      <button className="hr-action-btn danger" onClick={() => setDeleteTarget(m)} title="Remove"><Trash2 size={14} /></button>
                    </div></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState text="No team members yet." />}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Member' : 'Add Team Member'} size="md">
        <form onSubmit={handleSubmit} className="hr-form">
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Employee *</label>
              <select value={form.employee_id} onChange={(e) => setForm((p) => ({ ...p, employee_id: e.target.value }))} required disabled={!!editItem}>
                <option value="">— Select —</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </div>
            <div className="hr-form-field">
              <label>Role</label>
              <input type="text" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} placeholder="e.g. Project Lead" />
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Start Date</label><input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} /></div>
            <div className="hr-form-field"><label>End Date</label><input type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} /></div>
          </div>
          <div className="hr-form-field"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editItem ? 'Update' : 'Add Member'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Team Member" size="sm">
        <div className="hr-confirm-delete">
          <p>Remove <strong>{deleteTarget?.employee_name}</strong> from this project?</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete}>Confirm</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ================================================================== */
/* TAB 3: ACTIVITIES                                                  */
/* ================================================================== */
const ACTIVITY_STATUSES = ['not_started', 'in_progress', 'completed', 'delayed', 'cancelled']

function ActivitiesTab({ projectId, canCreate, canEdit, canDelete }) {
  const [items, setItems] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', start_date: '', end_date: '', target_date: '', status: 'not_started', completion_percentage: 0, sort_order: 0, notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await projectActivitiesApi.list(projectId, { status: statusFilter || undefined })
      const data = res?.data || res
      setItems(data?.activities || extractItems(res))
      setSummary(data?.summary || null)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [projectId, statusFilter])

  useEffect(() => { load() }, [load])

  function openAdd() { setEditItem(null); setForm({ title: '', description: '', start_date: '', end_date: '', target_date: '', status: 'not_started', completion_percentage: 0, sort_order: 0, notes: '' }); setFormOpen(true) }
  function openEdit(item) {
    setEditItem(item)
    setForm({ title: item.title || '', description: item.description || '', start_date: item.start_date || '', end_date: item.end_date || '', target_date: item.target_date || '', status: item.status || 'not_started', completion_percentage: item.completion_percentage ?? 0, sort_order: item.sort_order ?? 0, notes: item.notes || '' })
    setFormOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault(); setSubmitting(true); setError('')
    try {
      const payload = { ...form, completion_percentage: Number(form.completion_percentage), sort_order: Number(form.sort_order) }
      if (editItem) await projectActivitiesApi.update(projectId, editItem.id, payload)
      else await projectActivitiesApi.create(projectId, payload)
      setFormOpen(false); load()
    } catch (err) { setError(err.message) } finally { setSubmitting(false) }
  }

  async function handleProgressUpdate(item, pct) {
    try {
      await projectActivitiesApi.update(projectId, item.id, { completion_percentage: pct })
      load()
    } catch (err) { setError(err.message) }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try { await projectActivitiesApi.delete(projectId, deleteTarget.id); setDeleteTarget(null); load() }
    catch (err) { setError(err.message); setDeleteTarget(null) }
  }

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><div className="auth-spinner large" /></div>
  return (
    <div>
      {error && <ErrorBanner msg={error} onDismiss={() => setError('')} />}

      {/* Summary bar */}
      {summary && (
        <div className="project-summary-bar">
          {['total', 'not_started', 'in_progress', 'completed', 'delayed'].map((k) => (
            <div key={k} className="project-summary-chip">
              <strong>{summary[k] ?? 0}</strong> {fmtStatus(k === 'total' ? 'total' : k)}
            </div>
          ))}
        </div>
      )}

      <div className="project-tab-toolbar">
        <select className="hr-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ minWidth: 140 }}>
          <option value="">All Status</option>
          {ACTIVITY_STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}
        </select>
        {canCreate && <button className="hr-btn-primary" onClick={openAdd} style={{ padding: '6px 12px', fontSize: 12 }}><Plus size={14} /> Add Activity</button>}
      </div>

      {items.length ? (
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Title</th><th>Date Range</th><th>Status</th><th>Progress</th>{(canEdit || canDelete) && <th style={{ width: 80 }}>Actions</th>}</tr></thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600 }}>{a.title}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(a.start_date)} — {fmtDate(a.end_date)}</td>
                  <td><span className={`status-badge ${a.status}`}><span className="status-dot" />{fmtStatus(a.status)}</span></td>
                  <td>
                    <div className="activity-progress-cell">
                      <input
                        type="range" min={0} max={100} value={a.completion_percentage ?? 0}
                        onChange={(e) => handleProgressUpdate(a, Number(e.target.value))}
                        disabled={!canEdit}
                        title={`${a.completion_percentage ?? 0}%`}
                      />
                      <span className="pct">{a.completion_percentage ?? 0}%</span>
                    </div>
                  </td>
                  {(canEdit || canDelete) && (
                    <td><div className="hr-actions">
                      {canEdit && <button className="hr-action-btn" onClick={() => openEdit(a)} title="Edit"><Pencil size={14} /></button>}
                      {canDelete && <button className="hr-action-btn danger" onClick={() => setDeleteTarget(a)} title="Delete"><Trash2 size={14} /></button>}
                    </div></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState text="No activities yet." />}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Activity' : 'Add Activity'} size="md">
        <form onSubmit={handleSubmit} className="hr-form">
          <div className="hr-form-field"><label>Title *</label><input type="text" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required maxLength={255} /></div>
          <div className="hr-form-field"><label>Description</label><textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} /></div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Start Date</label><input type="date" value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} /></div>
            <div className="hr-form-field"><label>End Date</label><input type="date" value={form.end_date} onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))} min={form.start_date || undefined} /></div>
            <div className="hr-form-field"><label>Target Date</label><input type="date" value={form.target_date} onChange={(e) => setForm((p) => ({ ...p, target_date: e.target.value }))} /></div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                {ACTIVITY_STATUSES.map((s) => <option key={s} value={s}>{fmtStatus(s)}</option>)}
              </select>
            </div>
            <div className="hr-form-field"><label>Completion %</label><input type="number" min={0} max={100} value={form.completion_percentage} onChange={(e) => setForm((p) => ({ ...p, completion_percentage: e.target.value }))} /></div>
            <div className="hr-form-field"><label>Sort Order</label><input type="number" min={0} value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))} /></div>
          </div>
          <div className="hr-form-field"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editItem ? 'Update' : 'Add Activity'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Activity" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete activity <strong>{deleteTarget?.title}</strong>?</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ================================================================== */
/* TAB 4: BUDGET                                                      */
/* ================================================================== */
function BudgetTab({ projectId, canCreate, canEdit, canDelete }) {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ budget_category_id: '', description: '', unit: '', quantity: '', unit_cost: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [res, catRes] = await Promise.all([
        projectBudgetApi.list(projectId),
        budgetCategoriesApi.list({ per_page: 0 }),
      ])
      const data = res?.data || res
      setItems(data?.budget_lines || extractItems(res))
      setSummary({ total: data?.total, by_category: data?.by_category })
      setCategories(extractItems(catRes))
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { load() }, [load])

  function openAdd() { setEditItem(null); setForm({ budget_category_id: '', description: '', unit: '', quantity: '', unit_cost: '', notes: '' }); setFormOpen(true) }
  function openEdit(item) { setEditItem(item); setForm({ budget_category_id: item.budget_category_id || '', description: item.description || '', unit: item.unit || '', quantity: item.quantity || '', unit_cost: item.unit_cost || '', notes: item.notes || '' }); setFormOpen(true) }

  async function handleSubmit(e) {
    e.preventDefault(); setSubmitting(true); setError('')
    try {
      if (editItem) await projectBudgetApi.update(projectId, editItem.id, form)
      else await projectBudgetApi.create(projectId, form)
      setFormOpen(false); load()
    } catch (err) { setError(err.message) } finally { setSubmitting(false) }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try { await projectBudgetApi.delete(projectId, deleteTarget.id); setDeleteTarget(null); load() }
    catch (err) { setError(err.message); setDeleteTarget(null) }
  }

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><div className="auth-spinner large" /></div>
  return (
    <div>
      {error && <ErrorBanner msg={error} onDismiss={() => setError('')} />}

      {/* Budget summary */}
      {summary?.total != null && (
        <div className="project-budget-summary">
          <div className="total-label">Total Budget</div>
          <div className="total-amount">{naira(summary.total)}</div>
          {summary.by_category?.length > 0 && (
            <div className="categories">
              {summary.by_category.map((c) => (
                <div key={c.category_id}>
                  <strong>{c.category}</strong>: {naira(c.subtotal)} ({c.line_count} line{c.line_count !== 1 ? 's' : ''})
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="project-tab-toolbar">
        <strong>{items.length} Budget Line{items.length !== 1 ? 's' : ''}</strong>
        {canCreate && <button className="hr-btn-primary" onClick={openAdd} style={{ padding: '6px 12px', fontSize: 12 }}><Plus size={14} /> Add Budget Line</button>}
      </div>

      {items.length ? (
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Category</th><th>Description</th><th>Unit</th><th>Qty</th><th>Unit Cost</th><th>Total</th>{(canEdit || canDelete) && <th style={{ width: 80 }}>Actions</th>}</tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.budget_category || '—'}</td>
                  <td style={{ fontSize: 13 }}>{item.description}</td>
                  <td style={{ fontSize: 12 }}>{item.unit || '—'}</td>
                  <td>{item.quantity}</td>
                  <td>{naira(item.unit_cost)}</td>
                  <td style={{ fontWeight: 600 }}>{naira(item.total_cost)}</td>
                  {(canEdit || canDelete) && (
                    <td><div className="hr-actions">
                      {canEdit && <button className="hr-action-btn" onClick={() => openEdit(item)} title="Edit"><Pencil size={14} /></button>}
                      {canDelete && <button className="hr-action-btn danger" onClick={() => setDeleteTarget(item)} title="Delete"><Trash2 size={14} /></button>}
                    </div></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState text="No budget lines yet." />}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Budget Line' : 'Add Budget Line'} size="md">
        <form onSubmit={handleSubmit} className="hr-form">
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Category *</label>
              <select value={form.budget_category_id} onChange={(e) => setForm((p) => ({ ...p, budget_category_id: e.target.value }))} required>
                <option value="">— Select —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="hr-form-field"><label>Title *</label><input type="text" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} required maxLength={500} /></div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Unit</label><input type="text" value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} placeholder="e.g. month, piece" maxLength={100} /></div>
            <div className="hr-form-field"><label>Quantity *</label><input type="number" step="0.01" min="0.01" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} required /></div>
            <div className="hr-form-field"><label>Unit Cost *</label><input type="number" step="0.01" min="0" value={form.unit_cost} onChange={(e) => setForm((p) => ({ ...p, unit_cost: e.target.value }))} required /></div>
          </div>
          <div className="hr-form-field"><label>Description</label><textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editItem ? 'Update' : 'Add Line'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Budget Line" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete budget line <strong>{deleteTarget?.description}</strong>?</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ================================================================== */
/* TAB 5: DONORS                                                      */
/* ================================================================== */
const DONOR_TYPES = ['individual', 'organization', 'government', 'multilateral']

function DonorsTab({ projectId, canEdit }) {
  const [items, setItems] = useState([])
  const [totalContributions, setTotalContributions] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', type: '', email: '', phone: '', contribution_amount: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await projectDonorsApi.list(projectId)
      const data = res?.data || res
      setItems(data?.donors || extractItems(res))
      setTotalContributions(data?.total_contributions ?? 0)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { load() }, [load])

  function openAdd() { setEditItem(null); setForm({ name: '', type: '', email: '', phone: '', contribution_amount: '', notes: '' }); setFormOpen(true) }
  function openEdit(item) { setEditItem(item); setForm({ name: item.name || '', type: item.type || '', email: item.email || '', phone: item.phone || '', contribution_amount: item.contribution_amount ?? '', notes: item.notes || '' }); setFormOpen(true) }

  async function handleSubmit(e) {
    e.preventDefault(); setSubmitting(true); setError('')
    try {
      const payload = { ...form, contribution_amount: form.contribution_amount ? Number(form.contribution_amount) : undefined }
      if (editItem) await projectDonorsApi.update(projectId, editItem.id, payload)
      else await projectDonorsApi.create(projectId, payload)
      setFormOpen(false); load()
    } catch (err) { setError(err.message) } finally { setSubmitting(false) }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try { await projectDonorsApi.delete(projectId, deleteTarget.id); setDeleteTarget(null); load() }
    catch (err) { setError(err.message); setDeleteTarget(null) }
  }

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><div className="auth-spinner large" /></div>
  return (
    <div>
      {error && <ErrorBanner msg={error} onDismiss={() => setError('')} />}

      {totalContributions > 0 && (
        <div className="project-contributions-summary">
          <div className="total-label">Total Contributions</div>
          <div className="total-amount">{naira(totalContributions)}</div>
        </div>
      )}

      <div className="project-tab-toolbar">
        <strong>{items.length} Donor{items.length !== 1 ? 's' : ''}</strong>
        {canEdit && <button className="hr-btn-primary" onClick={openAdd} style={{ padding: '6px 12px', fontSize: 12 }}><Plus size={14} /> Add Donor</button>}
      </div>

      {items.length ? (
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Type</th><th>Email</th><th>Phone</th><th>Contribution</th>{canEdit && <th style={{ width: 80 }}>Actions</th>}</tr></thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600 }}>{d.name}</td>
                  <td>{d.type ? <span className={`status-badge ${d.type}`}><span className="status-dot" />{capitalize(d.type)}</span> : '—'}</td>
                  <td style={{ fontSize: 12 }}>{d.email || '—'}</td>
                  <td style={{ fontSize: 12 }}>{d.phone || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{naira(d.contribution_amount)}</td>
                  {canEdit && (
                    <td><div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => openEdit(d)} title="Edit"><Pencil size={14} /></button>
                      <button className="hr-action-btn danger" onClick={() => setDeleteTarget(d)} title="Delete"><Trash2 size={14} /></button>
                    </div></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState text="No donors yet." />}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Donor' : 'Add Donor'} size="md">
        <form onSubmit={handleSubmit} className="hr-form">
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Name *</label><input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required maxLength={255} /></div>
            <div className="hr-form-field">
              <label>Type</label>
              <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                <option value="">— Select —</option>
                {DONOR_TYPES.map((t) => <option key={t} value={t}>{capitalize(t)}</option>)}
              </select>
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></div>
            <div className="hr-form-field"><label>Phone</label><input type="text" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} maxLength={50} /></div>
          </div>
          <div className="hr-form-field"><label>Contribution Amount</label><input type="number" step="0.01" min="0" value={form.contribution_amount} onChange={(e) => setForm((p) => ({ ...p, contribution_amount: e.target.value }))} /></div>
          <div className="hr-form-field"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editItem ? 'Update' : 'Add Donor'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Donor" size="sm">
        <div className="hr-confirm-delete">
          <p>Remove donor <strong>{deleteTarget?.name}</strong>?</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete}>Remove</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ================================================================== */
/* TAB 6: PARTNERS                                                    */
/* ================================================================== */
const PARTNER_ROLES = ['implementing', 'technical', 'funding', 'logistics']

function PartnersTab({ projectId, canEdit }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', role: '', contact_person: '', email: '', phone: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await projectPartnersApi.list(projectId)
      const data = res?.data || res
      setItems(data?.partners || extractItems(res))
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { load() }, [load])

  function openAdd() { setEditItem(null); setForm({ name: '', role: '', contact_person: '', email: '', phone: '', notes: '' }); setFormOpen(true) }
  function openEdit(item) { setEditItem(item); setForm({ name: item.name || '', role: item.role || '', contact_person: item.contact_person || '', email: item.email || '', phone: item.phone || '', notes: item.notes || '' }); setFormOpen(true) }

  async function handleSubmit(e) {
    e.preventDefault(); setSubmitting(true); setError('')
    try {
      if (editItem) await projectPartnersApi.update(projectId, editItem.id, form)
      else await projectPartnersApi.create(projectId, form)
      setFormOpen(false); load()
    } catch (err) { setError(err.message) } finally { setSubmitting(false) }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try { await projectPartnersApi.delete(projectId, deleteTarget.id); setDeleteTarget(null); load() }
    catch (err) { setError(err.message); setDeleteTarget(null) }
  }

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><div className="auth-spinner large" /></div>
  return (
    <div>
      {error && <ErrorBanner msg={error} onDismiss={() => setError('')} />}
      <div className="project-tab-toolbar">
        <strong>{items.length} Partner{items.length !== 1 ? 's' : ''}</strong>
        {canEdit && <button className="hr-btn-primary" onClick={openAdd} style={{ padding: '6px 12px', fontSize: 12 }}><Plus size={14} /> Add Partner</button>}
      </div>

      {items.length ? (
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Role</th><th>Contact Person</th><th>Email</th><th>Phone</th>{canEdit && <th style={{ width: 80 }}>Actions</th>}</tr></thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.role ? <span className={`status-badge ${p.role}`}><span className="status-dot" />{capitalize(p.role)}</span> : '—'}</td>
                  <td>{p.contact_person || '—'}</td>
                  <td style={{ fontSize: 12 }}>{p.email || '—'}</td>
                  <td style={{ fontSize: 12 }}>{p.phone || '—'}</td>
                  {canEdit && (
                    <td><div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => openEdit(p)} title="Edit"><Pencil size={14} /></button>
                      <button className="hr-action-btn danger" onClick={() => setDeleteTarget(p)} title="Delete"><Trash2 size={14} /></button>
                    </div></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState text="No partners yet." />}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Partner' : 'Add Partner'} size="md">
        <form onSubmit={handleSubmit} className="hr-form">
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Name *</label><input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required maxLength={255} /></div>
            <div className="hr-form-field">
              <label>Role</label>
              <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
                <option value="">— Select —</option>
                {PARTNER_ROLES.map((r) => <option key={r} value={r}>{capitalize(r)}</option>)}
              </select>
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Contact Person</label><input type="text" value={form.contact_person} onChange={(e) => setForm((p) => ({ ...p, contact_person: e.target.value }))} maxLength={255} /></div>
            <div className="hr-form-field"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></div>
          </div>
          <div className="hr-form-field"><label>Phone</label><input type="text" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} maxLength={50} /></div>
          <div className="hr-form-field"><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editItem ? 'Update' : 'Add Partner'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Partner" size="sm">
        <div className="hr-confirm-delete">
          <p>Remove partner <strong>{deleteTarget?.name}</strong>?</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete}>Remove</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ================================================================== */
/* TAB 7: NOTES                                                       */
/* ================================================================== */
function NotesTab({ projectId, canCreate, canEdit, canDelete }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ title: '', content: '', link_url: '', link_label: '' })
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await projectNotesApi.list(projectId, { search: debouncedSearch || undefined })
      const data = res?.data || res
      setItems(data?.notes || extractItems(res))
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [projectId, debouncedSearch])

  useEffect(() => { load() }, [load])

  function openAdd() { setEditItem(null); setForm({ title: '', content: '', link_url: '', link_label: '' }); setFormOpen(true) }
  function openEdit(item) { setEditItem(item); setForm({ title: item.title || '', content: item.content || '', link_url: item.link_url || '', link_label: item.link_label || '' }); setFormOpen(true) }

  async function handleSubmit(e) {
    e.preventDefault(); setSubmitting(true); setError('')
    try {
      if (editItem) await projectNotesApi.update(projectId, editItem.id, form)
      else await projectNotesApi.create(projectId, form)
      setFormOpen(false); load()
    } catch (err) { setError(err.message) } finally { setSubmitting(false) }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try { await projectNotesApi.delete(projectId, deleteTarget.id); setDeleteTarget(null); load() }
    catch (err) { setError(err.message); setDeleteTarget(null) }
  }

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><div className="auth-spinner large" /></div>
  return (
    <div>
      {error && <ErrorBanner msg={error} onDismiss={() => setError('')} />}

      <div className="project-tab-toolbar" style={{ marginBottom: 16 }}>
        <div className="search-box" style={{ maxWidth: 260 }}>
          <Search size={16} className="search-icon" />
          <input type="text" placeholder="Search notes…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {canCreate && <button className="hr-btn-primary" onClick={openAdd} style={{ padding: '6px 12px', fontSize: 12 }}><Plus size={14} /> Add Note</button>}
      </div>

      {items.length ? (
        <div className="project-notes-grid">
          {items.map((note) => (
            <div key={note.id} className="project-note-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <h4 style={{ margin: 0, fontSize: 14 }}>{note.title}</h4>
                {(canEdit || canDelete) && (
                  <div className="hr-actions">
                    {canEdit && <button className="hr-action-btn" onClick={() => openEdit(note)} title="Edit"><Pencil size={12} /></button>}
                    {canDelete && <button className="hr-action-btn danger" onClick={() => setDeleteTarget(note)} title="Delete"><Trash2 size={12} /></button>}
                  </div>
                )}
              </div>
              <div className="note-meta">
                {note.creator_name || 'Unknown'} &middot; {fmtDate(note.created_at)}
              </div>
              {note.content && (
                <p className="note-content">{note.content}</p>
              )}
              {note.link_url && (
                <a href={note.link_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <ExternalLink size={12} />{note.link_label || 'Open Link'}
                </a>
              )}
            </div>
          ))}
        </div>
      ) : <EmptyState text="No notes yet." />}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editItem ? 'Edit Note' : 'Add Note'} size="md">
        <form onSubmit={handleSubmit} className="hr-form">
          <div className="hr-form-field"><label>Title *</label><input type="text" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required maxLength={255} /></div>
          <div className="hr-form-field"><label>Content</label><textarea value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} rows={5} maxLength={10000} /></div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Link URL</label><input type="url" value={form.link_url} onChange={(e) => setForm((p) => ({ ...p, link_url: e.target.value }))} placeholder="https://…" /></div>
            <div className="hr-form-field"><label>Link Label</label><input type="text" value={form.link_label} onChange={(e) => setForm((p) => ({ ...p, link_label: e.target.value }))} placeholder="e.g. Full Report" maxLength={255} /></div>
          </div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editItem ? 'Update' : 'Add Note'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Note" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete note <strong>{deleteTarget?.title}</strong>?</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/* ================================================================== */
/* Shared tiny components                                             */
/* ================================================================== */
function ErrorBanner({ msg, onDismiss }) {
  return (
    <div className="hr-error-banner" style={{ marginBottom: 12 }}>
      <AlertCircle size={16} /><span>{msg}</span>
      <button onClick={onDismiss} className="hr-error-dismiss">&times;</button>
    </div>
  )
}

function EmptyState({ text }) {
  return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>{text}</p>
}
