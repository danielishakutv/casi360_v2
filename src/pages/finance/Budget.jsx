import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { demoFinanceBudgetLines, getFinanceFilterOptions } from '../../data/financeDemo'
import { useDebounce } from '../../hooks/useDebounce'
import { naira } from '../../utils/currency'
import { capitalize } from '../../utils/capitalize'
import Pagination from '../../components/Pagination'

const PER_PAGE = 12

export default function FinanceBudget() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [projectFilter, setProjectFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const options = getFinanceFilterOptions()

  const filtered = useMemo(() => {
    let items = [...demoFinanceBudgetLines]
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
  }, [debouncedSearch, projectFilter, departmentFilter, categoryFilter, statusFilter])

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
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={11} className="hr-empty-cell">No budget lines match the current filters.</td></tr>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && <Pagination meta={meta} onPageChange={setPage} />}
      </div>
    </>
  )
}