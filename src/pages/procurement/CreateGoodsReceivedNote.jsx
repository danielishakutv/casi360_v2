import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, PlusCircle, X, AlertCircle } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { grnApi } from '../../services/procurement'

/* ─── Constants ─── */
const QUALITY_OPTIONS = ['Pass', 'Fail', 'Pending Inspection']

const DEMO_OFFICES = [
  'Head Office - Abuja', 'Regional Office - North', 'Regional Office - South',
  'Field Office - Maiduguri', 'Field Office - Yola', 'Warehouse - Abuja',
]

const EMPTY_LINE_ITEM = {
  description: '', qty_ordered: '', qty_received: '', qty_remaining: '',
  quality_check: '', comment: '',
}

function todayStr() { return new Date().toISOString().slice(0, 10) }

function generateGRNNumber() {
  const yr = new Date().getFullYear()
  const seq = String(Math.floor(Math.random() * 900) + 100)
  return `GRN-${yr}-${seq}`
}

function buildInitialForm() {
  return {
    grn_number: generateGRNNumber(),
    /* Header */
    received_from: '',
    date_received: todayStr(),
    receiving_office: '',
    received_by: '',
    original_po_pr_no: '',
    waybill_no: '',
    /* Itemized list */
    line_items: [{ ...EMPTY_LINE_ITEM }],
    remark: '',
    /* Checked by */
    checked_programme: '',
    checked_name: '',
    checked_position: '',
    checked_signature: '',
    /* Approved by */
    approved_name: '',
    approved_position: '',
    approved_signature: '',
  }
}

export default function CreateGoodsReceivedNote() {
  const navigate = useNavigate()
  const [form, setForm] = useState(buildInitialForm)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  /* ─── Form helpers ─── */
  const updateField = useCallback((f, v) => setForm((p) => ({ ...p, [f]: v })), [])

  const updateLineItem = useCallback((idx, field, value) => {
    setForm((p) => {
      const items = p.line_items.map((li, i) => {
        if (i !== idx) return li
        const updated = { ...li, [field]: value }
        // Auto-calculate remaining
        if (field === 'qty_ordered' || field === 'qty_received') {
          const ordered = Number(field === 'qty_ordered' ? value : li.qty_ordered) || 0
          const received = Number(field === 'qty_received' ? value : li.qty_received) || 0
          updated.qty_remaining = String(Math.max(0, ordered - received))
        }
        return updated
      })
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

  /* ─── Summary totals ─── */
  const totals = useMemo(() => {
    return form.line_items.reduce(
      (acc, li) => ({
        ordered: acc.ordered + (Number(li.qty_ordered) || 0),
        received: acc.received + (Number(li.qty_received) || 0),
        remaining: acc.remaining + (Number(li.qty_remaining) || 0),
      }),
      { ordered: 0, received: 0, remaining: 0 },
    )
  }, [form.line_items])

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')

    const signoffs = []
    if (form.checked_name) signoffs.push({ type: 'Checked By', name: form.checked_name, position: form.checked_position, date: todayStr(), signature: form.checked_signature })
    if (form.approved_name) signoffs.push({ type: 'Approved By', name: form.approved_name, position: form.approved_position, date: todayStr(), signature: form.approved_signature })

    const payload = {
      received_from: form.received_from,
      date_received: form.date_received,
      office: form.receiving_office || undefined,
      received_by: form.received_by,
      po_reference: form.original_po_pr_no || undefined,
      waybill_no: form.waybill_no || undefined,
      remark: form.remark || undefined,
      signoffs: signoffs.length ? signoffs : undefined,
      items: form.line_items
        .filter((li) => li.description)
        .map((li) => ({
          description: li.description,
          ordered_qty: Number(li.qty_ordered) || 0,
          received_qty: Number(li.qty_received) || 0,
          quality_status: li.quality_check ? li.quality_check.toLowerCase().replace(/ /g, '_') : 'good',
          comment: li.comment || undefined,
        })),
    }

    grnApi.create(payload)
      .then(() => navigate('/procurement/grn'))
      .catch((err) => setFormError(err.errors ? Object.values(err.errors).flat().join(', ') : err.message))
      .finally(() => setSubmitting(false))
  }

  return (
    <div className="animate-in">
      {/* Page header */}
      <div className="pr-page-header">
        <button type="button" className="hr-btn-secondary" onClick={() => navigate('/procurement/grn')}>
          <ArrowLeft size={16} /> Back to GRNs
        </button>
        <h2 className="pr-page-title">New Goods Received Note</h2>
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

          {/* ── Header ── */}
          <p className="hr-form-section-title">Goods Received Note</p>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>GRN Number</label>
              <input type="text" value={form.grn_number} readOnly className="pr-readonly" />
            </div>
            <div className="hr-form-field">
              <label>Date Received *</label>
              <input type="date" value={form.date_received} onChange={(e) => updateField('date_received', e.target.value)} required />
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Received From *</label>
              <input type="text" value={form.received_from} onChange={(e) => updateField('received_from', e.target.value)} placeholder="Supplier / vendor name" required />
            </div>
            <div className="hr-form-field">
              <label>Receiving Office *</label>
              <select value={form.receiving_office} onChange={(e) => updateField('receiving_office', e.target.value)} required>
                <option value="">Select office…</option>
                {DEMO_OFFICES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Received By *</label>
              <input type="text" value={form.received_by} onChange={(e) => updateField('received_by', e.target.value)} placeholder="Name of person receiving goods" required />
            </div>
            <div className="hr-form-field">
              <label>Original PO / PR Number *</label>
              <input type="text" value={form.original_po_pr_no} onChange={(e) => updateField('original_po_pr_no', e.target.value)} placeholder="e.g. PO-2026-001 or PR-2026-001" required />
            </div>
          </div>

          <div className="hr-form-field" style={{ maxWidth: 400 }}>
            <label>Waybill / Delivery Note Number</label>
            <input type="text" value={form.waybill_no} onChange={(e) => updateField('waybill_no', e.target.value)} placeholder="e.g. WB-2026-001" />
          </div>

          {/* ── Itemized List ── */}
          <p className="hr-form-section-title">Itemized List</p>

          <div className="pr-line-items-wrapper">
            <table className="pr-line-items-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>S/N</th>
                  <th>Description</th>
                  <th style={{ width: 90 }}>Qty Ordered</th>
                  <th style={{ width: 90 }}>Qty Received</th>
                  <th style={{ width: 95 }}>Qty Remaining</th>
                  <th style={{ width: 130 }}>Quality Check</th>
                  <th style={{ width: 150 }}>Comment</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {form.line_items.map((li, idx) => (
                  <tr key={idx}>
                    <td className="pr-sn">{idx + 1}</td>
                    <td><input type="text" value={li.description} onChange={(e) => updateLineItem(idx, 'description', e.target.value)} placeholder="Item description" /></td>
                    <td><input type="number" value={li.qty_ordered} onChange={(e) => updateLineItem(idx, 'qty_ordered', e.target.value)} min="0" /></td>
                    <td><input type="number" value={li.qty_received} onChange={(e) => updateLineItem(idx, 'qty_received', e.target.value)} min="0" /></td>
                    <td className="pr-computed">{li.qty_remaining || '—'}</td>
                    <td>
                      <select value={li.quality_check} onChange={(e) => updateLineItem(idx, 'quality_check', e.target.value)}>
                        <option value="">—</option>
                        {QUALITY_OPTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
                      </select>
                    </td>
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
                  <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700 }}>TOTALS</td>
                  <td className="pr-computed" style={{ fontWeight: 700 }}>{totals.ordered}</td>
                  <td className="pr-computed" style={{ fontWeight: 700 }}>{totals.received}</td>
                  <td className="pr-computed" style={{ fontWeight: 700 }}>{totals.remaining}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
            <button type="button" className="pr-add-row" onClick={addLineItem}><PlusCircle size={14} /> Add Row</button>
          </div>

          {/* ── Remark ── */}
          <div className="hr-form-field">
            <label>Remark</label>
            <textarea value={form.remark} onChange={(e) => updateField('remark', e.target.value)} placeholder="General remarks about the delivery…" rows={3} />
          </div>

          {/* ── Checked By ── */}
          <p className="hr-form-section-title">Checked By</p>

          <div className="pr-signoff-block">
            <div className="hr-form-field" style={{ maxWidth: 400 }}>
              <label>Programme / Requester</label>
              <input type="text" value={form.checked_programme} onChange={(e) => updateField('checked_programme', e.target.value)} placeholder="Programme or requester name" />
            </div>
            <div className="hr-form-row">
              <div className="hr-form-field">
                <label>Name</label>
                <input type="text" value={form.checked_name} onChange={(e) => updateField('checked_name', e.target.value)} placeholder="Full name" />
              </div>
              <div className="hr-form-field">
                <label>Position</label>
                <input type="text" value={form.checked_position} onChange={(e) => updateField('checked_position', e.target.value)} placeholder="Position / title" />
              </div>
            </div>
            <div className="hr-form-field" style={{ maxWidth: 400 }}>
              <label>Signature</label>
              <input type="text" value={form.checked_signature} onChange={(e) => updateField('checked_signature', e.target.value)} placeholder="Type name as signature" />
            </div>
          </div>

          {/* ── Approved By ── */}
          <p className="hr-form-section-title">Approved By</p>

          <div className="pr-signoff-block">
            <div className="hr-form-row">
              <div className="hr-form-field">
                <label>Name</label>
                <input type="text" value={form.approved_name} onChange={(e) => updateField('approved_name', e.target.value)} placeholder="Full name" />
              </div>
              <div className="hr-form-field">
                <label>Position</label>
                <input type="text" value={form.approved_position} onChange={(e) => updateField('approved_position', e.target.value)} placeholder="Position / title" />
              </div>
            </div>
            <div className="hr-form-field" style={{ maxWidth: 400 }}>
              <label>Signature</label>
              <input type="text" value={form.approved_signature} onChange={(e) => updateField('approved_signature', e.target.value)} placeholder="Type name as signature" />
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={() => navigate('/procurement/grn')}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>{submitting ? 'Saving…' : 'Submit GRN'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
