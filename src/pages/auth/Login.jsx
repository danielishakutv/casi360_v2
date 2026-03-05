import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    // Client-side quick validation
    if (!email.trim()) return setFieldErrors({ email: 'Email is required' })
    if (!password) return setFieldErrors({ password: 'Password is required' })

    setSubmitting(true)
    try {
      await login(email.trim(), password, remember)
      // Navigation handled by App.jsx after user state changes
    } catch (err) {
      if (err.errors) {
        setFieldErrors(err.errors)
      } else {
        setError(err.message || 'Login failed. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card animate-in">
        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-logo">C3</div>
          <h1>CASI360</h1>
          <p>Care Aid Support Initiative</p>
        </div>

        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Sign in to your account to continue</p>

        {error && (
          <div className="auth-alert error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className={`auth-field ${fieldErrors.email ? 'has-error' : ''}`}>
            <label htmlFor="login-email">Email address</label>
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-input-icon" />
              <input
                id="login-email"
                type="email"
                placeholder="you@casi.org"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
            </div>
            {fieldErrors.email && <span className="auth-field-error">{Array.isArray(fieldErrors.email) ? fieldErrors.email[0] : fieldErrors.email}</span>}
          </div>

          {/* Password */}
          <div className={`auth-field ${fieldErrors.password ? 'has-error' : ''}`}>
            <label htmlFor="login-password">Password</label>
            <div className="auth-input-wrap">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
              <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1} aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && <span className="auth-field-error">{Array.isArray(fieldErrors.password) ? fieldErrors.password[0] : fieldErrors.password}</span>}
          </div>

          {/* Remember + Forgot */}
          <div className="auth-row">
            <label className="auth-checkbox">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
          </div>

          {/* Submit */}
          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? (
              <span className="auth-spinner" />
            ) : (
              <LogIn size={18} />
            )}
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="auth-footer">
          <p>© {new Date().getFullYear()} CASI360 — Care Aid Support Initiative</p>
        </div>
      </div>
    </div>
  )
}
