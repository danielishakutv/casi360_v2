import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

/**
 * AuthProvider — wraps the entire app and manages:
 *  • session bootstrap (check cookie on mount)
 *  • login / logout
 *  • user object + loading / error state
 *  • force-password-change detection
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // initial session check
  const [error, setError] = useState(null)

  /* ---------------------------------------------------------------- */
  /* Bootstrap: verify existing session on mount                      */
  /* ---------------------------------------------------------------- */
  const checkSession = useCallback(async () => {
    try {
      const res = await authApi.getSession()
      if (res?.data?.authenticated && res.data.user) {
        setUser(res.data.user)
      } else {
        setUser(null)
      }
    } catch {
      // 401 — no valid session
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { checkSession() }, [checkSession])

  /* ---------------------------------------------------------------- */
  /* Login                                                            */
  /* ---------------------------------------------------------------- */
  const login = useCallback(async (email, password, remember = false) => {
    setError(null)
    // Fetch CSRF cookie first (Sanctum)
    await authApi.csrfCookie()
    const res = await authApi.login(email, password, remember)
    setUser(res.data.user)
    return res.data.user
  }, [])

  /* ---------------------------------------------------------------- */
  /* Logout                                                           */
  /* ---------------------------------------------------------------- */
  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Even if API call fails, clear local state
    }
    setUser(null)
  }, [])

  /* ---------------------------------------------------------------- */
  /* Helpers                                                          */
  /* ---------------------------------------------------------------- */
  const updateUser = useCallback((data) => {
    setUser((prev) => prev ? { ...prev, ...data } : prev)
  }, [])

  const isAuthenticated = !!user
  const mustChangePassword = !!user?.force_password_change

  const value = useMemo(() => ({
    user,
    loading,
    error,
    isAuthenticated,
    mustChangePassword,
    login,
    logout,
    updateUser,
    checkSession,
    setError,
  }), [user, loading, error, isAuthenticated, mustChangePassword, login, logout, updateUser, checkSession])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
