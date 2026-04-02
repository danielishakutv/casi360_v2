/**
 * CASI360 — Centralized API client
 *
 * Uses cookie-based sessions (Laravel Sanctum style).
 * All requests include credentials and XSRF token automatically.
 *
 * Backend lives at api.casi360.com (cross-origin).
 * Sanctum cookies are shared via SESSION_DOMAIN=.casi360.com on the backend.
 */

const API_ORIGIN = import.meta.env.VITE_API_URL || ''
const API_BASE   = API_ORIGIN + '/api/v1'

/* ------------------------------------------------------------------ */
/* Global 401 listener — AuthContext subscribes to this so that any   */
/* expired-session response triggers a redirect to /login.            */
/* ------------------------------------------------------------------ */
let _onUnauthorized = null
export function onUnauthorized(cb) { _onUnauthorized = cb }

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[2]) : null
}

async function request(method, path, { body, params, _retried } = {}) {
  const url = new URL(API_BASE + path, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    })
  }

  const headers = { Accept: 'application/json' }

  // Attach XSRF token for state-changing requests
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    const xsrf = getCookie('XSRF-TOKEN')
    if (xsrf) headers['X-XSRF-TOKEN'] = xsrf
    if (body) headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    credentials: 'include', // send session cookie
    body: body ? JSON.stringify(body) : undefined,
  })

  // 204 No Content — nothing to parse
  if (res.status === 204) return { success: true, data: null }

  // 419 CSRF token mismatch — refresh token and retry once
  if (res.status === 419 && !_retried) {
    await fetch(API_ORIGIN + '/sanctum/csrf-cookie', { credentials: 'include' })
    return request(method, path, { body, params, _retried: true })
  }

  const json = await res.json().catch(() => null)

  if (!res.ok) {
    // Expired session — notify listener so app redirects to login
    if (res.status === 401 && _onUnauthorized) {
      _onUnauthorized()
    }
    const err = new Error(json?.message || `Request failed (${res.status})`)
    err.status = res.status
    err.errors = json?.errors || null // Laravel 422 validation bag
    err.forbidden = res.status === 403
    throw err
  }

  return json
}

/* ------------------------------------------------------------------ */
/* Public helpers                                                     */
/* ------------------------------------------------------------------ */

export const api = {
  get:    (path, params)       => request('GET',    path, { params }),
  post:   (path, body)         => request('POST',   path, { body }),
  patch:  (path, body)         => request('PATCH',  path, { body }),
  delete: (path)               => request('DELETE', path),
}

/* ------------------------------------------------------------------ */
/* Auth endpoints                                                     */
/* ------------------------------------------------------------------ */

export const authApi = {
  /** Fetch CSRF cookie (Sanctum). Call before first login. */
  csrfCookie: () =>
    fetch(API_ORIGIN + '/sanctum/csrf-cookie', { credentials: 'include' }),

  login: (email, password, remember = false) =>
    api.post('/auth/login', { email, password, remember }),

  logout: () =>
    api.post('/auth/logout'),

  getSession: () =>
    api.get('/auth/session'),

  getProfile: () =>
    api.get('/auth/profile'),

  updateProfile: (data) =>
    api.patch('/auth/profile', data),

  changePassword: (current_password, new_password, new_password_confirmation) =>
    api.post('/auth/change-password', { current_password, new_password, new_password_confirmation }),

  forgotPassword: (email) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (data) =>
    api.post('/auth/reset-password', data),

  deactivateAccount: () =>
    api.delete('/auth/account'),

  getPermissions: () =>
    api.get('/auth/permissions'),
}

/* ------------------------------------------------------------------ */
/* User management (admin)                                            */
/* ------------------------------------------------------------------ */

export const usersApi = {
  list: (params) =>
    api.get('/auth/users', params),

  get: (id) =>
    api.get(`/auth/users/${id}`),

  register: (data) =>
    api.post('/auth/register', data),

  update: (id, data) =>
    api.patch(`/auth/users/${id}`, data),

  delete: (id) =>
    api.delete(`/auth/users/${id}`),

  changeRole: (id, role) =>
    api.patch(`/auth/users/${id}/role`, { role }),

  changeStatus: (id, status) =>
    api.patch(`/auth/users/${id}/status`, { status }),
}

/* ------------------------------------------------------------------ */
/* Settings / Permissions management (super_admin)                    */
/* ------------------------------------------------------------------ */

export const settingsApi = {
  getPermissions: (params) =>
    api.get('/settings/permissions', params),

  updatePermission: (id, data) =>
    api.patch(`/settings/permissions/${id}`, data),

  bulkUpdatePermissions: (permissions) =>
    api.patch('/settings/permissions/bulk', { permissions }),

  /** General system settings (super_admin only) */
  getAll: () => api.get('/settings/general'),
  get: (key) => api.get(`/settings/general/${key}`),
  update: (key, value) => api.patch(`/settings/general/${key}`, { value }),
  bulkUpdate: (settings) => api.patch('/settings/general/bulk', { settings }),

  /** Roles (read-only) */
  listRoles: (params) => api.get('/settings/roles', params),
  getRole: (slug) => api.get(`/settings/roles/${slug}`),

  /** Audit log */
  auditLog: (params) => api.get('/settings/audit-log', params),

  /** Data export / import / backup */
  exportData: (params) => api.get('/settings/export', params),
  importData: (formData) =>
    fetch(
      (import.meta.env.VITE_API_URL || '') + '/api/v1/settings/import',
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-XSRF-TOKEN': document.cookie.match(/XSRF-TOKEN=([^;]*)/)?.[1] ? decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]*)/)[1]) : '',
        },
        body: formData,
      }
    ).then(r => r.json()),
  backup: () => api.post('/settings/backup'),
}
