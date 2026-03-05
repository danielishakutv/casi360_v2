import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Pencil, UserX, AlertCircle } from 'lucide-react'
import { employeesApi, departmentsApi, designationsApi } from '../../services/hr'
import { capitalize } from '../../utils/capitalize'
import { useDebounce } from '../../hooks/useDebounce'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const STATUSES = ['active', 'inactive', 'on_leave', 'terminated']
const GENDERS  = ['male', 'female', 'other']

const INITIAL_FORM = {
  name: '', email: '', phone: '', gender: '', date_of_birth: '',
  department_id: '', designation_id: '', manager: '', join_date: '',
  salary: '', status: 'active', address: '',
  emergency_contact_name: '', emergency_contact_phone: '',
}

/** Format status values with underscores for display */
function formatStatus(s) {
  return capitalize((s || '').replace(/_/g, ' '))
}

export default function StaffList() {
  /* -------- List state -------- */
  const [employees, setEmployees] = useState([])
  const [meta, setMeta] = useState(null)
  const [departments, setDepartments] = useState([])
  const [designations, setDesignations] = useState([])
  const [loading, setLoading] = useState(true)

  /* -------- Filters -------- */
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [deptFilter, setDeptFilter] = useState('')
  const [desigFilter, setDesigFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  /* -------- Modal state -------- */
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  /* -------- Terminate state -------- */
  const [terminateTarget, setTerminateTarget] = useState(null)
  const [terminating, setTerminating] = useState(false)

  const [error, setError] = useState('')

  /* ---- Load lookup data (departments & designations) ---- */
  useEffect(() => {
    Promise.all([
      departmentsApi.list({ per_page: 0 }),
      designationsApi.list({ per_page: 0 }),
    ]).then(([dRes, dgRes]) => {
      setDepartments(extractItems(dRes))
      setDesignations(extractItems(dgRes))
    }).catch(() => {})
  }, [])

  /* ================================================================ */
  /* Fetch list                                                       */
  /* ================================================================ */
  const fetchList = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await employeesApi.list({
        search: debouncedSearch || undefined,
        department_id: deptFilter || undefined,
        designation_id: desigFilter || undefined,
        status: statusFilter || undefined,
        page,
        per_page: 15,
      })
      setEmployees(extractItems(res))
      setMeta(extractMeta(res))
    } catch (err) {
      setError(err.message || 'Failed to load employees')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, deptFilter, desigFilter, statusFilter, page])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch, deptFilter, desigFilter, statusFilter])

  /* ================================================================ */
  /* Modal handlers                                                   */
  /* ================================================================ */
  function openCreate() {
    setEditing(null)
    setForm(INITIAL_FORM)
    setFormErrors({})
    setModalOpen(true)
  }

  function openEdit(emp) {
    setEditing(emp)
    setForm({
      name:                    emp.name || '',
      email:                   emp.email || '',
      phone:                   emp.phone || '',
      gender:                  emp.gender || '',
      date_of_birth:           emp.date_of_birth || '',
      department_id:           emp.department_id || emp.department?.id || '',
      designation_id:          emp.designation_id || emp.designation?.id || '',
      manager:                 emp.manager || '',
      join_date:               emp.join_date || '',
      salary:                  emp.salary ?? '',
      status:                  emp.status || 'active',
      address:                 emp.address || '',
      emergency_contact_name:  emp.emergency_contact_name || '',
      emergency_contact_phone: emp.emergency_contact_phone || '',
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
      // Strip empty strings → undefined so the API only receives filled fields
      const payload = {}
      for (const [key, val] of Object.entries(form)) {
        if (val !== '') payload[key] = val
      }
      if (editing) {
        await employeesApi.update(editing.id, payload)
      } else {
        await employeesApi.create(payload)
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
  /* Terminate                                                        */
  /* ================================================================ */
  async function confirmTerminate() {
    if (!terminateTarget) return
    setTerminating(true)
    try {
      await employeesApi.terminate(terminateTarget.id)
      setTerminateTarget(null)
      fetchList()
    } catch (err) {
      setError(err.message || 'Failed to terminate employee')
      setTerminateTarget(null)
    } finally {
      setTerminating(false)
    }
  }

  /* ================================================================ */
  /* Inline status change                                             */
  /* ================================================================ */
  async function handleStatusChange(emp, newStatus) {
    try {
      await employeesApi.updateStatus(emp.id, newStatus)
      fetchList()
    } catch (err) {
      setError(err.message || 'Failed to update status')
    }
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
                placeholder="Search employees…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select className="hr-filter-select" value={desigFilter} onChange={(e) => setDesigFilter(e.target.value)}>
              <option value="">All Designations</option>
              {designations.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{formatStatus(s)}</option>
              ))}
            </select>
            <button className="hr-btn-primary" onClick={openCreate}>
              <Plus size={16} /> Add Employee
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Status</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="hr-empty-cell">
                    <div className="auth-spinner large" style={{ margin: '20px auto' }} />
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="hr-empty-cell">No employees found</td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '12px' }}>
                      {emp.staff_id || emp.id}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{emp.name}</td>
                    <td>{emp.email}</td>
                    <td>{emp.department?.name || '—'}</td>
                    <td>{emp.designation?.title || '—'}</td>
                    <td>
                      <select
                        className="hr-status-select"
                        value={emp.status}
                        onChange={(e) => handleStatusChange(emp, e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{formatStatus(s)}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="hr-actions">
                        <button className="hr-action-btn" onClick={() => openEdit(emp)} title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button className="hr-action-btn danger" onClick={() => setTerminateTarget(emp)} title="Terminate">
                          <UserX size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination meta={meta} onPageChange={setPage} />
      </div>

      {/* ---------- Create / Edit modal ---------- */}
      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Employee' : 'Add Employee'} size="lg">
        <form onSubmit={handleSubmit} className="hr-form">
          {formErrors._general && <div className="hr-form-error">{formErrors._general}</div>}

          {/* Personal Information */}
          <h4 className="hr-form-section-title">Personal Information</h4>
          <div className="hr-form-grid">
            <div className="hr-form-field">
              <label>Full Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Full name"
                required
              />
              {formErrors.name && <span className="hr-field-error">{formErrors.name[0]}</span>}
            </div>
            <div className="hr-form-field">
              <label>Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="Email address"
                required
              />
              {formErrors.email && <span className="hr-field-error">{formErrors.email[0]}</span>}
            </div>
            <div className="hr-form-field">
              <label>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="Phone number"
              />
              {formErrors.phone && <span className="hr-field-error">{formErrors.phone[0]}</span>}
            </div>
            <div className="hr-form-field">
              <label>Gender</label>
              <select value={form.gender} onChange={(e) => updateField('gender', e.target.value)}>
                <option value="">Select gender</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>{capitalize(g)}</option>
                ))}
              </select>
            </div>
            <div className="hr-form-field">
              <label>Date of Birth</label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => updateField('date_of_birth', e.target.value)}
              />
            </div>
            <div className="hr-form-field">
              <label>Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="Home address"
              />
            </div>
          </div>

          {/* Employment Details */}
          <h4 className="hr-form-section-title">Employment Details</h4>
          <div className="hr-form-grid">
            <div className="hr-form-field">
              <label>Department</label>
              <select value={form.department_id} onChange={(e) => updateField('department_id', e.target.value)}>
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {formErrors.department_id && <span className="hr-field-error">{formErrors.department_id[0]}</span>}
            </div>
            <div className="hr-form-field">
              <label>Designation</label>
              <select value={form.designation_id} onChange={(e) => updateField('designation_id', e.target.value)}>
                <option value="">Select designation</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
              {formErrors.designation_id && <span className="hr-field-error">{formErrors.designation_id[0]}</span>}
            </div>
            <div className="hr-form-field">
              <label>Manager</label>
              <input
                type="text"
                value={form.manager}
                onChange={(e) => updateField('manager', e.target.value)}
                placeholder="Manager name"
              />
            </div>
            <div className="hr-form-field">
              <label>Join Date</label>
              <input
                type="date"
                value={form.join_date}
                onChange={(e) => updateField('join_date', e.target.value)}
              />
            </div>
            <div className="hr-form-field">
              <label>Salary</label>
              <input
                type="number"
                value={form.salary}
                onChange={(e) => updateField('salary', e.target.value)}
                placeholder="Monthly salary"
                min="0"
                step="0.01"
              />
              {formErrors.salary && <span className="hr-field-error">{formErrors.salary[0]}</span>}
            </div>
            <div className="hr-form-field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{formatStatus(s)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Emergency Contact */}
          <h4 className="hr-form-section-title">Emergency Contact</h4>
          <div className="hr-form-grid">
            <div className="hr-form-field">
              <label>Contact Name</label>
              <input
                type="text"
                value={form.emergency_contact_name}
                onChange={(e) => updateField('emergency_contact_name', e.target.value)}
                placeholder="Emergency contact name"
              />
            </div>
            <div className="hr-form-field">
              <label>Contact Phone</label>
              <input
                type="tel"
                value={form.emergency_contact_phone}
                onChange={(e) => updateField('emergency_contact_phone', e.target.value)}
                placeholder="Emergency contact phone"
              />
            </div>
          </div>

          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeModal}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={submitting}>
              {submitting && <span className="auth-spinner" />}
              {editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------- Terminate confirmation ---------- */}
      <Modal open={!!terminateTarget} onClose={() => setTerminateTarget(null)} title="Terminate Employee" size="sm">
        <div className="hr-confirm-delete">
          <p>
            Are you sure you want to terminate <strong>{terminateTarget?.name}</strong>?
            This will deactivate their account and revoke access.
          </p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setTerminateTarget(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmTerminate} disabled={terminating}>
              {terminating && <span className="auth-spinner" />}
              Terminate
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
