import { useEffect, useMemo, useState } from 'react'
import { Info, Pencil, Search } from 'lucide-react'
import {
  getDemoProjectsWithBudgets,
  getDemoFinanceOverlays,
  setDemoFinanceOverlays,
  makeDemoId,
} from '../../data/financeDemoStore'
import { useDebounce } from '../../hooks/useDebounce'
import { naira } from '../../utils/currency'
import { capitalize } from '../../utils/capitalize'
import Pagination from '../../components/Pagination'
import Modal from '../../components/Modal'

const PER_PAGE = 12
const STATUSES = ['healthy', 'low', 'critical', 'overdrawn']

const INITIAL_FORM = {
  fiscal_year: '2026',
  allocated_amount: 0,
  committed_amount: 0,
  actual_spent_amount: 0,
  pending_request_amount: 0,
  status: 'healthy',
}

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function buildOverlayPayload(form) {
  const allocated = toNumber(form.allocated_amount)
  const committed = toNumber(form.committed_amount)
  const spent = toNumber(form.actual_spent_amount)
  const pending = toNumber(form.pending_request_amount)
  return {
    fiscal_year: form.fiscal_year,
    allocated_amount: allocated,
    committed_amount: committed,
    actual_spent_amount: spent,
    pending_request_amount: pending,
    available_amount: allocated - committed,
    utilization_percent: allocated > 0 ? Math.round((committed / allocated) * 100) : 0,
    status: form.status,
    last_activity_at: new Date().toISOString(),
  }
}

export default function FinanceBudget() {
  const [projects] = useState(() => getDemoProjectsWithBudgets())
  const [overlays, setOverlays] = useState(() => getDemoFinanceOverlays())
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [projectFilter, setProjectFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [trackedFilter, setTrackedFilter] = useState('')
  const [page, setPage] = useState(1)
  const [editingLine, setEditingLine] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    setDemoFinanceOverlays(overlays)
  }, [overlays])

  const allLines = useMemo(() => {
    return projects.flatMap((project) =>
      project.budget_lines.map((line) => {
        const overlay = overlays.find((o) => o.project_budget_line_id === line.id)
        return {
          project_id: project.id,
          project_name: project.name,
          project_code: project.project_code,
          department: project.department,
          budget_line_id: line.id,
          category: line.budget_category,
          line_name: line.description,
          unit: line.unit,
          quantity: line.quantity,
          unit_cost: line.unit_cost,
          planned_amount: line.total_cost,
          overlay_id: overlay?.id ?? null,
          fiscal_year: overlay?.fiscal_year ?? '2026',
          allocated_amount: overlay?.allocated_amount ?? line.total_cost,
          committed_amount: overlay?.committed_amount ?? 0,
          actual_spent_amount: overlay?.actual_spent_amount ?? 0,
          pending_request_amount: overlay?.pending_request_amount ?? 0,
          available_amount: overlay?.available_amount ?? line.total_cost,
          utilization_percent: overlay?.utilization_percent ?? 0,
          status: overlay?.status ?? 'healthy',
          is_tracked: !!overlay,
          last_activity_at: overlay?.last_activity_at ?? null,
        }
      })
    )
  }, [projects, overlays])

  const options = useMemo(() => {
    const pick = (sel) => [...new Set(allLines.map(sel).filter(Boolean))].sort((a, b) => a.localeCompare(b))
    return {
      projects: pick((l) => l.project_name),
      departments: pick((l) => l.department),
      categories: pick((l) => l.category),
    }
  }, [allLines])

  const filtered = useMemo(() => {
    let items = [...allLines]
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      items = items.filter((l) =>
        [l.project_name, l.project_code, l.line_name, l.category, l.department]
          .filter(Boolean).join(' ').toLowerCase().includes(q)
      )
    }
    if (projectFilter) items = items.filter((l) => l.project_name === projectFilter)
    if (departmentFilter) items = items.filter((l) => l.department === departmentFilter)
    if (categoryFilter) items = items.filter((l) => l.category === categoryFilter)
    if (statusFilter) items = items.filter((l) => l.status === statusFilter)
    if (trackedFilter === 'tracked') items = items.filter((l) => l.is_tracked)
    if (trackedFilter === 'untracked') items = items.filter((l) => !l.is_tracked)
    return items
  }, [allLines, debouncedSearch, projectFilter, departmentFilter, categoryFilter, statusFilter, trackedFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)
  const meta = {
    current_page: safePage,
    last_page: totalPages,
    per_page: PER_PAGE,
    total: filtered.length,
    from: filtered.length ? (safePage - 1) * PER_PAGE + 1 : 0,
    to: Math.min(safePage * PER_PAGE, filtered.length),
  }

  const summary = useMemo(() => ({
    planned: filtered.reduce((s, l) => s + l.planned_amount, 0),
    allocated: filtered.reduce((s, l) => s + (l.is_tracked ? l.allocated_amount : 0), 0),
    spent: filtered.reduce((s, l) => s + l.actual_spent_amount, 0),
    available: filtered.reduce((s, l) => s + (l.is_tracked ? l.available_amount : 0), 0),
    untracked: allLines.filter((l) => !l.is_tracked).length,
  }), [filtered, allLines])

  function resetFilters() {
    setSearch('')
    setProjectFilter('')
    setDepartmentFilter('')
    setCategoryFilter('')
    setStatusFilter('')
    setTrackedFilter('')
    setPage(1)
  }

  function openEdit(line) {
    setEditingLine(line)
    setForm({
      fiscal_year: line.fiscal_year,
      allocated_amount: line.is_tracked ? line.allocated_amount : line.planned_amount,
      committed_amount: line.committed_amount,
      actual_spent_amount: line.actual_spent_amount,
      pending_request_amount: line.pending_request_amount,
      status: line.status,
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingLine(null)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = buildOverlayPayload(form)
    if (editingLine.overlay_id) {
      setOverlays((prev) =>
        prev.map((o) => (o.id === editingLine.overlay_id ? { ...o, ...payload } : o))
      )
    } else {
      setOverlays((prev) => [
        ...prev,
        { id: makeDemoId('fo'), project_budget_line_id: editingLine.budget_line_id, project_id: editingLine.project_id, ...payload },
      ])
    }
    closeModal()
  }

  const statusColor = { healthy: 'green', low: 'orange', critical: 'red', overdrawn: 'red' }

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card blue animate-in"><div className="stat-value">{naira(summary.planned)}</div><div className="stat-label">Total Planned</div></div>
        <div className="stat-card orange animate-in"><div className="stat-value">{naira(summary.allocated)}</div><div className="stat-label">Allocated</div></div>
        <div className="stat-card green animate-in"><div className="stat-value">{naira(summary.spent)}</div><div className="stat-label">Actual Spent</div></div>
        <div className="stat-card red animate-in"><div className="stat-value">{naira(summary.available)}</div><div className="stat-label">Available</div></div>
      </div>

      <div className="card animate-in" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 20px' }}>
          <Info size={16} style={{ color: 'var(--color-primary)', marginTop: 2, flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              Budget lines are automatically pulled from the <strong>Projects module</strong>. The Finance Officer sets up and updates financial tracking — allocated, committed, and spent amounts — for each line. To add or remove budget lines, manage them from the relevant project's Budget tab.
            </p>
            {summary.untracked > 0 && (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-warning, #d97706)' }}>
                <strong>{summary.untracked}</strong> budget line{summary.untracked !== 1 ? 's' : ''} from projects {summary.untracked !== 1 ? 'have' : 'has'} not been set up for finance tracking yet. Click the edit icon on any untracked line to set it up.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card animate-in">
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search project, category, or budget line…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
          </div>
          <div className="hr-toolbar-right" style={{ flexWrap: 'wrap' }}>
            <select className="hr-filter-select" value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); setPage(1) }}>
              <option value="">All Projects</option>
              {options.projects.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="hr-filter-select" value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1) }}>
              <option value="">All Departments</option>
              {options.departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="hr-filter-select" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}>
              <option value="">All Categories</option>
              {options.categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
            </select>
            <select className="hr-filter-select" value={trackedFilter} onChange={(e) => { setTrackedFilter(e.target.value); setPage(1) }}>
              <option value="">All Lines</option>
              <option value="tracked">Tracked only</option>
              <option value="untracked">Not tracked</option>
            </select>
            <button type="button" className="hr-btn-secondary" onClick={resetFilters}>Reset</button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Dept</th>
                <th>Category</th>
                <th>Budget Line</th>
                <th>Planned</th>
                <th>Allocated</th>
                <th>Committed</th>
                <th>Spent</th>
                <th>Pending</th>
                <th>Available</th>
                <th>Use %</th>
                <th>Status</th>
                <th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={13} className="hr-empty-cell">No budget lines match the current filters.</td></tr>
              ) : paged.map((line) => (
                <tr key={line.budget_line_id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{line.project_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{line.project_code}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{line.department}</td>
                  <td style={{ fontSize: 13 }}>{line.category}</td>
                  <td style={{ fontWeight: 600 }}>{line.line_name}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{naira(line.planned_amount)}</td>
                  <td style={{ fontWeight: 600 }}>
                    {line.is_tracked ? naira(line.allocated_amount) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    {line.is_tracked ? naira(line.committed_amount) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    {line.is_tracked ? naira(line.actual_spent_amount) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    {line.is_tracked ? naira(line.pending_request_amount) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {line.is_tracked ? naira(line.available_amount) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    {line.is_tracked ? `${line.utilization_percent}%` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    {line.is_tracked
                      ? <span className={`status-badge ${statusColor[line.status] || ''}`}><span className="status-dot" />{capitalize(line.status)}</span>
                      : <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Not tracked</span>
                    }
                  </td>
                  <td>
                    <div className="hr-actions">
                      <button
                        className="hr-action-btn"
                        onClick={() => openEdit(line)}
                        title={line.is_tracked ? 'Edit finance tracking' : 'Set up finance tracking'}
                        style={!line.is_tracked ? { color: 'var(--color-primary)' } : {}}
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && <Pagination meta={meta} onPageChange={setPage} />}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingLine?.is_tracked ? 'Edit Finance Tracking' : 'Set Up Finance Tracking'}
        size="md"
      >
        {editingLine && (
          <form onSubmit={handleSubmit} className="hr-form">
            <div style={{ background: 'var(--bg-muted, #f8f9fa)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, border: '1px solid var(--border-subtle, #e5e7eb)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
                From Projects Module — Read Only
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Project</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{editingLine.project_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{editingLine.project_code} &middot; {editingLine.department}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Budget Line</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{editingLine.line_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{editingLine.category}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Planned Amount</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{naira(editingLine.planned_amount)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{editingLine.quantity} {editingLine.unit} × {naira(editingLine.unit_cost)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Fiscal Year</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{editingLine.fiscal_year}</div>
                </div>
              </div>
            </div>

            <div className="hr-form-row">
              <div className="hr-form-field">
                <label>Allocated Amount *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.allocated_amount}
                  onChange={(e) => setForm((p) => ({ ...p, allocated_amount: e.target.value }))}
                  required
                />
              </div>
              <div className="hr-form-field">
                <label>Committed Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.committed_amount}
                  onChange={(e) => setForm((p) => ({ ...p, committed_amount: e.target.value }))}
                />
              </div>
            </div>
            <div className="hr-form-row">
              <div className="hr-form-field">
                <label>Actual Spent Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.actual_spent_amount}
                  onChange={(e) => setForm((p) => ({ ...p, actual_spent_amount: e.target.value }))}
                />
              </div>
              <div className="hr-form-field">
                <label>Pending Request Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.pending_request_amount}
                  onChange={(e) => setForm((p) => ({ ...p, pending_request_amount: e.target.value }))}
                />
              </div>
            </div>
            <div className="hr-form-row">
              <div className="hr-form-field">
                <label>Status *</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  required
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
                </select>
              </div>
              <div className="hr-form-field">
                <label>Fiscal Year</label>
                <input
                  type="text"
                  value={form.fiscal_year}
                  onChange={(e) => setForm((p) => ({ ...p, fiscal_year: e.target.value }))}
                />
              </div>
            </div>

            <div className="hr-form-actions">
              <button type="button" className="hr-btn-secondary" onClick={closeModal}>Cancel</button>
              <button type="submit" className="hr-btn-primary">
                {editingLine.is_tracked ? 'Update Tracking' : 'Set Up Tracking'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
