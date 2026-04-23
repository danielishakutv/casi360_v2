import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, PlusCircle, X, AlertCircle } from 'lucide-react'
import { boqApi } from '../../services/procurement'
import { projectsApi } from '../../services/projects'
import { departmentsApi } from '../../services/hr'
import { extractItems } from '../../utils/apiHelpers'

const EMPTY_LINE_ITEM = {
  section: '', unit: '', quantity: '', description: '', unit_rate: '', comment: '',
}

const EMPTY_SIGNOFF_MS = { name: '', position: '', email: '', signature: '', date: '' }
const EMPTY_SIGNOFF_BH = { name: '', position: '', email: '', signature: '', date: '', budget_available: '' }

function todayStr() { return new Date().toISOString().slice(0, 10) }

function buildInitialForm() {
  return {
    title: '',
    date: todayStr(),
    department_id: '',
    project_code: '',
    category: '',
    pr_reference: '',
    prepared_by: '',
    delivery_location: '',
    notes: '',
    market_survey_1: { ...EMPTY_SIGNOFF_MS },
    market_survey_2: { ...EMPTY_SIGNOFF_MS },
    budget_holder: { ...EMPTY_SIGNOFF_BH },
    items: [{ ...EMPTY_LINE_ITEM }],
  }
}

export default function CreateBillOfQuantities() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [form, setForm] = useState(buildInitialForm)
  const [projects, setProjects] = useState([])
  const [departments, setDepartments] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [loadingEdit, setLoadingEdit] = useState(isEdit)

  /* Fetch dropdown data */
  useEffect(() => {
    projectsApi.list({ per_page: 0 }).then((res) => setProjects(extractItems(res))).catch(() => {})
    departmentsApi.list({ per_page: 0 }).then((res) => setDepartments(extractItems(res))).catch(() => {})
  }, [])

  /* Load existing BOQ for edit mode */
  useEffect(() => {
    if (!isEdit) return
    boqApi.get(id)
      .then((res) => {
        const boq = res?.data?.boq || res?.data || res
        const signoffs = boq.signoffs || []
        const ms1 = signoffs.find((s) => s.type === 'market_survey' && !signoffs.slice(0, signoffs.indexOf(s)).some((p) => p.type === 'market_survey')) || {}
        const ms2 = signoffs.filter((s) => s.type === 'market_survey')[1] || {}
        const bh = signoffs.find((s) => s.type === 'budget_holder') || {}

        setForm({
          title: boq.title || '',
          date: boq.date || todayStr(),
          department_id: boq.department_id || '',
          project_code: boq.project_code || '',
          category: boq.category || '',
          pr_reference: boq.pr_reference || '',
          prepared_by: boq.prepared_by || '',
          delivery_location: boq.delivery_location || '',
          notes: boq.notes || '',
          market_survey_1: { name: ms1.name || '', position: ms1.position || '', email: ms1.email || '', signature: ms1.signature || '', date: ms1.date || '' },
          market_survey_2: { name: ms2.name || '', position: ms2.position || '', email: ms2.email || '', signature: ms2.signature || '', date: ms2.date || '' },
          budget_holder: { name: bh.name || '', position: bh.position || '', email: bh.email || '', signature: bh.signature || '', date: bh.date || '', budget_available: bh.budget_available || '' },
          items: (boq.items || []).length > 0
            ? boq.items.map((it) => ({ section: it.section || '', unit: it.unit || '', quantity: it.quantity || '', description: it.description || '', unit_rate: it.unit_rate || '', comment: it.comment || '' }))
            : [{ ...EMPTY_LINE_ITEM }],
        })
      })
      .catch((err) => setFormError(err.message || 'Failed to load BOQ'))
      .finally(() => setLoadingEdit(false))
  }, [id, isEdit])

  /* Form helpers */
  const updateField = useCallback((f, v) => setForm((p) => ({ ...p, [f]: v })), [])

  const updateSignoff = useCallback((section, field, value) => {
    setForm((p) => ({ ...p, [section]: { ...p[section], [field]: value } }))
  }, [])

  const updateLineItem = useCallback((idx, field, value) => {
    setForm((p) => {
      const items = p.items.map((li, i) => i === idx ? { ...li, [field]: value } : li)
      return { ...p, items }
    })
  }, [])

  const addLineItem = useCallback(() => {
    setForm((p) => ({ ...p, items: [...p.items, { ...EMPTY_LINE_ITEM }] }))
  }, [])

  const removeLineItem = useCallback((idx) => {
    setForm((p) => ({ ...p, items: p.items.length > 1 ? p.items.filter((_, i) => i !== idx) : p.items }))
  }, [])

  /* Line item totals */
  const lineAmount = useCallback((li) => (Number(li.quantity) || 0) * (Number(li.unit_rate) || 0), [])
  const grandTotal = useMemo(() => form.items.reduce((s, li) => s + lineAmount(li), 0), [form.items, lineAmount])

  function buildPayload() {
    const signoffs = []
    if (form.market_survey_1.name) signoffs.push({ type: 'market_survey', ...form.market_survey_1, date: form.market_survey_1.date || todayStr() })
    if (form.market_survey_2.name) signoffs.push({ type: 'market_survey', ...form.market_survey_2, date: form.market_survey_2.date || todayStr() })
    if (form.budget_holder.name) signoffs.push({ type: 'budget_holder', ...form.budget_holder, date: form.budget_holder.date || todayStr() })

    return {
      title: form.title,
      date: form.date,
      department_id: form.department_id || undefined,
      project_code: form.project_code || undefined,
      category: form.category || undefined,
      pr_reference: form.pr_reference || undefined,
      prepared_by: form.prepared_by || undefined,
      delivery_location: form.delivery_location || undefined,
      notes: form.notes || undefined,
      signoffs: signoffs.length ? signoffs : undefined,
      items: form.items
        .filter((li) => li.description)
        .map((li) => ({
          section: li.section || undefined,
          unit: li.unit || undefined,
          quantity: Number(li.quantity) || 1,
          description: li.description,
          unit_rate: Number(li.unit_rate) || 0,
          comment: li.comment || undefined,
        })),
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')

    const payload = buildPayload()
    const apiCall = isEdit ? boqApi.update(id, payload) : boqApi.create(payload)

    apiCall
      .then(() => navigate('/procurement/boq'))
      .catch((err) => setFormError(err.errors ? Object.values(err.errors).flat().join(', ') : err.message))
      .finally(() => setSubmitting(false))
  }

  async function handleSaveAndSubmit() {
    setSubmitting(true)
    setFormError('')
    try {
      const payload = buildPayload()
      let boqId = id
      if (isEdit) {
        await boqApi.update(id, payload)
      } else {
        const res = await boqApi.create(payload)
        const data = res?.data?.boq || res?.data || res
        boqId = data?.id
      }
      if (boqId) await boqApi.submit(boqId)
      navigate('/procurement/boq')
    } catch (err) {
      setFormError(err.errors ? Object.values(err.errors).flat().join(', ') : (err.message || 'Failed to submit BOQ'))
      setSubmitting(false)
    }
  }

  /* Signoff block renderer */
  function renderMarketSurvey(label, which) {
    return (
      <div className="pr-signoff-block" key={which}>
        <h4 className="pr-signoff-title">{label}</h4>
        <div className="hr-form-row">
          <div className="hr-form-field"><label>Staff Name</label><input type="text" value={form[which].name} onChange={(e) => updateSignoff(which, 'name', e.target.value)} placeholder="Full name" /></div>
          <div className="hr-form-field"><label>Staff Position</label><input type="text" value={form[which].position} onChange={(e) => updateSignoff(which, 'position', e.target.value)} placeholder="Position / title" /></div>
        </div>
        <div className="hr-form-row">
          <div className="hr-form-field"><label>Staff Email</label><input type="email" value={form[which].email} onChange={(e) => updateSignoff(which, 'email', e.target.value)} placeholder="email@example.com" /></div>
          <div className="hr-form-field"><label>Sign</label><input type="text" value={form[which].signature} onChange={(e) => updateSignoff(which, 'signature', e.target.value)} placeholder="Type name as signature" /></div>
        </div>
      </div>
    )
  }

  if (loadingEdit) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="auth-spinner large" /></div>
  }

  return (
    <div className="animate-in">
      <div className="pr-page-header">
        <button type="button" className="hr-btn-secondary" onClick={() => navigate('/procurement/boq')}>
          <ArrowLeft size={16} /> Back to Bill of Quantities
        </button>
        <h2 className="pr-page-title">{isEdit ? 'Edit Bill of Quantity' : 'New Bill of Quantity'}</h2>
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

          <p className="hr-form-section-title">BOQ Information</p>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Title *</label>
              <input type="text" value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="BOQ title" required />
            </div>
            <div className="hr-form-field">
              <label>BOQ Date</label>
              <input type="date" value={form.date} onChange={(e) => updateField('date', e.target.value)} />
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Department</label>
              <select value={form.department_id} onChange={(e) => updateField('department_id', e.target.value)}>
                <option value="">Select department...</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="hr-form-field">
              <label>Project</label>
              <select value={form.project_code} onChange={(e) => updateField('project_code', e.target.value)}>
                <option value="">Select project...</option>
                {projects.map((p) => <option key={p.id} value={p.project_code || p.id}>{p.project_code || p.id} — {p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Category</label>
              <input type="text" value={form.category} onChange={(e) => updateField('category', e.target.value)} placeholder="e.g. Construction Materials" />
            </div>
            <div className="hr-form-field">
              <label>PR Reference</label>
              <input type="text" value={form.pr_reference} onChange={(e) => updateField('pr_reference', e.target.value)} placeholder="e.g. PR-2025-001" />
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Prepared By</label>
              <input type="text" value={form.prepared_by} onChange={(e) => updateField('prepared_by', e.target.value)} placeholder="Staff name" />
            </div>
            <div className="hr-form-field">
              <label>Delivery Location</label>
              <input type="text" value={form.delivery_location} onChange={(e) => updateField('delivery_location', e.target.value)} placeholder="Delivery location" />
            </div>
          </div>

          <div className="hr-form-field">
            <label>Notes</label>
            <textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} placeholder="Any additional notes..." rows={2} />
          </div>

          {/* Market Survey By */}
          <p className="hr-form-section-title">Market Survey By</p>
          <div className="pr-signoffs-grid">
            {renderMarketSurvey('Staff 1', 'market_survey_1')}
            {renderMarketSurvey('Staff 2', 'market_survey_2')}
          </div>

          {/* Budget Holder Check */}
          <p className="hr-form-section-title">Budget Holder Check</p>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Staff Name</label><input type="text" value={form.budget_holder.name} onChange={(e) => updateSignoff('budget_holder', 'name', e.target.value)} placeholder="Full name" /></div>
            <div className="hr-form-field"><label>Staff Position</label><input type="text" value={form.budget_holder.position} onChange={(e) => updateSignoff('budget_holder', 'position', e.target.value)} placeholder="Position / title" /></div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Staff Email</label><input type="email" value={form.budget_holder.email} onChange={(e) => updateSignoff('budget_holder', 'email', e.target.value)} placeholder="email@example.com" /></div>
            <div className="hr-form-field"><label>Sign</label><input type="text" value={form.budget_holder.signature} onChange={(e) => updateSignoff('budget_holder', 'signature', e.target.value)} placeholder="Type name as signature" /></div>
          </div>
          <div className="hr-form-field" style={{ maxWidth: 300 }}>
            <label>Availability of Budget *</label>
            <select value={form.budget_holder.budget_available} onChange={(e) => updateSignoff('budget_holder', 'budget_available', e.target.value)}>
              <option value="">Select...</option>
              <option value="YES">Yes</option>
              <option value="NO">No</option>
            </select>
          </div>

          {/* Itemized List */}
          <p className="hr-form-section-title">Itemized List</p>

          <div className="pr-line-items-wrapper">
            <table className="pr-line-items-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>S/N</th>
                  <th style={{ width: 140 }}>Section</th>
                  <th>Description</th>
                  <th style={{ width: 80 }}>Unit</th>
                  <th style={{ width: 70 }}>Qty</th>
                  <th style={{ width: 110 }}>Unit Rate (₦)</th>
                  <th style={{ width: 120 }}>Amount (₦)</th>
                  <th style={{ width: 140 }}>Comment</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((li, idx) => (
                  <tr key={idx}>
                    <td className="pr-sn">{idx + 1}</td>
                    <td><input type="text" value={li.section} onChange={(e) => updateLineItem(idx, 'section', e.target.value)} placeholder="Section" /></td>
                    <td><input type="text" value={li.description} onChange={(e) => updateLineItem(idx, 'description', e.target.value)} placeholder="Item description" /></td>
                    <td><input type="text" value={li.unit} onChange={(e) => updateLineItem(idx, 'unit', e.target.value)} placeholder="e.g. Pcs" /></td>
                    <td><input type="number" value={li.quantity} onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)} min="0" /></td>
                    <td><input type="number" value={li.unit_rate} onChange={(e) => updateLineItem(idx, 'unit_rate', e.target.value)} min="0" step="0.01" /></td>
                    <td className="pr-computed">₦{lineAmount(li).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td><input type="text" value={li.comment} onChange={(e) => updateLineItem(idx, 'comment', e.target.value)} placeholder="Optional" /></td>
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
                  <td colSpan={6} style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL</td>
                  <td className="pr-computed" style={{ fontWeight: 700 }}>₦{grandTotal.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
            <button type="button" className="pr-add-row" onClick={addLineItem}><PlusCircle size={14} /> Add Row</button>
          </div>

          {/* Actions */}
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={() => navigate('/procurement/boq')}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>{submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Save as Draft'}</button>
            <button
              type="button"
              className="hr-btn-primary"
              style={{ background: 'var(--success, #16a34a)' }}
              disabled={submitting}
              onClick={handleSaveAndSubmit}
            >
              {submitting ? 'Submitting...' : isEdit ? 'Save & Submit for Approval' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
