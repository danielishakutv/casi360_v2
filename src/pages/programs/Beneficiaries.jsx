import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Pencil, Trash2, Eye, AlertCircle } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { fmtDate } from '../../utils/formatDate'
import { beneficiariesApi, projectsApi } from '../../services/projects'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const STATUSES = ['active', 'inactive', 'graduated', 'withdrawn']
const GENDERS = ['male', 'female', 'other']
const PER_PAGE = 15

const INITIAL_FORM = {
  name: '', project_id: '', gender: '', age: '',
  location: '', phone: '', enrollment_date: '', status: 'active',
}

export default function Beneficiaries() {
  const { can } = useAuth()
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [projects, setProjects] = useState([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [viewItem, setViewItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await beneficiariesApi.list({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        page, per_page: PER_PAGE,
      })
      setItems(extractItems(res))
      setMeta(extractMeta(res))
    } catch (err) { setError(err.message || 'Failed to load beneficiaries') }
    finally { setLoading(false) }
  }, [debouncedSearch, statusFilter, page])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch, statusFilter])

  useEffect(() => {
    projectsApi.list({ per_page: 0 }).then((res) => setProjects(extractItems(res))).catch(() => {})
  }, [])

  function openCreate() { setEditing(null); setForm(INITIAL_FORM); setFormError(''); setModalOpen(true) }
  function openEdit(item) {
    setEditing(item)
    setForm({
      name: item.name || '', project_id: item.project_id || '',
      gender: item.gender || '', age: item.age || '',
      location: item.location || '', phone: item.phone || '',
      enrollment_date: item.enrollment_date || '', status: item.status || 'active',
    })
    setFormError('')
    setModalOpen(true)
  }
  function closeModal() { setModalOpen(false); setEditing(null) }
  function updateField(f, v) { setForm((p) => ({ ...p, [f]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    try {
      const payload = { ...form, age: form.age ? Number(form.age) : undefined }
      if (editing) await beneficiariesApi.update(editing.id, payload)
      else await beneficiariesApi.create(payload)
      closeModal()
      fetchList()
    } catch (err) { setFormError(err?.response?.data?.message || err.message || 'Failed to save') }
    finally { setSubmitting(false) }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try { await beneficiariesApi.delete(deleteTarget.id); setDeleteTarget(null); fetchList() }
    catch { setDeleteTarget(null) }
  }

  return (
    <>
      {error && (
        <div className="hr-error-banner"><AlertCircle size={16} /><span>{error}</span><button onClick={() => setError('')} className="hr-error-dismiss">&times;</button></div>
      )}

      <div className="card animate-in">
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box"><Search size={16} className="search-icon" /><input type="text" placeholder="Search beneficiaries…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
            </select>
            {can('programs.beneficiaries.create') && (
              <button className="hr-btn-primary" onClick={openCreate}><Plus size={16} /> Add Beneficiary</button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Project</th><th>Gender</th><th>Age</th><th>Location</th><th>Phone</th><th>Enrolled</th><th>Status</th><th style={{ width: 120 }}>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="hr-empty-cell">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="hr-empty-cell">No beneficiaries found</td></tr>
              ) : items.map((b) => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{b.name}</td>
                  <td style={{ fontSize: 12 }}>{b.project_name || '—'}</td>
                  <td>{b.gender ? capitalize(b.gender) : '—'}</td>
                  <td>{b.age || '—'}</td>
                  <td style={{ fontSize: 12 }}>{b.location || '—'}</td>
                  <td style={{ fontSize: 12 }}>{b.phone || '—'}</td>
                  <td style={{ fontSize: 12 }}>{fmtDate(b.enrollment_date)}</td>
                  <td><span className={`status-badge ${b.status}`}><span className="status-dot" />{capitalize(b.status)}</span></td>
                  <td>
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => setViewItem(b)} title="View"><Eye size={15} /></button>
                      {can('programs.beneficiaries.edit') && <button className="hr-action-btn" onClick={() => openEdit(b)} title="Edit"><Pencil size={15} /></button>}
                      {can('programs.beneficiaries.delete') && <button className="hr-action-btn danger" onClick={() => setDeleteTarget(b)} title="Delete"><Trash2 size={15} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta && <Pagination meta={meta} onPageChange={setPage} />}
      </div>

      {/* View */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Beneficiary Details" size="md">
        {viewItem && (
          <div className="note-detail">
            <div className="note-detail-header"><h3>{viewItem.name}</h3></div>
            <div className="note-detail-meta">
              <span><strong>Project:</strong> {viewItem.project_name || '—'}</span>
              <span><strong>Gender:</strong> {viewItem.gender ? capitalize(viewItem.gender) : '—'}</span>
              <span><strong>Age:</strong> {viewItem.age || '—'}</span>
              <span><strong>Location:</strong> {viewItem.location || '—'}</span>
              <span><strong>Phone:</strong> {viewItem.phone || '—'}</span>
              <span><strong>Enrolled:</strong> {fmtDate(viewItem.enrollment_date)}</span>
              <span><strong>Status:</strong> {capitalize(viewItem.status)}</span>
            </div>
            <div className="hr-form-actions">
              <button className="hr-btn-secondary" onClick={() => setViewItem(null)}>Close</button>
              {can('programs.beneficiaries.edit') && (
                <button className="hr-btn-primary" onClick={() => { setViewItem(null); openEdit(viewItem) }}><Pencil size={14} /> Edit</button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Create / Edit */}
      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Beneficiary' : 'Add Beneficiary'} size="md">
        <form onSubmit={handleSubmit} className="hr-form">
          {formError && <div className="hr-error-banner" style={{ margin: '0 0 16px', display: 'flex', gap: 8, alignItems: 'center', color: 'var(--danger)' }}><AlertCircle size={16} /> {formError}</div>}
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Name *</label><input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} required placeholder="Full name" /></div>
            <div className="hr-form-field"><label>Project *</label>
              <select value={form.project_id} onChange={(e) => updateField('project_id', e.target.value)} required>
                <option value="">Select project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Gender</label>
              <select value={form.gender} onChange={(e) => updateField('gender', e.target.value)}>
                <option value="">Select</option>
                {GENDERS.map((g) => <option key={g} value={g}>{capitalize(g)}</option>)}
              </select>
            </div>
            <div className="hr-form-field"><label>Age</label><input type="number" value={form.age} onChange={(e) => updateField('age', e.target.value)} min="0" max="150" /></div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Location</label><input type="text" value={form.location} onChange={(e) => updateField('location', e.target.value)} placeholder="City or community" /></div>
            <div className="hr-form-field"><label>Phone</label><input type="text" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="08012345678" /></div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field"><label>Enrollment Date</label><input type="date" value={form.enrollment_date} onChange={(e) => updateField('enrollment_date', e.target.value)} /></div>
            <div className="hr-form-field"><label>Status</label>
              <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
              </select>
            </div>
          </div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editing ? 'Update' : 'Add Beneficiary'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Beneficiary" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
      </Modal>
    </>
  )
}
