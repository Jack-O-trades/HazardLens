/**
 * Stage 4 — Evidence Fusion Engine
 *
 * Takes an alert and its associated evidence array, then computes
 * an aggregate confidence score (0–100).
 *
 * Algorithm:
 * 1. Weight each evidence piece by source reliability
 * 2. Apply recency decay (fresher evidence counts more)
 * 3. Corroboration bonus: multiple independent sources boost confidence
 * 4. Contradiction penalty: conflicting evidence reduces confidence
 */

import Evidence from '../models/Evidence.js'

/**
 * Calculate the recency factor for a piece of evidence.
 * Returns 1.0 for very fresh evidence, decaying toward 0 based on half-life.
 */
function recencyFactor(observedAt, halfLifeHours = 24) {
  const ageHours = (Date.now() - new Date(observedAt).getTime()) / (1000 * 60 * 60)
  return Math.pow(0.5, ageHours / halfLifeHours)
}

/**
 * Compute corroboration bonus.
 * More independent sources = higher bonus, with diminishing returns.
 */
function corroborationBonus(corroboratingCount) {
  if (corroboratingCount <= 1) return 0
  // Logarithmic scale: 2 sources = +8, 3 = +12, 5 = +16, 10 = +20
  return Math.min(20, 8 * Math.log2(corroboratingCount))
}

/**
 * Compute the aggregate confidence score for an alert.
 *
 * @param {string} alertId - The alert's MongoDB _id
 * @returns {Promise<{ confidence: number, breakdown: object }>}
 */
export async function computeConfidence(alertId) {
  const evidenceList = await Evidence.find({ alertId }).lean()

  // No evidence — return baseline
  if (evidenceList.length === 0) {
    return {
      confidence: 50,
      breakdown: {
        baseScore: 50,
        evidenceCount: 0,
        corroboratingCount: 0,
        contradictingCount: 0,
        recencyAvg: 0,
        corroborationBonus: 0,
        contradictionPenalty: 0,
      },
    }
  }

  const corroborating = evidenceList.filter(e => e.corroborates)
  const contradicting = evidenceList.filter(e => !e.corroborates)

  // Weighted score from corroborating evidence
  let weightedSum = 0
  let totalWeight = 0

  for (const ev of corroborating) {
    const recency = recencyFactor(ev.observedAt, ev.relevanceHalfLifeHours || 24)
    const effectiveWeight = ev.weight * recency
    weightedSum += effectiveWeight * 100 // Scale to 0–100
    totalWeight += effectiveWeight
  }

  const baseScore = totalWeight > 0 ? weightedSum / totalWeight : 50

  // Count unique source types for corroboration
  const uniqueSources = new Set(corroborating.map(e => e.sourceType))
  const bonus = corroborationBonus(uniqueSources.size)

  // Contradiction penalty: each contradicting piece reduces score
  const contradictionPenalty = contradicting.reduce((penalty, ev) => {
    const recency = recencyFactor(ev.observedAt, ev.relevanceHalfLifeHours || 24)
    return penalty + (ev.weight * recency * 15) // Up to 15 points per contradiction
  }, 0)

  // Average recency across all evidence
  const recencyAvg = evidenceList.reduce((sum, ev) => {
    return sum + recencyFactor(ev.observedAt, ev.relevanceHalfLifeHours || 24)
  }, 0) / evidenceList.length

  // Final confidence: clamp to 0–100
  const confidence = Math.round(
    Math.max(0, Math.min(100, baseScore + bonus - contradictionPenalty))
  )

  return {
    confidence,
    breakdown: {
      baseScore: Math.round(baseScore),
      evidenceCount: evidenceList.length,
      corroboratingCount: corroborating.length,
      contradictingCount: contradicting.length,
      uniqueSources: uniqueSources.size,
      recencyAvg: Math.round(recencyAvg * 100) / 100,
      corroborationBonus: Math.round(bonus),
      contradictionPenalty: Math.round(contradictionPenalty),
    },
  }
}

/**
 * Recompute and update the confidence score on an alert document.
 */
export async function updateAlertConfidence(alert) {
  const { confidence } = await computeConfidence(alert._id)
  alert.confidence = confidence
  await alert.save()
  return confidence
}
