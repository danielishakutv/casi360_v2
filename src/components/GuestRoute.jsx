import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * GuestRoute — only accessible when NOT authenticated.
 * Redirects to dashboard if already logged in.
 */
export default function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-loading">
          <div className="auth-spinner large" />
          <p>Loading…</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children
}
