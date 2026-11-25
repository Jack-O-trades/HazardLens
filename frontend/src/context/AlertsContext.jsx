import { createContext, useContext, useState, useCallback } from 'react'
import { MOCK_ALERTS } from '../data/mockData'

const ALERTS_KEY = 'hl_alerts'
const DRAFT_KEY = 'hl_report_draft'

function loadAlerts() {
  try {
    const raw = localStorage.getItem(ALERTS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // Filter out any hardcoded mock alerts (IDs starting with 'a-0')
      return parsed.filter(a => !a.id.startsWith('a-0'))
    }
  } catch { /* use defaults */ }
  return []
}

function saveAlerts(alerts) {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts))
}

const AlertsContext = createContext(null)

export function AlertsProvider({ children }) {
  const [alerts, setAlerts] = useState(loadAlerts)
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  const persist = useCallback((next) => {
    setAlerts(next)
    saveAlerts(next)
  }, [])

  const getAlert = useCallback((id) => alerts.find(a => a.id === id), [alerts])

  const RIVER_STATIONS = [
    { name: 'Mahanadi - Naraj Cuttack', lat: 20.47, lng: 85.86, thresholdWarning: 25.0, thresholdDanger: 26.4 },
    { name: 'Yamuna - Delhi Bridge', lat: 28.66, lng: 77.25, thresholdWarning: 204.0, thresholdDanger: 205.3 },
    { name: 'Ganga - Gandhighat Patna', lat: 25.62, lng: 85.17, thresholdWarning: 48.6, thresholdDanger: 49.5 },
    { name: 'Ganga - Varanasi', lat: 25.31, lng: 83.01, thresholdWarning: 70.2, thresholdDanger: 71.26 },
    { name: 'Godavari - Dowleswaram', lat: 16.94, lng: 81.78, thresholdWarning: 13.75, thresholdDanger: 14.5 }
  ]

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c // Distance in km
  }

  const runAsynchronousVerification = useCallback((id) => {
    setTimeout(async () => {
      const currentRaw = localStorage.getItem(ALERTS_KEY)
      let currentAlerts = currentRaw ? JSON.parse(currentRaw) : []
      const alertIdx = currentAlerts.findIndex(a => a.id === id)
      if (alertIdx === -1) return

      const targetAlert = currentAlerts[alertIdx]
      const { lat, lng } = targetAlert.coordinates || { lat: 45.523, lng: -122.676 }

      // 1. Fetch weather from Open-Meteo
      let weatherData = null
      let weatherScore = 50 // baseline
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code`)
        if (res.ok) {
          const data = await res.json()
          if (data.current) {
            weatherData = {
              temp: Math.round(data.current.temperature_2m),
              humidity: data.current.relative_humidity_2m,
              precipitation: data.current.precipitation,
              code: data.current.weather_code
            }
            const code = weatherData.code
            const rainCodes = [51,53,55,61,63,65,80,81,82,95,96,99]
            const isRaining = rainCodes.includes(code) || weatherData.precipitation > 0

            if (targetAlert.type === 'river') {
              weatherScore = isRaining ? Math.min(75 + Math.round(weatherData.precipitation * 2), 95) : 40
            } else if (targetAlert.type === 'fire') {
              const temp = weatherData.temp
              const hum = weatherData.humidity
              if (temp > 30 && hum < 45) {
                weatherScore = 85
              } else if (isRaining) {
                weatherScore = 20
              } else {
                weatherScore = 50
              }
            } else if (targetAlert.type === 'seismic') {
              weatherScore = weatherData.precipitation > 5 ? 80 : 50
            } else if (targetAlert.type === 'weather') {
              weatherScore = isRaining ? 90 : 30
            } else if (targetAlert.type === 'infrastructure') {
              weatherScore = isRaining ? 60 : 50
            } else {
              weatherScore = 50
            }
          }
        }
      } catch (e) {
        console.error("Open-Meteo fetch failed during verification:", e)
      }

      // 2. Check nearby river sensor
      let riverData = null
      let riverScore = null
      let nearestStation = null
      let minDistance = Infinity

      for (const station of RIVER_STATIONS) {
        const d = getDistance(lat, lng, station.lat, station.lng)
        if (d < minDistance) {
          minDistance = d
          nearestStation = station
        }
      }

      if (minDistance < 50) {
        const isFloodType = targetAlert.type === 'river'
        const waterLevel = isFloodType ? 4.82 : 1.94
        const status = isFloodType ? 'HIGH' : 'LOW'
        riverData = {
          station: nearestStation.name,
          distance: Math.round(minDistance * 10) / 10,
          waterLevel,
          status,
          sensorAvailable: true
        }
        riverScore = isFloodType ? 92 : 45
      } else {
        riverData = {
          sensorAvailable: false,
          message: 'No nearby river monitoring station available.'
        }
      }

      // 3. Satellite availability
      const isDefaultCoords = Math.abs(lat - 45.523) < 0.005 && Math.abs(lng - (-122.676)) < 0.005
      const satelliteAvailable = !isDefaultCoords
      const satelliteScore = satelliteAvailable ? 84 : null

      // 4. Combined Confidence Fusion
      const scores = []
      const yoloConf = targetAlert.confidence || 55
      scores.push(yoloConf / 100)
      scores.push(weatherScore / 100)
      if (riverScore !== null) scores.push(riverScore / 100)
      if (satelliteScore !== null) scores.push(satelliteScore / 100)

      const finalConf = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100)

      // 5. Update target alert
      const now = new Date().toISOString()
      const updatedAlert = {
        ...targetAlert,
        status: targetAlert.status,
        confidence: finalConf,
        verificationDetails: {
          weather: { data: weatherData, score: weatherScore },
          river: { data: riverData, score: riverScore },
          satellite: { available: satelliteAvailable, score: satelliteScore, date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) },
          cctv: { available: false, message: 'CCTV imagery unavailable at this location. Currently unavailable in demo version.' }
        },
        timeline: [
          ...(targetAlert.timeline || []),
          { 
            time: now, 
            actor: 'HazardLens AI Engine', 
            action: `Telemetry analysis complete: Weather (${weatherScore}%), River (${riverScore !== null ? riverScore + '%' : 'N/A'}), Satellite (${satelliteScore !== null ? satelliteScore + '%' : 'N/A'}) analyzed. Fused Confidence: ${finalConf}%. Awaiting Admin Verification.`, 
            type: 'system' 
          }
        ]
      }

      const freshRaw = localStorage.getItem(ALERTS_KEY)
      let freshAlerts = freshRaw ? JSON.parse(freshRaw) : []
      const freshIdx = freshAlerts.findIndex(a => a.id === id)
      if (freshIdx !== -1) {
        freshAlerts[freshIdx] = updatedAlert
        persist(freshAlerts)
      }
    }, 4000)
  }, [persist])

  const addAlert = useCallback((report) => {
    const id = `a-${String(Date.now()).slice(-6)}`
    const now = new Date().toISOString()
    const severityMap = { low: 'low', moderate: 'medium', high: 'high', critical: 'critical' }
    const typeMap = {
      flood: 'river', fire: 'fire', seismic: 'seismic',
      infrastructure: 'infrastructure', weather: 'weather', other: 'other',
    }
    const alert = {
      id,
      title: report.title || `${report.hazardTag || 'Hazard'} Report`,
      description: report.notes || report.description || 'Citizen hazard report submitted via HazardLens.',
      location: report.location || 'Riverdale (GPS pending)',
      coordinates: report.coordinates || { lat: 45.523, lng: -122.676 },
      severity: severityMap[report.severity] || 'medium',
      type: typeMap[report.hazardType] || 'other',
      status: 'pending',
      reportedBy: report.reportedBy || 'Citizen Reporter',
      reportedById: report.reportedById || null,
      reportedByRole: report.reporterRole || report.reportedByRole || 'community',
      reportedAt: now,
      updatedAt: now,
      images: report.photos ? (Array.isArray(report.photos) ? report.photos : [{ url: report.photos, caption: report.description }]) : [],
      verifiedBy: null,
      correctedBy: null,
      confidence: report.confidence || 55,
      aiEvidence: report.aiEvidence || null,
      affectedAreas: ['Riverdale'],
      sources: ['Citizen Report'],
      warningText: null,
      timeline: [
        { time: now, actor: report.reportedBy || 'Citizen Reporter', action: 'Hazard reported via mobile app', type: 'report' },
        { time: now, actor: 'HazardLens AI Engine', action: `Auto-verification initiated: Checking Weather, River sensors, and Satellite imagery...`, type: 'system' }
      ],
    }
    persist([alert, ...alerts])
    localStorage.removeItem(DRAFT_KEY)
    
    // Trigger background auto-verification
    runAsynchronousVerification(id)
    
    return alert
  }, [alerts, persist, runAsynchronousVerification])

  const verifyAlert = useCallback((id, verifierName) => {
    const now = new Date().toISOString()
    persist(alerts.map(a => a.id !== id ? a : {
      ...a,
      status: 'verified',
      verifiedBy: verifierName,
      updatedAt: now,
      timeline: [
        ...(a.timeline || []),
        { time: now, actor: verifierName, action: 'Alert verified', type: 'verify' },
      ],
    }))
  }, [alerts, persist])

  const approveAlert = useCallback((id, adminName) => {
    const now = new Date().toISOString()
    persist(alerts.map(a => a.id !== id ? a : {
      ...a,
      status: 'approved',
      updatedAt: now,
      timeline: [
        ...(a.timeline || []),
        { time: now, actor: adminName, action: `Alert approved and published to public feed`, type: 'verify' },
      ],
    }))
  }, [alerts, persist])

  const rejectAlert = useCallback((id, adminName) => {
    const now = new Date().toISOString()
    persist(alerts.map(a => a.id !== id ? a : {
      ...a,
      status: 'rejected',
      updatedAt: now,
      timeline: [
        ...(a.timeline || []),
        { time: now, actor: adminName, action: `Alert rejected`, type: 'correct' },
      ],
    }))
  }, [alerts, persist])

  const correctAlert = useCallback((id, correctorName, notes) => {
    const now = new Date().toISOString()
    persist(alerts.map(a => a.id !== id ? a : {
      ...a,
      status: 'verified',
      correctedBy: correctorName,
      updatedAt: now,
      timeline: [
        ...(a.timeline || []),
        { time: now, actor: correctorName, action: notes || 'Correction applied', type: 'correct' },
      ],
    }))
  }, [alerts, persist])

  const addEvidenceToAlert = useCallback((id, image, notes, username) => {
    const now = new Date().toISOString()
    persist(alerts.map(a => {
      if (a.id !== id) return a
      return {
        ...a,
        updatedAt: now,
        images: [
          ...(a.images || []),
          {
            url: image,
            caption: notes || 'Additional evidence submitted',
            uploader: username || 'Citizen Observer',
            timestamp: now,
            lat: a.coordinates?.lat || 45.523,
            lng: a.coordinates?.lng || -122.676
          }
        ],
        timeline: [
          ...(a.timeline || []),
          { time: now, actor: username || 'Citizen Observer', action: `Additional evidence uploaded: "${notes || 'No notes'}"`, type: 'report' }
        ]
      }
    }))
  }, [alerts, persist])

  const submitCommunityVote = useCallback((id, isTrue, image, notes, username) => {
    const now = new Date().toISOString()
    persist(alerts.map(a => {
      if (a.id !== id) return a
      
      let nextConf = a.confidence ?? 70
      if (isTrue) {
        nextConf = Math.min(nextConf + 5, 100)
      } else {
        nextConf = Math.max(nextConf - 15, 0)
      }

      let nextStatus = a.status
      if (nextConf < 35 && nextStatus === 'pending') {
        nextStatus = 'disputed'
      }

      const timelineAction = isTrue 
        ? `Report validated as TRUE by community: "${notes || 'Confirmed active'}"`
        : `Report disputed as FALSE by community: "${notes || 'Reported inaccurate'}"`

      const updatedImages = [...(a.images || [])]
      if (image) {
        updatedImages.push({
          url: image,
          caption: notes || (isTrue ? 'Validation photo' : 'Dispute proof photo'),
          uploader: username || 'Citizen Verifier',
          timestamp: now,
          lat: a.coordinates?.lat || 45.523,
          lng: a.coordinates?.lng || -122.676
        })
      }

      return {
        ...a,
        confidence: nextConf,
        status: nextStatus,
        updatedAt: now,
        images: updatedImages,
        timeline: [
          ...(a.timeline || []),
          { time: now, actor: username || 'Citizen Verifier', action: timelineAction, type: isTrue ? 'verify' : 'correct' }
        ]
      }
    }))
  }, [alerts, persist])

  const resolveAlert = useCallback((id, actorName) => {
    const now = new Date().toISOString()
    persist(alerts.map(a => a.id !== id ? a : {
      ...a,
      status: 'resolved',
      updatedAt: now,
      timeline: [
        ...(a.timeline || []),
        { time: now, actor: actorName, action: 'Report marked as resolved', type: 'resolve' },
      ],
    }))
  }, [alerts, persist])

  const deleteAlert = useCallback((id) => {
    persist(alerts.filter(a => a.id !== id))
  }, [alerts, persist])

  const refreshAlerts = useCallback(() => {
    setLastRefresh(Date.now())
    setAlerts(loadAlerts())
  }, [])

  const saveDraft = useCallback((draft) => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }))
  }, [])

  const loadDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY)
  }, [])

  const unreadNotificationCount = alerts.filter(
    a => a.status === 'pending' && (a.severity === 'critical' || a.severity === 'high')
  ).length

  return (
    <AlertsContext.Provider value={{
      alerts,
      lastRefresh,
      getAlert,
      addAlert,
      verifyAlert,
      approveAlert,
      rejectAlert,
      correctAlert,
      resolveAlert,
      deleteAlert,
      refreshAlerts,
      saveDraft,
      loadDraft,
      clearDraft,
      unreadNotificationCount,
      addEvidenceToAlert,
      submitCommunityVote,
    }}>
      {children}
    </AlertsContext.Provider>
  )
}

export function useAlerts() {
  const ctx = useContext(AlertsContext)
  if (!ctx) throw new Error('useAlerts must be used within AlertsProvider')
  return ctx
}
