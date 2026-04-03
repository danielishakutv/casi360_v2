import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Pencil, Shield, UserX, Eye, AlertCircle, X, RefreshCw, Copy, Check } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { fmtDate } from '../../utils/formatDate'
import { usersApi } from '../../services/api'
import { departmentsApi } from '../../services/hr'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

const ROLES = ['super_admin', 'admin', 'manager', 'staff']
const ROLE_COLORS = { super_admin: 'purple', admin: 'blue', manager: 'green', staff: 'gray' }
const ROLE_DESCRIPTIONS = {
  super_admin: 'Full system access with all permissions',
  admin: 'Administrative access with most permissions',
  manager: 'Department-level management access',
  staff: 'Standard staff access with limited permissions',
}
const PER_PAGE = 25

function fmtRole(r) { return capitalize((r || 'staff').replace(/_/g, ' ')) }

function timeAgo(dateStr) {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return fmtDate(dateStr)
}

function initials(name) {
  return (name || '??').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function generatePassword() {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const nums = '0123456789'
  const syms = '!@#$%^&*'
  const all = upper + lower + nums + syms
  let pw = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    nums[Math.floor(Math.random() * nums.length)],
    syms[Math.floor(Math.random() * syms.length)],
  ]
  for (let i = 0; i < 8; i++) pw.push(all[Math.floor(Math.random() * all.length)])
  return pw.sort(() => Math.random() - 0.5).join('')
}

function validatePassword(pw) {
  const issues = []
  if (pw.length < 8) issues.push('Min 8 characters')
  if (!/[A-Z]/.test(pw)) issues.push('Uppercase letter')
  if (!/[a-z]/.test(pw)) issues.push('Lowercase letter')
  if (!/[0-9]/.test(pw)) issues.push('Number')
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw)) issues.push('Symbol')
  return issues
}

export default function UserManagement() {
  const { user: currentUser, isSuperAdmin } = useAuth()

  const [items, setItems] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 })

  // Modals
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [roleModal, setRoleModal] = useState(null)
  const [statusModal, setStatusModal] = useState(null)
  const [deactivateModal, setDeactivateModal] = useState(null)
  const [departments, setDepartments] = useState([])

  useEffect(() => {
    departmentsApi.list({ per_page: 0 }).then((res) => setDepartments(extractItems(res))).catch(() => {})
  }, [])

  const fetchList = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await usersApi.list({
        search: debouncedSearch || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        per_page: PER_PAGE,
      })
      const data = res?.data || res
      const users = data?.users || extractItems(res)
      setItems(users)
      setMeta(data?.meta || extractMeta(res))
      // Update stats from meta
      if (data?.meta?.total != null) {
        setStats({ total: data.meta.total, active: data.meta.active ?? 0, inactive: data.meta.inactive ?? 0 })
      }
    } catch (err) { setError(err.message || 'Failed to load users') }
    finally { setLoading(false) }
  }, [debouncedSearch, roleFilter, statusFilter, page])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [debouncedSearch, roleFilter, statusFilter])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ─── Create User ───
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'staff', department: '', phone: '' })
  const [creating, setCreating] = useState(false)
  const [createErrors, setCreateErrors] = useState({})
  const [copied, setCopied] = useState(false)

  function resetCreateForm() {
    setCreateForm({ name: '', email: '', password: '', role: 'staff', department: '', phone: '' })
    setCreateErrors({})
    setCopied(false)
  }

  function handleGenPassword() {
    const pw = generatePassword()
    setCreateForm((p) => ({ ...p, password: pw }))
    navigator.clipboard?.writeText(pw).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true); setCreateErrors({})
    const pwIssues = validatePassword(createForm.password)
    if (pwIssues.length > 0) { setCreateErrors({ password: pwIssues }); setCreating(false); return }
    try {
      await usersApi.register(createForm)
      setCreateOpen(false); resetCreateForm(); fetchList()
      showToast('User created successfully')
    } catch (err) {
      if (err.errors) setCreateErrors(err.errors)
      else setCreateErrors({ _general: err.message })
    } finally { setCreating(false) }
  }

  // ─── Edit User ───
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', department: '', status: '' })
  const [saving, setSaving] = useState(false)
  const [editErrors, setEditErrors] = useState({})

  function openEdit(u) {
    setEditUser(u)
    setEditForm({ name: u.name || '', email: u.email || '', phone: u.phone || '', department: u.department || '', status: u.status || 'active' })
    setEditErrors({})
  }

  async function handleUpdate(e) {
    e.preventDefault()
    setSaving(true); setEditErrors({})
    try {
      await usersApi.update(editUser.id, editForm)
      setEditUser(null); fetchList()
      showToast('User updated successfully')
    } catch (err) {
      if (err.errors) setEditErrors(err.errors)
      else setEditErrors({ _general: err.message })
    } finally { setSaving(false) }
  }

  // ─── Change Role ───
  const [newRole, setNewRole] = useState('')
  const [changingRole, setChangingRole] = useState(false)

  function openRoleModal(u) { setRoleModal(u); setNewRole(u.role) }

  async function handleChangeRole() {
    if (!roleModal || newRole === roleModal.role) return
    setChangingRole(true)
    try {
      await usersApi.changeRole(roleModal.id, newRole)
      setRoleModal(null); fetchList()
      showToast(`Role changed to ${fmtRole(newRole)}`)
    } catch (err) { showToast(err.message || 'Failed to change role', 'error') }
    finally { setChangingRole(false) }
  }

  // ─── Status Toggle ───
  const [togglingStatus, setTogglingStatus] = useState(false)

  async function handleStatusToggle() {
    if (!statusModal) return
    setTogglingStatus(true)
    const newStatus = statusModal.status === 'active' ? 'inactive' : 'active'
    try {
      await usersApi.changeStatus(statusModal.id, newStatus)
      setStatusModal(null); fetchList()
      showToast(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
    } catch (err) { showToast(err.message || 'Failed to change status', 'error') }
    finally { setTogglingStatus(false) }
  }

  // ─── Deactivate ───
  const [deactivating, setDeactivating] = useState(false)

  async function handleDeactivate() {
    if (!deactivateModal) return
    setDeactivating(true)
    try {
      await usersApi.delete(deactivateModal.id)
      setDeactivateModal(null); fetchList()
      showToast('User deactivated')
    } catch (err) { showToast(err.message || 'Failed to deactivate', 'error') }
    finally { setDeactivating(false) }
  }

  const visibleRoles = isSuperAdmin() ? ROLES : ROLES.filter((r) => r !== 'super_admin')

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={`hr-error-banner ${toast.type === 'success' ? 'success' : ''}`} style={{ marginBottom: 12 }}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="hr-error-dismiss">&times;</button>
        </div>
      )}

      {error && (
        <div className="hr-error-banner">
          <AlertCircle size={16} /><span>{error}</span>
          <button onClick={() => setError('')} className="hr-error-dismiss">&times;</button>
        </div>
      )}

      {/* Stats badges */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total', value: stats.total || meta?.total || 0, color: 'var(--primary)' },
          { label: 'Active', value: stats.active, color: 'var(--success, #22c55e)' },
          { label: 'Inactive', value: stats.inactive, color: 'var(--danger, #ef4444)' },
        ].map((s) => (
          <div key={s.label} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}:</span>
            <span style={{ fontWeight: 700, color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      <div className="card animate-in">
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div className="search-box"><Search size={16} className="search-icon" /><input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          </div>
          <div className="hr-toolbar-right">
            <select className="hr-filter-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              {ROLES.map((r) => <option key={r} value={r}>{fmtRole(r)}</option>)}
            </select>
            <select className="hr-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button className="hr-btn-primary" onClick={() => { resetCreateForm(); setCreateOpen(true) }}><Plus size={16} /> Create User</button>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Last Login</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="hr-empty-cell"><div className="auth-spinner large" style={{ margin: '12px auto' }} /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="hr-empty-cell">No users found</td></tr>
              ) : items.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {initials(u.name)}
                      </div>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</td>
                  <td><span className={`card-badge ${ROLE_COLORS[u.role] || ''}`}>{fmtRole(u.role)}</span></td>
                  <td>{u.department || '\u2014'}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: u.status === 'active' ? 'var(--success, #22c55e)' : 'var(--danger, #ef4444)' }} />
                      {capitalize(u.status || 'active')}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(u.last_login_at)}</td>
                  <td>
                    <div className="hr-actions">
                      <button className="hr-action-btn" onClick={() => openEdit(u)} title="Edit"><Pencil size={15} /></button>
                      <button className="hr-action-btn" onClick={() => openRoleModal(u)} title="Change Role"><Shield size={15} /></button>
                      {u.id !== currentUser?.id && (
                        <>
                          <button className="hr-action-btn" onClick={() => setStatusModal(u)} title="Toggle Status"><RefreshCw size={15} /></button>
                          {u.role !== 'super_admin' && (
                            <button className="hr-action-btn danger" onClick={() => setDeactivateModal(u)} title="Deactivate"><UserX size={15} /></button>
                          )}
                        </>
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

      {/* ─── Create User Modal ─── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create User" size="md">
        <form onSubmit={handleCreate} className="hr-form">
          {createErrors._general && (
            <div className="hr-error-banner" style={{ margin: '0 0 12px' }}><AlertCircle size={16} /><span>{createErrors._general}</span></div>
          )}
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Name *</label>
              <input type="text" value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} required />
              {createErrors.name && <span className="hr-field-error">{createErrors.name[0]}</span>}
            </div>
            <div className="hr-form-field">
              <label>Email *</label>
              <input type="email" value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} required />
              {createErrors.email && <span className="hr-field-error">{createErrors.email[0]}</span>}
            </div>
          </div>
          <div className="hr-form-field">
            <label>Password *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={createForm.password} onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} required style={{ flex: 1 }} />
              <button type="button" className="hr-btn-secondary" onClick={handleGenPassword} style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Generate</>}
              </button>
            </div>
            {createErrors.password && <span className="hr-field-error">{Array.isArray(createErrors.password) ? createErrors.password.join(', ') : createErrors.password}</span>}
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>Min 8 chars, uppercase + lowercase, number, symbol</span>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Role</label>
              <select value={createForm.role} onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}>
                {visibleRoles.map((r) => <option key={r} value={r}>{fmtRole(r)}</option>)}
              </select>
            </div>
            <div className="hr-form-field">
              <label>Department</label>
              <input type="text" list="dept-suggestions" value={createForm.department} onChange={(e) => setCreateForm((p) => ({ ...p, department: e.target.value }))} placeholder="Type or select..." />
              <datalist id="dept-suggestions">{departments.map((d) => <option key={d.id} value={d.name} />)}</datalist>
            </div>
          </div>
          <div className="hr-form-field">
            <label>Phone</label>
            <input type="tel" value={createForm.phone} onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+234 801 234 5678" />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0' }}>User will be required to change password on first login.</p>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create User'}</button>
          </div>
        </form>
      </Modal>

      {/* ─── Edit User Modal ─── */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User" size="md">
        {editUser && (
          <form onSubmit={handleUpdate} className="hr-form">
            {editErrors._general && (
              <div className="hr-error-banner" style={{ margin: '0 0 12px' }}><AlertCircle size={16} /><span>{editErrors._general}</span></div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>
                {initials(editUser.name)}
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{editUser.name}</div>
                <span className={`card-badge ${ROLE_COLORS[editUser.role] || ''}`} style={{ marginTop: 2 }}>{fmtRole(editUser.role)}</span>
              </div>
            </div>
            <div className="hr-form-row">
              <div className="hr-form-field">
                <label>Name</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
                {editErrors.name && <span className="hr-field-error">{editErrors.name[0]}</span>}
              </div>
              <div className="hr-form-field">
                <label>Email</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} />
                {editErrors.email && <span className="hr-field-error">{editErrors.email[0]}</span>}
              </div>
            </div>
            <div className="hr-form-row">
              <div className="hr-form-field">
                <label>Phone</label>
                <input type="tel" value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="hr-form-field">
                <label>Department</label>
                <input type="text" list="dept-edit-suggestions" value={editForm.department} onChange={(e) => setEditForm((p) => ({ ...p, department: e.target.value }))} />
                <datalist id="dept-edit-suggestions">{departments.map((d) => <option key={d.id} value={d.name} />)}</datalist>
              </div>
            </div>
            <div className="hr-form-field" style={{ maxWidth: 200 }}>
              <label>Status</label>
              <select value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div style={{ background: 'var(--bg-surface, var(--card-bg-hover, #f5f5f5))', borderRadius: 8, padding: 12, marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><strong>Created:</strong> {fmtDate(editUser.created_at)}</div>
                <div><strong>Last Login:</strong> {timeAgo(editUser.last_login_at)}</div>
                <div><strong>Force PW Change:</strong> {editUser.force_password_change ? 'Yes' : 'No'}</div>
                <div><strong>Email Verified:</strong> {editUser.email_verified_at ? 'Yes' : 'No'}</div>
              </div>
            </div>
            <div className="hr-form-actions">
              <button type="button" className="hr-btn-secondary" onClick={() => openRoleModal(editUser)}>Change Role</button>
              <button type="button" className="hr-btn-secondary" onClick={() => setEditUser(null)}>Cancel</button>
              <button type="submit" className="hr-btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        )}
      </Modal>

      {/* ─── Change Role Modal ─── */}
      <Modal open={!!roleModal} onClose={() => setRoleModal(null)} title="Change User Role" size="sm">
        {roleModal && (
          <div>
            <p style={{ marginBottom: 12 }}>Changing role for <strong>{roleModal.name}</strong></p>
            <p style={{ marginBottom: 16 }}>Current: <span className={`card-badge ${ROLE_COLORS[roleModal.role] || ''}`}>{fmtRole(roleModal.role)}</span></p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {visibleRoles.map((r) => (
                <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, border: `1px solid ${newRole === r ? 'var(--primary)' : 'var(--border)'}`, cursor: 'pointer', background: newRole === r ? 'var(--primary-light, rgba(59, 130, 246, 0.05))' : 'transparent' }}>
                  <input type="radio" name="role" value={r} checked={newRole === r} onChange={() => setNewRole(r)} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{fmtRole(r)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ROLE_DESCRIPTIONS[r]}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="hr-form-actions">
              <button className="hr-btn-secondary" onClick={() => setRoleModal(null)}>Cancel</button>
              <button className="hr-btn-primary" onClick={handleChangeRole} disabled={changingRole || newRole === roleModal.role}>
                {changingRole ? 'Updating...' : 'Update Role'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Status Toggle Modal ─── */}
      <Modal open={!!statusModal} onClose={() => setStatusModal(null)} title="Change User Status" size="sm">
        {statusModal && (
          <div className="hr-confirm-delete">
            <p>
              {statusModal.status === 'active'
                ? <>Deactivate <strong>{statusModal.name}</strong>? They will not be able to log in.</>
                : <>Activate <strong>{statusModal.name}</strong>? They will be able to log in again.</>}
            </p>
            <div className="hr-form-actions">
              <button className="hr-btn-secondary" onClick={() => setStatusModal(null)}>Cancel</button>
              <button className={statusModal.status === 'active' ? 'hr-btn-danger' : 'hr-btn-primary'} onClick={handleStatusToggle} disabled={togglingStatus}>
                {togglingStatus ? 'Processing...' : statusModal.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Deactivate Modal ─── */}
      <Modal open={!!deactivateModal} onClose={() => setDeactivateModal(null)} title="Deactivate User" size="sm">
        {deactivateModal && (
          <div className="hr-confirm-delete">
            <p>Are you sure you want to deactivate <strong>{deactivateModal.name}</strong>?</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>They will no longer be able to log in.</p>
            <div className="hr-form-actions">
              <button className="hr-btn-secondary" onClick={() => setDeactivateModal(null)}>Cancel</button>
              <button className="hr-btn-danger" onClick={handleDeactivate} disabled={deactivating}>{deactivating ? 'Deactivating...' : 'Deactivate'}</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
