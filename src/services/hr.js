/**
 * CASI360 — HR Module API service
 *
 * Departments, Designations, Employees, and Notes endpoints.
 * All requests go through the shared `api` client (cookie auth, XSRF).
 */

import { api } from './api'

/* ------------------------------------------------------------------ */
/* Departments                                                        */
/* ------------------------------------------------------------------ */

export const departmentsApi = {
  /** List departments. Pass per_page: 0 to fetch all without pagination. */
  list:   (params)         => api.get('/hr/departments', params),
  get:    (id)             => api.get(`/hr/departments/${id}`),
  create: (data)           => api.post('/hr/departments', data),
  update: (id, data)       => api.patch(`/hr/departments/${id}`, data),
  delete: (id)             => api.delete(`/hr/departments/${id}`),
}

/* ------------------------------------------------------------------ */
/* Designations                                                       */
/* ------------------------------------------------------------------ */

export const designationsApi = {
  list:   (params)         => api.get('/hr/designations', params),
  get:    (id)             => api.get(`/hr/designations/${id}`),
  create: (data)           => api.post('/hr/designations', data),
  update: (id, data)       => api.patch(`/hr/designations/${id}`, data),
  delete: (id)             => api.delete(`/hr/designations/${id}`),
}

/* ------------------------------------------------------------------ */
/* Employees                                                          */
/* ------------------------------------------------------------------ */

export const employeesApi = {
  list:         (params)         => api.get('/hr/employees', params),
  get:          (id)             => api.get(`/hr/employees/${id}`),
  create:       (data)           => api.post('/hr/employees', data),
  update:       (id, data)       => api.patch(`/hr/employees/${id}`, data),
  terminate:    (id)             => api.delete(`/hr/employees/${id}`),
  updateStatus: (id, status)     => api.patch(`/hr/employees/${id}/status`, { status }),
  stats:        ()               => api.get('/hr/employees/stats'),
}

/* ------------------------------------------------------------------ */
/* Notes (employee notes / memos)                                     */
/* ------------------------------------------------------------------ */

export const notesApi = {
  list:   (params)         => api.get('/hr/notes', params),
  get:    (id)             => api.get(`/hr/notes/${id}`),
  create: (data)           => api.post('/hr/notes', data),
  update: (id, data)       => api.patch(`/hr/notes/${id}`, data),
  delete: (id)             => api.delete(`/hr/notes/${id}`),
}

/* ------------------------------------------------------------------ */
/* Leave Types                                                         */
/* ------------------------------------------------------------------ */

export const leaveTypesApi = {
  list:   (params)         => api.get('/hr/leave-types', params),
  get:    (id)             => api.get(`/hr/leave-types/${id}`),
  create: (data)           => api.post('/hr/leave-types', data),
  update: (id, data)       => api.patch(`/hr/leave-types/${id}`, data),
  delete: (id)             => api.delete(`/hr/leave-types/${id}`),
}

/* ------------------------------------------------------------------ */
/* Holidays                                                            */
/* ------------------------------------------------------------------ */

export const holidaysApi = {
  list:   (params)         => api.get('/hr/holidays', params),
  get:    (id)             => api.get(`/hr/holidays/${id}`),
  create: (data)           => api.post('/hr/holidays', data),
  update: (id, data)       => api.patch(`/hr/holidays/${id}`, data),
  delete: (id)             => api.delete(`/hr/holidays/${id}`),
}
