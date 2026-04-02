/**
 * CASI360 — Projects Module API service
 *
 * All requests go through the shared `api` client (cookie auth, XSRF).
 */

import { api } from './api'

/* ------------------------------------------------------------------ */
/* Budget Categories                                                   */
/* ------------------------------------------------------------------ */

export const budgetCategoriesApi = {
  list:   (params)     => api.get('/projects/budget-categories', params),
  get:    (id)         => api.get(`/projects/budget-categories/${id}`),
  create: (data)       => api.post('/projects/budget-categories', data),
  update: (id, data)   => api.patch(`/projects/budget-categories/${id}`, data),
  delete: (id)         => api.delete(`/projects/budget-categories/${id}`),
}

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

export const projectsApi = {
  stats:  ()           => api.get('/projects/stats'),
  list:   (params)     => api.get('/projects', params),
  get:    (id)         => api.get(`/projects/${id}`),
  create: (data)       => api.post('/projects', data),
  update: (id, data)   => api.patch(`/projects/${id}`, data),
  delete: (id)         => api.delete(`/projects/${id}`),
}

/* ------------------------------------------------------------------ */
/* Project Sub-resources (nested under /projects/{id})                 */
/* ------------------------------------------------------------------ */

export const projectDonorsApi = {
  list:   (projectId, params)         => api.get(`/projects/${projectId}/donors`, params),
  create: (projectId, data)           => api.post(`/projects/${projectId}/donors`, data),
  update: (projectId, donorId, data)  => api.patch(`/projects/${projectId}/donors/${donorId}`, data),
  delete: (projectId, donorId)        => api.delete(`/projects/${projectId}/donors/${donorId}`),
}

export const projectPartnersApi = {
  list:   (projectId, params)           => api.get(`/projects/${projectId}/partners`, params),
  create: (projectId, data)             => api.post(`/projects/${projectId}/partners`, data),
  update: (projectId, partnerId, data)  => api.patch(`/projects/${projectId}/partners/${partnerId}`, data),
  delete: (projectId, partnerId)        => api.delete(`/projects/${projectId}/partners/${partnerId}`),
}

export const projectTeamApi = {
  list:   (projectId, params)          => api.get(`/projects/${projectId}/team`, params),
  create: (projectId, data)            => api.post(`/projects/${projectId}/team`, data),
  update: (projectId, memberId, data)  => api.patch(`/projects/${projectId}/team/${memberId}`, data),
  delete: (projectId, memberId)        => api.delete(`/projects/${projectId}/team/${memberId}`),
}

export const projectActivitiesApi = {
  list:   (projectId, params)            => api.get(`/projects/${projectId}/activities`, params),
  create: (projectId, data)              => api.post(`/projects/${projectId}/activities`, data),
  update: (projectId, activityId, data)  => api.patch(`/projects/${projectId}/activities/${activityId}`, data),
  delete: (projectId, activityId)        => api.delete(`/projects/${projectId}/activities/${activityId}`),
}

export const projectBudgetApi = {
  list:   (projectId, params)        => api.get(`/projects/${projectId}/budget-lines`, params),
  create: (projectId, data)          => api.post(`/projects/${projectId}/budget-lines`, data),
  update: (projectId, lineId, data)  => api.patch(`/projects/${projectId}/budget-lines/${lineId}`, data),
  delete: (projectId, lineId)        => api.delete(`/projects/${projectId}/budget-lines/${lineId}`),
}

export const projectNotesApi = {
  list:   (projectId, params)       => api.get(`/projects/${projectId}/notes`, params),
  create: (projectId, data)         => api.post(`/projects/${projectId}/notes`, data),
  update: (projectId, noteId, data) => api.patch(`/projects/${projectId}/notes/${noteId}`, data),
  delete: (projectId, noteId)       => api.delete(`/projects/${projectId}/notes/${noteId}`),
}

/* ------------------------------------------------------------------ */
/* Project Reports                                                     */
/* ------------------------------------------------------------------ */

export const projectReportsApi = {
  summary:           ()   => api.get('/reports/projects/summary'),
  detail:            (id) => api.get(`/reports/projects/${id}/detail`),
  budgetUtilization: ()   => api.get('/reports/projects/budget-utilization'),
  activityProgress:  ()   => api.get('/reports/projects/activity-progress'),
}

/* ------------------------------------------------------------------ */
/* Beneficiaries                                                       */
/* ------------------------------------------------------------------ */

export const beneficiariesApi = {
  list:   (params)     => api.get('/programs/beneficiaries', params),
  get:    (id)         => api.get(`/programs/beneficiaries/${id}`),
  create: (data)       => api.post('/programs/beneficiaries', data),
  update: (id, data)   => api.patch(`/programs/beneficiaries/${id}`, data),
  delete: (id)         => api.delete(`/programs/beneficiaries/${id}`),
}

/* ------------------------------------------------------------------ */
/* Program Reports                                                     */
/* ------------------------------------------------------------------ */

export const programReportsApi = {
  summary: ()       => api.get('/programs/reports/summary'),
  export:  (params) => api.get('/programs/reports/export', params),
}

/* ------------------------------------------------------------------ */
/* Help Center                                                         */
/* ------------------------------------------------------------------ */

export const helpApi = {
  listArticles: (params)  => api.get('/help/articles', params),
  getArticle:   (id)      => api.get(`/help/articles/${id}`),
  submitTicket: (data)    => api.post('/help/tickets', data),
}
