import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Shield, FileText, Plus, Minus,
  Maximize2, Minimize2, ChevronRight, Home, Bell,
  Route as RouteIcon, Building2, PlusCircle,
  Navigation, Compass, Clock, MapPin,
  ShieldAlert, ShieldCheck, CheckSquare,
  Package, PhoneCall, Layers, Radio, FileCheck,
  SunMedium, Activity, X, Check, Flame, Waves,
  Mountain, AlertCircle, Wrench
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAlerts } from '../context/AlertsContext'
import { MOCK_SHELTERS, MOCK_ROUTES, timeAgo } from '../data/mockData'
import './DashboardPage.css'

/* ─── Severity Colors & Data ─── */
const SEV_DOT = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#0ea5e9',
}

/* ─── Numbered map markers with detailed metadata for interactive inspection ─── */
const MAP_MARKERS = [
  {
    id: 'm1',
    x: 22,
    y: 44,
    bg: '#10b981',
    glow: 'rgba(16, 185, 129, 0.45)',
    num: 1,
    title: 'Zone 1 · North Riverdale',
    hazard: 'Minor Tremor Monitored',
    type: 'seismic',
    severity: 'low',
    confidence: 74,
    reportsCount: 8,
    status: 'Monitoring Stable',
    alertId: 'a-003'
  },
  {
    id: 'm2',
    x: 48,
    y: 32,
    bg: '#0ea5e9',
    glow: 'rgba(14, 165, 233, 0.45)',
    num: 2,
    title: 'Zone 2 · Riverdale Riverway',
    hazard: 'High River Levels Gauge #14',
    type: 'river',
    severity: 'critical',
    confidence: 82,
    reportsCount: 16,
    status: 'Action Recommended',
    alertId: 'a-001'
  },
  {
    id: 'm3',
    x: 58,
    y: 57,
    bg: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.45)',
    num: 3,
    title: 'Zone 3 · Eastvale Hills',
    hazard: 'Moderate Fire Risk & Wind',
    type: 'fire',
    severity: 'high',
    confidence: 68,
    reportsCount: 12,
    status: 'Fire Watch Active',
    alertId: 'a-002'
  },
  {
    id: 'm4',
    x: 67,
    y: 73,
    bg: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.55)',
    num: 4,
    title: 'Zone 4 · Southbank Corridor',
    hazard: '1st St Bridge Structural Alert',
    type: 'infrastructure',
    severity: 'critical',
    confidence: 85,
    reportsCount: 24,
    status: 'Bridge Closed',
    alertId: 'a-006'
  },
]

/* ─── Animated Number Count-Up Hook ─── */
function useCountUp(end, duration = 1100, delay = 0) {
  const [value, setValue] = useState(0)
  const frameRef = useRef(null)

  useEffect(() => {
    if (typeof end !== 'number') return
    const timer = setTimeout(() => {
      const startTime = performance.now()
      const animate = (now) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(eased * end))
        if (progress < 1) frameRef.current = requestAnimationFrame(animate)
      }
      frameRef.current = requestAnimationFrame(animate)
    }, delay)
    return () => {
      clearTimeout(timer)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [end, duration, delay])

  return value
}

/* ─── Viewport Intersection Hook ─── */
function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView]
}

/* ─── Get Hazard Type Icon ─── */
function getHazardIcon(type) {
  switch (type) {
    case 'river':
    case 'flood':
      return <Waves size={15} className="hazard-type-ico hazard-type-ico--river" />
    case 'fire':
      return <Flame size={15} className="hazard-type-ico hazard-type-ico--fire" />
    case 'seismic':
    case 'landslide':
      return <Mountain size={15} className="hazard-type-ico hazard-type-ico--seismic" />
    case 'infrastructure':
    case 'pothole':
      return <Wrench size={15} className="hazard-type-ico hazard-type-ico--infra" />
    default:
      return <AlertCircle size={15} className="hazard-type-ico hazard-type-ico--default" />
  }
}

/* ─── Modern Vector Mock Map Component ─── */
function MockMap({ activeMarker, onMarkerClick, showShelters, showRoutes, showZones }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 200)
    return () => clearTimeout(t)
  }, [])

  return (
    <svg
      viewBox="0 0 800 560"
      xmlns="http://www.w3.org/2000/svg"
      className="dash-svg-map"
      aria-label="High-resolution hazard telemetry incident map of Riverdale"
    >
      <defs>
        <filter id="markerGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
        <filter id="hudShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000000" floodOpacity="0.55"/>
        </filter>
        <radialGradient id="mapVignette" cx="50%" cy="50%" r="72%">
          <stop offset="0%" stopColor="transparent"/>
          <stop offset="100%" stopColor="rgba(8, 14, 26, 0.6)"/>
        </radialGradient>
        <linearGradient id="riverGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0c2340"/>
          <stop offset="50%" stopColor="#11325c"/>
          <stop offset="100%" stopColor="#0a1d35"/>
        </linearGradient>
        <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
        </pattern>
      </defs>

      {/* Map Base */}
      <rect width="800" height="560" fill="#0f172a" />
      <rect width="800" height="560" fill="url(#gridPattern)" />

      {/* City Blocks with subtle depth */}
      {[
        {x:0,   y:0,   w:192, h:136}, {x:200, y:0,   w:225, h:136},
        {x:0,   y:144, w:192, h:136}, {x:200, y:144, w:225, h:136},
        {x:0,   y:288, w:192, h:136}, {x:200, y:288, w:225, h:136},
        {x:435, y:0,   w:188, h:136}, {x:630, y:0,   w:170, h:136},
        {x:435, y:144, w:188, h:90 }, {x:630, y:144, w:170, h:136},
        {x:435, y:288, w:188, h:136}, {x:630, y:288, w:170, h:136},
        {x:0,   y:432, w:192, h:128}, {x:200, y:432, w:225, h:128},
        {x:435, y:432, w:188, h:128}, {x:630, y:432, w:170, h:128},
      ].map((b, i) => (
        <g key={i}>
          <rect
            x={b.x + 2}
            y={b.y + 2}
            width={b.w - 4}
            height={b.h - 4}
            fill="#172238"
            rx="4"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
          />
          {/* Subtle interior sub-lot lines */}
          <line x1={b.x + b.w / 2} y1={b.y + 4} x2={b.x + b.w / 2} y2={b.y + b.h - 4} stroke="rgba(255,255,255,0.02)" strokeWidth="1" strokeDasharray="3 3"/>
        </g>
      ))}

      {/* Major Arterial Roads */}
      <line x1="0" y1="140" x2="800" y2="140" stroke="#090e18" strokeWidth="14"/>
      <line x1="0" y1="140" x2="800" y2="140" stroke="#253553" strokeWidth="6"/>
      <line x1="0" y1="140" x2="800" y2="140" stroke="#38bdf8" strokeWidth="1" strokeDasharray="6 8" opacity="0.3"/>

      <line x1="0" y1="284" x2="800" y2="284" stroke="#090e18" strokeWidth="14"/>
      <line x1="0" y1="284" x2="800" y2="284" stroke="#253553" strokeWidth="6"/>
      <line x1="0" y1="284" x2="800" y2="284" stroke="#38bdf8" strokeWidth="1" strokeDasharray="6 8" opacity="0.3"/>

      <line x1="0" y1="428" x2="800" y2="428" stroke="#090e18" strokeWidth="14"/>
      <line x1="0" y1="428" x2="800" y2="428" stroke="#253553" strokeWidth="6"/>

      <line x1="196" y1="0" x2="196" y2="560" stroke="#090e18" strokeWidth="14"/>
      <line x1="196" y1="0" x2="196" y2="560" stroke="#253553" strokeWidth="6"/>

      <line x1="432" y1="0" x2="432" y2="560" stroke="#090e18" strokeWidth="14"/>
      <line x1="432" y1="0" x2="432" y2="560" stroke="#253553" strokeWidth="6"/>

      <line x1="628" y1="0" x2="628" y2="560" stroke="#090e18" strokeWidth="14"/>
      <line x1="628" y1="0" x2="628" y2="560" stroke="#253553" strokeWidth="6"/>

      {/* Minor Interconnecting Streets */}
      {[70, 210, 354, 496].map(y => (
        <line key={`hr-${y}`} x1="0" y1={y} x2="800" y2={y} stroke="#1b2841" strokeWidth="3" opacity="0.85"/>
      ))}
      {[95, 530].map(x => (
        <line key={`vr-${x}`} x1={x} y1="0" x2={x} y2="560" stroke="#1b2841" strokeWidth="3" opacity="0.85"/>
      ))}

      {/* Van Cortlandt Nature Park */}
      <ellipse cx="462" cy="228" rx="94" ry="72" fill="#13271d" stroke="#1c3d2c" strokeWidth="1.5"/>
      <ellipse cx="462" cy="228" rx="78" ry="56" fill="#183424"/>
      <text x="462" y="232" textAnchor="middle" fill="#34d399" fontSize="10"
        fontWeight="800" fontFamily="Inter, sans-serif" letterSpacing="0.08em" opacity="0.75">
        VAN CORTLANDT PARK
      </text>

      {/* Riverdale River Flow with high detail */}
      <path
        d="M 628 0 C 600 48 578 86 556 128 C 534 170 514 198 492 240 C 470 282 456 316 438 352 C 420 388 396 416 366 442 C 336 468 302 488 264 506 C 226 524 194 538 162 554 C 130 568 100 576 66 556"
        fill="none"
        stroke="url(#riverGrad)"
        strokeWidth="38"
        strokeLinecap="round"
      />
      <path
        d="M 628 0 C 600 48 578 86 556 128 C 534 170 514 198 492 240 C 470 282 456 316 438 352 C 420 388 396 416 366 442 C 336 468 302 488 264 506 C 226 524 194 538 162 554 C 130 568 100 576 66 556"
        fill="none"
        stroke="#38bdf8"
        strokeWidth="4"
        strokeDasharray="14 18"
        opacity="0.5"
        className="evac-route-flow"
      />

      {/* District & Location Labels */}
      {[
        { x: 94,  y: 64,  label: 'NORTH RIVERDALE' },
        { x: 308, y: 64,  label: 'FIELDSTON' },
        { x: 520, y: 64,  label: 'RIVERDALE PARK' },
        { x: 700, y: 80,  label: 'EASTVALE HEIGHTS' },
        { x: 94,  y: 222, label: 'WEST RIVERDALE' },
        { x: 308, y: 364, label: 'RIVERDALE CENTER' },
        { x: 94,  y: 500, label: 'OAKRIDGE DISTRICT' },
        { x: 520, y: 500, label: 'SOUTH RIVERDALE' },
      ].map((d, i) => (
        <text key={i} x={d.x} y={d.y} textAnchor="middle"
          fill="#475569" fontSize="8.5" fontWeight="800"
          fontFamily="Inter, sans-serif" letterSpacing="0.12em">
          {d.label}
        </text>
      ))}

      {/* Evacuation Routes */}
      {showRoutes && MOCK_ROUTES.map(r => {
        const dStr = r.points.map((p, idx) => {
          const px = (p[0] / 100) * 800
          const py = (p[1] / 100) * 560
          return `${idx === 0 ? 'M' : 'L'} ${px} ${py}`
        }).join(' ')
        return (
          <g key={r.id} className="evac-route-group">
            <path d={dStr} fill="none" stroke="#22c55e" strokeWidth="12" strokeLinecap="round" opacity="0.15"/>
            <path d={dStr} fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round"
              strokeDasharray="10 8" className="evac-route-flow" opacity="0.95"/>
          </g>
        )
      })}

      {/* Safe Shelters */}
      {showShelters && MOCK_SHELTERS.map(s => {
        const px = (s.x / 100) * 800
        const py = (s.y / 100) * 560
        const isFull = s.status === 'full'
        const color = isFull ? '#ef4444' : '#10b981'
        const occupancy = Math.round((s.capacity / s.maxCapacity) * 100)
        return (
          <g key={s.id} transform={`translate(${px}, ${py})`} className="shelter-map-pin" style={{ cursor: 'pointer' }}>
            <circle cx="0" cy="0" r="18" fill={color} opacity="0.15">
              {!isFull && <animate attributeName="r" from="12" to="24" dur="2.2s" repeatCount="indefinite"/>}
              {!isFull && <animate attributeName="opacity" from="0.3" to="0" dur="2.2s" repeatCount="indefinite"/>}
            </circle>
            <circle cx="0" cy="0" r="11" fill="#0f172a" stroke={color} strokeWidth="2" filter="url(#hudShadow)"/>
            <path d="M-3 -1 H-1 V-3 H1 V-1 H3 V1 H1 V3 H-1 V1 H-3 Z" fill={color}/>
            <g className="shelter-hover-hud" transform="translate(0, -32)">
              <rect x="-65" y="0" width="130" height="26" rx="6" fill="#0b1322" stroke="rgba(255,255,255,0.15)" strokeWidth="1" filter="url(#hudShadow)"/>
              <text x="0" y="10" textAnchor="middle" fill="#f8fafc" fontSize="8" fontWeight="700" fontFamily="Inter, sans-serif">
                {s.name}
              </text>
              <text x="0" y="20" textAnchor="middle" fill={isFull ? '#f87171' : '#34d399'} fontSize="7.5" fontWeight="800" fontFamily="Inter, sans-serif">
                {isFull ? '● AT CAPACITY (100%)' : `● OPEN · ${occupancy}% (${s.capacity}/${s.maxCapacity})`}
              </text>
            </g>
          </g>
        )
      })}

      {/* Numbered Hazard Zone Markers */}
      {showZones && MAP_MARKERS.map((m, i) => {
        const px = (m.x / 100) * 800
        const py = (m.y / 100) * 560
        const isActive = activeMarker === m.id
        return (
          <g key={m.id} className={`map-zone-marker ${isActive ? 'map-zone-marker--active' : ''}`}
             style={{ cursor: 'pointer' }} onClick={() => onMarkerClick(m.id)}>
            {/* Active expanding pulse ring */}
            {isActive && (
              <circle cx={px} cy={py} r="32" fill={m.bg} opacity="0.3">
                <animate attributeName="r" from="20" to="44" dur="1.2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" from="0.35" to="0" dur="1.2s" repeatCount="indefinite"/>
              </circle>
            )}
            {/* Ambient outer glow */}
            <circle cx={px} cy={py} r="22" fill={m.glow} opacity={isActive ? 0.9 : 0.45}
              style={{ transition: 'opacity 0.25s ease' }} filter="url(#markerGlow)"/>
            {/* Inner badge */}
            <circle cx={px} cy={py} r="15" fill={m.bg} stroke="#ffffff" strokeWidth="2" filter="url(#hudShadow)"/>
            {/* Number */}
            <text x={px} y={py + 5} textAnchor="middle" fill="#ffffff"
              fontSize="12.5" fontWeight="900" fontFamily="Inter, sans-serif"
              style={{ pointerEvents: 'none', userSelect: 'none' }}>
              {m.num}
            </text>
          </g>
        )
      })}

      {/* Vignette Overlay */}
      <rect width="800" height="560" fill="url(#mapVignette)" pointerEvents="none"/>
    </svg>
  )
}

/* ─── Greeting Helper ─── */
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/* ─── Risk Calculation ─── */
function computeRisk(alerts) {
  const active = alerts.filter(a => a.status !== 'resolved')
  if (active.some(a => a.severity === 'critical' || a.severity === 'high')) return { label: 'Elevated Risk', tone: 'critical', desc: 'Critical alerts active' }
  if (active.some(a => a.severity === 'medium')) return { label: 'Moderate Risk', tone: 'medium', desc: 'Weather advisory in effect' }
  return { label: 'Low Risk', tone: 'safe', desc: 'All telemetry nominal' }
}

/* ─── Executive Metric Card ─── */
function StatCard({ icon: Icon, value, label, subtext, tone, delay = 0 }) {
  const [cardRef, inView] = useInView()
  const isNumeric = typeof value === 'number'
  const animated = useCountUp(isNumeric && inView ? value : 0, 1000, isNumeric ? delay : 0)
  const display = isNumeric ? animated : value

  return (
    <div
      ref={cardRef}
      className={`dash-stat-card dash-stat-card--${tone}`}
      style={{ '--anim-delay': `${delay}ms` }}
    >
      <div className="dash-stat-topline" />
      <div className="dash-stat-header">
        <div className="dash-stat-icon-wrap">
          <Icon size={20} />
        </div>
        <span className="dash-stat-tone-pill">{tone}</span>
      </div>
      <div className="dash-stat-body">
        <p className="dash-stat-value">{display}</p>
        <p className="dash-stat-label">{label}</p>
        {subtext && <p className="dash-stat-subtext">{subtext}</p>}
      </div>
    </div>
  )
}

/* ─── Refined Alert Item Row ─── */
function LatestAlertRow({ alert, onClick, index = 0 }) {
  const dot = SEV_DOT[alert.severity] || '#94a3b8'

  let displayTitle = alert.title
  if (alert.title === 'Hazard reported' || !alert.title || alert.title === 'Hazard Report') {
    const type = alert.type || ''
    if (type === 'river' || type === 'flood') displayTitle = 'Flood & River Level Rise'
    else if (type === 'fire') displayTitle = 'Active Brush Fire Perimeter'
    else if (type === 'seismic' || type === 'landslide') displayTitle = 'Seismic Ground Movement'
    else if (type === 'infrastructure' || type === 'pothole') displayTitle = 'Infrastructure Anomaly'
    else displayTitle = `${type.charAt(0).toUpperCase() + type.slice(1)} Incident`
  }

  return (
    <button
      className={`dash-alert-row dash-alert-row--${alert.severity}`}
      style={{ '--row-delay': `${index * 50}ms` }}
      onClick={() => onClick(alert.id)}
    >
      <div className="dash-alert-row-icon-col">
        {getHazardIcon(alert.type)}
        <span className="dash-alert-row-pulse" style={{ background: dot }} />
      </div>

      <div className="dash-alert-row-body">
        <div className="dash-alert-row-head">
          <span className="dash-alert-row-title">{displayTitle}</span>
          <span className="dash-alert-row-time">{alert.reportedAt ? timeAgo(alert.reportedAt) : 'Recent'}</span>
        </div>

        <div className="dash-alert-row-meta">
          <span className={`dash-alert-sev-badge dash-alert-sev-badge--${alert.severity}`}>
            {alert.severity.toUpperCase()}
          </span>
          <span className="dash-alert-conf-badge">
            <Activity size={10} />
            {alert.confidence}% AI Confidence
          </span>
          {alert.duplicateCount > 1 && (
            <span className="dash-alert-grouped-badge">
              {alert.duplicateCount} Reports Clustered
            </span>
          )}
        </div>

        <div className="dash-alert-row-loc">
          <MapPin size={11} className="dash-alert-loc-icon" />
          <span>{alert.location}</span>
        </div>
      </div>

      <div className="dash-alert-row-action">
        <span className="dash-alert-action-txt">Inspect</span>
        <ChevronRight size={14} className="dash-alert-chevron" />
      </div>
    </button>
  )
}

/* ─── Main Dashboard Page Component ─── */
export default function DashboardPage() {
  const { user } = useAuth()
  const { alerts } = useAlerts()
  const navigate = useNavigate()

  const [activeMarkerId, setActiveMarkerId] = useState(null)
  const [mapExpanded, setMapExpanded]       = useState(false)
  const [showShelters, setShowShelters]     = useState(true)
  const [showRoutes, setShowRoutes]         = useState(true)
  const [showZones, setShowZones]           = useState(true)
  const [alertFilter, setAlertFilter]       = useState('all') // 'all' | 'critical' | 'high' | 'other'
  const [currentTime, setCurrentTime]       = useState(new Date())
  const [mounted, setMounted]               = useState(false)

  // Real-time clock for header telemetry
  useEffect(() => {
    setMounted(true)
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const filteredAlerts = useMemo(() =>
    alerts.filter(a => a.status === 'approved' || a.status === 'pending' || a.status === 'verified'), [alerts])

  const dedupedAlerts = useMemo(() => {
    const grouped = new Map()
    for (const alert of filteredAlerts) {
      const areaKey = (alert.affectedAreas?.[0] || alert.location?.split(',')[0] || 'general').trim().toLowerCase()
      const key = `${alert.type}|${areaKey}`
      const existing = grouped.get(key)
      if (!existing) {
        grouped.set(key, { ...alert, duplicateCount: 1 })
      } else {
        const rank = { low: 0, medium: 1, high: 2, critical: 3 }
        const cR = rank[alert.severity] ?? 0
        const eR = rank[existing.severity] ?? 0
        if (cR > eR || (cR === eR && (alert.confidence ?? 0) > (existing.confidence ?? 0))) {
          grouped.set(key, { ...alert, duplicateCount: (existing.duplicateCount || 1) + 1 })
        } else {
          grouped.set(key, { ...existing, duplicateCount: (existing.duplicateCount || 1) + 1 })
        }
      }
    }
    return [...grouped.values()].sort((a, b) =>
      new Date(b.updatedAt || b.reportedAt || 0) - new Date(a.updatedAt || a.reportedAt || 0))
  }, [filteredAlerts])

  // Category filter
  const displayedAlerts = useMemo(() => {
    if (alertFilter === 'critical') return dedupedAlerts.filter(a => a.severity === 'critical')
    if (alertFilter === 'high') return dedupedAlerts.filter(a => a.severity === 'high')
    if (alertFilter === 'other') return dedupedAlerts.filter(a => a.severity === 'medium' || a.severity === 'low')
    return dedupedAlerts
  }, [dedupedAlerts, alertFilter])

  const priorityAlerts    = dedupedAlerts.filter(a => ['critical', 'high'].includes(a.severity))
  const activeZoneDetail  = MAP_MARKERS.find(m => m.id === activeMarkerId)

  const todayStr     = new Date().toDateString()
  const reportsToday = alerts.filter(a => a.reportedAt && new Date(a.reportedAt).toDateString() === todayStr).length || 18
  const risk         = computeRisk(alerts)

  const openSheltersCount = MOCK_SHELTERS.filter(s => s.status === 'open').length

  return (
    <div className={`dash-page ${mounted ? 'dash-page--mounted' : ''}`}>

      {/* ─── TOP TELEMETRY HERO HEADER ─── */}
      <header className="dash-hero-banner">
        <div className="dash-hero-mesh" aria-hidden="true" />

        <div className="dash-hero-content">
          {/* Live Telemetry Status Pill */}
          <div className="dash-hero-telemetry-badge">
            <span className="dash-telemetry-beacon">
              <span className="dash-beacon-dot" />
              <span className="dash-beacon-ping" />
            </span>
            <span className="dash-telemetry-label">LIVE INCIDENT MONITORING</span>
            <span className="dash-telemetry-sep">·</span>
            <span className="dash-telemetry-time">
              <Clock size={11} className="inline mr-1" />
              {currentTime.toLocaleTimeString('en-US', { hour12: false })} UTC
            </span>
          </div>

          <h1 className="dash-hero-title">
            {getGreeting()},{' '}
            <span className="dash-hero-user-name">{user?.name?.split(' ')[0] || 'Commander'}</span>
          </h1>
          <p className="dash-hero-desc">
            Riverdale Municipal Hazard Assessment · Multi-source integrity feeds operational.
          </p>
        </div>

        {/* Action Controls in Hero */}
        <div className="dash-hero-actions">
          {/* Risk Level Badge */}
          <div className={`dash-hero-risk-pill dash-hero-risk-pill--${risk.tone}`}>
            {risk.tone === 'critical' ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
            <div>
              <span className="dash-hero-risk-title">{risk.label}</span>
              <span className="dash-hero-risk-sub">{risk.desc}</span>
            </div>
          </div>

          {/* Quick Action Button Group */}
          <div className="dash-hero-btn-group">
            <button
              className="dash-btn dash-btn--primary dash-btn--glow"
              onClick={() => navigate('/dashboard/report/new')}
            >
              <PlusCircle size={17} />
              <span>+ Quick Report</span>
            </button>

            <button
              className="dash-btn dash-btn--secondary"
              onClick={() => navigate('/dashboard/live-map')}
            >
              <Navigation size={15} />
              <span>Live Navigation Map</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── EXECUTIVE METRIC CARDS ─── */}
      <section className="dash-metrics-grid" aria-label="Key Hazard Metrics">
        <StatCard
          icon={AlertTriangle}
          value={dedupedAlerts.length || 6}
          label="Active Hazard Alerts"
          subtext={`${priorityAlerts.length} high priority`}
          tone="critical"
          delay={0}
        />
        <StatCard
          icon={FileCheck}
          value={reportsToday}
          label="Reports Logged Today"
          subtext="Verified by sensor grid"
          tone="verified"
          delay={70}
        />
        <StatCard
          icon={Shield}
          value={risk.label.split(' ')[0]}
          label="City Threat Index"
          subtext="Telemetry nominal"
          tone={risk.tone}
          delay={140}
        />
        <StatCard
          icon={SunMedium}
          value="28°C"
          label="Local Weather Station"
          subtext="Winds 14 km/h · 42% Hum"
          tone="sky"
          delay={210}
        />
      </section>

      {/* ─── PRIORITY EMERGENCY ADVISORY BANNER ─── */}
      {priorityAlerts.length > 0 && (
        <div className="dash-tactical-banner" role="alert">
          <div className="dash-tactical-banner-left">
            <div className="dash-tactical-pulse-badge">
              <Radio size={14} className="dash-tactical-icon-pulse" />
              PRIORITY NOTICE
            </div>
            <p className="dash-tactical-banner-text">
              <strong>{priorityAlerts.length} High-Severity Incidents Detected:</strong> Riverdale River Flood Warning & Eastvale Fire Perimeter active. Immediate mitigation active.
            </p>
          </div>
          <button
            className="dash-tactical-banner-btn"
            onClick={() => navigate('/dashboard/my-reports')}
          >
            <span>Review Incident Queue</span>
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* ─── MAIN DOCK: MAP + SIDE FEED COLUMNS ─── */}
      <main className={`dash-main-dock ${mapExpanded ? 'dash-main-dock--expanded' : ''}`}>

        {/* ─── Interactive Map Module ─── */}
        <section className="dash-card dash-map-section">
          {/* Card Header & Controls */}
          <div className="dash-card-header dash-map-header">
            <div className="dash-map-header-left">
              <h2 className="dash-card-heading">
                <Compass size={18} className="text-accent" />
                <span>Live Hazard Radar</span>
              </h2>
              <span className="dash-live-chip">
                <span className="dash-live-chip-dot" />
                SATELLITE & SENSORS
              </span>
            </div>

            {/* Tactical Layer Toggle Chips */}
            <div className="dash-layer-dock">
              <button
                type="button"
                className={`dash-layer-pill ${showShelters ? 'dash-layer-pill--active' : ''}`}
                onClick={() => setShowShelters(v => !v)}
              >
                <Building2 size={13} />
                <span>Safe Shelters</span>
                {showShelters && <Check size={12} className="dash-layer-check" />}
              </button>

              <button
                type="button"
                className={`dash-layer-pill ${showRoutes ? 'dash-layer-pill--active' : ''}`}
                onClick={() => setShowRoutes(v => !v)}
              >
                <RouteIcon size={13} />
                <span>Evac Routes</span>
                {showRoutes && <Check size={12} className="dash-layer-check" />}
              </button>

              <button
                type="button"
                className={`dash-layer-pill ${showZones ? 'dash-layer-pill--active' : ''}`}
                onClick={() => setShowZones(v => !v)}
              >
                <Layers size={13} />
                <span>Zones</span>
                {showZones && <Check size={12} className="dash-layer-check" />}
              </button>
            </div>

            {/* Map Expand / Action Buttons */}
            <div className="dash-map-action-btns">
              <button
                className="dash-icon-btn"
                onClick={() => setMapExpanded(v => !v)}
                title={mapExpanded ? 'Collapse view' : 'Expand full width'}
                aria-label="Toggle map size"
              >
                {mapExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>

              <button
                className="dash-btn dash-btn--sm dash-btn--ghost"
                onClick={() => navigate('/dashboard/live-map')}
              >
                <Navigation size={13} />
                <span>Open Router</span>
              </button>
            </div>
          </div>

          {/* Map Canvas Viewport */}
          <div className="dash-map-viewport">
            <MockMap
              activeMarker={activeMarkerId}
              onMarkerClick={id => setActiveMarkerId(prev => prev === id ? null : id)}
              showShelters={showShelters}
              showRoutes={showRoutes}
              showZones={showZones}
            />

            {/* Floating Zone Details HUD Card (Appears when marker is clicked) */}
            {activeZoneDetail && (
              <div className="dash-zone-inspector-hud">
                <div className="dash-zone-hud-header">
                  <div className="dash-zone-hud-title-wrap">
                    <span className="dash-zone-hud-num" style={{ background: activeZoneDetail.bg }}>
                      {activeZoneDetail.num}
                    </span>
                    <div>
                      <h4 className="dash-zone-hud-title">{activeZoneDetail.title}</h4>
                      <p className="dash-zone-hud-hazard">{activeZoneDetail.hazard}</p>
                    </div>
                  </div>
                  <button
                    className="dash-zone-hud-close"
                    onClick={() => setActiveMarkerId(null)}
                    aria-label="Close details"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="dash-zone-hud-stats">
                  <div className="dash-zone-hud-stat">
                    <span className="dash-zone-stat-lbl">Severity</span>
                    <span className={`dash-zone-stat-val text-${activeZoneDetail.severity}`}>
                      {activeZoneDetail.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="dash-zone-hud-stat">
                    <span className="dash-zone-stat-lbl">AI Confidence</span>
                    <span className="dash-zone-stat-val">{activeZoneDetail.confidence}%</span>
                  </div>
                  <div className="dash-zone-hud-stat">
                    <span className="dash-zone-stat-lbl">Reports</span>
                    <span className="dash-zone-stat-val">{activeZoneDetail.reportsCount} logged</span>
                  </div>
                </div>

                <div className="dash-zone-hud-footer">
                  <button
                    className="dash-btn dash-btn--sm dash-btn--primary w-full"
                    onClick={() => navigate(`/dashboard/alert/${activeZoneDetail.alertId}`)}
                  >
                    <span>Inspect Incident Dossier</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* Floating Interactive Zone Legend Dock */}
            <div className="dash-map-legend-dock">
              <span className="dash-legend-dock-label">INCIDENT ZONES:</span>
              <div className="dash-legend-pills">
                {MAP_MARKERS.map(m => (
                  <button
                    key={m.id}
                    className={`dash-legend-pill ${activeMarkerId === m.id ? 'dash-legend-pill--active' : ''}`}
                    onClick={() => setActiveMarkerId(prev => prev === m.id ? null : m.id)}
                  >
                    <span className="dash-legend-pill-dot" style={{ background: m.bg, boxShadow: `0 0 8px ${m.glow}` }} />
                    <span>Z{m.num}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Floating Zoom & Controls Dock */}
            <div className="dash-map-controls-dock">
              <button className="dash-map-zoom-action" title="Zoom in" aria-label="Zoom in">
                <Plus size={14} />
              </button>
              <div className="dash-zoom-divider" />
              <button className="dash-map-zoom-action" title="Zoom out" aria-label="Zoom out">
                <Minus size={14} />
              </button>
            </div>
          </div>
        </section>

        {/* ─── SIDE COLUMN: ALERTS FEED + SAFE SHELTERS ─── */}
        <aside className="dash-side-dock">

          {/* ─── LATEST ALERTS CARD ─── */}
          <section className="dash-card dash-alerts-module">
            {/* Header & Filter Tabs */}
            <div className="dash-card-header dash-alerts-header">
              <div>
                <h2 className="dash-card-heading">
                  <Bell size={17} className="text-accent" />
                  <span>Incident Feed</span>
                </h2>
                <p className="dash-card-subheading">{displayedAlerts.length} Active Events</p>
              </div>

              {/* Filter Tabs */}
              <div className="dash-filter-tabs">
                <button
                  className={`dash-filter-tab ${alertFilter === 'all' ? 'dash-filter-tab--active' : ''}`}
                  onClick={() => setAlertFilter('all')}
                >
                  All ({dedupedAlerts.length})
                </button>
                <button
                  className={`dash-filter-tab ${alertFilter === 'critical' ? 'dash-filter-tab--active' : ''}`}
                  onClick={() => setAlertFilter('critical')}
                >
                  Critical
                </button>
                <button
                  className={`dash-filter-tab ${alertFilter === 'high' ? 'dash-filter-tab--active' : ''}`}
                  onClick={() => setAlertFilter('high')}
                >
                  High
                </button>
              </div>
            </div>

            {/* Alert Items List */}
            <div className="dash-alerts-scrollbox">
              {displayedAlerts.length === 0 ? (
                <div className="dash-empty-state">
                  <div className="dash-empty-state-icon">
                    <ShieldCheck size={28} />
                  </div>
                  <h4 className="dash-empty-state-title">No matching incidents</h4>
                  <p className="dash-empty-state-desc">All signals normal for this filter.</p>
                </div>
              ) : (
                displayedAlerts.slice(0, 4).map((alert, idx) => (
                  <LatestAlertRow
                    key={alert.id || idx}
                    alert={alert}
                    index={idx}
                    onClick={id => navigate(`/dashboard/alert/${id}`)}
                  />
                ))
              )}
            </div>

            {/* Footer View All CTA */}
            <div className="dash-card-footer">
              <button
                className="dash-footer-cta-btn"
                onClick={() => navigate('/dashboard/my-reports')}
              >
                <span>View Full Incident Queue ({dedupedAlerts.length})</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </section>

          {/* ─── SAFE SHELTERS DIRECTORY CARD ─── */}
          <section className="dash-card dash-shelters-module">
            <div className="dash-card-header">
              <div>
                <h2 className="dash-card-heading">
                  <Home size={17} className="text-emerald-500" />
                  <span>Safe Shelters</span>
                </h2>
                <p className="dash-card-subheading">{openSheltersCount} of {MOCK_SHELTERS.length} Ready</p>
              </div>

              <button
                className="dash-btn dash-btn--xs dash-btn--ghost"
                onClick={() => navigate('/dashboard/resources')}
              >
                <span>Directory</span>
                <ChevronRight size={12} />
              </button>
            </div>

            <div className="dash-shelters-body">
              {MOCK_SHELTERS.map((s, idx) => {
                const isFull = s.status === 'full'
                const occupancyPercent = Math.min(Math.round((s.capacity / s.maxCapacity) * 100), 100)

                return (
                  <div key={s.id || idx} className="dash-shelter-row">
                    <div className="dash-shelter-row-top">
                      <div className={`dash-shelter-icon-box ${isFull ? 'dash-shelter-icon-box--full' : ''}`}>
                        <Home size={15} />
                      </div>
                      <div className="dash-shelter-title-box">
                        <h4 className="dash-shelter-name">{s.name}</h4>
                        <p className="dash-shelter-address">{s.address}</p>
                      </div>
                      <span className={`dash-shelter-status-tag ${isFull ? 'dash-shelter-status-tag--full' : 'dash-shelter-status-tag--open'}`}>
                        {isFull ? 'AT CAPACITY' : 'OPEN'}
                      </span>
                    </div>

                    {/* Live Capacity Meter */}
                    <div className="dash-shelter-meter-wrap">
                      <div className="dash-shelter-meter-labels">
                        <span>Capacity Occupancy</span>
                        <span className={isFull ? 'text-danger font-bold' : 'text-success font-bold'}>
                          {s.capacity} / {s.maxCapacity} Beds ({occupancyPercent}%)
                        </span>
                      </div>
                      <div className="dash-shelter-progress-bar">
                        <div
                          className={`dash-shelter-progress-fill ${isFull ? 'dash-shelter-progress-fill--full' : occupancyPercent > 80 ? 'dash-shelter-progress-fill--warn' : ''}`}
                          style={{ width: `${occupancyPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

        </aside>
      </main>

      {/* ─── EMERGENCY PREPAREDNESS & HELPLINE QUICK-ACCESS STRIP ─── */}
      <footer className="dash-emergency-strip">
        <div className="dash-emergency-strip-left">
          <div className="dash-emergency-strip-badge">
            <PhoneCall size={14} className="text-red-400" />
            <span>EMERGENCY HOTLINE</span>
          </div>
          <div className="dash-emergency-hotline-nums">
            <strong>Riverdale Central Dispatch: 911</strong>
            <span className="dash-emergency-sep">·</span>
            <span>Civic Emergency: (555) 019-2831</span>
          </div>
        </div>

        <div className="dash-emergency-shortcuts">
          <button
            className="dash-emergency-btn"
            onClick={() => navigate('/dashboard/resources/flood-checklist')}
          >
            <CheckSquare size={14} />
            <span>Flood Checklist</span>
          </button>
          <button
            className="dash-emergency-btn"
            onClick={() => navigate('/dashboard/resources/emergency-kit')}
          >
            <Package size={14} />
            <span>Emergency Kit</span>
          </button>
          <button
            className="dash-emergency-btn"
            onClick={() => navigate('/dashboard/resources/confidence-scores')}
          >
            <Shield size={14} />
            <span>Sensor Integrity</span>
          </button>
        </div>
      </footer>

    </div>
  )
}