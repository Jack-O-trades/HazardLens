/**
 * Stage 5 — Hazard Assessment Service
 *
 * Takes a confidence score + alert metadata and produces:
 * - Severity score (numerical)
 * - Affected area radius (km)
 * - Recommended actions
 * - Safe route suggestions
 */

/**
 * Hazard type configuration — defines behavior per hazard type.
 */
const HAZARD_PROFILES = {
  river: {
    name: 'Flood / River',
    baseRadius: 2.0, // km
    radiusPerSeverity: 1.5,
    actions: {
      critical: 'EVACUATE low-lying areas immediately. Move to higher ground. Do not drive through flooded roads.',
      high: 'Prepare for possible evacuation. Secure valuables. Monitor water levels closely.',
      medium: 'Stay alert for rising water levels. Avoid riverbanks and flood-prone areas.',
      low: 'Monitor weather forecasts. Be aware of potential flooding in your area.',
    },
  },
  fire: {
    name: 'Fire Risk',
    baseRadius: 3.0,
    radiusPerSeverity: 2.0,
    actions: {
      critical: 'EVACUATE immediately if in the fire zone. Follow designated evacuation routes. Do not attempt to fight the fire.',
      high: 'Prepare for evacuation. Clear dry vegetation around your property. Have go-bag ready.',
      medium: 'Be fire-aware. Clear gutters and dry brush. Have an evacuation plan ready.',
      low: 'Practice fire safety. Avoid outdoor burning. Monitor fire weather forecasts.',
    },
  },
  seismic: {
    name: 'Seismic Activity',
    baseRadius: 5.0,
    radiusPerSeverity: 3.0,
    actions: {
      critical: 'DROP, COVER, and HOLD ON. After shaking stops, check for injuries and damage. Be prepared for aftershocks.',
      high: 'Secure heavy objects. Identify safe spots in each room. Prepare emergency kit.',
      medium: 'Review earthquake safety procedures. Secure tall furniture to walls.',
      low: 'No immediate action required. Stay informed about seismic activity.',
    },
  },
  weather: {
    name: 'Weather Event',
    baseRadius: 10.0,
    radiusPerSeverity: 5.0,
    actions: {
      critical: 'SEEK SHELTER immediately. Avoid windows. Stay indoors until the all-clear is given.',
      high: 'Prepare for severe weather. Secure outdoor items. Stay near shelter.',
      medium: 'Monitor weather updates. Have a plan to shelter if conditions worsen.',
      low: 'Be aware of changing weather conditions. Carry rain gear.',
    },
  },
  infrastructure: {
    name: 'Infrastructure',
    baseRadius: 0.5,
    radiusPerSeverity: 0.3,
    actions: {
      critical: 'AVOID the area immediately. Report to emergency services. Follow detour signs.',
      high: 'Stay away from damaged structures. Use alternate routes.',
      medium: 'Use caution in the area. Watch for repair crews and equipment.',
      low: 'Be aware of the situation. Minor disruptions expected.',
    },
  },
  other: {
    name: 'Other Hazard',
    baseRadius: 1.0,
    radiusPerSeverity: 0.5,
    actions: {
      critical: 'Follow emergency guidance. Avoid the affected area.',
      high: 'Exercise extreme caution. Stay informed for updates.',
      medium: 'Be aware of the hazard. Follow any posted guidance.',
      low: 'Monitor the situation. No immediate action required.',
    },
  },
}

/**
 * Convert confidence score + severity to a numerical severity score (0–100).
 */
function computeSeverityScore(confidence, severityLevel) {
  const severityMultiplier = {
    critical: 1.0,
    high: 0.75,
    medium: 0.5,
    low: 0.25,
  }
  const multiplier = severityMultiplier[severityLevel] || 0.5
  return Math.round(confidence * multiplier)
}

/**
 * Calculate the affected area radius based on hazard type and severity.
 */
function computeAffectedRadius(hazardType, severityLevel) {
  const profile = HAZARD_PROFILES[hazardType] || HAZARD_PROFILES.other
  const severityFactor = { critical: 3, high: 2, medium: 1, low: 0.5 }
  const factor = severityFactor[severityLevel] || 1
  return Math.round((profile.baseRadius + profile.radiusPerSeverity * factor) * 10) / 10
}

/**
 * Get the recommended action string.
 */
function getRecommendedAction(hazardType, severityLevel) {
  const profile = HAZARD_PROFILES[hazardType] || HAZARD_PROFILES.other
  return profile.actions[severityLevel] || profile.actions.medium
}

/**
 * Full hazard assessment for an alert.
 *
 * @param {object} alert - The alert document
 * @param {number} confidence - The computed confidence score
 * @returns {object} Assessment results
 */
export function assessHazard(alert, confidence) {
  const severity = alert.severity || 'medium'
  const hazardType = alert.type || 'other'

  const severityScore = computeSeverityScore(confidence, severity)
  const affectedRadius = computeAffectedRadius(hazardType, severity)
  const recommendedAction = getRecommendedAction(hazardType, severity)

  return {
    severityScore,
    affectedRadius,
    recommendedAction,
    safeRoutes: [], // Placeholder — would need routing API integration
    lastAssessedAt: new Date(),
  }
}

/**
 * Update the hazard assessment on an alert document and save.
 */
export async function updateHazardAssessment(alert, confidence) {
  const assessment = assessHazard(alert, confidence)
  alert.hazardAssessment = assessment
  await alert.save()
  return assessment
}

export { HAZARD_PROFILES }
