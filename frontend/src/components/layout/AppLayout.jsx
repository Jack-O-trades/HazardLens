import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import './AppLayout.css'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()

  const isFullWidth = ['/dashboard/notifications', '/dashboard/settings'].includes(location.pathname)

  return (
    <div className={`app-layout ${isFullWidth ? 'app-layout--fullwidth' : ''}`}>
      {/* Overlay for mobile */}
      {!isFullWidth && sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {!isFullWidth && (
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      <div className="app-main">
        <TopBar onMenuClick={() => setSidebarOpen(prev => !prev)} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
