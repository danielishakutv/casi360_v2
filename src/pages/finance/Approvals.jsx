import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, CheckCheck, ChevronDown, ChevronRight, Clock3, RefreshCw, RotateCcw, Search, X } from 'lucide-react'
import { approvalsApi, purchaseRequestsApi } from '../../services/procurement'
import { useDebounce } from '../../hooks/useDebounce'
import { naira } from '../../utils/currency'
import { fmtDate } from '../../utils/formatDate'
import { capitalize } from '../../utils/capitalize'
import Pagination from '../../components/Pagination'
import Modal from '../../components/Modal'
import ApprovalChain, { buildChainFromPR } from '../../components/ApprovalChain'

const PER_PAGE = 10
const HISTORY_PER_PAGE = 10

function priorityClass(p) {
  if (p === 'critical' || p === 'urgent') return 'red'
  if (p === 'high') return 'orange'
  return 'green'
}

const ACTION_META = {
  approve:  { label: 'Approve (Final)',       icon: <CheckCheck size={13} />,   cls: 'approve'  },
  forward:  { label: 'Forward to Operations', icon: <ChevronRight size={13} />, cls: 'forward'  },
  revision: { label: 'Request Revision',      icon: <RotateCcw size={13} />,    cls: 'revision' },
  reject:   { label: 'Reject',                icon: <X size={13} />,            cls: 'reject'   },
}

export default function FinanceApprovals() {
  const [reqs, setReqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [page, setPage] = useState(1)

  /* History section */
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const debouncedHistorySearch = useDebounce(historySearch)
  const [historyPage, setHistoryPage] = useState(1)
  const historyFetched = useRef(false)

  /* Action modal */
  const [target, setTarget] = useState(null)
  const [action, setAction] = useState('approve')
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await approvalsApi.pending()
      const d = res?.data || res || {}
      setReqs(d.requisitions || [])
    } catch (err) {
      setError(err.message || 'Failed to load pending approvals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError('')
    try {
      const res = await approvalsApi.pending({ scope: 'history' })
      const d = res?.data || res || {}
      setHistory(d.requisitions || [])
      historyFetched.current = true
    } catch (err) {
      setHistoryError(err.message || 'Failed to load history')
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (historyOpen && !historyFetched.current) fetchHistory()
  }, [historyOpen, fetchHistory])

  const filteredHistory = useMemo(() => {
    if (!debouncedHistorySearch) return history
    const q = debouncedHistorySearch.toLowerCase()
    return history.filter((i) =>
      [i.requisition_number, i.title, i.project_name, i.requested_by_name, i.department]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    )
  }, [history, debouncedHistorySearch])

  const historyTotalPages = Math.max(1, Math.ceil(filteredHistory.length / HISTORY_PER_PAGE))
  const safeHistoryPage   = Math.min(historyPage, historyTotalPages)
  const pagedHistory      = filteredHistory.slice((safeHistoryPage - 1) * HISTORY_PER_PAGE, safeHistoryPage * HISTORY_PER_PAGE)
  const historyMeta = { current_page: safeHistoryPage, last_page: historyTotalPages, per_page: HISTORY_PER_PAGE, total: filteredHistory.length, from: filteredHistory.length ? (safeHistoryPage - 1) * HISTORY_PER_PAGE + 1 : 0, to: Math.min(safeHistoryPage * HISTORY_PER_PAGE, filteredHistory.length) }

  const filtered = useMemo(() => {
    let items = [...reqs]
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      items = items.filter((i) =>
        [i.requisition_number, i.title, i.project_name, i.project_code, i.requested_by_name, i.department]
          .filter(Boolean).join(' ').toLowerCase().includes(q)
      )
    }
    return items
  }, [reqs, debouncedSearch])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage   = Math.min(page, totalPages)
  const paged      = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)
  const meta = { current_page: safePage, last_page: totalPages, per_page: PER_PAGE, total: filtered.length, from: filtered.length ? (safePage - 1) * PER_PAGE + 1 : 0, to: Math.min(safePage * PER_PAGE, filtered.length) }

  const pendingAmount = reqs.reduce((s, i) => s + (i.estimated_cost || 0), 0)

  function openAction(item, defaultAction) {
    setTarget(item)
    setAction(defaultAction)
    setComments('')
  }
  function closeAction() { setTarget(null); setComments('') }

  async function handleAction(e) {
    e.preventDefault()
    if (!target) return
    setSubmitting(true)
    setError('')
    try {
      await purchaseRequestsApi.processApproval(target.id, { action, comments: comments || undefined })
      closeAction()
      fetchData()
    } catch (err) {
      setError(err.message || 'Approval action failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {error && (
        <div className="hr-error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="hr-error-dismiss">&times;</button>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card orange animate-in">
          <div className="stat-top"><div className="stat-icon orange"><Clock3 size={22} /></div></div>
          <div className="stat-value">{reqs.length}</div>
          <div className="stat-label">Awaiting Finance Decision</div>
        </div>
        <div className="stat-card blue animate-in">
          <div className="stat-top"><div className="stat-icon blue"><Clock3 size={22} /></div></div>
          <div className="stat-value">{naira(pendingAmount)}</div>
          <div className="stat-label">Total Pending Amount</div>
        </div>
      </div>

      <div className="card animate-in" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: '12px 20px' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
            <strong style={{ color: 'var(--text-secondary)' }}>Finance approval queue.</strong>{' '}
            Items reach this queue after the Budget Holder has approved. You can approve as final,
            forward to Operations for logistics sign-off, request revision, or reject.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card animate-in" style={{ textAlign: 'center', padding: 40 }}>
          <div className="auth-spinner large" style={{ margin: '0 auto' }} />
        </div>
      ) : (
        <div className="card animate-in">
          <div className="hr-toolbar">
            <div className="hr-toolbar-left">
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by title, project, requester…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                />
              </div>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Title / Project</th>
                  <th>Requester</th>
                  <th>Amount</th>
                  <th>Budget Effect</th>
                  <th>Approval Chain</th>
                  <th>Priority</th>
                  <th>Submitted</th>
                  <th style={{ width: 220 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={9} className="hr-empty-cell">No items awaiting your approval.</td></tr>
                ) : paged.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="approvals-meta">
                        <span className="approvals-meta-main" style={{ color: 'var(--primary)', fontSize: 12 }}>{item.requisition_number}</span>
                        <span className="approvals-meta-sub">{item.request_type?.replace(/_/g, ' ')}</span>
                      </div>
                    </td>
                    <td>
                      <div className="approvals-meta">
                        <span className="approvals-meta-main">{item.title}</span>
                        <span className="approvals-meta-sub">{item.project_name || item.project_code}</span>
                      </div>
                    </td>
                    <td>
                      <div className="approvals-meta">
                        <span className="approvals-meta-main">{item.requested_by_name || '—'}</span>
                        <span className="approvals-meta-sub">{item.department}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: 13 }}>{naira(item.estimated_cost)}</td>
                    <td>
                      <div className="approvals-budget-row">
                        <div className="approvals-budget-item"><label>Before</label><span>—</span></div>
                        <div className="approvals-budget-item"><label>After</label><span>—</span></div>
                      </div>
                    </td>
                    <td><ApprovalChain chain={buildChainFromPR(item)} /></td>
                    <td><span className={`card-badge ${priorityClass(item.priority)}`}>{capitalize(item.priority || 'normal')}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {fmtDate(item.submitted_at || item.created_at)}
                      {item.due_date && (
                        <div style={{ color: new Date(item.due_date) < new Date() ? 'var(--danger)' : 'var(--text-faint)', fontSize: 11 }}>
                          Due {fmtDate(item.due_date)}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="approvals-action-row">
                        <button className="approval-action-btn approve"  onClick={() => openAction(item, 'approve')}><CheckCheck size={12} /> Approve</button>
                        <button className="approval-action-btn forward"  onClick={() => openAction(item, 'forward')}><ChevronRight size={12} /> Fwd Ops</button>
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
      )}

      {/* ─── History Section ─── */}
      <div className="card animate-in" style={{ marginTop: 16 }}>
        <div className="approvals-history-header" onClick={() => setHistoryOpen((o) => !o)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Approval History</h3>
            {historyFetched.current && <span className="card-badge gray">{history.length}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {historyOpen && (
              <button
                type="button"
                className="hr-action-btn"
                style={{ width: 28, height: 28 }}
                onClick={(e) => { e.stopPropagation(); historyFetched.current = false; fetchHistory() }}
                title="Refresh"
              >
                <RefreshCw size={13} />
              </button>
            )}
            <ChevronDown size={16} style={{ color: 'var(--text-muted)', transition: 'transform 0.2s', transform: historyOpen ? 'rotate(180deg)' : 'none' }} />
          </div>
        </div>

        {historyOpen && (
          <div>
            {historyError && (
              <div className="hr-error-banner" style={{ margin: '0 16px 12px' }}>
                <AlertCircle size={14} /><span>{historyError}</span>
              </div>
            )}

            <div className="hr-toolbar" style={{ borderTop: '1px solid var(--border-color)', padding: '10px 16px' }}>
              <div className="search-box">
                <Search size={15} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search history…"
                  value={historySearch}
                  onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1) }}
                />
              </div>
            </div>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Title / Project</th>
                    <th>Requester</th>
                    <th>Amount</th>
                    <th>Approval Chain</th>
                    <th>Status</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr><td colSpan={7} className="hr-empty-cell"><div className="auth-spinner" style={{ margin: '16px auto' }} /></td></tr>
                  ) : pagedHistory.length === 0 ? (
                    <tr><td colSpan={7} className="hr-empty-cell">No processed approvals yet.</td></tr>
                  ) : pagedHistory.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="approvals-meta">
                          <span className="approvals-meta-main" style={{ color: 'var(--primary)', fontSize: 12 }}>{item.requisition_number}</span>
                          <span className="approvals-meta-sub">{item.request_type?.replace(/_/g, ' ')}</span>
                        </div>
                      </td>
                      <td>
                        <div className="approvals-meta">
                          <span className="approvals-meta-main">{item.title}</span>
                          <span className="approvals-meta-sub">{item.project_name || item.project_code}</span>
                        </div>
                      </td>
                      <td>
                        <div className="approvals-meta">
                          <span className="approvals-meta-main">{item.requested_by_name || '—'}</span>
                          <span className="approvals-meta-sub">{item.department}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, fontSize: 13 }}>{naira(item.estimated_cost)}</td>
                      <td><ApprovalChain chain={buildChainFromPR(item)} /></td>
                      <td><span className={`status-badge ${item.status}`}><span className="status-dot" />{capitalize((item.status || '').replace(/_/g, ' '))}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(item.submitted_at || item.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredHistory.length > HISTORY_PER_PAGE && <Pagination meta={historyMeta} onPageChange={setHistoryPage} />}
          </div>
        )}
      </div>

      {/* Action Modal */}
      <Modal open={!!target} onClose={closeAction} title="Finance Approval Action" size="sm">
        {target && (
          <form onSubmit={handleAction} className="hr-form">
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>
                {target.requisition_number} — {target.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {target.project_name || target.project_code} · {naira(target.estimated_cost)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {Object.entries(ACTION_META).map(([key, { label, icon, cls }]) => (
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

            {action === 'forward' && (
              <div className="hr-error-banner" style={{ background: 'var(--badge-blue-bg)', color: 'var(--badge-blue-fg)', border: 'none', marginBottom: 12 }}>
                <AlertCircle size={14} />
                <span>This will forward the request to the Operations team for final approval.</span>
              </div>
            )}

            <div className="hr-form-field">
              <label>Comments {(action === 'reject' || action === 'revision') ? '*' : '(optional)'}</label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                placeholder={
                  action === 'reject'   ? 'State reason for rejection…' :
                  action === 'revision' ? 'Describe what needs to be corrected…' :
                  action === 'forward'  ? 'Notes for Operations team (optional)…' :
                  'Optional approval note…'
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
                {submitting ? 'Processing…' : ACTION_META[action].label}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
