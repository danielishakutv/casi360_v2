import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * ProtectedRoute — guards authenticated routes.
 *
 * Behaviour:
 *  1. While initial session check is running → show a loading spinner
 *  2. Not authenticated → redirect to /login
 *  3. Authenticated but force_password_change (unless allowPasswordChange) → redirect to /change-password
 *  4. Otherwise → render children
 *
 * Props:
 *  - allowPasswordChange  Skip the force-redirect to /change-password (used ON the change-password page itself)
 */
export default function ProtectedRoute({ children, allowPasswordChange = false }) {
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

  if (mustChangePassword && !allowPasswordChange) {
    return <Navigate to="/change-password" replace />
  }

  return children
}
