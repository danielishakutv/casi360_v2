import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * ProtectedRoute — guards authenticated routes.
 *
 * Behaviour:
 *  1. While initial session check is running → show a loading spinner
 *  2. Not authenticated → redirect to /login
 *  3. Authenticated but force_password_change → redirect to /change-password
 *  4. Otherwise → render children
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, mustChangePassword } = useAuth()

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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (mustChangePassword) {
    return <Navigate to="/change-password" replace />
  }

  return children
}
