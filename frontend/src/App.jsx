import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AlertsProvider } from './context/AlertsContext'
import { ThemeProvider } from './context/ThemeContext'

// Layouts
import AppLayout from './components/layout/AppLayout'
import AuthLayout from './components/layout/AuthLayout'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LiveMapPage from './pages/LiveMapPage'
import AlertDetailPage from './pages/AlertDetailPage'
import CorrectionPage from './pages/CorrectionPage'
import NotificationCenter from './pages/NotificationCenter'
import NewReportPage from './pages/NewReportPage'
import AddContextPage from './pages/AddContextPage'
import SubmissionSuccessPage from './pages/SubmissionSuccessPage'
import MyReportsPage from './pages/MyReportsPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import QueuePage from './pages/QueuePage'
import QueueCorrectionPage from './pages/QueueCorrectionPage'
import AdminPage from './pages/AdminPage'
import ResourcesPage from './pages/ResourcesPage'

function ProtectedRoute({ children, requireCap }) {
  const { user, caps } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (requireCap && !caps[requireCap]) return <Navigate to="/dashboard" replace />
  return children
}

function PublicRoute({ children }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><AuthLayout><LoginPage /></AuthLayout></PublicRoute>} />

      {/* Protected — App Shell */}
      <Route path="/dashboard" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="live-map" element={<LiveMapPage />} />
        <Route path="alert/:id" element={<AlertDetailPage />} />
        <Route path="alert/:id/correct" element={<ProtectedRoute requireCap="canCorrect"><CorrectionPage /></ProtectedRoute>} />
        <Route path="notifications" element={<NotificationCenter />} />
        <Route path="report/new" element={<NewReportPage />} />
        <Route path="report/context" element={<AddContextPage />} />
        <Route path="report/success" element={<SubmissionSuccessPage />} />
        <Route path="my-reports" element={<MyReportsPage />} />
        <Route path="my-reports-own" element={<MyReportsPage showOnlyOwn={true} />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="resources" element={<ResourcesPage />} />
        <Route path="queue" element={<ProtectedRoute requireCap="canQueue"><QueuePage /></ProtectedRoute>} />
        <Route path="queue/correct/:id" element={<ProtectedRoute requireCap="canCorrect"><QueueCorrectionPage /></ProtectedRoute>} />
        <Route path="admin" element={<ProtectedRoute requireCap="canAdmin"><AdminPage /></ProtectedRoute>} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AlertsProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AlertsProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}