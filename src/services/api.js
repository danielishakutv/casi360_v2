/**
 * CASI360 — Centralized API client
 *
 * Uses cookie-based sessions (Laravel Sanctum style).
 * All requests include credentials and XSRF token automatically.
 *
 * Backend lives at api.casi360.com (cross-origin).
 * Sanctum cookies are shared via SESSION_DOMAIN=.casi360.com on the backend.
 */

const API_ORIGIN = import.meta.env.VITE_API_URL || 'https://api.casi360.com'
const API_BASE   = API_ORIGIN + '/api/v1'

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[2]) : null
}

async function request(method, path, { body, params } = {}) {
  const url = new URL(API_BASE + path)
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

  const json = await res.json().catch(() => null)

  if (!res.ok) {
    const err = new Error(json?.message || `Request failed (${res.status})`)
    err.status = res.status
    err.errors = json?.errors || null // Laravel 422 validation bag
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
