import { useState, useMemo } from 'react'
import {
  Plus, Pencil, Trash2, Search,
  CalendarDays, Umbrella, ChevronRight,
} from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/Modal'

/* ================================================================== */
/* Demo data — replace with live API calls later                      */
/* ================================================================== */

let _nextId = 200

const DEMO_LEAVE_TYPES = [
  { id: 1, name: 'Annual Leave',        days_allowed: 21, carry_over_max: 5,  paid: true,  requires_approval: true,  status: 'active', description: 'Standard annual leave for all confirmed staff' },
  { id: 2, name: 'Sick Leave',          days_allowed: 12, carry_over_max: 0,  paid: true,  requires_approval: true,  status: 'active', description: 'Medical leave with doctor certificate required for 3+ days' },
  { id: 3, name: 'Maternity Leave',     days_allowed: 90, carry_over_max: 0,  paid: true,  requires_approval: true,  status: 'active', description: 'Maternity leave for female employees' },
  { id: 4, name: 'Paternity Leave',     days_allowed: 14, carry_over_max: 0,  paid: true,  requires_approval: true,  status: 'active', description: 'Paternity leave for male employees' },
  { id: 5, name: 'Compassionate Leave', days_allowed: 5,  carry_over_max: 0,  paid: true,  requires_approval: true,  status: 'active', description: 'Bereavement or family emergency leave' },
  { id: 6, name: 'Study Leave',         days_allowed: 10, carry_over_max: 0,  paid: false, requires_approval: true,  status: 'active', description: 'Leave for exams or professional development' },
  { id: 7, name: 'Unpaid Leave',        days_allowed: 30, carry_over_max: 0,  paid: false, requires_approval: true,  status: 'active', description: 'Extended leave without pay' },
  { id: 8, name: 'TOIL',               days_allowed: 5,  carry_over_max: 0,  paid: true,  requires_approval: true,  status: 'inactive', description: 'Time off in lieu of overtime worked' },
]

const DEMO_HOLIDAYS = [
  { id: 101, name: "New Year's Day",        date: '2026-01-01', recurring: true,  status: 'active' },
  { id: 102, name: 'Workers\' Day',         date: '2026-05-01', recurring: true,  status: 'active' },
  { id: 103, name: 'Democracy Day',         date: '2026-06-12', recurring: true,  status: 'active' },
  { id: 104, name: 'Independence Day',      date: '2026-10-01', recurring: true,  status: 'active' },
  { id: 105, name: 'Christmas Day',         date: '2026-12-25', recurring: true,  status: 'active' },
  { id: 106, name: 'Boxing Day',            date: '2026-12-26', recurring: true,  status: 'active' },
  { id: 107, name: 'Eid al-Fitr',           date: '2026-03-30', recurring: false, status: 'active' },
  { id: 108, name: 'Eid al-Adha',           date: '2026-06-07', recurring: false, status: 'active' },
  { id: 109, name: 'Good Friday',           date: '2026-04-03', recurring: false, status: 'active' },
  { id: 110, name: 'Easter Monday',         date: '2026-04-06', recurring: false, status: 'active' },
]

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
  name: '', date: '', recurring: false, status: 'active',
}

/* ================================================================== */
/* Component                                                          */
/* ================================================================== */
export default function HRSettings() {
  const { can } = useAuth()
  const [tab, setTab] = useState('leave')

  /* ── Leave Types state ── */
  const [leaveTypes, setLeaveTypes] = useState(DEMO_LEAVE_TYPES)
  const [leaveSearch, setLeaveSearch] = useState('')
  const [leaveModal, setLeaveModal] = useState(false)
  const [leaveEditing, setLeaveEditing] = useState(null)
  const [leaveForm, setLeaveForm] = useState(LEAVE_INITIAL)
  const [leaveDelete, setLeaveDelete] = useState(null)

  /* ── Holidays state ── */
  const [holidays, setHolidays] = useState(DEMO_HOLIDAYS)
  const [holSearch, setHolSearch] = useState('')
  const [holModal, setHolModal] = useState(false)
  const [holEditing, setHolEditing] = useState(null)
  const [holForm, setHolForm] = useState(HOLIDAY_INITIAL)
  const [holDelete, setHolDelete] = useState(null)

  /* ================================================================ */
  /* Leave Types CRUD                                                 */
  /* ================================================================ */
  const filteredLeave = useMemo(() => {
    if (!leaveSearch) return leaveTypes
    const q = leaveSearch.toLowerCase()
    return leaveTypes.filter((l) => (l.name + l.description).toLowerCase().includes(q))
  }, [leaveTypes, leaveSearch])

  function openLeaveCreate() {
    setLeaveEditing(null); setLeaveForm(LEAVE_INITIAL); setLeaveModal(true)
  }
  function openLeaveEdit(item) {
    setLeaveEditing(item)
    setLeaveForm({
      name: item.name, days_allowed: String(item.days_allowed),
      carry_over_max: String(item.carry_over_max),
      paid: item.paid, requires_approval: item.requires_approval,
      status: item.status, description: item.description || '',
    })
    setLeaveModal(true)
  }
  function closeLeaveModal() { setLeaveModal(false); setLeaveEditing(null) }
  function updateLeaveField(f, v) { setLeaveForm((p) => ({ ...p, [f]: v })) }

  function handleLeaveSubmit(e) {
    e.preventDefault()
    const payload = {
      ...leaveForm,
      days_allowed: Number(leaveForm.days_allowed),
      carry_over_max: Number(leaveForm.carry_over_max),
    }
    if (leaveEditing) {
      setLeaveTypes((prev) => prev.map((l) => l.id === leaveEditing.id ? { ...l, ...payload } : l))
    } else {
      setLeaveTypes((prev) => [{ id: ++_nextId, ...payload }, ...prev])
    }
    closeLeaveModal()
  }

  function toggleLeaveStatus(item) {
    setLeaveTypes((prev) => prev.map((l) =>
      l.id === item.id ? { ...l, status: l.status === 'active' ? 'inactive' : 'active' } : l
    ))
  }

  function confirmLeaveDelete() {
    if (!leaveDelete) return
    setLeaveTypes((prev) => prev.filter((l) => l.id !== leaveDelete.id))
    setLeaveDelete(null)
  }

  /* ================================================================ */
  /* Holidays CRUD                                                    */
  /* ================================================================ */
  const filteredHolidays = useMemo(() => {
    let h = [...holidays].sort((a, b) => a.date.localeCompare(b.date))
    if (!holSearch) return h
    const q = holSearch.toLowerCase()
    return h.filter((r) => r.name.toLowerCase().includes(q))
  }, [holidays, holSearch])

  function openHolCreate() {
    setHolEditing(null); setHolForm(HOLIDAY_INITIAL); setHolModal(true)
  }
  function openHolEdit(item) {
    setHolEditing(item)
    setHolForm({
      name: item.name, date: item.date,
      recurring: item.recurring, status: item.status,
    })
    setHolModal(true)
  }
  function closeHolModal() { setHolModal(false); setHolEditing(null) }
  function updateHolField(f, v) { setHolForm((p) => ({ ...p, [f]: v })) }

  function handleHolSubmit(e) {
    e.preventDefault()
    if (holEditing) {
      setHolidays((prev) => prev.map((h) => h.id === holEditing.id ? { ...h, ...holForm } : h))
    } else {
      setHolidays((prev) => [{ id: ++_nextId, ...holForm }, ...prev])
    }
    closeHolModal()
  }

  function confirmHolDelete() {
    if (!holDelete) return
    setHolidays((prev) => prev.filter((h) => h.id !== holDelete.id))
    setHolDelete(null)
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
                  <input type="text" placeholder="Search leave types…" value={leaveSearch} onChange={(e) => setLeaveSearch(e.target.value)} />
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
              <span>{filteredLeave.length} leave type{filteredLeave.length !== 1 ? 's' : ''}</span>
              <span>Active: {filteredLeave.filter((l) => l.status === 'active').length}</span>
            </div>
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
                  <input type="text" placeholder="Search holidays…" value={holSearch} onChange={(e) => setHolSearch(e.target.value)} />
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
                    <th style={{ width: 110 }}>Recurring</th>
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
                          <span className={`card-badge ${h.recurring ? 'blue' : 'gray'}`}>
                            {h.recurring ? 'Every Year' : 'One-time'}
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
              <span>{filteredHolidays.length} holiday{filteredHolidays.length !== 1 ? 's' : ''}</span>
              <span>Recurring: {filteredHolidays.filter((h) => h.recurring).length}</span>
            </div>
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
            <button type="submit" className="hr-btn-primary">{leaveEditing ? 'Update' : 'Add Leave Type'}</button>
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
              <label>Recurring?</label>
              <select value={holForm.recurring ? 'yes' : 'no'} onChange={(e) => updateHolField('recurring', e.target.value === 'yes')}>
                <option value="yes">Yes — Every year</option>
                <option value="no">No — One-time</option>
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
            <button type="submit" className="hr-btn-primary">{holEditing ? 'Update' : 'Add Holiday'}</button>
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
