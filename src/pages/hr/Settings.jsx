import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Pencil, Trash2, Search,
  CalendarDays, Umbrella, ChevronRight,
} from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { useAuth } from '../../contexts/AuthContext'
import { leaveTypesApi, holidaysApi } from '../../services/hr'
import { extractItems, extractMeta } from '../../utils/apiHelpers'
import Modal from '../../components/Modal'
import Pagination from '../../components/Pagination'

/* ================================================================== */
/* Tabs                                                               */
/* ================================================================== */
const TABS = [
  { key: 'leave',    label: 'Leave Types',      icon: Umbrella },
  { key: 'holidays', label: 'Public Holidays',  icon: CalendarDays },
]

/* ================================================================== */
/* Initial form state                                                 */
/* ================================================================== */
const LEAVE_INITIAL = {
  name: '', days_allowed: '', carry_over_max: '0',
  paid: true, requires_approval: true, status: 'active', description: '',
}

const HOLIDAY_INITIAL = {
  name: '', date: '', type: 'public', status: 'active',
}

/* ================================================================== */
/* Component                                                          */
/* ================================================================== */
export default function HRSettings() {
  const { can } = useAuth()
  const [tab, setTab] = useState('leave')
  const [error, setError] = useState('')

  /* ── Leave Types state ── */
  const [leaveTypes, setLeaveTypes] = useState([])
  const [leaveMeta, setLeaveMeta] = useState(null)
  const [leaveSearch, setLeaveSearch] = useState('')
  const [leavePage, setLeavePage] = useState(1)
  const [leaveModal, setLeaveModal] = useState(false)
  const [leaveEditing, setLeaveEditing] = useState(null)
  const [leaveForm, setLeaveForm] = useState(LEAVE_INITIAL)
  const [leaveDelete, setLeaveDelete] = useState(null)
  const [leaveSaving, setLeaveSaving] = useState(false)

  /* ── Holidays state ── */
  const [holidays, setHolidays] = useState([])
  const [holMeta, setHolMeta] = useState(null)
  const [holSearch, setHolSearch] = useState('')
  const [holPage, setHolPage] = useState(1)
  const [holModal, setHolModal] = useState(false)
  const [holEditing, setHolEditing] = useState(null)
  const [holForm, setHolForm] = useState(HOLIDAY_INITIAL)
  const [holDelete, setHolDelete] = useState(null)
  const [holSaving, setHolSaving] = useState(false)

  /* ================================================================ */
  /* Data loading                                                     */
  /* ================================================================ */
  const fetchLeaveTypes = useCallback(async () => {
    try {
      const res = await leaveTypesApi.list({ search: leaveSearch || undefined, page: leavePage, per_page: 25 })
      setLeaveTypes(extractItems(res))
      setLeaveMeta(extractMeta(res))
    } catch { /* keep current */ }
  }, [leaveSearch, leavePage])

  const fetchHolidays = useCallback(async () => {
    try {
      const res = await holidaysApi.list({ search: holSearch || undefined, page: holPage, per_page: 25, sort_by: 'date', sort_dir: 'asc' })
      setHolidays(extractItems(res))
      setHolMeta(extractMeta(res))
    } catch { /* keep current */ }
  }, [holSearch, holPage])

  useEffect(() => { fetchLeaveTypes() }, [fetchLeaveTypes])
  useEffect(() => { fetchHolidays() }, [fetchHolidays])

  /* ================================================================ */
  /* Leave Types CRUD                                                 */
  /* ================================================================ */
  const filteredLeave = leaveTypes

  function openLeaveCreate() {
    setLeaveEditing(null); setLeaveForm(LEAVE_INITIAL); setLeaveModal(true)
  }
  function openLeaveEdit(item) {
    setLeaveEditing(item)
    setLeaveForm({
      name: item.name, days_allowed: String(item.days_allowed),
      carry_over_max: String(item.carry_over_max || 0),
      paid: item.paid, requires_approval: item.requires_approval,
      status: item.status, description: item.description || '',
    })
    setLeaveModal(true)
  }
  function closeLeaveModal() { setLeaveModal(false); setLeaveEditing(null) }
  function updateLeaveField(f, v) { setLeaveForm((p) => ({ ...p, [f]: v })) }

  async function handleLeaveSubmit(e) {
    e.preventDefault()
    setLeaveSaving(true)
    setError('')
    const payload = {
      ...leaveForm,
      days_allowed: Number(leaveForm.days_allowed),
      carry_over_max: Number(leaveForm.carry_over_max),
    }
    try {
      if (leaveEditing) {
        await leaveTypesApi.update(leaveEditing.id, payload)
      } else {
        await leaveTypesApi.create(payload)
      }
      closeLeaveModal()
      fetchLeaveTypes()
    } catch (err) {
      setError(err.errors ? Object.values(err.errors).flat().join(', ') : err.message)
    } finally { setLeaveSaving(false) }
  }

  async function toggleLeaveStatus(item) {
    const newStatus = item.status === 'active' ? 'inactive' : 'active'
    try {
      await leaveTypesApi.update(item.id, { ...item, status: newStatus })
      fetchLeaveTypes()
    } catch { /* ignore */ }
  }

  async function confirmLeaveDelete() {
    if (!leaveDelete) return
    try {
      await leaveTypesApi.delete(leaveDelete.id)
      setLeaveDelete(null)
      fetchLeaveTypes()
    } catch (err) {
      setError(err.message)
      setLeaveDelete(null)
    }
  }

  /* ================================================================ */
  /* Holidays CRUD                                                    */
  /* ================================================================ */
  const filteredHolidays = holidays

  function openHolCreate() {
    setHolEditing(null); setHolForm(HOLIDAY_INITIAL); setHolModal(true)
  }
  function openHolEdit(item) {
    setHolEditing(item)
    setHolForm({
      name: item.name, date: item.date,
      type: item.type || 'public', status: item.status,
    })
    setHolModal(true)
  }
  function closeHolModal() { setHolModal(false); setHolEditing(null) }
  function updateHolField(f, v) { setHolForm((p) => ({ ...p, [f]: v })) }

  async function handleHolSubmit(e) {
    e.preventDefault()
    setHolSaving(true)
    setError('')
    try {
      if (holEditing) {
        await holidaysApi.update(holEditing.id, holForm)
      } else {
        await holidaysApi.create(holForm)
      }
      closeHolModal()
      fetchHolidays()
    } catch (err) {
      setError(err.errors ? Object.values(err.errors).flat().join(', ') : err.message)
    } finally { setHolSaving(false) }
  }

  async function confirmHolDelete() {
    if (!holDelete) return
    try {
      await holidaysApi.delete(holDelete.id)
      setHolDelete(null)
      fetchHolidays()
    } catch (err) {
      setError(err.message)
      setHolDelete(null)
    }
  }

  /* ================================================================ */
  /* Helpers                                                          */
  /* ================================================================ */
  function fmtDate(d) {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  /* ================================================================ */
  /* Render                                                           */
  /* ================================================================ */
  return (
    <div className="hr-settings-layout animate-in">
      {/* ── Sidebar ── */}
      <aside className="hr-settings-sidebar card">
        <div className="hr-settings-sidebar-header">
          <h3>HR Settings</h3>
          <p>Manage leave policies and holidays</p>
        </div>
        <nav className="hr-settings-nav">
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                className={`hr-settings-nav-btn${tab === t.key ? ' active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                <Icon size={16} />
                <span>{t.label}</span>
                <ChevronRight size={14} className="hr-settings-nav-chevron" />
              </button>
            )
          })}
        </nav>
      </aside>

      {/* ── Main content ── */}
      <section className="hr-settings-main">

        {error && (
          <div className="card" style={{ background: 'var(--danger-light, #fef2f2)', borderColor: 'var(--danger, #ef4444)', padding: '12px 16px', marginBottom: 16, color: 'var(--danger, #ef4444)', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* ============================================================ */}
        {/* LEAVE TYPES                                                  */}
        {/* ============================================================ */}
        {tab === 'leave' && (
          <div className="card">
            <div className="hr-settings-section-header">
              <div>
                <h3>Leave Types</h3>
                <p>Define leave categories, entitlements, and carry-over rules</p>
              </div>
              {can('hr.settings.edit') && (
                <button className="hr-btn-primary" onClick={openLeaveCreate}><Plus size={16} /> Add Leave Type</button>
              )}
            </div>

            <div className="hr-toolbar" style={{ borderTop: 'none', paddingTop: 0 }}>
              <div className="hr-toolbar-left">
                <div className="search-box">
                  <Search size={16} className="search-icon" />
                  <input type="text" placeholder="Search leave types…" value={leaveSearch} onChange={(e) => { setLeaveSearch(e.target.value); setLeavePage(1) }} />
                </div>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Leave Type</th>
                    <th style={{ width: 90 }}>Days</th>
                    <th style={{ width: 100 }}>Carry Over</th>
                    <th style={{ width: 70 }}>Paid</th>
                    <th style={{ width: 90 }}>Approval</th>
                    <th style={{ width: 100 }}>Status</th>
                    <th style={{ width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeave.length === 0 ? (
                    <tr><td colSpan={7} className="hr-empty-cell">No leave types found</td></tr>
                  ) : filteredLeave.map((lt) => (
                    <tr key={lt.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{lt.name}</div>
                        {lt.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{lt.description}</div>}
                      </td>
                      <td style={{ fontWeight: 600, textAlign: 'center' }}>{lt.days_allowed}</td>
                      <td style={{ textAlign: 'center' }}>{lt.carry_over_max > 0 ? `${lt.carry_over_max} days` : '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`card-badge ${lt.paid ? 'green' : 'orange'}`}>{lt.paid ? 'Yes' : 'No'}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`card-badge ${lt.requires_approval ? 'blue' : 'gray'}`}>{lt.requires_approval ? 'Required' : 'Auto'}</span>
                      </td>
                      <td>
                        <button
                          className={`status-toggle ${lt.status}`}
                          onClick={() => toggleLeaveStatus(lt)}
                          title={`Click to ${lt.status === 'active' ? 'deactivate' : 'activate'}`}
                        >
                          <span className="status-toggle-dot" />
                          <span>{capitalize(lt.status)}</span>
                        </button>
                      </td>
                      <td>
                        <div className="hr-actions">
                          {can('hr.settings.edit') && (
                            <button className="hr-action-btn" onClick={() => openLeaveEdit(lt)} title="Edit"><Pencil size={15} /></button>
                          )}
                          {can('hr.settings.delete') && (
                            <button className="hr-action-btn danger" onClick={() => setLeaveDelete(lt)} title="Delete"><Trash2 size={15} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary bar */}
            <div className="hr-settings-summary">
              <span>{leaveMeta?.total ?? filteredLeave.length} leave type{(leaveMeta?.total ?? filteredLeave.length) !== 1 ? 's' : ''}</span>
              <span>Active: {filteredLeave.filter((l) => l.status === 'active').length}</span>
            </div>

            {leaveMeta && <Pagination meta={leaveMeta} page={leavePage} setPage={setLeavePage} />}
          </div>
        )}

        {/* ============================================================ */}
        {/* PUBLIC HOLIDAYS                                              */}
        {/* ============================================================ */}
        {tab === 'holidays' && (
          <div className="card">
            <div className="hr-settings-section-header">
              <div>
                <h3>Public Holidays</h3>
                <p>Manage officially observed holidays for the current year</p>
              </div>
              {can('hr.settings.edit') && (
                <button className="hr-btn-primary" onClick={openHolCreate}><Plus size={16} /> Add Holiday</button>
              )}
            </div>

            <div className="hr-toolbar" style={{ borderTop: 'none', paddingTop: 0 }}>
              <div className="hr-toolbar-left">
                <div className="search-box">
                  <Search size={16} className="search-icon" />
                  <input type="text" placeholder="Search holidays…" value={holSearch} onChange={(e) => { setHolSearch(e.target.value); setHolPage(1) }} />
                </div>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Holiday</th>
                    <th style={{ width: 140 }}>Date</th>
                    <th style={{ width: 100 }}>Day</th>
                    <th style={{ width: 110 }}>Type</th>
                    <th style={{ width: 100 }}>Status</th>
                    <th style={{ width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHolidays.length === 0 ? (
                    <tr><td colSpan={6} className="hr-empty-cell">No holidays found</td></tr>
                  ) : filteredHolidays.map((h) => {
                    const dayName = h.date
                      ? new Date(h.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })
                      : '—'
                    return (
                      <tr key={h.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CalendarDays size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{h.name}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 13 }}>{fmtDate(h.date)}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{dayName}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`card-badge ${h.type === 'public' ? 'blue' : 'gray'}`}>
                            {capitalize(h.type || 'public')}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${h.status}`}>
                            <span className="status-dot" />{capitalize(h.status)}
                          </span>
                        </td>
                        <td>
                          <div className="hr-actions">
                            {can('hr.settings.edit') && (
                              <button className="hr-action-btn" onClick={() => openHolEdit(h)} title="Edit"><Pencil size={15} /></button>
                            )}
                            {can('hr.settings.delete') && (
                              <button className="hr-action-btn danger" onClick={() => setHolDelete(h)} title="Delete"><Trash2 size={15} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="hr-settings-summary">
              <span>{holMeta?.total ?? filteredHolidays.length} holiday{(holMeta?.total ?? filteredHolidays.length) !== 1 ? 's' : ''}</span>
              <span>Public: {filteredHolidays.filter((h) => h.type === 'public').length}</span>
            </div>

            {holMeta && <Pagination meta={holMeta} page={holPage} setPage={setHolPage} />}
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* MODALS                                                       */}
      {/* ============================================================ */}

      {/* ── Leave Type Create / Edit ── */}
      <Modal open={leaveModal} onClose={closeLeaveModal} title={leaveEditing ? 'Edit Leave Type' : 'Add Leave Type'} size="md">
        <form onSubmit={handleLeaveSubmit} className="hr-form">
          <div className="hr-form-field">
            <label>Leave Type Name *</label>
            <input type="text" value={leaveForm.name} onChange={(e) => updateLeaveField('name', e.target.value)} required placeholder="e.g. Annual Leave" />
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Days Allowed Per Year *</label>
              <input type="number" min="1" max="365" value={leaveForm.days_allowed} onChange={(e) => updateLeaveField('days_allowed', e.target.value)} required placeholder="21" />
            </div>
            <div className="hr-form-field">
              <label>Max Carry-Over Days</label>
              <input type="number" min="0" max="365" value={leaveForm.carry_over_max} onChange={(e) => updateLeaveField('carry_over_max', e.target.value)} placeholder="0 = no carry-over" />
            </div>
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Paid Leave?</label>
              <select value={leaveForm.paid ? 'yes' : 'no'} onChange={(e) => updateLeaveField('paid', e.target.value === 'yes')}>
                <option value="yes">Yes — Paid</option>
                <option value="no">No — Unpaid</option>
              </select>
            </div>
            <div className="hr-form-field">
              <label>Requires Approval?</label>
              <select value={leaveForm.requires_approval ? 'yes' : 'no'} onChange={(e) => updateLeaveField('requires_approval', e.target.value === 'yes')}>
                <option value="yes">Yes — Manager must approve</option>
                <option value="no">No — Auto-approved</option>
              </select>
            </div>
          </div>
          <div className="hr-form-field">
            <label>Status</label>
            <select value={leaveForm.status} onChange={(e) => updateLeaveField('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="hr-form-field">
            <label>Description</label>
            <textarea value={leaveForm.description} onChange={(e) => updateLeaveField('description', e.target.value)} rows={3} placeholder="Brief description or policy notes…" />
          </div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeLeaveModal}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={leaveSaving}>{leaveSaving ? 'Saving…' : leaveEditing ? 'Update' : 'Add Leave Type'}</button>
          </div>
        </form>
      </Modal>

      {/* ── Leave Type Delete ── */}
      <Modal open={!!leaveDelete} onClose={() => setLeaveDelete(null)} title="Delete Leave Type" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete <strong>{leaveDelete?.name}</strong>? Employees with this leave type may be affected.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setLeaveDelete(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmLeaveDelete}>Delete</button>
          </div>
        </div>
      </Modal>

      {/* ── Holiday Create / Edit ── */}
      <Modal open={holModal} onClose={closeHolModal} title={holEditing ? 'Edit Holiday' : 'Add Holiday'} size="sm">
        <form onSubmit={handleHolSubmit} className="hr-form">
          <div className="hr-form-field">
            <label>Holiday Name *</label>
            <input type="text" value={holForm.name} onChange={(e) => updateHolField('name', e.target.value)} required placeholder="e.g. Independence Day" />
          </div>
          <div className="hr-form-field">
            <label>Date *</label>
            <input type="date" value={holForm.date} onChange={(e) => updateHolField('date', e.target.value)} required />
          </div>
          <div className="hr-form-row">
            <div className="hr-form-field">
              <label>Type</label>
              <select value={holForm.type} onChange={(e) => updateHolField('type', e.target.value)}>
                <option value="public">Public Holiday</option>
                <option value="company">Company Holiday</option>
              </select>
            </div>
            <div className="hr-form-field">
              <label>Status</label>
              <select value={holForm.status} onChange={(e) => updateHolField('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="hr-form-actions">
            <button type="button" className="hr-btn-secondary" onClick={closeHolModal}>Cancel</button>
            <button type="submit" className="hr-btn-primary" disabled={holSaving}>{holSaving ? 'Saving…' : holEditing ? 'Update' : 'Add Holiday'}</button>
          </div>
        </form>
      </Modal>

      {/* ── Holiday Delete ── */}
      <Modal open={!!holDelete} onClose={() => setHolDelete(null)} title="Delete Holiday" size="sm">
        <div className="hr-confirm-delete">
          <p>Delete <strong>{holDelete?.name}</strong> ({fmtDate(holDelete?.date)})? This cannot be undone.</p>
          <div className="hr-form-actions">
            <button className="hr-btn-secondary" onClick={() => setHolDelete(null)}>Cancel</button>
            <button className="hr-btn-danger" onClick={confirmHolDelete}>Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
