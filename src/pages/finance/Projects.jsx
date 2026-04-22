import { useState, useEffect, useCallback } from 'react'
import {
  Search, AlertCircle, ArrowUpDown, Wallet, StickyNote,
  ChevronUp, Eye, X, Plus, Pencil, Trash2, ExternalLink,
} from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import {
  projectsApi,
  projectBudgetApi,
  projectNotesApi,
  budgetCategoriesApi,
} from '../../services/projects'
import { departmentsApi } from '../../services/hr'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const STATUSES = ['draft', 'active', 'on_hold', 'completed', 'closed']
const PER_PAGE = 25

const SORTABLE = [
  { key: 'project_code', label: 'Code' },
  { key: 'name',         label: 'Name' },
  { key: 'start_date',   label: 'Start Date' },
  { key: 'total_budget', label: 'Budget' },
  { key: 'status',       label: 'Status' },
]

function fmtStatus(s) { return capitalize((s || '').replace(/_/g, ' ')) }

const FINANCE_TABS = [
  { key: 'budget', label: 'Budget', icon: Wallet },
  { key: 'notes',  label: 'Notes',  icon: StickyNote },
]

export default function FinanceProjects() {
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
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    departmentsApi.list({ per_page: 0 }).then(res => setDepartments(extractItems(res))).catch(() => {})
  }, [])

  const fetchList = useCallback(async () => {
    setLoading(true); setError('')
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

  function toggleSort(key) {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
  }

  function toggleExpand(id) {
    setExpandedId(prev => prev === id ? null : id)
  }

  function SortHeader({ col }) {
    const active = sortBy === col
    return (
      <th onClick={() => toggleSort(col)} style={{ cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {SORTABLE.find(s => s.key === col)?.label || capitalize(col.replace(/_/g, ' '))}
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
              <input
                type="text"
                placeholder="Search projects…"
                value={search}
                onChange={e => { setSearch(e.target.value) }}
              />
            </div>
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              {STATUSES.map(s => <option key={s} value={s}>{fmtStatus(s)}</option>)}
            </select>
            <select className="hr-filter-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
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
                <th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '20px auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="hr-empty-cell">No projects found.</td></tr>
              ) : items.map(p => (
                <ProjectRow
                  key={p.id}
                  project={p}
                  expanded={expandedId === p.id}
                  onToggle={() => toggleExpand(p.id)}
                  onCollapse={() => setExpandedId(null)}
                  can={can}
                />
              ))}
            </tbody>
          </table>
        </div>
        {meta && <Pagination meta={meta} onPageChange={setPage} />}
      </div>
    </>
  )
}

/* ─────────────────────────────────────────────────────────── */
/* Project row + inline expanded detail                        */
/* ─────────────────────────────────────────────────────────── */
function ProjectRow({ project: p, expanded, onToggle, onCollapse, can }) {
  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          cursor: 'pointer',
          background: expanded ? 'var(--bg-muted, rgba(99,102,241,0.04))' : undefined,
          borderLeft: expanded ? '3px solid var(--color-primary, #6366f1)' : '3px solid transparent',
        }}
      >
        <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{p.project_code}</td>
        <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{p.name}</td>
        <td style={{ fontSize: 12 }}>
          {p.start_date || p.end_date ? `${fmtDate(p.start_date)} — ${fmtDate(p.end_date)}` : '—'}
        </td>
        <td style={{ fontWeight: 600 }}>{naira(p.total_budget)}</td>
        <td style={{ width: 130 }}>
          {p.activity_progress ? (
            <div
              className="progress-track"
              style={{ height: 6 }}
              role="progressbar"
              aria-valuenow={p.activity_progress.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="progress-fill blue" style={{ width: `${p.activity_progress.percentage}%` }} />
            </div>
          ) : '—'}
        </td>
        <td>
          <span className={`status-badge ${p.status}`}>
            <span className="status-dot" />{fmtStatus(p.status)}
          </span>
        </td>
        <td>
          <div className="hr-actions" onClick={e => e.stopPropagation()}>
            <button
              className="hr-action-btn"
              onClick={onToggle}
              title={expanded ? 'Collapse' : 'View'}
            >
              {expanded ? <ChevronUp size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td
            colSpan={7}
            style={{ padding: 0, background: 'var(--bg-card, var(--bg-surface))', borderLeft: '3px solid var(--color-primary, #6366f1)' }}
          >
            <ProjectExpanded project={p} onCollapse={onCollapse} can={can} />
          </td>
        </tr>
      )}
    </>
  )
}

/* ─────────────────────────────────────────────────────────── */
/* Expanded project detail: header + Budget / Notes tabs       */
/* ─────────────────────────────────────────────────────────── */
function ProjectExpanded({ project, onCollapse, can }) {
  const [tab, setTab] = useState('budget')

  return (
    <div style={{ padding: '20px 24px 24px' }}>
      {/* Header */}
      <div className="project-detail-header" style={{ marginBottom: 16 }}>
        <div className="project-detail-header-left">
          <button className="hr-action-btn" onClick={onCollapse} title="Collapse">
            <X size={18} />
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>{project.name}</h2>
              <span className={`status-badge ${project.status}`}>
                <span className="status-dot" />{fmtStatus(project.status)}
              </span>
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
        </div>
      </div>

      {/* Tab nav */}
      <div className="card animate-in" style={{ padding: 0, marginBottom: 0 }}>
        <div className="project-tab-nav">
          {FINANCE_TABS.map(t => (
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
          {tab === 'budget' && (
            <BudgetTab
              projectId={project.id}
              canCreate={can('projects.budget.create')}
              canEdit={can('projects.budget.edit')}
              canDelete={can('projects.budget.delete')}
            />
          )}
          {tab === 'notes' && (
            <NotesTab
              projectId={project.id}
              canCreate={can('projects.notes.create')}
              canEdit={can('projects.notes.edit')}
              canDelete={can('projects.notes.delete')}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/* BUDGET TAB                                                          */
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
  const [viewItem, setViewItem] = useState(null)

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

  function openAdd() {
    setEditItem(null)
    setForm({ budget_category_id: '', description: '', unit: '', quantity: '', unit_cost: '', notes: '' })
    setFormOpen(true)
  }
  function openEdit(item) {
    setEditItem(item)
    setForm({ budget_category_id: item.budget_category_id || '', description: item.description || '', unit: item.unit || '', quantity: item.quantity || '', unit_cost: item.unit_cost || '', notes: item.notes || '' })
    setFormOpen(true)
  }

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

      {summary?.total != null && (
        <div className="project-budget-summary">
          <div className="total-label">Total Budget</div>
          <div className="total-amount">{naira(summary.total)}</div>
          {summary.by_category?.length > 0 && (
            <div className="categories">
              {summary.by_category.map(c => (
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
        {canCreate && (
          <button className="hr-btn-primary" onClick={openAdd} style={{ padding: '6px 12px', fontSize: 12 }}>
            <Plus size={14} /> Add Budget Line
          </button>
        )}
      </div>

      {items.length ? (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th><th>Description</th><th>Unit</th><th>Qty</th><th>Unit Cost</th><th>Total</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.budget_category || '—'}</td>
                  <td style={{ fontSize: 13 }}>{item.description}</td>
                  <td style={{ fontSize: 12 }}>{item.unit || '—'}</td>
                  <td>{item.quantity}</td>
                  <td>{naira(item.unit_cost)}</td>
                  <td style={{ fontWeight: 600 }}>{naira(item.total_cost)}</td>
                  <td>
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => setViewItem(item)} title="View"><Eye size={14} /></button>
                      {canEdit && <button className="hr-action-btn" onClick={() => openEdit(item)} title="Edit"><Pencil size={14} /></button>}
                      {canDelete && <button className="hr-action-btn danger" onClick={() => setDeleteTarget(item)} title="Delete"><Trash2 size={14} /></button>}
                    </div>
                  </td>
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
              <select value={form.budget_category_id} onChange={e => setForm(p => ({ ...p, budget_category_id: e.target.value }))} required>
                <option value="">— Select —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="hr-form-field">
              <label>Title *</label>
              <input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required maxLength={500} />
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Unit</label><input type="text" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="e.g. month, piece" maxLength={100} /></div>
            <div className="hr-form-field"><label>Quantity *</label><input type="number" step="0.01" min="0.01" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} required /></div>
            <div className="hr-form-field"><label>Unit Cost *</label><input type="number" step="0.01" min="0" value={form.unit_cost} onChange={e => setForm(p => ({ ...p, unit_cost: e.target.value }))} required /></div>
          </div>
          <div className="hr-form-field"><label>Description</label><textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
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

      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Budget Line Details" size="md">
        {viewItem && (
          <div className="view-modal-grid">
            <div className="view-modal-field"><label>Category</label><p>{viewItem.budget_category || '—'}</p></div>
            <div className="view-modal-field"><label>Description</label><p>{viewItem.description || '—'}</p></div>
            <div className="view-modal-field"><label>Unit</label><p>{viewItem.unit || '—'}</p></div>
            <div className="view-modal-field"><label>Quantity</label><p>{viewItem.quantity}</p></div>
            <div className="view-modal-field"><label>Unit Cost</label><p>{naira(viewItem.unit_cost)}</p></div>
            <div className="view-modal-field"><label>Total Cost</label><p>{naira(viewItem.total_cost)}</p></div>
            <div className="view-modal-field full"><label>Notes</label><p>{viewItem.notes || '—'}</p></div>
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ================================================================== */
/* NOTES TAB                                                           */
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
  const [viewItem, setViewItem] = useState(null)

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
          <input type="text" placeholder="Search notes…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {canCreate && (
          <button className="hr-btn-primary" onClick={openAdd} style={{ padding: '6px 12px', fontSize: 12 }}>
            <Plus size={14} /> Add Note
          </button>
        )}
      </div>

      {items.length ? (
        <div className="project-notes-grid">
          {items.map(note => (
            <div key={note.id} className="project-note-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <h4 style={{ margin: 0, fontSize: 14 }}>{note.title}</h4>
                <div className="hr-actions">
                  <button className="hr-action-btn" onClick={() => setViewItem(note)} title="View"><Eye size={12} /></button>
                  {canEdit && <button className="hr-action-btn" onClick={() => openEdit(note)} title="Edit"><Pencil size={12} /></button>}
                  {canDelete && <button className="hr-action-btn danger" onClick={() => setDeleteTarget(note)} title="Delete"><Trash2 size={12} /></button>}
                </div>
              </div>
              <div className="note-meta">
                {note.creator_name || 'Unknown'} &middot; {fmtDate(note.created_at)}
              </div>
              {note.content && <p className="note-content">{note.content}</p>}
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
          <div className="hr-form-field"><label>Title *</label><input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required maxLength={255} /></div>
          <div className="hr-form-field"><label>Content</label><textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={5} maxLength={10000} /></div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Link URL</label><input type="url" value={form.link_url} onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))} placeholder="https://…" /></div>
            <div className="hr-form-field"><label>Link Label</label><input type="text" value={form.link_label} onChange={e => setForm(p => ({ ...p, link_label: e.target.value }))} placeholder="e.g. Full Report" maxLength={255} /></div>
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

      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Note Details" size="md">
        {viewItem && (
          <div className="view-modal-grid">
            <div className="view-modal-field full"><label>Title</label><p>{viewItem.title || '—'}</p></div>
            <div className="view-modal-field"><label>Author</label><p>{viewItem.creator_name || 'Unknown'}</p></div>
            <div className="view-modal-field"><label>Date</label><p>{fmtDate(viewItem.created_at)}</p></div>
            <div className="view-modal-field full"><label>Content</label><p style={{ whiteSpace: 'pre-wrap' }}>{viewItem.content || '—'}</p></div>
            {viewItem.link_url && (
              <div className="view-modal-field full">
                <label>Link</label>
                <p>
                  <a href={viewItem.link_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <ExternalLink size={12} />{viewItem.link_label || viewItem.link_url}
                  </a>
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

/* ─── Shared helpers ─── */
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
