import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, PlusCircle, X, AlertCircle } from 'lucide-react'
import { rfpApi, invoicesApi, purchaseRequestsApi, purchaseOrdersApi, grnApi } from '../../services/procurement'
import { projectsApi } from '../../services/projects'
import { employeesApi } from '../../services/hr'
import { extractItems } from '../../utils/apiHelpers'
import EmployeePicker from '../../components/EmployeePicker'
import SearchableMultiSelect from '../../components/SearchableMultiSelect'
import { useAuth } from '../../contexts/AuthContext'

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
    /* Header references — multi-selected document numbers */
    pr_references: [],
    po_references: [],
    grn_references: [],
    invoice_id: '',  // approved supplier invoice this RFP pays
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
    /* Procurement compliance (v2 §3.2 — mandatory before raising payment) */
    procurement_compliance: '',      // '' | 'followed' | 'waived'
    compliance_justification: '',
    compliance_document_url: '',
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
  const [searchParams] = useSearchParams()
  const incomingInvoiceId = searchParams.get('invoice_id')

  const { user } = useAuth()
  const [form, setForm] = useState(buildInitialForm)
  const [projects, setProjects] = useState([])
  const [employees, setEmployees] = useState([])
  const [approvedInvoices, setApprovedInvoices] = useState([])
  const [prOptions, setPrOptions] = useState([])
  const [poOptions, setPoOptions] = useState([])
  const [grnOptions, setGrnOptions] = useState([])
  /* Tracks the most-recently-applied invoice so we don't re-apply on every
     re-render. Stored separately so we can show a small "Auto-filled from
     invoice X" badge until the user changes the selection. */
  const [autofilledFromInvoiceId, setAutofilledFromInvoiceId] = useState(null)
  const [autofilledInvoiceLabel, setAutofilledInvoiceLabel] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    projectsApi.list({ per_page: 0 }).then((res) => setProjects(extractItems(res))).catch(() => {})
    employeesApi.list({ status: 'active', per_page: 0 }).then((res) => setEmployees(extractItems(res))).catch(() => {})
    // Only approved invoices can be paid by an RFP. Server enforces this
    // too — the UI just hides everything else so the picker is always valid.
    invoicesApi.list({ status: 'approved', per_page: 100, mine: 0 })
      .then((res) => setApprovedInvoices(extractItems(res)))
      .catch(() => {})

    // Existing PR / PO / GRN documents — for the searchable reference pickers
    // so the user links real documents instead of retyping numbers.
    purchaseRequestsApi.list({ per_page: 0 })
      .then((res) => setPrOptions(extractItems(res)
        .map((x) => ({ value: x.requisition_number, label: x.title ? `${x.requisition_number} — ${x.title}` : x.requisition_number }))
        .filter((o) => o.value)))
      .catch(() => {})
    purchaseOrdersApi.list({ per_page: 0 })
      .then((res) => setPoOptions(extractItems(res)
        .map((x) => ({ value: x.po_number, label: x.vendor ? `${x.po_number} — ${x.vendor}` : x.po_number }))
        .filter((o) => o.value)))
      .catch(() => {})
    grnApi.list({ per_page: 0 })
      .then((res) => setGrnOptions(extractItems(res)
        .map((x) => ({ value: x.grn_number, label: x.po_reference ? `${x.grn_number} — ${x.po_reference}` : x.grn_number }))
        .filter((o) => o.value)))
      .catch(() => {})
  }, [])

  /* Auto-fill the requester + procurement person with the signed-in user so
     they don't retype themselves (both stay editable). Only fills blanks. */
  useEffect(() => {
    if (!user) return
    setForm((p) => ({
      ...p,
      procurement_person: p.procurement_person || user.name || '',
      requester: {
        ...p.requester,
        name: p.requester.name || user.name || '',
        position: p.requester.position || user.position || user.designation || user.department || '',
      },
    }))
  }, [user])

  /* If we landed here from an invoice's "Pay" button, pre-select it. We
     wait until the invoice list has loaded so the dropdown actually
     contains the option (otherwise the value won't render). */
  useEffect(() => {
    if (!incomingInvoiceId) return
    if (form.invoice_id === incomingInvoiceId) return
    if (!approvedInvoices.some((inv) => inv.id === incomingInvoiceId)) return
    setForm((p) => ({ ...p, invoice_id: incomingInvoiceId }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingInvoiceId, approvedInvoices])

  /* Auto-fill from the selected invoice. Procurement enters invoice
     details once; the RFP that pays it inherits everything we can
     reasonably derive (amount, currency, payee, due date, and the
     PR/PO/GRN reference numbers from the chain). Empty / not-yet-typed
     fields are filled; user-edited fields are NOT overwritten silently
     so anything they tweaked stays put. The autofill banner shows which
     invoice the form is currently inheriting from. */
  useEffect(() => {
    if (!form.invoice_id) {
      // User cleared the picker — drop the badge but leave their typed values alone.
      setAutofilledFromInvoiceId(null)
      setAutofilledInvoiceLabel(null)
      return
    }
    if (form.invoice_id === autofilledFromInvoiceId) return  // already applied

    let cancelled = false
    invoicesApi.get(form.invoice_id)
      .then((res) => {
        if (cancelled) return
        const invoice = res?.data?.invoice
        if (!invoice) return
        const chain = invoice.chain || {}

        const addRef = (arr, num) => (num && !arr.includes(num)) ? [...arr, num] : arr
        setForm((p) => ({
          ...p,
          payment_amount: p.payment_amount || (invoice.amount != null ? String(invoice.amount) : p.payment_amount),
          currency:       p.currency       || invoice.currency       || 'NGN',
          payment_due_date: p.payment_due_date || invoice.due_date   || '',
          payee_name:     p.payee_name     || invoice.vendor_name    || '',
          pr_references:  addRef(p.pr_references, chain.pr?.number),
          po_references:  addRef(p.po_references, chain.po?.number || invoice.po_number),
          grn_references: addRef(p.grn_references, chain.grn?.number),
        }))
        setAutofilledFromInvoiceId(invoice.id)
        setAutofilledInvoiceLabel(invoice.invoice_number)
      })
      .catch(() => { /* leave form alone if fetch fails */ })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.invoice_id])

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
    setFormError('')

    // §3.2 compliance gate — also enforced server-side. Block before we even
    // flip into the submitting state so the button doesn't flicker.
    if (!form.procurement_compliance) {
      setFormError('Please complete the Procurement Compliance checklist before submitting.')
      return
    }
    if (form.procurement_compliance === 'waived'
        && (!form.compliance_justification.trim() || !form.compliance_document_url.trim())) {
      setFormError('A justification and a document link/reference are required when the procurement process is waived.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        rfp_date: form.rfp_date,
        payment_due_date: form.payment_due_date,
        pr_references: form.pr_references,
        po_references: form.po_references,
        grn_references: form.grn_references,
        invoice_id: form.invoice_id || undefined,
        procurement_person: form.procurement_person || undefined,
        payee_name: form.payee_name,
        payee_bank_name: form.payee_bank_name,
        payee_account_no: form.payee_account_no,
        payee_tin: form.payee_tin || undefined,
        payee_contact: form.payee_contact || undefined,
        payee_address: form.payee_address || undefined,
        supporting_docs: form.supporting_docs,
        procurement_compliance: form.procurement_compliance,
        compliance_justification: form.procurement_compliance === 'waived' ? form.compliance_justification : undefined,
        compliance_document_url: form.procurement_compliance === 'waived' ? form.compliance_document_url : undefined,
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
          <div className="hr-form-field">
            <label>Name</label>
            <EmployeePicker
              employees={employees}
              value={form[section].name}
              onSelect={(emp) => setForm((p) => ({ ...p, [section]: { ...p[section], name: emp.name || '', position: emp.position || p[section].position } }))}
              onTextChange={(text) => updateSignoff(section, 'name', text)}
              placeholder="Search staff by name…"
            />
          </div>
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
              <SearchableMultiSelect
                options={prOptions}
                selected={form.pr_references}
                onChange={(v) => updateField('pr_references', v)}
                placeholder="Search purchase requests…"
                emptyHint="No purchase requests found."
              />
            </div>
            <div className="hr-form-field">
              <label>PO No(s)</label>
              <SearchableMultiSelect
                options={poOptions}
                selected={form.po_references}
                onChange={(v) => updateField('po_references', v)}
                placeholder="Search purchase orders…"
                emptyHint="No purchase orders found."
              />
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>GRN No(s)</label>
              <SearchableMultiSelect
                options={grnOptions}
                selected={form.grn_references}
                onChange={(v) => updateField('grn_references', v)}
                placeholder="Search goods received notes…"
                emptyHint="No goods received notes found."
              />
            </div>
            <div className="hr-form-field">
              <label>Payment Due Date *</label>
              <input type="date" value={form.payment_due_date} onChange={(e) => updateField('payment_due_date', e.target.value)} required />
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field" style={{ gridColumn: '1 / -1' }}>
              <label>
                Approved Supplier Invoice
                {' '}
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>
                  · pays against this invoice
                </span>
              </label>
              <select
                value={form.invoice_id}
                onChange={(e) => updateField('invoice_id', e.target.value)}
              >
                <option value="">{approvedInvoices.length === 0 ? 'No approved invoices yet — record + approve one first' : 'Select an approved invoice (optional)'}</option>
                {approvedInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} — {inv.vendor_name || 'No vendor'} · {inv.currency || 'NGN'} {Number(inv.amount).toLocaleString()}
                    {inv.po_number ? ` · PO ${inv.po_number}` : ''}
                  </option>
                ))}
              </select>
              {autofilledInvoiceLabel && (
                <p style={{
                  marginTop: 6,
                  fontSize: 11.5,
                  color: 'var(--primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--primary-50)',
                  border: '1px solid var(--primary-100)',
                  borderRadius: 999,
                  padding: '3px 10px',
                  alignSelf: 'flex-start',
                }}>
                  ✨ Amount, currency, payee, dates, and reference numbers auto-filled from <strong>{autofilledInvoiceLabel}</strong>. Edit any field to override.
                </p>
              )}
            </div>
          </div>

          <div className="hr-form-field" style={{ maxWidth: 400 }}>
            <label>Procurement Person</label>
            <EmployeePicker
              employees={employees}
              value={form.procurement_person}
              onSelect={(emp) => updateField('procurement_person', emp.name || '')}
              onTextChange={(text) => updateField('procurement_person', text)}
              placeholder="Search staff by name…"
            />
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

          {/* ── Procurement Compliance (v2 §3.2 — mandatory before raising payment) ── */}
          <p className="hr-form-section-title">Procurement Compliance (mandatory)</p>
          <p style={{ margin: '-4px 0 10px', fontSize: 12.5, color: 'var(--text-muted)' }}>
            Confirm the procurement process before this payment request can be raised.
          </p>

          <div className="rfp-docs-checklist">
            <label className="rfq-checkbox-label">
              <input
                type="radio"
                name="procurement_compliance"
                checked={form.procurement_compliance === 'followed'}
                onChange={() => updateField('procurement_compliance', 'followed')}
              />
              <span>All procurement procedures have been duly followed</span>
            </label>
            <label className="rfq-checkbox-label">
              <input
                type="radio"
                name="procurement_compliance"
                checked={form.procurement_compliance === 'waived'}
                onChange={() => updateField('procurement_compliance', 'waived')}
              />
              <span>Procurement process waived — justification required</span>
            </label>
          </div>

          {form.procurement_compliance === 'waived' && (
            <div className="hr-form-row" style={{ alignItems: 'flex-start', marginTop: 10 }}>
              <div className="hr-form-field" style={{ flex: 1 }}>
                <label>Waiver Justification *</label>
                <textarea
                  value={form.compliance_justification}
                  onChange={(e) => updateField('compliance_justification', e.target.value)}
                  placeholder="Explain why the standard procurement process was waived"
                  rows={3}
                  required
                />
              </div>
              <div className="hr-form-field" style={{ flex: 1 }}>
                <label>Justification Document Link / Reference *</label>
                <input
                  type="text"
                  value={form.compliance_document_url}
                  onChange={(e) => updateField('compliance_document_url', e.target.value)}
                  placeholder="Paste a link (Drive/SharePoint) or document reference"
                  required
                />
              </div>
            </div>
          )}

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
