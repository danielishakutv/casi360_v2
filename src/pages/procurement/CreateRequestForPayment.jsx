import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, PlusCircle, X, AlertCircle } from 'lucide-react'
import { rfpApi } from '../../services/procurement'
import { projectsApi } from '../../services/projects'
import { extractItems } from '../../utils/apiHelpers'

/* ─── Constants ─── */
const PAYMENT_MODES = ['Bank Transfer', 'Cash', 'Cheque']

const SUPPORTING_DOCS = [
  'Purchase Requisition',
  'Purchase Order',
  'Goods Received Note',
  'Invoice',
  'Receipt',
  'Contract/FA/RFQ',
]

const CURRENCY_OPTIONS = [
  { code: 'NGN', symbol: '₦', label: 'NGN — Nigerian Naira' },
  { code: 'USD', symbol: '$', label: 'USD — US Dollar' },
]



const BUDGET_LINES = [
  'Staff Costs', 'Travel & Transport', 'Equipment & Supplies',
  'Office Costs', 'Training & Capacity Building', 'Communication',
  'Construction & Renovation', 'Monitoring & Evaluation', 'Other Direct Costs',
]

const DEPARTMENTS = [
  'Procurement', 'Finance', 'Administration', 'Operations',
  'Programs', 'Logistics', 'Human Resources', 'IT',
]

const EMPTY_LINE_ITEM = {
  description: '', project_code: '', budget_line: '',
  quantity: '', unit_cost: '', dept: '',
}

const EMPTY_SIGNOFF = { name: '', position: '', signature: '' }

const SALES_TAX_RATE = 0.05 // 5%

function todayStr() { return new Date().toISOString().slice(0, 10) }

function generateRFPNumber() {
  const yr = new Date().getFullYear()
  const seq = String(Math.floor(Math.random() * 900) + 100)
  return `RFP-${yr}-${seq}`
}

function buildInitialForm() {
  return {
    rfp_number: generateRFPNumber(),
    /* Header references */
    pr_nos: '',
    po_nos: '',
    grn_nos: '',
    rfp_date: todayStr(),
    payment_due_date: '',
    procurement_person: '',
    /* Payee details */
    payee_name: '',
    payee_bank_name: '',
    payee_account_no: '',
    payee_tin: '',
    payee_contact: '',
    payee_address: '',
    /* Supporting documents */
    supporting_docs: [],
    /* Payment info */
    payment_amount: '',
    amount_in_words: '',
    currency: 'NGN',
    mode_of_payment: 'Bank Transfer',
    /* Line items */
    line_items: [{ ...EMPTY_LINE_ITEM }],
    /* Approvals */
    requester: { ...EMPTY_SIGNOFF },
    finance: { ...EMPTY_SIGNOFF },
    authorizing_person: { ...EMPTY_SIGNOFF },
  }
}

export default function CreateRequestForPayment() {
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

  const toggleDoc = useCallback((doc) => {
    setForm((p) => {
      const docs = p.supporting_docs.includes(doc)
        ? p.supporting_docs.filter((d) => d !== doc)
        : [...p.supporting_docs, doc]
      return { ...p, supporting_docs: docs }
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

  const updateSignoff = useCallback((section, field, value) => {
    setForm((p) => ({ ...p, [section]: { ...p[section], [field]: value } }))
  }, [])

  /* ─── Totals ─── */
  const lineAmount = useCallback((li) => (Number(li.quantity) || 0) * (Number(li.unit_cost) || 0), [])
  const subtotal = useMemo(() => form.line_items.reduce((s, li) => s + lineAmount(li), 0), [form.line_items, lineAmount])
  const salesTax = subtotal * SALES_TAX_RATE
  const grandTotal = subtotal + salesTax
  const currencyInfo = useMemo(() => CURRENCY_OPTIONS.find((c) => c.code === form.currency) || CURRENCY_OPTIONS[0], [form.currency])
  const sym = currencyInfo.symbol
  const fmt = (n) => sym + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    try {
      const payload = {
        rfp_date: form.rfp_date,
        payment_due_date: form.payment_due_date,
        pr_nos: form.pr_nos || undefined,
        po_nos: form.po_nos || undefined,
        grn_nos: form.grn_nos || undefined,
        procurement_person: form.procurement_person || undefined,
        payee_name: form.payee_name,
        payee_bank_name: form.payee_bank_name,
        payee_account_no: form.payee_account_no,
        payee_tin: form.payee_tin || undefined,
        payee_contact: form.payee_contact || undefined,
        payee_address: form.payee_address || undefined,
        supporting_docs: form.supporting_docs,
        payment_amount: Number(form.payment_amount) || 0,
        amount_in_words: form.amount_in_words || undefined,
        currency: form.currency,
        mode_of_payment: form.mode_of_payment,
        items: form.line_items.map((li) => ({
          description: li.description,
          project_code: li.project_code || undefined,
          budget_line: li.budget_line || undefined,
          quantity: Number(li.quantity) || 0,
          unit_cost: Number(li.unit_cost) || 0,
          dept: li.dept || undefined,
        })),
        signoffs: [
          { type: 'Requester', name: form.requester.name, position: form.requester.position, date: todayStr(), signature: form.requester.signature },
          { type: 'Finance', name: form.finance.name, position: form.finance.position, date: todayStr(), signature: form.finance.signature },
          { type: 'Authorizing Person', name: form.authorizing_person.name, position: form.authorizing_person.position, date: todayStr(), signature: form.authorizing_person.signature },
        ],
      }
      await rfpApi.create(payload)
      navigate('/procurement/rfp')
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to create payment request')
    } finally {
      setSubmitting(false)
    }
  }

  /* ─── Signoff block (render function, not component) ─── */
  function renderSignoff(label, section) {
    return (
      <div className="pr-signoff-block" key={section}>
        <h4 className="pr-signoff-title">{label}</h4>
        <div className="hr-form-row">
          <div className="hr-form-field"><label>Name</label><input type="text" value={form[section].name} onChange={(e) => updateSignoff(section, 'name', e.target.value)} placeholder="Full name" /></div>
          <div className="hr-form-field"><label>Position</label><input type="text" value={form[section].position} onChange={(e) => updateSignoff(section, 'position', e.target.value)} placeholder="Position / title" /></div>
        </div>
        <div className="hr-form-field" style={{ maxWidth: 400 }}>
          <label>Signature</label>
          <input type="text" value={form[section].signature} onChange={(e) => updateSignoff(section, 'signature', e.target.value)} placeholder="Type name as signature" />
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in">
      {/* Page header */}
      <div className="pr-page-header">
        <button type="button" className="hr-btn-secondary" onClick={() => navigate('/procurement/rfp')}>
          <ArrowLeft size={16} /> Back to Payment Requests
        </button>
        <h2 className="pr-page-title">New Request for Payment</h2>
      </div>

      <div className="card">
        {formError && <div className="hr-error-banner" style={{ margin: '0 0 16px', display: 'flex', gap: 8, alignItems: 'center', color: 'var(--danger)' }}><AlertCircle size={16} /> {formError}</div>}
        <form onSubmit={handleSubmit} className="hr-form pr-form">

          {/* ── Header References ── */}
          <p className="hr-form-section-title">Request for Payment</p>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>RFP Number</label>
              <input type="text" value={form.rfp_number} readOnly className="pr-readonly" />
            </div>
            <div className="hr-form-field">
              <label>RFP Date</label>
              <input type="date" value={form.rfp_date} onChange={(e) => updateField('rfp_date', e.target.value)} />
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>PR No(s)</label>
              <input type="text" value={form.pr_nos} onChange={(e) => updateField('pr_nos', e.target.value)} placeholder="e.g. PR-2026-001, PR-2026-002" />
            </div>
            <div className="hr-form-field">
              <label>PO No(s)</label>
              <input type="text" value={form.po_nos} onChange={(e) => updateField('po_nos', e.target.value)} placeholder="e.g. PO-2026-001" />
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>GRN No(s)</label>
              <input type="text" value={form.grn_nos} onChange={(e) => updateField('grn_nos', e.target.value)} placeholder="e.g. GRN-2026-001" />
            </div>
            <div className="hr-form-field">
              <label>Payment Due Date *</label>
              <input type="date" value={form.payment_due_date} onChange={(e) => updateField('payment_due_date', e.target.value)} required />
            </div>
          </div>

          <div className="hr-form-field" style={{ maxWidth: 400 }}>
            <label>Procurement Person</label>
            <input type="text" value={form.procurement_person} onChange={(e) => updateField('procurement_person', e.target.value)} placeholder="Procurement officer name" />
          </div>

          {/* ── Payee Details + Supporting Docs side by side ── */}
          <div className="hr-form-row" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <p className="hr-form-section-title">Payee Details</p>

              <div className="hr-form-field">
                <label>Name *</label>
                <input type="text" value={form.payee_name} onChange={(e) => updateField('payee_name', e.target.value)} placeholder="Payee / supplier name" required />
              </div>
              <div className="hr-form-field">
                <label>Bank Name *</label>
                <input type="text" value={form.payee_bank_name} onChange={(e) => updateField('payee_bank_name', e.target.value)} placeholder="Bank name" required />
              </div>
              <div className="hr-form-field">
                <label>Account No *</label>
                <input type="text" value={form.payee_account_no} onChange={(e) => updateField('payee_account_no', e.target.value)} placeholder="Bank account number" required />
              </div>
              <div className="hr-form-field">
                <label>TIN</label>
                <input type="text" value={form.payee_tin} onChange={(e) => updateField('payee_tin', e.target.value)} placeholder="Tax Identification Number" />
              </div>
              <div className="hr-form-field">
                <label>Contact</label>
                <input type="text" value={form.payee_contact} onChange={(e) => updateField('payee_contact', e.target.value)} placeholder="Phone / email" />
              </div>
              <div className="hr-form-field">
                <label>Address</label>
                <input type="text" value={form.payee_address} onChange={(e) => updateField('payee_address', e.target.value)} placeholder="Payee address" />
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <p className="hr-form-section-title">Supporting Documents (mandatory)</p>

              <div className="rfp-docs-checklist">
                {SUPPORTING_DOCS.map((doc) => (
                  <label key={doc} className="rfq-checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.supporting_docs.includes(doc)}
                      onChange={() => toggleDoc(doc)}
                    />
                    <span>{doc}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ── Payment Info ── */}
          <p className="hr-form-section-title">Payment Information</p>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Payment Amount *</label>
              <input type="number" value={form.payment_amount} onChange={(e) => updateField('payment_amount', e.target.value)} placeholder="0.00" min="0" step="0.01" required />
            </div>
            <div className="hr-form-field">
              <label>Amount in Words</label>
              <input type="text" value={form.amount_in_words} onChange={(e) => updateField('amount_in_words', e.target.value)} placeholder="e.g. Five Hundred Thousand Naira Only" />
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Currency</label>
              <select value={form.currency} onChange={(e) => updateField('currency', e.target.value)}>
                {CURRENCY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
            <div className="hr-form-field">
              <label>Mode of Payment</label>
              <select value={form.mode_of_payment} onChange={(e) => updateField('mode_of_payment', e.target.value)}>
                {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* ── Itemized List (For supplier to fill in) ── */}
          <p className="hr-form-section-title">Itemized List</p>

          <div className="pr-line-items-wrapper">
            <table className="pr-line-items-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>S/N</th>
                  <th>Description of Goods / Services</th>
                  <th style={{ width: 110 }}>Project Code</th>
                  <th style={{ width: 110 }}>BL</th>
                  <th style={{ width: 70 }}>Qty</th>
                  <th style={{ width: 110 }}>Unit Cost</th>
                  <th style={{ width: 100 }}>Dept</th>
                  <th style={{ width: 120 }}>Amount</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {form.line_items.map((li, idx) => (
                  <tr key={idx}>
                    <td className="pr-sn">{idx + 1}</td>
                    <td><input type="text" value={li.description} onChange={(e) => updateLineItem(idx, 'description', e.target.value)} placeholder="Item description" /></td>
                    <td>
                      <select value={li.project_code} onChange={(e) => updateLineItem(idx, 'project_code', e.target.value)}>
                        <option value="">—</option>
                        {projects.map((p) => <option key={p.id} value={p.project_code || p.id}>{p.project_code || p.name}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={li.budget_line} onChange={(e) => updateLineItem(idx, 'budget_line', e.target.value)}>
                        <option value="">—</option>
                        {BUDGET_LINES.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </td>
                    <td><input type="number" value={li.quantity} onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)} min="0" /></td>
                    <td><input type="number" value={li.unit_cost} onChange={(e) => updateLineItem(idx, 'unit_cost', e.target.value)} min="0" step="0.01" /></td>
                    <td>
                      <select value={li.dept} onChange={(e) => updateLineItem(idx, 'dept', e.target.value)}>
                        <option value="">—</option>
                        {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </td>
                    <td className="pr-computed">{fmt(lineAmount(li))}</td>
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
                  <td colSpan={7} style={{ textAlign: 'right', fontWeight: 700 }}>Subtotal</td>
                  <td className="pr-computed" style={{ fontWeight: 700 }}>{fmt(subtotal)}</td>
                  <td></td>
                </tr>
                <tr className="pr-total-row">
                  <td colSpan={7} style={{ textAlign: 'right', fontWeight: 700 }}>Sales Tax (5%)</td>
                  <td className="pr-computed" style={{ fontWeight: 700 }}>{fmt(salesTax)}</td>
                  <td></td>
                </tr>
                <tr className="pr-total-row">
                  <td colSpan={7} style={{ textAlign: 'right', fontWeight: 700, fontSize: 15 }}>TOTAL</td>
                  <td className="pr-computed" style={{ fontWeight: 700, fontSize: 15 }}>{fmt(grandTotal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            <button type="button" className="pr-add-row" onClick={addLineItem}><PlusCircle size={14} /> Add Row</button>
          </div>

          {/* ── Approvals ── */}
          <p className="hr-form-section-title">Approval</p>

          <div className="pr-signoffs-grid">
            {renderSignoff('Requester', 'requester')}
            {renderSignoff('Finance', 'finance')}
            {renderSignoff('Authorizing Person', 'authorizing_person')}
          </div>

          {/* ── Actions ── */}
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={() => navigate('/procurement/rfp')}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit RFP'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
