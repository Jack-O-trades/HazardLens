import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  MapPin,
  Clock,
  User,
  Wrench,
  CheckCircle,
  ShieldAlert,
  Radio,
  Activity,
  Navigation,
  ExternalLink,
  AlertTriangle,
  Users,
  Camera,
  Check,
  X
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'
import { useAlerts } from '../context/AlertsContext'
import { SeverityBadge, StatusBadge } from '../components/shared/StatusBadge'
import { formatDate, timeAgo } from '../data/mockData'
import './AlertDetailPage.css'

const TYPE_ICONS = {
  river: '💧',
  fire: '🔥',
  seismic: '📳',
  weather: '🌩',
  infrastructure: '🏗',
  other: '⚠️',
}

const TYPE_LABELS = {
  river: 'River / Flood',
  fire: 'Fire Risk',
  seismic: 'Seismic Activity',
  weather: 'Weather Event',
  infrastructure: 'Infrastructure',
  other: 'Other Hazard',
}

const TIMELINE_COLORS = {
  report: {
    bg: 'hsla(35,95%,55%,0.15)',
    border: 'var(--accent)',
    icon: '📋',
  },
  system: {
    bg: 'hsla(220,15%,30%,0.2)',
    border: 'var(--border)',
    icon: '⚙️',
  },
  verify: {
    bg: 'hsla(195,70%,50%,0.15)',
    border: 'var(--sev-low)',
    icon: '🔍',
  },
  correct: {
    bg: 'hsla(145,60%,45%,0.15)',
    border: 'var(--sev-safe)',
    icon: '✅',
  },
}

const SEVERITY_CONFIG = {
  critical: { label: 'CRITICAL', description: 'Immediate attention required' },
  high:     { label: 'HIGH',     description: 'Urgent response recommended' },
  medium:   { label: 'MEDIUM',   description: 'Monitor and investigate' },
  low:      { label: 'LOW',      description: 'Low immediate risk' },
}

export default function AlertDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, caps } = useAuth()
  const { alerts, addEvidenceToAlert, submitCommunityVote } = useAlerts()

  const alert = alerts.find((a) => a.id === id)

  // Camera & Modal Evidence states
  const videoRef = useRef()
  const canvasRef = useRef()

  const [activeStream, setActiveStream] = useState(null)
  const [cameraError, setCameraError] = useState(null)
  const [showEvidenceForm, setShowEvidenceForm] = useState(false)
  const [evidencePhoto, setEvidencePhoto] = useState(null)
  const [evidenceNotes, setEvidenceNotes] = useState('')

  // Truth voting states
  const [showVoteForm, setShowVoteForm] = useState(false)
  const [voteType, setVoteType] = useState(null) // 'true' | 'false'
  const [voteNotes, setVoteNotes] = useState('')
  const [votePhoto, setVotePhoto] = useState(null)

  // GPS watermarking state
  const [coordinates, setCoordinates] = useState({ lat: 45.5234, lng: -122.6762, acc: 15 })

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoordinates({
            lat: parseFloat(pos.coords.latitude.toFixed(5)),
            lng: parseFloat(pos.coords.longitude.toFixed(5)),
            acc: Math.round(pos.coords.accuracy)
          })
        }
      )
    }
  }, [])

  // Stream toggles for uploader modules
  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setActiveStream(stream)
    } catch (err) {
      console.error(err)
      setCameraError('Camera access unavailable. Please grant camera permissions to capture live hazard evidence.')
    }
  }, [activeStream])

  const stopCamera = useCallback(() => {
    if (activeStream) {
      activeStream.getTracks().forEach(t => t.stop())
      setActiveStream(null)
    }
  }, [activeStream])

  useEffect(() => {
    if (showEvidenceForm && !evidencePhoto) {
      startCamera()
    } else if (showVoteForm && !votePhoto) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [showEvidenceForm, evidencePhoto, showVoteForm, votePhoto, startCamera, stopCamera])

  if (!alert) {
    return (
      <div className="alert-not-found animate-fade-in">
        <div className="not-found-icon">🔍</div>
        <h2>Alert Not Found</h2>
        <p>The alert you're looking for doesn't exist or may have been removed.</p>
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>
    )
  }

  const icon = TYPE_ICONS[alert.type] || '⚠️'
  const severity = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium
  const isResolved = alert.status === 'resolved'

  // Capture canvas logic
  const handleCapture = (isVoteCam = false) => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const w = video.videoWidth || 640
    const h = video.videoHeight || 480
    canvas.width = w
    canvas.height = h

    ctx.drawImage(video, 0, 0, w, h)

    // Burn Watermark
    const now = new Date()
    const text = `VERIFIED EVIDENCE | LAT: ${coordinates.lat}° | LNG: ${coordinates.lng}° | UTC: ${now.toISOString().replace('T', ' ').slice(0, 19)}`
    
    ctx.fillStyle = 'rgba(15,23,42,0.8)'
    ctx.fillRect(0, h - 30, w, 30)

    ctx.fillStyle = '#fff'
    ctx.font = '11px Courier New, monospace'
    ctx.fillText(text, 12, h - 10)

    const url = canvas.toDataURL('image/jpeg')
    if (isVoteCam) {
      setVotePhoto(url)
    } else {
      setEvidencePhoto(url)
    }
    stopCamera()
  }

  // Submissions
  const submitEvidence = () => {
    if (!evidencePhoto) return
    addEvidenceToAlert(alert.id, evidencePhoto, evidenceNotes, user?.name)
    setEvidencePhoto(null)
    setEvidenceNotes('')
    setShowEvidenceForm(false)
  }

  const submitVote = () => {
    const isTrue = voteType === 'true'
    if (!isTrue && !votePhoto) return // Enforce photo evidence for False flags

    submitCommunityVote(alert.id, isTrue, votePhoto, voteNotes, user?.name)
    setVotePhoto(null)
    setVoteNotes('')
    setShowVoteForm(false)
    setVoteType(null)
  }

  // CCTV Availability Logic
  const cctvSource = alert.integritySources?.find(s => s.type === 'cctv')
  const isCctvOffline = !cctvSource || cctvSource.status === 'offline'

  return (
    <div className="alert-detail animate-fade-in">
      <canvas ref={canvasRef} className="sr-only" />

      <div className="alert-detail-nav">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={15} /> Back to Dashboard
        </button>
        <div className="alert-id">ALERT #{alert.id}</div>
      </div>

      <section className={`alert-hero severity-${alert.severity}`}>
        <div className="alert-hero-main">
          <div className="alert-type-icon">
            <span role="img">{icon}</span>
          </div>
          <div className="alert-hero-content">
            <div className="alert-eyebrow">
              <ShieldAlert size={14} /> INCIDENT ALERT
            </div>
            <h1>{alert.title}</h1>
            <div className="alert-meta">
              <span className="alert-meta-item">
                <MapPin size={13} /> {alert.location}
              </span>
              <span className="alert-meta-divider">•</span>
              <span className="alert-meta-item">
                <Clock size={13} /> Reported {timeAgo(alert.reportedAt)}
              </span>
            </div>
            <div className="alert-badge-row">
              <SeverityBadge severity={alert.severity} />
              <StatusBadge status={alert.status} />
            </div>
          </div>
        </div>

        <div className="alert-hero-action">
          <div className="severity-summary">
            <span className="severity-summary-label">{severity.label}</span>
            <span className="severity-summary-description">{severity.description}</span>
          </div>
          {caps.canCorrect && !isResolved && (
            <button className="btn btn-primary correction-action" onClick={() => navigate(`/dashboard/alert/${alert.id}/correct`)}>
              <Wrench size={16} /> Apply Correction
            </button>
          )}
        </div>
      </section>

      {/* Quick stats grid */}
      <section className="alert-quick-stats">
        <div className="quick-stat">
          <div className="quick-stat-icon"><Activity size={17} /></div>
          <div>
            <span className="quick-stat-label">Severity</span>
            <strong>{alert.severity.toUpperCase()}</strong>
          </div>
        </div>
        <div className="quick-stat">
          <div className="quick-stat-icon"><Radio size={17} /></div>
          <div>
            <span className="quick-stat-label">Status</span>
            <strong>{alert.status}</strong>
          </div>
        </div>
        <div className="quick-stat">
          <div className="quick-stat-icon"><Users size={17} /></div>
          <div>
            <span className="quick-stat-label">Reported By</span>
            <strong>{alert.reportedBy}</strong>
          </div>
        </div>
        <div className="quick-stat">
          <div className="quick-stat-icon"><AlertTriangle size={17} /></div>
          <div>
            <span className="quick-stat-label">Hazard Type</span>
            <strong>{TYPE_LABELS[alert.type] || alert.type}</strong>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="alert-detail-body">
        
        <main className="alert-detail-main">
          
          {/* Incident Description */}
          <section className="card alert-section">
            <div className="section-heading">
              <div>
                <span className="section-kicker">OVERVIEW</span>
                <h3>Incident Description</h3>
              </div>
              <ShieldAlert size={18} />
            </div>
            <p className="incident-description">{alert.description}</p>
          </section>

          {/* CCTV and User Disaster Gallery */}
          <section className="card alert-section">
            <div className="section-heading">
              <div>
                <span className="section-kicker">DISASTER EVIDENCE</span>
                <h3>Visual Evidence & CCTV Feeds</h3>
              </div>
              <Camera size={18} />
            </div>

            {/* Simulated Live CCTV Feed */}
            <div className="cctv-feeds-container">
              <h4>Active CCTV Monitoring</h4>
              <div className="cctv-grid">
                
                {/* CCTV 1 */}
                <div className="cctv-screen">
                  {isCctvOffline ? (
                    <div className="cctv-static-box">
                      <div className="scanlines" />
                      <div className="static-noise" />
                      <div className="cctv-offline-overlay">
                        <span className="text-red-500 font-bold animate-pulse">FEED INTERRUPTED</span>
                        <span className="reason-label">{cctvSource?.reason || 'CCTV Signal Lost'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="cctv-feed-active">
                      <div className="scanlines" />
                      <img src="https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=350&q=80" alt="CCTV Feed" />
                      <div className="cctv-feed-badge">● LIVE CCTV-01</div>
                      <span className="cctv-timestamp font-mono">{new Date().toLocaleTimeString()}</span>
                    </div>
                  )}
                  <span className="cctv-label">CCTV Cam #01 - North corridor</span>
                </div>

                {/* CCTV 2 */}
                <div className="cctv-screen">
                  <div className="cctv-feed-active">
                    <div className="scanlines" />
                    <img src="https://images.unsplash.com/photo-1508873696983-2df519f0397e?auto=format&fit=crop&w=350&q=80" alt="CCTV Feed 2" />
                    <div className="cctv-feed-badge">● LIVE CCTV-02</div>
                    <span className="cctv-timestamp font-mono">{new Date().toLocaleTimeString()}</span>
                  </div>
                  <span className="cctv-label">CCTV Cam #02 - Main approach bridge</span>
                </div>

              </div>
            </div>

            {/* Citizen Uploads Gallery */}
            <div className="citizen-gallery-container">
              <div className="gallery-header flex items-center justify-between">
                <h4>Citizen Evidence Submissions</h4>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEvidencePhoto(null); setShowEvidenceForm(f => !f) }}>
                  <Camera size={14} /> Upload Evidence
                </button>
              </div>

              {/* Expandable uploader panel */}
              {showEvidenceForm && (
                <div className="card evidence-form-panel animate-fade-in">
                  <h5>Add Live Image Evidence</h5>
                  
                  {cameraError && <div className="nr-camera-alert">{cameraError}</div>}

                  <div className="evidence-upload-frame">
                    {evidencePhoto ? (
                      <div className="evidence-preview-wrap">
                        <img src={evidencePhoto} alt="Captured preview" />
                        <button className="evidence-clear-btn" onClick={() => setEvidencePhoto(null)}><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="evidence-viewfinder-inner">
                        <div className="evidence-video-stream-wrap">
                          <video ref={videoRef} autoPlay playsInline muted />
                          <div className="evidence-gps-overlay font-mono text-xs">
                            📍 LAT: {coordinates.lat}° | LNG: {coordinates.lng}° (verified)
                          </div>
                          <button className="evidence-shutter-btn" onClick={() => handleCapture(false)}>Capture Frame</button>
                        </div>
                      </div>
                    )}
                  </div>

                  <input
                    type="text"
                    className="evidence-notes-input"
                    placeholder="Brief description of what this image shows..."
                    value={evidenceNotes}
                    onChange={e => setEvidenceNotes(e.target.value)}
                  />

                  <div className="form-action-row">
                    <button className="btn btn-primary btn-sm" onClick={submitEvidence} disabled={!evidencePhoto}>Submit Evidence</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { stopCamera(); setShowEvidenceForm(false) }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Images Grid */}
              {alert.images && alert.images.length > 0 ? (
                <div className="citizen-images-grid">
                  {alert.images.map((img, idx) => (
                    <div key={idx} className="citizen-image-card">
                      <div className="img-container">
                        <img src={img.url} alt={img.caption} />
                        <div className="img-gps-tag font-mono">📍 {img.lat}°, {img.lng}°</div>
                      </div>
                      <div className="image-card-info">
                        <strong>{img.caption}</strong>
                        <span className="uploader-meta">Submitted by: {img.uploader} · {timeAgo(img.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="gallery-empty-text">No user evidence images submitted yet. Add live proof of this hazard.</p>
              )}
            </div>

          </section>

          {/* Location details & Map */}
          <section className="card alert-section">
            <div className="section-heading">
              <div>
                <span className="section-kicker">GEOLOCATION</span>
                <h3>Incident Location</h3>
              </div>
              <MapPin size={18} />
            </div>
            <div className="location-address">
              <MapPin size={16} />
              <span>{alert.location}</span>
            </div>
            <div className="alert-map">
              <div className="map-grid" />
              <div className="map-marker">
                <div className="map-marker-pulse" />
                <MapPin size={28} fill="currentColor" />
              </div>
              <div className="map-label">
                <strong>Incident Location</strong>
                <span>{alert.location}</span>
              </div>
              <button className="map-expand">
                <Navigation size={14} /> View on Map
                <ExternalLink size={12} />
              </button>
            </div>
          </section>

          {/* Community Verification & Correction System */}
          <section className="card alert-section community-vote-section">
            <div className="section-heading">
              <div>
                <span className="section-kicker">COMMUNITY CORRECTION & VERIFICATION</span>
                <h3>Community Trust Verification</h3>
              </div>
              <CheckCircle size={18} />
            </div>

            <p className="community-vote-intro">
              Help responders verify ground truth. Since some areas have limited resources (e.g. offline sensors/CCTV), community reports guide emergency routing.
            </p>

            <div className="vote-decision-card">
              <h4>Is this hazard report active and accurate?</h4>
              
              <div className="vote-buttons-row">
                <button className={`vote-dec-btn btn-true ${voteType === 'true' ? 'active' : ''}`} onClick={() => { setVotePhoto(null); setVoteType('true'); setShowVoteForm(true) }}>
                  <Check size={18} /> Yes, it is True
                </button>
                <button className={`vote-dec-btn btn-false ${voteType === 'false' ? 'active' : ''}`} onClick={() => { setVotePhoto(null); setVoteType('false'); setShowVoteForm(true) }}>
                  <X size={18} /> No, it is False
                </button>
              </div>

              {/* Vote Verification Form */}
              {showVoteForm && (
                <div className="vote-form-expansion animate-fade-in">
                  {voteType === 'false' ? (
                    <div className="proof-warning">
                      <strong>⚠️ Image Evidence Mandatory:</strong> You are disputing this report as false. You must upload a real-time photo/video of the area as proof.
                    </div>
                  ) : (
                    <div className="proof-info">
                      Provide details or optional photo evidence confirming this hazard is currently active.
                    </div>
                  )}

                  <div className="evidence-upload-frame">
                    {votePhoto ? (
                      <div className="evidence-preview-wrap">
                        <img src={votePhoto} alt="Dispute evidence preview" />
                        <button className="evidence-clear-btn" onClick={() => setVotePhoto(null)}><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="evidence-viewfinder-inner">
                        <div className="evidence-video-stream-wrap">
                          <video ref={videoRef} autoPlay playsInline muted />
                          <div className="evidence-gps-overlay font-mono text-xs">
                            📍 LAT: {coordinates.lat}° | LNG: {coordinates.lng}° (verified)
                          </div>
                          <button className="evidence-shutter-btn" onClick={() => handleCapture(true)}>Capture Proof</button>
                        </div>
                      </div>
                    )}
                  </div>

                  <textarea
                    className="vote-notes-input"
                    placeholder="Provide details about local conditions..."
                    value={voteNotes}
                    onChange={e => setVoteNotes(e.target.value)}
                    rows={3}
                  />

                  <div className="form-action-row">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={submitVote}
                      disabled={voteType === 'false' && !votePhoto} // Force uploader proof for False flags
                    >
                      Submit Verification
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { stopCamera(); setShowVoteForm(false); setVoteType(null) }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Timeline of events */}
          <section className="card alert-section animate-fade-in">
            <div className="section-heading">
              <div>
                <span className="section-kicker">AUDIT TRAIL</span>
                <h3>Incident Timeline</h3>
              </div>
              <Clock size={18} />
            </div>

            <div className="alert-timeline">
              {alert.timeline && alert.timeline.map((event, i) => {
                const cfg = TIMELINE_COLORS[event.type] || TIMELINE_COLORS.system
                const isLast = i === alert.timeline.length - 1
                return (
                  <div key={i} className={`alert-timeline-item ${isLast ? 'timeline-last' : ''}`}>
                    <div className="timeline-track">
                      <div className="alert-timeline-dot" style={{ background: cfg.bg, borderColor: cfg.border }}>
                        {cfg.icon}
                      </div>
                    </div>
                    <div className="alert-timeline-content">
                      <div className="timeline-action">{event.action}</div>
                      <div className="timeline-meta">
                        <span><User size={11} /> {event.actor}</span>
                        <span>•</span>
                        <span>{formatDate(event.time)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

        </main>

        {/* Sidebar panels */}
        <aside className="alert-detail-sidebar">
          
          {/* Metadata details */}
          <section className="card sidebar-card">
            <div className="sidebar-heading">
              <h3>Report Details</h3>
              <span className="sidebar-status-dot" />
            </div>
            <dl className="alert-detail-dl">
              <div>
                <dt>Reported By</dt>
                <dd><User size={12} /> {alert.reportedBy}</dd>
              </div>
              <div>
                <dt>Reported At</dt>
                <dd>{formatDate(alert.reportedAt)}</dd>
              </div>
              <div>
                <dt>Hazard Type</dt>
                <dd>{TYPE_LABELS[alert.type] || alert.type}</dd>
              </div>
              <div>
                <dt>Severity</dt>
                <dd><SeverityBadge severity={alert.severity} /></dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd><StatusBadge status={alert.status} /></dd>
              </div>
              {alert.verifiedBy && (
                <div>
                  <dt>Verified By</dt>
                  <dd className="verified-value"><CheckCircle size={12} /> {alert.verifiedBy}</dd>
                </div>
              )}
              {alert.correctedBy && (
                <div>
                  <dt>Corrected By</dt>
                  <dd className="corrected-value"><CheckCircle size={12} /> {alert.correctedBy}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* Statistical Breakdown sidebar card */}
          <section className="card sidebar-card">
            <div className="sidebar-heading">
              <h3>Detection Confidence</h3>
            </div>
            
            <div className="confidence-value-bar-row">
              <div className="confidence-value">
                <strong>{alert.confidence}%</strong>
                <span>Confidence score</span>
              </div>
              <div className="confidence-bar">
                <div style={{ width: `${alert.confidence}%`, background: 'var(--accent)' }} />
              </div>
            </div>

            <p className="confidence-description">
              Engine calculation based on telemetry verification from ground sensors, weather indexes, satellite data, and community votes.
            </p>

            {/* Contributors details & health states */}
            <div className="confidence-contributors-list">
              <h5>Source Integrity & Telemetry</h5>
              {alert.integritySources && alert.integritySources.map((src, i) => {
                const isOnline = src.status === 'online'
                const isLimited = src.status === 'limited'
                const statusColor = isOnline ? 'var(--text-success)' : isLimited ? 'var(--sev-medium)' : 'var(--sev-critical)'
                
                return (
                  <div key={i} className="contributor-row">
                    <div className="contributor-name-group">
                      <div className="flex items-center gap-1 justify-between w-full">
                        <strong className="contributor-name">{src.name}</strong>
                        <span className={`contributor-status ${src.status}`}>
                          {src.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <span className="contributor-value text-muted text-xs">
                        {isOnline ? `Reading: ${src.value}` : `Unavailable: ${src.reason}`}
                      </span>
                    </div>

                    <div className="contributor-bar-group">
                      <div className="contributor-bar-text">
                        <span>Weight Contribution</span>
                        <strong>+{isOnline ? src.contribution : isLimited ? Math.round(src.contribution * 0.5) : 0}%</strong>
                      </div>
                      <div className="contributor-bar">
                        <div
                          className="contributor-fill"
                          style={{
                            width: `${isOnline ? 100 : isLimited ? 50 : 0}%`,
                            background: statusColor
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {caps.canCorrect && !isResolved && (
            <section className="correction-card">
              <div className="correction-icon"><Wrench size={19} /></div>
              <div className="correction-content">
                <span className="section-kicker">AUTHORIZED ACTION</span>
                <h3>Correction Available</h3>
                <p>You have permission to review and apply a correction to this incident.</p>
                <button className="btn btn-primary" onClick={() => navigate(`/dashboard/alert/${alert.id}/correct`)}>
                  Apply Correction <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
                </button>
              </div>
            </section>
          )}

        </aside>

      </div>
    </div>
  )
}