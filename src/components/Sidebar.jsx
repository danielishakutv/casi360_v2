import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  FolderKanban,
  MessageSquare,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Eye,
  UserCheck,
  Building2,
  Award,
  StickyNote,
  Cog,
  ClipboardList,
  FileText,
  Store,
  Briefcase,
  ListOrdered,
  Receipt,
  Truck,
  CreditCard,
  Heart,
  PieChart,
  Bell,
  Tag,
  PackageCheck,
  ClipboardCheck,
  Inbox,
  MessagesSquare,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { capitalize } from '../utils/capitalize'

const navItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/',
  },
  {
    id: 'hr',
    label: 'HR Management',
    icon: Users,
    children: [
      { label: 'Overview',     icon: Eye,          path: '/hr' },
      { label: 'Staff List',   icon: UserCheck,    path: '/hr/staff',        permission: 'hr.employees.view' },
      { label: 'Departments',  icon: Building2,    path: '/hr/departments',  permission: 'hr.departments.view' },
      { label: 'Designations', icon: Award,        path: '/hr/designations', permission: 'hr.designations.view' },
      { label: 'Notes',        icon: StickyNote,   path: '/hr/notes',        permission: 'hr.notes.view' },
      { label: 'Settings',     icon: Cog,          path: '/hr/settings',     permission: 'hr.settings.view' },
    ],
  },
  {
    id: 'procurement',
    label: 'Procurement',
    icon: ShoppingCart,
    children: [
      { label: 'Overview',              icon: Eye,           path: '/procurement' },
      { label: 'Purchase Requests',     icon: ClipboardList, path: '/procurement/purchase-requests', permission: 'procurement.purchase_requests.view' },
      { label: 'Bill of Quantities',    icon: ListOrdered,   path: '/procurement/boq',              permission: 'procurement.boq.view' },
      { label: 'Request for Quotation', icon: FileText,      path: '/procurement/rfq',              permission: 'procurement.rfq.view' },
      { label: 'Purchase Orders',       icon: Store,         path: '/procurement/purchase-orders',  permission: 'procurement.purchase_orders.view' },
      { label: 'Goods Received',        icon: Truck,         path: '/procurement/grn',              permission: 'procurement.grn.view' },
      { label: 'Request for Payment',   icon: CreditCard,    path: '/procurement/rfp',              permission: 'procurement.rfp.view' },
      { label: 'Vendors',               icon: Building2,     path: '/procurement/vendors',          permission: 'procurement.vendors.view' },
      { label: 'Vendor Categories',     icon: Tag,           path: '/procurement/vendor-categories', permission: 'procurement.vendor_categories.view' },
      { label: 'Inventory',             icon: PackageCheck,  path: '/procurement/inventory',        permission: 'procurement.inventory.view' },
      { label: 'Pending Approvals',      icon: ClipboardCheck,path: '/procurement/pending-approvals' },
    ],
  },
  {
    id: 'programs',
    label: 'Programs',
    icon: FolderKanban,
    children: [
      { label: 'Overview',      icon: Eye,       path: '/programs' },
      { label: 'Projects',      icon: Briefcase, path: '/programs/projects',      permission: 'programs.projects.view' },
      { label: 'Beneficiaries', icon: Heart,     path: '/programs/beneficiaries', permission: 'programs.beneficiaries.view' },
      { label: 'Reports',       icon: PieChart,  path: '/programs/reports',       permission: 'programs.reports.view' },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: MessageSquare,
    children: [
      { label: 'Overview',     icon: Eye,            path: '/communication' },
      { label: 'Messages',     icon: Inbox,          path: '/communication/messages', permission: 'communication.messages.view' },
      { label: 'Forums',       icon: MessagesSquare, path: '/communication/forums',   permission: 'communication.forums.view' },
      { label: 'Send Notice',  icon: Bell,           path: '/communication/notice',   permission: 'communication.notice.view' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    path: '/reports',
    permission: 'reports.view',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/settings',
    permission: 'settings.view',
  },
  {
    id: 'help',
    label: 'Help Center',
    icon: HelpCircle,
    path: '/help',
  },
]

export default function Sidebar({ collapsed, mobileOpen, onToggle, onCloseMobile }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, can } = useAuth()
  const [openMenus, setOpenMenus] = useState({})

  // Filter nav items based on user permissions
  const visibleItems = navItems.reduce((acc, item) => {
    // Top-level item with a direct path — check its permission
    if (item.path) {
      if (!item.permission || can(item.permission)) acc.push(item)
      return acc
    }
    // Section with children — filter children, keep section if any children remain
    if (item.children) {
      const visibleChildren = item.children.filter(
        (child) => !child.permission || can(child.permission)
      )
      if (visibleChildren.length > 0) {
        acc.push({ ...item, children: visibleChildren })
      }
    }
    return acc
  }, [])

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '??'
  const displayRole = user?.role ? capitalize(user.role.replace('_', ' ')) : ''
  const displayName = user?.name || 'User'

  const isActive = (path) => location.pathname === path
  const isParentActive = (item) =>
    item.children?.some((child) => location.pathname === child.path)

  const toggleMenu = (id) => {
    setOpenMenus((prev) => prev[id] ? {} : { [id]: true })
  }

  const handleNav = (path) => {
    navigate(path)
    onCloseMobile()
  }

  const handleItemClick = (item) => {
    if (item.children) {
      // If sidebar is collapsed, expand it first then open the submenu
      if (collapsed) {
        onToggle() // expand sidebar
        setOpenMenus({ [item.id]: true })
      } else {
        toggleMenu(item.id)
      }
    } else {
      handleNav(item.path)
    }
  }

  const sidebarClass = [
    'sidebar',
    collapsed ? 'collapsed' : '',
    mobileOpen ? 'mobile-open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <aside className={sidebarClass}>
      {/* Toggle */}
      <button className="sidebar-toggle" onClick={onToggle} title="Toggle sidebar" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Brand */}
      <div className="sidebar-header">
        <div className="sidebar-logo">C3</div>
        <div className="sidebar-brand">
          <h1>CASI360</h1>
          <span>Care Aid Support Initiative</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-label">Main Menu</div>

        {visibleItems.map((item) => {
          const Icon = item.icon
          const hasChildren = !!item.children
          // Show as open if explicitly toggled, or if it's the active parent and nothing else is explicitly open
          const hasExplicitOpen = Object.values(openMenus).some(Boolean)
          const isOpen = hasChildren && (openMenus[item.id] || (!hasExplicitOpen && isParentActive(item)))
          const active = item.path ? isActive(item.path) : isParentActive(item)

          return (
            <div className="nav-section" key={item.id}>
              <div
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => handleItemClick(item)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleItemClick(item) } }}
                role="button"
                tabIndex={0}
                aria-expanded={hasChildren ? isOpen : undefined}
                aria-label={item.label}
              >
                <span className="nav-item-icon">
                  <Icon size={18} />
                </span>
                <span className="nav-item-text">{item.label}</span>
                {hasChildren && (
                  <ChevronRight
                    size={14}
                    className={`nav-chevron ${isOpen ? 'open' : ''}`}
                  />
                )}
              </div>

              {hasChildren && (
                <div className={`nav-submenu ${isOpen ? 'open' : ''}`}>
                  {item.children.map((child) => {
                    const ChildIcon = child.icon
                    return (
                      <div
                        key={child.path}
                        className={`nav-item ${isActive(child.path) ? 'active' : ''}`}
                        onClick={() => handleNav(child.path)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNav(child.path) } }}
                        role="button"
                        tabIndex={0}
                        aria-label={child.label}
                      >
                        <span className="nav-item-icon">
                          <ChildIcon size={15} />
                        </span>
                        <span className="nav-item-text">{child.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-profile" onClick={() => { navigate('/profile'); onCloseMobile() }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/profile'); onCloseMobile() } }} style={{ cursor: 'pointer' }}>
          <div className="sidebar-avatar" aria-hidden="true">{initials}</div>
          <div className="sidebar-footer-info">
            <h4>{displayName}</h4>
            <p>{displayRole}{user?.department ? ` · ${user.department}` : ''}</p>
          </div>
        </div>

        <button className="logout-btn" aria-label="Logout" onClick={async () => { onCloseMobile(); await logout(); navigate('/login') }}>
          <LogOut size={18} />
          <span className="logout-text">Logout</span>
        </button>

        <div className="sidebar-footer-meta">
          <p>v1.0.0 · © CASI360 2026</p>
          <p>Developed by Toko Technologies</p>
        </div>
      </div>
    </aside>
  )
}
