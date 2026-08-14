import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  MapPin,
  Clock,
  User,
  Wrench,
  CheckCircle,
  ShieldAlert,
  Radio,
  Activity,
  Navigation,
  ExternalLink,
  AlertTriangle,
  Users,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { SeverityBadge, StatusBadge } from '../components/shared/StatusBadge'
import { MOCK_ALERTS, formatDate, timeAgo } from '../data/mockData'
import './AlertDetailPage.css'

const TYPE_ICONS = {
  chemical: '⚗️',
  structural: '🏗️',
  electrical: '⚡',
  fire_safety: '🔥',
  slip_trip: '🦺',
  gas: '💨',
  biological: '🧫',
  mechanical: '⚙️',
  other: '⚠️',
}

const TYPE_LABELS = {
  chemical: 'Chemical Hazard',
  structural: 'Structural Hazard',
  electrical: 'Electrical Hazard',
  fire_safety: 'Fire Safety',
  slip_trip: 'Slip / Trip',
  gas: 'Gas Leak',
  biological: 'Biological Hazard',
  mechanical: 'Mechanical Hazard',
  other: 'Other Hazard',
}

const TIMELINE_COLORS = {
  report: {
    bg: 'hsla(35,95%,55%,0.15)',
    border: 'var(--accent)',
    icon: '📋',
  },
  system: {
    bg: 'hsla(220,15%,30%,0.2)',
    border: 'var(--border)',
    icon: '⚙️',
  },
  verify: {
    bg: 'hsla(195,70%,50%,0.15)',
    border: 'var(--sev-low)',
    icon: '🔍',
  },
  correct: {
    bg: 'hsla(145,60%,45%,0.15)',
    border: 'var(--sev-safe)',
    icon: '✅',
  },
}

const SEVERITY_CONFIG = {
  critical: {
    label: 'CRITICAL',
    description: 'Immediate attention required',
  },
  high: {
    label: 'HIGH',
    description: 'Urgent response recommended',
  },
  medium: {
    label: 'MEDIUM',
    description: 'Monitor and investigate',
  },
  low: {
    label: 'LOW',
    description: 'Low immediate risk',
  },
}

export default function AlertDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { caps } = useAuth()

  const alert = MOCK_ALERTS.find((a) => a.id === id)

  if (!alert) {
    return (
      <div className="alert-not-found animate-fade-in">
        <div className="not-found-icon">🔍</div>

        <h2>Alert Not Found</h2>

        <p>
          The alert you're looking for doesn't exist or may have been removed.
        </p>

        <button
          className="btn btn-ghost"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </div>
    )
  }

  const icon = TYPE_ICONS[alert.type] || '⚠️'

  const severity =
    SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium

  const isResolved = alert.status === 'resolved'

  return (
    <div className="alert-detail animate-fade-in">

      {/* =====================================================
          TOP NAVIGATION
      ===================================================== */}

      <div className="alert-detail-nav">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft size={15} />
          Back to Dashboard
        </button>

        <div className="alert-id">
          ALERT #{alert.id}
        </div>
      </div>

      {/* =====================================================
          HERO HEADER
      ===================================================== */}

      <section className={`alert-hero severity-${alert.severity}`}>

        <div className="alert-hero-main">

          <div className="alert-type-icon">
            <span role="img">{icon}</span>
          </div>

          <div className="alert-hero-content">

            <div className="alert-eyebrow">
              <ShieldAlert size={14} />
              INCIDENT ALERT
            </div>

            <h1>{alert.title}</h1>

            <div className="alert-meta">

              <span className="alert-meta-item">
                <MapPin size={13} />
                {alert.location}
              </span>

              <span className="alert-meta-divider">•</span>

              <span className="alert-meta-item">
                <Clock size={13} />
                Reported {timeAgo(alert.reportedAt)}
              </span>

            </div>

            <div className="alert-badge-row">
              <SeverityBadge severity={alert.severity} />
              <StatusBadge status={alert.status} />
            </div>

          </div>

        </div>

        <div className="alert-hero-action">

          <div className="severity-summary">
            <span className="severity-summary-label">
              {severity.label}
            </span>

            <span className="severity-summary-description">
              {severity.description}
            </span>
          </div>

          {caps.canCorrect && !isResolved && (
            <button
              className="btn btn-primary correction-action"
              onClick={() =>
                navigate(`/dashboard/alert/${id}/correct`)
              }
            >
              <Wrench size={16} />
              Apply Correction
            </button>
          )}

        </div>

      </section>

      {/* =====================================================
          QUICK STATS
      ===================================================== */}

      <section className="alert-quick-stats">

        <div className="quick-stat">
          <div className="quick-stat-icon">
            <Activity size={17} />
          </div>

          <div>
            <span className="quick-stat-label">Severity</span>
            <strong>{alert.severity.toUpperCase()}</strong>
          </div>
        </div>

        <div className="quick-stat">
          <div className="quick-stat-icon">
            <Radio size={17} />
          </div>

          <div>
            <span className="quick-stat-label">Status</span>
            <strong>{alert.status}</strong>
          </div>
        </div>

        <div className="quick-stat">
          <div className="quick-stat-icon">
            <Users size={17} />
          </div>

          <div>
            <span className="quick-stat-label">Reported By</span>
            <strong>{alert.reportedBy}</strong>
          </div>
        </div>

        <div className="quick-stat">
          <div className="quick-stat-icon">
            <AlertTriangle size={17} />
          </div>

          <div>
            <span className="quick-stat-label">Hazard Type</span>
            <strong>
              {TYPE_LABELS[alert.type] || alert.type}
            </strong>
          </div>
        </div>

      </section>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <div className="alert-detail-body">

        {/* ================= MAIN ================= */}

        <main className="alert-detail-main">

          {/* DESCRIPTION */}

          <section className="card alert-section">

            <div className="section-heading">

              <div>
                <span className="section-kicker">OVERVIEW</span>
                <h3>Incident Description</h3>
              </div>

              <ShieldAlert size={18} />

            </div>

            <p className="incident-description">
              {alert.description}
            </p>

          </section>

          {/* LOCATION */}

          <section className="card alert-section">

            <div className="section-heading">

              <div>
                <span className="section-kicker">GEOLOCATION</span>
                <h3>Incident Location</h3>
              </div>

              <MapPin size={18} />

            </div>

            <div className="location-address">
              <MapPin size={16} />
              <span>{alert.location}</span>
            </div>

            <div className="alert-map">

              <div className="map-grid" />

              <div className="map-marker">
                <div className="map-marker-pulse" />
                <MapPin size={28} fill="currentColor" />
              </div>

              <div className="map-label">
                <strong>Incident Location</strong>
                <span>{alert.location}</span>
              </div>

              <button className="map-expand">
                <Navigation size={14} />
                View on Map
                <ExternalLink size={12} />
              </button>

            </div>

          </section>

          {/* EVIDENCE */}

          <section className="card alert-section">

            <div className="section-heading">

              <div>
                <span className="section-kicker">EVIDENCE</span>
                <h3>Detection Sources</h3>
              </div>

              <Radio size={18} />

            </div>

            <div className="evidence-grid">

              <div className="evidence-item">
                <div className="evidence-icon">📱</div>
                <div>
                  <strong>Human Report</strong>
                  <span>Primary observation</span>
                </div>
                <div className="evidence-status verified">
                  Verified
                </div>
              </div>

              <div className="evidence-item">
                <div className="evidence-icon">🤖</div>
                <div>
                  <strong>System Analysis</strong>
                  <span>Automated detection</span>
                </div>
                <div className="evidence-status">
                  Active
                </div>
              </div>

              <div className="evidence-item">
                <div className="evidence-icon">📡</div>
                <div>
                  <strong>Sensor Network</strong>
                  <span>Environmental telemetry</span>
                </div>
                <div className="evidence-status verified">
                  Online
                </div>
              </div>

            </div>

          </section>

          {/* TIMELINE */}

          <section className="card alert-section">

            <div className="section-heading">

              <div>
                <span className="section-kicker">AUDIT TRAIL</span>
                <h3>Incident Timeline</h3>
              </div>

              <Clock size={18} />

            </div>

            <div className="alert-timeline">

              {alert.timeline.map((event, i) => {

                const cfg =
                  TIMELINE_COLORS[event.type] ||
                  TIMELINE_COLORS.system

                const isLast = i === alert.timeline.length - 1

                return (
                  <div
                    key={i}
                    className={`alert-timeline-item ${
                      isLast ? 'timeline-last' : ''
                    }`}
                  >

                    <div className="timeline-track">

                      <div
                        className="alert-timeline-dot"
                        style={{
                          background: cfg.bg,
                          borderColor: cfg.border,
                        }}
                      >
                        {cfg.icon}
                      </div>

                    </div>

                    <div className="alert-timeline-content">

                      <div className="timeline-action">
                        {event.action}
                      </div>

                      <div className="timeline-meta">

                        <span>
                          <User size={11} />
                          {event.actor}
                        </span>

                        <span>•</span>

                        <span>
                          {formatDate(event.time)}
                        </span>

                      </div>

                    </div>

                  </div>
                )
              })}

            </div>

          </section>

        </main>

        {/* ================= SIDEBAR ================= */}

        <aside className="alert-detail-sidebar">

          {/* REPORT DETAILS */}

          <section className="card sidebar-card">

            <div className="sidebar-heading">
              <h3>Report Details</h3>
              <span className="sidebar-status-dot" />
            </div>

            <dl className="alert-detail-dl">

              <div>
                <dt>Reported By</dt>
                <dd>
                  <User size={12} />
                  {alert.reportedBy}
                </dd>
              </div>

              <div>
                <dt>Reported At</dt>
                <dd>{formatDate(alert.reportedAt)}</dd>
              </div>

              <div>
                <dt>Hazard Type</dt>
                <dd>
                  {TYPE_LABELS[alert.type] || alert.type}
                </dd>
              </div>

              <div>
                <dt>Severity</dt>
                <dd>
                  <SeverityBadge severity={alert.severity} />
                </dd>
              </div>

              <div>
                <dt>Status</dt>
                <dd>
                  <StatusBadge status={alert.status} />
                </dd>
              </div>

              {alert.verifiedBy && (
                <div>
                  <dt>Verified By</dt>
                  <dd className="verified-value">
                    <CheckCircle size={12} />
                    {alert.verifiedBy}
                  </dd>
                </div>
              )}

              {alert.correctedBy && (
                <div>
                  <dt>Corrected By</dt>
                  <dd className="corrected-value">
                    <CheckCircle size={12} />
                    {alert.correctedBy}
                  </dd>
                </div>
              )}

            </dl>

          </section>

          {/* CONFIDENCE */}

          <section className="card sidebar-card">

            <div className="sidebar-heading">
              <h3>Detection Confidence</h3>
            </div>

            <div className="confidence-value">
              <strong>87%</strong>
              <span>High confidence</span>
            </div>

            <div className="confidence-bar">
              <div style={{ width: '87%' }} />
            </div>

            <p className="confidence-description">
              Confidence is based on agreement between reported
              observations, automated analysis, and available
              sensor evidence.
            </p>

          </section>

          {/* CORRECTION */}

          {caps.canCorrect && !isResolved && (
            <section className="correction-card">

              <div className="correction-icon">
                <Wrench size={19} />
              </div>

              <div className="correction-content">

                <span className="section-kicker">
                  AUTHORIZED ACTION
                </span>

                <h3>Correction Available</h3>

                <p>
                  You have permission to review and apply a
                  correction to this incident.
                </p>

                <button
                  className="btn btn-primary"
                  onClick={() =>
                    navigate(`/dashboard/alert/${id}/correct`)
                  }
                >
                  Apply Correction
                  <ArrowLeft
                    size={14}
                    style={{ transform: 'rotate(180deg)' }}
                  />
                </button>

              </div>

            </section>
          )}

        </aside>

      </div>
    </div>
  )
}