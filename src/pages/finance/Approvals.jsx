import { useMemo, useState } from 'react'
import { Clock3, Search } from 'lucide-react'
import { demoFinanceApprovals } from '../../data/financeDemo'
import { useDebounce } from '../../hooks/useDebounce'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import { capitalize } from '../../utils/capitalize'
import Pagination from '../../components/Pagination'

const PER_PAGE = 10

export default function FinanceApprovals() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let items = [...demoFinanceApprovals]
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase()
      items = items.filter((item) =>
        [
          item.reference,
          item.title,
          item.project_name,
          item.project_code,
          item.budget_line_name,
          item.requester,
          item.department,
          item.current_stage,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query)
      )
    }
    if (statusFilter) items = items.filter((item) => item.status === statusFilter)
    if (priorityFilter) items = items.filter((item) => item.priority === priorityFilter)
    return items.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
  }, [debouncedSearch, statusFilter, priorityFilter])

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

  const pendingItems = filtered.filter((item) => item.status === 'pending')
  const pendingAmount = pendingItems.reduce((sum, item) => sum + item.amount_requested, 0)

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card orange animate-in">
          <div className="stat-top"><div className="stat-icon orange"><Clock3 size={22} /></div></div>
          <div className="stat-value">{pendingItems.length}</div>
          <div className="stat-label">Pending Finance Decisions</div>
        </div>
        <div className="stat-card blue animate-in">
          <div className="stat-top"><div className="stat-icon blue"><Clock3 size={22} /></div></div>
          <div className="stat-value">{naira(pendingAmount)}</div>
          <div className="stat-label">Pending Amount</div>
        </div>
      </div>

      <div className="card animate-in" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h3>Approval Workflow Queue</h3>
          <span className="card-badge orange">Demo-backed</span>
        </div>
        <div className="card-body">
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
            Each item in this queue carries the project, budget line, requested amount, and budget effect so finance can decide before procurement proceeds.
          </p>
        </div>
      </div>

      <div className="card animate-in">
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input type="text" placeholder="Search approvals, projects, or budget lines…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select className="hr-filter-select" value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1) }}>
              <option value="">All Priority</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Project / Budget Line</th>
                <th>Requester</th>
                <th>Requested</th>
                <th>Available Before</th>
                <th>Available After</th>
                <th>Stage</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={9} className="hr-empty-cell">No approvals match the current filters.</td></tr>
              ) : paged.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{item.reference}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.request_type.replace(/_/g, ' ')}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{item.project_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.budget_line_name}</div>
                  </td>
                  <td>
                    <div>{item.requester}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.department}</div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{naira(item.amount_requested)}</td>
                  <td>{naira(item.available_before)}</td>
                  <td style={{ fontWeight: 600 }}>{naira(item.available_after)}</td>
                  <td>{item.current_stage}</td>
                  <td><span className={`status-badge ${item.status}`}><span className="status-dot" />{capitalize(item.status)}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(item.submitted_at)}</td>
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