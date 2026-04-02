import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, PlusCircle, X, AlertCircle } from 'lucide-react'
import { boqApi } from '../../services/procurement'
import { projectsApi } from '../../services/projects'
import { extractItems } from '../../utils/apiHelpers'

/* ─── Constants ─── */
const DEPARTMENTS = [
  'Procurement', 'Finance', 'Administration', 'Operations',
  'Programs', 'Logistics', 'Human Resources', 'IT',
]

const CATEGORIES = [
  'Construction Materials', 'Office Supplies', 'IT Equipment',
  'Furniture & Fixtures', 'Electrical', 'Plumbing', 'Labour',
  'Transport', 'Communication', 'Other',
]

const EMPTY_LINE_ITEM = {
  category: '', unit: '', quantity: '', description: '', rate: '', comment: '',
}

const EMPTY_SURVEYOR = { name: '', position: '', email: '', signature: '' }

const EMPTY_BUDGET_HOLDER = {
  name: '', position: '', email: '', signature: '', budget_available: '',
}

function todayStr() { return new Date().toISOString().slice(0, 10) }

function generateBOQNumber() {
  const yr = new Date().getFullYear()
  const seq = String(Math.floor(Math.random() * 900) + 100)
  return `BOQ-${yr}-${seq}`
}

function buildInitialForm() {
  return {
    boq_number: generateBOQNumber(),
    date: todayStr(),
    department: '',
    project: '',
    delivery_location: '',
    surveyor_1: { ...EMPTY_SURVEYOR },
    surveyor_2: { ...EMPTY_SURVEYOR },
    budget_holder: { ...EMPTY_BUDGET_HOLDER },
    line_items: [{ ...EMPTY_LINE_ITEM }],
  }
}

export default function CreateBillOfQuantities() {
  const navigate = useNavigate()
  const [form, setForm] = useState(buildInitialForm)
  const [projects, setProjects] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    projectsApi.list({ per_page: 0 }).then((res) => setProjects(extractItems(res))).catch(() => {})
  }, [])

  /* ─── Form helpers ─── */
  const updateField = useCallback((f, v) => setForm((p) => ({ ...p, [f]: v })), [])

  const updateSurveyor = useCallback((which, field, value) => {
    setForm((p) => ({ ...p, [which]: { ...p[which], [field]: value } }))
  }, [])

  const updateBudgetHolder = useCallback((field, value) => {
    setForm((p) => ({ ...p, budget_holder: { ...p.budget_holder, [field]: value } }))
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
  const lineAmount = useCallback((li) => (Number(li.quantity) || 0) * (Number(li.rate) || 0), [])
  const grandTotal = useMemo(() => form.line_items.reduce((s, li) => s + lineAmount(li), 0), [form.line_items, lineAmount])

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')

    const signoffs = [
      { type: 'Quantity Surveyor 1', name: form.surveyor_1.name, position: form.surveyor_1.position, date: todayStr(), signature: form.surveyor_1.signature },
      { type: 'Quantity Surveyor 2', name: form.surveyor_2.name, position: form.surveyor_2.position, date: todayStr(), signature: form.surveyor_2.signature },
      { type: 'Budget Holder', name: form.budget_holder.name, position: form.budget_holder.position, date: todayStr(), signature: form.budget_holder.signature },
    ].filter((s) => s.name)

    const payload = {
      title: form.delivery_location || 'BOQ',
      date: form.date,
      department: form.department || undefined,
      project_code: form.project || undefined,
      delivery_location: form.delivery_location || undefined,
      signoffs: signoffs.length ? signoffs : undefined,
      items: form.line_items
        .filter((li) => li.description)
        .map((li) => ({
          category: li.category || undefined,
          unit: li.unit || undefined,
          quantity: Number(li.quantity) || 1,
          description: li.description,
          rate: Number(li.rate) || 0,
          comment: li.comment || undefined,
        })),
    }

    boqApi.create(payload)
      .then(() => navigate('/procurement/boq'))
      .catch((err) => setFormError(err.errors ? Object.values(err.errors).flat().join(', ') : err.message))
      .finally(() => setSubmitting(false))
  }

  /* ─── Surveyor block (render function, not component) ─── */
  function renderSurveyor(label, which) {
    return (
      <div className="pr-signoff-block" key={which}>
        <h4 className="pr-signoff-title">{label}</h4>
        <div className="hr-form-row">
          <div className="hr-form-field"><label>Staff Name</label><input type="text" value={form[which].name} onChange={(e) => updateSurveyor(which, 'name', e.target.value)} placeholder="Full name" /></div>
          <div className="hr-form-field"><label>Staff Position</label><input type="text" value={form[which].position} onChange={(e) => updateSurveyor(which, 'position', e.target.value)} placeholder="Position / title" /></div>
        </div>
        <div className="hr-form-row">
          <div className="hr-form-field"><label>Staff Email</label><input type="email" value={form[which].email} onChange={(e) => updateSurveyor(which, 'email', e.target.value)} placeholder="email@example.com" /></div>
          <div className="hr-form-field"><label>Sign</label><input type="text" value={form[which].signature} onChange={(e) => updateSurveyor(which, 'signature', e.target.value)} placeholder="Type name as signature" /></div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in">
      {/* Page header */}
      <div className="pr-page-header">
        <button type="button" className="hr-btn-secondary" onClick={() => navigate('/procurement/boq')}>
          <ArrowLeft size={16} /> Back to Bill of Quantities
        </button>
        <h2 className="pr-page-title">New Bill of Quantity</h2>
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

          {/* ── Header fields ── */}
          <p className="hr-form-section-title">BOQ Information</p>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>BOQ Number</label>
              <input type="text" value={form.boq_number} readOnly className="pr-readonly" />
            </div>
            <div className="hr-form-field">
              <label>BOQ Date</label>
              <input type="date" value={form.date} onChange={(e) => updateField('date', e.target.value)} />
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Requested Department *</label>
              <select value={form.department} onChange={(e) => updateField('department', e.target.value)} required>
                <option value="">Select department…</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
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

          <div className="hr-form-field">
            <label>Requested Delivery Location *</label>
            <input type="text" value={form.delivery_location} onChange={(e) => updateField('delivery_location', e.target.value)} placeholder="Enter delivery location" required />
          </div>

          {/* ── Market Survey By ── */}
          <p className="hr-form-section-title">Market Survey By</p>

          <div className="pr-signoffs-grid">
            {renderSurveyor('Staff 1', 'surveyor_1')}
            {renderSurveyor('Staff 2', 'surveyor_2')}
          </div>

          {/* ── Budget Holder Check ── */}
          <p className="hr-form-section-title">Budget Holder Check</p>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Staff Name</label>
              <input type="text" value={form.budget_holder.name} onChange={(e) => updateBudgetHolder('name', e.target.value)} placeholder="Full name" />
            </div>
            <div className="hr-form-field">
              <label>Staff Position</label>
              <input type="text" value={form.budget_holder.position} onChange={(e) => updateBudgetHolder('position', e.target.value)} placeholder="Position / title" />
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Staff Email</label>
              <input type="email" value={form.budget_holder.email} onChange={(e) => updateBudgetHolder('email', e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="hr-form-field">
              <label>Sign</label>
              <input type="text" value={form.budget_holder.signature} onChange={(e) => updateBudgetHolder('signature', e.target.value)} placeholder="Type name as signature" />
            </div>
          </div>
          <div className="hr-form-field" style={{ maxWidth: 300 }}>
            <label>Availability of Budget *</label>
            <select value={form.budget_holder.budget_available} onChange={(e) => updateBudgetHolder('budget_available', e.target.value)} required>
              <option value="">Select…</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          {/* ── Itemized List ── */}
          <p className="hr-form-section-title">Itemized List</p>

          <div className="pr-line-items-wrapper">
            <table className="pr-line-items-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>S/N</th>
                  <th style={{ width: 140 }}>Category</th>
                  <th style={{ width: 80 }}>Unit</th>
                  <th style={{ width: 70 }}>Qty</th>
                  <th>Description</th>
                  <th style={{ width: 110 }}>Rate (₦)</th>
                  <th style={{ width: 120 }}>Amount (₦)</th>
                  <th style={{ width: 140 }}>Comment</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {form.line_items.map((li, idx) => (
                  <tr key={idx}>
                    <td className="pr-sn">{idx + 1}</td>
                    <td>
                      <select value={li.category} onChange={(e) => updateLineItem(idx, 'category', e.target.value)}>
                        <option value="">—</option>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td><input type="text" value={li.unit} onChange={(e) => updateLineItem(idx, 'unit', e.target.value)} placeholder="e.g. Pcs" /></td>
                    <td><input type="number" value={li.quantity} onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)} min="0" /></td>
                    <td><input type="text" value={li.description} onChange={(e) => updateLineItem(idx, 'description', e.target.value)} placeholder="Item description" /></td>
                    <td><input type="number" value={li.rate} onChange={(e) => updateLineItem(idx, 'rate', e.target.value)} min="0" step="0.01" /></td>
                    <td className="pr-computed">₦{lineAmount(li).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td><input type="text" value={li.comment} onChange={(e) => updateLineItem(idx, 'comment', e.target.value)} placeholder="Optional" /></td>
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
                  <td className="pr-computed" style={{ fontWeight: 700 }}>₦{grandTotal.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
            <button type="button" className="pr-add-row" onClick={addLineItem}><PlusCircle size={14} /> Add Row</button>
          </div>

          {/* ── Actions ── */}
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={() => navigate('/procurement/boq')}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>{submitting ? 'Saving…' : 'Submit BOQ'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
