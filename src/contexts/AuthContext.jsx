/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { authApi, onUnauthorized } from '../services/api'

const AuthContext = createContext(null)

/**
 * AuthProvider — wraps the entire app and manages:
 *  • session bootstrap (check cookie on mount)
 *  • login / logout
 *  • user object + loading / error state
 *  • force-password-change detection
 *  • dynamic permissions (fetched from backend)
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // initial session check
  const [error, setError] = useState(null)
  const [permissions, setPermissions] = useState({})
  const permsFetched = useRef(false)

  /* ---------------------------------------------------------------- */
  /* Fetch permissions from backend                                   */
  /* ---------------------------------------------------------------- */
  const fetchPermissions = useCallback(async () => {
    try {
      const res = await authApi.getPermissions()
      setPermissions(res?.data?.permissions || {})
    } catch {
      setPermissions({})
    }
  }, [])

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
        setPermissions({})
      }
    } catch {
      setUser(null)
      setPermissions({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { checkSession() }, [checkSession])

  // Fetch permissions once user is set
  useEffect(() => {
    if (user && !permsFetched.current) {
      permsFetched.current = true
      fetchPermissions()
    }
    if (!user) {
      permsFetched.current = false
    }
  }, [user, fetchPermissions])

  /* Subscribe to global 401 events — clear user so ProtectedRoute redirects to /login */
  useEffect(() => {
    onUnauthorized(() => { setUser(null); setPermissions({}) })
    return () => onUnauthorized(null)
  }, [])

  /* ---------------------------------------------------------------- */
  /* Login                                                            */
  /* ---------------------------------------------------------------- */
  const login = useCallback(async (email, password, remember = false) => {
    setError(null)
    permsFetched.current = false
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
    setPermissions({})
    permsFetched.current = false
  }, [])

  /* ---------------------------------------------------------------- */
  /* Helpers                                                          */
  /* ---------------------------------------------------------------- */
  const updateUser = useCallback((data) => {
    setUser((prev) => prev ? { ...prev, ...data } : prev)
  }, [])

  /**
   * Check if the current user has a specific permission.
   * super_admin always returns true (hardcoded bypass).
   */
  const can = useCallback((key) => {
    if (user?.role === 'super_admin') return true
    return permissions[key] === true
  }, [user, permissions])

  const isAdmin = useCallback(() => {
    return ['super_admin', 'admin'].includes(user?.role)
  }, [user])

  const isSuperAdmin = useCallback(() => {
    return user?.role === 'super_admin'
  }, [user])

  const isAuthenticated = !!user
  const mustChangePassword = !!user?.force_password_change

  const value = useMemo(() => ({
    user,
    loading,
    error,
    isAuthenticated,
    mustChangePassword,
    permissions,
    can,
    isAdmin,
    isSuperAdmin,
    fetchPermissions,
    login,
    logout,
    updateUser,
    checkSession,
    setError,
  }), [user, loading, error, isAuthenticated, mustChangePassword, permissions, can, isAdmin, isSuperAdmin, fetchPermissions, login, logout, updateUser, checkSession])

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
