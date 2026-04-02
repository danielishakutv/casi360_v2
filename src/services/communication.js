/**
 * CASI360 — Communication Module API service
 *
 * Messages (1-on-1 threaded), Forums (general + department), Notices (with read tracking),
 * Emails, and SMS.
 * All requests go through the shared `api` client (cookie auth, XSRF).
 */

import { api } from './api'

/* ------------------------------------------------------------------ */
/* Messages (1-on-1 threaded)                                          */
/* ------------------------------------------------------------------ */

export const messagesApi = {
  list:        (params)          => api.get('/communication/messages', params),
  unreadCount: ()                => api.get('/communication/messages/unread-count'),
  thread:      (threadId)        => api.get(`/communication/messages/${threadId}`),
  send:        (data)            => api.post('/communication/messages', data),
  delete:      (id)              => api.delete(`/communication/messages/${id}`),
}

/* ------------------------------------------------------------------ */
/* Forums                                                              */
/* ------------------------------------------------------------------ */

export const forumsApi = {
  list:          (params)                   => api.get('/communication/forums', params),
  get:           (id)                       => api.get(`/communication/forums/${id}`),
  create:        (data)                     => api.post('/communication/forums', data),
  update:        (id, data)                 => api.patch(`/communication/forums/${id}`, data),
  delete:        (id)                       => api.delete(`/communication/forums/${id}`),
  listMessages:  (forumId, params)          => api.get(`/communication/forums/${forumId}/messages`, params),
  listReplies:   (forumId, messageId, params) => api.get(`/communication/forums/${forumId}/messages/${messageId}/replies`, params),
  postMessage:   (forumId, data)            => api.post(`/communication/forums/${forumId}/messages`, data),
  deleteMessage: (forumId, messageId)       => api.delete(`/communication/forums/${forumId}/messages/${messageId}`),
}

/* ------------------------------------------------------------------ */
/* Notices                                                             */
/* ------------------------------------------------------------------ */

export const noticesApi = {
  stats:  ()           => api.get('/communication/notices/stats'),
  list:   (params)     => api.get('/communication/notices', params),
  get:    (id)         => api.get(`/communication/notices/${id}`),
  create: (data)       => api.post('/communication/notices', data),
  update: (id, data)   => api.patch(`/communication/notices/${id}`, data),
  delete: (id)         => api.delete(`/communication/notices/${id}`),
  reads:  (id)         => api.get(`/communication/notices/${id}/reads`),
}

/* ------------------------------------------------------------------ */
/* Emails                                                              */
/* ------------------------------------------------------------------ */

export const emailsApi = {
  list:   (params)     => api.get('/communication/emails', params),
  create: (data)       => api.post('/communication/emails', data),
  delete: (id)         => api.delete(`/communication/emails/${id}`),
}

/* ------------------------------------------------------------------ */
/* SMS                                                                 */
/* ------------------------------------------------------------------ */

export const smsApi = {
  list:   (params)     => api.get('/communication/sms', params),
  create: (data)       => api.post('/communication/sms', data),
  delete: (id)         => api.delete(`/communication/sms/${id}`),
}
