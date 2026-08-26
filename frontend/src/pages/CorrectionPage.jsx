import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAlerts } from '../context/AlertsContext'
import './CorrectionPage.css'

const UPDATE_REASONS = [
  'Location inaccurate',
  'Severity misjudged',
  'Description incorrect',
  'Visual proof outdated',
  'Sensor mismatch'
]

const SEV_COLOR = {
  critical: 'hsl(5,75%,52%)',
  high:     'hsl(5,75%,52%)',
  medium:   'hsl(35,82%,52%)',
  low:      'hsl(145,60%,42%)',
}

export default function CorrectionPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { user }   = useAuth()
  const { alerts } = useAlerts()
  const fileRef    = useRef()

  const alert = alerts.find(a => a.id === id) || alerts[0]

  const [reason,    setReason]    = useState('Location inaccurate')
  const [notes,     setNotes]     = useState('')
  const [photo,     setPhoto]     = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [resolved,  setResolved]  = useState(false)

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    setPhoto(URL.createObjectURL(file))
  }

  async function handleSubmit() {
    setLoading(true)
    await new Promise(r => setTimeout(r, 900))
    setLoading(false)
    setSubmitted(true)
  }

  async function handleResolve() {
    setLoading(true)
    await new Promise(r => setTimeout(r, 700))
    setLoading(false)
    setResolved(true)
  }

  // ── Success screens ───────────────────────────────────────────
  if (submitted || resolved) {
    return (
      <div className="cp-shell">
        <div className="cp-success">
          <div className={`cp-success-icon ${resolved ? 'cp-success-icon--resolve' : ''}`}>
            {resolved ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
            )}
          </div>
          <h2 className="cp-success-title">
            {resolved ? 'Report Marked as Resolved' : 'Correction Submitted'}
          </h2>
          <p className="cp-success-body">
            {resolved
              ? `Report #HR-${id?.replace(/\D/g,'') ?? '24871'} has been marked resolved. No further correction needed.`
              : `Your correction for "${alert.title}" has been recorded and will be reviewed.`}
          </p>
          <div className="cp-success-actions">
            <button className="cp-btn-navy" onClick={() => navigate(`/dashboard/alert/${alert.id}`)}>
              View Report
            </button>
            <button className="cp-btn-outline" onClick={() => navigate('/dashboard')}>
              Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const confidence = 72
  const confColor = confidence >= 75 ? 'hsl(145,60%,38%)' : confidence >= 50 ? 'hsl(35,82%,48%)' : 'hsl(5,75%,50%)'

  return (
    <div className="cp-shell">

      {/* ── Authorized banner ── */}
      <div className="cp-banner">
        <div className="cp-banner-left">
          <div className="cp-banner-shield">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <p className="cp-banner-title">AUTHORIZED CORRECTION</p>
            <p className="cp-banner-sub">Only authorized personnel may submit corrections.</p>
          </div>
        </div>
        <div className="cp-banner-right">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span className="cp-banner-secure">Secure • Verified Access</span>
        </div>
      </div>

      <div className="cp-content">

        {/* ── Report summary card ── */}
        <div className="cp-report-card">
          <div className="cp-report-card-left">
            <div className="cp-report-id-row">
              <span className="cp-report-id">Hazard Report #HR-{id?.replace(/\D/g,'') ?? '24871'}</span>
              <span className="cp-status-pill">Correction in Progress</span>
            </div>
            <h1 className="cp-report-title">{alert.title}</h1>
            <div className="cp-report-meta">
              <div className="cp-meta-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>Reported: May 12, 2024 • 9:14 AM</span>
              </div>
              <div className="cp-meta-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>{alert.location}</span>
              </div>
              <div className="cp-meta-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span>Submitted by: {user?.name ?? 'Resident'}</span>
              </div>
            </div>
          </div>

          <div className="cp-report-card-right">
            <div className="cp-confidence-box">
              <p className="cp-confidence-label">AI Confidence Score</p>
              <p className="cp-confidence-pct" style={{ color: confColor }}>{confidence}%</p>
              <p className="cp-confidence-sub">Moderate confidence</p>
            </div>
            <div className="cp-evidence-box">
              <p className="cp-evidence-label">Evidence</p>
              <div className="cp-evidence-chips">
                {[
                  { label: 'Photo', icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  )},
                  { label: 'Location', icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                         stroke="hsl(145,60%,42%)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  )},
                  { label: 'Severity', icon: (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                         stroke="hsl(215,80%,55%)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                  )},
                ].map(e => (
                  <div key={e.label} className="cp-evidence-chip">
                    <div className="cp-evidence-chip-thumb">{e.icon}</div>
                    <span className="cp-evidence-chip-label">{e.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Side-by-side comparison ── */}
        <div className="cp-compare-section">
          <p className="cp-compare-intro">Review the original report and the proposed correction.</p>
          <div className="cp-compare-grid">

            {/* Original */}
            <div className="cp-compare-col cp-compare-col--original">
              <div className="cp-compare-col-header">Original Report</div>
              <div className="cp-compare-col-body">
                <div className="cp-compare-field">
                  <span className="cp-compare-field-label">Location</span>
                  <span className="cp-compare-field-val">3rd Ave &amp; Union St<br/>Seattle, WA 98101</span>
                </div>
                <div className="cp-compare-field">
                  <span className="cp-compare-field-label">Severity</span>
                  <span className="cp-compare-sev">
                    <span className="cp-sev-dot" style={{ background: 'hsl(5,75%,52%)' }} />
                    High
                  </span>
                </div>
                <div className="cp-compare-field">
                  <span className="cp-compare-field-label">Description</span>
                  <span className="cp-compare-field-val cp-compare-field-val--muted">
                    Large pothole in the right lane.<br/>Causing vehicles to swerve into traffic.
                  </span>
                </div>
                <div className="cp-compare-field">
                  <span className="cp-compare-field-label">Photo Evidence</span>
                  <div className="cp-compare-photo cp-compare-photo--placeholder">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="3"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="m21 15-5-5L5 21"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Proposed */}
            <div className="cp-compare-col cp-compare-col--proposed">
              <div className="cp-compare-col-header cp-compare-col-header--proposed">
                Proposed Correction
                <button className="cp-edit-icon" aria-label="Edit proposed correction">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>
                  </svg>
                </button>
              </div>
              <div className="cp-compare-col-body">
                <div className="cp-compare-field">
                  <span className="cp-compare-field-label">Location</span>
                  <span className="cp-compare-field-val">
                    <span className="cp-diff-dot" />
                    3rd Ave &amp; Union St (northbound lane)<br/>Seattle, WA 98101
                  </span>
                </div>
                <div className="cp-compare-field">
                  <span className="cp-compare-field-label">Severity</span>
                  <span className="cp-compare-sev">
                    <span className="cp-sev-dot" style={{ background: 'hsl(35,82%,52%)' }} />
                    Medium
                  </span>
                </div>
                <div className="cp-compare-field">
                  <span className="cp-compare-field-label">Description</span>
                  <span className="cp-compare-field-val cp-compare-field-val--muted">
                    Pothole in northbound lane near curb.<br/>Moderate size, not fully blocking lane.
                  </span>
                </div>
                <div className="cp-compare-field">
                  <span className="cp-compare-field-label">Photo Evidence</span>
                  <div className="cp-compare-photo cp-compare-photo--placeholder">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="3"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="m21 15-5-5L5 21"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── What needs updating ── */}
        <div className="cp-form-section">
          <div>
            <h2 className="cp-form-section-title">What needs updating?</h2>
            <p className="cp-form-section-sub">Select the primary reason for this correction.</p>
          </div>
          <div className="cp-select-wrap">
            <select
              className="cp-select"
              value={reason}
              onChange={e => setReason(e.target.value)}
            >
              {UPDATE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <span className="cp-select-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </span>
          </div>
        </div>

        {/* ── Reason for correction ── */}
        <div className="cp-form-section">
          <div className="cp-label-row">
            <label className="cp-field-label" htmlFor="cp-notes">Reason for correction</label>
            <span className="cp-required-badge">Required</span>
          </div>
          <textarea
            id="cp-notes"
            className="cp-textarea"
            rows={4}
            placeholder="Provide details about why the original report needs to be updated and the evidence supporting your correction."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* ── New photo evidence ── */}
        <div className="cp-form-section">
          <div className="cp-label-row">
            <label className="cp-field-label">New photo evidence (optional)</label>
            <span className="cp-optional-badge">Optional</span>
          </div>
          <div
            className="cp-upload-zone"
            onClick={() => fileRef.current?.click()}
          >
            {photo ? (
              <img src={photo} alt="New evidence" className="cp-upload-preview" />
            ) : (
              <>
                <div className="cp-upload-icon">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                <div>
                  <p className="cp-upload-main">Tap to take photo or upload new evidence.</p>
                  <p className="cp-upload-sub">JPG or PNG, max 10MB</p>
                </div>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={e => handleFile(e.target.files[0])}
          />
        </div>

        {/* ── Action buttons ── */}
        <div className="cp-actions">
          <button
            className="cp-btn-navy"
            disabled={loading || !notes.trim()}
            onClick={handleSubmit}
          >
            {loading ? (
              <span className="cp-spinner" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
            <div className="cp-btn-text">
              <span className="cp-btn-main">Submit Correction</span>
              <span className="cp-btn-sub">Save correction and update report</span>
            </div>
          </button>
          <button
            className="cp-btn-resolve"
            disabled={loading}
            onClick={handleResolve}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
              <line x1="4" y1="22" x2="4" y2="15"/>
            </svg>
            <div className="cp-btn-text">
              <span className="cp-btn-main">Flag as Resolved</span>
              <span className="cp-btn-sub">No correction needed; mark report resolved.</span>
            </div>
          </button>
        </div>

        {/* ── Audit footer ── */}
        <div className="cp-audit-footer">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span>
            This action is logged for audit and accountability.
            An email confirmation will be sent upon submission.
          </span>
        </div>

      </div>
    </div>
  )
}
