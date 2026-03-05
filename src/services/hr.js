/**
 * CASI360 — HR Module API service
 *
 * Departments, Designations, and Employees endpoints.
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
