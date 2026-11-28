import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import './AppLayout.css'

const MOBILE_MQ = '(max-width: 768px)'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? !window.matchMedia(MOBILE_MQ).matches : true
  )
  const location = useLocation()

  const isFullWidth = false

  // Keep sidebar in sync when switching between mobile (<=768px) and desktop (>768px)
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const handleViewportChange = (e) => {
      setSidebarOpen(!e.matches)
    }
    mq.addEventListener('change', handleViewportChange)
    return () => mq.removeEventListener('change', handleViewportChange)
  }, [])

  // Auto-close mobile drawer on route change; keep desktop sidebar open
  useEffect(() => {
    if (window.matchMedia(MOBILE_MQ).matches) {
      setSidebarOpen(false)
    }
  }, [location.pathname])

  const handleSidebarClose = () => {
    setSidebarOpen(false)
  }

  return (
    <div className={`app-layout ${isFullWidth ? 'app-layout--fullwidth' : ''}`}>
      {/* Overlay for mobile */}
      {!isFullWidth && sidebarOpen && (
        <div className="sidebar-overlay" onClick={handleSidebarClose} />
      )}

      {!isFullWidth && (
        <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />
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
