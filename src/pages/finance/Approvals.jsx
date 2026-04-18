import { useEffect, useMemo, useState } from 'react'
import { Clock3, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { getDemoApprovals, makeDemoId, setDemoApprovals } from '../../data/financeDemoStore'
import { useDebounce } from '../../hooks/useDebounce'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import { capitalize } from '../../utils/capitalize'
import Pagination from '../../components/Pagination'
import Modal from '../../components/Modal'

const PER_PAGE = 10
const STATUSES = ['pending', 'approved', 'rejected']
const PRIORITIES = ['medium', 'high', 'critical']

const INITIAL_FORM = {
  reference: '',
  title: '',
  project_name: '',
  project_code: '',
  budget_line_name: '',
  request_type: 'purchase_request',
  requester: '',
  department: '',
  amount_requested: 0,
  available_before: 0,
  current_stage: 'Finance Review',
  status: 'pending',
  priority: 'medium',
  submitted_at: new Date().toISOString().slice(0, 10),
}

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeApprovalPayload(form) {
  const amount = toNumber(form.amount_requested)
  const availableBefore = toNumber(form.available_before)
  return {
    reference: form.reference.trim().toUpperCase(),
    title: form.title.trim(),
    project_name: form.project_name.trim(),
    project_code: form.project_code.trim().toUpperCase(),
    budget_line_name: form.budget_line_name.trim(),
    request_type: form.request_type.trim(),
    requester: form.requester.trim(),
    department: form.department.trim(),
    amount_requested: amount,
    available_before: availableBefore,
    available_after: Math.max(availableBefore - amount, 0),
    current_stage: form.current_stage.trim(),
    status: form.status,
    priority: form.priority,
    submitted_at: form.submitted_at,
  }
}

export default function FinanceApprovals() {
  const [approvals, setApprovals] = useState(() => getDemoApprovals())
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    setDemoApprovals(approvals)
  }, [approvals])

  const filtered = useMemo(() => {
    let items = [...approvals]
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
  }, [approvals, debouncedSearch, statusFilter, priorityFilter])

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

  function openCreateModal() {
    setEditingItem(null)
    setForm({ ...INITIAL_FORM, submitted_at: new Date().toISOString().slice(0, 10) })
    setModalOpen(true)
  }

  function openEditModal(item) {
    setEditingItem(item)
    setForm({
      reference: item.reference,
      title: item.title,
      project_name: item.project_name,
      project_code: item.project_code,
      budget_line_name: item.budget_line_name,
      request_type: item.request_type,
      requester: item.requester,
      department: item.department,
      amount_requested: item.amount_requested,
      available_before: item.available_before,
      current_stage: item.current_stage,
      status: item.status,
      priority: item.priority,
      submitted_at: item.submitted_at,
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingItem(null)
  }

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = normalizeApprovalPayload(form)
    if (editingItem) {
      setApprovals((prev) => prev.map((item) => (item.id === editingItem.id ? { ...item, ...payload } : item)))
    } else {
      setApprovals((prev) => [{ id: makeDemoId('approval'), ...payload }, ...prev])
    }
    closeModal()
  }

  function confirmDelete() {
    if (!deleteTarget) return
    setApprovals((prev) => prev.filter((item) => item.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

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
            <button className="hr-btn-primary" onClick={openCreateModal}><Plus size={16} /> Add Approval</button>
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
                <th style={{ width: 130 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={10} className="hr-empty-cell">No approvals match the current filters.</td></tr>
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
                  <td>
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => openEditModal(item)} title="Edit approval"><Pencil size={15} /></button>
                      <button className="hr-action-btn danger" onClick={() => setDeleteTarget(item)} title="Delete approval"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && <Pagination meta={meta} onPageChange={setPage} />}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editingItem ? 'Edit Approval' : 'Add Approval'}>
        <form onSubmit={handleSubmit} className="hr-form">
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Reference *</label>
              <input type="text" value={form.reference} onChange={(e) => updateForm('reference', e.target.value)} required />
            </div>
            <div className="hr-form-field">
              <label>Request Type *</label>
              <input type="text" value={form.request_type} onChange={(e) => updateForm('request_type', e.target.value)} required />
            </div>
          </div>
          <div className="hr-form-field">
            <label>Title *</label>
            <input type="text" value={form.title} onChange={(e) => updateForm('title', e.target.value)} required />
          </div>
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
              <label>Budget Line *</label>
              <input type="text" value={form.budget_line_name} onChange={(e) => updateForm('budget_line_name', e.target.value)} required />
            </div>
            <div className="hr-form-field">
              <label>Department *</label>
              <input type="text" value={form.department} onChange={(e) => updateForm('department', e.target.value)} required />
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Requester *</label>
              <input type="text" value={form.requester} onChange={(e) => updateForm('requester', e.target.value)} required />
            </div>
            <div className="hr-form-field">
              <label>Current Stage *</label>
              <input type="text" value={form.current_stage} onChange={(e) => updateForm('current_stage', e.target.value)} required />
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Amount Requested *</label>
              <input type="number" min="0" step="0.01" value={form.amount_requested} onChange={(e) => updateForm('amount_requested', e.target.value)} required />
            </div>
            <div className="hr-form-field">
              <label>Available Before *</label>
              <input type="number" min="0" step="0.01" value={form.available_before} onChange={(e) => updateForm('available_before', e.target.value)} required />
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Status *</label>
              <select value={form.status} onChange={(e) => updateForm('status', e.target.value)} required>
                {STATUSES.map((status) => <option key={status} value={status}>{capitalize(status)}</option>)}
              </select>
            </div>
            <div className="hr-form-field">
              <label>Priority *</label>
              <select value={form.priority} onChange={(e) => updateForm('priority', e.target.value)} required>
                {PRIORITIES.map((priority) => <option key={priority} value={priority}>{capitalize(priority)}</option>)}
              </select>
            </div>
          </div>
          <div className="hr-form-field">
            <label>Submitted Date *</label>
            <input type="date" value={form.submitted_at} onChange={(e) => updateForm('submitted_at', e.target.value)} required />
          </div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="hr-btn-primary">{editingItem ? 'Update Approval' : 'Add Approval'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Approval" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete approval <strong>"{deleteTarget?.reference}"</strong>? This cannot be undone.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
      </Modal>
    </>
  )
}