/**
 * Database Seed Script
 *
 * Populates MongoDB with:
 * - 5 mock users (matching the frontend's MOCK_USERS)
 * - 9 mock alerts (matching MOCK_ALERTS)
 * - Sample notifications
 * - Sample data sources
 * - Sample evidence documents
 *
 * Usage: npm run seed
 */

import dns from 'node:dns'
dns.setServers(['1.1.1.1', '8.8.8.8'])

import 'dotenv/config'
import mongoose from 'mongoose'
import User from '../models/User.js'
import Alert from '../models/Alert.js'
import Notification from '../models/Notification.js'
import DataSource from '../models/DataSource.js'
import Evidence from '../models/Evidence.js'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hazardlens'
const DEFAULT_PASSWORD = 'password123'

// ─── Mock Users ──────────────────────────────────────────────
const USERS = [
  {
    name: 'Maya Chen',
    email: 'maya.chen@riverdale.gov',
    role: 'community',
    department: 'Riverdale Community',
    reportsCount: 1,
  },
  {
    name: 'Jordan Lee',
    email: 'jordan.lee@hazardlens.io',
    role: 'reporter',
    department: 'Field Operations',
    reportsCount: 2,
  },
  {
    name: 'Sam Rivera',
    email: 'sam.rivera@hazardlens.io',
    role: 'verifier',
    department: 'Safety Compliance',
    reportsCount: 0,
  },
  {
    name: 'Alex Morgan',
    email: 'alex.morgan@hazardlens.io',
    role: 'corrector',
    department: 'Emergency Response',
    reportsCount: 0,
  },
  {
    name: 'Dr. Priya Nair',
    email: 'priya.nair@hazardlens.io',
    role: 'admin',
    department: 'Administration',
    reportsCount: 0,
  },
]

// ─── Mock Alerts (matching frontend MOCK_ALERTS) ─────────────
const ALERTS = [
  {
    title: 'High River Levels – Riverdale River',
    description: 'River levels rising rapidly due to upstream snowmelt and recent rainfall. Multiple gauges show above-flood-stage readings. Downstream communities at risk.',
    location: 'Riverdale River, Southbank–Riverview Park corridor',
    coordinates: { type: 'Point', coordinates: [-122.676, 45.523] },
    severity: 'critical',
    type: 'river',
    status: 'pending',
    reportedBy: 'USGS AutoAlert',
    confidence: 82,
    affectedAreas: ['Southbank', 'Riverview Park', 'Eastvale'],
    sources: ['USGS Gauge', 'Local Sensors', 'Weather Forecast'],
    warningText: 'Avoid low-lying river paths and follow local guidance',
    timeline: [
      { time: new Date('2026-08-14T10:02:00Z'), actor: 'USGS AutoAlert', action: 'Gauge threshold exceeded', type: 'system' },
      { time: new Date('2026-08-14T10:45:00Z'), actor: 'System', action: 'Alert escalated to critical', type: 'system' },
    ],
  },
  {
    title: 'Moderate Fire Risk – Eastvale Hills',
    description: 'Dry conditions combined with high winds and low humidity have elevated fire risk across the Eastvale Hills area. Satellite hotspot detections confirmed.',
    location: 'Eastvale Hills, Pinecrest boundary',
    coordinates: { type: 'Point', coordinates: [-122.660, 45.512] },
    severity: 'high',
    type: 'fire',
    status: 'verified',
    reportedBy: 'Fire Weather Index',
    verifiedBy: 'Local Fire Dept',
    confidence: 68,
    affectedAreas: ['Eastvale', 'Pinecrest'],
    sources: ['Fire Weather Index', 'Satellite Hotspots', 'Local Fire Dept'],
    warningText: 'Clear dry grass and secure outdoor flammables',
    timeline: [
      { time: new Date('2026-08-14T08:30:00Z'), actor: 'Fire Weather Index', action: 'High risk threshold reached', type: 'system' },
      { time: new Date('2026-08-14T09:15:00Z'), actor: 'Local Fire Dept', action: 'Alert verified', type: 'verify' },
    ],
  },
  {
    title: 'Minor Seismic Activity Detected',
    description: 'Seismic network detected minor tremors in the Westgate–Downtown–Oakridge area. No structural damage reported. Citizens may have felt light shaking.',
    location: 'Westgate, Downtown, Oakridge',
    coordinates: { type: 'Point', coordinates: [-122.690, 45.530] },
    severity: 'low',
    type: 'seismic',
    status: 'verified',
    reportedBy: 'Seismic Network',
    verifiedBy: 'USGS Feed',
    confidence: 74,
    affectedAreas: ['Westgate', 'Downtown', 'Oakridge'],
    sources: ['Seismic Network', 'USGS Feed', 'Citizen Reports'],
    infoText: 'No action required. Stay informed.',
    timeline: [
      { time: new Date('2026-08-14T07:18:00Z'), actor: 'Seismic Network', action: 'Tremor detected M2.1', type: 'system' },
      { time: new Date('2026-08-14T07:45:00Z'), actor: 'USGS Feed', action: 'Event confirmed', type: 'verify' },
    ],
  },
  {
    title: 'Storm Warning – Possible Heavy Rain',
    description: 'National Weather Service has issued a storm warning for the Riverdale area. Heavy rainfall and potential flash flooding expected over the next 48 hours.',
    location: 'Citywide',
    coordinates: { type: 'Point', coordinates: [-122.676, 45.523] },
    severity: 'medium',
    type: 'weather',
    status: 'pending',
    reportedBy: 'National Weather Service',
    confidence: 79,
    affectedAreas: ['Citywide'],
    sources: ['National Weather Service', 'Radar', 'Rain Gauge'],
    infoText: 'Prepare for heavy rain and possible flash flooding',
    timeline: [
      { time: new Date('2026-08-14T06:00:00Z'), actor: 'National Weather Service', action: 'Storm warning issued', type: 'system' },
    ],
  },
  {
    title: 'Water Main Break – Westgate',
    description: 'A water main break has been reported in the Westgate and Northwood areas. Crews are on-site.',
    location: 'Westgate, Northwood',
    coordinates: { type: 'Point', coordinates: [-122.698, 45.535] },
    severity: 'low',
    type: 'infrastructure',
    status: 'verified',
    reportedBy: 'Crew Report',
    verifiedBy: 'City Infrastructure',
    confidence: 61,
    affectedAreas: ['Westgate', 'Northwood'],
    sources: ['City Infrastructure', 'Crew Report', 'Citizen Reports'],
    timeline: [
      { time: new Date('2026-08-14T09:40:00Z'), actor: 'Crew Report', action: 'Break location confirmed', type: 'report' },
      { time: new Date('2026-08-14T10:00:00Z'), actor: 'City Infrastructure', action: 'Repair crews dispatched', type: 'verify' },
    ],
  },
  {
    title: 'Bridge Inspection – Urgent',
    description: 'The 1st Street Bridge has been flagged for urgent structural inspection following abnormal sensor readings.',
    location: 'Southbank (1st Street Bridge)',
    coordinates: { type: 'Point', coordinates: [-122.672, 45.518] },
    severity: 'critical',
    type: 'infrastructure',
    status: 'verified',
    reportedBy: 'Infrastructure Team',
    verifiedBy: 'Engineering Report',
    confidence: 85,
    affectedAreas: ['Southbank (1st Street Bridge)'],
    sources: ['Infrastructure Team', 'Engineering Report', 'Traffic Cameras'],
    warningText: 'Use alternate route. Bridge closed to traffic.',
    timeline: [
      { time: new Date('2026-08-14T11:00:00Z'), actor: 'Infrastructure Team', action: 'Sensor anomaly flagged', type: 'report' },
      { time: new Date('2026-08-14T11:15:00Z'), actor: 'Engineering Report', action: 'Closure confirmed', type: 'verify' },
    ],
  },
  {
    title: 'Flooded Underpass – Lakeside Boulevard',
    description: 'Water has accumulated to knee-height in the Lakeside Blvd underpass after overnight rain.',
    location: 'Lakeside Blvd Underpass, Lakeside',
    coordinates: { type: 'Point', coordinates: [-122.665, 45.508] },
    severity: 'high',
    type: 'river',
    status: 'pending',
    reportedBy: 'Jordan Lee',
    confidence: 72,
    affectedAreas: ['Lakeside', 'Southbank'],
    sources: ['Citizen Report', 'Local Sensors'],
    warningText: 'Avoid the underpass — seek alternate routes',
    timeline: [
      { time: new Date('2026-08-14T07:55:00Z'), actor: 'Jordan Lee', action: 'Hazard reported by field observer', type: 'report' },
    ],
  },
  {
    title: 'Downed Power Line – Westgate Ave',
    description: 'A power line has fallen across Westgate Ave near the intersection with 3rd St following overnight wind.',
    location: 'Westgate Ave & 3rd St, Westgate Heights',
    coordinates: { type: 'Point', coordinates: [-122.695, 45.526] },
    severity: 'critical',
    type: 'infrastructure',
    status: 'pending',
    reportedBy: 'Jordan Lee',
    confidence: 88,
    affectedAreas: ['Westgate Heights', 'Northwood'],
    sources: ['Citizen Report', 'Traffic Cameras'],
    warningText: 'Do not approach — call 911 immediately',
    timeline: [
      { time: new Date('2026-08-14T08:10:00Z'), actor: 'Jordan Lee', action: 'Live downed line reported', type: 'report' },
    ],
  },
  {
    title: 'Cracked Sidewalk – Trip Hazard Near School',
    description: 'A section of sidewalk on Riverview Drive near Pinecrest Elementary has heaved and cracked.',
    location: 'Riverview Drive, Pinecrest (near elementary school)',
    coordinates: { type: 'Point', coordinates: [-122.681, 45.533] },
    severity: 'medium',
    type: 'infrastructure',
    status: 'verified',
    reportedBy: 'Maya Chen',
    verifiedBy: 'City Public Works',
    confidence: 55,
    affectedAreas: ['Pinecrest'],
    sources: ['Citizen Report'],
    infoText: 'Repair scheduled. Use alternate path around affected area.',
    timeline: [
      { time: new Date('2026-08-13T14:30:00Z'), actor: 'Maya Chen', action: 'Trip hazard reported by community member', type: 'report' },
      { time: new Date('2026-08-13T16:00:00Z'), actor: 'City Public Works', action: 'Inspection confirmed — repair scheduled', type: 'verify' },
    ],
  },
]

// ─── Data Sources ────────────────────────────────────────────
const DATA_SOURCES = [
  {
    name: 'National Weather Service',
    type: 'weather',
    description: 'NWS weather alerts and forecasts',
    reliabilityWeight: 0.9,
    status: 'active',
  },
  {
    name: 'USGS River Gauges',
    type: 'sensor',
    description: 'Real-time river level data from USGS gauge stations',
    reliabilityWeight: 0.95,
    status: 'active',
  },
  {
    name: 'USGS Seismic Network',
    type: 'seismic',
    description: 'Earthquake detection and reporting',
    reliabilityWeight: 0.95,
    status: 'active',
  },
  {
    name: 'Fire Weather Index',
    type: 'weather',
    description: 'Fire risk assessment from weather conditions',
    reliabilityWeight: 0.8,
    status: 'active',
  },
  {
    name: 'Satellite Hotspot Detection',
    type: 'satellite',
    description: 'Thermal anomaly detection from satellite imagery',
    reliabilityWeight: 0.75,
    status: 'active',
  },
  {
    name: 'City IoT Sensors',
    type: 'iot',
    description: 'Municipal sensor network (water, air, structural)',
    reliabilityWeight: 0.7,
    status: 'active',
  },
  {
    name: 'Citizen Reports',
    type: 'citizen',
    description: 'Community-submitted hazard observations',
    reliabilityWeight: 0.5,
    status: 'active',
  },
]

// ─── Seed Function ───────────────────────────────────────────
async function seed() {
  console.log('🌱 Seeding HazardLens database...')
  console.log(`   MongoDB: ${MONGO_URI}\n`)

  await mongoose.connect(MONGO_URI)
  console.log('✓ Connected to MongoDB')

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Alert.deleteMany({}),
    Notification.deleteMany({}),
    DataSource.deleteMany({}),
    Evidence.deleteMany({}),
  ])
  console.log('✓ Cleared existing data')

  // Seed users
  const users = {}
  for (const u of USERS) {
    const user = await User.create({
      ...u,
      passwordHash: DEFAULT_PASSWORD, // pre-save hook hashes this
    })
    users[u.role] = user
    console.log(`  + User: ${user.name} (${user.role}) — ${user.email}`)
  }
  console.log(`✓ Created ${USERS.length} users (password: "${DEFAULT_PASSWORD}")`)

  // Seed alerts
  const createdAlerts = []
  for (const a of ALERTS) {
    const alert = await Alert.create(a)
    createdAlerts.push(alert)
  }
  console.log(`✓ Created ${ALERTS.length} alerts`)

  // Seed data sources
  for (const ds of DATA_SOURCES) {
    await DataSource.create(ds)
  }
  console.log(`✓ Created ${DATA_SOURCES.length} data sources`)

  // Seed sample evidence for the first few alerts
  const sampleEvidence = [
    {
      alertId: createdAlerts[0]._id, // River levels
      sourceType: 'sensor',
      sourceName: 'USGS River Gauges',
      data: { waterLevel_m: 4.2, threshold_m: 3.5, trend: 'rising' },
      observedAt: new Date('2026-08-14T10:00:00Z'),
      weight: 0.9,
      corroborates: true,
    },
    {
      alertId: createdAlerts[0]._id,
      sourceType: 'weather',
      sourceName: 'National Weather Service',
      data: { precipitation_mm: 45, forecast: 'continued heavy rain' },
      observedAt: new Date('2026-08-14T09:00:00Z'),
      weight: 0.85,
      corroborates: true,
    },
    {
      alertId: createdAlerts[1]._id, // Fire risk
      sourceType: 'satellite',
      sourceName: 'Satellite Hotspot Detection',
      data: { hotspotDetected: true, thermalAnomaly: true },
      observedAt: new Date('2026-08-14T08:15:00Z'),
      weight: 0.75,
      corroborates: true,
    },
    {
      alertId: createdAlerts[2]._id, // Seismic
      sourceType: 'seismic',
      sourceName: 'USGS Seismic Network',
      data: { magnitude: 2.1, depth_km: 8.5 },
      observedAt: new Date('2026-08-14T07:18:00Z'),
      weight: 0.95,
      corroborates: true,
    },
  ]

  await Evidence.insertMany(sampleEvidence)
  console.log(`✓ Created ${sampleEvidence.length} evidence documents`)

  // Seed notifications for first user
  const sampleNotifications = [
    {
      userId: users.community._id,
      type: 'alert',
      title: 'New critical alert',
      body: 'High river levels detected along Riverdale River.',
      read: false,
      alertId: createdAlerts[0]._id,
    },
    {
      userId: users.community._id,
      type: 'alert',
      title: 'Bridge closed to traffic',
      body: 'Bridge Inspection at 1st Street Bridge — use alternate route.',
      read: false,
      alertId: createdAlerts[5]._id,
    },
    {
      userId: users.community._id,
      type: 'status',
      title: 'Fire risk verified',
      body: 'Moderate Fire Risk in Eastvale Hills confirmed by Local Fire Dept.',
      read: true,
      alertId: createdAlerts[1]._id,
    },
    {
      userId: users.reporter._id,
      type: 'system',
      title: 'Storm warning issued',
      body: 'NWS storm warning active citywide. Heavy rain expected.',
      read: true,
      alertId: createdAlerts[3]._id,
    },
    {
      userId: users.reporter._id,
      type: 'alert',
      title: 'Water main break',
      body: 'Service disruption in Westgate and Northwood. Crews on site.',
      read: true,
      alertId: createdAlerts[4]._id,
    },
  ]

  await Notification.insertMany(sampleNotifications)
  console.log(`✓ Created ${sampleNotifications.length} notifications`)

  console.log('\n🎉 Seed complete!\n')
  console.log('Login credentials:')
  console.log('─'.repeat(50))
  for (const u of USERS) {
    console.log(`  ${u.role.padEnd(12)} ${u.email.padEnd(30)} ${DEFAULT_PASSWORD}`)
  }
  console.log('─'.repeat(50))

  await mongoose.disconnect()
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
