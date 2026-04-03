import { useState, useEffect, useCallback } from 'react'
import { Search, Users, Shield, Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { capitalize } from '../../utils/capitalize'
import { settingsApi } from '../../services/api'
import { extractItems } from '../../utils/apiHelpers'
import { useDebounce } from '../../hooks/useDebounce'
import { useAuth } from '../../contexts/AuthContext'

const ROLE_COLORS = { super_admin: 'purple', admin: 'blue', manager: 'green', staff: 'gray' }

function fmtRole(r) { return capitalize((r || 'staff').replace(/_/g, ' ')) }

export default function RolesAccess() {
  const { isSuperAdmin } = useAuth()

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
    setTimeout(() => setToast(null), 3000)
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

  async function handleToggle(perm, roleName) {
    const key = `${perm.id}-${roleName}`
    setSaving((prev) => ({ ...prev, [key]: true }))
    try {
      const currentRoles = Array.isArray(perm.roles) ? perm.roles : []
      const enabled = currentRoles.includes(roleName)
      const newRoles = enabled
        ? currentRoles.filter((r) => r !== roleName)
        : [...currentRoles, roleName]
      await settingsApi.updatePermission(perm.id, { roles: newRoles })
      setPermissions((prev) =>
        prev.map((p) => p.id === perm.id ? { ...p, roles: newRoles } : p)
      )
    } catch (err) { showToast(err.message || 'Failed to update', 'error') }
    finally { setSaving((prev) => ({ ...prev, [key]: false })) }
  }

  // Group permissions by module
  const groups = {}
  permissions.forEach((p) => {
    const mod = p.module || p.key?.split('.')[0] || 'other'
    if (!groups[mod]) groups[mod] = []
    groups[mod].push(p)
  })

  const modules = Object.keys(groups).sort()
  const editableRoles = ['admin', 'manager', 'staff']

  const filteredModules = modules.filter((m) => {
    if (moduleFilter && m !== moduleFilter) return false
    if (debouncedSearch) {
      return groups[m].some((p) =>
        (p.name || p.key || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    }
    return true
  })

  const filteredPerms = (mod) => {
    if (!debouncedSearch) return groups[mod]
    return groups[mod].filter((p) =>
      (p.name || p.key || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(debouncedSearch.toLowerCase())
    )
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

      {/* Role Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
        {roles.map((role) => {
          const slug = role.slug || role.name
          const isExpanded = expandedRole === slug
          return (
            <div key={slug} className="card animate-in" style={{ padding: 16, cursor: 'pointer' }} onClick={() => toggleExpand(slug)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className={`card-badge ${ROLE_COLORS[slug] || ''}`}>{fmtRole(slug)}</span>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                <Users size={14} />
                <span>{role.users_count ?? role.user_count ?? 0} users</span>
              </div>
              {role.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.4 }}>{role.description}</p>}
              {isExpanded && (
                <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  {roleUsers[slug] ? (
                    roleUsers[slug].length === 0
                      ? <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No users with this role</p>
                      : <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 150, overflowY: 'auto' }}>
                          {roleUsers[slug].map((u) => (
                            <div key={u.id} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0' }}>
                              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700 }}>
                                {(u.name || '??').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                              <span>{u.name}</span>
                            </div>
                          ))}
                        </div>
                  ) : (
                    <div className="auth-spinner" style={{ margin: '4px auto' }} />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Permission Matrix */}
      <div className="card animate-in">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Permission Matrix</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="search-box" style={{ width: 200 }}><Search size={14} className="search-icon" /><input type="text" placeholder="Search permissions..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <select className="hr-filter-select" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
              <option value="">All Modules</option>
              {modules.map((m) => <option key={m} value={m}>{capitalize(m)}</option>)}
            </select>
          </div>
        </div>

        {filteredModules.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No permissions found</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Permission</th>
                  {editableRoles.map((r) => (
                    <th key={r} style={{ textAlign: 'center', width: '20%' }}>{fmtRole(r)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredModules.map((mod) => (
                  <>
                    <tr key={`header-${mod}`}>
                      <td colSpan={editableRoles.length + 1} style={{ background: 'var(--bg-surface, var(--card-bg-hover, #f5f5f5))', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 16px' }}>
                        {capitalize(mod)}
                      </td>
                    </tr>
                    {filteredPerms(mod).map((perm) => (
                      <tr key={perm.id}>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{perm.name || perm.key}</div>
                          {perm.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{perm.description}</div>}
                        </td>
                        {editableRoles.map((r) => {
                          const isOn = Array.isArray(perm.roles) && perm.roles.includes(r)
                          const key = `${perm.id}-${r}`
                          return (
                            <td key={r} style={{ textAlign: 'center' }}>
                              <label className="toggle-switch" style={{ display: 'inline-flex' }}>
                                <input
                                  type="checkbox"
                                  checked={isOn}
                                  onChange={() => handleToggle(perm, r)}
                                  disabled={!!saving[key]}
                                />
                                <span className="toggle-slider" />
                              </label>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
        Super Admin always has all permissions and is not shown in the matrix.
      </p>
    </>
  )
}
