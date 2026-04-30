import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, PlusCircle, X, AlertCircle } from 'lucide-react'
import { rfqApi, purchaseRequestsApi } from '../../services/procurement'
import { projectsApi } from '../../services/projects'
import { extractItems } from '../../utils/apiHelpers'

/* ─── Constants ─── */
const REQUEST_TYPES = ['Goods', 'Works', 'Services']

const DEMO_STRUCTURES = [
  'Head Office', 'Regional Office - North', 'Regional Office - South',
  'Field Office - Maiduguri', 'Field Office - Yola', 'Warehouse - Abuja',
]

const CURRENCY_OPTIONS = [
  { code: 'NGN', symbol: '₦', label: 'NGN — Nigerian Naira', rate: 1 },
  { code: 'USD', symbol: '$', label: 'USD — US Dollar (₦1,500)', rate: 1500 },
  { code: 'EUR', symbol: '€', label: 'EUR — Euro (₦1,700)', rate: 1700 },
]

const EMPTY_LINE_ITEM = {
  item: '', description: '', unit: '', quantity: '', unit_cost: '',
}

function todayStr() { return new Date().toISOString().slice(0, 10) }

function generateRFQNumber() {
  const yr = new Date().getFullYear()
  const seq = String(Math.floor(Math.random() * 900) + 100)
  return `RFQ-${yr}-${seq}`
}

function buildInitialForm() {
  return {
    rfq_number: generateRFQNumber(),
    /* Optional source PR (must be approved) */
    pr_reference: '',
    /* Supplier header */
    supplier_name: '',
    supplier_address: '',
    date: todayStr(),
    company_rep: '',
    contact: '',
    /* Request type */
    request_type: [],          // multi-select: Goods / Works / Services
    /* For */
    structure: '',
    project: '',
    /* Currency */
    currency: 'NGN',
    /* Itemized list */
    line_items: [{ ...EMPTY_LINE_ITEM }],
    /* Delivery */
    delivery_location: '',
    delivery_duration: '',
    /* Received-by sign-off */
    received_by_name: '',
    received_by_date: '',
    received_by_signature: '',
    company_stamp: '',
  }
}

export default function CreateRequestForQuotation() {
  const navigate = useNavigate()
  const [form, setForm] = useState(buildInitialForm)
  const [projects, setProjects] = useState([])
  const [approvedPRs, setApprovedPRs] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    projectsApi.list({ per_page: 0 }).then((res) => setProjects(extractItems(res))).catch(() => {})
    purchaseRequestsApi.list({ status: 'approved', per_page: 0 })
      .then((res) => setApprovedPRs(extractItems(res)))
      .catch(() => {})
  }, [])

  /* ─── Form helpers ─── */
  const updateField = useCallback((f, v) => setForm((p) => ({ ...p, [f]: v })), [])

  const toggleRequestType = useCallback((type) => {
    setForm((p) => {
      const types = p.request_type.includes(type)
        ? p.request_type.filter((t) => t !== type)
        : [...p.request_type, type]
      return { ...p, request_type: types }
    })
  }, [])

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
    setForm((p) => ({
      ...p,
      line_items: p.line_items.length > 1 ? p.line_items.filter((_, i) => i !== idx) : p.line_items,
    }))
  }, [])

  /* ─── Line item totals ─── */
  const lineTotal = useCallback((li) => (Number(li.quantity) || 0) * (Number(li.unit_cost) || 0), [])
  const grandTotal = useMemo(() => form.line_items.reduce((s, li) => s + lineTotal(li), 0), [form.line_items, lineTotal])
  const currencyInfo = useMemo(() => CURRENCY_OPTIONS.find((c) => c.code === form.currency) || CURRENCY_OPTIONS[0], [form.currency])

  function buildPayload() {
    const signoffs = []
    if (form.received_by_name) {
      signoffs.push({ type: 'Logistics Officer', name: form.received_by_name, position: 'Logistics', date: form.received_by_date || todayStr(), signature: form.received_by_signature })
    }

    return {
      title: form.supplier_name || 'RFQ',
      date: form.date,
      pr_reference: form.pr_reference || undefined,
      supplier_name: form.supplier_name,
      supplier_address: form.supplier_address,
      contact_person: form.company_rep,
      supplier_phone: form.contact,
      request_types: form.request_type,
      structure: form.structure || undefined,
      project_code: form.project || undefined,
      currency: form.currency,
      delivery_address: form.delivery_location || undefined,
      delivery_terms: form.delivery_duration || undefined,
      signoffs: signoffs.length ? signoffs : undefined,
      items: form.line_items
        .filter((li) => li.item || li.description)
        .map((li) => ({
          item_number: li.item || undefined,
          description: li.description,
          unit: li.unit || undefined,
          quantity: Number(li.quantity) || 1,
          unit_cost: Number(li.unit_cost) || 0,
        })),
    }
  }

  function handleErr(err, fallback) {
    setFormError(err.errors ? Object.values(err.errors).flat().join(', ') : (err.message || fallback))
  }

  /* "Save as Draft" — creates the RFQ in draft status and exits. */
  function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')

    rfqApi.create(buildPayload())
      .then(() => navigate('/procurement/rfq'))
      .catch((err) => handleErr(err, 'Failed to create RFQ'))
      .finally(() => setSubmitting(false))
  }

  /* "Save & Send to Vendor" — creates the RFQ then transitions it from
     draft → sent via the dedicated submit endpoint, marking it live. */
  async function handleSaveAndSend() {
    setSubmitting(true)
    setFormError('')
    try {
      const res = await rfqApi.create(buildPayload())
      const data = res?.data?.rfq || res?.data || res
      const newId = data?.id
      if (newId) {
        await rfqApi.submit(newId)
      }
      navigate('/procurement/rfq')
    } catch (err) {
      handleErr(err, 'Failed to send RFQ')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="animate-in">
      {/* Page header */}
      <div className="pr-page-header">
        <button type="button" className="hr-btn-secondary" onClick={() => navigate('/procurement/rfq')}>
          <ArrowLeft size={16} /> Back to RFQs
        </button>
        <h2 className="pr-page-title">New Request for Quotation</h2>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="hr-form pr-form">

          {formError && (
            <div className="hr-error-banner" style={{ margin: '0 0 16px' }}>
              <AlertCircle size={16} />
              <span>{formError}</span>
              <button onClick={() => setFormError('')} className="hr-error-dismiss">&times;</button>
            </div>
          )}

          {/* ── Supplier Header ── */}
          <p className="hr-form-section-title">Supplier Information</p>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>RFQ Number</label>
              <input type="text" value={form.rfq_number} readOnly className="pr-readonly" />
            </div>
            <div className="hr-form-field">
              <label>Date</label>
              <input type="date" value={form.date} onChange={(e) => updateField('date', e.target.value)} />
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Source Purchase Request</label>
              <select value={form.pr_reference} onChange={(e) => updateField('pr_reference', e.target.value)}>
                <option value="">— None —</option>
                {approvedPRs.map((pr) => (
                  <option key={pr.id} value={pr.requisition_number || pr.id}>
                    {(pr.requisition_number || `PR-${pr.id}`)} — {pr.title || pr.description || 'Untitled'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Name of Supplier *</label>
              <input type="text" value={form.supplier_name} onChange={(e) => updateField('supplier_name', e.target.value)} placeholder="Enter supplier name" required />
            </div>
            <div className="hr-form-field">
              <label>Address *</label>
              <input type="text" value={form.supplier_address} onChange={(e) => updateField('supplier_address', e.target.value)} placeholder="Supplier address" required />
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Company Representative *</label>
              <input type="text" value={form.company_rep} onChange={(e) => updateField('company_rep', e.target.value)} placeholder="Full name of representative" required />
            </div>
            <div className="hr-form-field">
              <label>Contact *</label>
              <input type="text" value={form.contact} onChange={(e) => updateField('contact', e.target.value)} placeholder="Phone / email" required />
            </div>
          </div>

          {/* ── Request Type ── */}
          <p className="hr-form-section-title">Request for the Price of</p>

          <div className="rfq-type-checkboxes">
            {REQUEST_TYPES.map((type) => (
              <label key={type} className="rfq-checkbox-label">
                <input
                  type="checkbox"
                  checked={form.request_type.includes(type)}
                  onChange={() => toggleRequestType(type)}
                />
                <span>{type}</span>
              </label>
            ))}
          </div>

          {/* ── For: Structure / Project ── */}
          <p className="hr-form-section-title">For</p>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Structure *</label>
              <select value={form.structure} onChange={(e) => updateField('structure', e.target.value)} required>
                <option value="">Select structure…</option>
                {DEMO_STRUCTURES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="hr-form-field">
              <label>Project *</label>
              <select value={form.project} onChange={(e) => updateField('project', e.target.value)} required>
                <option value="">Select project…</option>
                {projects.map((p) => <option key={p.id} value={p.project_code || p.id}>{p.project_code || p.id} — {p.name}</option>)}
              </select>
            </div>
          </div>

          {/* ── Currency ── */}
          <div className="hr-form-row">
            <div className="hr-form-field" style={{ maxWidth: 300 }}>
              <label>Currency</label>
              <select value={form.currency} onChange={(e) => updateField('currency', e.target.value)}>
                {CURRENCY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* ── Itemized List ── */}
          <p className="hr-form-section-title">Itemized List</p>

          <div className="pr-line-items-wrapper">
            <table className="pr-line-items-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>S/N</th>
                  <th style={{ width: 160 }}>Item</th>
                  <th>Description (Technical Specifications / TOR)</th>
                  <th style={{ width: 100 }}>Unit of Measure</th>
                  <th style={{ width: 70 }}>Qty</th>
                  <th style={{ width: 120 }}>Cost per Unit</th>
                  <th style={{ width: 130 }}>Total Cost</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {form.line_items.map((li, idx) => (
                  <tr key={idx}>
                    <td className="pr-sn">{idx + 1}</td>
                    <td><input type="text" value={li.item} onChange={(e) => updateLineItem(idx, 'item', e.target.value)} placeholder="Item name" /></td>
                    <td><input type="text" value={li.description} onChange={(e) => updateLineItem(idx, 'description', e.target.value)} placeholder="Specs / Terms of Reference" /></td>
                    <td><input type="text" value={li.unit} onChange={(e) => updateLineItem(idx, 'unit', e.target.value)} placeholder="e.g. Pcs" /></td>
                    <td><input type="number" value={li.quantity} onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)} min="0" /></td>
                    <td><input type="number" value={li.unit_cost} onChange={(e) => updateLineItem(idx, 'unit_cost', e.target.value)} min="0" step="0.01" /></td>
                    <td className="pr-computed">{currencyInfo.symbol}{lineTotal(li).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
                  <td colSpan={6} style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL</td>
                  <td className="pr-computed" style={{ fontWeight: 700 }}>{currencyInfo.symbol}{grandTotal.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td></td>
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

          {/* ── Delivery ── */}
          <p className="hr-form-section-title">Delivery</p>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Delivery Location *</label>
              <input type="text" value={form.delivery_location} onChange={(e) => updateField('delivery_location', e.target.value)} placeholder="Enter delivery location" required />
            </div>
            <div className="hr-form-field">
              <label>Supplier's Delivery Duration *</label>
              <input type="text" value={form.delivery_duration} onChange={(e) => updateField('delivery_duration', e.target.value)} placeholder="e.g. 14 working days" required />
            </div>
          </div>

          {/* ── RFQ Received By — Logistics Officer ── */}
          <p className="hr-form-section-title">RFQ Received By — Logistics Officer</p>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Name</label>
              <input type="text" value={form.received_by_name} onChange={(e) => updateField('received_by_name', e.target.value)} placeholder="Logistics officer name" />
            </div>
            <div className="hr-form-field">
              <label>Date</label>
              <input type="date" value={form.received_by_date} onChange={(e) => updateField('received_by_date', e.target.value)} />
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Signature</label>
              <input type="text" value={form.received_by_signature} onChange={(e) => updateField('received_by_signature', e.target.value)} placeholder="Type name as signature" />
            </div>
            <div className="hr-form-field">
              <label>Company Stamp</label>
              <input type="text" value={form.company_stamp} onChange={(e) => updateField('company_stamp', e.target.value)} placeholder="Stamp reference or N/A" />
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={() => navigate('/procurement/rfq')}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save as Draft'}
            </button>
            <button
              type="button"
              className="hr-btn-primary"
              style={{ background: 'var(--success, #16a34a)' }}
              disabled={submitting}
              onClick={handleSaveAndSend}
            >
              {submitting ? 'Sending…' : 'Save & Send to Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
