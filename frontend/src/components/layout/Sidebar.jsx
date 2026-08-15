import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Map, Bell, PlusCircle, FileText,
  BarChart3, BookOpen, ClipboardList, Shield, User,
  Settings, LogOut, X, ChevronRight
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import './Sidebar.css'

function HazardIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="30" fill="hsl(220,25%,10%)" stroke="var(--accent)" strokeWidth="2.5"/>
      <path d="M32 15 L50 47 H14 Z" fill="none" stroke="var(--accent)" strokeWidth="2.8" strokeLinejoin="round"/>
      <circle cx="32" cy="41" r="2.8" fill="var(--accent)"/>
      <rect x="30.5" y="25" width="3" height="12" rx="1.5" fill="var(--accent)"/>
    </svg>
  )
}

const ROLE_COLORS = {
  reporter:  { bg: 'hsla(35,95%,55%,0.15)',  text: 'hsl(35,100%,62%)' },
  verifier:  { bg: 'hsla(195,70%,50%,0.15)', text: 'hsl(195,70%,60%)' },
  corrector: { bg: 'hsla(145,60%,45%,0.15)', text: 'hsl(145,60%,52%)' },
  admin:     { bg: 'hsla(280,70%,60%,0.15)', text: 'hsl(280,70%,70%)' },
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, caps, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  if (!user) return null
  const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.reporter

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <HazardIcon />
          <span className="sidebar-logo-name">Hazard<span>Lens</span></span>
        </div>
        <button className="sidebar-close btn btn-icon btn-ghost" onClick={onClose} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      {/* User card — click to view profile */}
      <button className="sidebar-user" onClick={() => { navigate('/dashboard/settings'); onClose() }}>
        <div className="sidebar-avatar">{user.avatar}</div>
        <div className="sidebar-user-info">
          <p className="sidebar-user-name">{user.name}</p>
          <span className="sidebar-role-badge" style={{ background: roleStyle.bg, color: roleStyle.text }}>
            {user.role}
          </span>
        </div>
        <ChevronRight size={14} className="sidebar-user-chevron" />
      </button>

      <hr className="divider" style={{ margin: '0 1rem' }} />

      {/* Navigation */}
      <nav className="sidebar-nav">
        <p className="sidebar-nav-label">Main</p>

        <NavLink to="/dashboard" end className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        {/* NOTE: no /dashboard/live-map route exists yet in your router —
            this link will dead-end until that page is built. */}
        <NavLink to="/dashboard/live-map" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
          <Map size={18} />
          <span>Live Map</span>
        </NavLink>

        <NavLink to="/dashboard/notifications" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
          <Bell size={18} />
          <span>Alerts</span>
          <span className="sidebar-badge">3</span>
        </NavLink>

        <p className="sidebar-nav-label">Reports</p>

        <NavLink to="/dashboard/report/new" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
          <PlusCircle size={18} />
          <span>New Report</span>
        </NavLink>

        <NavLink to="/dashboard/my-reports" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
          <FileText size={18} />
          <span>Reports</span>
        </NavLink>

        <p className="sidebar-nav-label">Insights</p>

        {/* NOTE: /dashboard/analytics and /dashboard/resources don't
            exist yet either — same situation as Live Map above. */}
        <NavLink to="/dashboard/analytics" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
          <BarChart3 size={18} />
          <span>Analytics</span>
        </NavLink>

        <NavLink to="/dashboard/resources" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
          <BookOpen size={18} />
          <span>Resources</span>
        </NavLink>

        {caps.canQueue && (
          <>
            <p className="sidebar-nav-label">Authorized</p>
            <NavLink to="/dashboard/queue" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
              <ClipboardList size={18} />
              <span>Verification Queue</span>
            </NavLink>
          </>
        )}

        {caps.canAdmin && (
          <NavLink to="/dashboard/admin" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
            <Shield size={18} />
            <span>Admin Panel</span>
          </NavLink>
        )}

        <p className="sidebar-nav-label">Account</p>

        {/* Profile currently points at the same Settings page as the
            user card above — there's no page dedicated to just profile
            info yet, so this avoids a second dead link. */}
        <NavLink to="/dashboard/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
          <User size={18} />
          <span>Profile</span>
        </NavLink>

        <NavLink to="/dashboard/settings" end className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
          <Settings size={18} />
          <span>Settings</span>
        </NavLink>
      </nav>

      {/* Logout */}
      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}