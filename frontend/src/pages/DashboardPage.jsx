import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Layers, Filter, RefreshCw, Shield,
  Plus, Minus, Compass, Navigation,
  ExternalLink, AlertTriangle, ChevronDown, Wrench
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { MOCK_ALERTS, timeAgo } from '../data/mockData'
import './DashboardPage.css'

/* ─── Severity dot colour map — exact image colours ─── */
const SEV_DOT = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#64748b',
}

/* ─── Confidence bar colour ─── */
function confColor(pct) {
  if (pct >= 80) return '#ef4444'
  if (pct >= 65) return '#f97316'
  return '#64748b'
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
const MAP_MARKERS = [
  { id: 'm1', x: 37, y: 26, bg: '#3b82f6', count: 3, label: 'Weather',  icon: WeatherIcon  },
  { id: 'm2', x: 60, y: 37, bg: '#3b82f6', count: 4, label: 'Flood',    icon: FloodIcon    },
  { id: 'm3', x: 20, y: 48, bg: '#8b5cf6', count: 2, label: 'Seismic',  icon: SeismicIcon  },
  { id: 'm4', x: 42, y: 65, bg: '#f97316', count: 2, label: 'Fire',     icon: FireIcon     },
  { id: 'm5', x: 63, y: 62, bg: '#ef4444', count: 2, label: 'Fire',     icon: FireIcon     },
  { id: 'm6', x: 36, y: 82, bg: '#6b7280', count: 7, label: 'Reports',  icon: ReportsIcon  },
  { id: 'm7', x: 63, y: 82, bg: '#6b7280', count: 7, label: 'Reports',  icon: ReportsIcon  },
]

/* ─── Mock Map SVG — light terrain matching reference image ─── */
function MockMap({ activeMarker, onMarkerClick }) {
  return (
    <svg
      viewBox="0 0 800 620"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-label="Hazard incident map of Riverdale"
    >
      <defs>
        {/* Light warm terrain gradient */}
        <linearGradient id="terrainGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2ede3"/>
          <stop offset="100%" stopColor="#ebe5d8"/>
        </linearGradient>
        {/* River blue */}
        <linearGradient id="riverGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a5c8e1"/>
          <stop offset="100%" stopColor="#85b4d0"/>
        </linearGradient>
        <filter id="mapShadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.22"/>
        </filter>
        <filter id="markerGlow">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.35"/>
        </filter>
      </defs>

      {/* Base terrain — warm beige */}
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
          fill="#e6e0d2" opacity="0.45" rx="2"/>
      ))}

      {/* Major roads */}
      <line x1="0" y1="152" x2="800" y2="150" stroke="#cdc8bc" strokeWidth="14"/>
      <line x1="0" y1="152" x2="800" y2="150" stroke="#ffffff" strokeWidth="9"/>
      <line x1="0" y1="308" x2="800" y2="306" stroke="#cdc8bc" strokeWidth="14"/>
      <line x1="0" y1="308" x2="800" y2="306" stroke="#ffffff" strokeWidth="9"/>
      <line x1="0" y1="464" x2="800" y2="462" stroke="#cdc8bc" strokeWidth="14"/>
      <line x1="0" y1="464" x2="800" y2="462" stroke="#ffffff" strokeWidth="9"/>
      <line x1="200" y1="0" x2="200" y2="620" stroke="#cdc8bc" strokeWidth="14"/>
      <line x1="200" y1="0" x2="200" y2="620" stroke="#ffffff" strokeWidth="9"/>
      <line x1="440" y1="0" x2="440" y2="620" stroke="#cdc8bc" strokeWidth="14"/>
      <line x1="440" y1="0" x2="440" y2="620" stroke="#ffffff" strokeWidth="9"/>
      <line x1="645" y1="0" x2="645" y2="620" stroke="#cdc8bc" strokeWidth="14"/>
      <line x1="645" y1="0" x2="645" y2="620" stroke="#ffffff" strokeWidth="9"/>

      {/* Minor roads */}
      {[76, 114, 228, 268, 382, 420, 536, 574].map(y => (
        <line key={`hr-${y}`} x1="0" y1={y} x2="800" y2={y} stroke="#e4dfd4" strokeWidth="4" opacity="0.75"/>
      ))}
      {[100, 155, 320, 374, 520, 572, 720].map(x => (
        <line key={`vr-${x}`} x1={x} y1="0" x2={x} y2="620" stroke="#e4dfd4" strokeWidth="4" opacity="0.75"/>
      ))}

      {/* Park — vivid green */}
      <ellipse cx="475" cy="252" rx="98" ry="74" fill="#cce8c0"/>
      <ellipse cx="475" cy="252" rx="84" ry="60" fill="#b8dca8"/>
      <text x="475" y="256" textAnchor="middle" fill="#2e6b2e" fontSize="11"
        fontWeight="600" fontFamily="Inter, sans-serif" opacity="0.9">
        Riverview Park
      </text>
      {/* Small parks */}
      <ellipse cx="115" cy="520" rx="55" ry="38" fill="#cce8c0" opacity="0.7"/>
      <ellipse cx="710" cy="135" rx="45" ry="32" fill="#cce8c0" opacity="0.7"/>

      {/* Riverdale River — diagonal, matching image */}
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
        opacity="0.55"
      />
      {/* River label */}
      <text transform="rotate(-37, 495, 272)" x="495" y="272"
        textAnchor="middle" fill="#4e8ab0" fontSize="10.5"
        fontStyle="italic" fontFamily="Inter, sans-serif" opacity="0.9">
        Riverdale River
      </text>

      {/* District labels — matching image exactly */}
      {[
        { x: 100,  y: 72,  label: 'Pinecrest'         },
        { x: 318,  y: 72,  label: 'Pinecrest'         },
        { x: 540,  y: 72,  label: 'Northwood'         },
        { x: 100,  y: 232, label: 'Westgate'          },
        { x: 100,  y: 248, label: 'Heights'           },
        { x: 318,  y: 248, label: 'Riverdale'         },
        { x: 100,  y: 395, label: 'Oakridge'          },
        { x: 318,  y: 390, label: 'Southbank'         },
        { x: 540,  y: 390, label: 'Eastvale'          },
        { x: 100,  y: 540, label: 'Lakeside'          },
        { x: 540,  y: 538, label: 'Iwlint'            },
      ].map(d => (
        <text key={d.x + '-' + d.y} x={d.x} y={d.y} textAnchor="middle"
          fill="#5a5650" fontSize="12" fontWeight="700"
          fontFamily="Inter, sans-serif" opacity="0.82">
          {d.label}
        </text>
      ))}

      {/* Map markers */}
      {MAP_MARKERS.map(m => {
        const px = (m.x / 100) * 800
        const py = (m.y / 100) * 620
        const isActive = activeMarker === m.id
        const Icon = m.icon
        return (
          <g key={m.id} style={{ cursor: 'pointer' }} onClick={() => onMarkerClick(m.id)} filter="url(#markerGlow)">
            {isActive && (
              <circle cx={px} cy={py} r="32" fill={m.bg} opacity="0.18">
                <animate attributeName="r" from="28" to="44" dur="1.2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" from="0.3" to="0" dur="1.2s" repeatCount="indefinite"/>
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
        <rect x="0" y="0" width="138" height="20" rx="4" fill="white" opacity="0.88"/>
        <line x1="10" y1="12" x2="126" y2="12" stroke="#5a5650" strokeWidth="1.5"/>
        <line x1="10" y1="8" x2="10" y2="16" stroke="#5a5650" strokeWidth="1.5"/>
        <line x1="68" y1="10" x2="68" y2="14" stroke="#5a5650" strokeWidth="1"/>
        <line x1="126" y1="8" x2="126" y2="16" stroke="#5a5650" strokeWidth="1.5"/>
        <text x="10" y="9" fill="#5a5650" fontSize="8" fontFamily="Inter,sans-serif">0</text>
        <text x="60" y="9" fill="#5a5650" fontSize="8" fontFamily="Inter,sans-serif">1 km</text>
        <text x="114" y="9" fill="#5a5650" fontSize="8" fontFamily="Inter,sans-serif">2 km</text>
      </g>
    </svg>
  )
}

/* ─── Alert Card V2 — exact image match ─── */
function AlertCardV2({ alert, onClick, onCorrect, canCorrect }) {
  const dot = SEV_DOT[alert.severity] || '#9ca3af'
  const barColor = confColor(alert.confidence)

  const warnClass = alert.severity === 'critical' ? 'av2-warning--red'
    : alert.severity === 'high' ? 'av2-warning--orange'
    : 'av2-warning--info'

  return (
    <div className="av2-card" onClick={() => onClick(alert.id)} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick(alert.id)}>

      {/* Title row */}
      <div className="av2-title-row">
        <span className="av2-dot" style={{ background: dot }} />
        <span className="av2-title">{alert.title}</span>
        <div className="av2-action-btns" onClick={e => e.stopPropagation()}>
          {canCorrect && alert.status !== 'resolved' && (
            <button
              className="av2-correct-btn"
              onClick={() => onCorrect(alert.id)}
              title="Open Authorized Correction"
            >
              <Wrench size={10} /> Correct
            </button>
          )}
          <button className="av2-update-btn" onClick={() => onClick(alert.id)}>
            Update <ExternalLink size={11} />
          </button>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="av2-confidence-row">
        <span className="av2-conf-label">Confidence: {alert.confidence}%</span>
        <div className="av2-conf-bar-bg">
          <div className="av2-conf-bar-fill" style={{ width: `${alert.confidence}%`, background: barColor }} />
        </div>
      </div>

      {/* Affected areas */}
      <p className="av2-affected">
        <strong>Affected:</strong> {alert.affectedAreas.join(', ')}
      </p>

      {/* Source chips */}
      <div className="av2-chips">
        {alert.sources.map(s => (
          <span key={s} className="av2-chip">{s}</span>
        ))}
      </div>

      {/* Warning banner or info text */}
      {alert.warningText ? (
        <div className={`av2-warning ${warnClass}`}>
          <AlertTriangle size={12} style={{ flexShrink: 0 }} />
          {alert.warningText}
        </div>
      ) : alert.infoText ? (
        <p className="av2-info-text">{alert.infoText}</p>
      ) : null}
    </div>
  )
}

/* ─── Filter chips — matching reference image ─── */
const FILTER_CHIPS = ['All', 'Weather', 'River', 'Seismic', 'Fire', 'Infrastructure', 'Reports']
const SEV_FILTERS = ['All severities', 'Critical', 'High', 'Medium', 'Low']

/* ─── Main Dashboard ─── */
export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [activeChip, setActiveChip]         = useState('All')
  const [activeMarker, setActiveMarker]     = useState(null)
  const [sevFilter, setSevFilter]           = useState('All severities')
  const [showSevDrop, setShowSevDrop]       = useState(false)
  const [showLayersDrop, setShowLayersDrop] = useState(false)

  // Apply light theme + full-width layout while on dashboard
  useEffect(() => {
    document.documentElement.classList.add('hl-light')
    return () => document.documentElement.classList.remove('hl-light')
  }, [])

  /* Filter alerts by chip and severity */
  const activeAlerts = MOCK_ALERTS.filter(a => {
    if (a.status === 'resolved') return false
    const chipOk = activeChip === 'All'
      || (activeChip === 'Weather'        && a.type === 'weather')
      || (activeChip === 'River'          && a.type === 'river')
      || (activeChip === 'Seismic'        && a.type === 'seismic')
      || (activeChip === 'Fire'           && a.type === 'fire')
      || (activeChip === 'Infrastructure' && a.type === 'infrastructure')
      || (activeChip === 'Reports'        && a.status === 'pending')
    const sevOk = sevFilter === 'All severities' || a.severity === sevFilter.toLowerCase()
    return chipOk && sevOk
  })

  const sortedAlerts = [...activeAlerts].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 }
    return order[a.severity] - order[b.severity]
  })

  return (
    <div className="dash-v2" onClick={() => { setShowSevDrop(false); setShowLayersDrop(false) }}>

      {/* ── Filter bar ── */}
      <div className="dash-filterbar">
        {/* Layers dropdown */}
        <div className="dash-layers-wrap" onClick={e => e.stopPropagation()}>
          <button
            id="layers-btn"
            className={`dash-layers-btn ${showLayersDrop ? 'dash-layers-btn--open' : ''}`}
            onClick={() => setShowLayersDrop(v => !v)}
          >
            <Layers size={14} /> Layers <ChevronDown size={12} />
          </button>
          {showLayersDrop && (
            <div className="dash-layers-dropdown">
              {['Satellite', 'Street', 'Terrain', 'Heat Map', 'Risk Zones'].map(l => (
                <button key={l} className="dash-layer-option">{l}</button>
              ))}
            </div>
          )}
        </div>

        {/* Chips */}
        <div className="dash-chips">
          {FILTER_CHIPS.map(chip => (
            <button
              key={chip}
              id={`chip-${chip.toLowerCase()}`}
              className={`dash-chip ${activeChip === chip ? 'dash-chip--active' : ''}`}
              onClick={() => setActiveChip(chip)}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Filter icon */}
        <button className="dash-filter-icon-btn" aria-label="Advanced filter">
          <Filter size={14} />
        </button>
      </div>

      {/* ── Main split: map + alerts ── */}
      <div className="dash-main">

        {/* MAP PANEL */}
        <div className="dash-map-panel">
          {/* Location chip — top-left */}
          <div className="dash-map-location">
            <span className="dash-map-loc-name">Riverdale</span>
            <span className="dash-map-loc-sub">Midvale County ▾</span>
          </div>

          {/* Map SVG */}
          <div className="dash-map-svg-wrap">
            <MockMap
              activeMarker={activeMarker}
              onMarkerClick={id => setActiveMarker(prev => prev === id ? null : id)}
            />
          </div>

          {/* Map controls — bottom left */}
          <div className="dash-map-controls">
            <button className="dash-map-ctrl-btn" aria-label="Compass"><Compass size={16} /></button>
            <div className="dash-map-ctrl-divider" />
            <button className="dash-map-ctrl-btn" aria-label="Zoom in"><Plus size={16} /></button>
            <button className="dash-map-ctrl-btn" aria-label="Zoom out"><Minus size={16} /></button>
            <div className="dash-map-ctrl-divider" />
            <button className="dash-map-ctrl-btn" aria-label="My location"><Navigation size={16} /></button>
          </div>
        </div>

        {/* ALERTS PANEL */}
        <div className="dash-alerts-panel">
          {/* Alerts header */}
          <div className="dash-alerts-header">
            <h2 className="dash-alerts-title">
              Active Alerts
              <span className="dash-alerts-count">{sortedAlerts.length}</span>
            </h2>

            {/* Severity filter dropdown */}
            <div className="dash-sev-wrap" onClick={e => e.stopPropagation()}>
              <button
                id="sev-filter-btn"
                className="dash-sev-btn"
                onClick={() => setShowSevDrop(v => !v)}
              >
                Filter: {sevFilter} <ChevronDown size={12} />
              </button>
              {showSevDrop && (
                <div className="dash-sev-dropdown">
                  {SEV_FILTERS.map(s => (
                    <button
                      key={s}
                      className={`dash-sev-option ${sevFilter === s ? 'dash-sev-option--active' : ''}`}
                      onClick={() => { setSevFilter(s); setShowSevDrop(false) }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Alert list */}
          <div className="dash-alerts-list">
            {sortedAlerts.length === 0 ? (
              <div className="dash-alerts-empty">
                <Shield size={32} />
                <p>No active alerts match your filters</p>
              </div>
            ) : (
              sortedAlerts.map(alert => (
                <AlertCardV2
                  key={alert.id}
                  alert={alert}
                  onClick={id => navigate(`/dashboard/alert/${id}`)}
                  onCorrect={id => navigate(`/dashboard/alert/${id}/correct`)}
                  canCorrect={user && (user.role === 'corrector' || user.role === 'admin')}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom status bar ── */}
      <div className="dash-statusbar">
        <div className="dash-statusbar-left">
          <span className="dash-status-text">
            Data updated: <strong>8 min ago</strong>
          </span>
          <button className="dash-status-refresh" aria-label="Refresh data">
            <RefreshCw size={13} />
          </button>
          <span className="dash-status-sep">•</span>
          <span className="dash-status-text">All times MDT</span>
          <span className="dash-status-sep">•</span>
          <span className="dash-status-text">
            Sources: City of Riverdale, USGS, NWS, ShakeMap, Local Sensors
          </span>
        </div>
        <div className="dash-statusbar-right">
          <Shield size={13} />
          <span className="dash-status-text">Information is monitored 24/7. Report hazards at 311.</span>
        </div>
      </div>
    </div>
  )
}
