import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react'
import { authApi } from '../../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!email.trim()) return setError('Please enter your email address.')

    setSubmitting(true)
    try {
      const res = await authApi.forgotPassword(email.trim())
      setSuccess(res.message || 'If an account exists with that email, a password reset link has been sent.')
    } catch (err) {
      // API always returns success to prevent enumeration, but handle network errors
      setError(err.message || 'Something went wrong. Please try again.')
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

        <h2 className="auth-title">Forgot password?</h2>
        <p className="auth-subtitle">Enter your email and we'll send you a reset link</p>

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
            <div className="auth-field">
              <label htmlFor="forgot-email">Email address</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="you@casi.org"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting ? <span className="auth-spinner" /> : <Mail size={18} />}
              {submitting ? 'Sending…' : 'Send reset link'}
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
