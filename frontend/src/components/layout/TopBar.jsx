import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Search, ChevronDown, Menu, User, Settings, LogOut, Sun, Moon } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import './TopBar.css'

/* Shield icon matching the dark navy shield in the reference image */
function RiverdaleShieldIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M32 4 L56 14 L56 36 C56 50 44 60 32 63 C20 60 8 50 8 36 L8 14 Z"
        fill="#1e2a3a"
        stroke="#2d3f55"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Inner shield bevel */}
      <path
        d="M32 9 L52 18 L52 36 C52 48 42 57 32 60 C22 57 12 48 12 36 L12 18 Z"
        fill="#243447"
        stroke="none"
      />
      {/* Alert triangle icon inside shield */}
      <path
        d="M32 24 L42 42 H22 Z"
        fill="none"
        stroke="#7bafd4"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="38" r="2" fill="#7bafd4" />
      <rect x="30.8" y="28" width="2.4" height="7" rx="1.2" fill="#7bafd4" />
    </svg>
  )
}

/* Dynamic avatar — initials with role-based colour */
const ROLE_AVATAR_COLORS = {
  community:  { bg: 'hsla(210,55%,55%,0.20)', text: 'hsl(210,65%,55%)',  border: 'hsla(210,65%,55%,0.35)' },
  reporter:   { bg: 'hsla(35,95%,55%,0.20)',  text: 'hsl(35,100%,55%)',  border: 'hsla(35,95%,55%,0.35)'  },
  verifier:   { bg: 'hsla(195,70%,50%,0.20)', text: 'hsl(195,70%,52%)',  border: 'hsla(195,70%,50%,0.35)' },
  corrector:  { bg: 'hsla(145,60%,45%,0.20)', text: 'hsl(145,60%,48%)',  border: 'hsla(145,60%,45%,0.35)' },
  admin:      { bg: 'hsla(280,65%,60%,0.20)', text: 'hsl(280,65%,65%)',  border: 'hsla(280,65%,60%,0.35)' },
}

function UserAvatar({ user }) {
  const colors = ROLE_AVATAR_COLORS[user?.role] || ROLE_AVATAR_COLORS.community
  return (
    <div
      className="topbar-avatar topbar-avatar--initials"
      style={{ background: colors.bg, color: colors.text, border: `1.5px solid ${colors.border}` }}
    >
      {user?.avatar || 'U'}
    </div>
  )
}

export default function TopBar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef(null)

  /* Close dropdown when clicking outside */
  useEffect(() => {
    function handleOutside(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false)
      }
    }
    if (dropOpen) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [dropOpen])

  function handleLogout() {
    setDropOpen(false)
    logout()
    navigate('/')
  }

  return (
    <header className="topbar">
      {/* Left — Hamburger + Branding */}
      <div className="topbar-left">
        <button
          className="topbar-menu-btn"
          onClick={onMenuClick}
          aria-label="Toggle sidebar"
          id="topbar-menu-btn"
        >
          <Menu size={20} />
        </button>

        <div className="topbar-brand" onClick={() => navigate('/dashboard')} role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && navigate('/dashboard')}>
          <RiverdaleShieldIcon />
          <div className="topbar-brand-text">
            <span className="topbar-brand-name">RIVERDALE ALERTS</span>
            <span className="topbar-brand-sub">Local Hazard Monitoring</span>
          </div>
        </div>
      </div>

      {/* Center — Search */}
      <div id="topbar-search-target" className="topbar-search-wrap">
        <Search size={15} className="topbar-search-icon" />
        <input
          type="search"
          className="topbar-search-input"
          placeholder="Search map or location…"
          aria-label="Search"
          id="topbar-search"
        />
        <kbd className="topbar-kbd">⌘ K</kbd>
      </div>

      {/* Right — Bell + User */}
      <div className="topbar-right">
        <button
          className="topbar-theme-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          id="topbar-theme-toggle"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <button
          className="topbar-bell-btn"
          onClick={() => navigate('/dashboard/notifications')}
          aria-label="Notifications"
          id="topbar-bell"
        >
          <Bell size={18} />
          <span className="topbar-notif-dot" />
        </button>

        {/* User dropdown trigger */}
        <div className="topbar-user-wrap" ref={dropRef}>
          <button
            className={`topbar-user-btn ${dropOpen ? 'topbar-user-btn--open' : ''}`}
            onClick={() => setDropOpen(v => !v)}
            aria-label="User menu"
            aria-expanded={dropOpen}
            id="topbar-user"
          >
            <UserAvatar user={user} />
            <div className="topbar-user-info">
              <span className="topbar-user-name">{user?.name || 'Guest'}</span>
              <span className="topbar-user-role">{user?.role || ''}</span>
            </div>
            <ChevronDown size={14} className={`topbar-chevron ${dropOpen ? 'topbar-chevron--up' : ''}`} />
          </button>

          {/* Dropdown */}
          {dropOpen && (
            <div className="topbar-dropdown" role="menu">
              {/* Profile header inside dropdown */}
              <div className="topbar-drop-profile">
                <UserAvatar user={user} />
                <div>
                  <p className="topbar-drop-name">{user?.name}</p>
                  <p className="topbar-drop-email">{user?.email}</p>
                </div>
              </div>

              <div className="topbar-drop-divider" />

              <button
                className="topbar-drop-item"
                role="menuitem"
                id="drop-profile"
                onClick={() => { setDropOpen(false); navigate('/dashboard/profile') }}
              >
                <User size={15} />
                <span>View Profile</span>
              </button>

              <button
                className="topbar-drop-item"
                role="menuitem"
                id="drop-settings"
                onClick={() => { setDropOpen(false); navigate('/dashboard/settings') }}
              >
                <Settings size={15} />
                <span>Settings</span>
              </button>

              <div className="topbar-drop-divider" />

              <button
                className="topbar-drop-item topbar-drop-item--danger"
                role="menuitem"
                id="drop-signout"
                onClick={handleLogout}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
