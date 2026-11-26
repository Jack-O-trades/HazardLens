import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Check,
  WifiOff,
  Wifi,
  Copy,
  Info,
  ArrowRight,
  LayoutDashboard,
  PlusCircle,
  FileText,
  MapPin,
} from 'lucide-react'
import { useNetwork } from '../context/NetworkContext'
import './SubmissionSuccessPage.css'

function HeroScene({ savedOffline }) {
  return (
    <div className="ss-scene-wrap">
      <svg
        className="ss-scene-svg"
        viewBox="0 0 640 225"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={
          savedOffline
            ? 'Laptop and smartphone saving hazard report locally while offline'
            : 'Laptop and smartphone synced with cloud server'
        }
      >
        <defs>
          {/* Ambient glow gradients */}
          <radialGradient id="ssCloudAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={savedOffline ? '#f59e0b' : '#22c55e'} stopOpacity="0.34" />
            <stop offset="55%" stopColor={savedOffline ? '#ea580c' : '#16a34a'} stopOpacity="0.1" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="ssBadgeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={savedOffline ? '#f97316' : '#22c55e'} stopOpacity="0.45" />
            <stop offset="100%" stopColor={savedOffline ? '#f97316' : '#22c55e'} stopOpacity="0" />
          </radialGradient>

          {/* Wireframe & glass gradients */}
          <linearGradient id="ssDeviceStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#64748b" stopOpacity="0.55" />
            <stop offset="100%" stopColor={savedOffline ? '#f59e0b' : '#22c55e'} stopOpacity="0.7" />
          </linearGradient>

          <linearGradient id="ssScreenFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.92" />
          </linearGradient>

          <linearGradient id="ssCloudFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#1e293b" stopOpacity="0.75" />
          </linearGradient>

          <linearGradient id="ssAccentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={savedOffline ? '#fbbf24' : '#4ade80'} />
            <stop offset="100%" stopColor={savedOffline ? '#ea580c' : '#16a34a'} />
          </linearGradient>

          {/* Signal arc paths for animated particles */}
          <path id="ssArcLeft" d="M 218 88 Q 258 48 292 84" />
          <path id="ssArcLeftLow" d="M 222 108 Q 256 126 286 108" />
          <path id="ssArcRight" d="M 420 84 Q 382 48 348 84" />
          <path id="ssArcRightLow" d="M 416 106 Q 384 126 354 106" />
        </defs>

        {/* ── Designer Particle Dot-Wave Mesh Behind Devices ── */}
        <g className="ss-wave-mesh" opacity="0.5">
          <path
            d="M 18 148 Q 95 92 175 138 T 320 128 T 465 138 T 622 108"
            stroke="url(#ssDeviceStroke)"
            strokeWidth="1.1"
            strokeDasharray="2 6"
            strokeLinecap="round"
          />
          <path
            d="M 26 160 Q 105 110 185 150 T 325 142 T 470 150 T 614 122"
            stroke="url(#ssDeviceStroke)"
            strokeWidth="1"
            strokeDasharray="1.5 7"
            strokeLinecap="round"
            opacity="0.75"
          />
          <path
            d="M 36 172 Q 115 128 195 162 T 330 156 T 475 162 T 605 136"
            stroke={savedOffline ? '#f59e0b' : '#22c55e'}
            strokeWidth="0.9"
            strokeDasharray="1.5 8"
            strokeLinecap="round"
            opacity="0.45"
          />
        </g>

        {/* Ambient Star/Sparkle Dots */}
        <g className="ss-sparkles" fill="#cbd5e1">
          <circle cx="92" cy="46" r="1.4" opacity="0.5" />
          <circle cx="256" cy="36" r="1.8" fill={savedOffline ? '#fbbf24' : '#4ade80'} opacity="0.75" />
          <circle cx="388" cy="38" r="1.5" opacity="0.6" />
          <circle cx="534" cy="52" r="1.7" fill={savedOffline ? '#fbbf24' : '#4ade80'} opacity="0.65" />
          <circle cx="566" cy="148" r="1.3" opacity="0.45" />
          <circle cx="64" cy="128" r="1.3" opacity="0.4" />
        </g>

        {/* ── Center Cloud Aura & Radar Ripples ── */}
        <circle cx="320" cy="100" r="88" fill="url(#ssCloudAura)" />
        <circle className="ss-radar-ring ss-radar-ring--1" cx="320" cy="100" r="40" stroke={savedOffline ? '#f59e0b' : '#22c55e'} strokeWidth="1" />
        <circle className="ss-radar-ring ss-radar-ring--2" cx="320" cy="100" r="40" stroke={savedOffline ? '#f59e0b' : '#22c55e'} strokeWidth="1" />

        {/* ── Signal Connection Arcs & Traveling Particles ── */}
        <g>
          <use href="#ssArcLeft" stroke="url(#ssAccentGrad)" strokeWidth="1.4" strokeDasharray="3 5" className="ss-arc-flow" opacity="0.8" />
          <use href="#ssArcLeftLow" stroke="#64748b" strokeWidth="1.2" strokeDasharray="2 5" opacity="0.55" />
          <use href="#ssArcRight" stroke="url(#ssAccentGrad)" strokeWidth="1.4" strokeDasharray="3 5" className="ss-arc-flow" opacity="0.8" />
          <use href="#ssArcRightLow" stroke="#64748b" strokeWidth="1.2" strokeDasharray="2 5" opacity="0.55" />

          {/* Traveling data packets */}
          <circle r="2.6" fill={savedOffline ? '#fbbf24' : '#4ade80'}>
            <animateMotion dur="2.2s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1">
              <mpath href="#ssArcLeft" />
            </animateMotion>
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.8;1" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle r="2.6" fill={savedOffline ? '#fbbf24' : '#4ade80'}>
            <animateMotion dur="2.2s" begin="0.8s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1">
              <mpath href="#ssArcRight" />
            </animateMotion>
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.2;0.8;1" dur="2.2s" begin="0.8s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* ── LEFT: Isometric Wireframe Laptop ── */}
        <g className="ss-laptop-group">
          {/* Soft floor shadow */}
          <ellipse cx="164" cy="176" rx="58" ry="12" fill="#000000" opacity="0.32" />

          {/* Laptop Screen Lid */}
          <path
            d="M 110 62 L 186 38 C 190 37 194 39 194 43 L 194 106 L 110 132 Z"
            fill="url(#ssScreenFill)"
            stroke="url(#ssDeviceStroke)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Inner Screen Bezel */}
          <path
            d="M 116 67 L 188 44 L 188 102 L 116 125 Z"
            fill="#0b1120"
            fillOpacity="0.85"
            stroke="#475569"
            strokeWidth="0.9"
          />

          {/* Laptop Keyboard Base */}
          <path
            d="M 110 132 L 194 106 L 244 134 C 248 136 248 140 243 142 L 166 170 C 161 172 155 171 151 168 L 106 138 C 104 136 106 133 110 132 Z"
            fill="url(#ssScreenFill)"
            stroke="url(#ssDeviceStroke)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Keyboard key rows */}
          <g stroke="#64748b" strokeWidth="1" opacity="0.65" strokeLinecap="round">
            <line x1="128" y1="133" x2="188" y2="114" />
            <line x1="138" y1="140" x2="198" y2="120" />
            <line x1="149" y1="147" x2="209" y2="127" />
            {/* Trackpad */}
            <path d="M 176 146 L 198 138 L 210 146 L 188 154 Z" fill="none" stroke="#94a3b8" strokeWidth="0.9" />
          </g>

          {/* Screen Warning Triangle or Checkmark */}
          <g className="ss-screen-emblem">
            <circle cx="152" cy="85" r="22" fill="url(#ssBadgeGlow)" />
            {savedOffline ? (
              <>
                <path
                  d="M 152 67 L 169 96 L 135 96 Z"
                  fill={savedOffline ? 'rgba(245, 158, 11, 0.16)' : 'rgba(34, 197, 94, 0.16)'}
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <line x1="152" y1="77" x2="152" y2="86" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="152" cy="91" r="1.4" fill="#fbbf24" />
              </>
            ) : (
              <>
                <circle cx="152" cy="85" r="14" fill="rgba(34, 197, 94, 0.16)" stroke="#22c55e" strokeWidth="2" />
                <path d="M 146 85 L 150 89.5 L 159 80" stroke="#4ade80" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}
          </g>

          {/* Floating Alert / Sync Badge on Laptop Corner */}
          <g className="ss-float-badge">
            <circle cx="198" cy="54" r="17" fill="url(#ssBadgeGlow)" />
            <circle cx="198" cy="54" r="11" fill="url(#ssAccentGrad)" stroke="#0f172a" strokeWidth="1.5" />
            {savedOffline ? (
              <>
                <line x1="198" y1="48.5" x2="198" y2="55.5" stroke="#ffffff" strokeWidth="2.1" strokeLinecap="round" />
                <circle cx="198" cy="59" r="1.2" fill="#ffffff" />
              </>
            ) : (
              <path d="M 194 54 L 197 57 L 202.5 51" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </g>
        </g>

        {/* ── CENTER: Glass Cloud + Diagonal Slash ── */}
        <g className="ss-cloud-group">
          <path
            d="M 294 126 L 348 126 C 359 126 367 118 367 108 C 367 99 360 91 351 90 C 348 75 335 65 320 65 C 306 65 294 74 290 87 C 281 89 275 97 275 107 C 275 117 283 126 294 126 Z"
            fill="url(#ssCloudFill)"
            stroke="#94a3b8"
            strokeOpacity="0.65"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Inner glass highlight */}
          <path
            d="M 295 89 C 299 77 309 70 320 70 C 331 70 341 77 345 87"
            stroke="#e2e8f0"
            strokeOpacity="0.45"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          {savedOffline ? (
            <g className="ss-cloud-slash">
              {/* Background cutout for crisp diagonal slash */}
              <line x1="296" y1="130" x2="346" y2="62" stroke="#0b1120" strokeWidth="5.5" strokeLinecap="round" opacity="0.65" />
              <line x1="296" y1="130" x2="346" y2="62" stroke="url(#ssAccentGrad)" strokeWidth="2.8" strokeLinecap="round" />
            </g>
          ) : (
            <path d="M 309 99 L 317 107 L 333 90" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </g>

        {/* ── RIGHT: Isometric Wireframe Smartphone ── */}
        <g className="ss-phone-group">
          <ellipse cx="458" cy="176" rx="34" ry="8" fill="#000000" opacity="0.32" />

          {/* Phone Outer Body */}
          <path
            d="M 436 46 L 484 56 C 489 57 492 62 491 67 L 478 148 C 477 153 472 156 467 155 L 419 145 C 414 144 411 139 412 134 L 425 53 C 426 48 431 45 436 46 Z"
            fill="url(#ssScreenFill)"
            stroke="url(#ssDeviceStroke)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Phone Inner Screen */}
          <path
            d="M 438 52 L 481 61 C 484 62 485 65 485 68 L 473 142 C 472 145 469 147 466 146 L 423 137 C 420 136 419 133 419 130 L 431 56 C 432 53 435 51 438 52 Z"
            fill="#0b1120"
            fillOpacity="0.88"
            stroke="#475569"
            strokeWidth="0.9"
          />
          {/* Speaker notch */}
          <line x1="454" y1="57" x2="466" y2="59.5" stroke="#64748b" strokeWidth="1.4" strokeLinecap="round" />
          {/* Home bar */}
          <line x1="438" y1="138" x2="454" y2="141.5" stroke="#64748b" strokeWidth="1.4" strokeLinecap="round" />

          {/* Phone Warning Triangle or Checkmark */}
          <g className="ss-screen-emblem">
            <circle cx="452" cy="99" r="20" fill="url(#ssBadgeGlow)" />
            {savedOffline ? (
              <>
                <path
                  d="M 454 81 L 467 109 L 436 105 Z"
                  fill="rgba(245, 158, 11, 0.16)"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <line x1="453" y1="90" x2="452" y2="98" stroke="#fbbf24" strokeWidth="2.1" strokeLinecap="round" />
                <circle cx="451.5" cy="102.5" r="1.3" fill="#fbbf24" />
              </>
            ) : (
              <>
                <circle cx="452" cy="99" r="13" fill="rgba(34, 197, 94, 0.16)" stroke="#22c55e" strokeWidth="2" />
                <path d="M 446 99 L 450 103.5 L 458 94.5" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}
          </g>

          {/* Floating Alert / Sync Badge on Phone Corner */}
          <g className="ss-float-badge ss-float-badge--delay">
            <circle cx="490" cy="70" r="16" fill="url(#ssBadgeGlow)" />
            <circle cx="490" cy="70" r="10.5" fill="url(#ssAccentGrad)" stroke="#0f172a" strokeWidth="1.5" />
            {savedOffline ? (
              <>
                <line x1="490" y1="64.5" x2="490" y2="71.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                <circle cx="490" cy="75" r="1.2" fill="#ffffff" />
              </>
            ) : (
              <path d="M 486 70 L 489 73 L 494.5 67" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </g>
        </g>
      </svg>

      {/* Pill directly under the cloud */}
      <div className={`ss-status-pill ${savedOffline ? 'ss-status-pill--offline' : 'ss-status-pill--online'}`}>
        <span className="ss-pill-dot" aria-hidden="true" />
        <span>{savedOffline ? 'offline' : 'online · synced'}</span>
      </div>
    </div>
  )
}

export default function SubmissionSuccessPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isOnline } = useNetwork()
  const { idempotencyKey = null } = location.state || {}
  const [reportId] = useState(() => `RPT-${Math.floor(1000 + Math.random() * 9000)}`)
  const [offlineFallbackKey] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `offline-${Date.now().toString(36)}`
  )
  const [showContent, setShowContent] = useState(false)
  const [copied, setCopied] = useState(false)

  // Real-time network detection: switches immediately between Offline and Online UI
  const savedOffline = !isOnline
  const displayKey = savedOffline ? (idempotencyKey || offlineFallbackKey) : reportId

  // NOTE: persistence is handled by NewReportPage / AddContextPage before navigating here,
  // so this page is purely a confirmation & queue-status screen.
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 60)
    return () => clearTimeout(timer)
  }, [])

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(displayKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const el = document.createElement('textarea')
      el.value = displayKey
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } finally {
        document.body.removeChild(el)
      }
    }
  }

  return (
    <div className={`ss-page ${savedOffline ? 'ss-page--offline' : 'ss-page--online'}`}>
      {/* Subtle lightweight ambient backdrop */}
      <div className="ss-backdrop" aria-hidden="true">
        <div className="ss-glow" />
        <svg className="ss-bg-arcs" viewBox="0 0 1200 420" preserveAspectRatio="none">
          <path
            d="M -40 310 Q 280 120 600 205 T 1240 160"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeDasharray="5 7"
          />
          <path
            d="M 80 390 Q 420 260 780 310 T 1220 280"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 8"
            opacity="0.5"
          />
        </svg>
        <span className="ss-pin ss-pin--1"><MapPin size={15} /></span>
        <span className="ss-pin ss-pin--2"><MapPin size={13} /></span>
        <span className="ss-pin ss-pin--3"><MapPin size={15} /></span>
      </div>

      <div className={`ss-container ${showContent ? 'ss-container--visible' : ''}`}>
        {/* ── Designer Isometric SVG Scene ── */}
        <HeroScene savedOffline={savedOffline} />

        {/* ── Heading & Subtitle ── */}
        <header className="ss-header">
          <h1 className="ss-title">
            {savedOffline ? (
              <>
                Saved Offline <span className="ss-title-accent">(Pending Sync)</span>
              </>
            ) : (
              <>
                Report Submitted <span className="ss-title-accent ss-title-accent--online">(Confirmed)</span>
              </>
            )}
          </h1>
          <p className="ss-subtitle">
            {savedOffline
              ? "Your hazard report has been saved locally on this device and will automatically sync to the server once you're back online."
              : 'Your hazard report has been received and is now queued for safety team verification.'}
          </p>
        </header>

        {/* ── 3-Column Status & Queue Key Card ── */}
        <section className="ss-status-card" aria-label="Report Queue Status">
          <div className="ss-status-col ss-status-col--saved">
            <div className="ss-saved-ring">
              <Check size={20} strokeWidth={2.75} />
            </div>
            <div className="ss-status-meta">
              <span className="ss-status-heading">Report Saved</span>
              <span className="ss-status-sub">
                {savedOffline ? 'Stored in IndexedDB' : 'Server Confirmed'}
              </span>
            </div>
          </div>

          <div className="ss-col-divider" aria-hidden="true" />

          <div className="ss-status-col ss-status-col--key">
            <span className="ss-key-label">
              {savedOffline ? 'OFFLINE QUEUE KEY' : 'REPORT REFERENCE ID'}
            </span>
            <div className="ss-key-box">
              <code className="ss-key-code" title={displayKey}>{displayKey}</code>
              <button
                type="button"
                className={`ss-copy-btn ${copied ? 'ss-copy-btn--copied' : ''}`}
                onClick={handleCopyKey}
                aria-label="Copy queue key"
                title={copied ? 'Copied!' : 'Copy to clipboard'}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                <span className="ss-copy-label">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="ss-col-divider" aria-hidden="true" />

          <div className="ss-status-col ss-status-col--conn">
            <div className="ss-conn-icon-wrap">
              {savedOffline ? (
                <WifiOff size={20} className="ss-conn-icon ss-conn-icon--offline" />
              ) : (
                <Wifi size={20} className="ss-conn-icon ss-conn-icon--online" />
              )}
              <span className="ss-conn-dot" aria-hidden="true" />
            </div>
            <span className="ss-conn-text">
              {savedOffline
                ? 'Waiting for internet connection'
                : 'Live connection active'}
            </span>
          </div>
        </section>

        {/* ── Bottom Card: What Happens Next + Actions ── */}
        <section className="ss-next-card" aria-label="Next steps">
          <div className="ss-next-main">
            <div className="ss-next-heading">
              <Info size={16} className="ss-next-info-icon" />
              <h2>What happens next?</h2>
            </div>

            <ol className="ss-steps">
              <li className="ss-step">
                <span className="ss-step-num ss-step-num--active">1</span>
                <div className="ss-step-body">
                  <strong>{savedOffline ? 'Auto-Sync on Reconnect' : 'Verification Review'}</strong>
                  <p>
                    {savedOffline
                      ? "Your report will be uploaded as soon as you're back online."
                      : 'Safety officers verify your report details within 2–4 hours.'}
                  </p>
                </div>
              </li>

              <li className="ss-step-arrow" aria-hidden="true">
                <ArrowRight size={16} />
              </li>

              <li className="ss-step">
                <span className="ss-step-num">2</span>
                <div className="ss-step-body">
                  <strong>Response Assignment</strong>
                  <p>Authorities will review and assign the report.</p>
                </div>
              </li>

              <li className="ss-step-arrow" aria-hidden="true">
                <ArrowRight size={16} />
              </li>

              <li className="ss-step">
                <span className="ss-step-num">3</span>
                <div className="ss-step-body">
                  <strong>Track Progress</strong>
                  <p>You can check the status in your dashboard.</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="ss-next-actions">
            <button
              id="go-dashboard-btn"
              type="button"
              className="ss-btn-dashboard"
              onClick={() => navigate('/dashboard')}
            >
              <LayoutDashboard size={16} />
              <span>Back to Dashboard</span>
              <ArrowRight size={15} />
            </button>

            <div className="ss-secondary-actions">
              <button
                id="new-report-btn"
                type="button"
                className="ss-btn-sub"
                onClick={() => navigate('/dashboard/report/new')}
              >
                <PlusCircle size={14} />
                <span>Submit Another</span>
              </button>
              <button
                type="button"
                className="ss-btn-sub"
                onClick={() => navigate('/dashboard/my-reports')}
              >
                <FileText size={14} />
                <span>My Reports</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
