import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, CheckCircle, Eye, Wrench, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { MOCK_ALERTS, timeAgo } from '../data/mockData'
import { SeverityBadge, StatusBadge } from '../components/shared/StatusBadge'
import EmptyState from '../components/shared/EmptyState'
import './QueuePage.css'

const TYPE_ICONS = {
  chemical: '⚗️', structural: '🏗️', electrical: '⚡',
  fire_safety: '🔥', slip_trip: '🦺', gas: '💨',
  biological: '🧫', mechanical: '⚙️', other: '⚠️',
}

export default function QueuePage() {
  const { caps } = useAuth()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('pending')

  // Queue shows alerts relevant to role
  const queueAlerts = MOCK_ALERTS.filter(a => {
    if (filter === 'all') return true
    if (filter === 'pending') return a.status === 'pending'
    if (filter === 'verified') return a.status === 'verified'
    return true
  })

  const pendingCount  = MOCK_ALERTS.filter(a => a.status === 'pending').length
  const verifiedCount = MOCK_ALERTS.filter(a => a.status === 'verified').length
  const critCount     = MOCK_ALERTS.filter(a => a.severity === 'critical' && a.status === 'pending').length

  return (
    <div className="queue-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <ClipboardList size={22} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
            Verification &amp; Correction Queue
          </h1>
          <p className="page-subtitle">Alerts assigned for review, verification, or corrective action.</p>
        </div>
      </div>

      {/* Queue stats */}
      <div className="queue-stats">
        <div className="queue-stat queue-stat--critical">
          <span className="queue-stat-val" style={{ color: 'var(--sev-critical)' }}>{critCount}</span>
          <span className="queue-stat-label">Critical Pending</span>
        </div>
        <div className="queue-stat">
          <span className="queue-stat-val" style={{ color: 'var(--status-pending)' }}>{pendingCount}</span>
          <span className="queue-stat-label">Awaiting Verification</span>
        </div>
        <div className="queue-stat">
          <span className="queue-stat-val" style={{ color: 'var(--status-verified)' }}>{verifiedCount}</span>
          <span className="queue-stat-label">Awaiting Correction</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="dashboard-filters" style={{ marginBottom: '1.25rem' }}>
        {[['all','All'],['pending','Needs Verification'],['verified','Needs Correction']].map(([val, label]) => (
          <button
            key={val}
            id={`queue-filter-${val}`}
            className={`dashboard-filter-btn ${filter === val ? 'dashboard-filter-btn--active' : ''}`}
            onClick={() => setFilter(val)}
          >
            {label}
            {val === 'pending' && pendingCount > 0 && (
              <span className="sidebar-badge" style={{ marginLeft: 6 }}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Queue table */}
      {queueAlerts.length === 0 ? (
        <EmptyState icon="✅" title="Queue is empty" description="No alerts are currently in this queue." />
      ) : (
        <div className="queue-table-wrap">
          <table className="queue-table">
            <thead>
              <tr>
                <th>Hazard</th>
                <th>Location</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Reported</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {queueAlerts.map(alert => {
                const icon = TYPE_ICONS[alert.type] || '⚠️'
                return (
                  <tr key={alert.id} className="queue-row">
                    <td>
                      <div className="queue-row-title">
                        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                            {alert.title}
                          </p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {alert.reportedBy}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        📍 {alert.location}
                      </span>
                    </td>
                    <td><SeverityBadge severity={alert.severity} /></td>
                    <td><StatusBadge status={alert.status} /></td>
                    <td>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {timeAgo(alert.reportedAt)}
                      </span>
                    </td>
                    <td>
                      <div className="queue-actions">
                        <button
                          id={`view-alert-${alert.id}`}
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/dashboard/alert/${alert.id}`)}
                          title="View details"
                        >
                          <Eye size={14} />
                        </button>
                        {caps.canCorrect && alert.status === 'verified' && (
                          <button
                            id={`correct-queue-${alert.id}`}
                            className="btn btn-primary btn-sm"
                            onClick={() => navigate(`/dashboard/queue/correct/${alert.id}`)}
                            title="Apply correction"
                          >
                            <Wrench size={14} /> Correct
                          </button>
                        )}
                        {!caps.canCorrect && alert.status === 'pending' && (
                          <button
                            id={`verify-alert-${alert.id}`}
                            className="btn btn-primary btn-sm"
                            onClick={() => navigate(`/dashboard/alert/${alert.id}`)}
                            title="Verify"
                          >
                            <CheckCircle size={14} /> Verify
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
