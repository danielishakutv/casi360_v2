/**
 * CASI360 — Procurement Module API service
 *
 * All endpoints are now ✅ LIVE.
 * All requests go through the shared `api` client (cookie auth, XSRF).
 * Currency: NGN (Naira) primary. USD / EUR optional.
 */

import { api } from './api'

/* ------------------------------------------------------------------ */
/* Aggregate Stats                                                     */
/* ------------------------------------------------------------------ */

export const procurementStatsApi = {
  get: () => api.get('/procurement/stats'),
}

/* ------------------------------------------------------------------ */
/* Vendors  ✅ LIVE                                                    */
/* ------------------------------------------------------------------ */

export const vendorsApi = {
  list:   (params)     => api.get('/procurement/vendors', params),
  get:    (id)         => api.get(`/procurement/vendors/${id}`),
  create: (data)       => api.post('/procurement/vendors', data),
  update: (id, data)   => api.patch(`/procurement/vendors/${id}`, data),
  delete: (id)         => api.delete(`/procurement/vendors/${id}`),
}

/* ------------------------------------------------------------------ */
/* Vendor Categories  ⏳ STUB — awaiting backend                       */
/* ------------------------------------------------------------------ */

export const vendorCategoriesApi = {
  list:   (params)     => api.get('/procurement/vendor-categories', params),
  get:    (id)         => api.get(`/procurement/vendor-categories/${id}`),
  create: (data)       => api.post('/procurement/vendor-categories', data),
  update: (id, data)   => api.patch(`/procurement/vendor-categories/${id}`, data),
  delete: (id)         => api.delete(`/procurement/vendor-categories/${id}`),
}

/* ------------------------------------------------------------------ */
/* Inventory Items  ✅ LIVE                                            */
/* ------------------------------------------------------------------ */

export const inventoryApi = {
  list:   (params)     => api.get('/procurement/inventory', params),
  get:    (id)         => api.get(`/procurement/inventory/${id}`),
  create: (data)       => api.post('/procurement/inventory', data),
  update: (id, data)   => api.patch(`/procurement/inventory/${id}`, data),
  delete: (id)         => api.delete(`/procurement/inventory/${id}`),
}

/* ------------------------------------------------------------------ */
/* Purchase Orders (PO)  ✅ LIVE                                       */
/* ------------------------------------------------------------------ */

export const purchaseOrdersApi = {
  list:           (params)     => api.get('/procurement/purchase-orders', params),
  get:            (id)         => api.get(`/procurement/purchase-orders/${id}`),
  create:         (data)       => api.post('/procurement/purchase-orders', data),
  update:         (id, data)   => api.patch(`/procurement/purchase-orders/${id}`, data),
  delete:         (id)         => api.delete(`/procurement/purchase-orders/${id}`),
  submit:         (id)         => api.post(`/procurement/purchase-orders/${id}/submit`),
  approvalStatus: (id)         => api.get(`/procurement/purchase-orders/${id}/approval-status`),
  processApproval:(id, data)   => api.patch(`/procurement/purchase-orders/${id}/approval`, data),
  disbursements:  (id)         => api.get(`/procurement/purchase-orders/${id}/disbursements`),
  createDisbursement: (id, data) => api.post(`/procurement/purchase-orders/${id}/disbursements`, data),
}

/* ------------------------------------------------------------------ */
/* Requisitions (mapped to Purchase Requests in UI)  ✅ LIVE           */
/* ------------------------------------------------------------------ */

export const purchaseRequestsApi = {
  list:           (params)     => api.get('/procurement/requisitions', params),
  get:            (id)         => api.get(`/procurement/requisitions/${id}`),
  create:         (data)       => api.post('/procurement/requisitions', data),
  update:         (id, data)   => api.patch(`/procurement/requisitions/${id}`, data),
  delete:         (id)         => api.delete(`/procurement/requisitions/${id}`),
  submit:         (id)         => api.post(`/procurement/requisitions/${id}/submit`),
  approvalStatus: (id)         => api.get(`/procurement/requisitions/${id}/approval-status`),
  processApproval:(id, data)   => api.patch(`/procurement/requisitions/${id}/approval`, data),
  auditLog:       (id)         => api.get(`/procurement/requisitions/${id}/audit-log`),
}

/* ------------------------------------------------------------------ */
/* Pending Approvals  ✅ LIVE                                          */
/* ------------------------------------------------------------------ */

export const approvalsApi = {
  pending: (params) => api.get('/procurement/pending-approvals', params),
}

/* ------------------------------------------------------------------ */
/* Bill of Quantities (BOQ)  ⏳ STUB — awaiting backend                */
/* ------------------------------------------------------------------ */

export const boqApi = {
  list:   (params)     => api.get('/procurement/boq', params),
  get:    (id)         => api.get(`/procurement/boq/${id}`),
  create: (data)       => api.post('/procurement/boq', data),
  update: (id, data)   => api.patch(`/procurement/boq/${id}`, data),
  delete: (id)         => api.delete(`/procurement/boq/${id}`),
}

/* ------------------------------------------------------------------ */
/* Request for Quotation (RFQ)  ⏳ STUB — awaiting backend             */
/* ------------------------------------------------------------------ */

export const rfqApi = {
  list:   (params)     => api.get('/procurement/rfq', params),
  get:    (id)         => api.get(`/procurement/rfq/${id}`),
  create: (data)       => api.post('/procurement/rfq', data),
  update: (id, data)   => api.patch(`/procurement/rfq/${id}`, data),
  delete: (id)         => api.delete(`/procurement/rfq/${id}`),
}

/* ------------------------------------------------------------------ */
/* Goods Received Note (GRN)  ⏳ STUB — awaiting backend               */
/* ------------------------------------------------------------------ */

export const grnApi = {
  list:   (params)     => api.get('/procurement/grn', params),
  get:    (id)         => api.get(`/procurement/grn/${id}`),
  create: (data)       => api.post('/procurement/grn', data),
  update: (id, data)   => api.patch(`/procurement/grn/${id}`, data),
  delete: (id)         => api.delete(`/procurement/grn/${id}`),
}

/* ------------------------------------------------------------------ */
/* Request for Payment (RFP)  ⏳ STUB — awaiting backend               */
/* ------------------------------------------------------------------ */

export const rfpApi = {
  list:   (params)     => api.get('/procurement/rfp', params),
  get:    (id)         => api.get(`/procurement/rfp/${id}`),
  create: (data)       => api.post('/procurement/rfp', data),
  update: (id, data)   => api.patch(`/procurement/rfp/${id}`, data),
  delete: (id)         => api.delete(`/procurement/rfp/${id}`),
}
