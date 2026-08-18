import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAlerts } from '../context/AlertsContext'
import { useAuth } from '../context/AuthContext'
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
  const { addAlert } = useAlerts()
  const { user } = useAuth()

  const videoRef = useRef()
  const canvasRef = useRef()

  const [photo, setPhoto] = useState(null)
  const [hazard, setHazard] = useState('flood')
  const [severity, setSeverity] = useState('moderate')
  const [desc, setDesc] = useState('')

  // Geolocation & Timestamp Watermarking states
  const [coordinates, setCoordinates] = useState({ lat: 45.5234, lng: -122.6762, acc: 12 })
  const [timestamp, setTimestamp] = useState(new Date().toISOString())

  // Camera integration states
  const [activeStream, setActiveStream] = useState(null)
  const [cameraError, setCameraError] = useState(null)

  // Upload simulation states
  const [uploadStatus, setUploadStatus] = useState(null) // null | 'uploading' | 'success' | 'failed'
  const [simulateSuccess, setSimulateSuccess] = useState(true)

  // Get GPS Coordinates on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordinates({
            lat: parseFloat(position.coords.latitude.toFixed(5)),
            lng: parseFloat(position.coords.longitude.toFixed(5)),
            acc: Math.round(position.coords.accuracy)
          })
        },
        () => { /* Keep fallback coordinates */ }
      )
    }
  }, [])

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop())
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setActiveStream(stream)
    } catch (err) {
      console.error('Camera capture error: ', err)
      setCameraError('Unable to access device camera. Please grant camera permissions to capture live hazard evidence.')
    }
  }, [activeStream])

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (activeStream) {
      activeStream.getTracks().forEach(track => track.stop())
      setActiveStream(null)
    }
  }, [activeStream])

  // Effect to manage camera stream lifecycle
  useEffect(() => {
    if (!photo && !uploadStatus) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [photo, uploadStatus, startCamera, stopCamera])

  // Capture photo from video stream
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const width = video.videoWidth || 640
    const height = video.videoHeight || 480
    canvas.width = width
    canvas.height = height

    // Draw the current video frame onto canvas
    ctx.drawImage(video, 0, 0, width, height)

    // Burn/watermark the location and timestamp
    const now = new Date()
    const stampText = `HAZARDLENS LIVE | LAT: ${coordinates.lat}° | LNG: ${coordinates.lng}° | ACC: ±${coordinates.acc}m | UTC: ${now.toISOString().replace('T', ' ').slice(0, 19)}`
    
    // Style background banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'
    ctx.fillRect(0, height - 36, width, 36)

    // Style text overlay
    ctx.fillStyle = '#22c55e' // Green highlight
    ctx.font = 'bold 13px Inter, sans-serif'
    ctx.fillText('• VERIFIED SECURE', 16, height - 13)

    ctx.fillStyle = '#ffffff'
    ctx.font = '12px Courier New, monospace'
    ctx.fillText(stampText.substring(18), 160, height - 13)

    // Export captured canvas as data URL image
    const dataUrl = canvas.toDataURL('image/jpeg')
    setPhoto(dataUrl)
    setTimestamp(now.toISOString())
    stopCamera()
  }

  // Simulated upload handler
  const handleUpload = () => {
    if (!photo) return
    setUploadStatus('uploading')
    setTimeout(() => {
      if (simulateSuccess) {
        // Add the alert to AlertsContext
        addAlert({
          photos: [{ url: photo, caption: desc || 'Hazard reported', uploader: user?.name || 'Citizen Reporter', timestamp: timestamp }],
          hazardType: hazard,
          severity: severity,
          description: desc || 'Citizen hazard report submitted via HazardLens.',
          location: 'Riverdale Heights',
          reportedBy: user?.name || 'Citizen Reporter',
        })
        setUploadStatus('success')
      } else {
        setUploadStatus('failed')
      }
    }, 1500)
  }

  // ── Shared viewfinder panels ──────────────────────────────────
  const ViewfinderPanel = (
    <div className="nr-viewfinder">
      {uploadStatus === 'uploading' ? (
        <div className="nr-upload-loading">
          <div className="nr-spinner" />
          <h4>Uploading Telemetry & Evidence...</h4>
          <p>Encrypting payload metadata for secure blockchain ingestion.</p>
        </div>
      ) : uploadStatus === 'success' ? (
        <div className="nr-upload-status nr-upload-status--success">
          <div className="status-icon-ring">
            <svg className="success-check" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3>Upload Successful!</h3>
          <p>Verified report and signed metadata ingested securely.</p>
          
          <div className="nr-telemetry-badge">
            <div>📍 GPS: {coordinates.lat}°, {coordinates.lng}°</div>
            <div>📅 DATE: {new Date(timestamp).toLocaleDateString()} {new Date(timestamp).toLocaleTimeString()}</div>
          </div>

          <button className="nr-status-btn-primary" onClick={() => {
            setPhoto(null);
            setDesc('');
            setHazard('flood');
            setSeverity('moderate');
            setUploadStatus(null);
          }}>
            Done
          </button>
        </div>
      ) : uploadStatus === 'failed' ? (
        <div className="nr-upload-status nr-upload-status--failed">
          <div className="status-icon-ring-fail">
            <svg className="fail-cross" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <h3>Upload Failed</h3>
          <p>Cryptographic signature failed. Telemetry node handshake timed out.</p>

          <div className="nr-status-btn-row">
            <button className="nr-status-btn-primary" onClick={handleUpload}>
              Retry Upload
            </button>
            <button className="nr-status-btn-secondary" onClick={() => setUploadStatus(null)}>
              Back
            </button>
          </div>
        </div>
      ) : photo ? (
        <div className="nr-photo-container">
          <img src={photo} alt="Captured hazard evidence" className="nr-photo" />
          
          {/* Geolocation Watermark UI Overlay */}
          <div className="nr-photo-watermark">
            <span className="live-pill">Verified Metadata Ingested</span>
            <div className="watermark-details">
              <span>📍 GPS: {coordinates.lat}° N, {coordinates.lng}° W (±{coordinates.acc}m)</span>
              <span>📅 DATE: {new Date(timestamp).toLocaleString()}</span>
            </div>
          </div>

          {/* Action Overlay */}
          <div className="nr-photo-actions-overlay">
            <button
               className="nr-photo-act-btn nr-btn-cancel"
               onClick={() => { setPhoto(null); setDesc(''); setHazard('flood'); setSeverity('moderate'); }}
            >
              Cancel
            </button>
            <button
               className="nr-photo-act-btn nr-btn-retake"
               onClick={() => setPhoto(null)}
            >
              Retake
            </button>
            <button
               className="nr-photo-act-btn nr-btn-upload"
               onClick={handleUpload}
            >
              Upload
            </button>
          </div>

          {/* Simulation controller */}
          <div className="nr-sim-toggle-container">
            <span className="sim-label">SIMULATE:</span>
            <button
              className={`sim-toggle-btn ${simulateSuccess ? 'active' : ''}`}
              onClick={() => setSimulateSuccess(true)}
            >
              SUCCESS
            </button>
            <button
              className={`sim-toggle-btn ${!simulateSuccess ? 'active' : ''}`}
              onClick={() => setSimulateSuccess(false)}
            >
              FAIL
            </button>
          </div>
        </div>
      ) : (
        <div className="nr-finder-inner">
          <div className="nr-video-stream-wrap">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="nr-video-stream"
            />
            <div className="nr-camera-crosshair">
              <span className="nr-ch-corner nr-ch-tl" />
              <span className="nr-ch-corner nr-ch-tr" />
              <span className="nr-ch-corner nr-ch-bl" />
              <span className="nr-ch-corner nr-ch-br" />
              <div className="nr-ch-plus"><span /><span /></div>
            </div>
            
            {/* Geolocation Live Overlay */}
            <div className="live-gps-telemetry">
              <div className="gps-row font-mono">
                <span className="text-green-500 font-bold animate-pulse">● LIVE TELEMETRY</span>
                <span>LAT: {coordinates.lat}°</span>
                <span>LNG: {coordinates.lng}°</span>
                <span>ACC: ±{coordinates.acc}m</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controller Buttons Bar */}
      {!photo && !uploadStatus && (
        <div className="nr-finder-controls" style={{ justifyContent: 'center' }}>
          <button
            className="nr-shutter"
            onClick={(e) => { e.stopPropagation(); capturePhoto() }}
            aria-label="Capture Photo"
            title="Capture Live Photo"
          >
            <span className="nr-shutter-ring" />
          </button>
        </div>
      )}
    </div>
  )

  const LocationBar = (
    <div className="nr-location">
      <svg className="nr-loc-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
      <span className="nr-loc-name">Riverdale Heights</span>
      <span className="nr-loc-acc">· ±{coordinates.acc} m Accuracy</span>
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
              disabled={!!uploadStatus}
            >
              <span className="nr-chip-icon" aria-hidden="true">{h.icon}</span>
              {h.label}
            </button>
          ))}
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
            disabled={!!uploadStatus}
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
        disabled={!!uploadStatus}
      />
    </div>
  )

  const SubmitBtn = (
    <button
      className="nr-submit"
      onClick={handleUpload}
      disabled={!photo || uploadStatus === 'uploading'}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
        <line x1="4" y1="22" x2="4" y2="15"/>
      </svg>
      Upload & Submit Report
    </button>
  )

  return (
    <div className="nr-shell animate-fade-in">
      <canvas ref={canvasRef} className="sr-only" />

      {cameraError && (
        <div className="nr-camera-alert">
          <span>⚠️ {cameraError}</span>
        </div>
      )}

      {/* Unified responsive header */}
      <header className="nr-page-header">
        <button className="nr-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div>
          <h1 className="nr-page-title">New Hazard Report</h1>
          <p className="nr-page-sub">Capture verified real-time photos and report local disaster conditions.</p>
        </div>
      </header>

      {/* Single layout grid, responsive in CSS */}
      <div className="nr-layout-container">
        {/* Left/top — camera uploader */}
        <div className="nr-layout-left">
          {ViewfinderPanel}
          {LocationBar}
        </div>

        {/* Right/bottom — form inputs */}
        <div className="nr-layout-right">
          {HazardSection}
          {SeveritySection}
          {DescSection}
          {SubmitBtn}
        </div>
      </div>
      
      <div className="nr-home-indicator-mobile" />
    </div>
  )
}
