/**
 * Stage 3 — Data Enrichment Service
 *
 * Pluggable adapter pattern for external data sources.
 * When a new alert is created, this service:
 * 1. Queries registered data source adapters for relevant data
 * 2. Creates Evidence documents for each corroborating data point
 * 3. Resolves contradictions between sources
 * 4. Triggers confidence recomputation
 */

import Evidence from '../models/Evidence.js'
import DataSource from '../models/DataSource.js'
import { updateAlertConfidence } from './confidence.service.js'
import { updateHazardAssessment } from './hazard.service.js'

/**
 * Data source adapters registry.
 * Each adapter is a function: (alert) => Promise<EvidenceData[]>
 *
 * For now these return simulated data. Swap in real API calls when ready.
 */
const adapters = {
  /**
   * Simulated weather data adapter.
   */
  weather: async (alert) => {
    // In production: call OpenWeatherMap / NWS API
    if (!['river', 'weather'].includes(alert.type)) return []

    return [{
      sourceType: 'weather',
      sourceName: 'Weather Service (simulated)',
      data: {
        condition: 'Heavy Rain',
        precipitation_mm: 45,
        wind_kph: 30,
        humidity_pct: 92,
      },
      observedAt: new Date(),
      weight: 0.7,
      corroborates: true,
      relevanceHalfLifeHours: 6,
    }]
  },

  /**
   * Simulated sensor/IoT adapter.
   */
  sensor: async (alert) => {
    if (!['river', 'infrastructure'].includes(alert.type)) return []

    return [{
      sourceType: 'sensor',
      sourceName: 'River Gauge Network (simulated)',
      data: {
        waterLevel_m: 4.2,
        threshold_m: 3.5,
        trend: 'rising',
        rateOfChange_cm_hr: 8,
      },
      observedAt: new Date(),
      weight: 0.85,
      corroborates: true,
      relevanceHalfLifeHours: 4,
    }]
  },

  /**
   * Simulated satellite/remote sensing adapter.
   */
  satellite: async (alert) => {
    if (!['fire', 'weather'].includes(alert.type)) return []

    return [{
      sourceType: 'satellite',
      sourceName: 'Satellite Hotspot Detection (simulated)',
      data: {
        hotspotDetected: true,
        thermalAnomaly: true,
        confidenceLevel: 0.78,
      },
      observedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
      weight: 0.75,
      corroborates: true,
      relevanceHalfLifeHours: 12,
    }]
  },

  /**
   * Simulated seismic network adapter.
   */
  seismic: async (alert) => {
    if (alert.type !== 'seismic') return []

    return [{
      sourceType: 'seismic',
      sourceName: 'USGS Seismic Network (simulated)',
      data: {
        magnitude: 2.1,
        depth_km: 8.5,
        eventType: 'earthquake',
        feltReports: 12,
      },
      observedAt: new Date(),
      weight: 0.9,
      corroborates: true,
      relevanceHalfLifeHours: 48,
    }]
  },
}

/**
 * Enrich an alert by querying all relevant data source adapters.
 * Creates Evidence documents and recomputes confidence.
 *
 * @param {object} alert - The Mongoose alert document
 * @returns {Promise<{ evidenceCount: number, confidence: number }>}
 */
export async function enrichAlert(alert) {
  const allEvidence = []

  // Run all adapters in parallel
  const adapterNames = Object.keys(adapters)
  const results = await Promise.allSettled(
    adapterNames.map(name => adapters[name](alert))
  )

  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled') {
      allEvidence.push(...results[i].value)
    } else {
      console.warn(`Adapter "${adapterNames[i]}" failed:`, results[i].reason)
    }
  }

  // Create a citizen report evidence entry from the alert itself
  allEvidence.push({
    sourceType: 'citizen',
    sourceName: alert.reportedBy || 'Citizen Report',
    data: {
      description: alert.description,
      hazardType: alert.type,
      severityEstimate: alert.severity,
      hasImages: (alert.images?.length || 0) > 0,
    },
    observedAt: alert.createdAt || new Date(),
    weight: 0.5,
    corroborates: true,
    relevanceHalfLifeHours: 24,
  })

  // Bulk insert evidence
  if (allEvidence.length > 0) {
    const docs = allEvidence.map(ev => ({
      ...ev,
      alertId: alert._id,
    }))
    await Evidence.insertMany(docs)

    // Update alert sources list
    const newSources = [...new Set([
      ...(alert.sources || []),
      ...allEvidence.map(e => e.sourceName),
    ])]
    alert.sources = newSources

    // Add enrichment timeline entry
    alert.timeline.push({
      time: new Date(),
      actor: 'Enrichment Engine',
      action: `${allEvidence.length} evidence source(s) collected and cross-checked`,
      type: 'enrich',
    })
  }

  // Recompute confidence
  const confidence = await updateAlertConfidence(alert)

  // Run hazard assessment
  await updateHazardAssessment(alert, confidence)

  return {
    evidenceCount: allEvidence.length,
    confidence,
  }
}

/**
 * Register a new adapter at runtime.
 */
export function registerAdapter(name, adapterFn) {
  adapters[name] = adapterFn
}
