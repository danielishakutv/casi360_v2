import { useEffect, useMemo, useState } from 'react'
import { Clock3, Search, CheckCheck, RotateCcw, X, AlertCircle } from 'lucide-react'
import { getDemoApprovals, setDemoApprovals } from '../../data/financeDemoStore'
import { useDebounce } from '../../hooks/useDebounce'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import { capitalize } from '../../utils/capitalize'
import Pagination from '../../components/Pagination'
import Modal from '../../components/Modal'
import ApprovalChain, { buildChainFromDemo } from '../../components/ApprovalChain'

const PER_PAGE = 10

function priorityClass(p) {
  if (p === 'critical' || p === 'urgent') return 'red'
  if (p === 'high') return 'orange'
  return 'green'
}

const ACTIONS = [
  { key: 'approve',  label: 'Approve',          icon: <CheckCheck size={13} />, cls: 'approve'  },
  { key: 'revision', label: 'Request Revision',  icon: <RotateCcw size={13} />, cls: 'revision' },
  { key: 'reject',   label: 'Reject',            icon: <X size={13} />,         cls: 'reject'   },
]

export default function OperationsApprovals() {
  const [allApprovals, setAllApprovals] = useState(() => getDemoApprovals())
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [page, setPage] = useState(1)

  /* Action modal */
  const [target, setTarget] = useState(null)
  const [action, setAction] = useState('approve')
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { setDemoApprovals(allApprovals) }, [allApprovals])

  /* Operations only sees items forwarded by Finance (procurement_status = 'pending') */
  const filtered = useMemo(() => {
    let items = allApprovals.filter((i) => i.procurement_status === 'pending')
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      items = items.filter((i) =>
        [i.reference, i.title, i.project_name, i.project_code, i.budget_line_name, i.requester, i.department]
          .filter(Boolean).join(' ').toLowerCase().includes(q)
      )
    }
    return items.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
  }, [allApprovals, debouncedSearch])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage   = Math.min(page, totalPages)
  const paged      = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)
  const meta = { current_page: safePage, last_page: totalPages, per_page: PER_PAGE, total: filtered.length, from: filtered.length ? (safePage - 1) * PER_PAGE + 1 : 0, to: Math.min(safePage * PER_PAGE, filtered.length) }

  function openAction(item, defaultAction = 'approve') {
    setTarget(item)
    setAction(defaultAction)
    setComments('')
  }
  function closeAction() { setTarget(null); setComments('') }

  function handleAction(e) {
    e.preventDefault()
    if (!target) return
    setSubmitting(true)
    setTimeout(() => {
      setAllApprovals((prev) => prev.map((item) => {
        if (item.id !== target.id) return item
        if (action === 'approve') {
          return { ...item, procurement_status: 'approved', current_stage: 'Approved', status: 'approved' }
        }
        if (action === 'revision') {
          return { ...item, procurement_status: 'revision', current_stage: 'Revision Requested', status: 'pending' }
        }
        if (action === 'reject') {
          return { ...item, procurement_status: 'rejected', current_stage: 'Rejected by Operations', status: 'rejected' }
        }
        return item
      }))
      setSubmitting(false)
      closeAction()
    }, 400)
  }

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card orange animate-in">
          <div className="stat-top"><div className="stat-icon orange"><Clock3 size={22} /></div></div>
          <div className="stat-value">{filtered.length}</div>
          <div className="stat-label">Awaiting Operations Sign-off</div>
        </div>
      </div>

      <div className="card animate-in" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: '12px 20px' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
            <strong style={{ color: 'var(--text-secondary)' }}>Operations approval queue.</strong>{' '}
            These items have been approved by the Budget Holder and forwarded by Finance for
            final logistics sign-off. Approve to complete the workflow, request revision, or reject.
          </p>
        </div>
      </div>

      <div className="card animate-in">
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input type="text" placeholder="Search by title, project, requester…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Project / Budget Line</th>
                <th>Requester</th>
                <th>Amount</th>
                <th>Approval Chain</th>
                <th>Priority</th>
                <th>Submitted</th>
                <th style={{ width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={8} className="hr-empty-cell">No items awaiting Operations approval.</td></tr>
              ) : paged.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="approvals-meta">
                      <span className="approvals-meta-main" style={{ color: 'var(--primary)', fontSize: 12 }}>{item.reference}</span>
                      <span className="approvals-meta-sub">{item.request_type.replace(/_/g, ' ')}</span>
                    </div>
                  </td>
                  <td>
                    <div className="approvals-meta">
                      <span className="approvals-meta-main">{item.project_name}</span>
                      <span className="approvals-meta-sub">{item.budget_line_name}</span>
                    </div>
                  </td>
                  <td>
                    <div className="approvals-meta">
                      <span className="approvals-meta-main">{item.requester}</span>
                      <span className="approvals-meta-sub">{item.department}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, fontSize: 13 }}>{naira(item.amount_requested)}</td>
                  <td><ApprovalChain chain={buildChainFromDemo(item)} /></td>
                  <td><span className={`card-badge ${priorityClass(item.priority)}`}>{capitalize(item.priority)}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {fmtDate(item.submitted_at)}
                    {item.due_date && <div style={{ color: new Date(item.due_date) < new Date() ? 'var(--danger)' : 'var(--text-faint)', fontSize: 11 }}>Due {fmtDate(item.due_date)}</div>}
                  </td>
                  <td>
                    <div className="approvals-action-row">
                      <button className="approval-action-btn approve"  onClick={() => openAction(item, 'approve')}><CheckCheck size={12} /> Approve</button>
                      <button className="approval-action-btn revision" onClick={() => openAction(item, 'revision')}><RotateCcw size={12} /></button>
                      <button className="approval-action-btn reject"   onClick={() => openAction(item, 'reject')}><X size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && <Pagination meta={meta} onPageChange={setPage} />}
      </div>

      {/* Action Modal */}
      <Modal open={!!target} onClose={closeAction} title="Operations Approval Action" size="sm">
        {target && (
          <form onSubmit={handleAction} className="hr-form">
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>{target.reference} — {target.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{target.project_name} · {naira(target.amount_requested)}</div>
              <div style={{ marginTop: 8 }}><ApprovalChain chain={buildChainFromDemo(target)} compact={false} /></div>
            </div>

            {/* Action selector */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {ACTIONS.map(({ key, label, icon, cls }) => (
                <button
                  key={key}
                  type="button"
                  className={`approval-action-btn ${cls}`}
                  style={{ opacity: action === key ? 1 : 0.45, outline: action === key ? '2px solid currentColor' : 'none', outlineOffset: 2 }}
                  onClick={() => setAction(key)}
                >
                  {icon} {label}
                </button>
              ))}
            </div>

            <div className="hr-form-field">
              <label>Comments {(action === 'reject' || action === 'revision') ? '*' : '(optional)'}</label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                placeholder={
                  action === 'reject'   ? 'Reason for rejection (required)…' :
                  action === 'revision' ? 'What needs to be corrected? (required)…' :
                  'Optional logistics notes…'
                }
                required={action === 'reject' || action === 'revision'}
              />
            </div>

            <div className="hr-form-actions">
              <button type="button" className="hr-btn-secondary" onClick={closeAction}>Cancel</button>
              <button
                type="submit"
                className={action === 'reject' ? 'hr-btn-danger' : 'hr-btn-primary'}
                disabled={submitting}
              >
                {submitting ? 'Processing…' : ACTIONS.find((a) => a.key === action)?.label}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
