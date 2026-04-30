import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mail, Phone, Briefcase, Calendar, Shield,
  Clock, Edit3, Save, X, AlertCircle, CheckCircle2,
  Lock, Eye, EyeOff, Trash2, ShieldAlert,
  ClipboardList, ClipboardCheck, FileText
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../services/api'
import { purchaseRequestsApi, approvalsApi } from '../services/procurement'
import { extractItems, extractMeta } from '../utils/apiHelpers'
import { capitalize } from '../utils/capitalize'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function relativeTime(iso) {
  if (!iso) return '—'
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffSec = Math.max(0, Math.floor((now - then) / 1000))
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`
  return formatDate(iso)
}

const PR_STATUS_DOT = {
  draft: 'orange',
  pending_approval: 'blue',
  approved: 'green',
  rejected: 'red',
  revision: 'orange',
  cancelled: 'red',
  fulfilled: 'green',
}

/**
 * Reduce the live permission map into a per-module access summary.
 *
 * Looks at every key like "module.feature.action" the user is granted (true)
 * and aggregates by the first segment so each row shows the access level
 * for an entire module rather than a long flat table.
 */
const MODULE_LABELS = {
  auth: 'User Management',
  hr: 'HR Management',
  procurement: 'Procurement',
  projects: 'Projects',
  communication: 'Communication',
  programs: 'Programs',
  reports: 'Reports',
  settings: 'Settings',
}

function summarisePermissionsByModule(permissions, isAdminLike) {
  const byModule = {}
  for (const [key, allowed] of Object.entries(permissions || {})) {
    if (!allowed) continue
    const [module, , action] = key.split('.')
    if (!module) continue
    if (!byModule[module]) byModule[module] = { actions: new Set() }
    if (action) byModule[module].actions.add(action)
  }

  const ranking = (actions) => {
    if (actions.has('delete') || actions.has('manage') || actions.has('manage_roles')) return 'Full Access'
    if (actions.has('edit') || actions.has('create')) return 'Edit'
    if (actions.has('view')) return 'View Only'
    if (actions.has('approve') || actions.has('budget_holder') || actions.has('finance') || actions.has('procurement')) return 'Approver'
    return 'Limited'
  }

  const rows = Object.entries(byModule)
    .filter(([, v]) => v.actions.size > 0)
    .map(([module, v]) => ({
      module: MODULE_LABELS[module] || capitalize(module),
      access: isAdminLike ? 'Full Access' : ranking(v.actions),
    }))
    .sort((a, b) => a.module.localeCompare(b.module))

  return rows
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, permissions, updateUser, logout } = useAuth()

  // --- Profile edit state ---
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', department: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null) // { type: 'success'|'error', text }

  // --- Change password state ---
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' })
  const [pwShowCurrent, setPwShowCurrent] = useState(false)
  const [pwShowNew, setPwShowNew] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMessage, setPwMessage] = useState(null)
  const [pwFieldErrors, setPwFieldErrors] = useState({})

  // --- Deactivate account state ---
  const [deactivateConfirm, setDeactivateConfirm] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [deactivateMsg, setDeactivateMsg] = useState(null)

  // --- Live profile data ---
  const [loadingData, setLoadingData] = useState(true)
  const [recentPRs, setRecentPRs] = useState([])
  const [counts, setCounts] = useState({
    prTotal: 0,
    prApproved: 0,
    prPending: 0,
    pendingApprovals: 0,
  })

  /* Fetch the user's own PRs and pending-approval queue.
     Approvals call may 403 for non-approver roles — treat that as 0. */
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    async function load() {
      setLoadingData(true)
      try {
        const [allMineRes, approvedRes, pendingRes, recentRes, approvalsRes] = await Promise.allSettled([
          purchaseRequestsApi.list({ requested_by: user.id, per_page: 1 }),
          purchaseRequestsApi.list({ requested_by: user.id, status: 'approved', per_page: 1 }),
          purchaseRequestsApi.list({ requested_by: user.id, status: 'pending_approval', per_page: 1 }),
          purchaseRequestsApi.list({ requested_by: user.id, per_page: 5, sort_by: 'created_at', sort_dir: 'desc' }),
          approvalsApi.pending({ scope: 'mine', per_page: 1 }),
        ])

        if (cancelled) return

        const total = allMineRes.status === 'fulfilled' ? (extractMeta(allMineRes.value)?.total ?? 0) : 0
        const approved = approvedRes.status === 'fulfilled' ? (extractMeta(approvedRes.value)?.total ?? 0) : 0
        const pending = pendingRes.status === 'fulfilled' ? (extractMeta(pendingRes.value)?.total ?? 0) : 0
        const pendingApprovals = approvalsRes.status === 'fulfilled' ? (extractMeta(approvalsRes.value)?.total ?? 0) : 0
        const items = recentRes.status === 'fulfilled' ? extractItems(recentRes.value) : []

        setCounts({ prTotal: total, prApproved: approved, prPending: pending, pendingApprovals })
        setRecentPRs(items)
      } finally {
        if (!cancelled) setLoadingData(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user?.id])

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '??'
  const displayRole = user?.role ? capitalize(user.role.replace('_', ' ')) : ''
  const isAdminLike = user?.role === 'super_admin' || user?.role === 'admin'

  const permissionRows = useMemo(
    () => summarisePermissionsByModule(permissions, isAdminLike),
    [permissions, isAdminLike]
  )

  const stats = [
    { label: 'PRs Raised',         value: counts.prTotal,        icon: ClipboardList },
    { label: 'PRs Approved',       value: counts.prApproved,     icon: CheckCircle2 },
    { label: 'Awaiting Approval',  value: counts.prPending,      icon: Clock },
    { label: 'My Approval Queue',  value: counts.pendingApprovals, icon: ClipboardCheck },
  ]

  const startEdit = () => {
    setForm({ name: user?.name || '', phone: user?.phone || '', department: user?.department || '' })
    setEditing(true)
    setMessage(null)
  }

  const cancelEdit = () => { setEditing(false); setMessage(null) }

  // --- Change password handler ---
  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwMessage(null)
    setPwFieldErrors({})

    if (!pwForm.current_password) return setPwFieldErrors({ current_password: ['Current password is required.'] })
    if (pwForm.new_password.length < 8) return setPwFieldErrors({ new_password: ['New password must be at least 8 characters.'] })
    if (pwForm.new_password !== pwForm.new_password_confirmation) return setPwFieldErrors({ new_password_confirmation: ['Passwords do not match.'] })

    setPwSaving(true)
    try {
      await authApi.changePassword(pwForm.current_password, pwForm.new_password, pwForm.new_password_confirmation)
      setPwMessage({ type: 'success', text: 'Password changed successfully.' })
      setPwForm({ current_password: '', new_password: '', new_password_confirmation: '' })
      updateUser({ force_password_change: false })
    } catch (err) {
      if (err.errors) setPwFieldErrors(err.errors)
      else setPwMessage({ type: 'error', text: err.message || 'Failed to change password.' })
    } finally {
      setPwSaving(false)
    }
  }

  // --- Deactivate account handler ---
  const handleDeactivate = async () => {
    setDeactivateMsg(null)
    setDeactivating(true)
    try {
      await authApi.deactivateAccount()
      await logout()
      navigate('/login')
    } catch (err) {
      setDeactivateMsg({ type: 'error', text: err.message || 'Failed to deactivate account.' })
    } finally {
      setDeactivating(false)
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await authApi.updateProfile(form)
      updateUser(res.data.user)
      setEditing(false)
      setMessage({ type: 'success', text: 'Profile updated successfully.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Profile Header Card */}
      <div className="profile-header-card animate-in">
        <div className="profile-header-bg" />
        <div className="profile-header-content">
          <div className="profile-avatar-large">
            {initials}
          </div>
          <div className="profile-header-info">
            <h2>{user?.name || 'User'}</h2>
            <p className="profile-title">{displayRole}{user?.department ? ` — ${user.department}` : ''}</p>
            <div className="profile-meta">
              <span className="profile-meta-item">
                <Shield size={14} />
                {displayRole}
              </span>
              {user?.department && (
                <span className="profile-meta-item">
                  <Briefcase size={14} />
                  {user.department}
                </span>
              )}
              <span className="profile-meta-item">
                <Mail size={14} />
                {user?.email || '—'}
              </span>
            </div>
          </div>
          {!editing ? (
            <button className="profile-edit-btn" onClick={startEdit}>
              <Edit3 size={16} />
              Edit Profile
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button className="profile-edit-btn" onClick={saveProfile} disabled={saving} style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                <Save size={16} />
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="profile-edit-btn" onClick={cancelEdit} disabled={saving}>
                <X size={16} />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className={`auth-alert ${message.type}`} style={{ margin: '0 0 16px' }}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Stats Row */}
      <div className="profile-stats-row animate-in">
        {stats.map((s) => (
          <div className="profile-stat" key={s.label}>
            <div className="profile-stat-value">{loadingData ? '…' : s.value}</div>
            <div className="profile-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid animate-in">
        {/* Left Column — Details */}
        <div className="profile-details-stack">
          {/* Editable fields */}
          {editing && (
            <div className="card">
              <div className="card-header"><h3>Edit Profile</h3></div>
              <div className="card-body">
                <div className="profile-edit-form">
                  <div className="auth-field">
                    <label>Name</label>
                    <div className="auth-input-wrap">
                      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                  </div>
                  <div className="auth-field">
                    <label>Phone</label>
                    <div className="auth-input-wrap">
                      <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+234 800 000 0000" />
                    </div>
                  </div>
                  <div className="auth-field">
                    <label>Department</label>
                    <div className="auth-input-wrap">
                      <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="card">
            <div className="card-header">
              <h3>Contact Information</h3>
            </div>
            <div className="card-body">
              <div className="profile-info-list">
                <div className="profile-info-item">
                  <div className="profile-info-icon blue"><Mail size={16} /></div>
                  <div>
                    <div className="profile-info-label">Email</div>
                    <div className="profile-info-value">{user?.email || '—'}</div>
                  </div>
                </div>
                <div className="profile-info-item">
                  <div className="profile-info-icon green"><Phone size={16} /></div>
                  <div>
                    <div className="profile-info-label">Phone</div>
                    <div className="profile-info-value">{user?.phone || '—'}</div>
                  </div>
                </div>
                <div className="profile-info-item">
                  <div className="profile-info-icon orange"><Briefcase size={16} /></div>
                  <div>
                    <div className="profile-info-label">Department</div>
                    <div className="profile-info-value">{user?.department || '—'}</div>
                  </div>
                </div>
                <div className="profile-info-item">
                  <div className="profile-info-icon blue"><Calendar size={16} /></div>
                  <div>
                    <div className="profile-info-label">Joined</div>
                    <div className="profile-info-value">{formatDate(user?.created_at)}</div>
                  </div>
                </div>
                <div className="profile-info-item">
                  <div className="profile-info-icon green"><Clock size={16} /></div>
                  <div>
                    <div className="profile-info-label">Last Login</div>
                    <div className="profile-info-value">{formatDateTime(user?.last_login_at)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column — My PRs + Permissions */}
        <div className="profile-details-stack">
          {/* Recent Purchase Requests (mine) */}
          <div className="card">
            <div className="card-header">
              <h3>My Recent Purchase Requests</h3>
              {counts.prTotal > 0 && (
                <span className="card-badge blue">{counts.prTotal} total</span>
              )}
            </div>
            <div className="card-body">
              {loadingData ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                  <div className="auth-spinner" />
                </div>
              ) : recentPRs.length === 0 ? (
                <div className="activity-list">
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <FileText size={20} style={{ marginBottom: 8, opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: 13 }}>You haven&apos;t raised any purchase requests yet.</p>
                  </div>
                </div>
              ) : (
                <div className="activity-list">
                  {recentPRs.map((pr) => {
                    const dot = PR_STATUS_DOT[pr.status] || 'blue'
                    return (
                      <div
                        className="activity-item"
                        key={pr.id}
                        onClick={() => navigate('/procurement/purchase-requests')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/procurement/purchase-requests') } }}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className={`activity-dot ${dot}`} />
                        <div className="activity-content">
                          <p>
                            <strong>{pr.requisition_number}</strong> — {pr.title || 'Untitled'}
                            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                              · {capitalize((pr.status || '').replace(/_/g, ' '))}
                            </span>
                          </p>
                          <span>{relativeTime(pr.created_at)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Permissions */}
          <div className="card">
            <div className="card-header">
              <h3>Access &amp; Permissions</h3>
              <span className="card-badge green">{displayRole}</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Module</th>
                      <th>Access Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissionRows.length === 0 ? (
                      <tr>
                        <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 16 }}>
                          No permissions granted.
                        </td>
                      </tr>
                    ) : permissionRows.map((p) => (
                      <tr key={p.module}>
                        <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{p.module}</td>
                        <td>
                          <span className="status-badge active">
                            <span className="status-dot" />
                            {p.access}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ Security Section (full width) ============ */}
      <div className="dashboard-grid animate-in">
        {/* Change Password */}
        <div className="profile-details-stack">
          <div className="card">
            <div className="card-header">
              <h3><Lock size={16} style={{ marginRight: 6, verticalAlign: -2 }} />Change Password</h3>
            </div>
            <div className="card-body">
              {pwMessage && (
                <div className={`auth-alert ${pwMessage.type}`} style={{ marginBottom: 16 }}>
                  {pwMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{pwMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} noValidate>
                <div className={`auth-field ${pwFieldErrors.current_password ? 'has-error' : ''}`}>
                  <label>Current password</label>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      type={pwShowCurrent ? 'text' : 'password'}
                      placeholder="Enter current password"
                      autoComplete="current-password"
                      value={pwForm.current_password}
                      onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                      disabled={pwSaving}
                    />
                    <button type="button" className="auth-pw-toggle" onClick={() => setPwShowCurrent(!pwShowCurrent)} tabIndex={-1}>
                      {pwShowCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {pwFieldErrors.current_password && <span className="auth-field-error">{Array.isArray(pwFieldErrors.current_password) ? pwFieldErrors.current_password[0] : pwFieldErrors.current_password}</span>}
                </div>

                <div className={`auth-field ${pwFieldErrors.new_password ? 'has-error' : ''}`}>
                  <label>New password</label>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      type={pwShowNew ? 'text' : 'password'}
                      placeholder="Min 8 chars, mixed case, numbers, symbols"
                      autoComplete="new-password"
                      value={pwForm.new_password}
                      onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                      disabled={pwSaving}
                    />
                    <button type="button" className="auth-pw-toggle" onClick={() => setPwShowNew(!pwShowNew)} tabIndex={-1}>
                      {pwShowNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {pwFieldErrors.new_password && <span className="auth-field-error">{Array.isArray(pwFieldErrors.new_password) ? pwFieldErrors.new_password[0] : pwFieldErrors.new_password}</span>}
                </div>

                <div className={`auth-field ${pwFieldErrors.new_password_confirmation ? 'has-error' : ''}`}>
                  <label>Confirm new password</label>
                  <div className="auth-input-wrap">
                    <Lock size={16} className="auth-input-icon" />
                    <input
                      type={pwShowNew ? 'text' : 'password'}
                      placeholder="Repeat new password"
                      autoComplete="new-password"
                      value={pwForm.new_password_confirmation}
                      onChange={(e) => setPwForm({ ...pwForm, new_password_confirmation: e.target.value })}
                      disabled={pwSaving}
                    />
                  </div>
                  {pwFieldErrors.new_password_confirmation && <span className="auth-field-error">{Array.isArray(pwFieldErrors.new_password_confirmation) ? pwFieldErrors.new_password_confirmation[0] : pwFieldErrors.new_password_confirmation}</span>}
                </div>

                <button type="submit" className="auth-submit" disabled={pwSaving} style={{ marginTop: 4 }}>
                  {pwSaving ? <span className="auth-spinner" /> : <Lock size={18} />}
                  {pwSaving ? 'Changing…' : 'Change password'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Danger Zone — Deactivate Account */}
        <div className="profile-details-stack">
          <div className="card profile-danger-card">
            <div className="card-header">
              <h3><ShieldAlert size={16} style={{ marginRight: 6, verticalAlign: -2, color: '#e74c3c' }} />Danger Zone</h3>
            </div>
            <div className="card-body">
              <div className="profile-danger-section">
                <div className="profile-danger-info">
                  <h4>Deactivate your account</h4>
                  <p>Once deactivated, your account will be disabled and you will be logged out immediately. Contact an administrator to reactivate.</p>
                </div>

                {deactivateMsg && (
                  <div className={`auth-alert ${deactivateMsg.type}`} style={{ marginBottom: 12 }}>
                    <AlertCircle size={16} />
                    <span>{deactivateMsg.text}</span>
                  </div>
                )}

                {!deactivateConfirm ? (
                  <button
                    className="profile-danger-btn"
                    onClick={() => setDeactivateConfirm(true)}
                  >
                    <Trash2 size={16} />
                    Deactivate account
                  </button>
                ) : (
                  <div className="profile-danger-confirm">
                    <p className="profile-danger-warning">Are you sure? This action cannot be undone by you.</p>
                    <div className="profile-danger-actions">
                      <button
                        className="profile-danger-btn confirmed"
                        onClick={handleDeactivate}
                        disabled={deactivating}
                      >
                        {deactivating ? 'Deactivating…' : 'Yes, deactivate my account'}
                      </button>
                      <button
                        className="profile-edit-btn"
                        onClick={() => { setDeactivateConfirm(false); setDeactivateMsg(null) }}
                        disabled={deactivating}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
