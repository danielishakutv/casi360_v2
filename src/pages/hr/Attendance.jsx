import { useState, useEffect, useCallback } from 'react'
import {
  Clock, LogIn, LogOut, CheckCircle2, AlertCircle, RefreshCw,
  Users, UserCheck, UserX, AlarmClock, Timer,
} from 'lucide-react'
import { attendanceApi } from '../../services/hr'
import { capitalize } from '../../utils/capitalize'
import { fmtDate } from '../../utils/formatDate'
import { useAuth } from '../../contexts/AuthContext'

/* Show only the clock time (e.g. "2:30 PM") from an ISO datetime. */
function fmtTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/* Format work hours (number) to a readable "Xh Ym" or "X.XX h". */
function fmtHours(hours) {
  if (hours === null || hours === undefined || hours === '') return '—'
  const n = Number(hours)
  if (Number.isNaN(n)) return '—'
  return `${n.toFixed(2)} h`
}

function statusBadge(status) {
  const s = (status || '').replace(/ /g, '_')
  return (
    <span className={`status-badge ${s || 'inactive'}`}>
      <span className="status-dot" />
      {capitalize((status || 'unknown').replace(/_/g, ' '))}
    </span>
  )
}

export default function Attendance() {
  const { can } = useAuth()
  const canViewAll = can('hr.attendance.view_all')

  /* ---- Self attendance ---- */
  const [today, setToday] = useState(null)        // today's record or null
  const [records, setRecords] = useState([])      // recent history
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  /* ---- All-staff today ---- */
  const [allLoading, setAllLoading] = useState(false)
  const [summary, setSummary] = useState(null)
  const [allRecords, setAllRecords] = useState([])
  const [allDate, setAllDate] = useState(null)

  /* ================================================================ */
  /* Load self attendance                                             */
  /* ================================================================ */
  const loadMine = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await attendanceApi.me()
      setToday(res?.data?.today ?? null)
      setRecords(res?.data?.records ?? [])
    } catch (err) {
      setError(err.message || 'Failed to load your attendance')
    } finally {
      setLoading(false)
    }
  }, [])

  /* ================================================================ */
  /* Load all-staff today                                             */
  /* ================================================================ */
  const loadToday = useCallback(async () => {
    if (!canViewAll) return
    setAllLoading(true)
    try {
      const res = await attendanceApi.today()
      setSummary(res?.data?.summary ?? null)
      setAllRecords(res?.data?.records ?? [])
      setAllDate(res?.data?.date ?? null)
    } catch (err) {
      setError((prev) => prev || err.message || 'Failed to load today’s attendance')
    } finally {
      setAllLoading(false)
    }
  }, [canViewAll])

  useEffect(() => { loadMine() }, [loadMine])
  useEffect(() => { loadToday() }, [loadToday])

  /* ================================================================ */
  /* Clock in / out                                                   */
  /* ================================================================ */
  const signedIn  = !!today?.clock_in
  const signedOut = !!today?.clock_out

  async function handleClock() {
    setActionLoading(true)
    setError('')
    setSuccess('')
    try {
      if (!signedIn) {
        await attendanceApi.clockIn()
        setSuccess('Signed in successfully.')
      } else if (!signedOut) {
        await attendanceApi.clockOut()
        setSuccess('Signed out successfully.')
      }
      await loadMine()
      if (canViewAll) loadToday()
    } catch (err) {
      setError(err.message || 'Action failed. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  /* ---- Self status line ---- */
  let statusLine
  if (!signedIn) {
    statusLine = 'You have not signed in today.'
  } else if (!signedOut) {
    statusLine = `Signed in at ${fmtTime(today.clock_in)}.`
  } else {
    statusLine = `Signed in at ${fmtTime(today.clock_in)} — Signed out at ${fmtTime(today.clock_out)} (${fmtHours(today.work_hours)}).`
  }

  const buttonLabel = !signedIn ? 'Sign In' : (!signedOut ? 'Sign Out' : 'Signed Out')
  const ButtonIcon = !signedIn ? LogIn : LogOut

  /* ================================================================ */
  /* Render                                                           */
  /* ================================================================ */
  if (loading) {
    return (
      <div className="hr-loading">
        <div className="auth-spinner large" />
        <p>Loading attendance…</p>
      </div>
    )
  }

  const summaryCards = summary ? [
    { key: 'active',     label: 'Active Staff',      value: summary.active_staff,      icon: Users,      color: 'blue' },
    { key: 'signed_in',  label: 'Signed In',         value: summary.signed_in,         icon: UserCheck,  color: 'green' },
    { key: 'signed_out', label: 'Signed Out',        value: summary.signed_out,        icon: LogOut,     color: 'purple' },
    { key: 'late',       label: 'Late',              value: summary.late,              icon: AlarmClock, color: 'orange' },
    { key: 'not_in',     label: 'Not Signed In',     value: summary.not_signed_in,     icon: UserX,      color: 'rose' },
    { key: 'still_in',   label: 'Still Clocked In',  value: summary.still_clocked_in,  icon: Timer,      color: 'cyan' },
  ] : []

  return (
    <div className="page-stack">
      {error && (
        <div className="hr-error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="hr-error-dismiss">&times;</button>
        </div>
      )}

      {/* ---------- Sign in / out card ---------- */}
      <div className="card animate-in">
        <div className="card-header">
          <h3>My Attendance</h3>
          <span className="card-badge blue">{fmtDate(today?.date || new Date().toISOString().slice(0, 10))}</span>
        </div>
        <div className="card-body">
          {success && (
            <div className="hr-success-banner">
              <CheckCircle2 size={16} />
              <span>{success}</span>
              <button onClick={() => setSuccess('')} className="hr-error-dismiss">&times;</button>
            </div>
          )}

          <div className="attendance-clock">
            <div className="attendance-clock-info">
              <div className="attendance-clock-icon">
                <Clock size={26} />
              </div>
              <div>
                <div className="attendance-clock-status">
                  {!signedIn
                    ? statusBadge('not_signed_in')
                    : (!signedOut ? statusBadge('signed_in') : statusBadge('signed_out'))}
                </div>
                <p className="attendance-clock-line">{statusLine}</p>
              </div>
            </div>
            <button
              className="hr-btn-primary"
              onClick={handleClock}
              disabled={actionLoading || signedOut}
            >
              {actionLoading ? <span className="auth-spinner" /> : <ButtonIcon size={16} />}
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- My recent records ---------- */}
      <div className="card animate-in">
        <div className="card-header">
          <h3>My Recent Records</h3>
          <span className="card-badge green">{records.length} total</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>In</th>
                  <th>Out</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="hr-empty-cell">No attendance records yet</td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{fmtDate(r.date)}</td>
                      <td>{fmtTime(r.clock_in)}</td>
                      <td>{fmtTime(r.clock_out)}</td>
                      <td>{fmtHours(r.work_hours)}</td>
                      <td>{statusBadge(r.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ---------- All staff today (view_all only) ---------- */}
      {canViewAll && (
        <>
          <div className="stats-grid">
            {summaryCards.map((stat) => {
              const Icon = stat.icon
              return (
                <div className={`stat-card ${stat.color} animate-in`} key={stat.key}>
                  <div className="stat-top">
                    <div className={`stat-icon ${stat.color}`}><Icon size={22} /></div>
                  </div>
                  <div className="stat-value">{Number(stat.value || 0).toLocaleString()}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              )
            })}
          </div>

          <div className="card animate-in">
            <div className="card-header">
              <h3>All Staff — Today</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="card-badge blue">{fmtDate(allDate || new Date().toISOString().slice(0, 10))}</span>
                <button className="hr-btn-secondary" onClick={loadToday} title="Refresh">
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Department</th>
                      <th>In</th>
                      <th>Out</th>
                      <th>Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allLoading ? (
                      <tr>
                        <td colSpan={6} className="hr-empty-cell">
                          <div className="auth-spinner large" style={{ margin: '20px auto' }} />
                        </td>
                      </tr>
                    ) : allRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="hr-empty-cell">No attendance records for today</td>
                      </tr>
                    ) : (
                      allRecords.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{r.employee_name}</td>
                          <td>{r.department || 'Unassigned'}</td>
                          <td>{fmtTime(r.clock_in)}</td>
                          <td>{fmtTime(r.clock_out)}</td>
                          <td>{fmtHours(r.work_hours)}</td>
                          <td>{statusBadge(r.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
