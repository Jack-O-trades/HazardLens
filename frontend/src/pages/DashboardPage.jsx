import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Shield, FileText, Sun,
  Plus, Minus, Maximize2, ChevronRight, ArrowRight, Home, Bell,
  Route as RouteIcon, Building2
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAlerts } from '../context/AlertsContext'
import { MOCK_SHELTERS, MOCK_ROUTES } from '../data/mockData'
import './DashboardPage.css'

/* ─── Severity dot colour map — exact image colours ─── */
const SEV_DOT = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#64748b',
}

/* ─── Map marker icon components ─── */
function WeatherIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
      <path d="M8 19v2M12 19v2M16 19v2"/>
    </svg>
  )
}
function FloodIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
      <path d="M3 12 Q6 9 9 12 Q12 15 15 12 Q18 9 21 12"/>
      <path d="M3 17 Q6 14 9 17 Q12 20 15 17 Q18 14 21 17"/>
      <path d="M5 7h14M8 4l8 0"/>
    </svg>
  )
}
function SeismicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,12 5,12 7,6 9,18 11,9 13,15 15,12 17,12 19,12 22,12"/>
    </svg>
  )
}
function FireIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="white">
      <path d="M12 2C12 2 8 6 8 10a4 4 0 008 0c0-1.5-.7-3-2-4 0 0 0 2-2 2s-1-2-1-2c-.5 1-1 2-1 3.5A5 5 0 0012 20a5 5 0 002-9.5C13 9 12 6 12 2z"/>
    </svg>
  )
}
function ReportsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="white">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  )
}

/* ─── Map marker definitions — matching image positions & colours ─── */
/* Flood uses its own teal so it reads distinctly from Weather on the legend/map */
const MAP_MARKERS = [
  { id: 'm1', x: 37, y: 26, bg: '#3b82f6', count: 3, label: 'Weather',  icon: WeatherIcon  },
  { id: 'm2', x: 60, y: 37, bg: '#0891b2', count: 4, label: 'Flood',    icon: FloodIcon    },
  { id: 'm3', x: 20, y: 48, bg: '#8b5cf6', count: 2, label: 'Seismic',  icon: SeismicIcon  },
  { id: 'm4', x: 42, y: 65, bg: '#f97316', count: 2, label: 'Fire',     icon: FireIcon     },
  { id: 'm5', x: 63, y: 62, bg: '#ef4444', count: 2, label: 'Fire',     icon: FireIcon     },
  { id: 'm6', x: 36, y: 82, bg: '#6b7280', count: 7, label: 'Reports',  icon: ReportsIcon  },
  { id: 'm7', x: 63, y: 82, bg: '#6b7280', count: 7, label: 'Reports',  icon: ReportsIcon  },
]

/* Legend — one entry per distinct hazard category shown on the map */
const MAP_LEGEND = [
  { bg: '#3b82f6', label: 'Weather' },
  { bg: '#0891b2', label: 'Flood' },
  { bg: '#8b5cf6', label: 'Seismic' },
  { bg: '#f97316', label: 'Fire' },
  { bg: '#6b7280', label: 'Community reports' },
]

/* ─── Mock Map SVG — light, neutral cartographic palette ─── */
function MockMap({ activeMarker, onMarkerClick, showShelters, showRoutes }) {
  return (
    <svg
      viewBox="0 0 800 620"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-label="Hazard incident map of Riverdale"
    >
      <defs>
        {/* Neutral slate terrain gradient */}
        <linearGradient id="terrainGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eef1f5"/>
          <stop offset="100%" stopColor="#e4e8ee"/>
        </linearGradient>
        {/* River — muted, legible blue */}
        <linearGradient id="riverGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#93bcd9"/>
          <stop offset="100%" stopColor="#6e9ec1"/>
        </linearGradient>
        <filter id="mapShadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.18"/>
        </filter>
        <filter id="markerGlow">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.25"/>
        </filter>
      </defs>

      {/* Base terrain */}
      <rect width="800" height="620" fill="url(#terrainGrad)"/>

      {/* City block texture — very subtle */}
      {[
        {x:0,   y:0,   w:200, h:148}, {x:200, y:0,   w:235, h:148},
        {x:0,   y:158, w:200, h:148}, {x:200, y:158, w:235, h:148},
        {x:0,   y:316, w:200, h:148}, {x:200, y:316, w:235, h:148},
        {x:445, y:0,   w:195, h:148}, {x:645, y:0,   w:155, h:148},
        {x:445, y:158, w:195, h:100}, {x:645, y:158, w:155, h:148},
        {x:445, y:316, w:195, h:148}, {x:645, y:316, w:155, h:148},
        {x:0,   y:474, w:200, h:146}, {x:200, y:474, w:235, h:146},
        {x:445, y:474, w:195, h:146}, {x:645, y:474, w:155, h:146},
      ].map((b, i) => (
        <rect key={i} x={b.x + 2} y={b.y + 2} width={b.w - 4} height={b.h - 4}
          fill="#dfe3ea" opacity="0.5" rx="2"/>
      ))}

      {/* Major roads */}
      <line x1="0" y1="152" x2="800" y2="150" stroke="#c7cdd6" strokeWidth="14"/>
      <line x1="0" y1="152" x2="800" y2="150" stroke="#ffffff" strokeWidth="9"/>
      <line x1="0" y1="308" x2="800" y2="306" stroke="#c7cdd6" strokeWidth="14"/>
      <line x1="0" y1="308" x2="800" y2="306" stroke="#ffffff" strokeWidth="9"/>
      <line x1="0" y1="464" x2="800" y2="462" stroke="#c7cdd6" strokeWidth="14"/>
      <line x1="0" y1="464" x2="800" y2="462" stroke="#ffffff" strokeWidth="9"/>
      <line x1="200" y1="0" x2="200" y2="620" stroke="#c7cdd6" strokeWidth="14"/>
      <line x1="200" y1="0" x2="200" y2="620" stroke="#ffffff" strokeWidth="9"/>
      <line x1="440" y1="0" x2="440" y2="620" stroke="#c7cdd6" strokeWidth="14"/>
      <line x1="440" y1="0" x2="440" y2="620" stroke="#ffffff" strokeWidth="9"/>
      <line x1="645" y1="0" x2="645" y2="620" stroke="#c7cdd6" strokeWidth="14"/>
      <line x1="645" y1="0" x2="645" y2="620" stroke="#ffffff" strokeWidth="9"/>

      {/* Minor roads */}
      {[76, 114, 228, 268, 382, 420, 536, 574].map(y => (
        <line key={`hr-${y}`} x1="0" y1={y} x2="800" y2={y} stroke="#dde1e7" strokeWidth="4" opacity="0.75"/>
      ))}
      {[100, 155, 320, 374, 520, 572, 720].map(x => (
        <line key={`vr-${x}`} x1={x} y1="0" x2={x} y2="620" stroke="#dde1e7" strokeWidth="4" opacity="0.75"/>
      ))}

      {/* Park */}
      <ellipse cx="475" cy="252" rx="98" ry="74" fill="#d3e3cf"/>
      <ellipse cx="475" cy="252" rx="84" ry="60" fill="#bcd5b6"/>
      <text x="475" y="256" textAnchor="middle" fill="#3f6b3a" fontSize="11"
        fontWeight="600" fontFamily="Inter, sans-serif" opacity="0.9">
        Riverview Park
      </text>
      {/* Small parks */}
      <ellipse cx="115" cy="520" rx="55" ry="38" fill="#d3e3cf" opacity="0.7"/>
      <ellipse cx="710" cy="135" rx="45" ry="32" fill="#d3e3cf" opacity="0.7"/>

      {/* Riverdale River — diagonal */}
      <path
        d="M 645 0 C 618 52 594 92 570 135 C 546 178 524 208 502 252 C 480 296 468 328 450 365 C 432 402 407 430 377 456 C 347 482 312 502 274 520 C 236 538 204 552 172 568 C 140 584 110 598 76 618"
        fill="none"
        stroke="url(#riverGrad)"
        strokeWidth="34"
      />
      {/* River shimmer highlight */}
      <path
        d="M 645 0 C 618 52 594 92 570 135 C 546 178 524 208 502 252 C 480 296 468 328 450 365 C 432 402 407 430 377 456 C 347 482 312 502 274 520 C 236 538 204 552 172 568 C 140 584 110 598 76 618"
        fill="none"
        stroke="#cce4f5"
        strokeWidth="13"
        opacity="0.4"
      />
      {/* River label */}
      <text transform="rotate(-37, 495, 272)" x="495" y="272"
        textAnchor="middle" fill="#3b6f8f" fontSize="10.5"
        fontStyle="italic" fontFamily="Inter, sans-serif" opacity="0.9">
        Riverdale River
      </text>

      {/* District labels */}
      {[
        { x: 100,  y: 72,  label: 'Pinecrest'         },
        { x: 318,  y: 72,  label: 'Millbrook'         },
        { x: 540,  y: 72,  label: 'Northwood'         },
        { x: 100,  y: 232, label: 'Westgate'          },
        { x: 100,  y: 248, label: 'Heights'           },
        { x: 318,  y: 248, label: 'Riverdale'         },
        { x: 100,  y: 395, label: 'Oakridge'          },
        { x: 318,  y: 390, label: 'Southbank'         },
        { x: 540,  y: 390, label: 'Eastvale'          },
        { x: 100,  y: 540, label: 'Lakeside'          },
        { x: 318,  y: 540, label: 'Fairview'          },
        { x: 540,  y: 538, label: 'Brookhaven'        },
      ].map(d => (
        <text key={d.x + '-' + d.y} x={d.x} y={d.y} textAnchor="middle"
          fill="#475569" fontSize="12" fontWeight="700"
          fontFamily="Inter, sans-serif" opacity="0.78">
          {d.label}
        </text>
      ))}

      {/* Evacuation Routes Layer */}
      {showRoutes && MOCK_ROUTES.map(r => {
        const dStr = r.points.map((p, idx) => {
          const px = (p[0] / 100) * 800
          const py = (p[1] / 100) * 620
          return `${idx === 0 ? 'M' : 'L'} ${px} ${py}`
        }).join(' ')
        return (
          <g key={r.id}>
            {/* Glowing background */}
            <path d={dStr} fill="none" stroke="var(--text-success)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.15" />
            {/* Dashed directional flow line */}
            <path
              d={dStr}
              fill="none"
              stroke="var(--text-success)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="14, 12"
              className="evac-route-flow"
            />
          </g>
        )
      })}

      {/* Safe Shelters Layer */}
      {showShelters && MOCK_SHELTERS.map(s => {
        const px = (s.x / 100) * 800
        const py = (s.y / 100) * 620
        const isFull = s.status === 'full'
        const color = isFull ? 'var(--sev-critical)' : 'var(--text-success)'
        const occupancy = Math.round((s.capacity / s.maxCapacity) * 100)
        return (
          <g key={s.id} transform={`translate(${px}, ${py})`} style={{ cursor: 'pointer' }}>
            {/* Pulsing ring for active shelters */}
            <circle cx="0" cy="0" r="17" fill={color} opacity="0.1">
              {!isFull && <animate attributeName="r" from="14" to="22" dur="2.2s" repeatCount="indefinite" />}
              {!isFull && <animate attributeName="opacity" from="0.28" to="0" dur="2.2s" repeatCount="indefinite" />}
            </circle>
            {/* Shelter badge shield */}
            <circle cx="0" cy="0" r="11" fill="white" stroke={color} strokeWidth="2.5" />
            {/* Hospital/Shelter Medical Cross */}
            <path d="M-4 -1.5 H-1.5 V-4 H1.5 V-1.5 H4 V1.5 H1.5 V4 H-1.5 V1.5 H-4 Z" fill={color} />

            {/* Shelter details popup on hover/label */}
            <g className="shelter-hover-label" transform="translate(0, -32)">
              <rect x="-65" y="0" width="130" height="26" rx="4" fill="#0f172a" opacity="0.92" filter="url(#markerGlow)" />
              <text x="0" y="11" textAnchor="middle" fill="white" fontSize="8.5" fontWeight="600" fontFamily="Inter, sans-serif">
                {s.name}
              </text>
              <text x="0" y="20" textAnchor="middle" fill={isFull ? '#f87171' : '#4ade80'} fontSize="7.5" fontWeight="700" fontFamily="Inter, sans-serif">
                {isFull ? 'FULL' : `${occupancy}% Capacity (${s.capacity}/${s.maxCapacity})`}
              </text>
            </g>
          </g>
        )
      })}

      {/* Map markers */}
      {MAP_MARKERS.map(m => {
        const px = (m.x / 100) * 800
        const py = (m.y / 100) * 620
        const isActive = activeMarker === m.id
        const Icon = m.icon
        return (
          <g key={m.id} style={{ cursor: 'pointer' }} onClick={() => onMarkerClick(m.id)} filter="url(#markerGlow)">
            {isActive && (
              <circle cx={px} cy={py} r="30" fill={m.bg} opacity="0.16">
                <animate attributeName="r" from="26" to="40" dur="1.3s" repeatCount="indefinite"/>
                <animate attributeName="opacity" from="0.26" to="0" dur="1.3s" repeatCount="indefinite"/>
              </circle>
            )}
            {/* Marker circle */}
            <circle cx={px} cy={py} r="22" fill={m.bg} stroke="white" strokeWidth={isActive ? '3' : '2.5'}/>
            <foreignObject x={px - 8} y={py - 8} width="16" height="16" style={{ overflow: 'visible' }}>
              <div xmlns="http://www.w3.org/1999/xhtml"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px' }}>
                <Icon />
              </div>
            </foreignObject>
            {/* Count badge */}
            <circle cx={px + 16} cy={py - 16} r="9.5" fill="#ffffff" stroke={m.bg} strokeWidth="1.5"/>
            <text x={px + 16} y={py - 12} textAnchor="middle" fill={m.bg}
              fontSize="9.5" fontWeight="800" fontFamily="Inter, sans-serif">
              {m.count}
            </text>
          </g>
        )
      })}

      {/* Scale bar */}
      <g transform="translate(440, 594)">
        <rect x="0" y="0" width="138" height="20" rx="4" fill="white" opacity="0.92" stroke="#dde1e7" strokeWidth="1"/>
        <line x1="10" y1="12" x2="126" y2="12" stroke="#475569" strokeWidth="1.5"/>
        <line x1="10" y1="8" x2="10" y2="16" stroke="#475569" strokeWidth="1.5"/>
        <line x1="68" y1="10" x2="68" y2="14" stroke="#475569" strokeWidth="1"/>
        <line x1="126" y1="8" x2="126" y2="16" stroke="#475569" strokeWidth="1.5"/>
        <text x="10" y="9" fill="#475569" fontSize="8" fontFamily="Inter,sans-serif">0</text>
        <text x="60" y="9" fill="#475569" fontSize="8" fontFamily="Inter,sans-serif">1 km</text>
        <text x="114" y="9" fill="#475569" fontSize="8" fontFamily="Inter,sans-serif">2 km</text>
      </g>
    </svg>
  )
}

/* ─── Helpers ─── */

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function computeRisk(alerts) {
  const active = alerts.filter(a => a.status !== 'resolved')
  if (active.some(a => a.severity === 'critical' || a.severity === 'high')) {
    return { label: 'High', tone: 'critical' }
  }
  if (active.some(a => a.severity === 'medium')) {
    return { label: 'Moderate', tone: 'medium' }
  }
  return { label: 'Low', tone: 'safe' }
}

/* ─── Stat card ─── */
function StatCard({ icon: Icon, value, label, tone, delay = 0 }) {
  return (
    <div className={`dash-stat-card dash-stat-card--${tone}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="dash-stat-icon"><Icon size={19} /></div>
      <div>
        <p className="dash-stat-value">{value}</p>
        <p className="dash-stat-label">{label}</p>
      </div>
    </div>
  )
}

/* ─── Compact "Latest Alerts" row ─── */
function LatestAlertRow({ alert, onClick }) {
  const dot = SEV_DOT[alert.severity] || '#9ca3af'
  const quiet = alert.severity === 'low' || alert.confidence < 55

  let displayTitle = alert.title
  if (alert.title === 'Hazard reported' || !alert.title || alert.title === 'Hazard Report') {
    const type = alert.type || ''
    if (type === 'river' || type === 'flood') displayTitle = "🌊 Flood Detected"
    else if (type === 'fire') displayTitle = "🔥 Fire Detected"
    else if (type === 'seismic' || type === 'landslide') displayTitle = "🪨 Landslide Detected"
    else if (type === 'infrastructure' || type === 'pothole') displayTitle = "🚧 Pothole Detected"
    else displayTitle = `${type.charAt(0).toUpperCase() + type.slice(1)} Detected`
  }

  return (
    <button className={`dash-alert-row dash-alert-row--${alert.severity} ${quiet ? 'dash-alert-row--quiet' : ''}`} onClick={() => onClick(alert.id)}>
      <span className="dash-alert-row-dot" style={{ background: dot, color: dot }} />
      <div className="dash-alert-row-body">
        <span className="dash-alert-row-title">{displayTitle}</span>
        <span className="dash-alert-row-meta">
          <span className="dash-alert-row-sev" style={{ color: dot }}>
            {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)} Severity
          </span>
          <span className="dash-alert-row-sep">•</span>
          <span>{alert.confidence}% Confidence</span>
          {alert.duplicateCount > 1 && (
            <><span className="dash-alert-row-sep">•</span><span>{alert.duplicateCount} grouped</span></>
          )}
        </span>
        <span className="dash-alert-row-location">{alert.location}</span>
      </div>
      <ChevronRight size={14} className="dash-alert-row-chevron" />
    </button>
  )
}

/* ─── Main Dashboard ─── */
export default function DashboardPage() {
  const { user, preferences } = useAuth()
  const { alerts } = useAlerts()
  const navigate = useNavigate()

  const [activeMarker, setActiveMarker] = useState(null)
  const [mapExpanded, setMapExpanded]   = useState(false)

  // Layer toggles
  const [showShelters, setShowShelters] = useState(true)
  const [showRoutes, setShowRoutes]     = useState(true)

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Only show approved alerts on the public dashboard feed!
      return alert.status === 'approved'
    })
  }, [alerts])

  const dedupedAlerts = useMemo(() => {
    const grouped = new Map()
    for (const alert of filteredAlerts) {
      const areaKey = (alert.affectedAreas?.[0] || alert.location?.split(',')[0] || 'general').trim().toLowerCase()
      const key = `${alert.type}|${areaKey}`
      const existing = grouped.get(key)
      if (!existing) {
        grouped.set(key, { ...alert, duplicateCount: 1 })
      } else {
        const currentRank = { low: 0, medium: 1, high: 2, critical: 3 }[alert.severity] ?? 0
        const existingRank = { low: 0, medium: 1, high: 2, critical: 3 }[existing.severity] ?? 0
        if (currentRank > existingRank || (currentRank === existingRank && (alert.confidence ?? 0) > (existing.confidence ?? 0))) {
          grouped.set(key, { ...alert, duplicateCount: (existing.duplicateCount || 1) + 1 })
        } else {
          grouped.set(key, { ...existing, duplicateCount: (existing.duplicateCount || 1) + 1 })
        }
      }
    }

    return [...grouped.values()].sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.reportedAt || 0).getTime()
      const timeB = new Date(b.updatedAt || b.reportedAt || 0).getTime()
      return timeB - timeA // newest first
    })
  }, [filteredAlerts])

  const priorityAlerts = dedupedAlerts.filter(a => ['critical', 'high'].includes(a.severity))
  const lowPriorityAlerts = dedupedAlerts.filter(a => !['critical', 'high'].includes(a.severity))
  const latestAlerts = dedupedAlerts.slice(0, 4)

  const todayStr = new Date().toDateString()
  const reportsToday = alerts.filter(
    a => a.reportedAt && new Date(a.reportedAt).toDateString() === todayStr
  ).length

  const risk = computeRisk(alerts)
  const digestSummary = lowPriorityAlerts.length > 0 ? `Digest view: ${lowPriorityAlerts.length} quiet updates grouped across ${[...new Set(lowPriorityAlerts.map(a => a.affectedAreas?.[0] || a.location?.split(',')[0]))].slice(0, 2).join(' / ')}` : null

  return (
    <div className="dash-page animate-fade-in">

      {/* Greeting hero banner */}
      <div className="dash-greeting-hero">
        <div className="dash-greeting-content">
          <p className="dash-greeting-eyebrow">
            <span className="dash-greeting-eyebrow-dot" />
            Live Monitoring Active
          </p>
          <h1 className="dash-greeting-title">
            {getGreeting()},{' '}
            <span className="dash-greeting-name">{user?.name?.split(' ')[0] || 'there'}</span>
          </h1>
          <p className="dash-greeting-sub">Stay informed. Stay prepared.</p>
        </div>
        <div className="dash-greeting-actions">
          <span className={`dash-risk-badge dash-risk-badge--${risk.tone}`}>
            <Shield size={13} />
            {risk.label} Risk
          </span>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard/report/new')}>
            Quick Report <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="dash-stats">
        <StatCard icon={AlertTriangle} value={dedupedAlerts.length} label="Active Alerts" tone="critical" delay={0} />
        <StatCard icon={FileText}      value={reportsToday}        label="Reports Today" tone="verified" delay={60} />
        <StatCard icon={Shield}        value={risk.label}          label="Current Risk"  tone={risk.tone} delay={120} />
        <StatCard icon={Sun}           value="28°C"                label="Local Weather" tone="neutral" delay={180} />
      </div>

      {priorityAlerts.length > 0 ? (
        <div className="dash-priority-banner">
          <AlertTriangle size={16} className="dash-priority-banner-icon" />
          <span>High-priority alert cluster: {priorityAlerts.length} active incident{priorityAlerts.length > 1 ? 's' : ''} require attention.</span>
        </div>
      ) : digestSummary ? (
        <div className="dash-priority-banner dash-priority-banner--digest">
          <Bell size={16} className="dash-priority-banner-icon" />
          <span>{digestSummary}</span>
        </div>
      ) : null}

      {/* Map preview + latest alerts */}
      <div className={`dash-panels ${mapExpanded ? 'dash-panels--map-expanded' : ''}`}>

        <div className="dash-map-card">
          <div className="dash-map-card-header">
            <h2 className="dash-map-card-title">
              Live Hazard Map
              <span className="dash-live-badge"><span className="dash-live-dot" />Live</span>
            </h2>

            {/* Map layers toolbar */}
            <div className="map-layers-toolbar">
              <label className="layer-checkbox-label">
                <input
                  type="checkbox"
                  checked={showShelters}
                  onChange={e => setShowShelters(e.target.checked)}
                />
                <Building2 size={13} />
                Safe Shelters
              </label>
              <label className="layer-checkbox-label">
                <input
                  type="checkbox"
                  checked={showRoutes}
                  onChange={e => setShowRoutes(e.target.checked)}
                />
                <RouteIcon size={13} />
                Evacuation Routes
              </label>
            </div>

            <button
              className="dash-map-expand-btn"
              onClick={() => setMapExpanded(v => !v)}
              aria-label={mapExpanded ? 'Collapse map' : 'Expand map'}
            >
              <Maximize2 size={14} />
            </button>
          </div>

          <div className="dash-map-preview">
            <MockMap
              activeMarker={activeMarker}
              onMarkerClick={id => setActiveMarker(prev => prev === id ? null : id)}
              showShelters={showShelters}
              showRoutes={showRoutes}
            />
            <div className="dash-map-zoom">
              <button className="dash-map-zoom-btn" aria-label="Zoom in"><Plus size={14} /></button>
              <button className="dash-map-zoom-btn" aria-label="Zoom out"><Minus size={14} /></button>
            </div>
          </div>

          {/* Map legend */}
          <div className="dash-map-legend">
            {MAP_LEGEND.map(item => (
              <span key={item.label} className="dash-map-legend-item">
                <span className="dash-map-legend-swatch" style={{ background: item.bg }} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        {/* Side Panels Stack: Latest Alerts + Safe Shelters Directory */}
        <div className="dash-side-column">

          {/* Latest Alerts Panel */}
          <div className="dash-alerts-card">
            <div className="dash-alerts-card-header">
              <h2 className="dash-alerts-card-title">
                <Bell size={15} />
                Latest Alerts
              </h2>
            </div>

            <div className="dash-alerts-card-list">
              {latestAlerts.length === 0 ? (
                <p className="dash-alerts-empty">No active alerts right now.</p>
              ) : (
                latestAlerts.map(alert => (
                  <LatestAlertRow
                    key={`${alert.type}-${alert.affectedAreas?.[0] || alert.location}`}
                    alert={alert}
                    onClick={id => navigate(`/dashboard/alert/${id}`)}
                  />
                ))
              )}
            </div>

            <button className="dash-view-all-link" onClick={() => navigate('/dashboard/my-reports')}>
              View All Alerts <ChevronRight size={13} />
            </button>
          </div>

          {/* Safe Shelters Directory Panel */}
          <div className="dash-shelters-card">
            <div className="dash-shelters-card-header">
              <h2 className="dash-alerts-card-title">
                <Home size={15} />
                Safe Shelters Directory
              </h2>
            </div>
            <div className="dash-shelters-list">
              {MOCK_SHELTERS.map(s => {
                const isFull = s.status === 'full'
                const occupancy = Math.round((s.capacity / s.maxCapacity) * 100)
                const color = isFull ? 'var(--sev-critical)' : 'var(--text-success)'
                return (
                  <div key={s.id} className="shelter-list-item">
                    <div className="shelter-info">
                      <div className="flex items-center justify-between">
                        <strong className="shelter-name">{s.name}</strong>
                        <span className={`shelter-status-pill ${isFull ? 'full' : 'open'}`}>
                          {isFull ? 'FULL' : 'OPEN'}
                        </span>
                      </div>
                      <span className="shelter-address">{s.address}</span>
                      <span className="shelter-type">{s.type}</span>
                    </div>
                    <div className="shelter-capacity-bar-wrap">
                      <div className="capacity-text">
                        <span>Capacity Occupancy</span>
                        <strong>{occupancy}% ({s.capacity}/{s.maxCapacity})</strong>
                      </div>
                      <div className="capacity-bar">
                        <div
                          className="capacity-fill"
                          style={{
                            width: `${occupancy}%`,
                            background: color
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}