import { useState, useEffect, useCallback } from 'react'
import {
  Building2, Globe, Mail, Phone, MapPin,
  Bell, Shield, Key, Lock,
  Palette, Languages,
  Database, Download, Upload, Trash2,
  Users,
  Clock, CalendarDays,
  Save, CheckCircle2, AlertCircle, ChevronRight,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { settingsApi } from '../services/api'
import { extractItems, extractMeta } from '../utils/apiHelpers'
import { fmtDate } from '../utils/formatDate'
import Pagination from '../components/Pagination'

/* ================================================================== */
/* Fallback defaults (used until API settings load)                   */
/* ================================================================== */

const DEFAULTS = {
  organization_name: '', organization_acronym: '', organization_email: '', organization_phone: '',
  organization_website: '', organization_address: '', organization_state: '', organization_country: '',
  organization_registration_number: '', organization_tax_id: '', organization_founded: '',
  notifications_email_alerts: true, notifications_sms_alerts: false, notifications_push: true,
  notifications_weekly_digest: true, notifications_mention_alerts: true, notifications_approval_alerts: true,
  notifications_system_updates: false, notifications_security_alerts: true,
  security_two_factor: false, security_session_timeout: '60', security_password_expiry: '90',
  security_max_login_attempts: '5', security_ip_whitelist: '', security_strong_passwords: true,
  display_language: 'en', display_timezone: 'Africa/Lagos', display_date_format: 'DD/MM/YYYY',
  display_currency: 'NGN', display_items_per_page: '15',
}



/* ================================================================== */
/* Tabs                                                               */
/* ================================================================== */
const TABS = [
  { key: 'general',       label: 'Organization',   icon: Building2 },
  { key: 'notifications', label: 'Notifications',  icon: Bell },
  { key: 'security',      label: 'Security',       icon: Shield },
  { key: 'display',       label: 'Display',        icon: Palette },
  { key: 'roles',         label: 'Roles & Access', icon: Users },
  { key: 'data',          label: 'Data & Backup',  icon: Database },
  { key: 'audit',         label: 'Audit Log',      icon: Clock },
]

/* ================================================================== */
/* Toggle Switch                                                      */
/* ================================================================== */
function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="settings-toggle-row">
      <div className="settings-toggle-info">
        <span className="settings-toggle-label">{label}</span>
        {description && <span className="settings-toggle-desc">{description}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`settings-switch ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="settings-switch-thumb" />
      </button>
    </label>
  )
}

/* ================================================================== */
/* Main component                                                     */
/* ================================================================== */
export default function Settings() {
  const { user, can } = useAuth()
  const [activeTab, setActiveTab] = useState('general')
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)

  /* Flat key-value map of all settings */
  const [settings, setSettings] = useState({ ...DEFAULTS })

  /* ---- Load settings from API ---- */
  useEffect(() => {
    settingsApi.getAll()
      .then((res) => {
        const groups = res?.data?.settings || {}
        const flat = {}
        Object.values(groups).forEach((arr) => {
          if (Array.isArray(arr)) {
            arr.forEach((s) => { flat[s.key] = s.type === 'boolean' ? (s.value === true || s.value === 1 || s.value === '1') : s.value })
          }
        })
        setSettings((prev) => ({ ...prev, ...flat }))
      })
      .catch(() => { /* non-super_admin will get 403 — keep defaults */ })
      .finally(() => setLoading(false))
  }, [])

  function s(key) { return settings[key] ?? DEFAULTS[key] ?? '' }
  function set(key, val) { setSettings((p) => ({ ...p, [key]: val })) }

  /* ---- Roles ---- */
  const [roles, setRoles] = useState([])
  const [rolesLoading, setRolesLoading] = useState(false)

  useEffect(() => {
    if (activeTab === 'roles' && roles.length === 0) {
      setRolesLoading(true)
      settingsApi.listRoles().then((res) => setRoles(extractItems(res))).catch(() => {}).finally(() => setRolesLoading(false))
    }
  }, [activeTab, roles.length])

  /* ---- Audit ---- */
  const [audit, setAudit] = useState([])
  const [auditMeta, setAuditMeta] = useState(null)
  const [auditPage, setAuditPage] = useState(1)
  const [auditLoading, setAuditLoading] = useState(false)

  useEffect(() => {
    if (activeTab === 'audit') {
      setAuditLoading(true)
      settingsApi.auditLog({ page: auditPage, per_page: 15 })
        .then((res) => { setAudit(extractItems(res)); setAuditMeta(extractMeta(res)) })
        .catch(() => {})
        .finally(() => setAuditLoading(false))
    }
  }, [activeTab, auditPage])

  /* ---- Toast helper ---- */
  const showToast = useCallback((type, text) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3000)
  }, [])

  /* ---- Save handler — bulk update to API ---- */
  async function handleSave(section, keys) {
    try {
      const payload = {}
      keys.forEach((k) => { payload[k] = settings[k] })
      await settingsApi.bulkUpdate(payload)
      showToast('success', `${section} settings saved successfully.`)
    } catch (err) {
      showToast('error', err.message || 'Failed to save settings.')
    }
  }

  /* ================================================================ */
  /* Tab: Organization                                                */
  /* ================================================================ */
  function renderGeneral() {
    return (
      <div className="settings-section animate-in">
        <div className="settings-section-header">
          <div>
            <h3>Organization Profile</h3>
            <p>Basic information about your organization</p>
          </div>
        </div>

        <div className="settings-form">
          <div className="settings-form-row">
            <div className="hr-form-field">
              <label>Organization Name</label>
              <input type="text" value={s('organization_name')} onChange={(e) => set('organization_name', e.target.value)} />
            </div>
            <div className="hr-form-field">
              <label>Acronym</label>
              <input type="text" value={s('organization_acronym')} onChange={(e) => set('organization_acronym', e.target.value)} />
            </div>
          </div>

          <div className="settings-form-row">
            <div className="hr-form-field">
              <label><Mail size={14} /> Email Address</label>
              <input type="email" value={s('organization_email')} onChange={(e) => set('organization_email', e.target.value)} />
            </div>
            <div className="hr-form-field">
              <label><Phone size={14} /> Phone Number</label>
              <input type="tel" value={s('organization_phone')} onChange={(e) => set('organization_phone', e.target.value)} />
            </div>
          </div>

          <div className="settings-form-row">
            <div className="hr-form-field">
              <label><Globe size={14} /> Website</label>
              <input type="url" value={s('organization_website')} onChange={(e) => set('organization_website', e.target.value)} />
            </div>
            <div className="hr-form-field">
              <label>Year Founded</label>
              <input type="text" value={s('organization_founded')} onChange={(e) => set('organization_founded', e.target.value)} />
            </div>
          </div>

          <div className="hr-form-field">
            <label><MapPin size={14} /> Address</label>
            <input type="text" value={s('organization_address')} onChange={(e) => set('organization_address', e.target.value)} />
          </div>

          <div className="settings-form-row">
            <div className="hr-form-field">
              <label>State</label>
              <input type="text" value={s('organization_state')} onChange={(e) => set('organization_state', e.target.value)} />
            </div>
            <div className="hr-form-field">
              <label>Country</label>
              <input type="text" value={s('organization_country')} onChange={(e) => set('organization_country', e.target.value)} />
            </div>
          </div>

          <div className="settings-form-row">
            <div className="hr-form-field">
              <label>Registration Number</label>
              <input type="text" value={s('organization_registration_number')} onChange={(e) => set('organization_registration_number', e.target.value)} />
            </div>
            <div className="hr-form-field">
              <label>Tax ID (TIN)</label>
              <input type="text" value={s('organization_tax_id')} onChange={(e) => set('organization_tax_id', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="settings-section-footer">
          <button className="hr-btn-primary" onClick={() => handleSave('Organization', ['organization_name','organization_acronym','organization_email','organization_phone','organization_website','organization_address','organization_state','organization_country','organization_registration_number','organization_tax_id','organization_founded'])}>
            <Save size={15} /> Save Changes
          </button>
        </div>
      </div>
    )
  }

  /* ================================================================ */
  /* Tab: Notifications                                               */
  /* ================================================================ */
  function renderNotifications() {
    return (
      <div className="settings-section animate-in">
        <div className="settings-section-header">
          <div>
            <h3>Notification Preferences</h3>
            <p>Choose how you want to be notified</p>
          </div>
        </div>

        <div className="settings-toggle-group">
          <div className="settings-toggle-group-title">Channels</div>
          <Toggle checked={!!s('notifications_email_alerts')} onChange={(v) => set('notifications_email_alerts', v)} label="Email Alerts" description="Receive notifications via email" />
          <Toggle checked={!!s('notifications_sms_alerts')} onChange={(v) => set('notifications_sms_alerts', v)} label="SMS Alerts" description="Receive notifications via SMS" />
          <Toggle checked={!!s('notifications_push')} onChange={(v) => set('notifications_push', v)} label="Push Notifications" description="Browser push notifications" />
        </div>

        <div className="settings-toggle-group">
          <div className="settings-toggle-group-title">Activity</div>
          <Toggle checked={!!s('notifications_weekly_digest')} onChange={(v) => set('notifications_weekly_digest', v)} label="Weekly Digest" description="A summary email every Monday" />
          <Toggle checked={!!s('notifications_mention_alerts')} onChange={(v) => set('notifications_mention_alerts', v)} label="Mention Alerts" description="When someone mentions you" />
          <Toggle checked={!!s('notifications_approval_alerts')} onChange={(v) => set('notifications_approval_alerts', v)} label="Approval Requests" description="Pending approvals that need your attention" />
        </div>

        <div className="settings-toggle-group">
          <div className="settings-toggle-group-title">System</div>
          <Toggle checked={!!s('notifications_system_updates')} onChange={(v) => set('notifications_system_updates', v)} label="System Updates" description="Platform updates and maintenance notices" />
          <Toggle checked={!!s('notifications_security_alerts')} onChange={(v) => set('notifications_security_alerts', v)} label="Security Alerts" description="Suspicious activity and login alerts" />
        </div>

        <div className="settings-section-footer">
          <button className="hr-btn-primary" onClick={() => handleSave('Notification', ['notifications_email_alerts','notifications_sms_alerts','notifications_push','notifications_weekly_digest','notifications_mention_alerts','notifications_approval_alerts','notifications_system_updates','notifications_security_alerts'])}>
            <Save size={15} /> Save Preferences
          </button>
        </div>
      </div>
    )
  }

  /* ================================================================ */
  /* Tab: Security                                                    */
  /* ================================================================ */
  function renderSecurity() {
    return (
      <div className="settings-section animate-in">
        <div className="settings-section-header">
          <div>
            <h3>Security Settings</h3>
            <p>Protect your organization's data</p>
          </div>
        </div>

        <div className="settings-toggle-group">
          <Toggle checked={!!s('security_two_factor')} onChange={(v) => set('security_two_factor', v)} label="Two-Factor Authentication" description="Require a second verification step on login" />
          <Toggle checked={!!s('security_strong_passwords')} onChange={(v) => set('security_strong_passwords', v)} label="Enforce Strong Passwords" description="Min 8 chars, uppercase, number, and special character" />
        </div>

        <div className="settings-form">
          <div className="settings-form-row">
            <div className="hr-form-field">
              <label><Clock size={14} /> Session Timeout (minutes)</label>
              <select value={s('security_session_timeout')} onChange={(e) => set('security_session_timeout', e.target.value)}>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="480">8 hours</option>
              </select>
            </div>
            <div className="hr-form-field">
              <label><Key size={14} /> Password Expiry (days)</label>
              <select value={s('security_password_expiry')} onChange={(e) => set('security_password_expiry', e.target.value)}>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="0">Never</option>
              </select>
            </div>
          </div>

          <div className="settings-form-row">
            <div className="hr-form-field">
              <label><Lock size={14} /> Max Login Attempts</label>
              <select value={s('security_max_login_attempts')} onChange={(e) => set('security_max_login_attempts', e.target.value)}>
                <option value="3">3 attempts</option>
                <option value="5">5 attempts</option>
                <option value="10">10 attempts</option>
              </select>
            </div>
            <div className="hr-form-field">
              <label><Shield size={14} /> IP Whitelist</label>
              <input type="text" value={s('security_ip_whitelist')} onChange={(e) => set('security_ip_whitelist', e.target.value)} placeholder="e.g. 192.168.1.0/24 (comma separated)" />
            </div>
          </div>
        </div>

        <div className="settings-section-footer">
          <button className="hr-btn-primary" onClick={() => handleSave('Security', ['security_two_factor','security_session_timeout','security_password_expiry','security_max_login_attempts','security_ip_whitelist','security_strong_passwords'])}>
            <Save size={15} /> Save Security Settings
          </button>
        </div>
      </div>
    )
  }

  /* ================================================================ */
  /* Tab: Display                                                     */
  /* ================================================================ */
  function renderDisplay() {
    return (
      <div className="settings-section animate-in">
        <div className="settings-section-header">
          <div>
            <h3>Display & Localization</h3>
            <p>Regional settings and display preferences</p>
          </div>
        </div>

        <div className="settings-form">
          <div className="settings-form-row">
            <div className="hr-form-field">
              <label><Languages size={14} /> Language</label>
              <select value={s('display_language')} onChange={(e) => set('display_language', e.target.value)}>
                <option value="en">English</option>
                <option value="fr">French</option>
                <option value="ha">Hausa</option>
                <option value="ig">Igbo</option>
                <option value="yo">Yoruba</option>
              </select>
            </div>
            <div className="hr-form-field">
              <label><Clock size={14} /> Timezone</label>
              <select value={s('display_timezone')} onChange={(e) => set('display_timezone', e.target.value)}>
                <option value="Africa/Lagos">Africa/Lagos (WAT, UTC+1)</option>
                <option value="Africa/Nairobi">Africa/Nairobi (EAT, UTC+3)</option>
                <option value="Europe/London">Europe/London (GMT, UTC+0)</option>
                <option value="America/New_York">America/New_York (EST, UTC−5)</option>
              </select>
            </div>
          </div>

          <div className="settings-form-row">
            <div className="hr-form-field">
              <label><CalendarDays size={14} /> Date Format</label>
              <select value={s('display_date_format')} onChange={(e) => set('display_date_format', e.target.value)}>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div className="hr-form-field">
              <label>Currency</label>
              <select value={s('display_currency')} onChange={(e) => set('display_currency', e.target.value)}>
                <option value="NGN">Nigerian Naira (₦)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="GBP">British Pound (£)</option>
                <option value="EUR">Euro (€)</option>
                <option value="KES">Kenyan Shilling (KSh)</option>
              </select>
            </div>
          </div>

          <div className="settings-form-row">
            <div className="hr-form-field">
              <label>Items Per Page</label>
              <select value={s('display_items_per_page')} onChange={(e) => set('display_items_per_page', e.target.value)}>
                <option value="10">10</option>
                <option value="15">15</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <div className="hr-form-field" />
          </div>
        </div>

        <div className="settings-section-footer">
          <button className="hr-btn-primary" onClick={() => handleSave('Display', ['display_language','display_timezone','display_date_format','display_currency','display_items_per_page'])}>
            <Save size={15} /> Save Display Settings
          </button>
        </div>
      </div>
    )
  }

  /* ================================================================ */
  /* Tab: Roles & Access                                              */
  /* ================================================================ */
  function renderRoles() {
    const ROLE_COLORS = { super_admin: '#e74c3c', admin: '#2563eb', manager: '#8b5cf6', staff: '#10b981' }
    return (
      <div className="settings-section animate-in">
        <div className="settings-section-header">
          <div>
            <h3>Roles & Access Control</h3>
            <p>System roles are read-only</p>
          </div>
        </div>

        <div className="settings-roles-list">
          {rolesLoading ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Loading roles…</div>
          ) : roles.map((role) => (
            <div className="settings-role-card" key={role.id || role.slug}>
              <div className="settings-role-left">
                <span className="settings-role-dot" style={{ background: ROLE_COLORS[role.slug] || '#64748b' }} />
                <div>
                  <div className="settings-role-name">{role.name}</div>
                  <div className="settings-role-perm">{role.description || role.slug}</div>
                </div>
              </div>
              <div className="settings-role-right">
                <span className="settings-role-count"><Users size={14} /> {role.user_count ?? 0} users</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  /* ================================================================ */
  /* Tab: Data & Backup                                               */
  /* ================================================================ */
  function renderData() {
    const [exportFormat, setExportFormat] = useState('csv')
    const [importFile, setImportFile] = useState(null)

    async function handleExport() {
      try {
        await settingsApi.exportData({ format: exportFormat })
        showToast('success', 'Data export started. You will receive an email when ready.')
      } catch { showToast('error', 'Export failed.') }
    }

    async function handleImport() {
      if (!importFile) { showToast('info', 'Please select a file first.'); return }
      try {
        const fd = new FormData()
        fd.append('file', importFile)
        await settingsApi.importData(fd)
        showToast('success', 'Data imported successfully.')
        setImportFile(null)
      } catch { showToast('error', 'Import failed.') }
    }

    async function handleBackup() {
      try {
        await settingsApi.backup()
        showToast('success', 'Backup initiated. This may take a few minutes.')
      } catch { showToast('error', 'Backup failed.') }
    }

    return (
      <div className="settings-section animate-in">
        <div className="settings-section-header">
          <div>
            <h3>Data Management & Backup</h3>
            <p>Export data, create backups, and manage storage</p>
          </div>
        </div>

        <div className="settings-data-cards">
          <div className="settings-data-card">
            <div className="settings-data-icon blue"><Download size={22} /></div>
            <div className="settings-data-info">
              <h4>Export Data</h4>
              <p>Download organization data as CSV or Excel files for reporting and analysis.</p>
              <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} style={{ marginTop: 8, maxWidth: 160 }}>
                <option value="csv">CSV</option>
                <option value="xlsx">Excel (XLSX)</option>
              </select>
            </div>
            <button className="hr-btn-secondary" onClick={handleExport}>
              <Download size={14} /> Export
            </button>
          </div>

          <div className="settings-data-card">
            <div className="settings-data-icon green"><Upload size={22} /></div>
            <div className="settings-data-info">
              <h4>Import Data</h4>
              <p>Bulk import employees, departments, or other records from CSV files.</p>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setImportFile(e.target.files[0] || null)} style={{ marginTop: 8 }} />
            </div>
            <button className="hr-btn-secondary" onClick={handleImport}>
              <Upload size={14} /> Import
            </button>
          </div>

          <div className="settings-data-card">
            <div className="settings-data-icon purple"><Database size={22} /></div>
            <div className="settings-data-info">
              <h4>Create Backup</h4>
              <p>Generate a full backup of all data. Backups are encrypted and stored securely.</p>
            </div>
            <button className="hr-btn-secondary" onClick={handleBackup}>
              <Database size={14} /> Backup Now
            </button>
          </div>

          <div className="settings-data-card danger-border">
            <div className="settings-data-icon red"><Trash2 size={22} /></div>
            <div className="settings-data-info">
              <h4>Purge Old Data</h4>
              <p>Permanently delete records older than a specified date. This cannot be undone.</p>
            </div>
            <button className="hr-btn-danger" onClick={() => showToast('info', 'Data purge is not yet available.')}>
              <Trash2 size={14} /> Purge
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ================================================================ */
  /* Tab: Audit Log                                                   */
  /* ================================================================ */
  function renderAudit() {
    return (
      <div className="settings-section animate-in">
        <div className="settings-section-header">
          <div>
            <h3>Audit Log</h3>
            <p>Track all actions performed in the system</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Module</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {auditLoading ? (
                <tr><td colSpan={4} className="hr-empty-cell">Loading…</td></tr>
              ) : audit.length === 0 ? (
                <tr><td colSpan={4} className="hr-empty-cell">No audit entries found</td></tr>
              ) : audit.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{a.user || a.user_name || '—'}</td>
                  <td>{a.action || a.description || '—'}</td>
                  <td>
                    <span className={`status-badge ${a.module === 'Settings' ? 'active' : a.module === 'Security' ? 'approved' : 'pending'}`}>
                      <span className="status-dot" />
                      {a.module || '—'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(a.timestamp || a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {auditMeta && <Pagination meta={auditMeta} onPageChange={setAuditPage} />}
      </div>
    )
  }

  /* ================================================================ */
  /* Render                                                           */
  /* ================================================================ */
  const RENDERERS = {
    general: renderGeneral,
    notifications: renderNotifications,
    security: renderSecurity,
    display: renderDisplay,
    roles: renderRoles,
    data: renderData,
    audit: renderAudit,
  }

  return (
    <div className="settings-layout">
      {/* Sidebar Tabs */}
      <aside className="settings-sidebar card animate-in">
        <div className="settings-sidebar-header">
          <h3>Settings</h3>
          <p>Manage your workspace</p>
        </div>
        <nav className="settings-nav">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                className={`settings-nav-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon size={17} />
                <span>{tab.label}</span>
                <ChevronRight size={14} className="settings-nav-chevron" />
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Content Panel */}
      <div className="settings-content">
        {RENDERERS[activeTab]?.()}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`settings-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  )
}
