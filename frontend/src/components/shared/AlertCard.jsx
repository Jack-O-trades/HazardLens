import { useNavigate } from 'react-router-dom'
import { MapPin, Clock, ChevronRight, Check, X, Trash2 } from 'lucide-react'
import { SeverityBadge, StatusBadge } from './StatusBadge'
import { timeAgo } from '../../data/mockData'
import { useAuth } from '../../context/AuthContext'
import { useAlerts } from '../../context/AlertsContext'
import './AlertCard.css'

const TYPE_ICONS = {
  chemical:    '⚗️',
  structural:  '🏗️',
  electrical:  '⚡',
  fire_safety: '🔥',
  slip_trip:   '🦺',
  gas:         '💨',
  biological:  '🧫',
  mechanical:  '⚙️',
  other:       '⚠️',
  flood:       '💧',
  fire:        '🔥',
  seismic:     '📳',
  infrastructure: '🏗️',
  weather:     '🌩️',
  river:       '💧',
}

export default function AlertCard({ alert, compact = false }) {
  const navigate = useNavigate()
  const { user, caps } = useAuth()
  const { verifyAlert, rejectAlert, deleteAlert } = useAlerts()

  const icon = TYPE_ICONS[alert.type] || TYPE_ICONS[alert.hazardType] || '⚠️'
  const confidenceTone = alert.confidence >= 75 ? 'high' : alert.confidence >= 50 ? 'medium' : 'low'
  const isAdminOrVerifier = caps?.canAdmin || caps?.canQueue || user?.role === 'admin' || user?.role === 'verifier'
  const isAdmin = caps?.canAdmin || user?.role === 'admin'

  return (
    <div
      className={`alert-card ${compact ? 'alert-card--compact' : ''} alert-card--${alert.severity}`}
      onClick={() => navigate(`/dashboard/alert/${alert.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/dashboard/alert/${alert.id}`)}
    >
      <div className="alert-card-header">
        <span className="alert-card-icon" role="img" aria-hidden>{icon}</span>
        <div className="alert-card-meta">
          <SeverityBadge severity={alert.severity} />
          <span className={`alert-card-confidence alert-card-confidence--${confidenceTone}`}>
            {alert.confidence}%
          </span>
          {alert.reportedByRole === 'reporter' && (
            <span className="alert-card-field-badge" title="Submitted by Field Operations">Field Report</span>
          )}
          {!compact && <StatusBadge status={alert.status} />}
        </div>
        <ChevronRight size={16} className="alert-card-arrow" />
      </div>

      <h3 className="alert-card-title">{alert.title}</h3>

      {!compact && (
        <p className="alert-card-desc">{alert.description}</p>
      )}

      <div className={compact ? 'alert-card-compact-meta' : 'alert-card-footer'}>
        <span className="alert-card-location">
          <MapPin size={12} />
          {alert.location}
        </span>
        <span className="alert-card-time">
          <Clock size={12} />
          {timeAgo(alert.reportedAt)}
        </span>
      </div>

      {isAdminOrVerifier && (
        <div className="alert-card-admin-actions" onClick={(e) => e.stopPropagation()}>
          {alert.status === 'pending' && (
            <>
              <button
                type="button"
                className="alert-card-admin-btn alert-card-admin-btn--verify"
                onClick={(e) => {
                  e.stopPropagation()
                  verifyAlert(alert.id, user?.name || 'Admin')
                }}
                title="Verify this report"
              >
                <Check size={13} />
                Verify (Approve)
              </button>
              <button
                type="button"
                className="alert-card-admin-btn alert-card-admin-btn--reject"
                onClick={(e) => {
                  e.stopPropagation()
                  rejectAlert(alert.id, user?.name || 'Admin')
                }}
                title="Reject fake report"
              >
                <X size={13} />
                Reject (Fake)
              </button>
            </>
          )}

          {isAdmin && (
            <button
              type="button"
              className="alert-card-admin-btn alert-card-admin-btn--delete"
              onClick={(e) => {
                e.stopPropagation()
                if (window.confirm(`Delete report "${alert.title}" permanently?`)) {
                  deleteAlert(alert.id)
                }
              }}
              title="Delete report permanently"
            >
              <Trash2 size={13} />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}