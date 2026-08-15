// Mock hazard alert data — Riverdale civic alerts
export const MOCK_ALERTS = [
  {
    id: 'a-001',
    title: 'High River Levels – Riverdale River',
    description: 'River levels rising rapidly due to upstream snowmelt and recent rainfall. Multiple gauges show above-flood-stage readings. Downstream communities at risk.',
    location: 'Riverdale River, Southbank–Riverview Park corridor',
    coordinates: { lat: 45.523, lng: -122.676 },
    severity: 'critical',
    type: 'river',
    status: 'pending',
    reportedBy: 'USGS AutoAlert',
    reportedAt: '2026-08-14T10:02:00Z',
    updatedAt: '2026-08-14T10:45:00Z',
    images: [
      { url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80', caption: 'River overflowing near Riverview Park path', uploader: 'USGS Field Cam', timestamp: '2026-08-14T10:05:00Z', lat: 45.523, lng: -122.676 },
      { url: 'https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?auto=format&fit=crop&w=600&q=80', caption: 'Water rising up to bridge support beams', uploader: 'Maya Chen', timestamp: '2026-08-14T10:30:00Z', lat: 45.524, lng: -122.675 }
    ],
    verifiedBy: null,
    correctedBy: null,
    confidence: 82,
    affectedAreas: ['Southbank', 'Riverview Park', 'Eastvale'],
    sources: ['USGS Gauge', 'Local Sensors', 'Weather Forecast'],
    warningText: 'Avoid low-lying river paths and follow local guidance',
    timeline: [
      { time: '2026-08-14T10:02:00Z', actor: 'USGS AutoAlert', action: 'Gauge threshold exceeded', type: 'system' },
      { time: '2026-08-14T10:45:00Z', actor: 'System', action: 'Alert escalated to critical', type: 'system' },
    ],
    integritySources: [
      { name: 'River Sensor (Gauge #14)', type: 'sensor', status: 'online', value: '4.92m (Flood Stage: 4.5m)', contribution: 30 },
      { name: 'Southbank CCTV Camera', type: 'cctv', status: 'offline', value: 'Feed Interrupted', reason: 'Local power cut due to wind damage', contribution: 20 },
      { name: 'Satellite Water Surface Map', type: 'satellite', status: 'limited', value: 'Partially Obscured', reason: 'High cloud cover in valley', contribution: 15 },
      { name: 'Doppler Weather Radar', type: 'weather', status: 'online', value: 'Rainfall: 15mm/hr', contribution: 20 },
      { name: 'Citizen Reports (Validated)', type: 'citizen', status: 'online', value: '4 reports with photos', contribution: 15 }
    ]
  },
  {
    id: 'a-002',
    title: 'Moderate Fire Risk – Eastvale Hills',
    description: 'Dry conditions combined with high winds and low humidity have elevated fire risk across the Eastvale Hills area. Satellite hotspot detections confirmed.',
    location: 'Eastvale Hills, Pinecrest boundary',
    coordinates: { lat: 45.512, lng: -122.660 },
    severity: 'high',
    type: 'fire',
    status: 'verified',
    reportedBy: 'Fire Weather Index',
    reportedAt: '2026-08-14T08:30:00Z',
    updatedAt: '2026-08-14T09:15:00Z',
    images: [
      { url: 'https://images.unsplash.com/photo-1508873696983-2df519f0397e?auto=format&fit=crop&w=600&q=80', caption: 'Dry brush fire starting near power line', uploader: 'Alex Morgan', timestamp: '2026-08-14T08:55:00Z', lat: 45.512, lng: -122.660 }
    ],
    verifiedBy: 'Local Fire Dept',
    correctedBy: null,
    confidence: 68,
    affectedAreas: ['Eastvale', 'Pinecrest'],
    sources: ['Fire Weather Index', 'Satellite Hotspots', 'Local Fire Dept'],
    warningText: 'Clear dry grass and secure outdoor flammables',
    timeline: [
      { time: '2026-08-14T08:30:00Z', actor: 'Fire Weather Index', action: 'High risk threshold reached', type: 'system' },
      { time: '2026-08-14T09:15:00Z', actor: 'Local Fire Dept', action: 'Alert verified', type: 'verify' },
    ],
    integritySources: [
      { name: 'Ground Thermal Sensor Array', type: 'sensor', status: 'online', value: 'Temp: 39°C, Humidity: 14%', contribution: 25 },
      { name: 'Pinecrest Ridge CCTV Cam', type: 'cctv', status: 'online', value: 'Visual stream active (Smoke detected)', contribution: 25 },
      { name: 'Sentinel Thermal Imaging Satellite', type: 'satellite', status: 'limited', value: 'High smoke plume distortion', reason: 'Plume obscuring immediate ground area', contribution: 20 },
      { name: 'Local Wind Vane Station', type: 'weather', status: 'online', value: 'Wind: NNE at 28km/h', contribution: 15 },
      { name: 'Citizen Smoke Sightings', type: 'citizen', status: 'online', value: '2 active calls logged', contribution: 15 }
    ]
  },
  {
    id: 'a-003',
    title: 'Minor Seismic Activity Detected',
    description: 'Seismic network detected minor tremors in the Westgate–Downtown–Oakridge area. No structural damage reported. Citizens may have felt light shaking.',
    location: 'Westgate, Downtown, Oakridge',
    coordinates: { lat: 45.530, lng: -122.690 },
    severity: 'low',
    type: 'seismic',
    status: 'verified',
    reportedBy: 'Seismic Network',
    reportedAt: '2026-08-14T07:18:00Z',
    updatedAt: '2026-08-14T07:45:00Z',
    images: [],
    verifiedBy: 'USGS Feed',
    correctedBy: null,
    confidence: 74,
    affectedAreas: ['Westgate', 'Downtown', 'Oakridge'],
    sources: ['Seismic Network', 'USGS Feed', 'Citizen Reports'],
    warningText: null,
    infoText: 'No action required. Stay informed.',
    timeline: [
      { time: '2026-08-14T07:18:00Z', actor: 'Seismic Network', action: 'Tremor detected M2.1', type: 'system' },
      { time: '2026-08-14T07:45:00Z', actor: 'USGS Feed', action: 'Event confirmed', type: 'verify' },
    ],
    integritySources: [
      { name: 'Tri-Axial Seismometer Array', type: 'sensor', status: 'online', value: 'M2.1 at 8.2km depth', contribution: 40 },
      { name: 'Downtown Traffic CCTV Cameras', type: 'cctv', status: 'online', value: 'All feeds active. No visual shaking.', contribution: 20 },
      { name: 'USGS Satellite Seismic Radar', type: 'satellite', status: 'limited', value: 'Resolution limits', reason: 'Tremor magnitude below satellite deformation resolution', contribution: 15 },
      { name: 'Atmospheric Air Pressure Gauge', type: 'weather', status: 'online', value: '1013 hPa', contribution: 10 },
      { name: 'Citizen Felt-It Survey Reports', type: 'citizen', status: 'online', value: '8 reports filed', contribution: 15 }
    ]
  },
  {
    id: 'a-004',
    title: 'Storm Warning – Possible Heavy Rain',
    description: 'National Weather Service has issued a storm warning for the Riverdale area. Heavy rainfall and potential flash flooding expected over the next 48 hours. Prepare for possible road closures.',
    location: 'Citywide',
    coordinates: { lat: 45.523, lng: -122.676 },
    severity: 'medium',
    type: 'weather',
    status: 'pending',
    reportedBy: 'National Weather Service',
    reportedAt: '2026-08-14T06:00:00Z',
    updatedAt: '2026-08-14T06:00:00Z',
    images: [],
    verifiedBy: null,
    correctedBy: null,
    confidence: 79,
    affectedAreas: ['Citywide'],
    sources: ['National Weather Service', 'Radar', 'Rain Gauge'],
    warningText: null,
    infoText: 'Prepare for heavy rain and possible flash flooding',
    timeline: [
      { time: '2026-08-14T06:00:00Z', actor: 'National Weather Service', action: 'Storm warning issued', type: 'system' },
    ],
    integritySources: [
      { name: 'NWS Precipitation Radar Network', type: 'sensor', status: 'online', value: 'Reflectivity: 45 dBZ', contribution: 30 },
      { name: 'Highway Monitoring CCTV Network', type: 'cctv', status: 'online', value: 'Visual stream active (Rain/Slick roads)', contribution: 20 },
      { name: 'GOES-R Meteorological Satellite', type: 'satellite', status: 'online', value: 'Visual & Infrared bands active', contribution: 20 },
      { name: 'Ground Rain Gauge Stations', type: 'weather', status: 'online', value: 'Accumulation: 22mm', contribution: 20 },
      { name: 'Citizen Incident Submissions', type: 'citizen', status: 'online', value: 'No flooding reports yet', contribution: 10 }
    ]
  },
  {
    id: 'a-005',
    title: 'Water Main Break – Westgate',
    description: 'A water main break has been reported in the Westgate and Northwood areas. Crews are on-site. Expect reduced water pressure and potential traffic disruption.',
    location: 'Westgate, Northwood',
    coordinates: { lat: 45.535, lng: -122.698 },
    severity: 'low',
    type: 'infrastructure',
    status: 'verified',
    reportedBy: 'Crew Report',
    reportedAt: '2026-08-14T09:40:00Z',
    updatedAt: '2026-08-14T10:00:00Z',
    images: [
      { url: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&w=600&q=80', caption: 'Water pooling on pavement from main line', uploader: 'City Engineer', timestamp: '2026-08-14T09:45:00Z', lat: 45.535, lng: -122.698 }
    ],
    verifiedBy: 'City Infrastructure',
    correctedBy: null,
    confidence: 61,
    affectedAreas: ['Westgate', 'Northwood'],
    sources: ['City Infrastructure', 'Crew Report', 'Citizen Reports'],
    warningText: null,
    timeline: [
      { time: '2026-08-14T09:40:00Z', actor: 'Crew Report', action: 'Break location confirmed', type: 'report' },
      { time: '2026-08-14T10:00:00Z', actor: 'City Infrastructure', action: 'Repair crews dispatched', type: 'verify' },
    ],
    integritySources: [
      { name: 'District Flow Pressure Transducer', type: 'sensor', status: 'online', value: 'Pressure Drop: -32%', contribution: 30 },
      { name: 'Westgate Ave Intersection CCTV', type: 'cctv', status: 'offline', value: 'Signal Unavailable', reason: 'CCTV offline due to street cabinet maintenance', contribution: 20 },
      { name: 'High-Res Optical Land Survey Satellite', type: 'satellite', status: 'limited', value: 'Low orbit coverage gap', reason: 'Next orbit pass in 4 hours', contribution: 15 },
      { name: 'Local Station Weather Log', type: 'weather', status: 'online', value: 'Dry (No rain interference)', contribution: 15 },
      { name: 'Citizen Flow Rate Phone Calls', type: 'citizen', status: 'online', value: '3 verified reports', contribution: 20 }
    ]
  },
  {
    id: 'a-006',
    title: 'Bridge Inspection – Urgent',
    description: 'The 1st Street Bridge has been flagged for urgent structural inspection following abnormal sensor readings. The bridge is closed to all traffic pending engineering review.',
    location: 'Southbank (1st Street Bridge)',
    coordinates: { lat: 45.518, lng: -122.672 },
    severity: 'critical',
    type: 'infrastructure',
    status: 'verified',
    reportedBy: 'Infrastructure Team',
    reportedAt: '2026-08-14T11:00:00Z',
    updatedAt: '2026-08-14T11:15:00Z',
    images: [],
    verifiedBy: 'Engineering Report',
    correctedBy: null,
    confidence: 85,
    affectedAreas: ['Southbank (1st Street Bridge)'],
    sources: ['Infrastructure Team', 'Engineering Report', 'Traffic Cameras'],
    warningText: 'Use alternate route. Bridge closed to traffic.',
    timeline: [
      { time: '2026-08-14T11:00:00Z', actor: 'Infrastructure Team', action: 'Sensor anomaly flagged', type: 'report' },
      { time: '2026-08-14T11:15:00Z', actor: 'Engineering Report', action: 'Closure confirmed', type: 'verify' },
    ],
    integritySources: [
      { name: 'Bridge Strain Gauges & Accelerometer', type: 'sensor', status: 'online', value: 'Vibration anomaly detected', contribution: 35 },
      { name: 'Bridge Entrance CCTV Cam #01', type: 'cctv', status: 'online', value: 'Feed active (Barricades visible)', contribution: 25 },
      { name: 'Infrastructure Radar Satellite (InSAR)', type: 'satellite', status: 'limited', value: 'Deflection signal detected', reason: 'Slight orbital radar shadow at bridge base', contribution: 15 },
      { name: 'Wind Meter (Bridge Deck)', type: 'weather', status: 'online', value: 'Wind: NW at 14km/h (Safe)', contribution: 10 },
      { name: 'Citizen Traffic Detour Reports', type: 'citizen', status: 'online', value: '12 active traffic alerts', contribution: 15 }
    ]
  },
  {
    id: 'a-007',
    title: 'Flooded Underpass – Lakeside Boulevard',
    description: 'Water has accumulated to knee-height in the Lakeside Blvd underpass after overnight rain. Vehicles are attempting to drive through. Hazard cones knocked over.',
    location: 'Lakeside Blvd Underpass, Lakeside',
    coordinates: { lat: 45.508, lng: -122.665 },
    severity: 'high',
    type: 'river',
    status: 'pending',
    reportedBy: 'Jordan Lee',
    reportedAt: '2026-08-14T07:55:00Z',
    updatedAt: '2026-08-14T07:55:00Z',
    images: [],
    verifiedBy: null,
    correctedBy: null,
    confidence: 72,
    affectedAreas: ['Lakeside', 'Southbank'],
    sources: ['Citizen Report', 'Local Sensors'],
    warningText: 'Avoid the underpass — seek alternate routes',
    timeline: [
      { time: '2026-08-14T07:55:00Z', actor: 'Jordan Lee', action: 'Hazard reported by field observer', type: 'report' },
    ],
    integritySources: [
      { name: 'Underpass Depth Sensor', type: 'sensor', status: 'online', value: 'Depth: 45cm (Threshold exceeded)', contribution: 30 },
      { name: 'Lakeside Underpass CCTV Feed', type: 'offline', value: 'Feed Offline', reason: 'Short-circuit due to flooding in power cabinet', contribution: 20 },
      { name: 'Micro-Rad Satellite Mapping', type: 'satellite', status: 'limited', value: 'Obscured', reason: 'Heavy canopy and concrete structure block', contribution: 15 },
      { name: 'Local Precipitation Station', type: 'weather', status: 'online', value: 'Rainfall: 18mm cumulative', contribution: 15 },
      { name: 'Citizen Roadblock Uploads', type: 'citizen', status: 'online', value: '2 active flooding reports', contribution: 20 }
    ]
  },
  {
    id: 'a-008',
    title: 'Downed Power Line – Westgate Ave',
    description: 'A power line has fallen across Westgate Ave near the intersection with 3rd St following overnight wind. The line appears live — area is not yet barricaded.',
    location: 'Westgate Ave & 3rd St, Westgate Heights',
    coordinates: { lat: 45.526, lng: -122.695 },
    severity: 'critical',
    type: 'infrastructure',
    status: 'pending',
    reportedBy: 'Jordan Lee',
    reportedAt: '2026-08-14T08:10:00Z',
    updatedAt: '2026-08-14T08:10:00Z',
    images: [],
    verifiedBy: null,
    correctedBy: null,
    confidence: 88,
    affectedAreas: ['Westgate Heights', 'Northwood'],
    sources: ['Citizen Report', 'Traffic Cameras'],
    warningText: 'Do not approach — call 911 immediately',
    timeline: [
      { time: '2026-08-14T08:10:00Z', actor: 'Jordan Lee', action: 'Live downed line reported', type: 'report' },
    ],
    integritySources: [
      { name: 'Grid Smart Meter Telemetry', type: 'sensor', status: 'online', value: 'Zero-voltage fault detected (Line 3)', contribution: 30 },
      { name: 'Westgate 3rd St CCTV Camera', type: 'cctv', status: 'online', value: 'Feed active (Line sparks/hazard visible)', contribution: 30 },
      { name: 'Optical Hazard Satellite (Lidar)', type: 'satellite', status: 'limited', value: 'Blocked by clouds', reason: 'Overnight cloud deck prevents optical lidar mapping', contribution: 10 },
      { name: 'Anemometer Station (Heights)', type: 'weather', status: 'online', value: 'Gusts up to 65km/h', contribution: 15 },
      { name: 'Citizen Direct Emergency Calls', type: 'citizen', status: 'online', value: '4 reports with fire dept dispatch', contribution: 15 }
    ]
  },
  {
    id: 'a-009',
    title: 'Cracked Sidewalk – Trip Hazard Near School',
    description: 'A section of sidewalk on Riverview Drive near Pinecrest Elementary has heaved and cracked, creating a significant trip hazard for students and pedestrians.',
    location: 'Riverview Drive, Pinecrest (near elementary school)',
    coordinates: { lat: 45.533, lng: -122.681 },
    severity: 'medium',
    type: 'infrastructure',
    status: 'verified',
    reportedBy: 'Maya Chen',
    reportedAt: '2026-08-13T14:30:00Z',
    updatedAt: '2026-08-13T16:00:00Z',
    images: [],
    verifiedBy: 'City Public Works',
    correctedBy: null,
    confidence: 55,
    affectedAreas: ['Pinecrest'],
    sources: ['Citizen Report'],
    warningText: null,
    infoText: 'Repair scheduled. Use alternate path around affected area.',
    timeline: [
      { time: '2026-08-13T14:30:00Z', actor: 'Maya Chen', action: 'Trip hazard reported by community member', type: 'report' },
      { time: '2026-08-13T16:00:00Z', actor: 'City Public Works', action: 'Inspection confirmed — repair scheduled', type: 'verify' },
    ],
    integritySources: [
      { name: 'Sidewalk Tilting Inclinometer', type: 'sensor', status: 'offline', value: 'Offline', reason: 'No sensor installed on pedestrian path', contribution: 20 },
      { name: 'Pinecrest School Crossing CCTV', type: 'cctv', status: 'online', value: 'Feed online (Sidewalk blocked by cones)', contribution: 30 },
      { name: 'High-Res Optical Land Satellite', type: 'satellite', status: 'limited', value: 'Low resolution', reason: '1m grid resolution cannot detect 5cm crack', contribution: 10 },
      { name: 'Pinecrest Local Weather Station', type: 'weather', status: 'online', value: 'Clear sky', contribution: 10 },
      { name: 'Citizen Pedestrian Submissions', type: 'citizen', status: 'online', value: '1 report submitted', contribution: 30 }
    ]
  },
]

export const MOCK_SHELTERS = [
  { id: 's-001', name: 'Riverdale High School', address: '104 Westgate Ave, Westgate Heights', x: 26, y: 19, capacity: 420, maxCapacity: 600, status: 'open', type: 'Primary Evacuation Center' },
  { id: 's-002', name: 'Oakridge Sports Arena', address: '502 Pine St, Oakridge', x: 28, y: 75, capacity: 180, maxCapacity: 500, status: 'open', type: 'Secondary Shelter' },
  { id: 's-003', name: 'Eastvale Civic Center', address: '88 Hills Drive, Eastvale', x: 75, y: 55, capacity: 400, maxCapacity: 400, status: 'full', type: 'Emergency Shelter (FULL)' },
]

export const MOCK_ROUTES = [
  {
    id: 'r-001',
    name: 'Southbank Evacuation Route',
    points: [[60, 37], [45, 30], [35, 23], [26, 19]],
    description: 'Path from Southbank River Path leading to Riverdale High School Shelter.'
  },
  {
    id: 'r-002',
    name: 'Oakridge Safety Path',
    points: [[36, 82], [32, 79], [28, 75]],
    description: 'Direct route from Westgate / Oakridge junction to Oakridge Sports Arena.'
  },
  {
    id: 'r-003',
    name: 'Eastvale Bypass',
    points: [[63, 62], [70, 58], [75, 55]],
    description: 'Alternative pathway avoiding fire perimeter, leading to Eastvale Civic Center.'
  }
]


export const MOCK_NOTIFICATIONS = [
  { id: 'n-001', type: 'alert', title: 'New critical alert', body: 'High river levels detected along Riverdale River.', time: '2026-08-14T10:45:00Z', read: false, alertId: 'a-001' },
  { id: 'n-002', type: 'alert', title: 'Bridge closed to traffic', body: 'Bridge Inspection at 1st Street Bridge — use alternate route.', time: '2026-08-14T11:15:00Z', read: false, alertId: 'a-006' },
  { id: 'n-003', type: 'status', title: 'Fire risk verified', body: 'Moderate Fire Risk in Eastvale Hills confirmed by Local Fire Dept.', time: '2026-08-14T09:15:00Z', read: true, alertId: 'a-002' },
  { id: 'n-004', type: 'system', title: 'Storm warning issued', body: 'NWS storm warning active citywide. Heavy rain expected.', time: '2026-08-14T06:00:00Z', read: true, alertId: 'a-004' },
  { id: 'n-005', type: 'alert', title: 'Water main break', body: 'Service disruption in Westgate and Northwood. Crews on site.', time: '2026-08-14T10:00:00Z', read: true, alertId: 'a-005' },
]

export const HAZARD_TYPES = [
  { value: 'river',          label: 'River / Flood' },
  { value: 'fire',           label: 'Fire Risk' },
  { value: 'seismic',        label: 'Seismic Activity' },
  { value: 'weather',        label: 'Weather Event' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'other',          label: 'Other' },
]

export const SEVERITY_LEVELS = [
  { value: 'critical', label: 'Critical', color: 'var(--sev-critical)' },
  { value: 'high',     label: 'High',     color: 'var(--sev-high)' },
  { value: 'medium',   label: 'Medium',   color: 'var(--sev-medium)' },
  { value: 'low',      label: 'Low',      color: 'var(--sev-low)' },
]

export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}
