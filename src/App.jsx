import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

// Layout & guards (always needed — keep eager)
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import GuestRoute from './components/GuestRoute'

// ─── Lazy-loaded pages (route-level code-splitting) ──────────

// Auth pages (public)
const Login               = lazy(() => import('./pages/auth/Login'))
const ForgotPassword      = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword       = lazy(() => import('./pages/auth/ResetPassword'))
const ForceChangePassword = lazy(() => import('./pages/auth/ForceChangePassword'))

// Dashboard
const Dashboard = lazy(() => import('./pages/Dashboard'))

// HR
const HROverview   = lazy(() => import('./pages/hr/Overview'))
const StaffList    = lazy(() => import('./pages/hr/StaffList'))
const Departments  = lazy(() => import('./pages/hr/Departments'))
const Designations = lazy(() => import('./pages/hr/Designations'))
const HRNotes      = lazy(() => import('./pages/hr/Notes'))
const HRSettings   = lazy(() => import('./pages/hr/Settings'))

// Procurement
const ProcOverview       = lazy(() => import('./pages/procurement/Overview'))
const PurchaseRequests   = lazy(() => import('./pages/procurement/PurchaseRequests'))
const CreatePurchaseRequest = lazy(() => import('./pages/procurement/CreatePurchaseRequest'))
const BillOfQuantities   = lazy(() => import('./pages/procurement/BillOfQuantities'))
const CreateBillOfQuantities = lazy(() => import('./pages/procurement/CreateBillOfQuantities'))
const RequestForQuotation = lazy(() => import('./pages/procurement/RequestForQuotation'))
const CreateRequestForQuotation = lazy(() => import('./pages/procurement/CreateRequestForQuotation'))
const PurchaseOrders     = lazy(() => import('./pages/procurement/PurchaseOrders'))
const CreatePurchaseOrder = lazy(() => import('./pages/procurement/CreatePurchaseOrder'))
const GoodsReceivedNote  = lazy(() => import('./pages/procurement/GoodsReceivedNote'))
const CreateGoodsReceivedNote = lazy(() => import('./pages/procurement/CreateGoodsReceivedNote'))
const RequestForPayment  = lazy(() => import('./pages/procurement/RequestForPayment'))
const CreateRequestForPayment = lazy(() => import('./pages/procurement/CreateRequestForPayment'))
const Vendors            = lazy(() => import('./pages/procurement/Vendors'))
const VendorCategories   = lazy(() => import('./pages/procurement/VendorCategories'))
const InventoryItems     = lazy(() => import('./pages/procurement/InventoryItems'))
const PendingApprovals   = lazy(() => import('./pages/procurement/PendingApprovals'))

// Projects
const ProjectsOverview = lazy(() => import('./pages/projects/ProjectsOverview'))
const ProjectsList     = lazy(() => import('./pages/projects/ProjectsList'))
const ProjectDetail    = lazy(() => import('./pages/projects/ProjectDetail'))
const BudgetCategories = lazy(() => import('./pages/projects/BudgetCategories'))
const ProjectReports   = lazy(() => import('./pages/projects/ProjectReports'))

// Communication
const CommOverview = lazy(() => import('./pages/communication/Overview'))
const Messages     = lazy(() => import('./pages/communication/Messages'))
const Forums       = lazy(() => import('./pages/communication/Forums'))
const SendNotice   = lazy(() => import('./pages/communication/SendNotice'))

// Other
const Reports              = lazy(() => import('./pages/Reports'))
const Settings             = lazy(() => import('./pages/Settings'))
const PermissionsSettings  = lazy(() => import('./pages/PermissionsSettings'))
const HelpCenter           = lazy(() => import('./pages/HelpCenter'))
const Profile              = lazy(() => import('./pages/Profile'))
const NotFound             = lazy(() => import('./pages/NotFound'))

/* ─── Suspense fallback ─── */
function PageSpinner() {
  return (
    <div className="auth-page">
      <div className="auth-loading">
        <div className="auth-spinner large" />
        <p>Loading…</p>
      </div>
    </div>
  )
}

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
      {mobileOpen && (
        <div
          className="sidebar-overlay visible"
          onClick={closeMobile}
          role="presentation"
        />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileOpen}
        onToggle={toggleSidebar}
        onCloseMobile={closeMobile}
      />

      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <TopBar onMobileMenuClick={toggleMobile} theme={theme} onToggleTheme={toggleTheme} />

        <div className="page-content">
          <ErrorBoundary>
            <Suspense fallback={<PageSpinner />}>
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
                <Route path="/procurement/purchase-requests" element={<PurchaseRequests />} />
                <Route path="/procurement/purchase-requests/create" element={<CreatePurchaseRequest />} />
                <Route path="/procurement/boq" element={<BillOfQuantities />} />
                <Route path="/procurement/boq/create" element={<CreateBillOfQuantities />} />
                <Route path="/procurement/rfq" element={<RequestForQuotation />} />
                <Route path="/procurement/rfq/create" element={<CreateRequestForQuotation />} />
                <Route path="/procurement/purchase-orders" element={<PurchaseOrders />} />
                <Route path="/procurement/purchase-orders/create" element={<CreatePurchaseOrder />} />
                <Route path="/procurement/grn" element={<GoodsReceivedNote />} />
                <Route path="/procurement/grn/create" element={<CreateGoodsReceivedNote />} />
                <Route path="/procurement/rfp" element={<RequestForPayment />} />
                <Route path="/procurement/rfp/create" element={<CreateRequestForPayment />} />
                <Route path="/procurement/vendors" element={<Vendors />} />
                <Route path="/procurement/vendor-categories" element={<VendorCategories />} />
                <Route path="/procurement/inventory" element={<InventoryItems />} />
                <Route path="/procurement/pending-approvals" element={<PendingApprovals />} />

                {/* Projects */}
                <Route path="/projects" element={<ProjectsOverview />} />
                <Route path="/projects/list" element={<ProjectsList />} />
                <Route path="/projects/list/:id" element={<ProjectDetail />} />
                <Route path="/projects/budget-categories" element={<BudgetCategories />} />
                <Route path="/projects/reports" element={<ProjectReports />} />

                {/* Communication */}
                <Route path="/communication" element={<CommOverview />} />
                <Route path="/communication/messages" element={<Messages />} />
                <Route path="/communication/forums" element={<Forums />} />
                <Route path="/communication/notices" element={<SendNotice />} />
                <Route path="/communication/notice" element={<SendNotice />} />

                {/* Other */}
                <Route path="/reports" element={<Reports />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/permissions" element={<PermissionsSettings />} />
                <Route path="/help" element={<HelpCenter />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
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
      <Route path="/login" element={<GuestRoute><Suspense fallback={<PageSpinner />}><Login /></Suspense></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><Suspense fallback={<PageSpinner />}><ForgotPassword /></Suspense></GuestRoute>} />
      <Route path="/reset-password" element={<GuestRoute><Suspense fallback={<PageSpinner />}><ResetPassword /></Suspense></GuestRoute>} />

      {/* ---- Force change password (requires auth, but skip force-redirect loop) ---- */}
      <Route path="/change-password" element={<ProtectedRoute allowPasswordChange><Suspense fallback={<PageSpinner />}><ForceChangePassword /></Suspense></ProtectedRoute>} />

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
