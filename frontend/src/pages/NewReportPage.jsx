import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './NewReportPage.css'

const HAZARD_TYPES = [
  { id: 'flood',          label: 'Flood',          icon: '💧' },
  { id: 'fire',           label: 'Fire',           icon: '🔥' },
  { id: 'seismic',        label: 'Seismic',        icon: '📳' },
  { id: 'infrastructure', label: 'Infrastructure', icon: '🏗' },
  { id: 'weather',        label: 'Weather',        icon: '🌩' },
  { id: 'other',          label: 'More',           icon: '···' },
]

const SEVERITY = [
  { id: 'low',      label: 'Low',      icon: '○' },
  { id: 'moderate', label: 'Moderate', icon: '⊖' },
  { id: 'high',     label: 'High',     icon: '⊕' },
]

export default function NewReportPage() {
  const navigate = useNavigate()
  const fileRef  = useRef()
  const [photo,    setPhoto]    = useState(null)
  const [hazard,   setHazard]   = useState('flood')
  const [severity, setSeverity] = useState(null)
  const [desc,     setDesc]     = useState('')

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    setPhoto(URL.createObjectURL(file))
  }

  function handleSubmit() {
    navigate('/dashboard/report/context', {
      state: { photo, hazardType: hazard, severity, description: desc },
    })
  }

  // ── Shared form panels (used in both layouts) ──────────────────

  const ViewfinderPanel = (
    <div
      className="nr-viewfinder"
      onClick={() => !photo && fileRef.current?.click()}
    >
      {photo ? (
        <>
          <img src={photo} alt="Captured hazard" className="nr-photo" />
          <button
            className="nr-photo-clear"
            onClick={(e) => { e.stopPropagation(); setPhoto(null) }}
            aria-label="Remove photo"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </>
      ) : (
        <div className="nr-finder-inner">
          <div className="nr-crosshair">
            <span className="nr-ch-corner nr-ch-tl" />
            <span className="nr-ch-corner nr-ch-tr" />
            <span className="nr-ch-corner nr-ch-bl" />
            <span className="nr-ch-corner nr-ch-br" />
            <div className="nr-ch-plus"><span /><span /></div>
          </div>
        </div>
      )}

      <div className="nr-finder-controls">
        <button
          className="nr-ctrl-btn"
          onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
          aria-label="Gallery"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        </button>

        <button
          className="nr-shutter"
          onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
          aria-label="Upload / capture photo"
        >
          <span className="nr-shutter-ring" />
        </button>

        <button
          className="nr-ctrl-btn"
          onClick={(e) => { e.stopPropagation(); photo && setPhoto(null) }}
          aria-label="Reset"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v6h6M23 20v-6h-6" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
          </svg>
        </button>
      </div>
    </div>
  )

  const LocationBar = (
    <div className="nr-location">
      <svg className="nr-loc-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
      <span className="nr-loc-name">Riverdale Heights</span>
      <span className="nr-loc-acc">· ±12 m</span>
    </div>
  )

  const HazardSection = (
    <div className="nr-section">
      <p className="nr-section-label">Hazard type</p>
      <div className="nr-chip-track-wrap">
        <div className="nr-chip-track">
          {HAZARD_TYPES.map((h) => (
            <button
              key={h.id}
              className={`nr-chip ${hazard === h.id ? 'nr-chip--active' : ''}`}
              onClick={() => setHazard(h.id)}
            >
              <span className="nr-chip-icon" aria-hidden="true">{h.icon}</span>
              {h.label}
            </button>
          ))}
          <button className="nr-chip-arrow" aria-label="More hazard types">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )

  const SeveritySection = (
    <div className="nr-section">
      <p className="nr-section-label">
        Severity <span className="nr-section-hint">(your estimate)</span>
      </p>
      <div className="nr-sev-row">
        {SEVERITY.map((s) => (
          <button
            key={s.id}
            className={`nr-sev-btn ${severity === s.id ? 'nr-sev-btn--active' : ''}`}
            onClick={() => setSeverity(s.id)}
          >
            <span className="nr-sev-icon" aria-hidden="true">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )

  const DescSection = (
    <div className="nr-section">
      <p className="nr-section-label">
        What are you seeing? <span className="nr-section-hint">(optional)</span>
      </p>
      <textarea
        className="nr-textarea"
        placeholder="Brief description of the hazard..."
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        rows={4}
      />
    </div>
  )

  const SubmitBtn = (
    <button className="nr-submit" onClick={handleSubmit}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
        <line x1="4" y1="22" x2="4" y2="15"/>
      </svg>
      Submit Report
    </button>
  )

  return (
    <div className="nr-shell">

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {/* ── Mobile header (hidden on desktop via CSS) ── */}
      <header className="nr-header nr-mobile-only">
        <button className="nr-back" onClick={() => navigate(-1)} aria-label="Go back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <h1 className="nr-title">New Report</h1>
      </header>

      {/* ── Desktop page title (hidden on mobile) ── */}
      <div className="nr-desktop-header nr-desktop-only">
        <div>
          <h1 className="nr-desktop-title">New Hazard Report</h1>
          <p className="nr-desktop-sub">Capture a photo and fill in the details to submit a new report.</p>
        </div>
      </div>

      {/* ── DESKTOP: two-column grid ── */}
      <div className="nr-desktop-grid nr-desktop-only">

        {/* Left col — camera */}
        <div className="nr-desktop-left">
          {ViewfinderPanel}
          {LocationBar}
        </div>

        {/* Right col — form */}
        <div className="nr-desktop-right">
          {HazardSection}
          {SeveritySection}
          {DescSection}
          {SubmitBtn}
        </div>
      </div>

      {/* ── MOBILE: single-column stack ── */}
      <div className="nr-body nr-mobile-only">
        {ViewfinderPanel}
        {LocationBar}
        {HazardSection}
        {SeveritySection}
        {DescSection}
        {SubmitBtn}
        <div className="nr-home-indicator" />
      </div>

    </div>
  )
}
