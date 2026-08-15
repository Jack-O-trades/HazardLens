import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './ProfilePage.css'

function getRoleLabel(role) {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User'
}

export default function ProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const roleLabel = getRoleLabel(user.role)

  return (
    <div className="profile-page">
      <div className="profile-header">
        <button type="button" className="profile-back-btn" onClick={() => navigate('/dashboard')}>
          Back
        </button>

        <h1 className="profile-title">Profile</h1>

        <button type="button" className="profile-edit-btn" onClick={() => navigate('/dashboard/settings')}>
          Edit settings
        </button>
      </div>

      <div className="profile-shell">
        <div className="profile-hero">
          <div className="profile-user">
            <div className="profile-avatar">{user.avatar || 'U'}</div>

            <div className="profile-user-main">
              <h2 className="profile-user-name">{user.name}</h2>
              <span className="profile-role-badge">{roleLabel}</span>
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
              <InfoRow label="Email" value={user.email || 'Not provided'} />
              <InfoRow label="Department" value={user.department || 'Not provided'} />
              <InfoRow label="Reports" value={user.reportsCount ?? 0} />
              <InfoRow
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
                <li className="profile-activity-item">
                  <div className="profile-activity-left">
                    <span className="profile-activity-name">Flood watch verification</span>
                    <span className="profile-activity-meta">Updated 2 hours ago</span>
                  </div>
                  <span className="profile-activity-tag">Verified</span>
                </li>
                <li className="profile-activity-item">
                  <div className="profile-activity-left">
                    <span className="profile-activity-name">Road closure report</span>
                    <span className="profile-activity-meta">Filed yesterday</span>
                  </div>
                  <span className="profile-activity-tag">Open</span>
                </li>
                <li className="profile-activity-item">
                  <div className="profile-activity-left">
                    <span className="profile-activity-name">Response checklist</span>
                    <span className="profile-activity-meta">Reviewed 3 days ago</span>
                  </div>
                  <span className="profile-activity-tag">Audit</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="profile-info-item">
      <span className="profile-info-label">{label}</span>
      <div className="profile-info-value">{value}</div>
    </div>
  )
}
