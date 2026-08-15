import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './NotificationCenter.css'

/* ─── Static notification data matching reference image ─── */
const NEEDS_ATTENTION = [
  {
    id: 'a-001',
    title: 'Flash Flood Warning',
    area: 'Downtown Metro District',
    chips: [
      { label: 'NOAA',     type: 'source'   },
      { label: 'Rainfall', type: 'source'   },
      { label: 'Critical', type: 'critical' },
    ],
    issued: '6:21 AM',
    confidence: 87,
    confidenceLevel: 'High',
    action: 'Avoid low-lying areas; move to higher ground.',
    severity: 'critical',
    dotColor: '#d93025',
    borderColor: '#d93025',
    badgeBg: '#fce8e6',
    badgeText: '#c0392b',
  },
  {
    id: 'a-002',
    title: 'Wildfire Smoke Advisory',
    area: 'Riverside County',
    chips: [
      { label: 'AirNow',      type: 'source'  },
      { label: 'Air Quality', type: 'source'  },
      { label: 'Warning',     type: 'warning' },
    ],
    issued: '5:47 AM',
    confidence: 74,
    confidenceLevel: 'High',
    action: 'Close windows; limit outdoor activity.',
    severity: 'high',
    dotColor: '#f97316',
    borderColor: '#f97316',
    badgeBg: '#fff3e0',
    badgeText: '#c05a00',
  },
  {
    id: 'a-004',
    title: 'High Wind Watch',
    area: 'Coastal Hills Region',
    chips: [
      { label: 'NWS',   type: 'source'  },
      { label: 'Wind',  type: 'source'  },
      { label: 'Watch', type: 'warning' },
    ],
    issued: '4:58 AM',
    confidence: 62,
    confidenceLevel: 'Medium',
    action: 'Secure outdoor objects; stay informed.',
    severity: 'medium',
    dotColor: '#f59e0b',
    borderColor: '#f59e0b',
    badgeBg: '#fffbeb',
    badgeText: '#92600a',
  },
]

const EARLIER_TODAY = [
  {
    id: 'n-early-1',
    icon: 'cloud',
    title: 'Heavy Rain Advisory',
    sub: 'North Valley',
    time: '2:31 AM',
    dot: '#3b82f6',
    showDot: true,
  },
  {
    id: 'n-early-2',
    icon: 'info',
    title: 'Infrastructure Update',
    sub: 'Power Outage Resolved – Oakwood',
    time: '1:12 AM',
    dot: null,
    showDot: false,
  },
  {
    id: 'n-early-3',
    icon: 'shield',
    title: 'All Clear',
    sub: 'Coastal Storm Threat Passed',
    time: '12:08 AM',
    dot: null,
    showDot: false,
  },
]

const THIS_WEEK = [
  {
    id: 'n-week-1',
    icon: 'warn',
    title: 'Heat Advisory',
    sub: 'Issued Tuesday',
    time: 'Yesterday',
    dot: '#f59e0b',
    showDot: true,
  },
  {
    id: 'n-week-2',
    icon: 'cloud',
    title: 'Winter Storm Outlook',
    sub: 'Issued Monday',
    time: 'Wed, May 14',
    dot: null,
    showDot: false,
  },
  {
    id: 'n-week-3',
    icon: 'info',
    title: 'Community Update',
    sub: 'Emergency Drill Completed',
    time: 'Mon, May 12',
    dot: null,
    showDot: false,
  },
]

/* ─── SVG icons ─── */
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#4a5568" strokeWidth="2" strokeLinecap="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}
function CloudIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#5a7fa8" strokeWidth="2" strokeLinecap="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
    </svg>
  )
}
function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="8"/>
      <line x1="12" y1="12" x2="12" y2="16"/>
    </svg>
  )
}
function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2e6b3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6L12 2z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  )
}
function WarnIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#c8a020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}
function LocationPinIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="7" r="2.5"/>
      <path d="M8 2C5.2 2 3 4.2 3 7c0 3.5 5 9 5 9s5-5.5 5-9c0-2.8-2.2-5-5-5z"/>
    </svg>
  )
}
function CircleArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="6"/>
      <path d="M5 8h6M9 6l2 2-2 2"/>
    </svg>
  )
}
function ChevronUpIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  )
}

/* Icon router */
function RowIcon({ type }) {
  if (type === 'cloud')  return <CloudIcon />
  if (type === 'info')   return <InfoIcon />
  if (type === 'shield') return <ShieldCheckIcon />
  if (type === 'warn')   return <WarnIcon />
  return <InfoIcon />
}

/* Chip */
function Chip({ label, type }) {
  return (
    <span className={`nc-chip nc-chip--${type}`}>
      {type === 'source' && <LocationPinIcon />}
      {type === 'critical' && <span className="nc-chip-dot nc-chip-dot--red" />}
      {type === 'warning'  && <span className="nc-chip-dot nc-chip-dot--orange" />}
      {label}
    </span>
  )
}

/* Tab bar icons */
function BellTabIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill={active ? '#1a2640' : 'none'}
      stroke={active ? '#1a2640' : '#94a3b8'} strokeWidth="2" strokeLinecap="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}
function IncidentsTabIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="10" r="3"/>
      <path d="M12 2C8.1 2 5 5.1 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.9-3.1-7-7-7z"/>
    </svg>
  )
}
function MapTabIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
      <line x1="8" y1="2" x2="8" y2="18"/>
      <line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  )
}
function SettingsTabIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

/* ─── Main component ─── */
export default function NotificationCenter() {
  const navigate = useNavigate()
  const [digestMode, setDigestMode] = useState(true)
  const [quietExpanded, setQuietExpanded] = useState(true)
  const [activeTab, setActiveTab] = useState('notifications')

  // Hide sidebar, full-width layout
  useEffect(() => {
    document.documentElement.classList.add('hl-light')
    return () => document.documentElement.classList.remove('hl-light')
  }, [])

  return (
    <div className="nc-page">

      {/* ── Header ── */}
      <div className="nc-header">
        <h1 className="nc-title">Notifications</h1>
        <div className="nc-digest-wrap">
          <span className="nc-digest-label">Digest Mode</span>
          <button
            id="digest-toggle"
            className={`nc-toggle ${digestMode ? 'nc-toggle--on' : ''}`}
            onClick={() => setDigestMode(v => !v)}
            role="switch"
            aria-checked={digestMode}
          >
            <span className="nc-toggle-thumb" />
          </button>
        </div>
      </div>

      {/* ── Quiet Hours Banner ── */}
      <div className="nc-quiet-banner" onClick={() => setQuietExpanded(v => !v)}>
        <div className="nc-quiet-icon"><MoonIcon /></div>
        <div className="nc-quiet-text">
          <p className="nc-quiet-title">Quiet hours active until 7:00 AM</p>
          <p className="nc-quiet-sub">Non-critical alerts are muted</p>
        </div>
        <div className={`nc-quiet-chevron ${quietExpanded ? 'nc-quiet-chevron--up' : ''}`}>
          <ChevronUpIcon />
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="nc-scroll">

        {/* ── NEEDS ATTENTION section ── */}
        <p className="nc-section-label">NEEDS ATTENTION</p>

        <div className="nc-attention-list">
          {NEEDS_ATTENTION.map(item => (
            <div
              key={item.id}
              className="nc-att-card"
              style={{ '--border-color': item.borderColor }}
              onClick={() => navigate(`/dashboard/alert/${item.id}`)}
            >
              {/* Title row */}
              <div className="nc-att-title-row">
                <span className="nc-att-dot" style={{ background: item.dotColor }} />
                <span className="nc-att-title">{item.title}</span>
                <span className="nc-conf-badge" style={{ background: item.badgeBg, color: item.badgeText }}>
                  {item.confidenceLevel} Confidence · {item.confidence}%
                </span>
              </div>

              {/* Affected area */}
              <p className="nc-att-area">
                <span className="nc-att-area-label">Affected Area</span>
                <span className="nc-att-area-value">{item.area}</span>
              </p>

              {/* Chips */}
              <div className="nc-att-chips">
                {item.chips.map(c => (
                  <Chip key={c.label} label={c.label} type={c.type} />
                ))}
              </div>

              {/* Footer row */}
              <div className="nc-att-footer">
                <span className="nc-att-issued">Issued {item.issued}</span>
                <div className="nc-att-action">
                  <span className="nc-att-action-label">Recommended Action</span>
                  <span className="nc-att-action-text">{item.action}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── EARLIER TODAY section ── */}
        <p className="nc-section-label">EARLIER TODAY</p>

        <div className="nc-simple-list">
          {EARLIER_TODAY.map((item, i) => (
            <div
              key={item.id}
              className="nc-simple-row"
              style={{ borderTop: i === 0 ? 'none' : '1px solid #e8e6e2' }}
            >
              <div className="nc-simple-icon"><RowIcon type={item.icon} /></div>
              <div className="nc-simple-text">
                <p className="nc-simple-title">{item.title}</p>
                <p className="nc-simple-sub">{item.sub}</p>
              </div>
              <div className="nc-simple-right">
                {item.showDot && <span className="nc-simple-dot" style={{ background: item.dot }} />}
                <span className="nc-simple-time">{item.time}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── THIS WEEK section ── */}
        <p className="nc-section-label">THIS WEEK</p>

        <div className="nc-simple-list">
          {THIS_WEEK.map((item, i) => (
            <div
              key={item.id}
              className="nc-simple-row"
              style={{ borderTop: i === 0 ? 'none' : '1px solid #e8e6e2' }}
            >
              <div className="nc-simple-icon"><RowIcon type={item.icon} /></div>
              <div className="nc-simple-text">
                <p className="nc-simple-title">{item.title}</p>
                <p className="nc-simple-sub">{item.sub}</p>
              </div>
              <div className="nc-simple-right">
                {item.showDot && <span className="nc-simple-dot" style={{ background: item.dot }} />}
                <span className="nc-simple-time">{item.time}</span>
              </div>
            </div>
          ))}
        </div>

      </div>{/* end nc-scroll */}

      {/* ── Bottom tab bar ── */}
      <div className="nc-tabbar">
        <button
          id="tab-notifications"
          className={`nc-tab ${activeTab === 'notifications' ? 'nc-tab--active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <BellTabIcon active={activeTab === 'notifications'} />
          <span className="nc-tab-label">Notifications</span>
        </button>
        <button
          id="tab-incidents"
          className={`nc-tab ${activeTab === 'incidents' ? 'nc-tab--active' : ''}`}
          onClick={() => { setActiveTab('incidents'); navigate('/dashboard') }}
        >
          <IncidentsTabIcon />
          <span className="nc-tab-label">Incidents</span>
        </button>
        <button
          id="tab-map"
          className={`nc-tab ${activeTab === 'map' ? 'nc-tab--active' : ''}`}
          onClick={() => { setActiveTab('map'); navigate('/dashboard') }}
        >
          <MapTabIcon />
          <span className="nc-tab-label">Map</span>
        </button>
        <button
          id="tab-settings"
          className={`nc-tab ${activeTab === 'settings' ? 'nc-tab--active' : ''}`}
          onClick={() => { setActiveTab('settings'); navigate('/dashboard/settings') }}
        >
          <SettingsTabIcon />
          <span className="nc-tab-label">Settings</span>
        </button>
      </div>

    </div>
  )
}
