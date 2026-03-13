/**
 * CASI360 — Procurement Module API service
 *
 * Purchase Requests, BOQ, RFQ, Purchase Orders, GRN, RFP endpoints.
 * All requests go through the shared `api` client (cookie auth, XSRF).
 *
 * Currency: NGN (Naira) primary. USD / EUR optional (coming in Settings).
 */

import { api } from './api'

/* ------------------------------------------------------------------ */
/* Purchase Requests (PR)                                             */
/* ------------------------------------------------------------------ */

export const purchaseRequestsApi = {
  list:   (params)     => api.get('/procurement/purchase-requests', params),
  get:    (id)         => api.get(`/procurement/purchase-requests/${id}`),
  create: (data)       => api.post('/procurement/purchase-requests', data),
  update: (id, data)   => api.patch(`/procurement/purchase-requests/${id}`, data),
  delete: (id)         => api.delete(`/procurement/purchase-requests/${id}`),
}

/* ------------------------------------------------------------------ */
/* Bill of Quantities (BOQ)                                           */
/* ------------------------------------------------------------------ */

export const boqApi = {
  list:   (params)     => api.get('/procurement/boq', params),
  get:    (id)         => api.get(`/procurement/boq/${id}`),
  create: (data)       => api.post('/procurement/boq', data),
  update: (id, data)   => api.patch(`/procurement/boq/${id}`, data),
  delete: (id)         => api.delete(`/procurement/boq/${id}`),
}

/* ------------------------------------------------------------------ */
/* Request for Quotation (RFQ)                                        */
/* ------------------------------------------------------------------ */

export const rfqApi = {
  list:   (params)     => api.get('/procurement/rfq', params),
  get:    (id)         => api.get(`/procurement/rfq/${id}`),
  create: (data)       => api.post('/procurement/rfq', data),
  update: (id, data)   => api.patch(`/procurement/rfq/${id}`, data),
  delete: (id)         => api.delete(`/procurement/rfq/${id}`),
}

/* ------------------------------------------------------------------ */
/* Purchase Orders (PO)                                               */
/* ------------------------------------------------------------------ */

export const purchaseOrdersApi = {
  list:   (params)     => api.get('/procurement/purchase-orders', params),
  get:    (id)         => api.get(`/procurement/purchase-orders/${id}`),
  create: (data)       => api.post('/procurement/purchase-orders', data),
  update: (id, data)   => api.patch(`/procurement/purchase-orders/${id}`, data),
  delete: (id)         => api.delete(`/procurement/purchase-orders/${id}`),
}

/* ------------------------------------------------------------------ */
/* Goods Received Note (GRN)                                          */
/* ------------------------------------------------------------------ */

export const grnApi = {
  list:   (params)     => api.get('/procurement/grn', params),
  get:    (id)         => api.get(`/procurement/grn/${id}`),
  create: (data)       => api.post('/procurement/grn', data),
  update: (id, data)   => api.patch(`/procurement/grn/${id}`, data),
  delete: (id)         => api.delete(`/procurement/grn/${id}`),
}

/* ------------------------------------------------------------------ */
/* Request for Payment (RFP)                                          */
/* ------------------------------------------------------------------ */

export const rfpApi = {
  list:   (params)     => api.get('/procurement/rfp', params),
  get:    (id)         => api.get(`/procurement/rfp/${id}`),
  create: (data)       => api.post('/procurement/rfp', data),
  update: (id, data)   => api.patch(`/procurement/rfp/${id}`, data),
  delete: (id)         => api.delete(`/procurement/rfp/${id}`),
}
