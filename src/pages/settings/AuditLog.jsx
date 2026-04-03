import { useState, useEffect, useCallback } from 'react'
import { Search, AlertCircle, ChevronDown, ChevronUp, Calendar, Filter } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { fmtDate } from '../../utils/formatDate'
import { settingsApi } from '../../services/api'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import Pagination from '../../components/Pagination'

const PER_PAGE = 30

function actionBadge(action) {
  const map = { created: 'green', updated: 'blue', deleted: 'purple', login: 'gray', logout: 'gray' }
  const color = map[action] || 'gray'
  return <span className={`card-badge ${color}`}>{capitalize(action)}</span>
}

function DiffDisplay({ oldValues, newValues }) {
  if (!oldValues && !newValues) return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No detail available</span>

  const old = typeof oldValues === 'string' ? tryParse(oldValues) : oldValues
  const nv = typeof newValues === 'string' ? tryParse(newValues) : newValues

  if (!old && !nv) return null

  const allKeys = [...new Set([...Object.keys(old || {}), ...Object.keys(nv || {})])]

  if (allKeys.length === 0) return null

  return (
    <div style={{ fontSize: 12, marginTop: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 11 }}>Field</th>
            <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 11 }}>Before</th>
            <th style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 11 }}>After</th>
          </tr>
        </thead>
        <tbody>
          {allKeys.map((key) => {
            const before = old?.[key]
            const after = nv?.[key]
            const changed = JSON.stringify(before) !== JSON.stringify(after)
            return (
              <tr key={key} style={{ background: changed ? 'rgba(59,130,246,0.04)' : 'transparent' }}>
                <td style={{ padding: '3px 8px', fontWeight: 500 }}>{key}</td>
                <td style={{ padding: '3px 8px', color: changed ? 'var(--danger, #ef4444)' : 'var(--text-muted)' }}>
                  {before != null ? String(before) : '\u2014'}
                </td>
                <td style={{ padding: '3px 8px', color: changed ? 'var(--success, #22c55e)' : 'var(--text-muted)' }}>
                  {after != null ? String(after) : '\u2014'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function tryParse(str) {
  try { return JSON.parse(str) } catch { return null }
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
            <div className="search-box"><Search size={16} className="search-icon" /><input type="text" placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          </div>
          <div className="hr-toolbar-right" style={{ flexWrap: 'wrap', gap: 8 }}>
            <select className="hr-filter-select" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
              <option value="">All Actions</option>
              {['created', 'updated', 'deleted', 'login', 'logout'].map((a) => <option key={a} value={a}>{capitalize(a)}</option>)}
            </select>
            <select className="hr-filter-select" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
              <option value="">All Entities</option>
              {['user', 'project', 'staff', 'department', 'vendor', 'purchase_request', 'purchase_order', 'setting', 'permission'].map((e) => (
                <option key={e} value={e}>{capitalize(e.replace(/_/g, ' '))}</option>
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
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Description</th>
                <th>IP Address</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '12px auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="hr-empty-cell">No audit logs found</td></tr>
              ) : items.map((log) => {
                const isOpen = !!expanded[log.id]
                const hasDetail = log.old_values || log.new_values
                return (
                  <>
                    <tr key={log.id} style={{ cursor: hasDetail ? 'pointer' : 'default' }} onClick={() => hasDetail && toggleExpand(log.id)}>
                      <td style={{ textAlign: 'center' }}>
                        {hasDetail && (isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                      </td>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>{log.user?.name || log.user_name || '\u2014'}</td>
                      <td>{actionBadge(log.action)}</td>
                      <td>
                        <span style={{ fontSize: 12 }}>{capitalize((log.entity_type || '').replace(/_/g, ' '))}</span>
                        {log.entity_id && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>#{log.entity_id}</span>}
                      </td>
                      <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.description || '\u2014'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{log.ip_address || '\u2014'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(log.created_at)}</td>
                    </tr>
                    {isOpen && (
                      <tr key={`detail-${log.id}`}>
                        <td colSpan={7} style={{ background: 'var(--bg-surface, var(--card-bg-hover, #f5f5f5))', padding: '8px 16px' }}>
                          <DiffDisplay oldValues={log.old_values} newValues={log.new_values} />
                        </td>
                      </tr>
                    )}
                  </>
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
