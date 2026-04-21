import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, PlusCircle, X, AlertCircle, User } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { purchaseRequestsApi } from '../../services/procurement'
import { projectsApi, projectDonorsApi, projectBudgetApi } from '../../services/projects'
import { departmentsApi } from '../../services/hr'
import { extractItems } from '../../utils/apiHelpers'
import { useAuth } from '../../contexts/AuthContext'

const PRIORITIES = ['low', 'medium', 'high', 'urgent']

const PURCHASE_SCENARIOS = [
  'Direct Purchase',
  'Competitive Bidding',
  'Framework Agreement',
  'Emergency Purchase',
  'Sole Source',
]

const CURRENCY_OPTIONS = [
  { code: 'NGN', symbol: '₦', label: 'NGN — Nigerian Naira' },
  { code: 'USD', symbol: '$', label: 'USD — US Dollar' },
  { code: 'EUR', symbol: '€', label: 'EUR — Euro' },
]


const EMPTY_LINE_ITEM = {
  description: '', unit: '', quantity: '', estimated_unit_cost: '',
  project_code: '', budget_line: '', inventory_item_id: '',
}

function todayStr() { return new Date().toISOString().slice(0, 10) }

function buildInitialForm() {
  return {
    title: '',
    date: todayStr(),
    department_id: '',
    delivery_location: '',
    delivery_date: '',
    purchase_scenario: '',
    logistics_involved: 'No',
    boq: 'No',
    project_code: '',
    donor: '',
    currency: 'NGN',
    exchange_rate: '',
    items: [{ ...EMPTY_LINE_ITEM }],
    justification: '',
    notes: '',
    priority: 'medium',
  }
}

const BACK_PATH = '/hr/purchase-requests'

export default function HRCreatePurchaseRequest() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const { user } = useAuth()

  const [form, setForm] = useState(buildInitialForm)
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [projects, setProjects] = useState([])
  const [departments, setDepartments] = useState([])
  const [donorsForProject, setDonorsForProject] = useState([])
  const [budgetLinesByProject, setBudgetLinesByProject] = useState({})
  const fetchedProjectIds = useRef(new Set())
  const [loadingEdit, setLoadingEdit] = useState(isEdit)

  useEffect(() => {
    projectsApi.list({ per_page: 0 }).then((res) => setProjects(extractItems(res))).catch(() => {})
    departmentsApi.list({ per_page: 0 }).then((res) => setDepartments(extractItems(res))).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit) return
    purchaseRequestsApi.get(id)
      .then((res) => {
        const pr = res?.data?.requisition || res?.data?.purchase_request || res?.data || res
        setForm({
          title: pr.title || '',
          date: pr.date || todayStr(),
          department_id: pr.department_id || '',
          delivery_location: pr.delivery_location || '',
          delivery_date: pr.needed_by || pr.delivery_date || '',
          purchase_scenario: pr.purchase_scenario || '',
          logistics_involved: pr.logistics_involved || 'No',
          boq: pr.boq || 'No',
          project_code: pr.project_code || '',
          donor: pr.donor || '',
          currency: pr.currency || 'NGN',
          exchange_rate: pr.exchange_rate || '',
          items: (pr.items || []).length > 0
            ? pr.items.map((it) => ({
              description: it.description || '',
              unit: it.unit || '',
              quantity: it.quantity || '',
              estimated_unit_cost: it.estimated_unit_cost || '',
              project_code: it.project_code || '',
              budget_line: it.budget_line || '',
              inventory_item_id: it.inventory_item_id || '',
            }))
            : [{ ...EMPTY_LINE_ITEM }],
          justification: pr.justification || '',
          notes: pr.notes || '',
          priority: pr.priority || 'medium',
        })
      })
      .catch((err) => setFormErrors({ _general: err.message || 'Failed to load purchase request' }))
      .finally(() => setLoadingEdit(false))
  }, [id, isEdit])

  useEffect(() => {
    if (!form.project_code) {
      queueMicrotask(() => setDonorsForProject([]))
      return
    }
    const proj = projects.find((p) => (p.project_code || p.id) === form.project_code)
    if (!proj) {
      queueMicrotask(() => setDonorsForProject([]))
      return
    }
    projectDonorsApi.list(proj.id)
      .then((res) => {
        const data = res?.data || res
        const donors = data?.donors || extractItems(res)
        setDonorsForProject(donors)
      })
      .catch(() => setDonorsForProject([]))
  }, [form.project_code, projects])

  /* Fetch budget lines for all project codes in the form */
  const allProjectCodesKey = [form.project_code, ...form.items.map((li) => li.project_code)].filter(Boolean).join(',')
  useEffect(() => {
    const codes = [...new Set([form.project_code, ...form.items.map((li) => li.project_code)].filter(Boolean))]
    codes.forEach((code) => {
      const proj = projects.find((p) => (p.project_code || p.id) === code)
      if (!proj || fetchedProjectIds.current.has(proj.id)) return
      fetchedProjectIds.current.add(proj.id)
      projectBudgetApi.list(proj.id)
        .then((res) => {
          const lines = res?.data?.budget_lines || res?.data || extractItems(res)
          setBudgetLinesByProject((prev) => ({ ...prev, [proj.id]: Array.isArray(lines) ? lines : [] }))
        })
        .catch(() => {})
    })
  }, [allProjectCodesKey, projects]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = useCallback((f, v) => setForm((p) => {
    const next = { ...p, [f]: v }
    if (f === 'project_code') {
      next.donor = ''
      next.items = p.items.map((li) => ({ ...li, project_code: v, budget_line: '' }))
    }
    return next
  }), [])

  const updateLineItem = useCallback((idx, field, value) => {
    setForm((p) => {
      const items = p.items.map((li, i) => {
        if (i !== idx) return li
        const updated = { ...li, [field]: value }
        if (field === 'project_code') updated.budget_line = ''
        return updated
      })
      return { ...p, items }
    })
  }, [])

  const addLineItem = useCallback(() => {
    setForm((p) => ({ ...p, items: [...p.items, { ...EMPTY_LINE_ITEM, project_code: p.project_code }] }))
  }, [])

  const removeLineItem = useCallback((idx) => {
    setForm((p) => ({ ...p, items: p.items.length > 1 ? p.items.filter((_, i) => i !== idx) : p.items }))
  }, [])

  const lineTotal = useCallback((li) => (Number(li.quantity) || 0) * (Number(li.estimated_unit_cost) || 0), [])
  const grandTotal = useMemo(() => form.items.reduce((s, li) => s + lineTotal(li), 0), [form.items, lineTotal])
  const currencyInfo = useMemo(() => CURRENCY_OPTIONS.find((c) => c.code === form.currency) || CURRENCY_OPTIONS[0], [form.currency])

  const getBudgetLines = useCallback((projectCode) => {
    if (!projectCode) return []
    const proj = projects.find((p) => (p.project_code || p.id) === projectCode)
    if (!proj) return []
    return budgetLinesByProject[proj.id] || []
  }, [projects, budgetLinesByProject])

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormErrors({})

    const payload = {
      title: form.title,
      date: form.date || undefined,
      department_id: form.department_id || undefined,
      requested_by: user?.id || undefined,
      delivery_location: form.delivery_location || undefined,
      needed_by: form.delivery_date || undefined,
      purchase_scenario: form.purchase_scenario || undefined,
      logistics_involved: form.logistics_involved || undefined,
      boq: form.boq || undefined,
      project_code: form.project_code || undefined,
      donor: form.donor || undefined,
      currency: form.currency || undefined,
      exchange_rate: form.currency !== 'NGN' && form.exchange_rate ? Number(form.exchange_rate) : undefined,
      justification: form.justification || undefined,
      notes: form.notes || undefined,
      priority: form.priority,
      items: form.items
        .filter((li) => li.description)
        .map((li) => ({
          description: li.description,
          quantity: Number(li.quantity) || 1,
          unit: li.unit || undefined,
          estimated_unit_cost: Number(li.estimated_unit_cost) || 0,
          project_code: li.project_code || undefined,
          budget_line: li.budget_line || undefined,
          inventory_item_id: li.inventory_item_id || undefined,
        })),
    }

    const apiCall = isEdit ? purchaseRequestsApi.update(id, payload) : purchaseRequestsApi.create(payload)

    apiCall
      .then(() => navigate(BACK_PATH))
      .catch((err) => {
        if (err.errors) setFormErrors(err.errors)
        else setFormErrors({ _general: err.message || 'Failed to save purchase request' })
      })
      .finally(() => setSubmitting(false))
  }

  if (loadingEdit) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="auth-spinner large" /></div>
  }

  return (
    <div className="animate-in">
      <div className="pr-page-header">
        <button type="button" className="hr-btn-secondary" onClick={() => navigate(BACK_PATH)}>
          <ArrowLeft size={16} /> Back to Purchase Requests
        </button>
        <h2 className="pr-page-title">{isEdit ? 'Edit Purchase Request' : 'New Purchase Request'}</h2>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="hr-form pr-form">
          {formErrors._general && (
            <div className="hr-error-banner" style={{ margin: '0 0 16px' }}>
              <AlertCircle size={16} />
              <span>{formErrors._general}</span>
              <button onClick={() => setFormErrors({})} className="hr-error-dismiss">&times;</button>
            </div>
          )}

          <p className="hr-form-section-title">Purchase Request</p>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Title *</label>
              <input type="text" value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="Purchase request title" required />
            </div>
            <div className="hr-form-field">
              <label>Date</label>
              <input type="date" value={form.date} onChange={(e) => updateField('date', e.target.value)} />
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Department *</label>
              <select value={form.department_id} onChange={(e) => updateField('department_id', e.target.value)} required>
                <option value="">Select department...</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="hr-form-field">
              <label>Requested By</label>
              <div className="pr-requester-field">
                <User size={14} />
                {user?.name || '—'}
              </div>
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Delivery Location</label>
              <input type="text" value={form.delivery_location} onChange={(e) => updateField('delivery_location', e.target.value)} placeholder="Enter delivery location" />
            </div>
            <div className="hr-form-field">
              <label>Delivery Date</label>
              <input type="date" value={form.delivery_date} onChange={(e) => updateField('delivery_date', e.target.value)} />
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Purchase Scenario</label>
              <select value={form.purchase_scenario} onChange={(e) => updateField('purchase_scenario', e.target.value)}>
                <option value="">Select scenario...</option>
                {PURCHASE_SCENARIOS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="hr-form-field">
              <label>Currency</label>
              <select value={form.currency} onChange={(e) => updateField('currency', e.target.value)}>
                {CURRENCY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {form.currency !== 'NGN' && (
            <div className="hr-form-row">
              <div className="hr-form-field">
                <label>Exchange Rate (to NGN) *</label>
                <input type="number" value={form.exchange_rate} onChange={(e) => updateField('exchange_rate', e.target.value)} placeholder="e.g. 1500" min="0" step="0.01" required />
              </div>
              <div className="hr-form-field" />
            </div>
          )}

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Logistics Involved</label>
              <select value={form.logistics_involved} onChange={(e) => updateField('logistics_involved', e.target.value)}>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="hr-form-field">
              <label>BOQ</label>
              <select value={form.boq} onChange={(e) => updateField('boq', e.target.value)}>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Project Code</label>
              <select value={form.project_code} onChange={(e) => updateField('project_code', e.target.value)}>
                <option value="">Select project...</option>
                {projects.map((p) => <option key={p.id} value={p.project_code || p.id}>{(p.project_code || p.id)} — {p.name}</option>)}
              </select>
            </div>
            <div className="hr-form-field">
              <label>Donor</label>
              <select value={form.donor} onChange={(e) => updateField('donor', e.target.value)} disabled={!form.project_code}>
                <option value="">{form.project_code ? 'Select donor...' : 'Select a project first'}</option>
                {donorsForProject.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
          </div>

          <div className="hr-form-field" style={{ maxWidth: 250 }}>
            <label>Priority</label>
            <select value={form.priority} onChange={(e) => updateField('priority', e.target.value)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{capitalize(p)}</option>)}
            </select>
          </div>

          <p className="hr-form-section-title">Activity Description</p>

          {/* Desktop: table layout */}
          <div className="pr-line-items-desktop">
            <div className="pr-line-items-wrapper">
              <table className="pr-line-items-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>S/N</th>
                    <th>Description</th>
                    <th style={{ width: 80 }}>Unit</th>
                    <th style={{ width: 70 }}>Qty</th>
                    <th style={{ width: 110 }}>Est. Unit Cost</th>
                    <th style={{ width: 120 }}>Est. Total Cost</th>
                    <th style={{ width: 130 }}>Project Code</th>
                    <th style={{ width: 130 }}>Budget Line</th>
                    <th style={{ width: 36 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((li, idx) => (
                    <tr key={idx}>
                      <td className="pr-sn">{idx + 1}</td>
                      <td><input type="text" value={li.description} onChange={(e) => updateLineItem(idx, 'description', e.target.value)} placeholder="Item description" /></td>
                      <td><input type="text" value={li.unit} onChange={(e) => updateLineItem(idx, 'unit', e.target.value)} placeholder="e.g. Pcs" /></td>
                      <td><input type="number" value={li.quantity} onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)} min="0" /></td>
                      <td><input type="number" value={li.estimated_unit_cost} onChange={(e) => updateLineItem(idx, 'estimated_unit_cost', e.target.value)} min="0" step="0.01" /></td>
                      <td className="pr-computed">{currencyInfo.symbol}{lineTotal(li).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>
                        <select value={li.project_code} onChange={(e) => updateLineItem(idx, 'project_code', e.target.value)}>
                          <option value="">—</option>
                          {projects.map((p) => <option key={p.id} value={p.project_code || p.id}>{p.project_code || p.id}</option>)}
                        </select>
                      </td>
                      <td>
                        <select value={li.budget_line} onChange={(e) => updateLineItem(idx, 'budget_line', e.target.value)}>
                          <option value="">—</option>
                          {getBudgetLines(li.project_code).map((b) => (
                            <option key={b.id} value={b.description}>{b.budget_category} — {b.description}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {form.items.length > 1 && (
                          <button type="button" className="pr-remove-row" onClick={() => removeLineItem(idx)} title="Remove row"><X size={14} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="pr-total-row">
                    <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL</td>
                    <td className="pr-computed" style={{ fontWeight: 700 }}>{currencyInfo.symbol}{grandTotal.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Mobile: card layout */}
          <div className="pr-line-items-mobile">
            {form.items.map((li, idx) => (
              <div className="pr-item-card" key={idx}>
                <div className="pr-item-card-header">
                  <span className="pr-item-card-num">Item {idx + 1}</span>
                  {form.items.length > 1 && (
                    <button type="button" className="pr-remove-row" onClick={() => removeLineItem(idx)} title="Remove"><X size={14} /></button>
                  )}
                </div>
                <div className="pr-item-card-body">
                  <div className="hr-form-field">
                    <label>Description</label>
                    <input type="text" value={li.description} onChange={(e) => updateLineItem(idx, 'description', e.target.value)} placeholder="Item description" />
                  </div>
                  <div className="pr-item-card-row">
                    <div className="hr-form-field">
                      <label>Unit</label>
                      <input type="text" value={li.unit} onChange={(e) => updateLineItem(idx, 'unit', e.target.value)} placeholder="e.g. Pcs" />
                    </div>
                    <div className="hr-form-field">
                      <label>Qty</label>
                      <input type="number" value={li.quantity} onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)} min="0" />
                    </div>
                  </div>
                  <div className="hr-form-field">
                    <label>Est. Unit Cost ({currencyInfo.symbol})</label>
                    <input type="number" value={li.estimated_unit_cost} onChange={(e) => updateLineItem(idx, 'estimated_unit_cost', e.target.value)} min="0" step="0.01" />
                  </div>
                  <div className="pr-item-card-total">
                    <span>Est. Total</span>
                    <strong>{currencyInfo.symbol}{lineTotal(li).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </div>
                  <div className="pr-item-card-row">
                    <div className="hr-form-field">
                      <label>Project Code</label>
                      <select value={li.project_code} onChange={(e) => updateLineItem(idx, 'project_code', e.target.value)}>
                        <option value="">—</option>
                        {projects.map((p) => <option key={p.id} value={p.project_code || p.id}>{p.project_code || p.id}</option>)}
                      </select>
                    </div>
                    <div className="hr-form-field">
                      <label>Budget Line</label>
                      <select value={li.budget_line} onChange={(e) => updateLineItem(idx, 'budget_line', e.target.value)}>
                        <option value="">—</option>
                        {getBudgetLines(li.project_code).map((b) => (
                          <option key={b.id} value={b.description}>{b.budget_category} — {b.description}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="pr-add-row" onClick={addLineItem}><PlusCircle size={14} /> Add Row</button>

          {form.currency !== 'NGN' && form.exchange_rate && (
            <div className="pr-naira-equivalent">
              Naira equivalent: <strong>₦{(grandTotal * Number(form.exchange_rate)).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              <span className="pr-rate-note">({currencyInfo.symbol}1 = ₦{Number(form.exchange_rate).toLocaleString()})</span>
            </div>
          )}

          <p className="hr-form-section-title">Justification & Notes</p>
          <div className="hr-form-field">
            <label>Justification</label>
            <textarea value={form.justification} onChange={(e) => updateField('justification', e.target.value)} placeholder="Reason for this purchase request..." rows={3} />
          </div>
          <div className="hr-form-field">
            <label>Notes</label>
            <textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} placeholder="Any additional notes or special instructions..." rows={2} />
          </div>

          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={() => navigate(BACK_PATH)}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : isEdit ? 'Update PR' : 'Submit PR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
