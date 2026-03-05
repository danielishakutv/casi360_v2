import { useState } from 'react'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { authApi } from '../../services/api'

export default function ForceChangePassword() {
  const { updateUser } = useAuth()
  const [form, setForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (key, val) => setForm((prev) => ({ ...prev, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    setSuccess('')

    if (!form.current_password) return setFieldErrors({ current_password: ['Current password is required.'] })
    if (form.new_password.length < 8) return setFieldErrors({ new_password: ['New password must be at least 8 characters.'] })
    if (form.new_password !== form.new_password_confirmation) return setFieldErrors({ new_password_confirmation: ['Passwords do not match.'] })

    setSubmitting(true)
    try {
      await authApi.changePassword(form.current_password, form.new_password, form.new_password_confirmation)
      setSuccess('Password changed successfully! Redirecting…')
      // Update local user so force_password_change = false
      updateUser({ force_password_change: false })
    } catch (err) {
      if (err.errors) setFieldErrors(err.errors)
      else setError(err.message || 'Failed to change password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card animate-in">
        <div className="auth-brand">
          <div className="auth-logo">C3</div>
          <h1>CASI360</h1>
          <p>Care Aid Support Initiative</p>
        </div>

        <div className="auth-alert warning" style={{ marginBottom: 20 }}>
          <ShieldAlert size={16} />
          <span>You must change your password before continuing.</span>
        </div>

        <h2 className="auth-title">Change your password</h2>
        <p className="auth-subtitle">Choose a strong, unique password you haven't used before</p>

        {error && (
          <div className="auth-alert error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="auth-alert success">
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} noValidate>
            <div className={`auth-field ${fieldErrors.current_password ? 'has-error' : ''}`}>
              <label htmlFor="fcp-current">Current password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="fcp-current"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  value={form.current_password}
                  onChange={(e) => update('current_password', e.target.value)}
                  disabled={submitting}
                />
              </div>
              {fieldErrors.current_password && <span className="auth-field-error">{fieldErrors.current_password[0]}</span>}
            </div>

            <div className={`auth-field ${fieldErrors.new_password ? 'has-error' : ''}`}>
              <label htmlFor="fcp-new">New password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="fcp-new"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min 8 chars, mixed case, numbers, symbols"
                  autoComplete="new-password"
                  value={form.new_password}
                  onChange={(e) => update('new_password', e.target.value)}
                  disabled={submitting}
                />
                <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.new_password && <span className="auth-field-error">{fieldErrors.new_password[0]}</span>}
            </div>

            <div className={`auth-field ${fieldErrors.new_password_confirmation ? 'has-error' : ''}`}>
              <label htmlFor="fcp-confirm">Confirm new password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="fcp-confirm"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  value={form.new_password_confirmation}
                  onChange={(e) => update('new_password_confirmation', e.target.value)}
                  disabled={submitting}
                />
              </div>
              {fieldErrors.new_password_confirmation && <span className="auth-field-error">{fieldErrors.new_password_confirmation[0]}</span>}
            </div>

            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting ? <span className="auth-spinner" /> : <Lock size={18} />}
              {submitting ? 'Changing…' : 'Change password'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>© {new Date().getFullYear()} CASI360 — Care Aid Support Initiative</p>
        </div>
      </div>
    </div>
  )
}
