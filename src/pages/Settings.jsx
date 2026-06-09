import { useState, useEffect, lazy, Suspense } from 'react'
import { Cog, Users, Database, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

/* ==================================================================
 * Unified Settings hub.
 *
 * Both the profile-dropdown "Settings" link and the sidebar "Settings"
 * menu land here. The five existing settings pages are reused AS-IS
 * (never duplicated) and simply grouped into three categories:
 *
 *   General        → System Settings
 *   Administration → User Management + Roles & Access
 *   Audit & Backup → Audit Log + Data & Backup
 *
 * Categories and the areas inside them are role-gated exactly like the
 * sidebar was (User Management = admin+, everything else = super_admin).
 *
 * Old deep links still work: App.jsx routes /settings/users, /roles,
 * /general, /audit-log and /data to this page with the `section` prop,
 * so bookmarks and existing links open straight on the right area.
 * ================================================================== */

const SystemSettings = lazy(() => import('./settings/SystemSettings'))
const UserManagement = lazy(() => import('./settings/UserManagement'))
const RolesAccess    = lazy(() => import('./settings/RolesAccess'))
const AuditLog       = lazy(() => import('./settings/AuditLog'))
const DataBackup     = lazy(() => import('./settings/DataBackup'))

/* Each settings area: which category it sits in, the role needed, and
 * the existing component that renders it (untouched). */
const AREAS = {
  general: { label: 'System Settings', category: 'general', role: 'super_admin', Comp: SystemSettings },
  users:   { label: 'User Management', category: 'admin',   role: 'admin',       Comp: UserManagement },
  roles:   { label: 'Roles & Access',  category: 'admin',   role: 'super_admin', Comp: RolesAccess },
  audit:   { label: 'Audit Log',       category: 'audit',   role: 'super_admin', Comp: AuditLog },
  data:    { label: 'Data & Backup',   category: 'audit',   role: 'super_admin', Comp: DataBackup },
}

const CATEGORIES = [
  { key: 'general', label: 'General',        icon: Cog,      areas: ['general'] },
  { key: 'admin',   label: 'Administration', icon: Users,    areas: ['users', 'roles'] },
  { key: 'audit',   label: 'Audit & Backup', icon: Database, areas: ['audit', 'data'] },
]

export default function Settings({ section = null }) {
  const { user } = useAuth()
  const role = user?.role
  const isSuper = role === 'super_admin'
  const isAdminLike = isSuper || role === 'admin'

  function hasRole(required) {
    if (!required) return true
    if (required === 'admin') return isAdminLike
    if (required === 'super_admin') return isSuper
    return false
  }

  const areaVisible = (key) => !!AREAS[key] && hasRole(AREAS[key].role)
  const visibleAreasIn = (cat) => cat.areas.filter(areaVisible)
  const visibleCategories = CATEGORIES.filter((c) => visibleAreasIn(c).length > 0)

  const firstArea = visibleCategories.length ? visibleAreasIn(visibleCategories[0])[0] : null
  const initialArea = section && areaVisible(section) ? section : firstArea

  const [activeArea, setActiveArea] = useState(initialArea)

  /* When a routed deep link changes the focused section, follow it. */
  useEffect(() => {
    if (section && areaVisible(section)) setActiveArea(section)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  /* No accessible settings for this role — friendly notice instead of a
     blank or broken page (the profile dropdown shows Settings to all). */
  if (!activeArea) {
    return (
      <div className="settings-layout">
        <div className="settings-content">
          <div className="settings-section animate-in">
            <div className="settings-section-header">
              <div>
                <h3>Settings</h3>
                <p>Settings are managed by your administrators. You don&apos;t have access to any settings areas.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const activeCat = CATEGORIES.find((c) => c.key === AREAS[activeArea].category)
  const catAreas = visibleAreasIn(activeCat)
  const ActiveComp = AREAS[activeArea].Comp

  return (
    <div className="settings-layout">
      {/* Category rail */}
      <aside className="settings-sidebar card animate-in">
        <div className="settings-sidebar-header">
          <h3>Settings</h3>
          <p>Manage your workspace</p>
        </div>
        <nav className="settings-nav">
          {visibleCategories.map((cat) => {
            const Icon = cat.icon
            return (
              <button
                key={cat.key}
                className={`settings-nav-btn ${cat.key === activeCat.key ? 'active' : ''}`}
                onClick={() => setActiveArea(visibleAreasIn(cat)[0])}
              >
                <Icon size={17} />
                <span>{cat.label}</span>
                <ChevronRight size={14} className="settings-nav-chevron" />
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Active category content */}
      <div className="settings-content">
        {catAreas.length > 1 && (
          <div className="project-tab-nav" style={{ marginBottom: 16 }}>
            {catAreas.map((key) => (
              <button
                key={key}
                className={`project-tab-btn${activeArea === key ? ' active' : ''}`}
                onClick={() => setActiveArea(key)}
              >
                {AREAS[key].label}
              </button>
            ))}
          </div>
        )}

        <Suspense fallback={<div className="syss-loading"><div className="auth-spinner large" /></div>}>
          <ActiveComp />
        </Suspense>
      </div>
    </div>
  )
}
