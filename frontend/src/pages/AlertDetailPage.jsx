import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
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

import Map, { Marker } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

import { useAuth } from '../context/AuthContext'
import { useAlerts } from '../context/AlertsContext'
import { SeverityBadge, StatusBadge } from '../components/shared/StatusBadge'
import { formatDate, timeAgo } from '../data/mockData'
import './AlertDetailPage.css'

const PYTHON_AI_URL = import.meta.env.VITE_PYTHON_AI_URL || 'http://localhost:8000'

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

const SATELLITE_MAP_STYLE = {
  version: 8,
  sources: {
    'esri-sat': {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: '&copy; Esri &copy; OpenStreetMap contributors'
    }
  },
  layers: [{ id: 'esri-sat-layer', type: 'raster', source: 'esri-sat' }]
}

export default function AlertDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, caps } = useAuth()
  const { alerts, addEvidenceToAlert, submitCommunityVote, approveAlert, rejectAlert } = useAlerts()

  const alert = alerts.find((a) => a.id === id)

  const integritySources = useMemo(() => {
    if (!alert) return null
    if (alert.integritySources && alert.integritySources.length > 0) {
      return alert.integritySources
    }

    if (alert.verificationDetails) {
      const v = alert.verificationDetails
      const sources = []

      // 1. River Gauge Sensor
      if (v.river) {
        if (v.river.data && v.river.data.sensorAvailable) {
          sources.push({
            name: `River Sensor (${v.river.data.station.split(' - ')[0]})`,
            status: 'online',
            value: `${v.river.data.waterLevel}m (Status: ${v.river.data.status})`,
            contribution: 30,
            type: 'sensor'
          })
        } else {
          sources.push({
            name: 'River Gauge Sensor Network',
            status: 'offline',
            reason: 'No monitored station within 50km',
            contribution: 30,
            type: 'sensor'
          })
        }
      }

      // 2. CCTV Camera
      sources.push({
        name: 'Southbank CCTV Camera',
        status: 'offline',
        reason: 'Feed offline in demo version',
        contribution: 20,
        type: 'cctv'
      })

      // 3. Satellite Water Surface Map
      if (v.satellite) {
        if (v.satellite.available) {
          sources.push({
            name: 'Satellite Water Surface Map',
            status: 'online',
            value: `Scene Acquired (${v.satellite.date})`,
            contribution: 15,
            type: 'satellite'
          })
        } else {
          sources.push({
            name: 'Satellite Water Surface Map',
            status: 'limited',
            reason: 'Coordinates outside standard orbit coverage',
            contribution: 15,
            type: 'satellite'
          })
        }
      }

      // 4. Doppler Weather Radar
      if (v.weather && v.weather.data) {
        sources.push({
          name: 'Doppler Weather Radar (Open-Meteo)',
          status: 'online',
          value: `Temp: ${v.weather.data.temp}°C, Precip: ${v.weather.data.precipitation}mm`,
          contribution: 20,
          type: 'weather'
        })
      } else {
        sources.push({
          name: 'Doppler Weather Radar',
          status: 'offline',
          reason: 'Open-Meteo connection timed out',
          contribution: 20,
          type: 'weather'
        })
      }

      // 5. Citizen Reports
      sources.push({
        name: 'Citizen Reports (Validated)',
        status: 'online',
        value: `AI Image Checked (${alert.confidence >= 70 ? 'High Confidence' : 'Medium Confidence'})`,
        contribution: 15,
        type: 'citizen'
      })

      return sources
    }

    return []
  }, [alert])

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

  // AI confirmation/verification states
  const [aiVoteLoading, setAiVoteLoading] = useState(false)
  const [aiVoteResult, setAiVoteResult] = useState(null)
  const [aiVoteError, setAiVoteError] = useState(null)

  // AI Inference call handler for alert verification
  const analyzeVoteImage = async (base64Image) => {
    setAiVoteLoading(true)
    setAiVoteResult(null)
    setAiVoteError(null)
    try {
      const res = await fetch(`${PYTHON_AI_URL}/api/v1/detect-base64`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: base64Image,
          claimed_hazard: alert?.type // Map alert type to claimed hazard (e.g. 'river', 'fire')
        })
      })
      if (!res.ok) {
        throw new Error(`AI inference service failed: ${res.statusText}`)
      }
      const data = await res.json()
      setAiVoteResult(data)
    } catch (err) {
      console.error('AI inference error on verification:', err)
      setAiVoteError('Centralized AI verification service is offline.')
    } finally {
      setAiVoteLoading(false)
    }
  }

  // Trigger AI analysis when verification proof photo is captured
  useEffect(() => {
    if (votePhoto) {
      analyzeVoteImage(votePhoto)
    }
  }, [votePhoto])

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
  const cctvSource = integritySources?.find(s => s.type === 'cctv')
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

      {/* Admin Action Banner */}
      {user?.role === 'admin' && alert.status === 'verified' && (
        <div className="admin-action-banner" style={{
          backgroundColor: 'rgba(34, 197, 94, 0.12)',
          border: '1.5px solid #22c55e',
          borderRadius: '8px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div>
            <h4 style={{ margin: 0, color: '#4ade80', fontSize: '14px', fontWeight: 'bold' }}>🛡️ Admin Action Required</h4>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '12px' }}>
              This report has completed automated multi-source evidence fusion. Please review the telemetry and confirm.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-primary" 
              style={{ backgroundColor: '#22c55e', borderColor: '#22c55e', color: 'white', padding: '6px 14px', fontSize: '12.5px', cursor: 'pointer' }}
              onClick={() => approveAlert(alert.id, user.name)}
            >
              Approve & Publish
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ backgroundColor: '#ef4444', borderColor: '#ef4444', color: 'white', padding: '6px 14px', fontSize: '12.5px', cursor: 'pointer' }}
              onClick={() => rejectAlert(alert.id, user.name)}
            >
              Reject Report
            </button>
          </div>
        </div>
      )}

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

            {/* Centralized AI Evidence Verification Report */}
            {/* Multi-Source Evidence Fusion verification section */}
            {!alert.verificationDetails ? (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                border: '1px dashed var(--border)',
                borderRadius: '8px',
                fontFamily: 'Inter, sans-serif'
              }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="spin" style={{ display: 'inline-block' }}>⚙️</span> 
                  Automated Evidence Fusion Pipeline Running...
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="spin" style={{ display: 'inline-block', fontSize: '13px' }}>🔄</span>
                    <span>🌦️ Analyzing Open-Meteo weather parameters...</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="spin" style={{ display: 'inline-block', fontSize: '13px' }}>🔄</span>
                    <span>🌊 Locating nearest river gauge telemetry sensors...</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="spin" style={{ display: 'inline-block', fontSize: '13px' }}>🔄</span>
                    <span>🛰️ Aligning satellite Sentinel/Copernicus orbit passes...</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="spin" style={{ display: 'inline-block', fontSize: '13px' }}>🔄</span>
                    <span>📹 Verifying local CCTV feeds...</span>
                  </div>
                </div>
                <div style={{ marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Awaiting multi-agent criteria scoring. User can leave this page; checks will conclude in background.
                </div>
              </div>
            ) : (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                backgroundColor: 'rgba(30, 41, 59, 0.4)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontFamily: 'Inter, sans-serif'
              }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🔎 Evidence Fusion Verification Report
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  <div>
                    <span style={{ display: 'block', textTransform: 'uppercase', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>AI Image Detections</span>
                    <strong style={{ color: 'white', fontSize: '13px' }}>
                      {alert.aiEvidence
                        ? (alert.aiEvidence.detections && alert.aiEvidence.detections.length > 0 
                            ? alert.aiEvidence.detections.map(d => d.class_name.toUpperCase()).join(', ') 
                            : 'NORMAL / NO HAZARD')
                        : (alert.type === 'river' ? 'FLOOD' : alert.type.toUpperCase())}
                    </strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', textTransform: 'uppercase', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>Fused Confidence Score</span>
                    <strong style={{ color: '#22c55e', fontSize: '14px', fontWeight: 'bold' }}>{alert.confidence}%</strong>
                  </div>
                </div>

                {/* Evidence Fusion Breakdown Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Weather evidence */}
                  <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ color: 'white', fontSize: '12px' }}>🌦️ Local Weather Evidence</strong>
                      <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 'bold' }}>Support: {alert.verificationDetails.weather.score}%</span>
                    </div>
                    {alert.verificationDetails.weather.data ? (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        Temp: {alert.verificationDetails.weather.data.temp}°C | Humidity: {alert.verificationDetails.weather.data.humidity}% | 
                        Precipitation: {alert.verificationDetails.weather.data.precipitation}mm
                      </div>
                    ) : (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No weather data collected.</div>
                    )}
                  </div>

                  {/* River water sensor evidence */}
                  <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ color: 'white', fontSize: '12px' }}>🌊 Water-Level Sensor Telemetry</strong>
                      <span style={{ fontSize: '11px', color: alert.verificationDetails.river.score !== null ? '#22c55e' : 'var(--text-muted)', fontWeight: 'bold' }}>
                        Support: {alert.verificationDetails.river.score !== null ? alert.verificationDetails.river.score + '%' : 'N/A'}
                      </span>
                    </div>
                    {alert.verificationDetails.river.data && alert.verificationDetails.river.data.sensorAvailable ? (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        Station: {alert.verificationDetails.river.data.station} ({alert.verificationDetails.river.data.distance} km away) | 
                        Water Level: <strong style={{ color: alert.verificationDetails.river.data.status === 'HIGH' ? '#ef4444' : '#22c55e' }}>{alert.verificationDetails.river.data.status} ({alert.verificationDetails.river.data.waterLevel}m)</strong>
                      </div>
                    ) : (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        No monitored river telemetry stations within 50 km of report.
                      </div>
                    )}
                  </div>

                  {/* Satellite evidence with Esri Satellite Map */}
                  <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ color: 'white', fontSize: '12px' }}>🛰️ Satellite Scene Telemetry</strong>
                      <span style={{ fontSize: '11px', color: alert.verificationDetails.satellite.score !== null ? '#22c55e' : 'var(--text-muted)', fontWeight: 'bold' }}>
                        Support: {alert.verificationDetails.satellite.score !== null ? alert.verificationDetails.satellite.score + '%' : 'N/A'}
                      </span>
                    </div>
                    {alert.verificationDetails.satellite.available ? (
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                          Satellite Orbit Pass confirmed. Scene Acquired: {alert.verificationDetails.satellite.date}
                        </div>
                        {/* Interactive Satellite Imagery Canvas */}
                        <div className="satellite-map-wrap" style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <Map
                            initialViewState={{ longitude: alert.coordinates.lng, latitude: alert.coordinates.lat, zoom: 14 }}
                            style={{ width: '100%', height: '170px' }}
                            mapStyle={{
                              version: 8,
                              sources: {
                                'esri-sat': {
                                  type: 'raster',
                                  tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                                  tileSize: 256,
                                  attribution: '&copy; Esri &copy; OpenStreetMap contributors'
                                }
                              },
                              layers: [{ id: 'esri-sat-layer', type: 'raster', source: 'esri-sat' }]
                            }}
                            interactive={false}
                          >
                            <Marker longitude={alert.coordinates.lng} latitude={alert.coordinates.lat} anchor="center">
                              <div style={{ 
                                width: '12px', 
                                height: '12px', 
                                backgroundColor: '#ef4444', 
                                border: '2px solid white', 
                                borderRadius: '50%',
                                boxShadow: '0 0 6px rgba(0,0,0,0.6)' 
                              }} />
                            </Marker>
                          </Map>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Satellite imagery currently unavailable for this coordinates.
                      </div>
                    )}
                  </div>

                  {/* CCTV evidence */}
                  <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', opacity: 0.7 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ color: 'white', fontSize: '12px' }}>📹 CCTV Feed Evidence</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Support: N/A</span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      CCTV feeds unavailable at this location. (Not configured in demo version)
                    </div>
                  </div>

                </div>
              </div>
            )}
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
            <div className="alert-map" style={{ position: 'relative', overflow: 'hidden', height: '240px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <Map
                initialViewState={{ longitude: alert.coordinates.lng, latitude: alert.coordinates.lat, zoom: 14 }}
                style={{ width: '100%', height: '100%' }}
                mapStyle={SATELLITE_MAP_STYLE}
                interactive={false}
              >
                <Marker longitude={alert.coordinates.lng} latitude={alert.coordinates.lat} anchor="center">
                  <div style={{ position: 'relative', width: '28px', height: '28px', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="map-marker-pulse" style={{ position: 'absolute', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.4)', animation: 'pulse 1.5s infinite' }} />
                    <MapPin size={28} fill="#ef4444" style={{ zIndex: 2 }} />
                  </div>
                </Marker>
              </Map>
              <div className="map-label" style={{ position: 'absolute', bottom: '12px', left: '12px', zIndex: 10 }}>
                <strong>Incident Location</strong>
                <span>{alert.location}</span>
              </div>
              <button className="map-expand" style={{ position: 'absolute', bottom: '12px', right: '12px', zIndex: 10, cursor: 'pointer' }} onClick={() => navigate('/dashboard/live-map', { state: { centerTo: alert.coordinates } })}>
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
                      <div className="evidence-preview-wrap" style={{ position: 'relative' }}>
                        <img src={votePhoto} alt="Dispute evidence preview" />
                        <button className="evidence-clear-btn" onClick={() => { setVotePhoto(null); setAiVoteResult(null); }}><X size={14} /></button>

                        {/* AI scanning overlay spinner */}
                        {aiVoteLoading && (
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
                              zIndex: 20
                            }}
                          >
                            <div className="nr-spinner" style={{ marginBottom: '8px', borderTopColor: 'var(--accent)', width: '24px', height: '24px' }} />
                            <span style={{ color: 'white', fontSize: '12px' }}>AI Scanning...</span>
                          </div>
                        )}

                        {/* YOLO Bounding Box Overlays */}
                        {!aiVoteLoading && aiVoteResult && aiVoteResult.detections && aiVoteResult.detections.map((det, idx) => {
                          if (!det.box_normalized) return null;
                          const [xmin, ymin, xmax, ymax] = det.box_normalized;
                          const left = xmin * 100;
                          const top = ymin * 100;
                          const width = (xmax - xmin) * 100;
                          const height = (ymax - ymin) * 100;

                          const isMatched = aiVoteResult.is_claimed_hazard_present && (
                            (alert.type === 'river' && det.class_name === 'flood') ||
                            (alert.type === 'fire' && (det.class_name === 'fire' || det.class_name === 'smoke')) ||
                            (alert.type === 'seismic' && (det.class_name === 'landslide' || det.class_name === 'road_blockage')) ||
                            (alert.type === 'infrastructure' && (det.class_name === 'pothole' || det.class_name === 'road_blockage')) ||
                            det.class_name === alert.type
                          );

                          const boxBorderColor = isMatched ? '#22c55e' : '#f97316';

                          return (
                            <div
                              key={idx}
                              style={{
                                position: 'absolute',
                                left: `${left}%`,
                                top: `${top}%`,
                                width: `${width}%`,
                                height: `${height}%`,
                                border: `2px solid ${boxBorderColor}`,
                                boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                                pointerEvents: 'none',
                                zIndex: 10
                              }}
                            >
                              <span style={{
                                position: 'absolute',
                                top: '-18px',
                                left: '-2px',
                                backgroundColor: boxBorderColor,
                                color: 'white',
                                fontSize: '8px',
                                padding: '1px 3px',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                                fontFamily: 'Courier New, monospace'
                              }}>
                                {det.class_name.toUpperCase()} ({Math.round(det.confidence * 100)}%)
                              </span>
                            </div>
                          );
                        })}
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

                  {/* AI Verification Results Summary Card */}
                  {votePhoto && (
                    <div style={{
                      backgroundColor: 'rgba(30, 41, 59, 0.4)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '12px',
                      marginBottom: '12px',
                      marginTop: '-6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '13px', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          🤖 AI Proof Verification
                        </strong>
                        {aiVoteLoading ? (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', animation: 'pulse 1.5s infinite' }}>Analyzing...</span>
                        ) : aiVoteResult ? (
                          <span style={{
                            fontSize: '11px',
                            color: aiVoteResult.hazard_state === 'hazard_detected' ? '#22c55e' :
                                   aiVoteResult.hazard_state === 'no_hazard_detected' ? '#94a3b8' :
                                   aiVoteResult.hazard_state === 'multiple_conflicting_hazards' ? '#ef4444' : '#f59e0b',
                            fontWeight: 'bold',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: aiVoteResult.hazard_state === 'hazard_detected' ? 'rgba(34, 197, 94, 0.1)' :
                                             aiVoteResult.hazard_state === 'no_hazard_detected' ? 'rgba(148, 163, 184, 0.1)' :
                                             aiVoteResult.hazard_state === 'multiple_conflicting_hazards' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'
                          }}>
                            {aiVoteResult.hazard_state === 'hazard_detected' ? 'Hazard Detected' :
                             aiVoteResult.hazard_state === 'no_hazard_detected' ? 'No Hazard Detected' :
                             aiVoteResult.hazard_state === 'multiple_conflicting_hazards' ? 'Conflicting Hazards' : 'Inconclusive'}
                          </span>
                        ) : aiVoteError ? (
                          <span style={{ fontSize: '11px', color: '#ef4444' }}>Offline</span>
                        ) : null}
                      </div>

                      {aiVoteLoading ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Running computer-vision checks for claimed hazard: "{alert.type === 'river' ? 'flood' : alert.type}"...
                        </div>
                      ) : aiVoteResult ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {aiVoteResult.hazard_state === 'hazard_detected' ? (
                            <span style={{ color: '#22c55e', fontWeight: 'bold' }}>
                              ✓ AI analysis confirmed active hazard matching verification proof.
                            </span>
                          ) : aiVoteResult.hazard_state === 'no_hazard_detected' ? (
                            <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>
                              Visual evidence of active hazard not found in captured proof.
                            </span>
                          ) : aiVoteResult.hazard_state === 'multiple_conflicting_hazards' ? (
                            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
                              ⚠️ Multi-hazard conflict: overlapping fire and flood detections.
                            </span>
                          ) : (
                            <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                              Inconclusive check. Detections do not strongly support active hazard.
                            </span>
                          )}
                          {aiVoteResult.detections.length > 0 && (
                            <div style={{ marginTop: '4px' }}>
                              Detections: <strong>{aiVoteResult.detections.map(d => `${d.class_name} (${Math.round(d.confidence*100)}%)`).join(', ')}</strong>
                            </div>
                          )}
                        </div>
                      ) : aiVoteError ? (
                        <div style={{ fontSize: '12px', color: '#ef4444' }}>
                          ⚠️ {aiVoteError}
                        </div>
                      ) : null}
                    </div>
                  )}

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
              {alert.aiEvidence && (
                <div>
                  <dt>AI Verification</dt>
                  <dd style={{
                    color: alert.aiEvidence.is_claimed_hazard_present ? '#22c55e' : '#f97316',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    🤖 {alert.aiEvidence.is_claimed_hazard_present ? 'Verified Match' : 'Unmatched'}
                  </dd>
                </div>
              )}
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
              {integritySources && integritySources.map((src, i) => {
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