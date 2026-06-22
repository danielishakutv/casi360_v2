import { useState, useEffect, useCallback, Fragment } from 'react'
import { Search, AlertCircle, ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { fmtDateTime } from '../../utils/formatDate'
import { settingsApi } from '../../services/api'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import Pagination from '../../components/Pagination'

const PER_PAGE = 30

/* ──────────────────────────────────────────────────────────────────
 * Plain-English helpers — turn raw audit rows ("notice_updated",
 * "User #a213…") into something any reader can understand.
 * ────────────────────────────────────────────────────────────────── */

function tryParse(str) {
  try { return JSON.parse(str) } catch { return null }
}

/* Friendly noun for each entity type. */
const ENTITY_NOUNS = {
  user: 'user account',
  employee: 'staff member',
  department: 'department',
  designation: 'designation',
  leave_type: 'leave type',
  holiday: 'holiday',
  note: 'note',
  project: 'project',
  vendor: 'vendor',
  vendor_category: 'vendor category',
  inventory_item: 'inventory item',
  requisition: 'purchase request',
  purchase_order: 'purchase order',
  boq: 'bill of quantities',
  rfq: 'request for quotation',
  rfp: 'payment request',
  grn: 'goods received note',
  invoice: 'invoice',
  notice: 'notice',
  forum: 'forum',
  forum_message: 'forum message',
  message: 'message',
  email: 'email',
  sms: 'SMS',
  system_setting: 'system setting',
  permission: 'permission',
  help_article: 'help article',
  support_ticket: 'support ticket',
}

function entityNoun(type) {
  if (!type) return 'record'
  return ENTITY_NOUNS[type] || type.replace(/_/g, ' ')
}

/* Pull a human-friendly name for the affected record out of the
   before/after snapshots (title, name, number, …) rather than its UUID. */
function entityName(log) {
  const snap =
    (typeof log.new_values === 'string' ? tryParse(log.new_values) : log.new_values) ||
    (typeof log.old_values === 'string' ? tryParse(log.old_values) : log.old_values) ||
    {}
  const keys = [
    'title', 'name', 'subject', 'payee', 'forum',
    'requisition_number', 'boq_number', 'po_number', 'rfq_number',
    'rfp_number', 'grn_number', 'invoice_number', 'number',
    'staff_id', 'email', 'label', 'code',
  ]
  for (const k of keys) {
    const val = snap?.[k]
    if (val != null && String(val).trim() !== '') return String(val)
  }
  return null
}

/* Short verb for the Action badge. */
function actionVerb(action) {
  const a = (action || '').toLowerCase()
  const direct = {
    login_success: 'Signed in',
    login_failed: 'Failed sign-in',
    logout: 'Signed out',
    role_changed: 'Role changed',
    user_status_changed: 'Status changed',
    employee_status_changed: 'Status changed',
    user_password_reset: 'Password reset',
    user_deactivated: 'Deactivated',
    accounts_removed: 'Account removed',
    employees_removed: 'Staff removed',
    forum_message_posted: 'Posted',
  }
  if (direct[a]) return direct[a]
  const verb = a.split('_').pop()
  const map = {
    created: 'Created', updated: 'Updated', deleted: 'Deleted',
    terminated: 'Terminated', deactivated: 'Deactivated', activated: 'Activated',
    added: 'Added', removed: 'Removed', posted: 'Posted', sent: 'Sent',
    submitted: 'Submitted', approved: 'Approved', rejected: 'Rejected',
    forwarded: 'Forwarded', changed: 'Changed', reset: 'Reset', success: 'Success',
  }
  return map[verb] || capitalize(a.replace(/_/g, ' '))
}

function actionColor(action) {
  const a = (action || '').toLowerCase()
  if (/(delete|remov|terminat|deactivat|reject|failed)/.test(a)) return 'red'
  if (/(creat|add|approv|activ)/.test(a)) return 'green'
  if (/(login|logout)/.test(a)) return 'gray'
  if (/(updat|chang|edit|reset)/.test(a)) return 'blue'
  if (/(post|sent|submit|forward)/.test(a)) return 'purple'
  return 'gray'
}

function actionBadge(action) {
  return <span className={`card-badge ${actionColor(action)}`}>{actionVerb(action)}</span>
}

/* Full "who did what" sentence. */
function describe(log) {
  const who = log.user || 'System'
  const a = (log.action || '').toLowerCase()
  const name = entityName(log)
  const noun = entityNoun(log.entity_type)
  const named = name ? `the ${noun} “${name}”` : `a ${noun}`

  switch (a) {
    case 'login_success': return `${who} signed in.`
    case 'login_failed':  return `A failed sign-in attempt was recorded${name ? ` for ${name}` : ''}.`
    case 'logout':        return `${who} signed out.`
    case 'accounts_removed': return `${who} removed ${name ? `the user account for ${name}` : 'a user account'}.`
    case 'employees_removed': return `${who} removed ${name ? `${name} from staff` : 'a staff member'}.`
    case 'role_changed':  return `${who} changed the role of ${name || 'a user'}.`
    case 'user_status_changed':
    case 'employee_status_changed': return `${who} changed the status of ${name || `a ${noun}`}.`
    case 'user_password_reset': return `${who} reset the password for ${name || 'a user'}.`
    case 'forum_message_posted': return `${who} posted a message${name ? ` in the “${name}” forum` : ''}.`
    default: break
  }

  const verb = a.split('_').pop()
  const phrase = {
    created: 'created', updated: 'updated', deleted: 'deleted',
    terminated: 'terminated', deactivated: 'deactivated', activated: 'activated',
    added: 'added', removed: 'removed', submitted: 'submitted',
    approved: 'approved', rejected: 'rejected', forwarded: 'forwarded',
    sent: 'sent', posted: 'posted',
  }[verb]
  if (phrase) return `${who} ${phrase} ${named}.`
  return `${who} performed "${actionVerb(log.action)}" on ${named}.`
}

/* ──────────────────────────────────────────────────────────────────
 * Before / after detail table (expandable row).
 * ────────────────────────────────────────────────────────────────── */

const HIDDEN_DIFF_KEYS = new Set(['id', 'created_at', 'updated_at', 'deleted_at'])

function fieldLabel(key) {
  return capitalize(key.replace(/_id$/, '').replace(/_/g, ' '))
}

function fieldValue(val) {
  if (val == null || val === '') return '—'
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function DiffDisplay({ oldValues, newValues }) {
  const old = typeof oldValues === 'string' ? tryParse(oldValues) : oldValues
  const nv = typeof newValues === 'string' ? tryParse(newValues) : newValues

  if (!old && !nv) return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No further detail recorded.</span>

  const allKeys = [...new Set([...Object.keys(old || {}), ...Object.keys(nv || {})])]
    .filter((k) => !HIDDEN_DIFF_KEYS.has(k))

  if (allKeys.length === 0) return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No further detail recorded.</span>

  const isUpdate = old && nv

  return (
    <div style={{ fontSize: 12, marginTop: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: 11 }}>Field</th>
            {isUpdate && <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: 11 }}>Before</th>}
            <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: 11 }}>{isUpdate ? 'After' : 'Value'}</th>
          </tr>
        </thead>
        <tbody>
          {allKeys.map((key) => {
            const before = old?.[key]
            const after = nv?.[key]
            const changed = isUpdate && JSON.stringify(before) !== JSON.stringify(after)
            return (
              <tr key={key} style={{ background: changed ? 'rgba(59,130,246,0.06)' : 'transparent' }}>
                <td style={{ padding: '3px 8px', fontWeight: 500, whiteSpace: 'nowrap' }}>{fieldLabel(key)}</td>
                {isUpdate && (
                  <td style={{ padding: '3px 8px', color: changed ? 'var(--danger, #ef4444)' : 'var(--text-muted)' }}>
                    {fieldValue(before)}
                  </td>
                )}
                <td style={{ padding: '3px 8px', color: changed ? 'var(--success, #22c55e)' : 'var(--text-secondary)' }}>
                  {fieldValue(after !== undefined ? after : before)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function AuditLog() {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState({})

  const fetchLogs = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = {
        page,
        per_page: PER_PAGE,
        search: debouncedSearch || undefined,
        action: actionFilter || undefined,
        entity_type: entityFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }
      const res = await settingsApi.auditLog(params)
      const data = res?.data || res
      setItems(data?.audit_logs || data?.logs || extractItems(res))
      setMeta(data?.meta || extractMeta(res))
    } catch (err) { setError(err.message || 'Failed to load audit log') }
    finally { setLoading(false) }
  }, [debouncedSearch, actionFilter, entityFilter, dateFrom, dateTo, page])

  useEffect(() => { fetchLogs() }, [fetchLogs])
  useEffect(() => { setPage(1) }, [debouncedSearch, actionFilter, entityFilter, dateFrom, dateTo])

  function toggleExpand(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
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
        <div className="hr-toolbar" style={{ flexWrap: 'wrap' }}>
          <div className="hr-toolbar-left">
            <div className="search-box"><Search size={16} className="search-icon" /><input type="text" placeholder="Search by person or action..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          </div>
          <div className="hr-toolbar-right" style={{ flexWrap: 'wrap', gap: 8 }}>
            <select className="hr-filter-select" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
              <option value="">All Areas</option>
              {[
                ['user', 'User accounts'],
                ['employee', 'Staff'],
                ['department', 'Departments'],
                ['project', 'Projects'],
                ['vendor', 'Vendors'],
                ['requisition', 'Purchase requests'],
                ['purchase_order', 'Purchase orders'],
                ['notice', 'Notices'],
                ['forum_message', 'Forum messages'],
                ['system_setting', 'System settings'],
                ['permission', 'Permissions'],
              ].map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
              <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ fontSize: 12 }} />
              <span style={{ color: 'var(--text-muted)' }}>to</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ fontSize: 12 }} />
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}></th>
                <th>What happened</th>
                <th>Action</th>
                <th>Person</th>
                <th>When</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '12px auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="hr-empty-cell">No audit logs found</td></tr>
              ) : items.map((log) => {
                const isOpen = !!expanded[log.id]
                const hasDetail = log.old_values || log.new_values
                return (
                  <Fragment key={log.id}>
                    <tr style={{ cursor: hasDetail ? 'pointer' : 'default' }} onClick={() => hasDetail && toggleExpand(log.id)}>
                      <td style={{ textAlign: 'center' }}>
                        {hasDetail && (isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                      </td>
                      <td style={{ fontSize: 13, minWidth: 240, maxWidth: 420 }}>{describe(log)}</td>
                      <td>{actionBadge(log.action)}</td>
                      <td style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap' }}>{log.user || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDateTime(log.timestamp)}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{log.ip_address || '—'}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={6} style={{ background: 'var(--bg-card-hover)', padding: '8px 16px' }}>
                          <DiffDisplay oldValues={log.old_values} newValues={log.new_values} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
        {meta && <Pagination meta={meta} onPageChange={setPage} />}
      </div>
    </>
  )
}
