import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mail, Phone, Briefcase, Calendar, Shield,
  Clock, Edit3, Save, X, AlertCircle, CheckCircle2,
  Lock, Eye, EyeOff, Trash2, ShieldAlert
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../services/api'
import { capitalize } from '../utils/capitalize'

const stats = [
  { label: 'Programs Managed', value: '12' },
  { label: 'Projects Completed', value: '45' },
  { label: 'Reports Generated', value: '156' },
  { label: 'Team Members', value: '34' },
]

const recentActivity = [
  { action: 'Approved requisition REQ-1042 for Medical Supplies', time: '2 hours ago', color: 'blue' },
  { action: 'Published Clean Water Initiative Q1 report', time: '4 hours ago', color: 'green' },
  { action: 'Added 15 beneficiaries to Education for All program', time: '1 day ago', color: 'purple' },
  { action: 'Updated vendor rating for MedSupply Co.', time: '1 day ago', color: 'orange' },
  { action: 'Sent monthly staff meeting notice to all departments', time: '2 days ago', color: 'blue' },
]

const skills = [
  'Program Management', 'M&E', 'Data Analysis', 'Donor Relations',
  'Budget Planning', 'Team Leadership', 'Report Writing', 'Stakeholder Engagement',
]

const permissions = [
  { module: 'Dashboard', access: 'Full Access' },
  { module: 'HR Management', access: 'Full Access' },
  { module: 'Procurement', access: 'Full Access' },
  { module: 'Programs', access: 'Full Access' },
  { module: 'Communication', access: 'Full Access' },
  { module: 'Reports', access: 'Full Access' },
  { module: 'Settings', access: 'Full Access' },
]

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

export default function Profile() {
  const navigate = useNavigate()
  const { user, updateUser, logout } = useAuth()

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

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '??'
  const displayRole = user?.role ? capitalize(user.role.replace('_', ' ')) : ''

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
            <div className="profile-stat-value">{s.value}</div>
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

          {/* Skills */}
          <div className="card">
            <div className="card-header">
              <h3>Skills & Expertise</h3>
            </div>
            <div className="card-body">
              <div className="profile-skills">
                {skills.map((skill) => (
                  <span className="profile-skill-tag" key={skill}>{skill}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column — Activity + Permissions */}
        <div className="profile-details-stack">
          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <h3>Recent Activity</h3>
            </div>
            <div className="card-body">
              <div className="activity-list">
                {recentActivity.map((a) => (
                  <div className="activity-item" key={a.action}>
                    <div className={`activity-dot ${a.color}`} />
                    <div className="activity-content">
                      <p>{a.action}</p>
                      <span>{a.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="card">
            <div className="card-header">
              <h3>Access & Permissions</h3>
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
                    {permissions.map((p) => (
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
