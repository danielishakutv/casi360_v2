import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, UserCheck, Building2, Clock, UserX, Briefcase,
  AlertCircle, RefreshCw, ChevronRight,
} from 'lucide-react'
import { employeesApi, departmentsApi, designationsApi, attendanceApi } from '../../services/hr'
import { capitalize } from '../../utils/capitalize'
import { extractItems } from '../../utils/apiHelpers'
import { useAuth } from '../../contexts/AuthContext'

export default function HROverview() {
  const { can } = useAuth()
  const canViewAll = can('hr.attendance.view_all')

  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [attendance, setAttendance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [empRes, deptsRes, desigRes] = await Promise.all([
        employeesApi.list({ per_page: 0 }),
        departmentsApi.list({ per_page: 0 }),
        designationsApi.list({ per_page: 0 }),
      ])
      setEmployees(extractItems(empRes))
      setDepartments(extractItems(deptsRes))
      setDesignations(extractItems(desigRes))
    } catch (err) {
      setError(err.message || 'Failed to load HR data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  /* Today's attendance summary — only for staff who can see all staff.
     Loaded independently so any error here never blocks the Overview. */
  useEffect(() => {
    if (!canViewAll) return
    let active = true
    attendanceApi.today()
      .then((res) => { if (active) setAttendance(res?.data?.summary ?? null) })
      .catch(() => {})
    return () => { active = false }
  }, [canViewAll])

  /* ---------- Loading state ---------- */
  if (loading) {
    return (
      <div className="hr-loading">
        <div className="auth-spinner large" />
        <p>Loading HR overview…</p>
      </div>
    )
  }

  /* ---------- Error state ---------- */
  if (error) {
    return (
      <div className="hr-error-banner">
        <AlertCircle size={16} />
        <span>{error}</span>
        <button className="hr-btn-secondary" onClick={loadData} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    )
  }

  /* ---------- Compute stats from real data ---------- */
  const totalEmployees = employees.length
  const activeEmployees = employees.filter((e) => e.status === 'active').length
  const onLeave = employees.filter((e) => e.status === 'on_leave').length
  const terminated = employees.filter((e) => e.status === 'terminated').length
  const totalDepts = departments.length
  const totalDesigs = designations.length

  const statCards = [
    { key: 'total',   label: 'Total Employees', value: totalEmployees, icon: Users,     color: 'blue' },
    { key: 'active',  label: 'Active Staff',     value: activeEmployees, icon: UserCheck, color: 'green' },
    { key: 'depts',   label: 'Departments',      value: totalDepts,     icon: Building2, color: 'purple' },
    { key: 'leave',   label: 'On Leave',          value: onLeave,       icon: Clock,     color: 'orange' },
    { key: 'termed',  label: 'Terminated',        value: terminated,    icon: UserX,     color: 'red' },
    { key: 'desigs',  label: 'Designations',      value: totalDesigs,   icon: Briefcase, color: 'indigo' },
  ]

  /* ---------- Recent employees (last 5 by created_at) ---------- */
  const recentEmployees = [...employees]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5)

  return (
    <>
      <div className="stats-grid">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div className={`stat-card ${stat.color} animate-in`} key={stat.key}>
              <div className="stat-top">
                <div className={`stat-icon ${stat.color}`}><Icon size={22} /></div>
              </div>
              <div className="stat-value">{Number(stat.value).toLocaleString()}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          )
        })}
      </div>

      {/* Today's attendance widget — only for staff who can see all staff */}
      {canViewAll && attendance && (
        <div className="card animate-in">
          <div className="card-header">
            <h3><Clock size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} />Today’s Attendance</h3>
            <Link to="/hr/attendance" className="hr-card-link">
              View attendance <ChevronRight size={14} />
            </Link>
          </div>
          <div className="card-body">
            <div className="hr-attendance-mini">
              <div className="hr-attendance-mini-stat">
                <span className="hr-attendance-mini-value" style={{ color: 'var(--success)' }}>
                  {Number(attendance.signed_in || 0).toLocaleString()}
                </span>
                <span className="hr-attendance-mini-label">Signed In</span>
              </div>
              <div className="hr-attendance-mini-stat">
                <span className="hr-attendance-mini-value" style={{ color: 'var(--danger)' }}>
                  {Number(attendance.not_signed_in || 0).toLocaleString()}
                </span>
                <span className="hr-attendance-mini-label">Not Signed In</span>
              </div>
              <div className="hr-attendance-mini-stat">
                <span className="hr-attendance-mini-value" style={{ color: 'var(--warning)' }}>
                  {Number(attendance.late || 0).toLocaleString()}
                </span>
                <span className="hr-attendance-mini-label">Late</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Departments table */}
      <div className="card animate-in">
        <div className="card-header">
          <h3>Departments</h3>
          <span className="card-badge blue">{departments.length} total</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Head</th>
                  <th>Staff Count</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="hr-empty-cell">No departments found</td>
                  </tr>
                ) : (
                  departments.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <span className="hr-dept-name-cell">
                          {d.color && <span className="hr-color-dot" style={{ background: d.color }} />}
                          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{d.name}</span>
                        </span>
                      </td>
                      <td>{d.head || '—'}</td>
                      <td>{d.employee_count ?? d.employees_count ?? 0}</td>
                      <td>
                        <span className={`status-badge ${d.status || 'inactive'}`}>
                          <span className="status-dot" />
                          {capitalize(d.status || 'inactive')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent employees table */}
      <div className="card animate-in">
        <div className="card-header">
          <h3>Recent Employees</h3>
          <span className="card-badge green">{employees.length} total</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff ID</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Position</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="hr-empty-cell">No employees found</td>
                  </tr>
                ) : (
                  recentEmployees.map((emp) => (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 12 }}>
                        {emp.staff_id || '—'}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{emp.name}</td>
                      <td>{typeof emp.department === 'string' ? emp.department : (emp.department?.name || '—')}</td>
                      <td>{emp.position || emp.designation?.title || '—'}</td>
                      <td>
                        <span className={`status-badge ${(emp.status || 'inactive').replace(/ /g, '_')}`}>
                          <span className="status-dot" />
                          {capitalize((emp.status || 'inactive').replace(/_/g, ' '))}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {emp.join_date ? new Date(emp.join_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
