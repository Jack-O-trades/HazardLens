import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { MOCK_ALERTS } from '../data/mockData'
import './CorrectionPage.css'

const CORRECTION_PRIORITIES = [
  'Immediate (< 1 hour)',
  'Urgent (< 4 hours)',
  'High (same day)',
  'Scheduled (within 1 week)',
]

const ACTION_TYPES = [
  'Physical removal',
  'Barrier / isolation',
  'Repair completed',
  'Replacement',
  'Cleanup / decontamination',
  'Signage installed',
  'Evacuation',
  'Regulatory notification',
  'Other',
]

const SEV_COLOR = {
  critical: 'hsl(5,75%,52%)',
  high:     'hsl(22,90%,55%)',
  medium:   'hsl(35,82%,52%)',
  low:      'hsl(145,60%,42%)',
}

export default function QueueCorrectionPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileRef  = useRef()

  const alert = MOCK_ALERTS.find(a => a.id === id) ?? MOCK_ALERTS[0]

  const [form, setForm] = useState({
    actionType: 'Physical removal',
    priority: 'Urgent (< 4 hours)',
    description: '',
    rootCause: '',
    preventionMeasures: '',
    outcome: '',
    followup: false,
  })
  const [photo,     setPhoto]     = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function setField(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    setPhoto(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 900))
    setLoading(false)
    setSubmitted(true)
  }

  // ── Success screen ────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="cp-shell">
        <div className="cp-success">
          <div className="cp-success-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
          </div>
          <h2 className="cp-success-title">Correction Recorded</h2>
          <p className="cp-success-body">
            The corrective action has been saved. Alert <strong>{alert.title}</strong> will be marked as Resolved.
          </p>
          <div className="cp-success-actions">
            <button className="cp-btn-navy" onClick={() => navigate('/dashboard/queue')}>
              Back to Queue
            </button>
            <button className="cp-btn-outline" onClick={() => navigate('/dashboard')}>
              Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const confidence = alert.confidence ?? 72
  const confColor = confidence >= 75 ? 'hsl(145,60%,38%)' : confidence >= 50 ? 'hsl(35,82%,48%)' : 'hsl(5,75%,50%)'
  const confLabel = confidence >= 75 ? 'High confidence' : confidence >= 50 ? 'Moderate confidence' : 'Low confidence'

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
              <span className="cp-report-id">
                Hazard Report #HR-{id?.replace(/\D/g,'') ?? alert.id}
              </span>
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
                <span>Reported: {new Date(alert.reportedAt).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                  hour: 'numeric', minute: '2-digit'
                })}</span>
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
                <span>Submitted by: {alert.reportedBy ?? user?.name ?? 'System'}</span>
              </div>
            </div>
          </div>

          <div className="cp-report-card-right">
            <div className="cp-confidence-box">
              <p className="cp-confidence-label">AI Confidence Score</p>
              <p className="cp-confidence-pct" style={{ color: confColor }}>{confidence}%</p>
              <p className="cp-confidence-sub">{confLabel}</p>
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

        {/* ── Alert description card ── */}
        <div className="cp-compare-section">
          <p className="cp-compare-intro">Review the original hazard report before submitting a corrective action.</p>
          <div className="cp-compare-grid">

            {/* Original Report */}
            <div className="cp-compare-col cp-compare-col--original">
              <div className="cp-compare-col-header">Original Report</div>
              <div className="cp-compare-col-body">
                <div className="cp-compare-field">
                  <span className="cp-compare-field-label">Location</span>
                  <span className="cp-compare-field-val">{alert.location}</span>
                </div>
                <div className="cp-compare-field">
                  <span className="cp-compare-field-label">Severity</span>
                  <span className="cp-compare-sev">
                    <span className="cp-sev-dot" style={{ background: SEV_COLOR[alert.severity] ?? 'hsl(35,82%,52%)' }} />
                    {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                  </span>
                </div>
                <div className="cp-compare-field">
                  <span className="cp-compare-field-label">Description</span>
                  <span className="cp-compare-field-val cp-compare-field-val--muted">{alert.description}</span>
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

            {/* Proposed Correction */}
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
                  <span className="cp-compare-field-label">Corrective Action</span>
                  <span className="cp-compare-field-val">
                    <span className="cp-diff-dot" />
                    {form.actionType || '—'}
                  </span>
                </div>
                <div className="cp-compare-field">
                  <span className="cp-compare-field-label">Priority</span>
                  <span className="cp-compare-sev">
                    <span className="cp-sev-dot" style={{ background: 'hsl(215,80%,54%)' }} />
                    {form.priority || '—'}
                  </span>
                </div>
                <div className="cp-compare-field">
                  <span className="cp-compare-field-label">Description</span>
                  <span className="cp-compare-field-val cp-compare-field-val--muted">
                    {form.description || 'Enter correction details below…'}
                  </span>
                </div>
                <div className="cp-compare-field">
                  <span className="cp-compare-field-label">Photo Evidence</span>
                  <div className="cp-compare-photo cp-compare-photo--placeholder">
                    {photo ? (
                      <img src={photo} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                           stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="3"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="m21 15-5-5L5 21"/>
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Corrective action type ── */}
        <form id="queue-correction-form" onSubmit={handleSubmit}>
          <div className="cp-form-section">
            <div>
              <h2 className="cp-form-section-title">What corrective action is being taken?</h2>
              <p className="cp-form-section-sub">Select the primary action type for this correction.</p>
            </div>
            <div className="cp-select-wrap">
              <select
                id="q-action-type"
                className="cp-select"
                value={form.actionType}
                onChange={e => setField('actionType', e.target.value)}
                required
              >
                {ACTION_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <span className="cp-select-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </span>
            </div>
          </div>

          {/* ── Response Priority ── */}
          <div className="cp-form-section">
            <div>
              <h2 className="cp-form-section-title">Response priority</h2>
              <p className="cp-form-section-sub">Select the urgency level for this corrective action.</p>
            </div>
            <div className="cp-select-wrap">
              <select
                id="q-priority"
                className="cp-select"
                value={form.priority}
                onChange={e => setField('priority', e.target.value)}
                required
              >
                {CORRECTION_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <span className="cp-select-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </span>
            </div>
          </div>

          {/* ── Correction Description ── */}
          <div className="cp-form-section">
            <div className="cp-label-row">
              <label className="cp-field-label" htmlFor="q-description">Correction description</label>
              <span className="cp-required-badge">Required</span>
            </div>
            <textarea
              id="q-description"
              className="cp-textarea"
              rows={3}
              placeholder="Describe the corrective action taken in detail…"
              value={form.description}
              onChange={e => setField('description', e.target.value)}
              required
            />
          </div>

          {/* ── Root Cause ── */}
          <div className="cp-form-section">
            <div className="cp-label-row">
              <label className="cp-field-label" htmlFor="q-root-cause">Root cause analysis</label>
              <span className="cp-required-badge">Required</span>
            </div>
            <textarea
              id="q-root-cause"
              className="cp-textarea"
              rows={3}
              placeholder="What caused this hazard? Include contributing factors…"
              value={form.rootCause}
              onChange={e => setField('rootCause', e.target.value)}
              required
            />
          </div>

          {/* ── Prevention Measures ── */}
          <div className="cp-form-section">
            <div className="cp-label-row">
              <label className="cp-field-label" htmlFor="q-prevention">Prevention measures</label>
              <span className="cp-required-badge">Required</span>
            </div>
            <textarea
              id="q-prevention"
              className="cp-textarea"
              rows={3}
              placeholder="What measures will prevent recurrence?…"
              value={form.preventionMeasures}
              onChange={e => setField('preventionMeasures', e.target.value)}
              required
            />
          </div>

          {/* ── Expected Outcome ── */}
          <div className="cp-form-section">
            <div className="cp-label-row">
              <label className="cp-field-label" htmlFor="q-outcome">Expected outcome</label>
              <span className="cp-optional-badge">Optional</span>
            </div>
            <textarea
              id="q-outcome"
              className="cp-textarea"
              rows={2}
              placeholder="Describe the expected resolution…"
              value={form.outcome}
              onChange={e => setField('outcome', e.target.value)}
            />
          </div>

          {/* ── Follow-up inspection ── */}
          <div className="cp-form-section" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <input
              type="checkbox"
              id="q-followup"
              checked={form.followup}
              onChange={e => setField('followup', e.target.checked)}
              style={{
                width: 18, height: 18, cursor: 'pointer', flexShrink: 0,
                accentColor: 'hsl(220,60%,22%)'
              }}
            />
            <label htmlFor="q-followup" className="cp-field-label" style={{ cursor: 'pointer', fontWeight: 500 }}>
              Follow-up inspection required
            </label>
          </div>

          {/* ── Photo evidence ── */}
          <div className="cp-form-section">
            <div className="cp-label-row">
              <label className="cp-field-label">Evidence photos or documents</label>
              <span className="cp-optional-badge">Optional</span>
            </div>
            <div
              className="cp-upload-zone"
              onClick={() => fileRef.current?.click()}
            >
              {photo ? (
                <img src={photo} alt="Evidence" className="cp-upload-preview" />
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
                    <p className="cp-upload-sub">PNG, JPG, PDF up to 20MB</p>
                  </div>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              className="sr-only"
              onChange={e => handleFile(e.target.files[0])}
            />
          </div>

          {/* ── Action buttons ── */}
          <div className="cp-actions">
            <button
              id="queue-correction-submit"
              type="submit"
              className="cp-btn-navy"
              disabled={loading || !form.description.trim() || !form.rootCause.trim() || !form.preventionMeasures.trim()}
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
                <span className="cp-btn-main">Submit &amp; Close Alert</span>
                <span className="cp-btn-sub">Save correction and mark alert resolved</span>
              </div>
            </button>
            <button
              type="button"
              className="cp-btn-resolve"
              disabled={loading}
              onClick={() => navigate(-1)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              <div className="cp-btn-text">
                <span className="cp-btn-main">Cancel</span>
                <span className="cp-btn-sub">Return without saving</span>
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
        </form>

      </div>
    </div>
  )
}
