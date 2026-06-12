import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, CalendarClock, CheckCircle2, AlarmClock, Plane, Timer } from 'lucide-react'
import { timesheetsApi } from '../../services/hr'
import { capitalize } from '../../utils/capitalize'
import { fmtDate } from '../../utils/formatDate'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'

/* Current month as YYYY-MM */
function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/* Show only the clock time (e.g. "2:30 PM") from an ISO datetime. */
function fmtTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

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

/* Summary stat cards for a single timesheet (mine or one employee). */
function SummaryStats({ summary, workingDays }) {
  if (!summary) return null
  const cards = [
    { key: 'present', label: 'Days Present', value: summary.days_present, icon: CheckCircle2, color: 'green' },
    { key: 'late',    label: 'Days Late',    value: summary.days_late,    icon: AlarmClock,   color: 'orange' },
    { key: 'leave',   label: 'Days On Leave', value: summary.days_on_leave, icon: Plane,       color: 'purple' },
    { key: 'hours',   label: 'Total Hours',  value: Number(summary.total_hours || 0).toFixed(1), icon: Timer, color: 'blue' },
    { key: 'working', label: 'Working Days', value: workingDays, icon: CalendarClock, color: 'cyan' },
  ]
  return (
    <div className="stats-grid">
      {cards.map((stat) => {
        const Icon = stat.icon
        return (
          <div className={`stat-card ${stat.color} animate-in`} key={stat.key}>
            <div className="stat-top">
              <div className={`stat-icon ${stat.color}`}><Icon size={22} /></div>
            </div>
            <div className="stat-value">{stat.value ?? '—'}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        )
      })}
    </div>
  )
}

/* Daily breakdown table shared by mine + employee modal. */
function DailyTable({ days }) {
  return (
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
          {(!days || days.length === 0) ? (
            <tr>
              <td colSpan={5} className="hr-empty-cell">No daily records for this month</td>
            </tr>
          ) : (
            days.map((d) => (
              <tr key={d.id || d.date}>
                <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{fmtDate(d.date)}</td>
                <td>{fmtTime(d.clock_in)}</td>
                <td>{fmtTime(d.clock_out)}</td>
                <td>{fmtHours(d.work_hours)}</td>
                <td>{statusBadge(d.status)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function Timesheets() {
  const { can } = useAuth()
  const canViewAll = can('hr.attendance.view_all')

  const [month, setMonth] = useState(currentMonth())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [workingDays, setWorkingDays] = useState(null)

  /* ---- All-staff monthly ---- */
  const [rows, setRows] = useState([])

  /* ---- Own timesheet ---- */
  const [mineSummary, setMineSummary] = useState(null)
  const [mineDays, setMineDays] = useState([])

  /* ---- Employee detail modal ---- */
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailSummary, setDetailSummary] = useState(null)
  const [detailDays, setDetailDays] = useState([])
  const [detailWorkingDays, setDetailWorkingDays] = useState(null)
  const [detailName, setDetailName] = useState('')

  /* ================================================================ */
  /* Load data for the selected month                                 */
  /* ================================================================ */
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (canViewAll) {
        const res = await timesheetsApi.monthly({ month })
        setRows(res?.data?.timesheets ?? [])
        setWorkingDays(res?.data?.working_days ?? null)
      } else {
        const res = await timesheetsApi.mine({ month })
        setMineSummary(res?.data?.summary ?? null)
        setMineDays(res?.data?.days ?? [])
        setWorkingDays(res?.data?.working_days ?? null)
      }
    } catch (err) {
      setError(err.message || 'Failed to load timesheets')
    } finally {
      setLoading(false)
    }
  }, [canViewAll, month])

  useEffect(() => { load() }, [load])

  /* ================================================================ */
  /* Open an employee's daily breakdown                               */
  /* ================================================================ */
  async function openEmployee(row) {
    setDetailName(row.employee_name)
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailSummary(null)
    setDetailDays([])
    setDetailWorkingDays(null)
    try {
      const res = await timesheetsApi.employee(row.employee_id, { month })
      setDetailSummary(res?.data?.summary ?? null)
      setDetailDays(res?.data?.days ?? [])
      setDetailWorkingDays(res?.data?.working_days ?? null)
    } catch (err) {
      setError(err.message || 'Failed to load employee timesheet')
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setDetailOpen(false)
    setDetailName('')
  }

  /* ================================================================ */
  /* Render                                                           */
  /* ================================================================ */
  return (
    <div className="page-stack">
      {error && (
        <div className="hr-error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="hr-error-dismiss">&times;</button>
        </div>
      )}

      <div className="card animate-in">
        {/* Toolbar */}
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>
              {canViewAll ? 'All Staff Timesheets' : 'My Timesheet'}
            </h3>
          </div>
          <div className="hr-toolbar-right">
            {workingDays != null && (
              <span className="card-badge blue">{workingDays} working days</span>
            )}
            <input
              type="month"
              className="hr-filter-select"
              value={month}
              onChange={(e) => setMonth(e.target.value || currentMonth())}
              aria-label="Select month"
            />
          </div>
        </div>

        {canViewAll ? (
          /* ---------- All-staff monthly table ---------- */
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Days Present</th>
                  <th>Days Late</th>
                  <th>Days On Leave</th>
                  <th>Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="hr-empty-cell">
                      <div className="auth-spinner large" style={{ margin: '20px auto' }} />
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="hr-empty-cell">No timesheet data for this month</td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.employee_id}
                      onClick={() => openEmployee(r)}
                      style={{ cursor: 'pointer' }}
                      title="View daily breakdown"
                    >
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{r.employee_name}</td>
                      <td>{r.department || '—'}</td>
                      <td>{r.days_present ?? 0}</td>
                      <td>{r.days_late ?? 0}</td>
                      <td>{r.days_on_leave ?? 0}</td>
                      <td>{Number(r.total_hours || 0).toFixed(1)} h</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ---------- Own timesheet ---------- */
          loading ? (
            <div className="hr-loading">
              <div className="auth-spinner large" />
              <p>Loading timesheet…</p>
            </div>
          ) : (
            <div className="card-body">
              <SummaryStats summary={mineSummary} workingDays={workingDays} />
              <h4 className="hr-form-section-title" style={{ marginTop: 8 }}>Daily Breakdown</h4>
              <DailyTable days={mineDays} />
            </div>
          )
        )}
      </div>

      {/* ---------- Employee daily breakdown modal ---------- */}
      <Modal open={detailOpen} onClose={closeDetail} title={`${detailName} — ${month}`} size="lg">
        {detailLoading ? (
          <div className="hr-loading">
            <div className="auth-spinner large" />
            <p>Loading breakdown…</p>
          </div>
        ) : (
          <>
            <SummaryStats summary={detailSummary} workingDays={detailWorkingDays} />
            <h4 className="hr-form-section-title" style={{ marginTop: 8 }}>Daily Breakdown</h4>
            <DailyTable days={detailDays} />
          </>
        )}
      </Modal>
    </div>
  )
}
