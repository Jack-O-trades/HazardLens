import { useNavigate } from 'react-router-dom'
import { MapPin, Clock, ChevronRight } from 'lucide-react'
import { SeverityBadge, StatusBadge } from './StatusBadge'
import { timeAgo } from '../../data/mockData'
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
  const icon = TYPE_ICONS[alert.type] || TYPE_ICONS[alert.hazardType] || '⚠️'
  const confidenceTone = alert.confidence >= 75 ? 'high' : alert.confidence >= 50 ? 'medium' : 'low'

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
    </div>
  )
}