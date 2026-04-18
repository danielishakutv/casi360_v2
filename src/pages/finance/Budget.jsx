import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { getDemoBudgetLines, makeDemoId, setDemoBudgetLines } from '../../data/financeDemoStore'
import { useDebounce } from '../../hooks/useDebounce'
import { naira } from '../../utils/currency'
import { capitalize } from '../../utils/capitalize'
import Pagination from '../../components/Pagination'
import Modal from '../../components/Modal'

const PER_PAGE = 12
const STATUSES = ['on_track', 'watch', 'over_budget', 'fully_used']

const INITIAL_FORM = {
  project_name: '',
  project_code: '',
  department: '',
  category: '',
  line_name: '',
  line_code: '',
  allocated_amount: 0,
  committed_amount: 0,
  actual_spent_amount: 0,
  pending_request_amount: 0,
  status: 'on_track',
}

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeLinePayload(form) {
  const allocated = toNumber(form.allocated_amount)
  const committed = toNumber(form.committed_amount)
  const spent = toNumber(form.actual_spent_amount)
  const pending = toNumber(form.pending_request_amount)
  const available = Math.max(allocated - committed, 0)
  const utilization = allocated > 0 ? Math.round((committed / allocated) * 100) : 0

  return {
    project_name: form.project_name.trim(),
    project_code: form.project_code.trim().toUpperCase(),
    department: form.department.trim(),
    category: form.category.trim(),
    line_name: form.line_name.trim(),
    line_code: form.line_code.trim().toUpperCase(),
    allocated_amount: allocated,
    committed_amount: committed,
    actual_spent_amount: spent,
    pending_request_amount: pending,
    available_amount: available,
    utilization_percent: utilization,
    status: form.status,
  }
}

export default function FinanceBudget() {
  const [lines, setLines] = useState(() => getDemoBudgetLines())
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [projectFilter, setProjectFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingLine, setEditingLine] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    setDemoBudgetLines(lines)
  }, [lines])

  const options = useMemo(() => {
    const pick = (selector) => [...new Set(lines.map(selector).filter(Boolean))].sort((a, b) => a.localeCompare(b))
    return {
      projects: pick((line) => line.project_name),
      departments: pick((line) => line.department),
      categories: pick((line) => line.category),
      statuses: pick((line) => line.status),
    }
  }, [lines])

  const filtered = useMemo(() => {
    let items = [...lines]
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase()
      items = items.filter((line) =>
        [line.project_name, line.project_code, line.line_name, line.line_code, line.department, line.category]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query)
      )
    }
    if (projectFilter) items = items.filter((line) => line.project_name === projectFilter)
    if (departmentFilter) items = items.filter((line) => line.department === departmentFilter)
    if (categoryFilter) items = items.filter((line) => line.category === categoryFilter)
    if (statusFilter) items = items.filter((line) => line.status === statusFilter)
    return items.sort((a, b) => a.project_name.localeCompare(b.project_name) || a.line_name.localeCompare(b.line_name))
  }, [lines, debouncedSearch, projectFilter, departmentFilter, categoryFilter, statusFilter])

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
    allocated: filtered.reduce((sum, line) => sum + line.allocated_amount, 0),
    committed: filtered.reduce((sum, line) => sum + line.committed_amount, 0),
    spent: filtered.reduce((sum, line) => sum + line.actual_spent_amount, 0),
    pending: filtered.reduce((sum, line) => sum + line.pending_request_amount, 0),
    available: filtered.reduce((sum, line) => sum + line.available_amount, 0),
  }), [filtered])

  function resetFilters() {
    setSearch('')
    setProjectFilter('')
    setDepartmentFilter('')
    setCategoryFilter('')
    setStatusFilter('')
    setPage(1)
  }

  function openCreateModal() {
    setEditingLine(null)
    setForm(INITIAL_FORM)
    setModalOpen(true)
  }

  function openEditModal(line) {
    setEditingLine(line)
    setForm({
      project_name: line.project_name,
      project_code: line.project_code,
      department: line.department,
      category: line.category,
      line_name: line.line_name,
      line_code: line.line_code,
      allocated_amount: line.allocated_amount,
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

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = normalizeLinePayload(form)
    if (editingLine) {
      setLines((prev) => prev.map((line) => (line.id === editingLine.id ? { ...line, ...payload } : line)))
    } else {
      setLines((prev) => [{ id: makeDemoId('budget-line'), ...payload }, ...prev])
    }
    closeModal()
  }

  function confirmDelete() {
    if (!deleteTarget) return
    setLines((prev) => prev.filter((line) => line.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card blue animate-in"><div className="stat-value">{naira(summary.allocated)}</div><div className="stat-label">Allocated</div></div>
        <div className="stat-card orange animate-in"><div className="stat-value">{naira(summary.committed)}</div><div className="stat-label">Committed</div></div>
        <div className="stat-card green animate-in"><div className="stat-value">{naira(summary.spent)}</div><div className="stat-label">Actual Spent</div></div>
        <div className="stat-card red animate-in"><div className="stat-value">{naira(summary.available)}</div><div className="stat-label">Available</div></div>
      </div>

      <div className="card animate-in" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h3>Budget Line Tracker</h3>
          <span className="card-badge blue">Demo-backed structure</span>
        </div>
        <div className="card-body">
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
            This is the intended finance working screen: each budget line is visible with allocated, committed, spent, pending, and available balances before approval decisions are taken.
          </p>
        </div>
      </div>

      <div className="card animate-in">
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input type="text" placeholder="Search project, code, category, or budget line…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>
          <div className="hr-toolbar-right" style={{ flexWrap: 'wrap' }}>
            <select className="hr-filter-select" value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); setPage(1) }}>
              <option value="">All Projects</option>
              {options.projects.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="hr-filter-select" value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1) }}>
              <option value="">All Departments</option>
              {options.departments.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="hr-filter-select" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}>
              <option value="">All Categories</option>
              {options.categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
              <option value="">All Status</option>
              {options.statuses.map((item) => <option key={item} value={item}>{capitalize(item)}</option>)}
            </select>
            <button type="button" className="hr-btn-secondary" onClick={resetFilters}>Reset</button>
            <button type="button" className="hr-btn-primary" onClick={openCreateModal}><Plus size={16} /> Add Budget Line</button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Department</th>
                <th>Category</th>
                <th>Budget Line</th>
                <th>Allocated</th>
                <th>Committed</th>
                <th>Spent</th>
                <th>Pending</th>
                <th>Available</th>
                <th>Use %</th>
                <th>Status</th>
                <th style={{ width: 130 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={12} className="hr-empty-cell">No budget lines match the current filters.</td></tr>
              ) : paged.map((line) => (
                <tr key={line.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{line.project_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{line.project_code}</div>
                  </td>
                  <td>{line.department}</td>
                  <td>{line.category}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{line.line_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{line.line_code}</div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{naira(line.allocated_amount)}</td>
                  <td>{naira(line.committed_amount)}</td>
                  <td>{naira(line.actual_spent_amount)}</td>
                  <td>{naira(line.pending_request_amount)}</td>
                  <td style={{ fontWeight: 600 }}>{naira(line.available_amount)}</td>
                  <td>{line.utilization_percent}%</td>
                  <td><span className={`status-badge ${line.status}`}><span className="status-dot" />{capitalize(line.status)}</span></td>
                  <td>
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => openEditModal(line)} title="Edit budget line"><Pencil size={15} /></button>
                      <button className="hr-action-btn danger" onClick={() => setDeleteTarget(line)} title="Delete budget line"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && <Pagination meta={meta} onPageChange={setPage} />}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editingLine ? 'Edit Budget Line' : 'Add Budget Line'}>
        <form onSubmit={handleSubmit} className="hr-form">
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Project Name *</label>
              <input type="text" value={form.project_name} onChange={(e) => updateForm('project_name', e.target.value)} required />
            </div>
            <div className="hr-form-field">
              <label>Project Code *</label>
              <input type="text" value={form.project_code} onChange={(e) => updateForm('project_code', e.target.value)} required />
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Department *</label>
              <input type="text" value={form.department} onChange={(e) => updateForm('department', e.target.value)} required />
            </div>
            <div className="hr-form-field">
              <label>Category *</label>
              <input type="text" value={form.category} onChange={(e) => updateForm('category', e.target.value)} required />
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Budget Line Name *</label>
              <input type="text" value={form.line_name} onChange={(e) => updateForm('line_name', e.target.value)} required />
            </div>
            <div className="hr-form-field">
              <label>Budget Line Code *</label>
              <input type="text" value={form.line_code} onChange={(e) => updateForm('line_code', e.target.value)} required />
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Allocated Amount *</label>
              <input type="number" min="0" step="0.01" value={form.allocated_amount} onChange={(e) => updateForm('allocated_amount', e.target.value)} required />
            </div>
            <div className="hr-form-field">
              <label>Committed Amount *</label>
              <input type="number" min="0" step="0.01" value={form.committed_amount} onChange={(e) => updateForm('committed_amount', e.target.value)} required />
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Actual Spent Amount *</label>
              <input type="number" min="0" step="0.01" value={form.actual_spent_amount} onChange={(e) => updateForm('actual_spent_amount', e.target.value)} required />
            </div>
            <div className="hr-form-field">
              <label>Pending Request Amount *</label>
              <input type="number" min="0" step="0.01" value={form.pending_request_amount} onChange={(e) => updateForm('pending_request_amount', e.target.value)} required />
            </div>
          </div>
          <div className="hr-form-field">
            <label>Status *</label>
            <select value={form.status} onChange={(e) => updateForm('status', e.target.value)} required>
              {STATUSES.map((status) => <option key={status} value={status}>{capitalize(status)}</option>)}
            </select>
          </div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="hr-btn-primary">{editingLine ? 'Update Budget Line' : 'Add Budget Line'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Budget Line" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete budget line <strong>"{deleteTarget?.line_name}"</strong>? This cannot be undone.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
      </Modal>
    </>
  )
}