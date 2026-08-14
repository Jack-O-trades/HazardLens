import { createContext, useContext, useState, useCallback } from 'react'
import { MOCK_ALERTS } from '../data/mockData'

const ALERTS_KEY = 'hl_alerts'
const DRAFT_KEY = 'hl_report_draft'

function loadAlerts() {
  try {
    const raw = localStorage.getItem(ALERTS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* use defaults */ }
  return [...MOCK_ALERTS]
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
      coordinates: { lat: 45.523, lng: -122.676 },
      severity: severityMap[report.severity] || 'medium',
      type: typeMap[report.hazardType] || 'other',
      status: 'pending',
      reportedBy: report.reportedBy,
      reportedAt: now,
      updatedAt: now,
      images: report.photos || [],
      verifiedBy: null,
      correctedBy: null,
      confidence: 55,
      affectedAreas: ['Riverdale'],
      sources: ['Citizen Report'],
      warningText: null,
      timeline: [
        { time: now, actor: report.reportedBy, action: 'Hazard reported via mobile app', type: 'report' },
      ],
    }
    persist([alert, ...alerts])
    localStorage.removeItem(DRAFT_KEY)
    return alert
  }, [alerts, persist])

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
      correctAlert,
      resolveAlert,
      refreshAlerts,
      saveDraft,
      loadDraft,
      clearDraft,
      unreadNotificationCount,
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
