import { useState, useRef, useEffect, useCallback } from 'react'
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
    if (!photo) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [photo, startCamera, stopCamera])

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

  function handleSubmit() {
    navigate('/dashboard/report/context', {
      state: { 
        photo, 
        hazardType: hazard, 
        severity, 
        description: desc, 
        coordinates, 
        timestamp 
      },
    })
  }

  // ── Shared viewfinder panels ──────────────────────────────────
  const ViewfinderPanel = (
    <div className="nr-viewfinder">
      {photo ? (
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
      {!photo && (
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
    <button className="nr-submit" onClick={handleSubmit} disabled={!photo}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
        <line x1="4" y1="22" x2="4" y2="15"/>
      </svg>
      Submit Report
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
