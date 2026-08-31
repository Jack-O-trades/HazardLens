import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, BellRing, BellOff, AlertTriangle, AlertCircle, ShieldCheck,
  CheckCircle2, Radio, Volume2, VolumeX, Flame, Waves, Wind,
  Thermometer, Activity, Wrench, Clock, MapPin, Filter, Search,
  X, ChevronRight, SlidersHorizontal, Layers, ExternalLink, Check,
  RotateCcw, Info, Sparkles, Smartphone, MessageSquare, Compass,
  Eye, Archive, Shield, Zap, RefreshCw
} from 'lucide-react'
import { useAlerts } from '../context/AlertsContext'
import './NotificationCenter.css'

/* ─── Base Disaster Telemetry Data ─── */
const BASE_URGENT_DISPATCHES = [
  {
    id: 'a-001',
    title: 'Flash Flood Warning — Level 4 Surge',
    area: 'Downtown Metro District (Zone 1)',
    zoneKey: 'Zone 1',
    hazardType: 'river',
    category: 'action',
    chips: [
      { label: 'NOAA EAS', type: 'source' },
      { label: 'River Gauge #R-104', type: 'sensor' },
      { label: 'Critical Evac', type: 'critical' },
    ],
    issued: '06:21 AM',
    timestamp: '18m ago',
    confidence: 89,
    confidenceLevel: 'High',
    action: 'Avoid low-lying underpasses; initiate flood gates & seek higher elevation.',
    severity: 'critical',
    unread: true,
    acknowledged: false,
  },
  {
    id: 'a-002',
    title: 'Wildfire Smoke & Particulate Spike (AQI 245)',
    area: 'Riverside County Ridge (Zone 2)',
    zoneKey: 'Zone 2',
    hazardType: 'fire',
    category: 'action',
    chips: [
      { label: 'AirNow EPA', type: 'source' },
      { label: 'Optic Sensor Grid', type: 'sensor' },
      { label: 'Hazardous Air', type: 'warning' },
    ],
    issued: '05:47 AM',
    timestamp: '52m ago',
    confidence: 78,
    confidenceLevel: 'High',
    action: 'Seal HVAC intakes, deploy N95 respirators, and keep exterior doors secured.',
    severity: 'high',
    unread: true,
    acknowledged: false,
  },
  {
    id: 'a-004',
    title: 'Gale Force High Wind Watch (Gusts to 65 mph)',
    area: 'Coastal Hills & Ridge Pass (Zone 3)',
    zoneKey: 'Zone 3',
    hazardType: 'wind',
    category: 'action',
    chips: [
      { label: 'NWS Marine', type: 'source' },
      { label: 'Anemometer Array', type: 'sensor' },
      { label: 'Advisory Watch', type: 'caution' },
    ],
    issued: '04:58 AM',
    timestamp: '1h 41m ago',
    confidence: 68,
    confidenceLevel: 'Medium',
    action: 'Secure loose structural gear, verify backup generator fuel, stand by for power toggles.',
    severity: 'medium',
    unread: false,
    acknowledged: true,
  },
]

const SENSOR_FIELD_UPDATES = [
  {
    id: 'sen-001',
    hazardType: 'river',
    category: 'sensors',
    title: 'River Basin Sensor #R-08 Crest Warning',
    sub: 'Water level reached 14.8 ft (+2.1 ft/hr surge rate)',
    area: 'Zone 2 — North River Bend',
    zoneKey: 'Zone 2',
    time: '02:31 AM',
    timestamp: '4h ago',
    severity: 'high',
    source: 'Hydrologic Sensor Mesh',
    unread: true,
  },
  {
    id: 'sen-002',
    hazardType: 'seismic',
    category: 'sensors',
    title: 'Seismic Micro-Tremor (Mag 2.4 Mww Detected)',
    sub: 'Epicenter 8.2 km NW at depth 6.1 km — No structural damage reported',
    area: 'Zone 4 — Foothills Sector',
    zoneKey: 'Zone 4',
    time: '01:54 AM',
    timestamp: '5h ago',
    severity: 'medium',
    source: 'USGS Geo Array',
    unread: false,
  },
  {
    id: 'sen-003',
    hazardType: 'infra',
    category: 'sensors',
    title: 'Substation 4B Grid Isolation Restored',
    sub: 'Auxiliary backup generators spun down; municipal power nominal',
    area: 'Zone 1 — Oakwood Sector',
    zoneKey: 'Zone 1',
    time: '01:12 AM',
    timestamp: '6h ago',
    severity: 'safe',
    source: 'Energy Dispatch Grid',
    unread: false,
  },
  {
    id: 'sen-004',
    hazardType: 'shield',
    category: 'sensors',
    title: 'Coastal Surge All Clear Declaration',
    sub: 'Tide telemetry receded below 1.2m baseline safety threshold',
    area: 'Zone 3 — Harbor District',
    zoneKey: 'Zone 3',
    time: '12:08 AM',
    timestamp: '7h ago',
    severity: 'safe',
    source: 'Coast Guard Telemetry',
    unread: false,
  },
]

const HISTORICAL_LOGS = [
  {
    id: 'hist-001',
    hazardType: 'heat',
    category: 'system',
    title: 'Excessive Heat Advisory Notice',
    sub: 'Max ambient temp 104°F recorded across inland valleys',
    area: 'Zone 2 — Central Corridor',
    zoneKey: 'Zone 2',
    time: 'Yesterday',
    timestamp: '1d ago',
    severity: 'medium',
    source: 'NWS Climate Bulletin',
    unread: false,
  },
  {
    id: 'hist-002',
    hazardType: 'wind',
    category: 'system',
    title: 'Winter Storm Early Outlook & Freezing Level Warning',
    sub: 'Atmospheric river moisture vector tracking 120 mi west',
    area: 'Zone 4 — Mountain Passes',
    zoneKey: 'Zone 4',
    time: 'Wed, May 14',
    timestamp: '2d ago',
    severity: 'low',
    source: 'Satellite Telemetry',
    unread: false,
  },
  {
    id: 'hist-003',
    hazardType: 'shield',
    category: 'system',
    title: 'Quarterly Emergency Siren & EAS Broadcast Drill',
    sub: '100% of 42 district sirens and cellular towers acknowledged test packet',
    area: 'Citywide All Zones',
    zoneKey: 'All Zones',
    time: 'Mon, May 12',
    timestamp: '4d ago',
    severity: 'safe',
    source: 'Civil Defense Agency',
    unread: false,
  },
]

/* ─── Sound Synthesizer via Web Audio API ─── */
function playTonePreview(type) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()

    if (type === 'tactical') {
      // Crisp dual-tone beep
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(1760, ctx.currentTime + 0.08)
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.22)
    } else if (type === 'siren') {
      // Emergency undulating siren
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(540, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(820, ctx.currentTime + 0.18)
      osc.frequency.linearRampToValueAtTime(540, ctx.currentTime + 0.36)
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.42)
    } else if (type === 'chime') {
      // Harmonic pleasant triple chime
      ;[523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq
        const start = ctx.currentTime + i * 0.08
        gain.gain.setValueAtTime(0.1, start)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(start)
        osc.stop(start + 0.25)
      })
    }
  } catch (err) {
    console.warn('Audio tone preview unavailable:', err)
  }
}

/* ─── Hazard Icon Helper ─── */
function NotificationHazardIcon({ type, className = '' }) {
  switch (type) {
    case 'river':
    case 'flood':
      return <Waves className={`nc-hazard-ico nc-hazard-ico--river ${className}`} />
    case 'fire':
      return <Flame className={`nc-hazard-ico nc-hazard-ico--fire ${className}`} />
    case 'wind':
      return <Wind className={`nc-hazard-ico nc-hazard-ico--wind ${className}`} />
    case 'seismic':
    case 'landslide':
      return <Activity className={`nc-hazard-ico nc-hazard-ico--seismic ${className}`} />
    case 'heat':
      return <Thermometer className={`nc-hazard-ico nc-hazard-ico--heat ${className}`} />
    case 'infra':
      return <Wrench className={`nc-hazard-ico nc-hazard-ico--infra ${className}`} />
    case 'shield':
      return <ShieldCheck className={`nc-hazard-ico nc-hazard-ico--shield ${className}`} />
    default:
      return <AlertTriangle className={`nc-hazard-ico nc-hazard-ico--default ${className}`} />
  }
}

export default function NotificationCenter() {
  const navigate = useNavigate()
  const { alerts } = useAlerts()

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all') // 'all' | 'action' | 'sensors' | 'system' | 'unread'
  const [selectedZone, setSelectedZone] = useState('all')
  const [digestMode, setDigestMode] = useState(false)
  const [quietHoursExpanded, setQuietHoursExpanded] = useState(false)
  const [readIds, setReadIds] = useState(new Set(['a-004', 'sen-002', 'sen-003', 'sen-004', 'hist-001', 'hist-002', 'hist-003']))
  const [acknowledgedIds, setAcknowledgedIds] = useState(new Set(['a-004']))
  const [dismissedIds, setDismissedIds] = useState(new Set())
  const [selectedTone, setSelectedTone] = useState('tactical')
  const [isPlayingSound, setIsPlayingSound] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  // Geospatial zone subscriptions
  const [zoneSubs, setZoneSubs] = useState({
    'Zone 1: Metro Core': true,
    'Zone 2: River Basin': true,
    'Zone 3: Coastal Ridge': true,
    'Zone 4: Foothills Pass': true,
  })

  // Channel health toggles
  const [channels, setChannels] = useState({
    push: true,
    sms: true,
    eas: true,
    siren: true,
  })

  // Toast flash trigger
  const showToast = useCallback((msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3200)
  }, [])

  // Live dynamic urgent alerts from AlertsContext
  const dynamicUrgent = useMemo(() => {
    const approved = alerts.filter(a => a.status === 'approved')
    return approved.map(a => {
      let title = a.title || a.headline
      if (!title || title === 'Hazard reported' || title === 'Hazard Report') {
        const type = a.type || ''
        if (type === 'river' || type === 'flood') title = 'Flash Flood Critical Warning'
        else if (type === 'fire') title = 'Wildfire Perimeter Breach Alert'
        else if (type === 'seismic' || type === 'landslide') title = 'Landslide Zone Instability'
        else if (type === 'infrastructure' || type === 'pothole') title = 'Road Surface Collapse Warning'
        else title = `${type.charAt(0).toUpperCase() + type.slice(1)} Urgent Alert`
      }

      const chips = [
        { label: 'Verified Incident', type: 'source' },
        { label: `${a.severity ? a.severity.toUpperCase() : 'MEDIUM'} PRIORITY`, type: a.severity === 'critical' ? 'critical' : 'warning' },
      ]

      return {
        id: a.id,
        title,
        area: a.affectedAreas?.[0] || a.location || 'Downtown Metro District (Zone 1)',
        zoneKey: 'Zone 1',
        hazardType: a.type || 'river',
        category: 'action',
        chips,
        issued: a.reportedAt ? new Date(a.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just Now',
        timestamp: 'Live Feed',
        confidence: a.confidence || 88,
        confidenceLevel: (a.confidence || 88) >= 80 ? 'High' : 'Medium',
        action: a.action || 'Heed local emergency broadcasts and prepare secondary evacuation routes.',
        severity: a.severity || 'high',
        unread: !readIds.has(a.id),
        acknowledged: acknowledgedIds.has(a.id),
      }
    })
  }, [alerts, readIds, acknowledgedIds])

  // Combine static and dynamic urgent feeds (deduplicating by id)
  const allUrgent = useMemo(() => {
    const combined = [...dynamicUrgent]
    BASE_URGENT_DISPATCHES.forEach(base => {
      if (!combined.some(c => c.id === base.id)) {
        combined.push({
          ...base,
          unread: !readIds.has(base.id),
          acknowledged: acknowledgedIds.has(base.id),
        })
      }
    })
    return combined.filter(item => !dismissedIds.has(item.id))
  }, [dynamicUrgent, readIds, acknowledgedIds, dismissedIds])

  const allSensors = useMemo(() => {
    return SENSOR_FIELD_UPDATES.map(item => ({
      ...item,
      unread: !readIds.has(item.id),
    })).filter(item => !dismissedIds.has(item.id))
  }, [readIds, dismissedIds])

  const allHistorical = useMemo(() => {
    return HISTORICAL_LOGS.map(item => ({
      ...item,
      unread: !readIds.has(item.id),
    })).filter(item => !dismissedIds.has(item.id))
  }, [readIds, dismissedIds])

  // Filter items based on category, search query, and zone
  const matchesFilter = useCallback((item) => {
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const titleMatch = item.title?.toLowerCase().includes(q)
      const areaMatch = item.area?.toLowerCase().includes(q)
      const subMatch = item.sub?.toLowerCase().includes(q)
      const actionMatch = item.action?.toLowerCase().includes(q)
      const sourceMatch = item.source?.toLowerCase().includes(q)
      if (!titleMatch && !areaMatch && !subMatch && !actionMatch && !sourceMatch) {
        return false
      }
    }

    // Category match
    if (activeCategory === 'action' && item.category !== 'action') return false
    if (activeCategory === 'sensors' && item.category !== 'sensors') return false
    if (activeCategory === 'system' && item.category !== 'system') return false
    if (activeCategory === 'unread' && !item.unread) return false

    // Zone filter
    if (selectedZone !== 'all') {
      if (item.zoneKey && item.zoneKey !== selectedZone && item.zoneKey !== 'All Zones') {
        return false
      }
    }

    return true
  }, [searchQuery, activeCategory, selectedZone])

  const filteredUrgent = useMemo(() => allUrgent.filter(matchesFilter), [allUrgent, matchesFilter])
  const filteredSensors = useMemo(() => allSensors.filter(matchesFilter), [allSensors, matchesFilter])
  const filteredHistorical = useMemo(() => allHistorical.filter(matchesFilter), [allHistorical, matchesFilter])

  const totalFilteredCount = filteredUrgent.length + filteredSensors.length + filteredHistorical.length
  const totalUnreadCount = useMemo(() => {
    const countU = allUrgent.filter(i => i.unread).length
    const countS = allSensors.filter(i => i.unread).length
    const countH = allHistorical.filter(i => i.unread).length
    return countU + countS + countH
  }, [allUrgent, allSensors, allHistorical])

  // Actions
  const handleMarkAllRead = () => {
    const allIds = [
      ...allUrgent.map(i => i.id),
      ...allSensors.map(i => i.id),
      ...allHistorical.map(i => i.id),
    ]
    setReadIds(new Set(allIds))
    showToast('All notifications marked as read.')
  }

  const handleToggleRead = (id, e) => {
    e?.stopPropagation()
    setReadIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAcknowledge = (id, e) => {
    e?.stopPropagation()
    setAcknowledgedIds(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    setReadIds(prev => new Set(prev).add(id))
    playTonePreview('tactical')
    showToast('Incident alert acknowledged by operator.')
  }

  const handleDismiss = (id, e) => {
    e?.stopPropagation()
    setDismissedIds(prev => new Set(prev).add(id))
    showToast('Notification archived.')
  }

  const handleTestTone = (tone) => {
    setSelectedTone(tone)
    setIsPlayingSound(true)
    playTonePreview(tone)
    setTimeout(() => setIsPlayingSound(false), 500)
  }

  const handleToggleZone = (zoneName) => {
    setZoneSubs(prev => ({
      ...prev,
      [zoneName]: !prev[zoneName]
    }))
  }

  const handleToggleChannel = (chan) => {
    setChannels(prev => ({
      ...prev,
      [chan]: !prev[chan]
    }))
  }

  return (
    <div className="nc-command-page">

      {/* ── Toast Floating Notice ── */}
      {toastMessage && (
        <div className="nc-toast-banner" role="status">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =====================================================================
          1. TELEMETRY HERO HEADER
          ===================================================================== */}
      <header className="nc-hero-header">
        <div className="nc-hero-mesh" aria-hidden="true" />
        <div className="nc-hero-content">

          {/* Left Hero Title & Broadcast Badge */}
          <div className="nc-hero-left">
            <div className="nc-broadcast-live-badge">
              <span className="nc-radar-beacon" />
              <span className="nc-broadcast-label">EMERGENCY BROADCAST RELAYS ACTIVE</span>
            </div>

            <h1 className="nc-hero-title">
              Incident Notification <span className="nc-title-gradient">Command Hub</span>
            </h1>

            <p className="nc-hero-sub">
              Centralized disaster telemetry feed, early warning siren relays, and real-time civil defense alerts.
            </p>
          </div>

          {/* Right Hero Metrics & Fast Actions */}
          <div className="nc-hero-right">
            <div className="nc-telemetry-pill-strip">
              <div className="nc-telemetry-chip">
                <span className="nc-telemetry-dot nc-telemetry-dot--critical" />
                <span className="nc-telemetry-val">{allUrgent.filter(i => i.unread).length}</span>
                <span className="nc-telemetry-lbl">Urgent Unread</span>
              </div>

              <div className="nc-telemetry-chip">
                <span className="nc-telemetry-dot nc-telemetry-dot--safe" />
                <span className="nc-telemetry-val">42/42</span>
                <span className="nc-telemetry-lbl">Sirens Ready</span>
              </div>

              <div className="nc-telemetry-chip">
                <span className="nc-telemetry-dot nc-telemetry-dot--sky" />
                <span className="nc-telemetry-val">{totalUnreadCount}</span>
                <span className="nc-telemetry-lbl">Total Unread</span>
              </div>
            </div>

            <div className="nc-hero-cta-group">
              <button
                className="nc-btn nc-btn--mark-read"
                onClick={handleMarkAllRead}
                disabled={totalUnreadCount === 0}
                title="Mark all notifications as read"
              >
                <Check size={15} />
                <span>Mark All Read</span>
              </button>

              <button
                className={`nc-btn nc-btn--digest ${digestMode ? 'nc-btn--digest-active' : ''}`}
                onClick={() => setDigestMode(v => !v)}
                title="Toggle between instant live broadcast and hourly digest mode"
              >
                <Radio size={15} />
                <span>{digestMode ? 'Digest Mode ON' : 'Instant Broadcast'}</span>
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* =====================================================================
          2. QUIET HOURS & CRITICAL OVERRIDE NOTICE BANNER
          ===================================================================== */}
      <section
        className={`nc-quiet-strip ${quietHoursExpanded ? 'nc-quiet-strip--expanded' : ''}`}
        aria-label="Quiet hours status"
      >
        <div
          className="nc-quiet-summary"
          onClick={() => setQuietHoursExpanded(v => !v)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setQuietHoursExpanded(v => !v)}
        >
          <div className="nc-quiet-icon-pod">
            <Radio size={18} className="nc-quiet-radio-ico" />
          </div>

          <div className="nc-quiet-info">
            <div className="nc-quiet-top-line">
              <span className="nc-quiet-heading">Quiet Hours Scheduled: 10:00 PM – 07:00 AM</span>
              <span className="nc-quiet-status-tag">EAS OVERRIDE ACTIVE</span>
            </div>
            <p className="nc-quiet-subheading">
              Non-urgent sensor telemetry is silenced during quiet hours. <strong>Category 4 & 5 Critical Alerts</strong> will automatically bypass silent mode and trigger audio sirens.
            </p>
          </div>

          <button className="nc-quiet-expand-btn" aria-label="Toggle policy details">
            <ChevronRight size={16} className={`nc-chevron ${quietHoursExpanded ? 'nc-chevron--open' : ''}`} />
          </button>
        </div>

        {quietHoursExpanded && (
          <div className="nc-quiet-details-tray">
            <div className="nc-quiet-detail-col">
              <span className="nc-quiet-detail-title">Exempt Warning Categories:</span>
              <ul className="nc-quiet-list">
                <li>• Flash flood & dam surge warnings</li>
                <li>• Wildfire mandatory evacuation orders</li>
                <li>• Major seismic event alarms (&gt; 5.0 Mww)</li>
              </ul>
            </div>
            <div className="nc-quiet-detail-col">
              <span className="nc-quiet-detail-title">Silenced During Quiet Window:</span>
              <ul className="nc-quiet-list">
                <li>• Minor air quality fluctuation updates</li>
                <li>• Routine hydrologic telemetry ping logs</li>
                <li>• Infrastructure drill confirmations</li>
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* =====================================================================
          3. FILTER & SEARCH CONTROL STRIP
          ===================================================================== */}
      <div className="nc-controls-strip">
        
        {/* Search Bar */}
        <div className="nc-search-box">
          <Search size={16} className="nc-search-icon" />
          <input
            type="text"
            className="nc-search-input"
            placeholder="Search alerts by keyword, hazard type, zone, agency (NOAA, EPA)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="nc-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="nc-category-tabs" role="tablist">
          <button
            className={`nc-tab-btn ${activeCategory === 'all' ? 'nc-tab-btn--active' : ''}`}
            onClick={() => setActiveCategory('all')}
            role="tab"
          >
            <span>All Alerts</span>
            <span className="nc-tab-count">{allUrgent.length + allSensors.length + allHistorical.length}</span>
          </button>

          <button
            className={`nc-tab-btn ${activeCategory === 'action' ? 'nc-tab-btn--active' : ''}`}
            onClick={() => setActiveCategory('action')}
            role="tab"
          >
            <AlertTriangle size={14} className="nc-tab-ico-warn" />
            <span>Action Required</span>
            <span className="nc-tab-count nc-tab-count--crit">{allUrgent.length}</span>
          </button>

          <button
            className={`nc-tab-btn ${activeCategory === 'sensors' ? 'nc-tab-btn--active' : ''}`}
            onClick={() => setActiveCategory('sensors')}
            role="tab"
          >
            <Activity size={14} />
            <span>Sensors & Telemetry</span>
            <span className="nc-tab-count">{allSensors.length}</span>
          </button>

          <button
            className={`nc-tab-btn ${activeCategory === 'system' ? 'nc-tab-btn--active' : ''}`}
            onClick={() => setActiveCategory('system')}
            role="tab"
          >
            <ShieldCheck size={14} />
            <span>Drills & Logs</span>
            <span className="nc-tab-count">{allHistorical.length}</span>
          </button>

          <button
            className={`nc-tab-btn ${activeCategory === 'unread' ? 'nc-tab-btn--active' : ''}`}
            onClick={() => setActiveCategory('unread')}
            role="tab"
          >
            <BellRing size={14} />
            <span>Unread Only</span>
            <span className="nc-tab-count nc-tab-count--accent">{totalUnreadCount}</span>
          </button>
        </div>

        {/* Zone Selector Dropdown Pill */}
        <div className="nc-zone-select-wrapper">
          <Compass size={14} className="nc-zone-ico" />
          <select
            className="nc-zone-select"
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            aria-label="Filter by geographic zone"
          >
            <option value="all">All Sectors & Districts</option>
            <option value="Zone 1">Zone 1 — Metro Core</option>
            <option value="Zone 2">Zone 2 — River Basin</option>
            <option value="Zone 3">Zone 3 — Coastal Ridge</option>
            <option value="Zone 4">Zone 4 — Mountain Foothills</option>
          </select>
        </div>

      </div>

      {/* =====================================================================
          4. MAIN 2-COLUMN COMMAND CENTER GRID
          ===================================================================== */}
      <div className="nc-main-grid">

        {/* ── LEFT COLUMN: MAIN NOTIFICATION FEED ── */}
        <main className="nc-feed-col">

          {totalFilteredCount === 0 ? (
            <div className="nc-empty-card">
              <div className="nc-empty-icon-pod">
                <BellOff size={32} />
              </div>
              <h3 className="nc-empty-title">No Incident Alerts Match Your Filter</h3>
              <p className="nc-empty-sub">
                No active broadcasts found matching &ldquo;{searchQuery || activeCategory}&rdquo; in {selectedZone === 'all' ? 'all zones' : selectedZone}.
              </p>
              <button
                className="nc-btn nc-btn--outline"
                onClick={() => { setSearchQuery(''); setActiveCategory('all'); setSelectedZone('all') }}
              >
                <RotateCcw size={14} />
                <span>Reset Filters</span>
              </button>
            </div>
          ) : (
            <>
              {/* SECTION A: URGENT DISPATCHES (NEEDS ATTENTION) */}
              {filteredUrgent.length > 0 && (
                <section className="nc-section-group" aria-labelledby="sec-urgent-heading">
                  <div className="nc-section-header">
                    <div className="nc-sec-title-wrap">
                      <span className="nc-sec-badge nc-sec-badge--crit">URGENT</span>
                      <h2 id="sec-urgent-heading" className="nc-sec-title">Active Dispatches & Immediate Actions</h2>
                    </div>
                    <span className="nc-sec-count">{filteredUrgent.length} live {filteredUrgent.length === 1 ? 'dossier' : 'dossiers'}</span>
                  </div>

                  <div className="nc-urgent-cards-stack">
                    {filteredUrgent.map(item => (
                      <article
                        key={item.id}
                        className={`nc-card nc-card--urgent nc-card--sev-${item.severity} ${item.unread ? 'nc-card--unread' : ''}`}
                        onClick={() => navigate(`/dashboard/alert/${item.id}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(`/dashboard/alert/${item.id}`)}
                      >
                        {/* Left severity indicator glow */}
                        <div className={`nc-card-accent-bar nc-card-accent-bar--${item.severity}`} />

                        <div className="nc-card-inner">
                          {/* Card Top Row */}
                          <div className="nc-card-top-row">
                            <div className="nc-hazard-avatar-box">
                              <NotificationHazardIcon type={item.hazardType} />
                              {item.unread && <span className="nc-card-unread-dot" title="Unread notification" />}
                            </div>

                            <div className="nc-card-head-content">
                              <div className="nc-card-title-line">
                                <h3 className="nc-card-title">{item.title}</h3>
                                <span className={`nc-badge-conf nc-badge-conf--${item.severity}`}>
                                  {item.confidence}% AI Confidence
                                </span>
                              </div>

                              <div className="nc-card-area-row">
                                <MapPin size={13} className="nc-area-pin" />
                                <span className="nc-area-text">{item.area}</span>
                                <span className="nc-card-dot-sep">•</span>
                                <Clock size={13} className="nc-area-clock" />
                                <span className="nc-card-time">Issued {item.issued} ({item.timestamp})</span>
                              </div>
                            </div>
                          </div>

                          {/* Chips Strip */}
                          <div className="nc-card-chips">
                            {item.chips?.map((c, idx) => (
                              <span key={idx} className={`nc-chip-tag nc-chip-tag--${c.type}`}>
                                {c.label}
                              </span>
                            ))}
                            {item.acknowledged && (
                              <span className="nc-chip-tag nc-chip-tag--ack">
                                <Check size={11} /> Acknowledged by Operator
                              </span>
                            )}
                          </div>

                          {/* Action Protocol Box */}
                          <div className="nc-action-box">
                            <span className="nc-action-label">PROTECTIVE DIRECTIVE:</span>
                            <p className="nc-action-text">{item.action}</p>
                          </div>

                          {/* Card Action Controls Footer */}
                          <div className="nc-card-actions-footer">
                            <div className="nc-card-footer-left">
                              <button
                                className="nc-btn nc-btn--dossier"
                                onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/alert/${item.id}`) }}
                              >
                                <span>Inspect Incident Dossier</span>
                                <ExternalLink size={13} />
                              </button>
                            </div>

                            <div className="nc-card-footer-right">
                              {!item.acknowledged ? (
                                <button
                                  className="nc-btn nc-btn--ack"
                                  onClick={(e) => handleAcknowledge(item.id, e)}
                                  title="Acknowledge response protocol"
                                >
                                  <Check size={13} />
                                  <span>Acknowledge</span>
                                </button>
                              ) : (
                                <span className="nc-ack-status-lbl">
                                  <CheckCircle2 size={14} className="text-emerald-400" /> Logged
                                </span>
                              )}

                              <button
                                className="nc-icon-action-btn"
                                onClick={(e) => handleToggleRead(item.id, e)}
                                title={item.unread ? 'Mark as Read' : 'Mark as Unread'}
                                aria-label="Toggle read state"
                              >
                                {item.unread ? <Eye size={14} /> : <BellOff size={14} />}
                              </button>

                              <button
                                className="nc-icon-action-btn"
                                onClick={(e) => handleDismiss(item.id, e)}
                                title="Archive notification"
                                aria-label="Archive notification"
                              >
                                <Archive size={14} />
                              </button>
                            </div>
                          </div>

                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {/* SECTION B: SENSOR & FIELD TELEMETRY (EARLIER TODAY) */}
              {filteredSensors.length > 0 && (
                <section className="nc-section-group" aria-labelledby="sec-sensors-heading">
                  <div className="nc-section-header">
                    <div className="nc-sec-title-wrap">
                      <span className="nc-sec-badge nc-sec-badge--sky">TELEMETRY</span>
                      <h2 id="sec-sensors-heading" className="nc-sec-title">Field Sensor & Infrastructure Updates</h2>
                    </div>
                    <span className="nc-sec-count">{filteredSensors.length} readings</span>
                  </div>

                  <div className="nc-density-list-card">
                    {filteredSensors.map(item => (
                      <div
                        key={item.id}
                        className={`nc-density-row nc-density-row--${item.severity} ${item.unread ? 'nc-density-row--unread' : ''}`}
                        onClick={() => handleToggleRead(item.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleToggleRead(item.id)}
                      >
                        <div className="nc-density-icon-pod">
                          <NotificationHazardIcon type={item.hazardType} />
                        </div>

                        <div className="nc-density-body">
                          <div className="nc-density-head">
                            <h4 className="nc-density-title">{item.title}</h4>
                            <span className="nc-density-time">{item.time} ({item.timestamp})</span>
                          </div>

                          <p className="nc-density-sub">{item.sub}</p>

                          <div className="nc-density-meta-line">
                            <span className="nc-density-loc">
                              <MapPin size={11} /> {item.area}
                            </span>
                            <span className="nc-card-dot-sep">•</span>
                            <span className="nc-density-source">Source: {item.source}</span>
                          </div>
                        </div>

                        <div className="nc-density-right-actions">
                          {item.unread && <span className="nc-density-unread-pill" />}
                          <button
                            className="nc-icon-action-btn"
                            onClick={(e) => handleDismiss(item.id, e)}
                            title="Archive entry"
                          >
                            <Archive size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* SECTION C: HISTORICAL LOGS & DRILLS (THIS WEEK) */}
              {filteredHistorical.length > 0 && (
                <section className="nc-section-group" aria-labelledby="sec-history-heading">
                  <div className="nc-section-header">
                    <div className="nc-sec-title-wrap">
                      <span className="nc-sec-badge nc-sec-badge--subtle">ARCHIVE</span>
                      <h2 id="sec-history-heading" className="nc-sec-title">Incident Lifecycle Logs & System Drills</h2>
                    </div>
                    <span className="nc-sec-count">{filteredHistorical.length} archived</span>
                  </div>

                  <div className="nc-density-list-card">
                    {filteredHistorical.map(item => (
                      <div
                        key={item.id}
                        className={`nc-density-row nc-density-row--${item.severity} ${item.unread ? 'nc-density-row--unread' : ''}`}
                        onClick={() => handleToggleRead(item.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleToggleRead(item.id)}
                      >
                        <div className="nc-density-icon-pod">
                          <NotificationHazardIcon type={item.hazardType} />
                        </div>

                        <div className="nc-density-body">
                          <div className="nc-density-head">
                            <h4 className="nc-density-title">{item.title}</h4>
                            <span className="nc-density-time">{item.time} ({item.timestamp})</span>
                          </div>

                          <p className="nc-density-sub">{item.sub}</p>

                          <div className="nc-density-meta-line">
                            <span className="nc-density-loc">
                              <MapPin size={11} /> {item.area}
                            </span>
                            <span className="nc-card-dot-sep">•</span>
                            <span className="nc-density-source">{item.source}</span>
                          </div>
                        </div>

                        <div className="nc-density-right-actions">
                          {item.unread && <span className="nc-density-unread-pill" />}
                          <button
                            className="nc-icon-action-btn"
                            onClick={(e) => handleDismiss(item.id, e)}
                            title="Archive entry"
                          >
                            <Archive size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

        </main>

        {/* ── RIGHT COLUMN: TACTICAL TELEMETRY & PREFERENCES SIDEBAR ── */}
        <aside className="nc-sidebar-col" aria-label="Notification Relay Diagnostics">

          {/* 1. BROADCAST RELAY CHANNEL STATUS */}
          <div className="nc-side-card">
            <div className="nc-side-card-header">
              <div className="nc-side-head-left">
                <Radio size={16} className="text-amber-500" />
                <h3 className="nc-side-title">Emergency Relay Matrix</h3>
              </div>
              <span className="nc-side-status-pill">ALL ONLINE</span>
            </div>

            <div className="nc-side-card-body">
              <p className="nc-side-desc">
                Active dissemination pipelines for real-time citizen alert dispatch.
              </p>

              <div className="nc-channel-list">
                <div className="nc-channel-item">
                  <div className="nc-channel-left">
                    <Smartphone size={16} className="nc-chan-icon" />
                    <div>
                      <p className="nc-chan-name">Mobile Push Relay</p>
                      <p className="nc-chan-sub">FCM / APNs Gateway Sync</p>
                    </div>
                  </div>
                  <button
                    className={`nc-chan-toggle ${channels.push ? 'nc-chan-toggle--on' : ''}`}
                    onClick={() => handleToggleChannel('push')}
                    aria-label="Toggle Push Relay"
                  >
                    <span className="nc-chan-thumb" />
                  </button>
                </div>

                <div className="nc-channel-item">
                  <div className="nc-channel-left">
                    <MessageSquare size={16} className="nc-chan-icon" />
                    <div>
                      <p className="nc-chan-name">SMS Dispatch Mesh</p>
                      <p className="nc-chan-sub">Twilio Priority Shortcode</p>
                    </div>
                  </div>
                  <button
                    className={`nc-chan-toggle ${channels.sms ? 'nc-chan-toggle--on' : ''}`}
                    onClick={() => handleToggleChannel('sms')}
                    aria-label="Toggle SMS Relay"
                  >
                    <span className="nc-chan-thumb" />
                  </button>
                </div>

                <div className="nc-channel-item">
                  <div className="nc-channel-left">
                    <Zap size={16} className="nc-chan-icon" />
                    <div>
                      <p className="nc-chan-name">NOAA EAS Radio Link</p>
                      <p className="nc-chan-sub">162.400 MHz WX Broadcast</p>
                    </div>
                  </div>
                  <button
                    className={`nc-chan-toggle ${channels.eas ? 'nc-chan-toggle--on' : ''}`}
                    onClick={() => handleToggleChannel('eas')}
                    aria-label="Toggle EAS Link"
                  >
                    <span className="nc-chan-thumb" />
                  </button>
                </div>

                <div className="nc-channel-item">
                  <div className="nc-channel-left">
                    <Volume2 size={16} className="nc-chan-icon" />
                    <div>
                      <p className="nc-chan-name">Acoustic Siren Array</p>
                      <p className="nc-chan-sub">42 District Sirens Armed</p>
                    </div>
                  </div>
                  <button
                    className={`nc-chan-toggle ${channels.siren ? 'nc-chan-toggle--on' : ''}`}
                    onClick={() => handleToggleChannel('siren')}
                    aria-label="Toggle Siren Array"
                  >
                    <span className="nc-chan-thumb" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. GEOSPATIAL ZONE SUBSCRIPTION */}
          <div className="nc-side-card">
            <div className="nc-side-card-header">
              <div className="nc-side-head-left">
                <Layers size={16} className="text-sky-500" />
                <h3 className="nc-side-title">Sector Subscriptions</h3>
              </div>
              <span className="nc-side-badge-num">{Object.values(zoneSubs).filter(Boolean).length}/4 Active</span>
            </div>

            <div className="nc-side-card-body">
              <p className="nc-side-desc">
                Subscribe to geographic hazard zones for automated proximity notifications.
              </p>

              <div className="nc-zone-switches">
                {Object.entries(zoneSubs).map(([zoneName, isActive]) => (
                  <label key={zoneName} className="nc-zone-switch-row">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={() => handleToggleZone(zoneName)}
                      className="nc-zone-checkbox"
                    />
                    <span className="nc-zone-switch-text">{zoneName}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 3. AUDITORY CHIME & TACTICAL ALERT TONE PREVIEW */}
          <div className="nc-side-card">
            <div className="nc-side-card-header">
              <div className="nc-side-head-left">
                <Volume2 size={16} className="text-emerald-500" />
                <h3 className="nc-side-title">Audio Chime Profile</h3>
              </div>
              <span className="nc-side-badge-tone">TEST AUDIO</span>
            </div>

            <div className="nc-side-card-body">
              <p className="nc-side-desc">
                Select alert synthesizer tone for priority incoming emergency events.
              </p>

              <div className="nc-tone-button-grid">
                <button
                  className={`nc-tone-btn ${selectedTone === 'tactical' ? 'nc-tone-btn--active' : ''}`}
                  onClick={() => handleTestTone('tactical')}
                >
                  <Activity size={14} />
                  <span>Tactical Beep</span>
                </button>

                <button
                  className={`nc-tone-btn ${selectedTone === 'siren' ? 'nc-tone-btn--active' : ''}`}
                  onClick={() => handleTestTone('siren')}
                >
                  <AlertTriangle size={14} />
                  <span>Disaster Siren</span>
                </button>

                <button
                  className={`nc-tone-btn ${selectedTone === 'chime' ? 'nc-tone-btn--active' : ''}`}
                  onClick={() => handleTestTone('chime')}
                >
                  <Sparkles size={14} />
                  <span>Triple Chime</span>
                </button>
              </div>

              {isPlayingSound && (
                <div className="nc-sound-wave-anim">
                  <span className="nc-sound-bar nc-sound-bar-1" />
                  <span className="nc-sound-bar nc-sound-bar-2" />
                  <span className="nc-sound-bar nc-sound-bar-3" />
                  <span className="nc-sound-bar nc-sound-bar-4" />
                  <span className="nc-sound-bar nc-sound-bar-5" />
                  <span className="nc-sound-play-lbl">Synthesizing audio tone...</span>
                </div>
              )}
            </div>
          </div>

          {/* 4. DISASTER PROTOCOL SHORTCUT */}
          <div className="nc-side-card nc-side-card--action">
            <div className="nc-side-action-inner">
              <Shield size={28} className="nc-side-action-ico" />
              <div>
                <h4 className="nc-side-action-title">Emergency Standard Protocol</h4>
                <p className="nc-side-action-desc">
                  View the civil defense readiness index and evacuation routes.
                </p>
              </div>
              <button
                className="nc-btn nc-btn--side-action"
                onClick={() => navigate('/dashboard/resources/flood-checklist')}
              >
                <span>Readiness Checklist</span>
                <ExternalLink size={13} />
              </button>
            </div>
          </div>

        </aside>

      </div>

    </div>
  )
}