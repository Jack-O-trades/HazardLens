import { useNavigate } from 'react-router-dom'
import {
  Shield, Zap, MapPin, Eye, Wrench, Bell, ArrowRight,
  CheckCircle, ChevronRight, Lock, Users
} from 'lucide-react'
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

/* ── Animated map marker ── */
function MapDot({ x, y, color, delay = 0 }) {
  return (
    <div className="lp-map-dot" style={{ left: `${x}%`, top: `${y}%`, '--dot-color': color, '--dot-delay': `${delay}s` }}>
      <span className="lp-map-dot-ring" />
    </div>
  )
}

/* ── Live alert preview cards ── */
function AlertPreview() {
  return (
    <div className="lp-preview">
      {/* Header bar */}
      <div className="lp-preview-header">
        <div className="lp-preview-header-left">
          <ShieldLogo size={22} />
          <span className="lp-preview-app-name">HazardLens</span>
        </div>
        <div className="lp-preview-live">
          <span className="lp-live-dot" />
          Live
        </div>
      </div>

      {/* Active alerts counter */}
      <div className="lp-preview-summary">
        <div className="lp-preview-sum-item">
          <span className="lp-preview-sum-val" style={{ color: 'hsl(5,75%,56%)' }}>2</span>
          <span className="lp-preview-sum-lbl">Critical</span>
        </div>
        <div className="lp-preview-sum-divider" />
        <div className="lp-preview-sum-item">
          <span className="lp-preview-sum-val" style={{ color: 'hsl(22,90%,55%)' }}>5</span>
          <span className="lp-preview-sum-lbl">High</span>
        </div>
        <div className="lp-preview-sum-divider" />
        <div className="lp-preview-sum-item">
          <span className="lp-preview-sum-val" style={{ color: 'hsl(145,60%,45%)' }}>18</span>
          <span className="lp-preview-sum-lbl">Resolved</span>
        </div>
      </div>

      {/* Alert cards */}
      <div className="lp-preview-card lp-preview-card--critical">
        <div className="lp-preview-card-top">
          <span className="lp-preview-sev lp-preview-sev--critical">● Critical</span>
          <span className="lp-preview-pill">Pending</span>
        </div>
        <p className="lp-preview-card-title">Chemical Spill — Warehouse B</p>
        <p className="lp-preview-card-meta">📍 Rack 12, Aisle C · 13 min ago</p>
        <div className="lp-preview-card-bar">
          <span className="lp-preview-conf">AI Confidence: 91%</span>
          <div className="lp-preview-bar-bg"><div className="lp-preview-bar-fill" style={{ width: '91%', background: 'hsl(5,75%,52%)' }} /></div>
        </div>
      </div>

      <div className="lp-preview-card lp-preview-card--high">
        <div className="lp-preview-card-top">
          <span className="lp-preview-sev lp-preview-sev--high">● High</span>
          <span className="lp-preview-pill lp-preview-pill--verified">Verified</span>
        </div>
        <p className="lp-preview-card-title">Loose Scaffolding — Block C Roof</p>
        <p className="lp-preview-card-meta">📍 Level 5, North Wing · 1h ago</p>
        <div className="lp-preview-card-bar">
          <span className="lp-preview-conf">AI Confidence: 78%</span>
          <div className="lp-preview-bar-bg"><div className="lp-preview-bar-fill" style={{ width: '78%', background: 'hsl(35,82%,52%)' }} /></div>
        </div>
      </div>

      {/* Map preview */}
      <div className="lp-preview-map">
        <MapDot x={30} y={35} color="hsl(5,75%,56%)" delay={0} />
        <MapDot x={55} y={50} color="hsl(22,90%,55%)" delay={0.4} />
        <MapDot x={70} y={28} color="hsl(145,60%,45%)" delay={0.8} />
        <MapDot x={20} y={65} color="hsl(42,95%,55%)" delay={1.2} />
        <div className="lp-preview-map-label">Riverdale, WA — Active Monitoring</div>
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
              safety incidents in real time — with AI-powered workflows built
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
