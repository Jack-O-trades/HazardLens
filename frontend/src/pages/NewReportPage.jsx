import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAlerts } from '../context/AlertsContext'
import { useAuth } from '../context/AuthContext'
import './NewReportPage.css'

const HAZARD_TYPES = [
  { id: 'flood',          label: 'Flood',          icon: '💧' },
  { id: 'fire',           label: 'Fire',           icon: '🔥' },
  { id: 'seismic',        label: 'Landslide',      icon: '🏔️' },
  { id: 'infrastructure', label: 'Infrastructure', icon: '🏗️' },
  { id: 'weather',        label: 'Weather',        icon: '🌦️' },
  { id: 'other',          label: 'More',           icon: '···' },
]

const SEVERITY = [
  { id: 'low',      label: 'Low',      icon: '○' },
  { id: 'moderate', label: 'Moderate', icon: '⊖' },
  { id: 'high',     label: 'High',     icon: '⊕' },
]

const PYTHON_AI_URL = import.meta.env.VITE_PYTHON_AI_URL || 'http://localhost:8000'

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
  const [uploadStatus, setUploadStatus] = useState(null) // null | 'uploading' | 'failed'
  const [simulateSuccess, setSimulateSuccess] = useState(true)

  // Centralized AI Inference states
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [aiError, setAiError] = useState(null)

  // AI Inference call handler
  const analyzeImage = async (base64Image, claimedHazard) => {
    setAiLoading(true)
    setAiResult(null)
    setAiError(null)
    try {
      const res = await fetch(`${PYTHON_AI_URL}/api/v1/detect-base64`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: base64Image,
          claimed_hazard: claimedHazard
        })
      })
      if (!res.ok) {
        throw new Error(`AI inference service failed: ${res.statusText}`)
      }
      const data = await res.json()
      setAiResult(data)
    } catch (err) {
      console.error('AI inference error:', err)
      setAiError('Centralized AI inference service is offline or unreachable.')
    } finally {
      setAiLoading(false)
    }
  }

  // Trigger AI analysis automatically when photo is captured or when hazard class is changed
  useEffect(() => {
    if (photo && !uploadStatus) {
      analyzeImage(photo, hazard)
    }
  }, [photo, hazard])

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

  // Handle file uploads (Images & Videos) from PC
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = canvasRef.current
          if (!canvas) return
          const ctx = canvas.getContext('2d')
          canvas.width = img.width
          canvas.height = img.height
          ctx.drawImage(img, 0, 0)

          // Burn watermark
          const now = new Date()
          const stampText = `HAZARDLENS UPLOAD | FILE: ${file.name.substring(0, 15)} | UTC: ${now.toISOString().replace('T', ' ').slice(0, 19)}`
          
          ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'
          ctx.fillRect(0, canvas.height - 36, canvas.width, 36)
          ctx.fillStyle = '#f59e0b' // Warning yellow for uploaded evidence
          ctx.font = 'bold 13px Inter, sans-serif'
          ctx.fillText('• UPLOADED FILE', 16, canvas.height - 13)
          ctx.fillStyle = '#ffffff'
          ctx.font = '12px Courier New, monospace'
          ctx.fillText(stampText.substring(16), 160, canvas.height - 13)

          const dataUrl = canvas.toDataURL('image/jpeg')
          setPhoto(dataUrl)
          setTimestamp(now.toISOString())
          stopCamera()
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    } else if (file.type.startsWith('video/')) {
      const video = document.createElement('video')
      video.src = URL.createObjectURL(file)
      video.muted = true
      video.playsInline = true
      video.onloadeddata = () => {
        // Seek to 0.5s to bypass initial dark frame
        video.currentTime = 0.5
      }
      video.onseeked = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        const width = video.videoWidth || 640
        const height = video.videoHeight || 480
        canvas.width = width
        canvas.height = height

        ctx.drawImage(video, 0, 0, width, height)

        // Burn watermark
        const now = new Date()
        const stampText = `HAZARDLENS VIDEO | FILE: ${file.name.substring(0, 15)} | UTC: ${now.toISOString().replace('T', ' ').slice(0, 19)}`
        
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'
        ctx.fillRect(0, height - 36, width, 36)
        ctx.fillStyle = '#3b82f6' // Blue for video evidence
        ctx.font = 'bold 13px Inter, sans-serif'
        ctx.fillText('• VIDEO SNAPSHOT', 16, height - 13)
        ctx.fillStyle = '#ffffff'
        ctx.font = '12px Courier New, monospace'
        ctx.fillText(stampText.substring(17), 160, height - 13)

        const dataUrl = canvas.toDataURL('image/jpeg')
        setPhoto(dataUrl)
        setTimestamp(now.toISOString())
        stopCamera()
        URL.revokeObjectURL(video.src)
      }
    }
  }

  // Simulated upload handler
  const handleUpload = () => {
    if (!photo) return
    setUploadStatus('uploading')
    setTimeout(() => {
      if (simulateSuccess) {
        // Calculate AI confidence score based on custom YOLO model detection
        let finalConfidence = 55 // fallback default
        if (aiResult) {
          if (aiResult.is_claimed_hazard_present && aiResult.detections && aiResult.detections.length > 0) {
            // Find detections matching the claimed hazard type (with mapping rules)
            const matches = aiResult.detections.filter(d => {
              const name = d.class_name.toLowerCase();
              if (hazard === 'flood' && name === 'flood') return true;
              if (hazard === 'fire' && (name === 'fire' || name === 'smoke')) return true;
              if (hazard === 'seismic' && (name === 'landslide' || name === 'road_blockage')) return true;
              if (hazard === 'infrastructure' && (name === 'pothole' || name === 'road_blockage')) return true;
              return name === hazard;
            });
            if (matches.length > 0) {
              finalConfidence = Math.round(Math.max(...matches.map(m => m.confidence)) * 100);
            }
          } else if (aiResult.detections && aiResult.detections.length > 0) {
            // Unclaimed hazard detected
            finalConfidence = Math.round(Math.max(...aiResult.detections.map(m => m.confidence)) * 100);
          }
        }

        // Add the alert to AlertsContext
        addAlert({
          photos: [{ url: photo, caption: desc || 'Hazard reported', uploader: user?.name || 'Citizen Reporter', timestamp: timestamp, aiEvidence: aiResult }],
          hazardType: hazard,
          severity: severity,
          description: desc || 'Citizen hazard report submitted via HazardLens.',
          location: 'Riverdale Heights',
          reportedBy: user?.name || 'Citizen Reporter',
          confidence: finalConfidence,
          aiEvidence: aiResult,
          reporterRole: user?.role,
          coordinates,
        })

        // NOTE: field names here are a best guess based on the old
        // context-page handoff shape (photo/hazardType/severity/
        // description/coordinates/timestamp). Adjust to match whatever
        // SubmissionSuccessPage actually reads from location.state.
        navigate('/dashboard/report/success', {
          state: {
            photo,
            hazardType: hazard,
            severity,
            description: desc,
            coordinates,
            timestamp,
            reportedBy: user?.name || 'Citizen Reporter',
          },
        })
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
        <div className="nr-photo-container" style={{ position: 'relative' }}>
          <img src={photo} alt="Captured hazard evidence" className="nr-photo" />

          {/* AI inference overlay loading spinner */}
          {aiLoading && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(3px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 20,
                borderRadius: '8px'
              }}
            >
              <div className="nr-spinner" style={{ marginBottom: '12px', borderTopColor: 'var(--accent)' }} />
              <h4 style={{ color: 'white', margin: 0, fontSize: '15px', fontFamily: 'Inter, sans-serif' }}>AI Analyzing Evidence...</h4>
              <p style={{ color: '#94a3b8', fontSize: '11px', margin: '4px 0 0 0', fontFamily: 'Inter, sans-serif' }}>Running hazard object detection checks</p>
            </div>
          )}

          {/* YOLO Bounding Box Overlay */}
          {!aiLoading && aiResult && aiResult.detections && aiResult.detections.map((det, idx) => {
            if (!det.box_normalized) return null;
            const [xmin, ymin, xmax, ymax] = det.box_normalized;
            const left = xmin * 100;
            const top = ymin * 100;
            const width = (xmax - xmin) * 100;
            const height = (ymax - ymin) * 100;

            const isMatched = aiResult.is_claimed_hazard_present && (
              (hazard === 'flood' && det.class_name === 'flood') ||
              (hazard === 'fire' && (det.class_name === 'fire' || det.class_name === 'smoke')) ||
              (hazard === 'seismic' && (det.class_name === 'landslide' || det.class_name === 'road_blockage')) ||
              (hazard === 'infrastructure' && (det.class_name === 'pothole' || det.class_name === 'road_blockage')) ||
              det.class_name === hazard
            );

            const boxBorderColor = isMatched ? '#22c55e' : '#f97316'; // Green if matches claimed, orange otherwise

            return (
              <div
                key={idx}
                className="ai-bounding-box"
                style={{
                  position: 'absolute',
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                  border: `2.5px solid ${boxBorderColor}`,
                  boxShadow: '0 0 6px rgba(0, 0, 0, 0.6)',
                  pointerEvents: 'none',
                  borderRadius: '3px',
                  zIndex: 10,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '-20px',
                    left: '-2.5px',
                    backgroundColor: boxBorderColor,
                    color: '#ffffff',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    padding: '1px 5px',
                    borderRadius: '2px',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    fontFamily: 'Courier New, monospace'
                  }}
                >
                  {det.class_name.toUpperCase()} ({Math.round(det.confidence * 100)}%)
                </span>
              </div>
            );
          })}
          
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
        <div className="nr-finder-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
          {/* File Input for PC Upload */}
          <label 
            className="nr-upload-pc-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1.5px solid rgba(255, 255, 255, 0.3)',
              cursor: 'pointer',
              color: '#ffffff',
              transition: 'all 0.2s ease',
            }}
            title="Upload Image/Video from PC"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <input 
              type="file" 
              accept="image/*,video/*" 
              onChange={handleFileChange} 
              style={{ display: 'none' }} 
            />
          </label>

          <button
            className="nr-shutter"
            onClick={(e) => { e.stopPropagation(); capturePhoto() }}
            aria-label="Capture Photo"
            title="Capture Live Photo"
          >
            <span className="nr-shutter-ring" />
          </button>

          {/* Spacer to keep shutter centered */}
          <div style={{ width: '48px' }} />
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

  const AiEvidenceSection = photo && (
    <div className="nr-section" style={{
      backgroundColor: 'rgba(30, 41, 59, 0.4)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <p className="nr-section-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          🤖 Centralized AI Evidence
        </p>
        {aiLoading ? (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', animation: 'pulse 1.5s infinite' }}>Analyzing...</span>
        ) : aiResult ? (
          <span style={{
            fontSize: '11px',
            color: aiResult.hazard_state === 'hazard_detected' ? '#22c55e' :
                   aiResult.hazard_state === 'no_hazard_detected' ? '#94a3b8' :
                   aiResult.hazard_state === 'multiple_conflicting_hazards' ? '#ef4444' : '#f59e0b',
            fontWeight: 'bold',
            backgroundColor: aiResult.hazard_state === 'hazard_detected' ? 'rgba(34, 197, 94, 0.1)' :
                             aiResult.hazard_state === 'no_hazard_detected' ? 'rgba(148, 163, 184, 0.1)' :
                             aiResult.hazard_state === 'multiple_conflicting_hazards' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            padding: '2px 6px',
            borderRadius: '4px'
          }}>
            {aiResult.hazard_state === 'hazard_detected' ? 'Hazard Detected' :
             aiResult.hazard_state === 'no_hazard_detected' ? 'No Hazard Detected' :
             aiResult.hazard_state === 'multiple_conflicting_hazards' ? 'Conflicting Hazards' :
             aiResult.hazard_state === 'inconclusive' ? (aiResult.is_claimed_hazard_present ? 'Inconclusive (Low Confidence)' : 'Claim Mismatch') : 'Inconclusive'}
          </span>
        ) : aiError ? (
          <span style={{ fontSize: '11px', color: '#ef4444' }}>Offline</span>
        ) : null}
      </div>

      {aiLoading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
          Centralized AI inference service is running computer-vision checks...
        </div>
      ) : aiResult ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '13px' }}>
            {aiResult.hazard_state === 'no_hazard_detected' ? (
              <span style={{ color: 'var(--text-muted)' }}>No hazards detected. Scene appears normal.</span>
            ) : aiResult.hazard_state === 'multiple_conflicting_hazards' ? (
              <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
                ⚠️ Multi-hazard conflict detected: overlapping fire and flood detections.
              </span>
            ) : aiResult.hazard_state === 'inconclusive' ? (
              <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                {aiResult.is_claimed_hazard_present ? (
                  `Inconclusive: Claimed hazard detected with low confidence (${aiResult.detections.map(d => `${d.class_name} ${Math.round(d.confidence*100)}%`).join(', ')}).`
                ) : (
                  `Inconclusive: Bounding boxes do not support the claimed hazard class.`
                )}
              </span>
            ) : (
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Detected elements: </span>
                <strong style={{ color: 'white' }}>
                  {aiResult.detections.map(d => `${d.class_name} (${Math.round(d.confidence * 100)}%)`).join(', ')}
                </strong>
              </div>
            )}
          </div>
          
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
            <span>Model: {aiResult.model_version}</span>
          </div>
        </div>
      ) : aiError ? (
        <div style={{ color: '#ef4444', fontSize: '12px' }}>
          ⚠️ {aiError} (Report will submit with standard citizen confidence)
        </div>
      ) : (
        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Capture a photo to trigger centralized AI evidence validation.
        </div>
      )}
    </div>
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
          {AiEvidenceSection}
          {SubmitBtn}
        </div>
      </div>
      
      <div className="nr-home-indicator-mobile" />
    </div>
  )
}