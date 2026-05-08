import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, PlusCircle, X, AlertCircle } from 'lucide-react'
import { rfqApi, purchaseRequestsApi, vendorsApi } from '../../services/procurement'
import { projectsApi } from '../../services/projects'
import { usersApi } from '../../services/api'
import { extractItems } from '../../utils/apiHelpers'

/* ─── Constants ─── */
const REQUEST_TYPES = ['Goods', 'Works', 'Services']

// Users in these departments (or admin / super_admin) can sign off the
// RFQ "Received By" block — procurement and logistics staff plus the
// admin tier who may stand in for the Logistics Officer.
const RECEIVED_BY_DEPARTMENTS = ['Procurement', 'Logistics']
const RECEIVED_BY_ROLES = ['admin', 'super_admin']

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
    /* Optional source PR (must be approved). When set, line items are
       pulled from the PR — the RFQ is asking a vendor to quote for an
       already-approved request. */
    pr_reference: '',
    pr_id: '',
    /* Supplier header */
    supplier_id: '',
    supplier_name: '',
    supplier_address: '',
    date: todayStr(),
    company_rep: '',
    contact: '',
    /* Request type */
    request_type: [],          // multi-select: Goods / Works / Services
    /* For — exclusive: an RFQ targets either a Project or a Structure. */
    for_type: 'project',       // 'project' | 'structure'
    structure: '',
    project: '',
    /* Currency */
    currency: 'NGN',
    /* Itemized list */
    line_items: [{ ...EMPTY_LINE_ITEM }],
    /* Delivery */
    delivery_location: '',
    delivery_duration: '',
    /* Received-by sign-off — date defaults to today since this form is
       filled at receipt time. Name stays blank so the user has to pick. */
    received_by_name: '',
    received_by_date: todayStr(),
    received_by_signature: '',
    company_stamp: '',
  }
}

export default function CreateRequestForQuotation() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const incomingPrId = searchParams.get('pr_id')
  const [form, setForm] = useState(buildInitialForm)
  const [projects, setProjects] = useState([])
  const [approvedPRs, setApprovedPRs] = useState([])
  const [vendors, setVendors] = useState([])
  const [receivedByUsers, setReceivedByUsers] = useState([])
  const [projectTeamMembers, setProjectTeamMembers] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  /* Pre-fill pr_reference when arriving from a PR's "Create RFQ" button.
     We wait for the approved-PR list to load so the picker can render
     the matching <option>; if the PR isn't in the list we fetch it
     directly so the link still works. */
  useEffect(() => {
    if (!incomingPrId) return
    if (form.pr_reference) return
    const match = approvedPRs.find((pr) => pr.id === incomingPrId)
    if (match) {
      handlePRSelect(match.requisition_number || match.id, /* skipConfirm */ true)
      return
    }
    if (approvedPRs.length === 0) return // still loading
    purchaseRequestsApi.get(incomingPrId)
      .then((res) => {
        const pr = res?.data?.requisition || res?.data?.data || res?.data
        if (pr?.requisition_number) {
          handlePRSelect(pr.requisition_number, /* skipConfirm */ true)
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingPrId, approvedPRs])

  useEffect(() => {
    projectsApi.list({ per_page: 0 }).then((res) => setProjects(extractItems(res))).catch(() => {})

    // Source PR list is gated to approved-only — an RFQ asks vendors to
    // quote for a request that has already been authorised, not for
    // something still in review.
    purchaseRequestsApi.list({ status: 'approved', per_page: 0 })
      .then((res) => setApprovedPRs(extractItems(res)))
      .catch(() => {})

    vendorsApi.list({ per_page: 0 })
      .then((res) => setVendors(extractItems(res)))
      .catch(() => {})

    // Build the "Received By" candidate list: every active user whose
    // department is Procurement or Logistics, plus every active admin
    // / super_admin. Single per_page=100 fetch then filtered in-memory
    // so we don't fan out to four endpoints.
    usersApi.list({ per_page: 100, status: 'active' })
      .then((res) => {
        const data = res?.data || res
        const list = data?.users || extractItems(res) || []
        const eligible = list.filter((u) => (
          u.status !== 'inactive' && (
            RECEIVED_BY_ROLES.includes(u.role) ||
            RECEIVED_BY_DEPARTMENTS.includes(u.department)
          )
        ))
        setReceivedByUsers(eligible)
      })
      .catch(() => {})
  }, [])

  /* Whenever a project is picked (and the form's "for" type is project),
     pull that project's team members so they show up in the Received-By
     dropdown alongside procurement / logistics / admin users. Clears
     the team-member list when the project is unset or the form switches
     to Structure mode. */
  useEffect(() => {
    if (form.for_type !== 'project' || !form.project) {
      setProjectTeamMembers([])
      return
    }
    const proj = projects.find((p) => (p.project_code || p.id) === form.project)
    const projectId = proj?.id
    if (!projectId) {
      setProjectTeamMembers([])
      return
    }
    projectsApi.get(projectId)
      .then((res) => {
        const data = res?.data?.project || res?.data?.data || res?.data
        const members = data?.team_members || []
        setProjectTeamMembers(members)
      })
      .catch(() => setProjectTeamMembers([]))
  }, [form.for_type, form.project, projects])

  /* Helper used by the existing-line-items check below. A fresh form
     starts with one empty line item; treat that as "no work to lose". */
  function lineItemsHaveContent(items) {
    return (items || []).some((li) => (
      (li.item || '').trim() !== '' ||
      (li.description || '').trim() !== '' ||
      (li.unit || '').trim() !== '' ||
      String(li.quantity || '').trim() !== '' ||
      String(li.unit_cost || '').trim() !== ''
    ))
  }

  /* Picking a Source PR pre-fills the line items from that PR (the
     vendor is being asked to quote for an already-approved request)
     while leaving Cost per Unit blank so the vendor's price is what
     gets entered. If the form already has user-typed line items we
     ask before replacing — silent overwrite would be a pretty cruel
     way to lose work. The `skipConfirm` flag is used by the deep-link
     effect (?pr_id=…) so arriving from a PR doesn't trigger a prompt
     against the empty default form. */
  function handlePRSelect(prRefValue, skipConfirm = false) {
    if (!prRefValue) {
      setForm((p) => ({ ...p, pr_reference: '', pr_id: '' }))
      return
    }
    const pr = approvedPRs.find((x) => (x.requisition_number || x.id) === prRefValue)
    setForm((p) => ({ ...p, pr_reference: prRefValue, pr_id: pr?.id || '' }))

    // No PR detail to pull from — just record the reference.
    if (!pr?.id) return

    const replaceItems = (prItems) => {
      const mapped = (prItems || []).map((it) => ({
        item: it.item_name || it.title || '',
        description: it.description || '',
        unit: it.unit || '',
        quantity: it.quantity ?? '',
        unit_cost: '', // vendor quotes the price — never copy from PR
      }))
      setForm((p) => ({
        ...p,
        line_items: mapped.length > 0 ? mapped : [{ ...EMPTY_LINE_ITEM }],
      }))
    }

    purchaseRequestsApi.get(pr.id)
      .then((res) => {
        const data = res?.data?.requisition || res?.data?.data || res?.data || {}
        const items = data.items || []
        if (items.length === 0) return

        if (!skipConfirm && lineItemsHaveContent(form.line_items)) {
          // window.confirm is fine here — the form is small and modal
          // creep would dwarf the prompt.
          const ok = window.confirm(
            'This Purchase Request has its own line items. Replace the items currently on the form with them?'
          )
          if (!ok) return
        }
        replaceItems(items)
      })
      .catch(() => {})
  }

  /* When a vendor is picked from the dropdown, fill the address /
     company representative / contact fields so the procurement officer
     doesn't have to retype data we already have on file. Manual edits
     stay possible — the inputs remain editable. */
  function handleVendorSelect(vendorId) {
    const v = vendors.find((x) => x.id === vendorId)
    if (!v) {
      setForm((p) => ({
        ...p,
        supplier_id: '',
        supplier_name: '',
        supplier_address: '',
        company_rep: '',
        contact: '',
      }))
      return
    }
    setForm((p) => ({
      ...p,
      supplier_id: v.id,
      supplier_name: v.name || '',
      supplier_address: v.address || '',
      company_rep: v.contact_person || '',
      contact: v.phone || v.email || '',
    }))
  }

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

  /* Merged Received-By candidate list. Always includes procurement /
     logistics / admin / super_admin users; when the RFQ targets a
     project, project team members (any role) are added too. Deduped
     by email so a procurement officer who is also on the project team
     doesn't appear twice. */
  const receivedByCandidates = useMemo(() => {
    const merged = []
    const seenEmails = new Set()
    const seenNames  = new Set()

    const push = (entry) => {
      const emailKey = (entry.email || '').toLowerCase()
      const nameKey  = (entry.name  || '').toLowerCase()
      if (emailKey && seenEmails.has(emailKey)) return
      if (!emailKey && nameKey && seenNames.has(nameKey)) return
      if (emailKey) seenEmails.add(emailKey)
      if (nameKey)  seenNames.add(nameKey)
      merged.push(entry)
    }

    receivedByUsers.forEach((u) => push({
      id: `user-${u.id}`,
      name: u.name,
      email: u.email,
      role: (u.role || '').replace(/_/g, ' '),
      department: u.department || '',
      source: 'staff',
    }))

    if (form.for_type === 'project') {
      projectTeamMembers.forEach((m) => {
        const emp = m.employee || m
        push({
          id: `team-${m.id || emp?.id || ''}`,
          name: emp?.name || m.name,
          email: emp?.email || m.email,
          role: m.role || emp?.designation?.title || emp?.position || 'Team Member',
          department: emp?.department?.name || emp?.department || '',
          source: 'team',
        })
      })
    }

    return merged
  }, [receivedByUsers, projectTeamMembers, form.for_type])

  function buildPayload() {
    const signoffs = []
    if (form.received_by_name) {
      signoffs.push({ type: 'Logistics Officer', name: form.received_by_name, position: 'Logistics', date: form.received_by_date || todayStr(), signature: form.received_by_signature })
    }

    // An RFQ targets exactly one of Structure / Project. Send only the
    // field that matches the form's for_type so the API doesn't get
    // both populated.
    const isProject = form.for_type === 'project'

    return {
      title: form.supplier_name || 'RFQ',
      date: form.date,
      pr_reference: form.pr_reference || undefined,
      supplier_name: form.supplier_name,
      supplier_address: form.supplier_address,
      contact_person: form.company_rep,
      supplier_phone: form.contact,
      request_types: form.request_type,
      structure: !isProject ? (form.structure || undefined) : undefined,
      project_code: isProject ? (form.project || undefined) : undefined,
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
              <select value={form.pr_reference} onChange={(e) => handlePRSelect(e.target.value)}>
                <option value="">— None —</option>
                {approvedPRs.map((pr) => (
                  <option key={pr.id} value={pr.requisition_number || pr.id}>
                    {(pr.requisition_number || `PR-${pr.id}`)} — {pr.title || pr.description || 'Untitled'}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Picking a PR pulls its line items into the form below — vendor enters the prices.
              </span>
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Name of Supplier *</label>
              <select
                value={form.supplier_id}
                onChange={(e) => handleVendorSelect(e.target.value)}
                required
              >
                <option value="">Select a vendor…</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              {vendors.length === 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  No vendors yet — add one in Procurement → Vendors first.
                </span>
              )}
            </div>
            <div className="hr-form-field">
              <label>Address *</label>
              <input type="text" value={form.supplier_address} onChange={(e) => updateField('supplier_address', e.target.value)} placeholder="Auto-filled from vendor" required />
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Company Representative *</label>
              <input type="text" value={form.company_rep} onChange={(e) => updateField('company_rep', e.target.value)} placeholder="Auto-filled from vendor" required />
            </div>
            <div className="hr-form-field">
              <label>Contact *</label>
              <input type="text" value={form.contact} onChange={(e) => updateField('contact', e.target.value)} placeholder="Auto-filled from vendor" required />
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

          {/* ── For: Structure XOR Project ── */}
          <p className="hr-form-section-title">For</p>

          <div className="hr-form-row" style={{ marginBottom: 4 }}>
            <div className="hr-form-field" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 18 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>This RFQ is for:</span>
              <label className="rfq-checkbox-label" style={{ cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="for_type"
                  value="project"
                  checked={form.for_type === 'project'}
                  onChange={() => setForm((p) => ({ ...p, for_type: 'project', structure: '' }))}
                />
                <span>Project</span>
              </label>
              <label className="rfq-checkbox-label" style={{ cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="for_type"
                  value="structure"
                  checked={form.for_type === 'structure'}
                  onChange={() => setForm((p) => ({ ...p, for_type: 'structure', project: '' }))}
                />
                <span>Structure</span>
              </label>
            </div>
          </div>

          <div className="hr-form-row">
            {form.for_type === 'project' ? (
              <div className="hr-form-field">
                <label>Project *</label>
                <select value={form.project} onChange={(e) => updateField('project', e.target.value)} required>
                  <option value="">Select project…</option>
                  {projects.map((p) => <option key={p.id} value={p.project_code || p.id}>{p.project_code || p.id} — {p.name}</option>)}
                </select>
              </div>
            ) : (
              <div className="hr-form-field">
                <label>Structure *</label>
                <input
                  type="text"
                  value={form.structure}
                  onChange={(e) => updateField('structure', e.target.value)}
                  placeholder="e.g. Head Office, Field Office Maiduguri"
                  required
                />
              </div>
            )}
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
              <select value={form.received_by_name} onChange={(e) => updateField('received_by_name', e.target.value)}>
                <option value="">Select staff…</option>
                {receivedByCandidates.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                    {c.role ? ` — ${c.role}` : ''}
                    {c.department ? ` · ${c.department}` : ''}
                    {c.source === 'team' ? ' · Project Team' : ''}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                {form.for_type === 'project' && form.project
                  ? 'Procurement, Logistics, admins, and this project\'s team members.'
                  : 'Procurement, Logistics, admins and super admins only.'}
              </span>
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
