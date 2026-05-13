import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

/* ── Hero carousel content ─────────────────────────────────────────────
 * Showcases what CASI360 actually does so the login screen sells the
 * product. Each slide is a stable Unsplash URL — swap with local NGO
 * photography by replacing the `image` field. Order is meaningful: the
 * procurement chain leads since that's the headline workflow.
 * --------------------------------------------------------------------- */
const HERO_SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&q=80&auto=format&fit=crop',
    title: 'Procurement, made transparent.',
    description: 'BOQ → PR → RFQ → PO → GRN → Invoice → Payment, all linked together. Every signature, every change, in one auditable trail.',
  },
  {
    image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1600&q=80&auto=format&fit=crop',
    title: 'Approvals that hold the line.',
    description: 'Multi-step sign-offs from preparer to budget holder. Nothing moves until the right people have actually signed.',
  },
  {
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1600&q=80&auto=format&fit=crop',
    title: 'Projects, on the books.',
    description: 'Budget lines, team rosters, donors, deliverables — tracked side-by-side with the spend they fund.',
  },
  {
    image: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=1600&q=80&auto=format&fit=crop',
    title: 'Vendors and quotes, side by side.',
    description: 'Invite multiple suppliers or run an open call, compare responses, award with a full audit trail behind the decision.',
  },
]
const HERO_INTERVAL_MS = 6000

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [heroIndex, setHeroIndex] = useState(0)

  /* Auto-advance the hero carousel. Pauses when the user manually picks
     a slide via the dots — they get 3× the normal dwell so they can
     actually read the slide they jumped to before it changes again. */
  useEffect(() => {
    const t = setInterval(() => {
      setHeroIndex((i) => (i + 1) % HERO_SLIDES.length)
    }, HERO_INTERVAL_MS)
    return () => clearInterval(t)
  }, [heroIndex])

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
    <div className="auth-page auth-page-split">
      {/* ── Left: feature carousel (hidden on small screens) ── */}
      <aside className="auth-hero" aria-hidden="true">
        {HERO_SLIDES.map((slide, i) => (
          <div
            key={i}
            className={`auth-hero-slide ${i === heroIndex ? 'is-active' : ''}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          />
        ))}
        <div className="auth-hero-shade" />
        <div className="auth-hero-overlay">
          <div className="auth-hero-brand">CASI360</div>
          <h2 className="auth-hero-title">{HERO_SLIDES[heroIndex].title}</h2>
          <p className="auth-hero-desc">{HERO_SLIDES[heroIndex].description}</p>
          <div className="auth-hero-dots" role="tablist">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`auth-hero-dot ${i === heroIndex ? 'is-active' : ''}`}
                onClick={() => setHeroIndex(i)}
                aria-label={`Show slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </aside>

      {/* ── Right: login form (unchanged) ── */}
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
