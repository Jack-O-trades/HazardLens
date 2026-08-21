import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Shield, Users, AlertTriangle, CheckCircle, Activity,
  Database, Settings, ArrowLeft, ShieldAlert, Clock,
} from 'lucide-react'
import { MOCK_ALERTS } from '../data/mockData'
import './AdminPage.css'

/* ── Color tokens ──
   Kept as {text, bg} pairs (not string concatenation) so the tinted
   backgrounds actually render — `${'hsl(...)'}22` is invalid CSS and
   silently drops the whole declaration. */
const SEVERITY_STYLES = {
  critical: { text: 'hsl(0,75%,55%)',   bg: 'hsla(0,75%,55%,0.12)' },
  high:     { text: 'hsl(25,95%,55%)',  bg: 'hsla(25,95%,55%,0.12)' },
  medium:   { text: 'hsl(45,90%,50%)',  bg: 'hsla(45,90%,50%,0.12)' },
  default:  { text: 'hsl(220,15%,55%)', bg: 'hsla(220,15%,50%,0.12)' },
}

const STATUS_COLORS = {
  verified: 'hsl(145,60%,48%)',
  resolved: 'hsl(195,70%,52%)',
  default:  'hsl(35,95%,55%)',
}

const ROLE_COLORS = {
  community: { text: 'hsl(210,65%,55%)', bg: 'hsla(210,65%,55%,0.14)' },
  reporter:  { text: 'hsl(35,100%,55%)', bg: 'hsla(35,100%,55%,0.14)' },
  verifier:  { text: 'hsl(195,70%,52%)', bg: 'hsla(195,70%,52%,0.14)' },
  corrector: { text: 'hsl(145,60%,48%)', bg: 'hsla(145,60%,48%,0.14)' },
  admin:     { text: 'hsl(280,65%,65%)', bg: 'hsla(280,65%,65%,0.14)' },
}

const SYSTEM_STATUS_META = {
  ok:   { text: 'hsl(145,60%,45%)', bg: 'hsla(145,60%,45%,0.12)' },
  warn: { text: 'hsl(35,95%,55%)',  bg: 'hsla(35,95%,55%,0.12)' },
  crit: { text: 'hsl(0,75%,55%)',   bg: 'hsla(0,75%,55%,0.12)' },
}

const SYSTEMS = [
  { icon: '🛰️', label: 'USGS Seismic Feed',         value: 'Live',   status: 'ok'   },
  { icon: '🌦️', label: 'National Weather Service',   value: 'Live',   status: 'ok'   },
  { icon: '🔥', label: 'Fire Weather Index',          value: 'Live',   status: 'ok'   },
  { icon: '📡', label: 'Local Sensor Network',        value: '8 / 12', status: 'warn' },
  { icon: '🗺️', label: 'Map Tile Service',            value: 'Live',   status: 'ok'   },
  { icon: '📬', label: 'Push Notification Service',   value: 'Live',   status: 'ok'   },
  { icon: '⚡', label: 'Alert Processing Engine',      value: 'Active', status: 'ok'   },
]

const MOCK_USERS_SUMMARY = [
  { name: 'Maya Chen',      role: 'community', avatar: 'MC', reports: 1, joined: 'Jun 2025' },
  { name: 'Jordan Lee',     role: 'reporter',  avatar: 'JL', reports: 2, joined: 'Mar 2025' },
  { name: 'Sam Rivera',     role: 'verifier',  avatar: 'SR', reports: 0, joined: 'Nov 2024' },
  { name: 'Alex Morgan',    role: 'corrector', avatar: 'AM', reports: 0, joined: 'Aug 2024' },
  { name: 'Dr. Priya Nair', role: 'admin',     avatar: 'PN', reports: 0, joined: 'Jan 2024' },
]

/* ── Card section header — icon + title, with an optional right-aligned
   meta string ("6/7 LIVE", "5 TOTAL") so structure carries real info
   instead of just decorating the section. ── */
function CardTitle({ icon: Icon, meta, children }) {
  return (
    <div className="admin-card-title-row">
      <h3 className="admin-card-title"><Icon size={16} />{children}</h3>
      {meta && <span className="admin-card-meta">{meta}</span>}
    </div>
  )
}

function activate(fn) {
  return (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fn()
    }
  }
}

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const totalAlerts = MOCK_ALERTS.length
  const pending      = MOCK_ALERTS.filter(a => a.status === 'pending').length
  const verified     = MOCK_ALERTS.filter(a => a.status === 'verified').length
  const critical     = MOCK_ALERTS.filter(a => a.severity === 'critical').length

  const liveSystems  = SYSTEMS.filter(s => s.status === 'ok').length
  const totalSystems = SYSTEMS.length
  const overallStatus = SYSTEMS.some(s => s.status === 'crit')
    ? 'crit'
    : liveSystems < totalSystems ? 'warn' : 'ok'

  const STRIP_METRICS = [
    { Icon: AlertTriangle, label: 'Total Alerts',     value: totalAlerts,               ...{ text: 'hsl(35,95%,55%)',  bg: 'hsla(35,95%,55%,0.14)' } },
    { Icon: CheckCircle,   label: 'Verified',          value: verified,                  ...{ text: 'hsl(145,60%,48%)', bg: 'hsla(145,60%,48%,0.14)' } },
    { Icon: Users,         label: 'Registered Users',  value: MOCK_USERS_SUMMARY.length, ...{ text: 'hsl(195,70%,52%)', bg: 'hsla(195,70%,52%,0.14)' } },
    { Icon: Database,      label: 'Data Sources',      value: 7,                         ...{ text: 'hsl(280,65%,65%)', bg: 'hsla(280,65%,65%,0.14)' } },
  ]

  return (
    <div className="admin-page animate-fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <div className="admin-eyebrow">Platform Control</div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="admin-title-icon"><Shield size={20} /></span>
            Admin Panel
          </h1>
          <div className="admin-header-meta">
            <p className="page-subtitle">Signed in as <strong>{user?.name}</strong></p>
            <span className={`admin-status-pill admin-status-${overallStatus}`}>
              <span className={`admin-dot${overallStatus === 'ok' ? ' admin-dot-pulse' : ''}`} />
              {liveSystems} / {totalSystems} systems live
            </span>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={14} /> Dashboard
        </button>
      </div>

      {/* Hero — actionable metrics first */}
      <div className="admin-hero-grid">
        <button
          type="button"
          className="admin-hero-card"
          style={{ '--hc': SEVERITY_STYLES.critical.text, '--hc-bg': SEVERITY_STYLES.critical.bg }}
          onClick={() => navigate('/dashboard')}
        >
          <div className="admin-hero-top">
            <span className="admin-hero-icon"><ShieldAlert size={18} /></span>
            <span className="admin-hero-num">{critical}</span>
          </div>
          <div>
            <p className="admin-hero-label">Critical Active</p>
            <p className="admin-hero-desc">Needs immediate action</p>
          </div>
          <span className="admin-hero-link">Review critical alerts →</span>
        </button>

        <button
          type="button"
          className="admin-hero-card"
          style={{ '--hc': 'hsl(35,100%,55%)', '--hc-bg': 'hsla(35,100%,55%,0.12)' }}
          onClick={() => navigate('/dashboard/queue')}
        >
          <div className="admin-hero-top">
            <span className="admin-hero-icon"><Clock size={18} /></span>
            <span className="admin-hero-num">{pending}</span>
          </div>
          <div>
            <p className="admin-hero-label">Pending Review</p>
            <p className="admin-hero-desc">Awaiting verification</p>
          </div>
          <span className="admin-hero-link">Go to verification queue →</span>
        </button>
      </div>

      {/* Quiet metric strip — informational, secondary to the hero */}
      <div className="admin-strip">
        {STRIP_METRICS.map(m => (
          <div className="admin-strip-cell" key={m.label}>
            <span className="admin-strip-icon" style={{ background: m.bg, color: m.text }}>
              <m.Icon size={16} />
            </span>
            <div>
              <p className="admin-strip-val" style={{ color: m.text }}>{m.value}</p>
              <p className="admin-strip-label">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* System status + users split */}
      <div className="admin-body">

        {/* System health */}
        <div className="card">
          <CardTitle icon={Activity} meta={`${liveSystems}/${totalSystems} LIVE`}>System Health</CardTitle>
          <div className="admin-activity-list">
            {SYSTEMS.map(s => {
              const sc = SYSTEM_STATUS_META[s.status]
              return (
                <div className="admin-activity-row" key={s.label}>
                  <span className="admin-activity-icon" aria-hidden="true">{s.icon}</span>
                  <span className="admin-activity-label">{s.label}</span>
                  <span className="admin-activity-val" style={{ background: sc.bg, color: sc.text }}>
                    {s.status === 'ok' && <span className="admin-dot admin-dot-pulse" />}
                    {s.value}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Users table */}
        <div className="card">
          <CardTitle icon={Users} meta={`${MOCK_USERS_SUMMARY.length} TOTAL`}>Registered Users</CardTitle>
          <div className="admin-users-list">
            {MOCK_USERS_SUMMARY.map(u => {
              const rc = ROLE_COLORS[u.role]
              return (
                <div key={u.name} className="admin-user-row">
                  <div className="admin-user-avatar" style={{ background: rc.bg, color: rc.text }}>
                    {u.avatar}
                  </div>
                  <div className="admin-user-info">
                    <p className="admin-user-name">{u.name}</p>
                    <p className="admin-user-meta">Joined {u.joined}</p>
                  </div>
                  <span className="admin-user-role" style={{ background: rc.bg, color: rc.text }}>
                    {u.role}
                  </span>
                  <span className="admin-user-reports">{u.reports} report{u.reports === 1 ? '' : 's'}</span>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* Recent alerts table */}
      <div className="card admin-alerts-card">
        <CardTitle icon={AlertTriangle} meta={`SHOWING ${Math.min(6, totalAlerts)} OF ${totalAlerts}`}>
          Recent Alerts
        </CardTitle>
        <div className="admin-alerts-head" aria-hidden="true">
          <span>Severity</span><span>Alert</span><span>Reporter</span><span>Status</span>
        </div>
        <div className="admin-alerts-list">
          {MOCK_ALERTS.slice(0, 6).map(alert => {
            const sev = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.default
            const statusColor = STATUS_COLORS[alert.status] || STATUS_COLORS.default
            const go = () => navigate(`/dashboard/alert/${alert.id}`)
            return (
              <div
                key={alert.id}
                className="admin-alert-row"
                onClick={go}
                onKeyDown={activate(go)}
                role="button"
                tabIndex={0}
              >
                <span className="admin-alert-sev" style={{ background: sev.bg, color: sev.text }}>
                  {alert.severity}
                </span>
                <span className="admin-alert-title">{alert.title}</span>
                <span className="admin-alert-reporter">{alert.reportedBy}</span>
                <span className="admin-alert-status" style={{ color: statusColor }}>
                  {alert.status}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div className="admin-actions">
        <button className="admin-action-card" id="admin-goto-queue" onClick={() => navigate('/dashboard/queue')}>
          <span className="admin-action-icon"><CheckCircle size={18} /></span>
          <span className="admin-action-text">
            <span className="admin-action-title">Verification Queue</span>
            <span className="admin-action-desc">{pending} alert{pending === 1 ? '' : 's'} awaiting review</span>
          </span>
        </button>
        <button className="admin-action-card" id="admin-goto-settings" onClick={() => navigate('/dashboard/settings')}>
          <span className="admin-action-icon"><Settings size={18} /></span>
          <span className="admin-action-text">
            <span className="admin-action-title">Platform Settings</span>
            <span className="admin-action-desc">Feeds, roles &amp; permissions</span>
          </span>
        </button>
      </div>
    </div>
  )
}