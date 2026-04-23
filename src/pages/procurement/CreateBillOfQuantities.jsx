import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, PlusCircle, X, AlertCircle, User, ChevronDown } from 'lucide-react'
import { boqApi } from '../../services/procurement'
import { projectsApi, budgetCategoriesApi } from '../../services/projects'
import { departmentsApi, employeesApi } from '../../services/hr'
import { extractItems } from '../../utils/apiHelpers'
import { useAuth } from '../../contexts/AuthContext'

function employeePosition(emp) {
  return emp?.position || emp?.designation?.title || (typeof emp?.designation === 'string' ? emp.designation : '') || ''
}

/* Searchable employee picker — filters by name/email/position as the user types.
   Falls back to free-text entry so names outside the HR list can still be used. */
function EmployeePicker({ employees, value, onSelect, onTextChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value || '')
  const wrapperRef = useRef(null)

  useEffect(() => {
    queueMicrotask(() => setQuery(value || ''))
  }, [value])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase()
    const list = employees || []
    if (!q) return list.slice(0, 50)
    return list.filter((e) => {
      const hay = `${e.name || ''} ${e.email || ''} ${employeePosition(e)}`.toLowerCase()
      return hay.includes(q)
    }).slice(0, 50)
  }, [employees, query])

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          placeholder={placeholder || 'Search employee by name...'}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            if (onTextChange) onTextChange(e.target.value)
          }}
          style={{ paddingRight: 28 }}
        />
        <ChevronDown
          size={14}
          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
        />
      </div>
      {open && filtered.length > 0 && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, zIndex: 20,
            background: 'var(--bg-primary, #fff)', border: '1px solid var(--border, #e5e7eb)',
            borderRadius: 6, boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
            maxHeight: 240, overflowY: 'auto',
          }}
        >
          {filtered.map((emp) => (
            <button
              type="button"
              key={emp.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onSelect(emp)
                setQuery(emp.name || '')
                setOpen(false)
              }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px',
                background: 'transparent', border: 'none', borderBottom: '1px solid var(--border, #f1f5f9)',
                cursor: 'pointer', fontSize: 13,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary, #f8fafc)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>{emp.name || '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)' }}>
                {employeePosition(emp) || '—'}{emp.email ? ` · ${emp.email}` : ''}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const EMPTY_LINE_ITEM = {
  section: '', unit: '', quantity: '', description: '', unit_rate: '', comment: '',
}

const EMPTY_SIGNOFF_MS = { name: '', position: '', email: '', signature: '', date: '' }

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
    items: [{ ...EMPTY_LINE_ITEM }],
  }
}

export default function CreateBillOfQuantities() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const { user } = useAuth()

  const [form, setForm] = useState(buildInitialForm)
  const [projects, setProjects] = useState([])
  const [departments, setDepartments] = useState([])
  const [categories, setCategories] = useState([])
  const [employees, setEmployees] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [loadingEdit, setLoadingEdit] = useState(isEdit)

  /* Fetch dropdown data */
  useEffect(() => {
    projectsApi.list({ per_page: 0 }).then((res) => setProjects(extractItems(res))).catch(() => {})
    departmentsApi.list({ per_page: 0 }).then((res) => setDepartments(extractItems(res))).catch(() => {})
    budgetCategoriesApi.list({ status: 'active', per_page: 0, sort_by: 'sort_order', sort_dir: 'asc' })
      .then((res) => setCategories(extractItems(res))).catch(() => {})
    employeesApi.list({ status: 'active', per_page: 0 })
      .then((res) => setEmployees(extractItems(res))).catch(() => {})
  }, [])

  /* Auto-fill fields from the logged-in user (new mode only) */
  useEffect(() => {
    if (isEdit || !user) return
    queueMicrotask(() => {
      setForm((p) => ({
        ...p,
        prepared_by: p.prepared_by || user.name || '',
      }))
    })
  }, [user, isEdit])

  /* Auto-select the user's department once departments have loaded (new mode only) */
  useEffect(() => {
    if (isEdit || !user?.department || !departments.length) return
    const match = departments.find((d) => d.name === user.department)
    if (!match) return
    queueMicrotask(() => {
      setForm((p) => (p.department_id ? p : { ...p, department_id: match.id }))
    })
  }, [user, departments, isEdit])

  /* Load existing BOQ for edit mode */
  useEffect(() => {
    if (!isEdit) return
    boqApi.get(id)
      .then((res) => {
        const boq = res?.data?.boq || res?.data || res
        const signoffs = boq.signoffs || []
        const ms1 = signoffs.find((s) => s.type === 'market_survey' && !signoffs.slice(0, signoffs.indexOf(s)).some((p) => p.type === 'market_survey')) || {}
        const ms2 = signoffs.filter((s) => s.type === 'market_survey')[1] || {}

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

  /* When an employee is picked in a signoff section, fill name/position/email together. */
  const handleSignoffEmployeePick = useCallback((section, emp) => {
    setForm((p) => ({
      ...p,
      [section]: {
        ...p[section],
        name: emp.name || '',
        position: employeePosition(emp),
        email: emp.email || '',
      },
    }))
  }, [])

  /* Signoff block renderer */
  function renderMarketSurvey(label, which) {
    return (
      <div className="pr-signoff-block" key={which}>
        <h4 className="pr-signoff-title">{label}</h4>
        <div className="hr-form-row">
          <div className="hr-form-field">
            <label>Staff Name</label>
            <EmployeePicker
              employees={employees}
              value={form[which].name}
              onSelect={(emp) => handleSignoffEmployeePick(which, emp)}
              onTextChange={(v) => updateSignoff(which, 'name', v)}
              placeholder="Search employee by name..."
            />
          </div>
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
              <select value={form.category} onChange={(e) => updateField('category', e.target.value)}>
                <option value="">Select category...</option>
                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                {form.category && !categories.some((c) => c.name === form.category) && (
                  <option value={form.category}>{form.category}</option>
                )}
              </select>
            </div>
            <div className="hr-form-field">
              <label>PR Reference</label>
              <input type="text" value={form.pr_reference} onChange={(e) => updateField('pr_reference', e.target.value)} placeholder="e.g. PR-2025-001" />
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Prepared By</label>
              <div className="pr-requester-field">
                <User size={14} />
                {form.prepared_by || user?.name || '—'}
              </div>
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

          {/* Budget Holder Check is captured automatically when the BOQ is approved. */}
          <p className="hr-form-section-title">Budget Holder Check</p>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-muted)' }}>
            The Budget Holder sign-off is captured automatically when the BOQ is approved from the Pending Approvals page by a manager or admin (typically the linked project&apos;s manager).
          </p>

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
