import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Save, AlertCircle, Search, ChevronRight, Check } from 'lucide-react'
import { settingsApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { capitalize } from '../utils/capitalize'

/* ================================================================== */
/* Permission grouping configuration                                  */
/* ================================================================== */
const MODULE_LABELS = {
  hr:            'HR Management',
  procurement:   'Procurement',
  programs:      'Programs',
  communication: 'Communication',
  reports:       'Reports',
  settings:      'Settings',
  auth:          'User Management',
}

const ACTION_LABELS = {
  view:           'View',
  create:         'Create',
  edit:           'Edit',
  delete:         'Delete',
  manage_roles:   'Manage Roles',
  manage_status:  'Manage Status',
  export:         'Export',
}

function formatModuleLabel(key) {
  return MODULE_LABELS[key] || capitalize(key.replace(/_/g, ' '))
}

function formatFeatureLabel(key) {
  return capitalize(key.replace(/_/g, ' '))
}

function formatActionLabel(key) {
  return ACTION_LABELS[key] || capitalize(key.replace(/_/g, ' '))
}

/* ================================================================== */
/* PermissionsSettings page (super_admin only)                        */
/* ================================================================== */
export default function PermissionsSettings() {
  const navigate = useNavigate()
  const { user, fetchPermissions: refreshPerms } = useAuth()

  const [permissions, setPermissions] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [expandedModules, setExpandedModules] = useState({})

  // Track local changes: { [permissionId]: { [role]: boolean } }
  const [changes, setChanges] = useState({})

  // Only super_admin should access this page
  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  /* ================================================================ */
  /* Fetch permissions matrix from backend                            */
  /* ================================================================ */
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await settingsApi.getPermissions()
      const data = res?.data || res
      setPermissions(data.permissions || [])
      setRoles(data.roles || [])
      // Expand all modules by default
      const modules = {}
      ;(data.permissions || []).forEach((p) => {
        const mod = p.key?.split('.')[0]
        if (mod) modules[mod] = true
      })
      setExpandedModules(modules)
    } catch (err) {
      setError(err.message || 'Failed to load permissions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  /* ================================================================ */
  /* Group permissions by module → feature                            */
  /* ================================================================ */
  const grouped = useMemo(() => {
    const groups = {}
    const q = search.toLowerCase()
    for (const perm of permissions) {
      const parts = perm.key?.split('.') || []
      const module = parts[0] || 'other'
      const feature = parts[1] || 'general'
      const action = parts.slice(2).join('.') || 'access'

      // Search filter
      if (q && !(perm.key?.toLowerCase().includes(q) || perm.name?.toLowerCase().includes(q))) continue

      if (!groups[module]) groups[module] = {}
      if (!groups[module][feature]) groups[module][feature] = []
      groups[module][feature].push({ ...perm, action })
    }
    return groups
  }, [permissions, search])

  /* ================================================================ */
  /* Toggle a permission for a role                                   */
  /* ================================================================ */
  function togglePermission(permId, role, currentValue) {
    setChanges((prev) => ({
      ...prev,
      [permId]: { ...(prev[permId] || {}), [role]: !currentValue },
    }))
  }

  function getEffectiveValue(perm, role) {
    if (changes[perm.id]?.[role] !== undefined) {
      return changes[perm.id][role]
    }
    return perm.roles?.[role] === true
  }

  const hasChanges = Object.keys(changes).length > 0

  /* ================================================================ */
  /* Bulk save                                                        */
  /* ================================================================ */
  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      // Build flat array of changes
      const payload = []
      for (const [permId, roleChanges] of Object.entries(changes)) {
        for (const [role, value] of Object.entries(roleChanges)) {
          payload.push({ permission_id: Number(permId), role, value })
        }
      }
      await settingsApi.bulkUpdatePermissions(payload)
      setChanges({})
      setSuccess('Permissions saved successfully')
      // Refresh permissions in context
      refreshPerms()
      // Refresh the data
      fetchData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to save permissions')
    } finally {
      setSaving(false)
    }
  }

  function toggleModule(mod) {
    setExpandedModules((prev) => ({ ...prev, [mod]: !prev[mod] }))
  }

  /* ================================================================ */
  /* Toggle all permissions in a module for a role                    */
  /* ================================================================ */
  function toggleModuleRole(module, role) {
    const modulePerms = Object.values(grouped[module] || {}).flat()
    const allEnabled = modulePerms.every((p) => getEffectiveValue(p, role))
    const newChanges = { ...changes }
    for (const p of modulePerms) {
      newChanges[p.id] = { ...(newChanges[p.id] || {}), [role]: !allEnabled }
    }
    setChanges(newChanges)
  }

  /* ================================================================ */
  /* Render                                                           */
  /* ================================================================ */
  if (user?.role !== 'super_admin') return null

  return (
    <div className="permissions-settings">
      {error && (
        <div className="hr-error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="hr-error-dismiss">&times;</button>
        </div>
      )}
      {success && (
        <div className="hr-error-banner" style={{ background: 'var(--success-bg, #d4edda)', color: 'var(--success-text, #155724)', borderColor: 'var(--success-border, #c3e6cb)' }}>
          <Check size={16} />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="hr-error-dismiss">&times;</button>
        </div>
      )}

      <div className="card animate-in">
        {/* Header */}
        <div className="hr-toolbar">
          <div className="hr-toolbar-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={20} style={{ color: 'var(--primary)' }} />
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)' }}>Permissions Manager</h2>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Configure role-based access for all modules</p>
              </div>
            </div>
          </div>
          <div className="hr-toolbar-right">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input type="text" placeholder="Search permissions…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button
              className="hr-btn-primary"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving && <span className="auth-spinner" />}
              <Save size={15} /> Save Changes
            </button>
          </div>
        </div>

        {loading ? (
          <div className="hr-loading" style={{ minHeight: 300 }}>
            <div className="auth-spinner large" />
          </div>
        ) : permissions.length === 0 ? (
          <div className="notes-empty" style={{ padding: '60px 20px' }}>
            <Shield size={40} />
            <p>No permissions configured</p>
            <span>Permissions will appear here once configured in the backend</span>
          </div>
        ) : (
          <div className="permissions-matrix">
            {/* Sticky role header */}
            <div className="perm-header-row">
              <div className="perm-label-col">Permission</div>
              {roles.map((role) => (
                <div key={role} className="perm-role-col">
                  {capitalize(role.replace(/_/g, ' '))}
                </div>
              ))}
            </div>

            {/* Module groups */}
            {Object.entries(grouped).map(([module, features]) => (
              <div className="perm-module" key={module}>
                {/* Module header */}
                <div
                  className="perm-module-header"
                  onClick={() => toggleModule(module)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleModule(module) } }}
                >
                  <div className="perm-module-title">
                    <ChevronRight size={14} className={`perm-chevron ${expandedModules[module] ? 'open' : ''}`} />
                    <span>{formatModuleLabel(module)}</span>
                  </div>
                  {/* Module-level toggle all buttons */}
                  <div className="perm-module-toggles">
                    {roles.map((role) => {
                      const modulePerms = Object.values(features).flat()
                      const allOn = modulePerms.every((p) => getEffectiveValue(p, role))
                      return (
                        <button
                          key={role}
                          className={`perm-toggle-all ${allOn ? 'active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); toggleModuleRole(module, role) }}
                          title={`Toggle all ${formatModuleLabel(module)} for ${role}`}
                        >
                          {allOn ? <Check size={12} /> : null}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Permission rows */}
                {expandedModules[module] && Object.entries(features).map(([feature, perms]) => (
                  <div className="perm-feature-group" key={feature}>
                    <div className="perm-feature-label">{formatFeatureLabel(feature)}</div>
                    {perms.map((perm) => (
                      <div className="perm-row" key={perm.id}>
                        <div className="perm-label-col">
                          <span className="perm-action-label">{formatActionLabel(perm.action)}</span>
                          {perm.name && perm.name !== perm.key && (
                            <span className="perm-key-hint">{perm.key}</span>
                          )}
                        </div>
                        {roles.map((role) => {
                          const isOn = getEffectiveValue(perm, role)
                          const isChanged = changes[perm.id]?.[role] !== undefined
                          return (
                            <div key={role} className="perm-role-col">
                              <button
                                className={`perm-checkbox ${isOn ? 'checked' : ''} ${isChanged ? 'changed' : ''}`}
                                onClick={() => togglePermission(perm.id, role, isOn)}
                                aria-label={`${perm.key} for ${role}: ${isOn ? 'enabled' : 'disabled'}`}
                              >
                                {isOn && <Check size={13} />}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {hasChanges && (
          <div className="perm-save-bar">
            <span>You have unsaved changes</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="hr-btn-secondary" onClick={() => setChanges({})}>Discard</button>
              <button className="hr-btn-primary" onClick={handleSave} disabled={saving}>
                {saving && <span className="auth-spinner" />}
                <Save size={14} /> Save All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
