import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, PlusCircle, X } from 'lucide-react'

/* ─── Constants ─── */
const PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'Cheque']

const DEMO_PROJECTS = [
  { id: 'PRJ-001', name: 'HQ Renovation Phase 2', code: 'PRJ-001' },
  { id: 'PRJ-002', name: 'Warehouse Security Upgrade', code: 'PRJ-002' },
  { id: 'PRJ-003', name: 'Power Infrastructure', code: 'PRJ-003' },
  { id: 'PRJ-004', name: 'Community Health Programme', code: 'PRJ-004' },
  { id: 'PRJ-005', name: 'Education Support Initiative', code: 'PRJ-005' },
]

const BUDGET_LINES = [
  'Staff Costs', 'Travel & Transport', 'Equipment & Supplies',
  'Office Costs', 'Training & Capacity Building', 'Communication',
  'Construction & Renovation', 'Monitoring & Evaluation', 'Other Direct Costs',
]

const CURRENCY_OPTIONS = [
  { code: 'NGN', symbol: '₦', label: 'NGN — Nigerian Naira', rate: 1 },
  { code: 'USD', symbol: '$', label: 'USD — US Dollar (₦1,500)', rate: 1500 },
  { code: 'EUR', symbol: '€', label: 'EUR — Euro (₦1,700)', rate: 1700 },
]

const EMPTY_LINE_ITEM = {
  pr_no: '', project_code: '', budget_line: '',
  description: '', unit: '', quantity: '', unit_price: '',
}

const EMPTY_SIGNOFF = { name: '', position: '', signature: '', date: '' }

function todayStr() { return new Date().toISOString().slice(0, 10) }

function generatePONumber() {
  const yr = new Date().getFullYear()
  const seq = String(Math.floor(Math.random() * 900) + 100)
  return `PO-${yr}-${seq}`
}

function buildInitialForm() {
  return {
    po_number: generatePONumber(),
    date: todayStr(),
    location: '',
    currency: 'NGN',
    /* Supplier */
    supplier_name: '',
    supplier_address: '',
    supplier_contact_person: '',
    supplier_telephone: '',
    /* Deliver To */
    deliver_name: '',
    deliver_address: '',
    deliver_position: '',
    deliver_contact: '',
    /* Payment & Delivery */
    payment_terms: [],
    delivery_terms: '',
    delivery_date: '',
    /* Line items */
    line_items: [{ ...EMPTY_LINE_ITEM }],
    remarks: '',
    sales_tax: '',
    delivery_charges: '',
    /* Sign-offs */
    prepared_by: { ...EMPTY_SIGNOFF },
    approved_by: { ...EMPTY_SIGNOFF },
    reviewed_by: { ...EMPTY_SIGNOFF },
    supplier_acceptance: { ...EMPTY_SIGNOFF },
  }
}

export default function CreatePurchaseOrder() {
  const navigate = useNavigate()
  const [form, setForm] = useState(buildInitialForm)

  /* ─── Form helpers ─── */
  const updateField = useCallback((f, v) => setForm((p) => ({ ...p, [f]: v })), [])

  const togglePaymentTerm = useCallback((term) => {
    setForm((p) => {
      const terms = p.payment_terms.includes(term)
        ? p.payment_terms.filter((t) => t !== term)
        : [...p.payment_terms, term]
      return { ...p, payment_terms: terms }
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
  const lineTotal = useCallback((li) => (Number(li.quantity) || 0) * (Number(li.unit_price) || 0), [])
  const subtotal = useMemo(() => form.line_items.reduce((s, li) => s + lineTotal(li), 0), [form.line_items, lineTotal])
  const salesTax = Number(form.sales_tax) || 0
  const deliveryCharges = Number(form.delivery_charges) || 0
  const grandTotal = subtotal + salesTax + deliveryCharges
  const currencyInfo = useMemo(() => CURRENCY_OPTIONS.find((c) => c.code === form.currency) || CURRENCY_OPTIONS[0], [form.currency])
  const sym = currencyInfo.symbol
  const fmt = (n) => sym + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  function handleSubmit(e) {
    e.preventDefault()
    // TODO: call API to create the PO
    navigate('/procurement/purchase-orders')
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
        <div className="hr-form-row">
          <div className="hr-form-field"><label>Signature</label><input type="text" value={form[section].signature} onChange={(e) => updateSignoff(section, 'signature', e.target.value)} placeholder="Type name as signature" /></div>
          <div className="hr-form-field"><label>Date</label><input type="date" value={form[section].date} onChange={(e) => updateSignoff(section, 'date', e.target.value)} /></div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in">
      {/* Page header */}
      <div className="pr-page-header">
        <button type="button" className="hr-btn-secondary" onClick={() => navigate('/procurement/purchase-orders')}>
          <ArrowLeft size={16} /> Back to Purchase Orders
        </button>
        <h2 className="pr-page-title">New Purchase Order</h2>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="hr-form pr-form">

          {/* ── PO Header ── */}
          <p className="hr-form-section-title">Purchase Order</p>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>PO Number</label>
              <input type="text" value={form.po_number} readOnly className="pr-readonly" />
            </div>
            <div className="hr-form-field">
              <label>Date</label>
              <input type="date" value={form.date} onChange={(e) => updateField('date', e.target.value)} />
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Location *</label>
              <input type="text" value={form.location} onChange={(e) => updateField('location', e.target.value)} placeholder="Office / location" required />
            </div>
            <div className="hr-form-field">
              <label>Currency</label>
              <select value={form.currency} onChange={(e) => updateField('currency', e.target.value)}>
                {CURRENCY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* ── Supplier ── */}
          <p className="hr-form-section-title">Supplier</p>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Name *</label>
              <input type="text" value={form.supplier_name} onChange={(e) => updateField('supplier_name', e.target.value)} placeholder="Supplier name" required />
            </div>
            <div className="hr-form-field">
              <label>Address *</label>
              <input type="text" value={form.supplier_address} onChange={(e) => updateField('supplier_address', e.target.value)} placeholder="Supplier address" required />
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Contact Person *</label>
              <input type="text" value={form.supplier_contact_person} onChange={(e) => updateField('supplier_contact_person', e.target.value)} placeholder="Contact person name" required />
            </div>
            <div className="hr-form-field">
              <label>Telephone *</label>
              <input type="text" value={form.supplier_telephone} onChange={(e) => updateField('supplier_telephone', e.target.value)} placeholder="Phone number" required />
            </div>
          </div>

          {/* ── Deliver To ── */}
          <p className="hr-form-section-title">Deliver To</p>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Name *</label>
              <input type="text" value={form.deliver_name} onChange={(e) => updateField('deliver_name', e.target.value)} placeholder="Recipient name" required />
            </div>
            <div className="hr-form-field">
              <label>Address *</label>
              <input type="text" value={form.deliver_address} onChange={(e) => updateField('deliver_address', e.target.value)} placeholder="Delivery address" required />
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Position</label>
              <input type="text" value={form.deliver_position} onChange={(e) => updateField('deliver_position', e.target.value)} placeholder="Position / title" />
            </div>
            <div className="hr-form-field">
              <label>Contact</label>
              <input type="text" value={form.deliver_contact} onChange={(e) => updateField('deliver_contact', e.target.value)} placeholder="Phone / email" />
            </div>
          </div>

          {/* ── Payment & Delivery Terms ── */}
          <p className="hr-form-section-title">Payment & Delivery Terms</p>

          <div className="hr-form-field">
            <label>Payment Terms</label>
            <div className="rfq-type-checkboxes">
              {PAYMENT_METHODS.map((m) => (
                <label key={m} className="rfq-checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.payment_terms.includes(m)}
                    onChange={() => togglePaymentTerm(m)}
                  />
                  <span>{m}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Delivery Terms</label>
              <textarea value={form.delivery_terms} onChange={(e) => updateField('delivery_terms', e.target.value)} placeholder="Enter delivery terms and conditions…" rows={3} />
            </div>
          </div>

          <div className="hr-form-field" style={{ maxWidth: 300 }}>
            <label>Delivery Date *</label>
            <input type="date" value={form.delivery_date} onChange={(e) => updateField('delivery_date', e.target.value)} required />
          </div>

          {/* ── Itemized List ── */}
          <p className="hr-form-section-title">Itemized List</p>

          <div className="pr-line-items-wrapper">
            <table className="pr-line-items-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>S/N</th>
                  <th style={{ width: 100 }}>PR No</th>
                  <th style={{ width: 110 }}>Project Code</th>
                  <th style={{ width: 110 }}>Budget Line</th>
                  <th>Items Description</th>
                  <th style={{ width: 80 }}>Unit</th>
                  <th style={{ width: 65 }}>QTY</th>
                  <th style={{ width: 110 }}>Unit Price</th>
                  <th style={{ width: 130 }}>Total Cost</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {form.line_items.map((li, idx) => (
                  <tr key={idx}>
                    <td className="pr-sn">{idx + 1}</td>
                    <td><input type="text" value={li.pr_no} onChange={(e) => updateLineItem(idx, 'pr_no', e.target.value)} placeholder="PR-…" /></td>
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
                    <td><input type="text" value={li.description} onChange={(e) => updateLineItem(idx, 'description', e.target.value)} placeholder="Item description" /></td>
                    <td><input type="text" value={li.unit} onChange={(e) => updateLineItem(idx, 'unit', e.target.value)} placeholder="e.g. Pcs" /></td>
                    <td><input type="number" value={li.quantity} onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)} min="0" /></td>
                    <td><input type="number" value={li.unit_price} onChange={(e) => updateLineItem(idx, 'unit_price', e.target.value)} min="0" step="0.01" /></td>
                    <td className="pr-computed">{fmt(lineTotal(li))}</td>
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
                  <td colSpan={8} style={{ textAlign: 'right', fontWeight: 700 }}>Subtotal</td>
                  <td className="pr-computed" style={{ fontWeight: 700 }}>{fmt(subtotal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            <button type="button" className="pr-add-row" onClick={addLineItem}><PlusCircle size={14} /> Add Row</button>
          </div>

          {/* Remarks */}
          <div className="hr-form-field">
            <label>Remarks</label>
            <textarea value={form.remarks} onChange={(e) => updateField('remarks', e.target.value)} placeholder="Remarks for the order…" rows={3} />
          </div>

          {/* Tax & charges */}
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Sales Tax (if applicable)</label>
              <input type="number" value={form.sales_tax} onChange={(e) => updateField('sales_tax', e.target.value)} min="0" step="0.01" placeholder="0.00" />
            </div>
            <div className="hr-form-field">
              <label>Delivery Charges (if applicable)</label>
              <input type="number" value={form.delivery_charges} onChange={(e) => updateField('delivery_charges', e.target.value)} min="0" step="0.01" placeholder="0.00" />
            </div>
          </div>

          <div className="pr-naira-equivalent" style={{ fontWeight: 700, fontSize: 15 }}>
            TOTAL: {fmt(grandTotal)}
          </div>

          {form.currency !== 'NGN' && (
            <div className="pr-naira-equivalent">
              Naira equivalent: <strong>₦{(grandTotal * currencyInfo.rate).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              <span className="pr-rate-note">({sym}1 = ₦{currencyInfo.rate.toLocaleString()})</span>
            </div>
          )}

          {/* ── Sign-offs ── */}
          <p className="hr-form-section-title">Signatures</p>

          <div className="pr-signoffs-grid">
            {renderSignoff('Prepared By', 'prepared_by')}
            {renderSignoff('Approved By', 'approved_by')}
            {renderSignoff('Reviewed By', 'reviewed_by')}
            {renderSignoff('Supplier Acceptance & Stamp', 'supplier_acceptance')}
          </div>

          {/* ── Actions ── */}
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={() => navigate('/procurement/purchase-orders')}>Cancel</button>
            <button type="submit" className="hr-btn-primary">Submit PO</button>
          </div>
        </form>
      </div>
    </div>
  )
}
