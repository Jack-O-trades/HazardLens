import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { HAZARD_TYPES } from '../data/mockData'
import './AddContextPage.css'

const MAX_NOTES = 500

const now = new Date('2025-05-18T09:27:00')
const TIME_STR = now.toLocaleDateString('en-US', {
  month: 'short', day: 'numeric', year: 'numeric',
}) + ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

export default function AddContextPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const fileRef   = useRef()
  const videoRef  = useRef()

  const passedPhoto   = location.state?.photo      ?? null
  const passedHazard  = location.state?.hazardType ?? 'flood'
  const passedSev     = location.state?.severity   ?? null
  const passedDesc    = location.state?.description ?? ''

  // photos array
  const [photos, setPhotos] = useState(passedPhoto ? [passedPhoto] : [])
  const [photoIdx, setPhotoIdx] = useState(0)

  // video (single short clip)
  const [video, setVideo] = useState(null) // { url, name } | null

  // form state
  const [hazardValue, setHazardValue] = useState(
    HAZARD_TYPES.some(h => h.value === passedHazard) ? passedHazard : ''
  )
  const [notes,      setNotes]      = useState(passedDesc)
  const [publicLoc,  setPublicLoc]  = useState(false)

  const hazardTag = HAZARD_TYPES.find(h => h.value === hazardValue)?.label ?? ''

  // blob: URLs created by this component, so we only revoke ones we own
  // (not the photo handed in via navigation state, which the previous
  // page may still need if the user navigates back).
  const createdUrls = useRef(new Set())

  useEffect(() => {
    return () => {
      createdUrls.current.forEach(url => URL.revokeObjectURL(url))
    }
  }, [])

  // ── helpers ──────────────────────────────────────────────────
  function addPhoto(file) {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    createdUrls.current.add(url)
    setPhotos(p => [...p, url])
    setPhotoIdx(photos.length)
  }

  function deletePhoto(idx) {
    setPhotos(prev => {
      const removed = prev[idx]
      if (removed && createdUrls.current.has(removed)) {
        URL.revokeObjectURL(removed)
        createdUrls.current.delete(removed)
      }
      return prev.filter((_, i) => i !== idx)
    })
    setPhotoIdx(prev => {
      if (idx < prev) return prev - 1
      if (idx === prev) return Math.max(0, prev - 1)
      return prev
    })
  }

  function addVideo(file) {
    if (!file || !file.type.startsWith('video/')) return
    if (video && createdUrls.current.has(video.url)) {
      URL.revokeObjectURL(video.url)
      createdUrls.current.delete(video.url)
    }
    const url = URL.createObjectURL(file)
    createdUrls.current.add(url)
    setVideo({ url, name: file.name })
  }

  function removeVideo() {
    setVideo(v => {
      if (v && createdUrls.current.has(v.url)) {
        URL.revokeObjectURL(v.url)
        createdUrls.current.delete(v.url)
      }
      return null
    })
  }

  function handleSubmit() {
    navigate('/dashboard/report/success', {
      state: { photos, video, hazardTag, notes, publicLoc },
    })
  }

  // ── derived ──────────────────────────────────────────────────
  const currentPhoto = photos[photoIdx] ?? null

  // ── sub-components ───────────────────────────────────────────

  const ProgressBar = (
    <div className="ac-progress-wrap">
      <span className="ac-progress-label">Step 2 of 3</span>
      <div className="ac-progress-track">
        <div className="ac-progress-fill" style={{ width: '66.6%' }} />
      </div>
    </div>
  )

  const PhotoSection = (
    <div className="ac-photo-section">
      {currentPhoto ? (
        <div className="ac-photo-viewer">
          <img src={currentPhoto} alt="Hazard evidence" className="ac-photo-img" />
          {/* counter */}
          <span className="ac-photo-counter">{photoIdx + 1} / {photos.length}</span>
          {/* action buttons */}
          <div className="ac-photo-actions">
            <button
              className="ac-photo-action-btn"
              onClick={() => fileRef.current?.click()}
              aria-label="Replace photo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button
              className="ac-photo-action-btn ac-photo-action-btn--danger"
              onClick={() => deletePhoto(photoIdx)}
              aria-label="Delete photo"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div
          className="ac-photo-empty"
          onClick={() => fileRef.current?.click()}
        >
          <div className="ac-photo-empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="m21 15-5-5L5 21"/>
            </svg>
          </div>
          <p className="ac-photo-empty-text">Tap to add a photo</p>
        </div>
      )}
    </div>
  )

  const LocationTimeCard = (
    <div className="ac-meta-card">
      <div className="ac-meta-col">
        <div className="ac-meta-icon-row">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span className="ac-meta-tag">LOCATION</span>
        </div>
        <p className="ac-meta-primary">123 River Rd, Greenville, SC</p>
        <p className="ac-meta-secondary">Approx. 0.2 mi from you</p>
      </div>
      <div className="ac-meta-divider" />
      <div className="ac-meta-col">
        <div className="ac-meta-icon-row">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span className="ac-meta-tag">TIME</span>
        </div>
        <p className="ac-meta-primary">{TIME_STR}</p>
      </div>
    </div>
  )

  const HazardSection = (
    <div className="ac-section">
      <p className="ac-section-label">HAZARD TYPE</p>
      {hazardValue ? (
        <div className="ac-hazard-tag">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
               className="ac-hazard-tag-icon">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <select
            className="ac-hazard-select"
            value={hazardValue}
            onChange={e => setHazardValue(e.target.value)}
            aria-label="Hazard type"
          >
            {HAZARD_TYPES.map(h => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
          <button
            className="ac-hazard-tag-close"
            onClick={() => setHazardValue('')}
            aria-label="Remove hazard tag"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="ac-hazard-add"
          onClick={() => setHazardValue(HAZARD_TYPES[0]?.value ?? '')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Select hazard type
        </button>
      )}
      <p className="ac-section-hint">This helps us route your report to the right team.</p>
    </div>
  )

  const NotesSection = (
    <div className="ac-section">
      <p className="ac-section-label">SHORT NOTES</p>
      <div className="ac-notes-wrap">
        <textarea
          className="ac-notes-textarea"
          placeholder="Describe what you're seeing…"
          value={notes}
          maxLength={MAX_NOTES}
          onChange={e => setNotes(e.target.value)}
          rows={5}
        />
        <span className="ac-notes-count">{notes.length} / {MAX_NOTES}</span>
      </div>
    </div>
  )

  const PrivacyToggle = (
    <div className="ac-privacy-row">
      <div className="ac-privacy-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <div className="ac-privacy-text">
        <p className="ac-privacy-title">Include my location publicly</p>
        <p className="ac-privacy-sub">
          {publicLoc
            ? 'Your location will be shown on public maps.'
            : 'Your location will not be shown on public maps.'}
        </p>
      </div>
      <button
        role="switch"
        aria-checked={publicLoc}
        className={`ac-toggle ${publicLoc ? 'ac-toggle--on' : ''}`}
        onClick={() => setPublicLoc(v => !v)}
        aria-label="Toggle public location"
      >
        <span className="ac-toggle-thumb" />
      </button>
    </div>
  )

  const EvidenceSection = (
    <div className="ac-section">
      <p className="ac-section-label">ADD MORE EVIDENCE</p>
      <p className="ac-section-hint" style={{ marginBottom: 12 }}>
        Photos or videos help provide more context.
      </p>
      <div className="ac-evidence-row">
        <button className="ac-evidence-card" onClick={() => fileRef.current?.click()}>
          <div className="ac-evidence-card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <div>
            <p className="ac-evidence-card-title">Add Photo</p>
            <p className="ac-evidence-card-sub">Take or choose a photo</p>
          </div>
        </button>
        <button className="ac-evidence-card" onClick={() => videoRef.current?.click()}>
          <div className="ac-evidence-card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </div>
          <div>
            <p className="ac-evidence-card-title">{video ? 'Replace Video' : 'Add Short Video'}</p>
            <p className="ac-evidence-card-sub">{video ? video.name : 'Record up to 30 seconds'}</p>
          </div>
        </button>
      </div>

      {video && (
        <div className="ac-video-chip">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
               className="ac-video-chip-icon">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
          <span className="ac-video-chip-name">{video.name}</span>
          <button
            className="ac-video-chip-close"
            onClick={removeVideo}
            aria-label="Remove video"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )

  const ActionButtons = (
    <div className="ac-actions">
      <button className="ac-submit-btn" onClick={handleSubmit}>
        Submit Report
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </button>
      <button className="ac-draft-btn">
        Save Draft
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    </div>
  )

  const BottomNav = (
    <nav className="ac-bottom-nav ac-mobile-only">
      {[
        { id: 'report', label: 'Report', active: true, icon: (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        )},
        { id: 'my-reports', label: 'My Reports', active: false, icon: (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        )},
        { id: 'resources', label: 'Resources', active: false, icon: (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        )},
      ].map(tab => (
        <button
          key={tab.id}
          className={`ac-nav-tab ${tab.active ? 'ac-nav-tab--active' : ''}`}
          onClick={() => tab.id === 'my-reports' && navigate('/dashboard/my-reports')}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )

  return (
    <div className="ac-shell">

      {/* Hidden inputs */}
      <input ref={fileRef} type="file" accept="image/*" className="sr-only"
             onChange={e => addPhoto(e.target.files[0])} />
      <input ref={videoRef} type="file" accept="video/*" className="sr-only"
             onChange={e => addVideo(e.target.files[0])} />

      {/* ── Mobile header ── */}
      <header className="ac-header ac-mobile-only">
        <button className="ac-back" onClick={() => navigate('/dashboard/report/new')} aria-label="Go back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <h1 className="ac-header-title">Report Incident</h1>
        <button className="ac-more-btn" aria-label="More options">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
          </svg>
        </button>
      </header>

      {/* ── Desktop page header ── */}
      <div className="ac-desktop-header ac-desktop-only">
        <div>
          <h1 className="ac-desktop-title">Report Incident</h1>
          <p className="ac-desktop-sub">Add context to help responders assess and act quickly.</p>
        </div>
      </div>

      {/* ── DESKTOP two-column layout ── */}
      <div className="ac-desktop-layout ac-desktop-only">
        {/* Left */}
        <div className="ac-desktop-left">
          {ProgressBar}
          {PhotoSection}
          {LocationTimeCard}
          {EvidenceSection}
        </div>
        {/* Right */}
        <div className="ac-desktop-right">
          {HazardSection}
          {NotesSection}
          {PrivacyToggle}
          {ActionButtons}
        </div>
      </div>

      {/* ── MOBILE single-column layout ── */}
      <div className="ac-mobile-body ac-mobile-only">
        {ProgressBar}
        {PhotoSection}
        {LocationTimeCard}
        {HazardSection}
        {NotesSection}
        {PrivacyToggle}
        {EvidenceSection}
        {ActionButtons}
        <div className="ac-home-indicator" />
      </div>

      {BottomNav}
    </div>
  )
}