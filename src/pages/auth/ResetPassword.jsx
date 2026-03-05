import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Lock, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react'
import { authApi } from '../../services/api'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const tokenFromUrl = params.get('token') || ''
  const emailFromUrl = params.get('email') || ''

  const [form, setForm] = useState({
    token: tokenFromUrl,
    email: emailFromUrl,
    password: '',
    password_confirmation: '',
  })
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

    if (!form.password || form.password.length < 8) {
      return setFieldErrors({ password: ['Password must be at least 8 characters.'] })
    }
    if (form.password !== form.password_confirmation) {
      return setFieldErrors({ password_confirmation: ['Passwords do not match.'] })
    }

    setSubmitting(true)
    try {
      const res = await authApi.resetPassword(form)
      setSuccess(res.message || 'Password has been reset successfully. You can now log in.')
    } catch (err) {
      if (err.errors) {
        setFieldErrors(err.errors)
      } else {
        setError(err.message || 'Failed to reset password. The link may have expired.')
      }
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

        <h2 className="auth-title">Reset your password</h2>
        <p className="auth-subtitle">Choose a new secure password for your account</p>

        {error && (
          <div className="auth-alert error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <>
            <div className="auth-alert success">
              <CheckCircle2 size={16} />
              <span>{success}</span>
            </div>
            <div className="auth-back" style={{ marginTop: 16 }}>
              <Link to="/login" className="auth-link">
                <ArrowLeft size={14} />
                Go to sign in
              </Link>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {/* Hidden email */}
            <input type="hidden" name="email" value={form.email} />
            <input type="hidden" name="token" value={form.token} />

            <div className={`auth-field ${fieldErrors.password ? 'has-error' : ''}`}>
              <label htmlFor="reset-password">New password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="reset-password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min 8 chars, mixed case, numbers, symbols"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  disabled={submitting}
                />
                <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && <span className="auth-field-error">{fieldErrors.password[0]}</span>}
            </div>

            <div className={`auth-field ${fieldErrors.password_confirmation ? 'has-error' : ''}`}>
              <label htmlFor="reset-confirm">Confirm new password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="reset-confirm"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  value={form.password_confirmation}
                  onChange={(e) => update('password_confirmation', e.target.value)}
                  disabled={submitting}
                />
              </div>
              {fieldErrors.password_confirmation && <span className="auth-field-error">{fieldErrors.password_confirmation[0]}</span>}
            </div>

            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting ? <span className="auth-spinner" /> : <Lock size={18} />}
              {submitting ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
        )}

        <div className="auth-back">
          <Link to="/login" className="auth-link">
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </div>

        <div className="auth-footer">
          <p>© {new Date().getFullYear()} CASI360 — Care Aid Support Initiative</p>
        </div>
      </div>
    </div>
  )
}
