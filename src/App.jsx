import { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'

// Layout components
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import ProtectedRoute from './components/ProtectedRoute'
import GuestRoute from './components/GuestRoute'

// Auth pages (public)
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import ForceChangePassword from './pages/auth/ForceChangePassword'

// Dashboard
import Dashboard from './pages/Dashboard'

// HR pages
import HROverview from './pages/hr/Overview'
import StaffList from './pages/hr/StaffList'
import Departments from './pages/hr/Departments'
import Designations from './pages/hr/Designations'
import HRNotes from './pages/hr/Notes'
import HRSettings from './pages/hr/Settings'

// Procurement pages
import ProcOverview from './pages/procurement/Overview'
import Requisitions from './pages/procurement/Requisitions'
import PurchaseOrders from './pages/procurement/PurchaseOrders'
import Vendors from './pages/procurement/Vendors'
import Inventory from './pages/procurement/Inventory'

// Programs pages
import ProgOverview from './pages/programs/Overview'
import Projects from './pages/programs/Projects'
import Beneficiaries from './pages/programs/Beneficiaries'
import ProgReports from './pages/programs/Reports'

// Communication pages
import CommOverview from './pages/communication/Overview'
import SendEmail from './pages/communication/SendEmail'
import SendSMS from './pages/communication/SendSMS'
import SendNotice from './pages/communication/SendNotice'

// Other pages
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import HelpCenter from './pages/HelpCenter'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'

/* ------------------------------------------------------------------ */
/* Theme                                                              */
/* ------------------------------------------------------------------ */
function getInitialTheme() {
  const saved = localStorage.getItem('casi360-theme')
  if (saved === 'dark' || saved === 'light') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/* ------------------------------------------------------------------ */
/* Authenticated layout shell                                         */
/* ------------------------------------------------------------------ */
function AppLayout({ theme, toggleTheme }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev)
  const toggleMobile = () => setMobileOpen((prev) => !prev)
  const closeMobile = () => setMobileOpen(false)

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={closeMobile}
        role="button"
        aria-label="Close menu"
        tabIndex={-1}
      />

      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onToggle={toggleSidebar}
        onCloseMobile={closeMobile}
      />

      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <TopBar onMobileMenuClick={toggleMobile} theme={theme} onToggleTheme={toggleTheme} />

        <div className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />

            {/* HR Management */}
            <Route path="/hr" element={<HROverview />} />
            <Route path="/hr/staff" element={<StaffList />} />
            <Route path="/hr/departments" element={<Departments />} />
            <Route path="/hr/designations" element={<Designations />} />
            <Route path="/hr/notes" element={<HRNotes />} />
            <Route path="/hr/settings" element={<HRSettings />} />

            {/* Procurement */}
            <Route path="/procurement" element={<ProcOverview />} />
            <Route path="/procurement/requisitions" element={<Requisitions />} />
            <Route path="/procurement/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/procurement/vendors" element={<Vendors />} />
            <Route path="/procurement/inventory" element={<Inventory />} />

            {/* Programs */}
            <Route path="/programs" element={<ProgOverview />} />
            <Route path="/programs/projects" element={<Projects />} />
            <Route path="/programs/beneficiaries" element={<Beneficiaries />} />
            <Route path="/programs/reports" element={<ProgReports />} />

            {/* Communication */}
            <Route path="/communication" element={<CommOverview />} />
            <Route path="/communication/email" element={<SendEmail />} />
            <Route path="/communication/sms" element={<SendSMS />} />
            <Route path="/communication/notice" element={<SendNotice />} />

            {/* Other */}
            <Route path="/reports" element={<Reports />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Root App — handles theme + route splitting (guest vs protected)    */
/* ------------------------------------------------------------------ */
function App() {
  const [theme, setTheme] = useState(getInitialTheme)

  // Apply theme to <html> and persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('casi360-theme', theme)
  }, [theme])

  // Listen for OS-level theme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => {
      if (!localStorage.getItem('casi360-theme')) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggleTheme = useCallback(() => {
    document.documentElement.classList.add('theme-transition')
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
    setTimeout(() => document.documentElement.classList.remove('theme-transition'), 350)
  }, [])

  return (
    <Routes>
      {/* ---- Guest (public) routes ---- */}
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
      <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />

      {/* ---- Force change password (authenticated but restricted) ---- */}
      <Route path="/change-password" element={<ForceChangePassword />} />

      {/* ---- Protected app shell ---- */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout theme={theme} toggleTheme={toggleTheme} />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
