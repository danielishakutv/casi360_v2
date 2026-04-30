import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, Users, Shield, Check, AlertCircle, ChevronDown, ChevronUp, Info, Lock } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { settingsApi } from '../../services/api'
import { extractItems } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'

/* Plain-language descriptions for each built-in role. */
const ROLE_INFO = {
  super_admin: {
    color: 'purple',
    label: 'Super Admin',
    plain: 'Has full access to everything. This role is locked and cannot be changed.',
  },
  admin: {
    color: 'blue',
    label: 'Administrator',
    plain: 'Manages day-to-day work across all departments. Can do most things except change Super Admin settings.',
  },
  manager: {
    color: 'green',
    label: 'Manager',
    plain: 'Department-level supervisor. Approves submissions and oversees their team.',
  },
  staff: {
    color: 'gray',
    label: 'Staff',
    plain: 'Regular team member. Can do their own work but cannot approve other people or change settings.',
  },
}

/* Friendly names + plain descriptions per module/area. */
const MODULE_INFO = {
  hr:              { label: 'Staff & HR',          plain: 'Employees, departments, leave, attendance and payroll.' },
  procurement:     { label: 'Procurement',         plain: 'Purchase requests, vendors, RFQs, POs, BOQs and approvals.' },
  programs:        { label: 'Programs',            plain: 'Activities, beneficiaries and field programs.' },
  projects:        { label: 'Projects',            plain: 'Project planning, tracking and reporting.' },
  finance:         { label: 'Finance',             plain: 'Budgets, expenses and financial controls.' },
  operations:      { label: 'Operations',          plain: 'Logistics, inventory and field operations.' },
  ops:             { label: 'Operations',          plain: 'Logistics, inventory and field operations.' },
  communication:   { label: 'Communication',       plain: 'Internal messages, forums and notices.' },
  reports:         { label: 'Reports',             plain: 'Cross-module reports and analytics.' },
  settings:        { label: 'System Settings',     plain: 'System configuration, audit log and data tools.' },
  auth:            { label: 'Users & Accounts',    plain: 'User accounts, login and account-level controls.' },
  user_management: { label: 'User Management',     plain: 'User accounts and role assignment.' },
}

const ACTION_VERB = {
  view: 'View',
  list: 'View',
  read: 'View',
  create: 'Create',
  add: 'Add',
  edit: 'Edit',
  update: 'Edit',
  delete: 'Delete',
  remove: 'Remove',
  approve: 'Approve',
  reject: 'Reject',
  submit: 'Submit',
  export: 'Export',
  import: 'Import',
  assign: 'Assign',
  manage: 'Manage',
  self_approve: 'Approve own',
}

/* Build a friendly title for the permission row. */
function permTitle(perm) {
  if (perm.name && perm.name.trim() && perm.name !== perm.key) return perm.name
  const parts = (perm.key || '').split('.')
  if (parts.length < 2) return capitalize((perm.key || '').replace(/_/g, ' '))
  const action = parts[parts.length - 1]
  const feature = parts.slice(1, -1).join(' ').replace(/_/g, ' ')
  const verb = ACTION_VERB[action] || capitalize(action.replace(/_/g, ' '))
  return `${verb} ${feature}`.trim()
}

/* Build a plain-language sentence for a permission. */
function permDescription(perm) {
  if (perm.description && perm.description.trim()) return perm.description
  return permTitle(perm)
}

/* Read whether a role has a permission. Backend returns roles as object map; legacy as array. */
function isAllowed(perm, role) {
  const r = perm.roles
  if (!r) return false
  if (Array.isArray(r)) return r.includes(role)
  return r[role] === true
}

export default function RolesAccess() {
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [expandedRole, setExpandedRole] = useState(null)
  const [roleUsers, setRoleUsers] = useState({})
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [moduleFilter, setModuleFilter] = useState('')
  const [saving, setSaving] = useState({})
  const [collapsed, setCollapsed] = useState({})

  const fetchData = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [rolesRes, permRes] = await Promise.all([
        settingsApi.listRoles(),
        settingsApi.getPermissions(),
      ])
      const rolesData = rolesRes?.data?.roles || extractItems(rolesRes)
      const permData = permRes?.data?.permissions || extractItems(permRes)
      setRoles(rolesData)
      setPermissions(permData)
    } catch (err) { setError(err.message || 'Failed to load data') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  async function toggleExpand(roleSlug) {
    if (expandedRole === roleSlug) { setExpandedRole(null); return }
    setExpandedRole(roleSlug)
    if (!roleUsers[roleSlug]) {
      try {
        const res = await settingsApi.getRole(roleSlug)
        const users = res?.data?.role?.users || res?.data?.users || []
        setRoleUsers((prev) => ({ ...prev, [roleSlug]: users }))
      } catch { /* silent */ }
    }
  }

  async function handleToggle(perm, role) {
    const k = `${perm.id}-${role}`
    if (saving[k]) return
    const next = !isAllowed(perm, role)

    setSaving((prev) => ({ ...prev, [k]: true }))
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.id !== perm.id) return p
        const base = (p.roles && !Array.isArray(p.roles)) ? p.roles : {}
        return { ...p, roles: { ...base, [role]: next } }
      })
    )

    try {
      await settingsApi.updatePermission(perm.id, { role, allowed: next })
    } catch (err) {
      setPermissions((prev) =>
        prev.map((p) => {
          if (p.id !== perm.id) return p
          const base = (p.roles && !Array.isArray(p.roles)) ? p.roles : {}
          return { ...p, roles: { ...base, [role]: !next } }
        })
      )
      showToast(err.message || 'Failed to update permission', 'error')
    } finally {
      setSaving((prev) => ({ ...prev, [k]: false }))
    }
  }

  const groups = useMemo(() => {
    const g = {}
    permissions.forEach((p) => {
      const mod = p.module || (p.key || '').split('.')[0] || 'other'
      if (!g[mod]) g[mod] = []
      g[mod].push(p)
    })
    return g
  }, [permissions])

  const modules = useMemo(() => Object.keys(groups).sort(), [groups])

  const editableRoles = useMemo(() => {
    if (!roles.length) return ['admin', 'manager', 'staff']
    return roles
      .map((r) => r.slug || r.id || r.name)
      .filter((s) => s && s !== 'super_admin')
  }, [roles])

  const matchesSearch = useCallback((p) => {
    if (!debouncedSearch) return true
    const q = debouncedSearch.toLowerCase()
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.key || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      permDescription(p).toLowerCase().includes(q) ||
      permTitle(p).toLowerCase().includes(q)
    )
  }, [debouncedSearch])

  const visibleByModule = useMemo(() => {
    const out = {}
    for (const m of modules) {
      if (moduleFilter && m !== moduleFilter) continue
      const visible = groups[m].filter(matchesSearch)
      if (visible.length) out[m] = visible
    }
    return out
  }, [modules, moduleFilter, groups, matchesSearch])

  const visibleModules = Object.keys(visibleByModule)

  function toggleSection(mod) {
    setCollapsed((p) => ({ ...p, [mod]: !p[mod] }))
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="auth-spinner large" /></div>
  }

  return (
    <>
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

      {/* How-it-works helper */}
      <div className="ra-help">
        <Info size={18} />
        <div>
          <strong>How this page works.</strong> Each row below is one thing a user can do.
          Switch a role <em>on</em> to give every user with that role permission. Switch it
          <em> off</em> to take it away. Changes save automatically. Super Admin always has every
          permission and is not shown in the table.
        </div>
      </div>

      {/* Role overview cards */}
      <div className="ra-role-grid">
        {roles.map((role) => {
          const slug = role.slug || role.id || role.name
          const fallback = { color: 'gray', label: role.name || capitalize((slug || '').replace(/_/g, ' ')), plain: role.description || '' }
          const info = ROLE_INFO[slug] || fallback
          const isExpanded = expandedRole === slug
          const userCount = role.user_count ?? role.users_count ?? 0
          const isLocked = slug === 'super_admin'
          return (
            <div
              key={slug}
              className={`ra-role-card ${isExpanded ? 'expanded' : ''}`}
              onClick={() => toggleExpand(slug)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(slug) } }}
            >
              <div className="ra-role-head">
                <span className={`ra-role-badge ${info.color}`}>
                  {isLocked && <Lock size={11} />}
                  {info.label}
                </span>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              <p className="ra-role-plain">{info.plain || role.description}</p>
              <div className="ra-role-foot">
                <Users size={14} />
                <span>{userCount} {userCount === 1 ? 'user' : 'users'}</span>
              </div>
              {isExpanded && (
                <div className="ra-role-users" onClick={(e) => e.stopPropagation()}>
                  {roleUsers[slug] ? (
                    roleUsers[slug].length === 0
                      ? <p className="ra-empty">No users have this role yet.</p>
                      : roleUsers[slug].map((u) => (
                          <div key={u.id} className="ra-user-row">
                            <div className="ra-avatar">
                              {(u.name || '??').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div className="ra-user-info">
                              <div className="ra-user-name">{u.name}</div>
                              {u.email && <div className="ra-user-email">{u.email}</div>}
                            </div>
                          </div>
                        ))
                  ) : (
                    <div className="auth-spinner" style={{ margin: '4px auto' }} />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Permissions panel */}
      <div className="card animate-in ra-perm-wrap">
        <div className="ra-perm-toolbar">
          <div className="ra-perm-title">
            <Shield size={16} />
            <h3>Permissions</h3>
            <span className="ra-perm-count">{permissions.length}</span>
          </div>
          <div className="ra-perm-controls">
            <div className="search-box">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search what someone can do…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="hr-filter-select"
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              aria-label="Filter by area"
            >
              <option value="">All areas</option>
              {modules.map((m) => (
                <option key={m} value={m}>{MODULE_INFO[m]?.label || capitalize(m)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Desktop column header */}
        <div className="ra-matrix-head">
          <div className="ra-col-info">What the user can do</div>
          <div className="ra-col-cells">
            {editableRoles.map((r) => (
              <div key={r} className="ra-col-role">
                {ROLE_INFO[r]?.label || capitalize((r || '').replace(/_/g, ' '))}
              </div>
            ))}
          </div>
        </div>

        {visibleModules.length === 0 ? (
          <div className="ra-empty-state">
            <Shield size={28} />
            <p>No permissions match your search.</p>
            <button className="hr-btn-secondary" onClick={() => { setSearch(''); setModuleFilter('') }}>Clear filters</button>
          </div>
        ) : (
          visibleModules.map((mod) => {
            const visible = visibleByModule[mod]
            const info = MODULE_INFO[mod] || { label: capitalize(mod), plain: '' }
            const isCollapsed = collapsed[mod]
            return (
              <section key={mod} className="ra-section">
                <button
                  type="button"
                  className="ra-section-head"
                  onClick={() => toggleSection(mod)}
                  aria-expanded={!isCollapsed}
                >
                  <div className="ra-section-title">
                    {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    <span>{info.label}</span>
                    <span className="ra-section-count">{visible.length}</span>
                  </div>
                  {info.plain && <span className="ra-section-plain">{info.plain}</span>}
                </button>

                {!isCollapsed && (
                  <div className="ra-rows">
                    {visible.map((perm) => (
                      <div key={perm.id} className="ra-row">
                        <div className="ra-row-info">
                          <div className="ra-row-title">{permTitle(perm)}</div>
                          <div className="ra-row-desc">{permDescription(perm)}</div>
                          <div className="ra-row-key" title={perm.key}>{perm.key}</div>
                        </div>
                        <div className="ra-row-cells">
                          {editableRoles.map((r) => {
                            const isOn = isAllowed(perm, r)
                            const k = `${perm.id}-${r}`
                            const label = ROLE_INFO[r]?.label || capitalize(r)
                            return (
                              <div key={r} className="ra-cell">
                                <span className="ra-cell-label">{label}</span>
                                <button
                                  type="button"
                                  className={`settings-switch ${isOn ? 'on' : ''}`}
                                  onClick={() => handleToggle(perm, r)}
                                  disabled={!!saving[k]}
                                  aria-pressed={isOn}
                                  aria-label={`${permTitle(perm)} for ${label}`}
                                  title={`${permTitle(perm)} — ${label}: ${isOn ? 'Allowed' : 'Not allowed'}`}
                                >
                                  <span className="settings-switch-thumb" />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )
          })
        )}
      </div>

      <p className="ra-foot">
        Super Admin keeps every permission by default and isn't shown in the table.
      </p>
    </>
  )
}
