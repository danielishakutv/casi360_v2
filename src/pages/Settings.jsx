import { useState, useCallback } from 'react'
import {
  Building2, Globe, Mail, Phone, MapPin,
  Bell, Shield, Key, Lock,
  Palette, Languages,
  Database, Download, Upload, Trash2,
  Users, UserPlus,
  Clock, CalendarDays,
  Save, CheckCircle2, AlertCircle, ChevronRight,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

/* ================================================================== */
/* Demo data — replace with live API calls later                      */
/* ================================================================== */

const DEMO_ORG = {
  name: 'Care Aid Support Initiative',
  acronym: 'CASI',
  email: 'info@casi.org.ng',
  phone: '+234 803 456 7890',
  website: 'https://www.casi.org.ng',
  address: '14 Maitama Crescent, Abuja',
  state: 'FCT — Abuja',
  country: 'Nigeria',
  registrationNumber: 'RC-12345678',
  taxId: 'TIN-98765432',
  founded: '2018',
}

const DEMO_NOTIFICATIONS = {
  emailAlerts: true,
  smsAlerts: false,
  pushNotifications: true,
  weeklyDigest: true,
  mentionAlerts: true,
  approvalAlerts: true,
  systemUpdates: false,
  securityAlerts: true,
}

const DEMO_SECURITY = {
  twoFactorEnabled: false,
  sessionTimeout: '60',
  passwordExpiry: '90',
  maxLoginAttempts: '5',
  ipWhitelist: '',
  enforceStrongPasswords: true,
}

const DEMO_DISPLAY = {
  language: 'en',
  timezone: 'Africa/Lagos',
  dateFormat: 'DD/MM/YYYY',
  currency: 'NGN',
  itemsPerPage: '15',
}

const DEMO_ROLES = [
  { id: 1, name: 'Super Admin', users: 2,  color: '#e74c3c', permissions: 'Full system access' },
  { id: 2, name: 'Admin',       users: 4,  color: '#2563eb', permissions: 'Manage users, modules, and settings' },
  { id: 3, name: 'Manager',     users: 8,  color: '#8b5cf6', permissions: 'Manage assigned modules and staff' },
  { id: 4, name: 'Staff',       users: 22, color: '#10b981', permissions: 'View and create records' },
  { id: 5, name: 'Viewer',      users: 5,  color: '#64748b', permissions: 'Read-only access' },
]

const DEMO_AUDIT = [
  { id: 1, user: 'Amina Yusuf',   action: 'Updated organization profile',        module: 'Settings',     time: '2 hours ago' },
  { id: 2, user: 'Chidi Okafor',   action: 'Created new employee record',         module: 'HR',           time: '3 hours ago' },
  { id: 3, user: 'Tunde Adebayo',  action: 'Approved purchase request PR-2026-002', module: 'Procurement', time: '5 hours ago' },
  { id: 4, user: 'Fatima Bello',   action: 'Changed role for Kola Adekunle',      module: 'Settings',     time: '1 day ago' },
  { id: 5, user: 'Admin',          action: 'Enabled two-factor authentication',   module: 'Security',     time: '1 day ago' },
  { id: 6, user: 'Ngozi Eze',      action: 'Exported employee report (CSV)',      module: 'Reports',      time: '2 days ago' },
  { id: 7, user: 'Emeka Nwankwo',  action: 'Deleted draft purchase order',        module: 'Procurement',  time: '2 days ago' },
  { id: 8, user: 'Bola Fashola',   action: 'Updated notification preferences',    module: 'Settings',     time: '3 days ago' },
]

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
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('general')
  const [toast, setToast] = useState(null)

  /* ---- Organization ---- */
  const [org, setOrg] = useState(DEMO_ORG)

  /* ---- Notifications ---- */
  const [notif, setNotif] = useState(DEMO_NOTIFICATIONS)

  /* ---- Security ---- */
  const [security, setSecurity] = useState(DEMO_SECURITY)

  /* ---- Display ---- */
  const [display, setDisplay] = useState(DEMO_DISPLAY)

  /* ---- Roles ---- */
  const [roles] = useState(DEMO_ROLES)

  /* ---- Audit ---- */
  const [audit] = useState(DEMO_AUDIT)

  /* ---- Toast helper ---- */
  const showToast = useCallback((type, text) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3000)
  }, [])

  /* ---- Save handler (demo) ---- */
  function handleSave(section) {
    showToast('success', `${section} settings saved successfully.`)
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
              <input type="text" value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
            </div>
            <div className="hr-form-field">
              <label>Acronym</label>
              <input type="text" value={org.acronym} onChange={(e) => setOrg({ ...org, acronym: e.target.value })} />
            </div>
          </div>

          <div className="settings-form-row">
            <div className="hr-form-field">
              <label><Mail size={14} /> Email Address</label>
              <input type="email" value={org.email} onChange={(e) => setOrg({ ...org, email: e.target.value })} />
            </div>
            <div className="hr-form-field">
              <label><Phone size={14} /> Phone Number</label>
              <input type="tel" value={org.phone} onChange={(e) => setOrg({ ...org, phone: e.target.value })} />
            </div>
          </div>

          <div className="settings-form-row">
            <div className="hr-form-field">
              <label><Globe size={14} /> Website</label>
              <input type="url" value={org.website} onChange={(e) => setOrg({ ...org, website: e.target.value })} />
            </div>
            <div className="hr-form-field">
              <label>Year Founded</label>
              <input type="text" value={org.founded} onChange={(e) => setOrg({ ...org, founded: e.target.value })} />
            </div>
          </div>

          <div className="hr-form-field">
            <label><MapPin size={14} /> Address</label>
            <input type="text" value={org.address} onChange={(e) => setOrg({ ...org, address: e.target.value })} />
          </div>

          <div className="settings-form-row">
            <div className="hr-form-field">
              <label>State</label>
              <input type="text" value={org.state} onChange={(e) => setOrg({ ...org, state: e.target.value })} />
            </div>
            <div className="hr-form-field">
              <label>Country</label>
              <input type="text" value={org.country} onChange={(e) => setOrg({ ...org, country: e.target.value })} />
            </div>
          </div>

          <div className="settings-form-row">
            <div className="hr-form-field">
              <label>Registration Number</label>
              <input type="text" value={org.registrationNumber} onChange={(e) => setOrg({ ...org, registrationNumber: e.target.value })} />
            </div>
            <div className="hr-form-field">
              <label>Tax ID (TIN)</label>
              <input type="text" value={org.taxId} onChange={(e) => setOrg({ ...org, taxId: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="settings-section-footer">
          <button className="hr-btn-primary" onClick={() => handleSave('Organization')}>
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
    function setN(key, val) { setNotif((prev) => ({ ...prev, [key]: val })) }
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
          <Toggle checked={notif.emailAlerts} onChange={(v) => setN('emailAlerts', v)} label="Email Alerts" description="Receive notifications via email" />
          <Toggle checked={notif.smsAlerts} onChange={(v) => setN('smsAlerts', v)} label="SMS Alerts" description="Receive notifications via SMS" />
          <Toggle checked={notif.pushNotifications} onChange={(v) => setN('pushNotifications', v)} label="Push Notifications" description="Browser push notifications" />
        </div>

        <div className="settings-toggle-group">
          <div className="settings-toggle-group-title">Activity</div>
          <Toggle checked={notif.weeklyDigest} onChange={(v) => setN('weeklyDigest', v)} label="Weekly Digest" description="A summary email every Monday" />
          <Toggle checked={notif.mentionAlerts} onChange={(v) => setN('mentionAlerts', v)} label="Mention Alerts" description="When someone mentions you" />
          <Toggle checked={notif.approvalAlerts} onChange={(v) => setN('approvalAlerts', v)} label="Approval Requests" description="Pending approvals that need your attention" />
        </div>

        <div className="settings-toggle-group">
          <div className="settings-toggle-group-title">System</div>
          <Toggle checked={notif.systemUpdates} onChange={(v) => setN('systemUpdates', v)} label="System Updates" description="Platform updates and maintenance notices" />
          <Toggle checked={notif.securityAlerts} onChange={(v) => setN('securityAlerts', v)} label="Security Alerts" description="Suspicious activity and login alerts" />
        </div>

        <div className="settings-section-footer">
          <button className="hr-btn-primary" onClick={() => handleSave('Notification')}>
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
    function setS(key, val) { setSecurity((prev) => ({ ...prev, [key]: val })) }
    return (
      <div className="settings-section animate-in">
        <div className="settings-section-header">
          <div>
            <h3>Security Settings</h3>
            <p>Protect your organization's data</p>
          </div>
        </div>

        <div className="settings-toggle-group">
          <Toggle checked={security.twoFactorEnabled} onChange={(v) => setS('twoFactorEnabled', v)} label="Two-Factor Authentication" description="Require a second verification step on login" />
          <Toggle checked={security.enforceStrongPasswords} onChange={(v) => setS('enforceStrongPasswords', v)} label="Enforce Strong Passwords" description="Min 8 chars, uppercase, number, and special character" />
        </div>

        <div className="settings-form">
          <div className="settings-form-row">
            <div className="hr-form-field">
              <label><Clock size={14} /> Session Timeout (minutes)</label>
              <select value={security.sessionTimeout} onChange={(e) => setS('sessionTimeout', e.target.value)}>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="480">8 hours</option>
              </select>
            </div>
            <div className="hr-form-field">
              <label><Key size={14} /> Password Expiry (days)</label>
              <select value={security.passwordExpiry} onChange={(e) => setS('passwordExpiry', e.target.value)}>
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
              <select value={security.maxLoginAttempts} onChange={(e) => setS('maxLoginAttempts', e.target.value)}>
                <option value="3">3 attempts</option>
                <option value="5">5 attempts</option>
                <option value="10">10 attempts</option>
              </select>
            </div>
            <div className="hr-form-field">
              <label><Shield size={14} /> IP Whitelist</label>
              <input type="text" value={security.ipWhitelist} onChange={(e) => setS('ipWhitelist', e.target.value)} placeholder="e.g. 192.168.1.0/24 (comma separated)" />
            </div>
          </div>
        </div>

        <div className="settings-section-footer">
          <button className="hr-btn-primary" onClick={() => handleSave('Security')}>
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
    function setD(key, val) { setDisplay((prev) => ({ ...prev, [key]: val })) }
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
              <select value={display.language} onChange={(e) => setD('language', e.target.value)}>
                <option value="en">English</option>
                <option value="fr">French</option>
                <option value="ha">Hausa</option>
                <option value="ig">Igbo</option>
                <option value="yo">Yoruba</option>
              </select>
            </div>
            <div className="hr-form-field">
              <label><Clock size={14} /> Timezone</label>
              <select value={display.timezone} onChange={(e) => setD('timezone', e.target.value)}>
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
              <select value={display.dateFormat} onChange={(e) => setD('dateFormat', e.target.value)}>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div className="hr-form-field">
              <label>Currency</label>
              <select value={display.currency} onChange={(e) => setD('currency', e.target.value)}>
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
              <select value={display.itemsPerPage} onChange={(e) => setD('itemsPerPage', e.target.value)}>
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
          <button className="hr-btn-primary" onClick={() => handleSave('Display')}>
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
    return (
      <div className="settings-section animate-in">
        <div className="settings-section-header">
          <div>
            <h3>Roles & Access Control</h3>
            <p>Manage user roles and permissions</p>
          </div>
          <button className="hr-btn-primary" onClick={() => showToast('info', 'Role creation will be available with backend integration.')}>
            <UserPlus size={15} /> Add Role
          </button>
        </div>

        <div className="settings-roles-list">
          {roles.map((role) => (
            <div className="settings-role-card" key={role.id}>
              <div className="settings-role-left">
                <span className="settings-role-dot" style={{ background: role.color }} />
                <div>
                  <div className="settings-role-name">{role.name}</div>
                  <div className="settings-role-perm">{role.permissions}</div>
                </div>
              </div>
              <div className="settings-role-right">
                <span className="settings-role-count"><Users size={14} /> {role.users} users</span>
                <button className="hr-action-btn" title="Edit role" onClick={() => showToast('info', 'Role editing will be available with backend integration.')}>
                  <ChevronRight size={15} />
                </button>
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
            </div>
            <button className="hr-btn-secondary" onClick={() => showToast('success', 'Data export started. You will receive an email when ready.')}>
              <Download size={14} /> Export
            </button>
          </div>

          <div className="settings-data-card">
            <div className="settings-data-icon green"><Upload size={22} /></div>
            <div className="settings-data-info">
              <h4>Import Data</h4>
              <p>Bulk import employees, departments, or other records from CSV files.</p>
            </div>
            <button className="hr-btn-secondary" onClick={() => showToast('info', 'Data import will be available with backend integration.')}>
              <Upload size={14} /> Import
            </button>
          </div>

          <div className="settings-data-card">
            <div className="settings-data-icon purple"><Database size={22} /></div>
            <div className="settings-data-info">
              <h4>Create Backup</h4>
              <p>Generate a full backup of all data. Backups are encrypted and stored securely.</p>
            </div>
            <button className="hr-btn-secondary" onClick={() => showToast('success', 'Backup initiated. This may take a few minutes.')}>
              <Database size={14} /> Backup Now
            </button>
          </div>

          <div className="settings-data-card danger-border">
            <div className="settings-data-icon red"><Trash2 size={22} /></div>
            <div className="settings-data-info">
              <h4>Purge Old Data</h4>
              <p>Permanently delete records older than a specified date. This cannot be undone.</p>
            </div>
            <button className="hr-btn-danger" onClick={() => showToast('info', 'Data purge will be available with backend integration.')}>
              <Trash2 size={14} /> Purge
            </button>
          </div>
        </div>

        <div className="settings-storage-bar">
          <div className="settings-storage-header">
            <span>Storage Used</span>
            <span>2.4 GB / 10 GB</span>
          </div>
          <div className="settings-storage-track">
            <div className="settings-storage-fill" style={{ width: '24%' }} />
          </div>
          <div className="settings-storage-breakdown">
            <span><span className="settings-legend-dot blue" /> Documents — 1.2 GB</span>
            <span><span className="settings-legend-dot green" /> Database — 800 MB</span>
            <span><span className="settings-legend-dot purple" /> Backups — 400 MB</span>
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
          <button className="hr-btn-secondary" onClick={() => showToast('success', 'Audit log exported.')}>
            <Download size={14} /> Export Log
          </button>
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
              {audit.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{a.user}</td>
                  <td>{a.action}</td>
                  <td>
                    <span className={`status-badge ${a.module === 'Settings' ? 'active' : a.module === 'Security' ? 'approved' : 'pending'}`}>
                      <span className="status-dot" />
                      {a.module}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
