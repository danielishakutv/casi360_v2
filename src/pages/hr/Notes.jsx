import { useState, useEffect, useCallback } from 'react'
import {
  Search, Plus, Pencil, Trash2, AlertCircle, StickyNote,
  User, Calendar, Tag,
} from 'lucide-react'
import { notesApi, employeesApi } from '../../services/hr'
import { capitalize } from '../../utils/capitalize'
import { useDebounce } from '../../hooks/useDebounce'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const PRIORITIES = ['low', 'medium', 'high']
const TYPES      = ['general', 'performance', 'disciplinary', 'commendation', 'medical', 'training']

const PRIORITY_COLORS = {
  low:    'green',
  medium: 'orange',
  high:   'red',
}

const TYPE_ICONS = {
  general:       StickyNote,
  performance:   Tag,
  disciplinary:  AlertCircle,
  commendation:  Tag,
  medical:       Tag,
  training:      Tag,
}

const INITIAL_FORM = {
  employee_id: '',
  title: '',
  content: '',
  type: 'general',
  priority: 'medium',
}

export default function Notes() {
  const { can } = useAuth()

  /* -------- List state -------- */
  const [notes, setNotes] = useState([])
  const [meta, setMeta] = useState(null)
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  /* -------- Filters -------- */
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [page, setPage] = useState(1)

  /* -------- Modal state -------- */
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  /* -------- View modal -------- */
  const [viewNote, setViewNote] = useState(null)

  /* -------- Delete state -------- */
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [error, setError] = useState('')

  /* ---- Load employees for dropdown ---- */
  useEffect(() => {
    employeesApi.list({ per_page: 0 })
      .then((res) => setEmployees(extractItems(res)))
      .catch(() => {})
  }, [])

  /* ================================================================ */
  /* Fetch list                                                       */
  /* ================================================================ */
  const fetchList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await notesApi.list({
        search: debouncedSearch || undefined,
        employee_id: employeeFilter || undefined,
        type: typeFilter || undefined,
        priority: priorityFilter || undefined,
        page,
        per_page: 15,
      })
      setNotes(extractItems(res))
      setMeta(extractMeta(res))
    } catch (err) {
      setError(err.message || 'Failed to load notes')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, employeeFilter, typeFilter, priorityFilter, page])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch, employeeFilter, typeFilter, priorityFilter])

  /* ================================================================ */
  /* Modal handlers                                                   */
  /* ================================================================ */
  function openCreate() {
    setEditing(null)
    setForm(INITIAL_FORM)
    setFormErrors({})
    setModalOpen(true)
  }

  function openEdit(note) {
    setEditing(note)
    setForm({
      employee_id: note.employee_id || note.employee?.id || '',
      title:       note.title || '',
      content:     note.content || '',
      type:        note.type || 'general',
      priority:    note.priority || 'medium',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setFormErrors({})
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormErrors({})
    try {
      const payload = {}
      for (const [key, val] of Object.entries(form)) {
        if (val !== '') payload[key] = val
      }
      if (editing) {
        await notesApi.update(editing.id, payload)
      } else {
        await notesApi.create(payload)
      }
      closeModal()
      fetchList()
    } catch (err) {
      if (err.errors) setFormErrors(err.errors)
      else setFormErrors({ _general: err.message || 'Something went wrong' })
    } finally {
      setSubmitting(false)
    }
  }

  /* ================================================================ */
  /* Delete                                                           */
  /* ================================================================ */
  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await notesApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      fetchList()
    } catch (err) {
      setError(err.message || 'Failed to delete note')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  /* ================================================================ */
  /* Helpers                                                          */
  /* ================================================================ */
  function getEmployeeName(note) {
    if (note.employee?.name) return note.employee.name
    const emp = employees.find((e) => e.id === note.employee_id)
    return emp?.name || '—'
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  }

  function truncate(str, max = 80) {
    if (!str) return ''
    return str.length > max ? str.slice(0, max) + '…' : str
  }

  /* ================================================================ */
  /* Render                                                           */
  /* ================================================================ */
  return (
    <>
      {error && (
        <div className="hr-error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="hr-error-dismiss">&times;</button>
        </div>
      )}

      <div className="card animate-in">
        {/* Toolbar */}
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
            <select className="hr-filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>{capitalize(t)}</option>
              ))}
            </select>
            <select className="hr-filter-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="">All Priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{capitalize(p)}</option>
              ))}
            </select>
            {can('hr.notes.create') && (
              <button className="hr-btn-primary" onClick={openCreate}>
                <Plus size={16} /> Add Note
              </button>
            )}
          </div>
        </div>

        {/* Notes list */}
        {loading ? (
          <div className="hr-loading" style={{ minHeight: 200 }}>
            <div className="auth-spinner large" />
          </div>
        ) : notes.length === 0 ? (
          <div className="notes-empty">
            <StickyNote size={40} />
            <p>No notes found</p>
            <span>Add a note using the button above</span>
          </div>
        ) : (
          <div className="notes-grid">
            {notes.map((note) => {
              const TypeIcon = TYPE_ICONS[note.type] || StickyNote
              const prioColor = PRIORITY_COLORS[note.priority] || 'blue'
              return (
                <div className="note-card" key={note.id} onClick={() => setViewNote(note)}>
                  <div className="note-card-header">
                    <div className="note-type-badge">
                      <TypeIcon size={14} />
                      {capitalize(note.type || 'general')}
                    </div>
                    <span className={`card-badge ${prioColor}`}>
                      {capitalize(note.priority || 'medium')}
                    </span>
                  </div>
                  <h4 className="note-card-title">{note.title || 'Untitled Note'}</h4>
                  <p className="note-card-content">{truncate(note.content, 120)}</p>
                  <div className="note-card-footer">
                    <span className="note-card-meta">
                      <User size={13} />
                      {getEmployeeName(note)}
                    </span>
                    <span className="note-card-meta">
                      <Calendar size={13} />
                      {formatDate(note.created_at)}
                    </span>
                  </div>
                  {(can('hr.notes.edit') || can('hr.notes.delete')) && (
                    <div className="note-card-actions" onClick={(e) => e.stopPropagation()}>
                      {can('hr.notes.edit') && (
                        <button className="hr-action-btn" onClick={() => openEdit(note)} title="Edit">
                          <Pencil size={14} />
                        </button>
                      )}
                      {can('hr.notes.delete') && (
                        <button className="hr-action-btn danger" onClick={() => setDeleteTarget(note)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <Pagination meta={meta} onPageChange={setPage} />
      </div>

      {/* ---------- View note modal ---------- */}
      <Modal open={!!viewNote} onClose={() => setViewNote(null)} title="Note Details" size="md">
        {viewNote && (
          <div className="note-detail">
            <div className="note-detail-header">
              <h3>{viewNote.title || 'Untitled Note'}</h3>
              <div className="note-detail-badges">
                <span className="note-type-badge">
                  {capitalize(viewNote.type || 'general')}
                </span>
                <span className={`card-badge ${PRIORITY_COLORS[viewNote.priority] || 'blue'}`}>
                  {capitalize(viewNote.priority || 'medium')}
                </span>
              </div>
            </div>
            <div className="note-detail-meta">
              <span><User size={14} /> <strong>Employee:</strong> {getEmployeeName(viewNote)}</span>
              <span><Calendar size={14} /> <strong>Created:</strong> {formatDate(viewNote.created_at)}</span>
              {viewNote.updated_at && viewNote.updated_at !== viewNote.created_at && (
                <span><Calendar size={14} /> <strong>Updated:</strong> {formatDate(viewNote.updated_at)}</span>
              )}
              {viewNote.created_by_name && (
                <span><User size={14} /> <strong>Added by:</strong> {viewNote.created_by_name}</span>
              )}
            </div>
            <div className="note-detail-content">
              {viewNote.content || 'No content'}
            </div>
            <div className="hr-form-actions">
              <button className="hr-btn-secondary" onClick={() => setViewNote(null)}>Close</button>
              {can('hr.notes.edit') && (
                <button className="hr-btn-primary" onClick={() => { setViewNote(null); openEdit(viewNote) }}>
                  <Pencil size={14} /> Edit
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ---------- Create / Edit modal ---------- */}
      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Note' : 'Add Note'} size="md">
        <form onSubmit={handleSubmit} className="hr-form">
          {formErrors._general && <div className="hr-form-error">{formErrors._general}</div>}

          <div className="hr-form-field">
            <label>Employee *</label>
            <select
              value={form.employee_id}
              onChange={(e) => updateField('employee_id', e.target.value)}
              required
            >
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}{emp.staff_id ? ` (${emp.staff_id})` : ''}{emp.department?.name ? ` — ${emp.department.name}` : ''}
                </option>
              ))}
            </select>
            {formErrors.employee_id && <span className="hr-field-error">{formErrors.employee_id[0]}</span>}
          </div>

          <div className="hr-form-field">
            <label>Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Brief subject for the note"
              required
            />
            {formErrors.title && <span className="hr-field-error">{formErrors.title[0]}</span>}
          </div>

          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Type</label>
              <select value={form.type} onChange={(e) => updateField('type', e.target.value)}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>{capitalize(t)}</option>
                ))}
              </select>
            </div>
            <div className="hr-form-field">
              <label>Priority</label>
              <select value={form.priority} onChange={(e) => updateField('priority', e.target.value)}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{capitalize(p)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="hr-form-field">
            <label>Content *</label>
            <textarea
              value={form.content}
              onChange={(e) => updateField('content', e.target.value)}
              placeholder="Write the note content here…"
              rows={6}
              required
            />
            {formErrors.content && <span className="hr-field-error">{formErrors.content[0]}</span>}
          </div>

          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>
              {submitting && <span className="auth-spinner" />}
              {editing ? 'Update' : 'Save Note'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------- Delete confirmation ---------- */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Note" size="sm">
        <div className="hr-confirm-delete">
          <p>
            Are you sure you want to delete the note <strong>&ldquo;{deleteTarget?.title}&rdquo;</strong>?
            This action cannot be undone.
          </p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmDelete} disabled={deleting}>
              {deleting && <span className="auth-spinner" />}
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
