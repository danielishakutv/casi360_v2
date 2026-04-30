import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Pencil, Trash2, Eye, AlertCircle } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { fmtDate } from '../../utils/formatDate'
import { rfqApi, purchaseRequestsApi } from '../../services/procurement'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { usePersistedScope } from '../../hooks/usePersistedScope'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'
import MineToggle from '../../components/MineToggle'

const STATUSES = ['draft', 'open', 'closed', 'awarded', 'cancelled']
const PER_PAGE = 15

const INITIAL_FORM = {
  title: '', description: '', pr_reference: '',
  deadline: '', status: 'draft', notes: '',
}

export default function RequestForQuotation() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canViewAll = can('procurement.rfq.view_all')
  const [mine, setMine] = usePersistedScope('casi360.scope.rfq', true)
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [approvedPRs, setApprovedPRs] = useState([])
  const [viewItem, setViewItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    purchaseRequestsApi.list({ status: 'approved', per_page: 0 })
      .then((res) => setApprovedPRs(extractItems(res)))
      .catch(() => {})
  }, [])

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await rfqApi.list({ search: debouncedSearch || undefined, status: statusFilter || undefined, page, per_page: PER_PAGE, mine: mine ? 1 : 0 })
      setItems(extractItems(res))
      setMeta(extractMeta(res))
    } catch { /* keep current */ }
    finally { setLoading(false) }
  }, [debouncedSearch, statusFilter, page, mine])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter, mine])

  function openEdit(item) {
    setEditing(item)
    setForm({ title: item.title, description: item.description || '', pr_reference: item.pr_reference || '', deadline: item.deadline || '', status: item.status, notes: item.notes || '' })
    setFormError('')
    setModalOpen(true)
  }
  function closeModal() { setModalOpen(false); setEditing(null); setFormError('') }
  function updateField(f, v) { setForm((p) => ({ ...p, [f]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    try {
      if (editing) {
        await rfqApi.update(editing.id, form)
      } else {
        await rfqApi.create(form)
      }
      closeModal()
      fetchList()
    } catch (err) {
      // Show server-provided 403 (and other) messages verbatim
      setFormError(err.errors ? Object.values(err.errors).flat().join(', ') : (err.message || 'Failed to save RFQ'))
    }
    finally { setSubmitting(false) }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await rfqApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      fetchList()
    } catch { setDeleteTarget(null) }
  }

  return (
    <>
      <div className="card animate-in">
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box"><Search size={16} className="search-icon" /><input type="text" placeholder="Search RFQs…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} /></div>
            <MineToggle value={mine} onChange={setMine} canViewAll={canViewAll} />
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
            </select>
            {can('procurement.rfq.create') && (
              <button className="hr-btn-primary" onClick={() => navigate('/procurement/rfq/create')}><Plus size={16} /> New RFQ</button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>RFQ #</th><th>Title</th><th>PR Ref</th><th>Deadline</th><th>Quotes</th><th>Status</th><th>Created</th><th style={{ width: 120 }}>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '12px auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="hr-empty-cell">No RFQs found</td></tr>
              ) : items.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 12 }}>{r.rfq_number}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{r.title}</td>
                  <td>{r.pr_reference || '—'}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(r.deadline)}</td>
                  <td>{r.quotes_count ?? '—'}</td>
                  <td><span className={`status-badge ${r.status}`}><span className="status-dot" />{capitalize(r.status)}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(r.created_at)}</td>
                  <td>
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => setViewItem(r)} title="View"><Eye size={15} /></button>
                      {can('procurement.rfq.edit') && (
                        <button className="hr-action-btn" onClick={() => openEdit(r)} title="Edit"><Pencil size={15} /></button>
                      )}
                      {can('procurement.rfq.delete') && (
                        <button className="hr-action-btn danger" onClick={() => setDeleteTarget(r)} title="Delete"><Trash2 size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta && <Pagination meta={meta} onPageChange={setPage} />}
      </div>

      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="RFQ Details" size="md">
        {viewItem && (
          <div className="note-detail">
            <div className="note-detail-header"><h3>{viewItem.rfq_number} — {viewItem.title}</h3></div>
            <div className="note-detail-meta">
              <span><strong>PR Reference:</strong> {viewItem.pr_reference || '—'}</span>
              <span><strong>Deadline:</strong> {fmtDate(viewItem.deadline)}</span>
              <span><strong>Quotes:</strong> {viewItem.quotes_count ?? '—'}</span>
              <span><strong>Status:</strong> {capitalize(viewItem.status)}</span>
              <span><strong>Created:</strong> {fmtDate(viewItem.created_at)}</span>
            </div>
            <div className="note-detail-content">{viewItem.description || 'No description'}</div>
            <div className="hr-form-actions">
              <button className="hr-btn-secondary" onClick={() => setViewItem(null)}>Close</button>
              {can('procurement.rfq.edit') && (
                <button className="hr-btn-primary" onClick={() => { setViewItem(null); openEdit(viewItem) }}><Pencil size={14} /> Edit</button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit RFQ' : 'New Request for Quotation'} size="md">
        <form onSubmit={handleSubmit} className="hr-form">
          {formError && (
            <div className="hr-error-banner" style={{ margin: '0 0 16px' }}>
              <AlertCircle size={16} />
              <span>{formError}</span>
              <button type="button" onClick={() => setFormError('')} className="hr-error-dismiss">&times;</button>
            </div>
          )}
          <div className="hr-form-field"><label>Title *</label><input type="text" value={form.title} onChange={(e) => updateField('title', e.target.value)} required placeholder="RFQ title" /></div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Approved Purchase Request</label>
              <select value={form.pr_reference} onChange={(e) => updateField('pr_reference', e.target.value)}>
                <option value="">— None —</option>
                {approvedPRs.map((pr) => (
                  <option key={pr.id} value={pr.requisition_number || pr.id}>
                    {(pr.requisition_number || `PR-${pr.id}`)} — {pr.title || pr.description || 'Untitled'}
                  </option>
                ))}
              </select>
            </div>
            <div className="hr-form-field"><label>Deadline</label><input type="date" value={form.deadline} onChange={(e) => updateField('deadline', e.target.value)} /></div>
          </div>
          <div className="hr-form-field"><label>Status</label><select value={form.status} onChange={(e) => updateField('status', e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}</select></div>
          <div className="hr-form-field"><label>Description</label><textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} rows={4} placeholder="Items & quantities being quoted…" /></div>
          <div className="hr-form-field"><label>Notes</label><textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} rows={2} placeholder="Additional notes…" /></div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editing ? 'Update' : 'Create RFQ'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete RFQ" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete <strong>{deleteTarget?.title || deleteTarget?.rfq_number}</strong>? This cannot be undone.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
      </Modal>
    </>
  )
}
