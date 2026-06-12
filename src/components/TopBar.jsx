import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, Search, Bell, Sun, Moon, User, Settings, LogOut, ChevronDown, MessageSquare, Megaphone, MessagesSquare, ClipboardCheck, FileText } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { capitalize } from '../utils/capitalize'
import { notificationsApi, messagesApi } from '../services/communication'
import { extractItems } from '../utils/apiHelpers'

/* Map a notification type to an icon for the bell dropdown. */
const NOTIF_ICON = {
  forum: MessagesSquare,
  notice: Megaphone,
  approval: ClipboardCheck,
  requisition: FileText,
  boq: FileText,
}

const pageTitles = {
  '/':                        { title: 'Dashboard',        sub: 'Welcome back! Here\'s your overview.' },
  '/hr':                      { title: 'HR Management',    sub: 'Human Resources overview & analytics' },
  '/hr/staff':                { title: 'Staff List',       sub: 'Manage all staff members' },
  '/hr/departments':          { title: 'Departments',      sub: 'Organizational departments' },
  '/hr/designations':         { title: 'Designations',     sub: 'Staff roles & designations' },
  '/hr/attendance':           { title: 'Attendance',       sub: 'Daily sign in & sign out' },
  '/hr/timesheets':           { title: 'Timesheets',       sub: 'Monthly attendance summary' },
  '/hr/notes':                { title: 'Notes',            sub: 'HR notes & memos' },
  '/hr/settings':             { title: 'HR Settings',      sub: 'HR module configuration' },
  '/procurement':                    { title: 'Procurement',            sub: 'Procurement overview & analytics' },
  '/procurement/purchase-requests':  { title: 'Purchase Requests',     sub: 'Create & manage purchase requests (PR)' },
  '/procurement/boq':                { title: 'Bill of Quantities',    sub: 'Prepare & manage BOQs' },
  '/procurement/rfq':                { title: 'Request for Quotation', sub: 'Solicit & compare vendor quotes (RFQ)' },
  '/procurement/purchase-orders':    { title: 'Purchase Orders',       sub: 'Track & manage purchase orders (PO)' },
  '/procurement/grn':                { title: 'Goods Received Note',   sub: 'Record goods received (GRN)' },
  '/procurement/rfp':                { title: 'Request for Payment',   sub: 'Submit & track payment requests (RFP)' },
  '/programs':                { title: 'Programs',         sub: 'Programs overview & analytics' },
  '/programs/projects':       { title: 'Projects',         sub: 'Active projects & monitoring' },
  '/programs/beneficiaries':  { title: 'Beneficiaries',    sub: 'Beneficiary database' },
  '/programs/reports':        { title: 'Program Reports',  sub: 'Program performance reports' },
  '/communication':           { title: 'Communication',    sub: 'Communication center' },
  '/communication/messages':     { title: 'Messages',      sub: 'Direct messages & conversations' },
  '/communication/messages/new': { title: 'New Message',   sub: 'Compose a direct message' },
  '/communication/forums':       { title: 'Forums',        sub: 'Team discussions & threads' },
  '/communication/email':     { title: 'Send Email',       sub: 'Compose & send emails' },
  '/communication/sms':       { title: 'Send SMS',         sub: 'SMS messaging' },
  '/communication/notice':    { title: 'Notices',      sub: 'Organization notices & announcements' },
  '/communication/notices':   { title: 'Notices',      sub: 'Organization notices & announcements' },
  '/reports':                 { title: 'Reports',          sub: 'Organization-wide reports' },
  '/profile':                 { title: 'My Profile',       sub: 'View and manage your profile' },
  '/settings':                { title: 'Settings',         sub: 'System configuration' },
  '/help':                    { title: 'Help Center',      sub: 'Documentation & support' },
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function TopBar({ onMobileMenuClick, theme, onToggleTheme }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, can } = useAuth()
  const page = pageTitles[location.pathname] || { title: 'CASI360', sub: '' }
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [msgUnread, setMsgUnread] = useState(0)
  const canMessages = can('communication.messages.view')

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '??'
  const displayRole = user?.role ? capitalize(user.role.replace('_', ' ')) : ''
  const displayName = user?.name || 'User'

  /* Unified notification bell — forum activity, notices, and approval
     requests/decisions across the whole app. Polls every 10s while visible. */
  const fetchNotifications = useCallback(async () => {
    if (document.hidden) return
    try {
      const res = await notificationsApi.list({ per_page: 8 })
      const data = res?.data || res
      setNotifications(data?.notifications || extractItems(res))
      setUnreadCount(data?.unread_count ?? 0)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 10000)
    const onFocus = () => fetchNotifications()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus) }
  }, [fetchNotifications])

  async function openNotification(n) {
    setNotifOpen(false)
    try { if (!n.is_read) await notificationsApi.markRead(n.id) } catch { /* ignore */ }
    if (n.url) navigate(n.url)
    fetchNotifications()
  }

  async function markAllNotificationsRead() {
    try { await notificationsApi.markAllRead() } catch { /* ignore */ }
    setUnreadCount(0)
    fetchNotifications()
  }

  /* Global unread-messages badge — so new direct messages notify you on ANY
     page, not just inside Messages. Polls every 10s while the tab is visible
     (the on-page Messages view refreshes faster, every 5s). */
  const fetchMsgUnread = useCallback(async () => {
    if (!canMessages || document.hidden) return
    try {
      const r = await messagesApi.unreadCount()
      setMsgUnread(r?.data?.unread_count ?? 0)
    } catch { /* ignore */ }
  }, [canMessages])

  useEffect(() => {
    if (!canMessages) return
    fetchMsgUnread()
    const interval = setInterval(fetchMsgUnread, 10000)
    const onFocus = () => fetchMsgUnread()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus) }
  }, [canMessages, fetchMsgUnread])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <button className="mobile-menu-btn" onClick={onMobileMenuClick} aria-label="Open navigation menu">
          <Menu size={22} />
        </button>
        <div className="page-title-section">
          <h2>{page.title}</h2>
          <p>{page.sub}</p>
        </div>
      </div>

      <div className="top-bar-right">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input type="text" placeholder="Search anything..." aria-label="Search" />
        </div>

        <button className="top-bar-btn" title="Toggle theme" onClick={onToggleTheme}>
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {canMessages && (
          <button
            className="top-bar-btn"
            title={msgUnread > 0 ? `${msgUnread} unread message${msgUnread === 1 ? '' : 's'}` : 'Messages'}
            aria-label="Messages"
            onClick={() => navigate('/communication/messages')}
          >
            <MessageSquare size={20} />
            {msgUnread > 0 && <span className="notif-badge" aria-hidden="true">{msgUnread > 9 ? '9+' : msgUnread}</span>}
          </button>
        )}

        <div className="notif-bell-wrap" ref={notifRef}>
          <button className="top-bar-btn" title="Notifications" aria-label="Notifications" onClick={() => setNotifOpen((p) => !p)}>
            <Bell size={20} />
            {unreadCount > 0 && <span className="notif-badge" aria-hidden="true">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>

          {notifOpen && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <strong>Notifications</strong>
                {unreadCount > 0 && (
                  <button className="notif-markall" onClick={markAllNotificationsRead}>Mark all read</button>
                )}
              </div>
              <div className="notif-dropdown-list">
                {notifications.length === 0 ? (
                  <div className="notif-dropdown-empty">You&apos;re all caught up</div>
                ) : notifications.map((n) => {
                  const Icon = NOTIF_ICON[n.type] || Bell
                  return (
                    <button
                      key={n.id}
                      className={`notif-dropdown-item${!n.is_read ? ' unread' : ''}`}
                      onClick={() => openNotification(n)}
                    >
                      <span className="notif-item-icon"><Icon size={15} /></span>
                      <span className="notif-item-body">
                        <span className="notif-item-title">{n.title}</span>
                        {n.body && <span className="notif-item-text">{n.body}</span>}
                        <span className="notif-item-meta">{timeAgo(n.created_at)}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar */}
        <div className="topbar-profile" ref={profileRef}>
          <button
            className="topbar-avatar-btn"
            onClick={() => setProfileOpen((prev) => !prev)}
            aria-label="Profile menu"
            aria-expanded={profileOpen}
          >
            <div className="topbar-avatar">{initials}</div>
            <ChevronDown size={14} className={`topbar-avatar-chevron ${profileOpen ? 'open' : ''}`} />
          </button>

          {profileOpen && (
            <div className="topbar-dropdown">
              <div className="topbar-dropdown-header">
                <div className="topbar-dropdown-avatar">{initials}</div>
                <div>
                  <div className="topbar-dropdown-name">{displayName}</div>
                  <div className="topbar-dropdown-role">{displayRole}{user?.department ? ` · ${user.department}` : ''}</div>
                </div>
              </div>
              <div className="topbar-dropdown-divider" />
              <button className="topbar-dropdown-item" onClick={() => { navigate('/profile'); setProfileOpen(false) }}>
                <User size={16} />
                My Profile
              </button>
              <button className="topbar-dropdown-item" onClick={() => { navigate('/settings'); setProfileOpen(false) }}>
                <Settings size={16} />
                Settings
              </button>
              <div className="topbar-dropdown-divider" />
              <button className="topbar-dropdown-item danger" onClick={async () => { setProfileOpen(false); await logout(); navigate('/login') }}>
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
