import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Zap, MapPin, Eye, Wrench, Bell, ArrowRight,
  CheckCircle, ChevronRight, Lock, Users, Sun, Moon,
  Mountain, Wind, Flame, Waves, AlertTriangle, CloudRain,
  Cpu, Layers, Video, Droplets, Navigation
} from 'lucide-react'
import Map, { Marker } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useTheme } from '../context/ThemeContext'
import './LandingPage.css'

/* ── Brand logo SVG ── */
function ShieldLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path d="M32 4 L56 14 L56 36 C56 50 44 60 32 63 C20 60 8 50 8 36 L8 14 Z"
        fill="hsl(220,60%,22%)" stroke="hsl(35,95%,55%)" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M32 9 L52 18 L52 36 C52 48 42 57 32 60 C22 57 12 48 12 36 L12 18 Z"
        fill="hsl(220,55%,18%)" stroke="none"/>
      <path d="M32 24 L42 42 H22 Z" fill="none" stroke="hsl(35,95%,55%)" strokeWidth="2.5" strokeLinejoin="round"/>
      <circle cx="32" cy="38" r="2.2" fill="hsl(35,95%,55%)"/>
      <rect x="30.8" y="28" width="2.4" height="7" rx="1.2" fill="hsl(35,95%,55%)"/>
    </svg>
  )
}

const DEFAULT_CENTER = { lat: 20.2960, lng: 85.8280 }

/* ── Device Storage Caching Helper for 0ms Load Time ── */
const getInitialLocation = () => {
  try {
    const cached = localStorage.getItem('hl_cached_user_loc')
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed.lat && parsed.lng) return parsed
    }
  } catch (e) {}
  return DEFAULT_CENTER
}

/* ── Theme-Aware Map Style (MapTiler Raster Tiles using API Key) ── */
const getLandingMapStyle = (theme = 'dark') => {
  const key = import.meta.env.VITE_MAPTILER_KEY || '8oJS7UaNGu6yuoJGxY7P'
  const styleTile = theme === 'light' ? 'streets-v2' : 'streets-v2-dark'
  const tileUrl = `https://api.maptiler.com/maps/${styleTile}/256/{z}/{x}/{y}@2x.png?key=${key}`

  return {
    version: 8,
    sources: {
      'base-tiles': {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        maxzoom: 20
      }
    },
    layers: [
      {
        id: 'base-tile-layer',
        type: 'raster',
        source: 'base-tiles',
        minzoom: 0,
        maxzoom: 20
      }
    ]
  }
}

/* ── Dynamically Cluster Hazards Around User's Live Location (Spaced Wide & Clear) ── */
const getHazardsAroundLocation = (center) => {
  const baseLat = center?.lat || DEFAULT_CENTER.lat
  const baseLng = center?.lng || DEFAULT_CENTER.lng

  return [
    { id: 'landslide', title: 'LANDSLIDE', zone: 'Zone 07', status: 'Watch', color: '#f59e0b', lat: baseLat + 0.0160, lng: baseLng - 0.0190, icon: Mountain },
    { id: 'fire', title: 'FIRE', zone: 'Zone 11', status: 'Active', color: '#ef4444', lat: baseLat + 0.0240, lng: baseLng - 0.0030, icon: Flame },
    { id: 'cyclone', title: 'CYCLONE', zone: 'Zone 03', status: 'Watch', color: '#a855f7', lat: baseLat + 0.0210, lng: baseLng + 0.0200, icon: Wind },
    { id: 'flood', title: 'FLOOD', zone: 'Zone 04', status: 'Monitoring', color: '#3b82f6', lat: baseLat - 0.0090, lng: baseLng - 0.0240, icon: Waves },
    { id: 'pothole', title: 'POTHOLE', zone: 'Zone 02', status: 'Reported', color: '#22c55e', lat: baseLat - 0.0160, lng: baseLng - 0.0080, icon: AlertTriangle },
    { id: 'heavyrain', title: 'HEAVY RAIN', zone: 'Zone 09', status: 'Watch', color: '#0284c7', lat: baseLat - 0.0200, lng: baseLng + 0.0180, icon: CloudRain }
  ]
}

function LandingMap({ theme }) {
  const mapRef = useRef(null)
  const initialLoc = useMemo(() => getInitialLocation(), [])
  const [currentCenter, setCurrentCenter] = useState(initialLoc)
  const [userLoc, setUserLoc] = useState(() => {
    return initialLoc !== DEFAULT_CENTER ? initialLoc : null
  })

  const mapStyle = useMemo(() => getLandingMapStyle(theme), [theme])
  const hazards = useMemo(() => getHazardsAroundLocation(currentCenter), [currentCenter])

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords
          const newLoc = { lat: latitude, lng: longitude }
          setUserLoc(newLoc)
          setCurrentCenter(newLoc)
          try {
            localStorage.setItem('hl_cached_user_loc', JSON.stringify(newLoc))
          } catch (e) {}

          if (mapRef.current) {
            mapRef.current.flyTo({
              center: [longitude, latitude],
              zoom: 13.5,
              pitch: 52,
              bearing: -15,
              duration: 1200
            })
          }
        },
        (err) => console.log('Geolocation note:', err.message),
        { timeout: 5000, maximumAge: 600000 }
      )
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.resize()
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [theme])

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: currentCenter.lng,
        latitude: currentCenter.lat,
        zoom: 13.5,
        pitch: 54,
        bearing: -18
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={mapStyle}
      attributionControl={false}
      fadeDuration={0}
      maxTileCacheSize={150}
      reuseMaps
    >
      {/* Live User Location Marker Prominently Centered */}
      {userLoc && (
        <Marker longitude={userLoc.lng} latitude={userLoc.lat} anchor="center">
          <div className="lp-user-live-marker">
            <div className="lp-user-live-badge">
              <Navigation size={11} /> LIVE UNIT
            </div>
            <div className="lp-user-live-ping" />
          </div>
        </Marker>
      )}
      {hazards.map(h => {
        const IconComponent = h.icon
        return (
          <Marker
            key={h.id}
            longitude={h.lng}
            latitude={h.lat}
            anchor="bottom"
          >
            <div className="lp-map-hazard-marker">
              <div
                className="lp-map-card"
                style={{
                  '--hazard-color': h.color,
                  '--hazard-glow': `${h.color}35`,
                  borderColor: `${h.color}70`
                }}
              >
                <div className="lp-map-card-icon" style={{ backgroundColor: `${h.color}25`, color: h.color }}>
                  <IconComponent size={16} />
                </div>
                <div className="lp-map-card-info">
                  <div className="lp-map-card-title">{h.title}</div>
                  <div className="lp-map-card-sub">
                    <span>{h.zone}</span>
                    <span className="lp-map-card-dot">•</span>
                    <span className="lp-map-card-status" style={{ color: h.color }}>{h.status}</span>
                  </div>
                </div>
              </div>
              <div className="lp-map-marker-stem" style={{ background: `linear-gradient(to bottom, ${h.color}, transparent)` }} />
              <div className="lp-map-marker-ground">
                <div className="lp-map-marker-dot" style={{ backgroundColor: h.color, boxShadow: `0 0 10px ${h.color}` }} />
                <div className="lp-map-marker-pulse" style={{ borderColor: h.color }} />
              </div>
            </div>
          </Marker>
        )
      })}
    </Map>
  )
}

function EvidencePanel() {
  return (
    <div className="lp-evidence-panel">
      <div className="lp-evidence-header">
        <span className="lp-evidence-title">EVIDENCE AGREEMENT</span>
      </div>

      <div className="lp-evidence-list">
        <div className="lp-evidence-row">
          <span className="lp-evidence-name"><Video size={13} /> CCTV Feed</span>
          <span className="lp-evidence-status lp-evidence-status--strong">Strong</span>
        </div>
        <div className="lp-evidence-row">
          <span className="lp-evidence-name"><Droplets size={13} /> River Level Sensor</span>
          <span className="lp-evidence-status lp-evidence-status--strong">Strong</span>
        </div>
        <div className="lp-evidence-row">
          <span className="lp-evidence-name"><CloudRain size={13} /> Rainfall Sensor</span>
          <span className="lp-evidence-status lp-evidence-status--strong">Strong</span>
        </div>
        <div className="lp-evidence-row">
          <span className="lp-evidence-name"><AlertTriangle size={13} /> Weather Data</span>
          <span className="lp-evidence-status lp-evidence-status--moderate">Moderate</span>
        </div>
        <div className="lp-evidence-row">
          <span className="lp-evidence-name"><Users size={13} /> Citizen Reports</span>
          <span className="lp-evidence-status lp-evidence-status--moderate">Moderate</span>
        </div>
        <div className="lp-evidence-row">
          <span className="lp-evidence-name"><MapPin size={13} /> Satellite Imagery</span>
          <span className="lp-evidence-status lp-evidence-status--strong">Active</span>
        </div>
      </div>

      <div className="lp-evidence-divider" />

      <div className="lp-evidence-score-section">
        <div className="lp-evidence-score-label">AGREEMENT SCORE</div>
        <div className="lp-evidence-score-val">94%</div>
        <div className="lp-evidence-bar">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className={`lp-evidence-bar-segment ${i < 9 ? 'active' : ''}`}
            />
          ))}
        </div>
      </div>

      <div className="lp-evidence-footer">
        <span className="lp-evidence-footer-lbl">LAST UPDATED</span>
        <span className="lp-evidence-footer-time">
          <span className="lp-live-pulse-dot" /> Today, 10:24 AM
        </span>
      </div>
    </div>
  )
}

const FEATURES = [
  {
    icon: <Zap size={22} />,
    color: 'hsl(42,95%,55%)',
    title: 'Real-Time Alerts',
    desc: 'Instant AI-analyzed hazard notifications the moment an incident is reported anywhere on-site.',
  },
  {
    icon: <MapPin size={22} />,
    color: 'hsl(215,80%,58%)',
    title: 'Location Intelligence',
    desc: 'Geo-tagged reports with interactive mapping for rapid on-ground identification and response.',
  },
  {
    icon: <Eye size={22} />,
    color: 'hsl(145,60%,45%)',
    title: 'Multi-Tier Verification',
    desc: 'Certified safety officers verify each report before escalation, filtering noise from real threats.',
  },
  {
    icon: <Wrench size={22} />,
    color: 'hsl(220,60%,55%)',
    title: 'Authorized Correction',
    desc: 'Assigned correctors document and close hazards with structured evidence trails and audit logs.',
  },
  {
    icon: <Bell size={22} />,
    color: 'hsl(280,65%,65%)',
    title: 'Smart Notifications',
    desc: 'Role-aware alerts ensure the right person gets the right information at exactly the right moment.',
  },
  {
    icon: <Shield size={22} />,
    color: 'hsl(5,75%,56%)',
    title: 'Full Audit Trail',
    desc: 'Immutable timeline of every report — from submission to verification to final resolution.',
  },
]

const STATS = [
  { value: '2,400+', label: 'Incidents Reported', icon: '📋' },
  { value: '98.2%',  label: 'Resolution Rate',    icon: '✅' },
  { value: '<12 min',label: 'Avg. Response Time', icon: '⚡' },
  { value: '4 Roles',label: 'Access Levels',      icon: '🛡️' },
]

const ROLES = [
  {
    role: 'Reporter',
    icon: '📋',
    color: 'hsl(42,95%,55%)',
    colorBg: 'hsla(42,95%,55%,0.1)',
    desc: 'Submit hazard reports with photos and geo-location directly from the field.',
    perms: ['Submit incident reports', 'View live alert feed', 'Track your reports'],
    cta: 'Start Reporting',
  },
  {
    role: 'Verifier',
    icon: '🔍',
    color: 'hsl(195,70%,52%)',
    colorBg: 'hsla(195,70%,52%,0.1)',
    desc: 'Review, assess, and officially verify submitted incident reports from the queue.',
    perms: ['All Reporter access', 'Verification queue', 'Status management'],
    cta: 'View Queue',
  },
  {
    role: 'Corrector',
    icon: '🛠️',
    color: 'hsl(145,60%,45%)',
    colorBg: 'hsla(145,60%,45%,0.1)',
    desc: 'Implement and document corrective actions for verified hazards with full evidence trails.',
    perms: ['All Verifier access', 'Authorized corrections', 'Resolution closure'],
    cta: 'Apply Corrections',
    featured: true,
  },
  {
    role: 'Admin',
    icon: '🛡️',
    color: 'hsl(280,65%,65%)',
    colorBg: 'hsla(280,65%,65%,0.1)',
    desc: 'Full platform oversight — manage users, audit reports, and configure system settings.',
    perms: ['Full platform access', 'User management', 'Analytics & exports'],
    cta: 'Admin Panel',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="lp">

      {/* ── Sticky Nav ── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-nav-logo">
            <ShieldLogo size={34} />
            <span className="lp-nav-brand">Hazard<span>Lens</span></span>
          </div>
          <div className="lp-nav-links">
            <a href="#features" className="lp-nav-link">Features</a>
            <a href="#roles" className="lp-nav-link">Roles</a>
            <a href="#stats" className="lp-nav-link">Platform</a>
          </div>
          <div className="lp-nav-actions">
            <button
              className="lp-theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button className="lp-btn-ghost" onClick={() => navigate('/login')}>Sign In</button>
            <button className="lp-btn-primary" onClick={() => navigate('/login')}>
              Get Started <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        {/* Background grid */}
        <div className="lp-hero-bg" aria-hidden="true" />

        {/* Full Bleed Right Side Map Layer with Vanishing Gradient Blur */}
        <div className="lp-hero-map-full">
          <LandingMap theme={theme} />
          <EvidencePanel />
        </div>

        <div className="lp-hero-inner">
          <div className="lp-hero-content">
            <div className="lp-hero-eyebrow">
              <span className="lp-live-dot" />
              Safety Intelligence Platform
            </div>

            <h1 className="lp-hero-title">
              See Every Hazard.<br />
              Act <em>Before</em> It<br />
              Escalates.
            </h1>

            <p className="lp-hero-desc">
              HazardLens empowers teams to report, verify, and resolve
              safety incidents in real time — with intelligent workflows built
              for workplaces, public spaces, and emergency operations.
            </p>

            <div className="lp-hero-ctas">
              <button className="lp-btn-primary lp-btn-lg" onClick={() => navigate('/login')}>
                Get Started Free <ArrowRight size={18} />
              </button>
              <button className="lp-btn-outline lp-btn-lg" onClick={() => navigate('/login')}>
                View Live Demo
              </button>
            </div>

            <div className="lp-hero-trust">
              <div className="lp-trust-item"><CheckCircle size={14} />No credit card required</div>
              <div className="lp-trust-item"><Lock size={14} />SOC 2 compliant</div>
              <div className="lp-trust-item"><Shield size={14} />Used in 12+ cities</div>
            </div>
          </div>

          <div className="lp-hero-spacer" />
        </div>

        {/* Evidence Fusion Pipeline Bar */}
        <div className="lp-hero-pipeline">
          <div className="lp-pipeline-step">
            <div className="lp-pipeline-icon"><Users size={18} /></div>
            <div className="lp-pipeline-text">
              <strong>Multiple Sources</strong>
              <span>CCTV, Sensors, Weather, Citizen Reports</span>
            </div>
          </div>
          <div className="lp-pipeline-arrow">→</div>
          <div className="lp-pipeline-step">
            <div className="lp-pipeline-icon"><Cpu size={18} /></div>
            <div className="lp-pipeline-text">
              <strong>Signal Extraction</strong>
              <span>Extracts insights from raw data</span>
            </div>
          </div>
          <div className="lp-pipeline-arrow">→</div>
          <div className="lp-pipeline-step">
            <div className="lp-pipeline-icon"><Layers size={18} /></div>
            <div className="lp-pipeline-text">
              <strong>Evidence Fusion</strong>
              <span>Verifies through multi-source agreement</span>
            </div>
          </div>
          <div className="lp-pipeline-arrow">→</div>
          <div className="lp-pipeline-step">
            <div className="lp-pipeline-icon"><Bell size={18} /></div>
            <div className="lp-pipeline-text">
              <strong>Alert & Action</strong>
              <span>Notifies teams & triggers response</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="lp-stats" id="stats">
        {STATS.map(s => (
          <div key={s.label} className="lp-stat">
            <span className="lp-stat-icon">{s.icon}</span>
            <span className="lp-stat-value">{s.value}</span>
            <span className="lp-stat-label">{s.label}</span>
          </div>
        ))}
      </section>

      {/* ── Features ── */}
      <section className="lp-features" id="features">
        <div className="lp-section-header">
          <div className="lp-section-badge"><Zap size={13} /> Platform Capabilities</div>
          <h2 className="lp-section-title">Built for Every Role in Safety Operations</h2>
          <p className="lp-section-sub">From field reporters to compliance admins, every workflow is purpose-built and role-aware.</p>
        </div>

        <div className="lp-features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="lp-feature-card">
              <div className="lp-feature-icon" style={{ background: `${f.color}18`, color: f.color }}>
                {f.icon}
              </div>
              <h3 className="lp-feature-title">{f.title}</h3>
              <p className="lp-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="lp-workflow">
        <div className="lp-workflow-inner">
          <div className="lp-section-header" style={{ textAlign: 'left', maxWidth: 480 }}>
            <div className="lp-section-badge"><ChevronRight size={13} /> How It Works</div>
            <h2 className="lp-section-title">From Report to Resolution in Minutes</h2>
            <p className="lp-section-sub">A structured four-stage pipeline ensures no hazard is missed and every action is logged.</p>
          </div>

          <div className="lp-steps">
            {[
              { n: '01', icon: '📋', label: 'Report', desc: 'Field workers submit geo-tagged hazard reports with photos via web or mobile.', color: 'hsl(42,95%,55%)' },
              { n: '02', icon: '🔍', label: 'Verify', desc: 'Certified verifiers review AI analysis and confirm or correct the severity rating.', color: 'hsl(195,70%,52%)' },
              { n: '03', icon: '🛠️', label: 'Correct', desc: 'Authorized correctors implement fixes and document evidence with audit trails.', color: 'hsl(145,60%,45%)' },
              { n: '04', icon: '✅', label: 'Resolve', desc: 'Reports are closed, stakeholders notified, and records preserved for compliance.', color: 'hsl(220,65%,58%)' },
            ].map((step, i) => (
              <div key={step.n} className="lp-step">
                <div className="lp-step-num" style={{ color: step.color, borderColor: `${step.color}40` }}>{step.n}</div>
                <div className="lp-step-icon">{step.icon}</div>
                <h4 className="lp-step-label" style={{ color: step.color }}>{step.label}</h4>
                <p className="lp-step-desc">{step.desc}</p>
                {i < 3 && <div className="lp-step-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ── */}
      <section className="lp-roles" id="roles">
        <div className="lp-section-header">
          <div className="lp-section-badge"><Users size={13} /> Access Control</div>
          <h2 className="lp-section-title">Four Roles, One Unified Platform</h2>
          <p className="lp-section-sub">Each role unlocks the tools and views relevant to their responsibilities. Sign in to get started.</p>
        </div>

        <div className="lp-roles-grid">
          {ROLES.map(r => (
            <div key={r.role} className={`lp-role-card ${r.featured ? 'lp-role-card--featured' : ''}`}>
              {r.featured && <div className="lp-role-featured-badge">Most Used</div>}
              <div className="lp-role-top">
                <div className="lp-role-icon" style={{ background: r.colorBg, color: r.color }}>{r.icon}</div>
                <span className="lp-role-name" style={{ color: r.color }}>{r.role}</span>
              </div>
              <p className="lp-role-desc">{r.desc}</p>
              <ul className="lp-role-perms">
                {r.perms.map(p => (
                  <li key={p}><span style={{ color: r.color }}>✓</span> {p}</li>
                ))}
              </ul>
              <button
                className="lp-role-cta"
                style={{ '--role-color': r.color, '--role-bg': r.colorBg }}
                onClick={() => navigate('/login')}
              >
                {r.cta} <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="lp-final-cta">
        <div className="lp-final-cta-inner">
          <ShieldLogo size={52} />
          <h2 className="lp-final-cta-title">Ready to Protect Your Team?</h2>
          <p className="lp-final-cta-sub">
            Join safety professionals across Riverdale and beyond using HazardLens every day to keep their communities safe.
          </p>
          <div className="lp-final-cta-btns">
            <button className="lp-btn-primary lp-btn-lg" onClick={() => navigate('/login')}>
              Start Reporting Now <ArrowRight size={18} />
            </button>
            <button className="lp-btn-ghost-light lp-btn-lg" onClick={() => navigate('/login')}>
              Sign In to Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <ShieldLogo size={28} />
            <span className="lp-footer-name">Hazard<span>Lens</span></span>
          </div>
          <div className="lp-footer-links">
            <a href="#features">Features</a>
            <a href="#roles">Roles</a>
            <a href="#stats">Platform</a>
          </div>
          <p className="lp-footer-copy">© 2026 HazardLens · Safety Intelligence Platform · Riverdale, WA</p>
        </div>
      </footer>

    </div>
  )
}
