import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, PlusCircle, X, AlertCircle } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { purchaseRequestsApi } from '../../services/procurement'

/* ─── Constants ─── */
const STATUSES = ['draft', 'pending', 'approved', 'rejected', 'cancelled']
const PRIORITIES = ['low', 'medium', 'high', 'urgent']

const PURCHASE_SCENARIOS = [
  'Direct Purchase',
  'Competitive Bidding',
  'Framework Agreement',
  'Emergency Purchase',
  'Sole Source',
]

const CURRENCY_OPTIONS = [
  { code: 'NGN', symbol: '₦', label: 'NGN — Nigerian Naira', rate: 1 },
  { code: 'USD', symbol: '$', label: 'USD — US Dollar (₦1,500)', rate: 1500 },
  { code: 'EUR', symbol: '€', label: 'EUR — Euro (₦1,700)', rate: 1700 },
]

/* Demo project / donor data — replace with API data when ready */
const DEMO_PROJECTS = [
  { id: 'PRJ-001', name: 'HQ Renovation Phase 2', code: 'PRJ-001', donors: ['USAID', 'DFID'] },
  { id: 'PRJ-002', name: 'Warehouse Security Upgrade', code: 'PRJ-002', donors: ['EU Humanitarian Aid', 'ECHO'] },
  { id: 'PRJ-003', name: 'Power Infrastructure', code: 'PRJ-003', donors: ['World Bank', 'AfDB'] },
  { id: 'PRJ-004', name: 'Community Health Programme', code: 'PRJ-004', donors: ['UNICEF', 'WHO', 'GAVI'] },
  { id: 'PRJ-005', name: 'Education Support Initiative', code: 'PRJ-005', donors: ['USAID', 'Save the Children'] },
]

const BUDGET_LINES = [
  'Staff Costs', 'Travel & Transport', 'Equipment & Supplies',
  'Office Costs', 'Training & Capacity Building', 'Communication',
  'Construction & Renovation', 'Monitoring & Evaluation', 'Other Direct Costs',
]

const EMPTY_LINE_ITEM = {
  description: '', unit: '', quantity: '', unit_cost: '',
  project_code: '', budget_line: '',
}

const EMPTY_SIGNOFF = { name: '', position: '', date: '', signature: '' }

function todayStr() { return new Date().toISOString().slice(0, 10) }

function generatePRNumber() {
  const yr = new Date().getFullYear()
  const seq = String(Math.floor(Math.random() * 900) + 100)
  return `PR-${yr}-${seq}`
}

function buildInitialForm() {
  return {
    pr_number: generatePRNumber(),
    date: todayStr(),
    delivery_location: '',
    delivery_date: '',
    purchase_scenario: '',
    logistics_involved: 'No',
    boq: 'No',
    project_code: '',
    donor: '',
    currency: 'NGN',
    line_items: [{ ...EMPTY_LINE_ITEM }],
    comment: '',
    validation: { ...EMPTY_SIGNOFF },
    requester: { ...EMPTY_SIGNOFF },
    budget_holder: { ...EMPTY_SIGNOFF },
    finance: { ...EMPTY_SIGNOFF },
    logistics: { ...EMPTY_SIGNOFF },
    status: 'draft',
    priority: 'medium',
  }
}

export default function CreatePurchaseRequest() {
  const navigate = useNavigate()
  const [form, setForm] = useState(buildInitialForm)
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState({})

  /* ─── Derived: donors for selected project ─── */
  const donorsForProject = useMemo(() => {
    const proj = DEMO_PROJECTS.find((p) => p.code === form.project_code)
    return proj ? proj.donors : []
  }, [form.project_code])

  /* ─── Form helpers ─── */
  const updateField = useCallback((f, v) => setForm((p) => {
    const next = { ...p, [f]: v }
    if (f === 'project_code') next.donor = ''
    return next
  }), [])

  const updateLineItem = useCallback((idx, field, value) => {
    setForm((p) => {
      const items = p.line_items.map((li, i) => i === idx ? { ...li, [field]: value } : li)
      return { ...p, line_items: items }
    })
  }, [])

  const addLineItem = useCallback(() => {
    setForm((p) => ({ ...p, line_items: [...p.line_items, { ...EMPTY_LINE_ITEM }] }))
  }, [])

  const removeLineItem = useCallback((idx) => {
    setForm((p) => ({ ...p, line_items: p.line_items.length > 1 ? p.line_items.filter((_, i) => i !== idx) : p.line_items }))
  }, [])

  const updateSignoff = useCallback((section, field, value) => {
    setForm((p) => ({ ...p, [section]: { ...p[section], [field]: value } }))
  }, [])

  /* ─── Line item totals ─── */
  const lineTotal = useCallback((li) => (Number(li.quantity) || 0) * (Number(li.unit_cost) || 0), [])
  const grandTotal = useMemo(() => form.line_items.reduce((s, li) => s + lineTotal(li), 0), [form.line_items, lineTotal])
  const currencyInfo = useMemo(() => CURRENCY_OPTIONS.find((c) => c.code === form.currency) || CURRENCY_OPTIONS[0], [form.currency])

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormErrors({})

    /* Map frontend form → backend-accepted payload.
       Extra fields (delivery_location, purchase_scenario, signoffs, etc.)
       are documented in BACKEND_PROCUREMENT_GAPS.md for future backend support. */
    const payload = {
      title: form.pr_number + (form.delivery_location ? ` — ${form.delivery_location}` : ''),
      justification: form.comment || undefined,
      priority: form.priority,
      needed_by: form.delivery_date || undefined,
      notes: form.comment || undefined,
      status: 'draft',
      items: form.line_items
        .filter((li) => li.description)
        .map((li) => ({
          description: li.description,
          quantity: Number(li.quantity) || 1,
          unit: li.unit || undefined,
          estimated_unit_cost: Number(li.unit_cost) || 0,
        })),
    }

    purchaseRequestsApi.create(payload)
      .then(() => navigate('/procurement/purchase-requests'))
      .catch((err) => {
        if (err.errors) setFormErrors(err.errors)
        else setFormErrors({ _general: err.message || 'Failed to create purchase request' })
      })
      .finally(() => setSubmitting(false))
  }

  /* ─── Signoff block (render function, not component) ─── */
  function renderSignoff(label, section) {
    return (
      <div className="pr-signoff-block" key={section}>
        <h4 className="pr-signoff-title">{label}</h4>
        <div className="hr-form-row">
          <div className="hr-form-field"><label>Name</label><input type="text" value={form[section].name} onChange={(e) => updateSignoff(section, 'name', e.target.value)} /></div>
          <div className="hr-form-field"><label>Position</label><input type="text" value={form[section].position} onChange={(e) => updateSignoff(section, 'position', e.target.value)} /></div>
        </div>
        <div className="hr-form-row">
          <div className="hr-form-field"><label>Date</label><input type="date" value={form[section].date} onChange={(e) => updateSignoff(section, 'date', e.target.value)} /></div>
          <div className="hr-form-field"><label>Signature</label><input type="text" value={form[section].signature} onChange={(e) => updateSignoff(section, 'signature', e.target.value)} placeholder="Type name as signature" /></div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in">
      {/* Page header */}
      <div className="pr-page-header">
        <button type="button" className="hr-btn-secondary" onClick={() => navigate('/procurement/purchase-requests')}>
          <ArrowLeft size={16} /> Back to Purchase Requests
        </button>
        <h2 className="pr-page-title">New Purchase Request</h2>
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

          {/* ── Header fields ── */}
          <p className="hr-form-section-title">Purchase Request</p>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>PR Number</label>
              <input type="text" value={form.pr_number} readOnly className="pr-readonly" />
            </div>
            <div className="hr-form-field">
              <label>Date</label>
              <input type="date" value={form.date} onChange={(e) => updateField('date', e.target.value)} />
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Delivery Location *</label>
              <input type="text" value={form.delivery_location} onChange={(e) => updateField('delivery_location', e.target.value)} placeholder="Enter delivery location" required />
            </div>
            <div className="hr-form-field">
              <label>Delivery Date *</label>
              <input type="date" value={form.delivery_date} onChange={(e) => updateField('delivery_date', e.target.value)} required />
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Purchase Scenario</label>
              <select value={form.purchase_scenario} onChange={(e) => updateField('purchase_scenario', e.target.value)}>
                <option value="">Select scenario…</option>
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
              <label>Project Code *</label>
              <select value={form.project_code} onChange={(e) => updateField('project_code', e.target.value)} required>
                <option value="">Select project…</option>
                {DEMO_PROJECTS.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
              </select>
            </div>
            <div className="hr-form-field">
              <label>Donor</label>
              <select value={form.donor} onChange={(e) => updateField('donor', e.target.value)} disabled={!form.project_code}>
                <option value="">{form.project_code ? 'Select donor…' : 'Select a project first'}</option>
                {donorsForProject.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Priority</label>
              <select value={form.priority} onChange={(e) => updateField('priority', e.target.value)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{capitalize(p)}</option>)}
              </select>
            </div>
            <div className="hr-form-field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
              </select>
            </div>
          </div>

          {/* ── Activity Description table ── */}
          <p className="hr-form-section-title">Activity Description</p>

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
                {form.line_items.map((li, idx) => (
                  <tr key={idx}>
                    <td className="pr-sn">{idx + 1}</td>
                    <td><input type="text" value={li.description} onChange={(e) => updateLineItem(idx, 'description', e.target.value)} placeholder="Item description" /></td>
                    <td><input type="text" value={li.unit} onChange={(e) => updateLineItem(idx, 'unit', e.target.value)} placeholder="e.g. Pcs" /></td>
                    <td><input type="number" value={li.quantity} onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)} min="0" /></td>
                    <td><input type="number" value={li.unit_cost} onChange={(e) => updateLineItem(idx, 'unit_cost', e.target.value)} min="0" step="0.01" /></td>
                    <td className="pr-computed">{currencyInfo.symbol}{lineTotal(li).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>
                      <select value={li.project_code} onChange={(e) => updateLineItem(idx, 'project_code', e.target.value)}>
                        <option value="">—</option>
                        {DEMO_PROJECTS.map((p) => <option key={p.code} value={p.code}>{p.code}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={li.budget_line} onChange={(e) => updateLineItem(idx, 'budget_line', e.target.value)}>
                        <option value="">—</option>
                        {BUDGET_LINES.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </td>
                    <td>
                      {form.line_items.length > 1 && (
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
            <button type="button" className="pr-add-row" onClick={addLineItem}><PlusCircle size={14} /> Add Row</button>
          </div>

          {form.currency !== 'NGN' && (
            <div className="pr-naira-equivalent">
              Naira equivalent: <strong>₦{(grandTotal * currencyInfo.rate).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              <span className="pr-rate-note">({currencyInfo.symbol}1 = ₦{currencyInfo.rate.toLocaleString()})</span>
            </div>
          )}

          {/* ── Comments / Special ── */}
          <p className="hr-form-section-title">Comments / Special</p>
          <div className="hr-form-field">
            <textarea value={form.comment} onChange={(e) => updateField('comment', e.target.value)} placeholder="Any comments or special instructions…" rows={3} />
          </div>

          {/* ── Sign-off sections ── */}
          <p className="hr-form-section-title">Validation & Approvals</p>

          <div className="pr-signoffs-grid">
            {renderSignoff('Validation', 'validation')}
            {renderSignoff('Requester', 'requester')}
            {renderSignoff('Budget Holder', 'budget_holder')}
            {renderSignoff('Finance', 'finance')}
            {renderSignoff('Logistics', 'logistics')}
          </div>

          {/* ── Actions ── */}
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={() => navigate('/procurement/purchase-requests')}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>{submitting ? 'Saving…' : 'Submit PR'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
