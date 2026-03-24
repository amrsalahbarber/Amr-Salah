import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useTheme } from './hooks/useTheme'
import { useLanguage } from './hooks/useLanguage'
import { useAuth } from './hooks/useAuth'
import { checkSubscriptionStatus } from './utils/subscriptionChecker'

// Pages
import Login from './pages/Login'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { POS } from './pages/POS'
import { Clients } from './pages/Clients'
import { Services } from './pages/Services'
import { Expenses } from './pages/Expenses'
import { Analytics } from './pages/Analytics'
import { Settings } from './pages/Settings'
import { DailyLogs } from './pages/DailyLogs'
import { Barbers } from './pages/Barbers'
import { Bookings } from './pages/Bookings'
import { QueueDisplay } from './pages/QueueDisplay'
import { AdminDashboard } from './pages/AdminDashboard'
import { AdminShops } from './pages/AdminShops'
import { AdminPlans } from './pages/AdminPlans'
import { AdminBilling } from './pages/AdminBilling'
import { ShopBilling } from './pages/ShopBilling'

// Portal Pages
import { PortalLoginSecure } from './pages/portal/PortalLoginSecure'
import { PortalRegister } from './pages/portal/PortalRegister'
import { PortalDashboard } from './pages/portal/PortalDashboard'
import { PortalBookings } from './pages/portal/PortalBookings'
import { PortalHistory } from './pages/portal/PortalHistory'
import { PortalProfile } from './pages/portal/PortalProfile'

/**
 * AdminRoute Component
 * 
 * Wraps admin-only routes
 * - Redirects to /dashboard if user is shop owner
 * - Redirects to /login if not authenticated
 */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { loading, role } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-gold-400/20 border-t-gold-400 animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    )
  }

  if (!role) {
    return <Navigate to="/login" replace />
  }

  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

/**
 * ShopRoute Component
 * 
 * Wraps shop-owner routes with subscription enforcement:
 * - ACTIVE: full access
 * - INACTIVE: view-only access
 * - SUSPENDED/EXPIRED: blocked, redirect to /billing
 */
function ShopRoute({ children }: { children: React.ReactNode }) {
  const { loading, role, shopId } = useAuth()
  const navigate = useNavigate()
  const [checkLoading, setCheckLoading] = useState(true)
  const location = useLocation()

  // Always allow /billing route regardless of subscription status
  const isBillingRoute = location.pathname === '/billing' || location.pathname === '/shop-billing'

  useEffect(() => {
    const checkSub = async () => {
      if (role !== 'shop' || !shopId || isBillingRoute) {
        setCheckLoading(false)
        return
      }

      try {
        const status = await checkSubscriptionStatus(shopId)

        // Redirect suspended/expired users to billing
        if (status.status === 'suspended' || status.status === 'expired') {
          navigate('/billing', { replace: true })
        }
      } catch (error) {
        console.error('Error checking subscription:', error)
      } finally {
        setCheckLoading(false)
      }
    }

    checkSub()
  }, [shopId, role, isBillingRoute, navigate])

  if (loading || checkLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-gold-400/20 border-t-gold-400 animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    )
  }

  if (!role) {
    return <Navigate to="/login" replace />
  }

  if (role !== 'shop') {
    return <Navigate to="/admin" replace />
  }

  return <>{children}</>
}

function App() {
  const { theme } = useTheme()
  const { language } = useLanguage()

  // Update document attributes for theme and language
  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [language, theme])

  return (
    <div className={theme === 'dark' ? 'dark' : 'light'}>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Shop Routes - Protected */}
          <Route
            path="/dashboard"
            element={
              <ShopRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ShopRoute>
            }
          />
          <Route
            path="/pos"
            element={
              <ShopRoute>
                <Layout>
                  <POS />
                </Layout>
              </ShopRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <ShopRoute>
                <Layout>
                  <Clients />
                </Layout>
              </ShopRoute>
            }
          />
          <Route
            path="/barbers"
            element={
              <ShopRoute>
                <Layout>
                  <Barbers />
                </Layout>
              </ShopRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <ShopRoute>
                <Layout>
                  <Bookings />
                </Layout>
              </ShopRoute>
            }
          />
          <Route
            path="/queue"
            element={
              <ShopRoute>
                <Layout>
                  <QueueDisplay />
                </Layout>
              </ShopRoute>
            }
          />
          <Route
            path="/services"
            element={
              <ShopRoute>
                <Layout>
                  <Services />
                </Layout>
              </ShopRoute>
            }
          />
          <Route
            path="/logs"
            element={
              <ShopRoute>
                <Layout>
                  <DailyLogs />
                </Layout>
              </ShopRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ShopRoute>
                <Layout>
                  <Expenses />
                </Layout>
              </ShopRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ShopRoute>
                <Layout>
                  <Analytics />
                </Layout>
              </ShopRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ShopRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ShopRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ShopRoute>
                <Layout>
                  <ShopBilling />
                </Layout>
              </ShopRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Layout>
                  <AdminDashboard />
                </Layout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/shops"
            element={
              <AdminRoute>
                <Layout>
                  <AdminShops />
                </Layout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/plans"
            element={
              <AdminRoute>
                <Layout>
                  <AdminPlans />
                </Layout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/billing"
            element={
              <AdminRoute>
                <Layout>
                  <AdminBilling />
                </Layout>
              </AdminRoute>
            }
          />

          {/* Portal Routes - Public, Slug-based, Secure Auth */}
          <Route path="/shop/:slug" element={<PortalLoginSecure />} />
          <Route path="/shop/:slug/login" element={<PortalLoginSecure />} />
          <Route path="/shop/:slug/register" element={<PortalRegister />} />
          <Route path="/shop/:slug/dashboard" element={<PortalDashboard />} />
          <Route path="/shop/:slug/bookings" element={<PortalBookings />} />
          <Route path="/shop/:slug/history" element={<PortalHistory />} />
          <Route path="/shop/:slug/profile" element={<PortalProfile />} />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      <Toaster position="bottom-center" />
    </div>
  )
}

export default App
