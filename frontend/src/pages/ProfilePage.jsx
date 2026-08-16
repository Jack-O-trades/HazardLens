import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Settings, Mail, Building2, FileText, CalendarDays,
  CheckCircle2, Clock, ClipboardCheck
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './ProfilePage.css'

function getRoleLabel(role) {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User'
}

/* Same role → color mapping already established in Sidebar.jsx /
   TopBar.jsx, deepened slightly for text-on-light-background contrast. */
const ROLE_COLORS = {
  community: { bg: 'hsla(210,65%,55%,0.14)', text: 'hsl(210,65%,42%)' },
  reporter:  { bg: 'hsla(35,95%,50%,0.14)',  text: 'hsl(32,85%,38%)' },
  verifier:  { bg: 'hsla(195,70%,50%,0.14)', text: 'hsl(195,65%,38%)' },
  corrector: { bg: 'hsla(145,60%,45%,0.14)', text: 'hsl(145,55%,32%)' },
  admin:     { bg: 'hsla(280,65%,55%,0.14)', text: 'hsl(280,55%,42%)' },
}

const ACTIVITY = [
  { name: 'Flood watch verification', meta: 'Updated 2 hours ago', tag: 'Verified', icon: CheckCircle2 },
  { name: 'Road closure report',      meta: 'Filed yesterday',     tag: 'Open',     icon: Clock },
  { name: 'Response checklist',       meta: 'Reviewed 3 days ago', tag: 'Audit',    icon: ClipboardCheck },
]

export default function ProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const roleLabel = getRoleLabel(user.role)
  const roleColor = ROLE_COLORS[user.role] || ROLE_COLORS.community

  return (
    <div className="profile-page">
      <div className="profile-header">
        <button type="button" className="profile-back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={15} /> Back
        </button>

        <h1 className="profile-title">Profile</h1>

        <button type="button" className="profile-edit-btn" onClick={() => navigate('/dashboard/settings')}>
          <Settings size={14} /> Edit settings
        </button>
      </div>

      <div className="profile-shell">
        <div className="profile-hero">
          <div className="profile-user">
            <div className="profile-avatar-wrap">
              <div className="profile-avatar">{user.avatar || 'U'}</div>
              <span className="profile-avatar-ring" style={{ '--ring-color': roleColor.text }} />
            </div>

            <div className="profile-user-main">
              <h2 className="profile-user-name">{user.name}</h2>
              <span className="profile-role-badge" style={{ background: roleColor.bg, color: roleColor.text }}>
                {roleLabel}
              </span>
            </div>
          </div>

          <div className="profile-status">
            <span className="profile-status-dot" />
            Active
          </div>
        </div>

        <div className="profile-content">
          <div className="profile-card">
            <h3 className="profile-card-title">Account details</h3>
            <div className="profile-info-grid">
              <InfoRow icon={Mail}        label="Email"      value={user.email || 'Not provided'} />
              <InfoRow icon={Building2}   label="Department" value={user.department || 'Not provided'} />
              <InfoRow icon={FileText}    label="Reports"    value={user.reportsCount ?? 0} />
              <InfoRow
                icon={CalendarDays}
                label="Joined"
                value={user.joinedAt ? new Date(user.joinedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown'}
              />
            </div>
          </div>

          <div className="profile-summary">
            <div className="profile-card">
              <h3 className="profile-card-title">Overview</h3>
              <div className="summary-metric">
                <span className="summary-metric-value">{user.reportsCount ?? 0}</span>
                <span className="summary-metric-label">Submitted reports</span>
              </div>
            </div>

            <div className="profile-card">
              <h3 className="profile-card-title">Recent activity</h3>
              <ul className="profile-activity-list">
                {ACTIVITY.map(a => (
                  <li key={a.name} className="profile-activity-item">
                    <div className="profile-activity-left">
                      <span className="profile-activity-name">{a.name}</span>
                      <span className="profile-activity-meta">{a.meta}</span>
                    </div>
                    <span className={`profile-activity-tag profile-activity-tag--${a.tag.toLowerCase()}`}>
                      <a.icon size={11} /> {a.tag}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="profile-info-item">
      <span className="profile-info-label">
        <Icon size={12} /> {label}
      </span>
      <div className="profile-info-value">{value}</div>
    </div>
  )
}