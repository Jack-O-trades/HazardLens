import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Shield, Users, AlertTriangle, CheckCircle, Activity, Database, Settings, ArrowLeft, TrendingUp } from 'lucide-react'
import { MOCK_ALERTS } from '../data/mockData'
import './AdminPage.css'

/* ── Stat card ── */
function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-icon" style={{ background: `${color}22`, color }}>
        <Icon size={20} />
      </div>
      <div className="admin-stat-body">
        <p className="admin-stat-val" style={{ color }}>{value}</p>
        <p className="admin-stat-label">{label}</p>
        {sub && <p className="admin-stat-sub">{sub}</p>}
      </div>
    </div>
  )
}

/* ── Activity row ── */
function ActivityRow({ icon, label, value, status }) {
  const statusColors = {
    ok:      { bg: 'hsla(145,60%,45%,0.12)', text: 'hsl(145,60%,45%)' },
    warn:    { bg: 'hsla(35,95%,55%,0.12)',  text: 'hsl(35,95%,55%)'  },
    crit:    { bg: 'hsla(0,75%,55%,0.12)',   text: 'hsl(0,75%,55%)'   },
  }
  const sc = statusColors[status] || statusColors.ok
  return (
    <div className="admin-activity-row">
      <span className="admin-activity-icon">{icon}</span>
      <span className="admin-activity-label">{label}</span>
      <span className="admin-activity-val" style={{ background: sc.bg, color: sc.text }}>{value}</span>
    </div>
  )
}

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const totalAlerts   = MOCK_ALERTS.length
  const pending       = MOCK_ALERTS.filter(a => a.status === 'pending').length
  const verified      = MOCK_ALERTS.filter(a => a.status === 'verified').length
  const critical      = MOCK_ALERTS.filter(a => a.severity === 'critical').length

  const MOCK_USERS_SUMMARY = [
    { name: 'Maya Chen',    role: 'community', avatar: 'MC', reports: 1,  joined: 'Jun 2025' },
    { name: 'Jordan Lee',   role: 'reporter',  avatar: 'JL', reports: 2,  joined: 'Mar 2025' },
    { name: 'Sam Rivera',   role: 'verifier',  avatar: 'SR', reports: 0,  joined: 'Nov 2024' },
    { name: 'Alex Morgan',  role: 'corrector', avatar: 'AM', reports: 0,  joined: 'Aug 2024' },
    { name: 'Dr. Priya Nair', role: 'admin',  avatar: 'PN', reports: 0,  joined: 'Jan 2024' },
  ]

  const ROLE_COLORS = {
    community: 'hsl(210,65%,55%)',
    reporter:  'hsl(35,100%,55%)',
    verifier:  'hsl(195,70%,52%)',
    corrector: 'hsl(145,60%,48%)',
    admin:     'hsl(280,65%,65%)',
  }

  return (
    <div className="admin-page animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={22} style={{ color: 'hsl(280,65%,65%)' }} />
            Admin Panel
          </h1>
          <p className="page-subtitle">Platform overview — signed in as {user?.name}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={14} /> Dashboard
        </button>
      </div>

      {/* Stats grid */}
      <div className="admin-stats-grid">
        <StatCard icon={AlertTriangle} label="Total Alerts"        value={totalAlerts} color="hsl(35,95%,55%)"   sub="All time" />
        <StatCard icon={Activity}      label="Pending Review"      value={pending}     color="hsl(35,100%,55%)"  sub="Awaiting verification" />
        <StatCard icon={CheckCircle}   label="Verified"            value={verified}    color="hsl(145,60%,48%)"  sub="Ready for correction" />
        <StatCard icon={TrendingUp}    label="Critical Active"     value={critical}    color="hsl(0,75%,55%)"    sub="Needs immediate action" />
        <StatCard icon={Users}         label="Registered Users"    value={MOCK_USERS_SUMMARY.length} color="hsl(195,70%,52%)" sub="All roles" />
        <StatCard icon={Database}      label="Data Sources"        value={7}           color="hsl(280,65%,65%)"  sub="Connected feeds" />
      </div>

      {/* System status + users split */}
      <div className="admin-body">

        {/* System health */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={16} /> System Health
          </h3>
          <div className="admin-activity-list">
            <ActivityRow icon="🛰️" label="USGS Seismic Feed"       value="Live"     status="ok"   />
            <ActivityRow icon="🌦️" label="National Weather Service" value="Live"     status="ok"   />
            <ActivityRow icon="🔥" label="Fire Weather Index"       value="Live"     status="ok"   />
            <ActivityRow icon="📡" label="Local Sensor Network"     value="8 / 12"  status="warn" />
            <ActivityRow icon="🗺️" label="Map Tile Service"         value="Live"     status="ok"   />
            <ActivityRow icon="📬" label="Push Notification Service" value="Live"    status="ok"   />
            <ActivityRow icon="⚡" label="Alert Processing Engine"  value="Active"   status="ok"   />
          </div>
        </div>

        {/* Users table */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} /> Registered Users
          </h3>
          <div className="admin-users-list">
            {MOCK_USERS_SUMMARY.map(u => (
              <div key={u.name} className="admin-user-row">
                <div className="admin-user-avatar" style={{ background: `${ROLE_COLORS[u.role]}22`, color: ROLE_COLORS[u.role] }}>
                  {u.avatar}
                </div>
                <div className="admin-user-info">
                  <p className="admin-user-name">{u.name}</p>
                  <p className="admin-user-meta">Joined {u.joined}</p>
                </div>
                <span className="admin-user-role" style={{ background: `${ROLE_COLORS[u.role]}18`, color: ROLE_COLORS[u.role] }}>
                  {u.role}
                </span>
                <span className="admin-user-reports">{u.reports} reports</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Recent alerts table */}
      <div className="card" style={{ marginTop: '1.25rem' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} /> Recent Alerts
        </h3>
        <div className="admin-alerts-list">
          {MOCK_ALERTS.slice(0, 6).map(alert => (
            <div key={alert.id} className="admin-alert-row" onClick={() => navigate(`/dashboard/alert/${alert.id}`)} role="button" tabIndex={0}>
              <span className="admin-alert-sev" style={{
                background: alert.severity === 'critical' ? 'hsla(0,75%,55%,0.12)'
                  : alert.severity === 'high' ? 'hsla(25,95%,55%,0.12)'
                  : alert.severity === 'medium' ? 'hsla(45,90%,50%,0.12)'
                  : 'hsla(220,15%,50%,0.12)',
                color: alert.severity === 'critical' ? 'hsl(0,75%,55%)'
                  : alert.severity === 'high' ? 'hsl(25,95%,55%)'
                  : alert.severity === 'medium' ? 'hsl(45,90%,50%)'
                  : 'hsl(220,15%,55%)',
              }}>
                {alert.severity}
              </span>
              <span className="admin-alert-title">{alert.title}</span>
              <span className="admin-alert-reporter">{alert.reportedBy}</span>
              <span className="admin-alert-status" style={{
                color: alert.status === 'verified' ? 'hsl(145,60%,48%)'
                  : alert.status === 'resolved' ? 'hsl(195,70%,52%)'
                  : 'hsl(35,95%,55%)',
              }}>
                {alert.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="admin-actions">
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard/queue')} id="admin-goto-queue">
          <CheckCircle size={15} /> Go to Verification Queue
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard/settings')} id="admin-goto-settings">
          <Settings size={15} /> Platform Settings
        </button>
      </div>
    </div>
  )
}
