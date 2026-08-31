import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, CheckCircle2, CheckCircle, Eye, Wrench,
  AlertTriangle, AlertOctagon, Clock, MapPin, Search, X,
  ChevronRight, SlidersHorizontal, Download, RefreshCw,
  Flame, Waves, Wind, Activity, Shield, ShieldCheck,
  Layers, ExternalLink, FileText, Sparkles, Filter,
  ArrowUpDown, Check, RotateCcw, UserCheck, CornerDownRight
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAlerts } from '../context/AlertsContext'
import { timeAgo } from '../data/mockData'
import './QueuePage.css'

/* ─── Hazard Icon Helper ─── */
function QueueHazardIcon({ type, className = '' }) {
  switch (type) {
    case 'river':
    case 'flood':
      return <Waves className={`qp-hazard-ico qp-hazard-ico--river ${className}`} />
    case 'fire':
    case 'fire_safety':
      return <Flame className={`qp-hazard-ico qp-hazard-ico--fire ${className}`} />
    case 'wind':
      return <Wind className={`qp-hazard-ico qp-hazard-ico--wind ${className}`} />
    case 'seismic':
    case 'landslide':
      return <Activity className={`qp-hazard-ico qp-hazard-ico--seismic ${className}`} />
    case 'infrastructure':
    case 'structural':
    case 'mechanical':
    case 'pothole':
      return <Wrench className={`qp-hazard-ico qp-hazard-ico--infra ${className}`} />
    case 'chemical':
    case 'gas':
    case 'biological':
      return <AlertOctagon className={`qp-hazard-ico qp-hazard-ico--chemical ${className}`} />
    default:
      return <AlertTriangle className={`qp-hazard-ico qp-hazard-ico--default ${className}`} />
  }
}

export default function QueuePage() {
  const { caps, user } = useAuth()
  const { alerts, verifyAlert, resolveAlert } = useAlerts()
  const navigate = useNavigate()

  // State
  const [filter, setFilter] = useState('pending') // 'all' | 'pending' | 'verified' | 'critical' | 'resolved'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedHazard, setSelectedHazard] = useState('all')
  const [sortBy, setSortBy] = useState('sla') // 'sla' | 'newest' | 'severity' | 'confidence'
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [inspectingAlert, setInspectingAlert] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  // Toast trigger
  const showToast = useCallback((msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3200)
  }, [])

  // Simulated queue items mapping
  const enrichedAlerts = useMemo(() => {
    return alerts.map(a => {
      const idNum = a.id.replace(/\D/g, '') || '101'
      const reportCode = `#HR-${idNum.padStart(3, '0')}`
      
      let zone = 'Zone 1: Metro Core'
      if (a.location?.includes('North') || a.location?.includes('River')) zone = 'Zone 2: River Basin'
      else if (a.location?.includes('Coast') || a.location?.includes('Hill')) zone = 'Zone 3: Coastal Ridge'
      else if (a.location?.includes('Valley') || a.location?.includes('East')) zone = 'Zone 4: Foothills'

      const confidence = a.confidence ?? (a.severity === 'critical' ? 92 : a.severity === 'high' ? 84 : 72)
      
      // SLA time remaining calculation (mocked based on severity)
      let slaMinutes = 60
      if (a.severity === 'critical') slaMinutes = 25
      else if (a.severity === 'high') slaMinutes = 90
      else slaMinutes = 240

      return {
        ...a,
        reportCode,
        zone,
        confidence,
        slaMinutes,
        sourceAgency: a.sourceAgency || (a.type === 'river' ? 'NOAA Sensor' : a.type === 'fire' ? 'AirNow EPA' : 'Citizen Sentinel Grid'),
      }
    })
  }, [alerts])

  // Aggregate Metrics
  const critCount = useMemo(() => {
    return enrichedAlerts.filter(a => a.severity === 'critical' && (a.status === 'pending' || a.status === 'verified')).length
  }, [enrichedAlerts])

  const pendingVerificationCount = useMemo(() => {
    return enrichedAlerts.filter(a => a.status === 'pending').length
  }, [enrichedAlerts])

  const pendingCorrectionCount = useMemo(() => {
    return enrichedAlerts.filter(a => a.status === 'verified').length
  }, [enrichedAlerts])

  const avgConfidence = useMemo(() => {
    if (!enrichedAlerts.length) return 0
    const sum = enrichedAlerts.reduce((acc, curr) => acc + (curr.confidence || 75), 0)
    return Math.round(sum / enrichedAlerts.length)
  }, [enrichedAlerts])

  // Filtered and Sorted Alerts
  const filteredAlerts = useMemo(() => {
    let result = enrichedAlerts.filter(a => {
      // Status tab filter
      if (filter === 'pending' && a.status !== 'pending') return false
      if (filter === 'verified' && a.status !== 'verified') return false
      if (filter === 'critical' && (a.severity !== 'critical' || a.status === 'resolved')) return false
      if (filter === 'resolved' && a.status !== 'resolved' && a.status !== 'approved') return false

      // Hazard type filter
      if (selectedHazard !== 'all' && a.type !== selectedHazard) return false

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = a.title?.toLowerCase().includes(q)
        const matchLoc = a.location?.toLowerCase().includes(q)
        const matchRep = a.reportedBy?.toLowerCase().includes(q)
        const matchCode = a.reportCode?.toLowerCase().includes(q)
        const matchDesc = a.description?.toLowerCase().includes(q)
        if (!matchTitle && !matchLoc && !matchRep && !matchCode && !matchDesc) {
          return false
        }
      }

      return true
    })

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'sla') {
        return a.slaMinutes - b.slaMinutes
      }
      if (sortBy === 'newest') {
        return new Date(b.reportedAt || 0) - new Date(a.reportedAt || 0)
      }
      if (sortBy === 'severity') {
        const rank = { critical: 4, high: 3, medium: 2, low: 1 }
        return (rank[b.severity] || 0) - (rank[a.severity] || 0)
      }
      if (sortBy === 'confidence') {
        return (a.confidence || 0) - (b.confidence || 0)
      }
      return 0
    })

    return result
  }, [enrichedAlerts, filter, selectedHazard, searchQuery, sortBy])

  // Checkbox handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allFilteredIds = new Set(filteredAlerts.map(a => a.id))
      setSelectedIds(allFilteredIds)
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleToggleRow = (id, e) => {
    e?.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setIsRefreshing(false)
      showToast('Queue data synced with live sensor mesh.')
    }, 450)
  }

  // Batch actions
  const handleBatchVerify = () => {
    if (!selectedIds.size) return
    selectedIds.forEach(id => {
      verifyAlert(id)
    })
    const count = selectedIds.size
    setSelectedIds(new Set())
    showToast(`Successfully verified ${count} incident dossiers.`)
  }

  const handleBatchEscalate = () => {
    if (!selectedIds.size) return
    showToast(`Escalated ${selectedIds.size} incidents to Emergency Response Team.`)
    setSelectedIds(new Set())
  }

  const handleExportCSV = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' +
      ['Report ID,Title,Severity,Status,Location,Confidence,Reported Time']
        .concat(filteredAlerts.map(a => `"${a.reportCode}","${a.title}","${a.severity}","${a.status}","${a.location}","${a.confidence}%","${a.reportedAt}"`))
        .join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `HazardLens_Queue_Export_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('Queue CSV report exported.')
  }

  return (
    <div className="qp-page">

      {/* ── Floating Toast Notice ── */}
      {toastMessage && (
        <div className="qp-toast-banner" role="status">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =====================================================================
      {/* =====================================================================
          1. COMPACT FLIGHT COMMAND BAR & INLINE TELEMETRY RIBBON
          ===================================================================== */}
      <header className="qp-console-bar">
        {/* Left Title & Live Heartbeat */}
        <div className="qp-console-left">
          <div className="qp-console-title-wrap">
            <h1 className="qp-console-title">Verification &amp; Operations Queue</h1>
            <div className="qp-console-beacon">
              <span className="qp-beacon-dot" />
              <span className="qp-beacon-text">LIVE DISPATCH TRIAGE</span>
            </div>
          </div>
          <p className="qp-console-sub">Disaster validation console • Triage incoming citizen reports and sensor telemetry alarms</p>
        </div>

        {/* Right Console Actions */}
        <div className="qp-console-actions">
          <button
            className="qp-btn qp-btn--secondary"
            onClick={handleRefresh}
            title="Sync with field sensor mesh"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Sync Mesh</span>
          </button>

          <button
            className="qp-btn qp-btn--secondary"
            onClick={handleExportCSV}
            title="Export queue report to CSV"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            className="qp-btn qp-btn--primary"
            onClick={() => {
              const firstPending = enrichedAlerts.find(a => a.status === 'pending')
              if (firstPending) setInspectingAlert(firstPending)
              else showToast('All pending items have been reviewed.')
            }}
          >
            <Sparkles size={14} />
            <span>Triage Next</span>
          </button>
        </div>
      </header>

      {/* ── Horizontal KPI Telemetry Ribbon ── */}
      <div className="qp-telemetry-ribbon">
        <div
          className="qp-ribbon-segment qp-ribbon-segment--crit"
          onClick={() => setFilter('critical')}
          role="button"
          tabIndex={0}
        >
          <div className="qp-ribbon-icon-pod qp-ribbon-icon-pod--crit">
            <AlertTriangle size={15} />
          </div>
          <div className="qp-ribbon-info">
            <div className="qp-ribbon-val-row">
              <span className="qp-ribbon-val text-critical">{critCount}</span>
              <span className="qp-ribbon-tag text-critical">Critical SLA</span>
            </div>
            <span className="qp-ribbon-lbl">&lt; 25m breach urgency</span>
          </div>
        </div>

        <div className="qp-ribbon-divider" />

        <div
          className="qp-ribbon-segment qp-ribbon-segment--warn"
          onClick={() => setFilter('pending')}
          role="button"
          tabIndex={0}
        >
          <div className="qp-ribbon-icon-pod qp-ribbon-icon-pod--warn">
            <Clock size={15} />
          </div>
          <div className="qp-ribbon-info">
            <div className="qp-ribbon-val-row">
              <span className="qp-ribbon-val text-warning">{pendingVerificationCount}</span>
              <span className="qp-ribbon-tag text-warning">Awaiting Verification</span>
            </div>
            <span className="qp-ribbon-lbl">Citizen &amp; sensor field reports</span>
          </div>
        </div>

        <div className="qp-ribbon-divider" />

        <div
          className="qp-ribbon-segment qp-ribbon-segment--info"
          onClick={() => setFilter('verified')}
          role="button"
          tabIndex={0}
        >
          <div className="qp-ribbon-icon-pod qp-ribbon-icon-pod--info">
            <Wrench size={15} />
          </div>
          <div className="qp-ribbon-info">
            <div className="qp-ribbon-val-row">
              <span className="qp-ribbon-val text-info">{pendingCorrectionCount}</span>
              <span className="qp-ribbon-tag text-info">Needs Correction</span>
            </div>
            <span className="qp-ribbon-lbl">Assigned response crew tasks</span>
          </div>
        </div>

        <div className="qp-ribbon-divider" />

        <div className="qp-ribbon-segment qp-ribbon-segment--safe">
          <div className="qp-ribbon-icon-pod qp-ribbon-icon-pod--safe">
            <ShieldCheck size={15} />
          </div>
          <div className="qp-ribbon-info">
            <div className="qp-ribbon-val-row">
              <span className="qp-ribbon-val text-safe">{avgConfidence}%</span>
              <span className="qp-ribbon-tag text-safe">Mesh Nominal</span>
            </div>
            <span className="qp-ribbon-lbl">Multi-sensor cross validation</span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. MULTI-TIER SEARCH, CATEGORY & SORT CONTROLS
          ===================================================================== */}
      <div className="qp-filter-bar">
        
        {/* Search Input */}
        <div className="qp-search-box">
          <Search size={16} className="qp-search-icon" />
          <input
            type="text"
            className="qp-search-input"
            placeholder="Search by report ID (#HR-101), hazard, location, reporter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="qp-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="qp-status-tabs" role="tablist">
          <button
            className={`qp-tab-btn ${filter === 'pending' ? 'qp-tab-btn--active' : ''}`}
            onClick={() => setFilter('pending')}
            role="tab"
          >
            <span>Needs Verification</span>
            {pendingVerificationCount > 0 && (
              <span className="qp-tab-pill qp-tab-pill--warn">{pendingVerificationCount}</span>
            )}
          </button>

          <button
            className={`qp-tab-btn ${filter === 'verified' ? 'qp-tab-btn--active' : ''}`}
            onClick={() => setFilter('verified')}
            role="tab"
          >
            <span>Needs Correction</span>
            {pendingCorrectionCount > 0 && (
              <span className="qp-tab-pill qp-tab-pill--info">{pendingCorrectionCount}</span>
            )}
          </button>

          <button
            className={`qp-tab-btn ${filter === 'critical' ? 'qp-tab-btn--active' : ''}`}
            onClick={() => setFilter('critical')}
            role="tab"
          >
            <AlertTriangle size={13} className="text-red-400" />
            <span>Critical SLA</span>
            {critCount > 0 && (
              <span className="qp-tab-pill qp-tab-pill--crit">{critCount}</span>
            )}
          </button>

          <button
            className={`qp-tab-btn ${filter === 'all' ? 'qp-tab-btn--active' : ''}`}
            onClick={() => setFilter('all')}
            role="tab"
          >
            <span>All Queue</span>
            <span className="qp-tab-pill">{enrichedAlerts.length}</span>
          </button>

          <button
            className={`qp-tab-btn ${filter === 'resolved' ? 'qp-tab-btn--active' : ''}`}
            onClick={() => setFilter('resolved')}
            role="tab"
          >
            <CheckCircle2 size={13} className="text-emerald-400" />
            <span>Audit / Closed</span>
          </button>
        </div>

        {/* Filters and Sort */}
        <div className="qp-dropdown-group">
          {/* Hazard Filter */}
          <div className="qp-select-pill-wrap">
            <Filter size={14} className="qp-select-ico" />
            <select
              className="qp-select-pill"
              value={selectedHazard}
              onChange={(e) => setSelectedHazard(e.target.value)}
              aria-label="Filter by hazard category"
            >
              <option value="all">All Hazard Types</option>
              <option value="river">Flood &amp; Water</option>
              <option value="fire">Fire &amp; Smoke</option>
              <option value="wind">High Wind &amp; Gale</option>
              <option value="seismic">Seismic &amp; Landslide</option>
              <option value="infrastructure">Infrastructure</option>
            </select>
          </div>

          {/* Sort Controller */}
          <div className="qp-select-pill-wrap">
            <ArrowUpDown size={14} className="qp-select-ico" />
            <select
              className="qp-select-pill"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort queue by"
            >
              <option value="sla">Sort: SLA Urgency</option>
              <option value="newest">Sort: Newest Reported</option>
              <option value="severity">Sort: Highest Severity</option>
              <option value="confidence">Sort: Lowest Confidence</option>
            </select>
          </div>
        </div>

      </div>

      {/* =====================================================================
          4. HIGH-DENSITY INCIDENT MATRIX TABLE
          ===================================================================== */}
      {filteredAlerts.length === 0 ? (
        <div className="qp-empty-box">
          <div className="qp-empty-icon-pod">
            <CheckCircle2 size={36} />
          </div>
          <h3 className="qp-empty-title">No Incident Dossiers In This Queue</h3>
          <p className="qp-empty-sub">
            All reports matching current filters have been resolved or triaged.
          </p>
          <button
            className="qp-btn qp-btn--secondary"
            onClick={() => { setFilter('all'); setSearchQuery(''); setSelectedHazard('all') }}
          >
            <RotateCcw size={14} />
            <span>Reset All Filters</span>
          </button>
        </div>
      ) : (
        <div className="qp-table-container">
          <table className="qp-matrix-table" aria-label="Incident Verification Queue">
            <thead>
              <tr>
                <th className="qp-th-check">
                  <input
                    type="checkbox"
                    className="qp-checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === filteredAlerts.length}
                    onChange={handleSelectAll}
                    aria-label="Select all rows"
                  />
                </th>
                <th className="qp-th-hazard">Incident Dossier</th>
                <th className="qp-th-loc">Location &amp; Sector</th>
                <th className="qp-th-sev">Severity</th>
                <th className="qp-th-conf">AI Confidence</th>
                <th className="qp-th-status">Queue Status</th>
                <th className="qp-th-sla">SLA Urgency</th>
                <th className="qp-th-actions">Operations Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map(alert => {
                const isSelected = selectedIds.has(alert.id)
                const isCritical = alert.severity === 'critical'
                const isPending = alert.status === 'pending'
                const isVerified = alert.status === 'verified'

                return (
                  <tr
                    key={alert.id}
                    className={`qp-matrix-row ${isSelected ? 'qp-matrix-row--selected' : ''} ${isCritical ? 'qp-matrix-row--critical' : ''}`}
                    onClick={() => setInspectingAlert(alert)}
                  >
                    {/* Checkbox */}
                    <td className="qp-td-check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="qp-checkbox"
                        checked={isSelected}
                        onChange={(e) => handleToggleRow(alert.id, e)}
                        aria-label={`Select ${alert.reportCode}`}
                      />
                    </td>

                    {/* Hazard Title & Details */}
                    <td className="qp-td-hazard">
                      <div className="qp-hazard-cell">
                        <div className="qp-hazard-avatar-pod">
                          <QueueHazardIcon type={alert.type} />
                        </div>
                        <div className="qp-hazard-info">
                          <div className="qp-code-line">
                            <span className="qp-report-code">{alert.reportCode}</span>
                            <span className="qp-source-tag">{alert.sourceAgency}</span>
                          </div>
                          <p className="qp-hazard-title">{alert.title}</p>
                          <div className="qp-reporter-line">
                            <UserCheck size={12} className="text-muted" />
                            <span>Submitted by: <strong>{alert.reportedBy || 'Citizen Sentinel'}</strong></span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="qp-td-loc">
                      <div className="qp-loc-cell">
                        <span className="qp-loc-main">
                          <MapPin size={13} className="qp-loc-pin" /> {alert.location}
                        </span>
                        <span className="qp-zone-pill">{alert.zone}</span>
                      </div>
                    </td>

                    {/* Severity */}
                    <td className="qp-td-sev">
                      <span className={`qp-sev-tag qp-sev-tag--${alert.severity}`}>
                        <span className="qp-sev-dot" />
                        {alert.severity ? alert.severity.toUpperCase() : 'MEDIUM'}
                      </span>
                    </td>

                    {/* AI Confidence Meter */}
                    <td className="qp-td-conf">
                      <div className="qp-conf-cell">
                        <div className="qp-conf-num-line">
                          <span className="qp-conf-val">{alert.confidence}%</span>
                          <span className="qp-conf-rating">
                            {alert.confidence >= 80 ? 'High' : alert.confidence >= 60 ? 'Med' : 'Low'}
                          </span>
                        </div>
                        <div className="qp-conf-meter-track">
                          <div
                            className={`qp-conf-meter-fill qp-conf-meter-fill--${alert.confidence >= 80 ? 'high' : alert.confidence >= 60 ? 'med' : 'low'}`}
                            style={{ width: `${alert.confidence}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="qp-td-status">
                      <span className={`qp-status-badge qp-status-badge--${alert.status}`}>
                        {alert.status === 'pending' ? 'Needs Verification' : alert.status === 'verified' ? 'Needs Correction' : 'Resolved'}
                      </span>
                    </td>

                    {/* SLA Urgency */}
                    <td className="qp-td-sla">
                      <div className="qp-sla-cell">
                        <span className={`qp-sla-pill ${isCritical ? 'qp-sla-pill--crit' : 'qp-sla-pill--nom'}`}>
                          <Clock size={11} /> {alert.slaMinutes}m SLA
                        </span>
                        <span className="qp-reported-time">{timeAgo(alert.reportedAt)}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="qp-td-actions" onClick={(e) => e.stopPropagation()}>
                      <div className="qp-action-cell">
                        {/* Primary Context Action */}
                        {isVerified && caps.canCorrect && (
                          <button
                            className="qp-btn qp-btn--correct"
                            onClick={() => navigate(`/dashboard/queue/correct/${alert.id}`)}
                            title="Open Correction Protocol"
                          >
                            <Wrench size={13} />
                            <span>Apply Correction</span>
                          </button>
                        )}

                        {isPending && (
                          <button
                            className="qp-btn qp-btn--verify"
                            onClick={() => {
                              verifyAlert(alert.id)
                              showToast(`Incident #${alert.reportCode} verified by operator.`)
                            }}
                            title="Verify and Approve Alert"
                          >
                            <CheckCircle2 size={13} />
                            <span>Verify</span>
                          </button>
                        )}

                        {/* Quick Inspect Drawer Button */}
                        <button
                          className="qp-icon-btn"
                          onClick={() => setInspectingAlert(alert)}
                          title="Inspect Dossier"
                          aria-label="Inspect Dossier"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* =====================================================================
          5. FLOATING BATCH OPERATIONS DOCK
          ===================================================================== */}
      {selectedIds.size > 0 && (
        <aside className="qp-batch-dock" aria-label="Batch Actions Toolbar">
          <div className="qp-batch-left">
            <span className="qp-batch-count-pill">{selectedIds.size} Selected</span>
            <span className="qp-batch-label">Batch Operations Mode</span>
          </div>

          <div className="qp-batch-actions">
            <button
              className="qp-btn qp-btn--batch-verify"
              onClick={handleBatchVerify}
            >
              <CheckCircle2 size={14} />
              <span>Batch Verify ({selectedIds.size})</span>
            </button>

            <button
              className="qp-btn qp-btn--batch-escalate"
              onClick={handleBatchEscalate}
            >
              <AlertTriangle size={14} />
              <span>Escalate to Emergency</span>
            </button>

            <button
              className="qp-btn qp-btn--batch-clear"
              onClick={() => setSelectedIds(new Set())}
            >
              <X size={14} />
              <span>Deselect</span>
            </button>
          </div>
        </aside>
      )}

      {/* =====================================================================
          6. SLIDE-OVER INCIDENT INSPECTOR DRAWER
          ===================================================================== */}
      {inspectingAlert && (
        <div className="qp-drawer-backdrop" onClick={() => setInspectingAlert(null)}>
          <div className="qp-drawer-panel" onClick={(e) => e.stopPropagation()}>
            
            {/* Drawer Header */}
            <div className="qp-drawer-header">
              <div className="qp-drawer-title-box">
                <div className="qp-drawer-badge-strip">
                  <span className="qp-report-code">{inspectingAlert.reportCode}</span>
                  <span className={`qp-sev-tag qp-sev-tag--${inspectingAlert.severity}`}>
                    {inspectingAlert.severity.toUpperCase()}
                  </span>
                </div>
                <h2 className="qp-drawer-title">{inspectingAlert.title}</h2>
              </div>
              <button
                className="qp-drawer-close"
                onClick={() => setInspectingAlert(null)}
                aria-label="Close Inspector Drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="qp-drawer-body">
              
              {/* Location & Sector Box */}
              <div className="qp-drawer-section">
                <span className="qp-drawer-section-lbl">GEOGRAPHIC TARGET</span>
                <div className="qp-drawer-loc-box">
                  <MapPin size={16} className="text-amber-500" />
                  <div>
                    <p className="qp-drawer-loc-name">{inspectingAlert.location}</p>
                    <p className="qp-drawer-loc-zone">{inspectingAlert.zone}</p>
                  </div>
                </div>
              </div>

              {/* AI Confidence & Validation Meter */}
              <div className="qp-drawer-section">
                <span className="qp-drawer-section-lbl">AI VALIDATION TELEMETRY</span>
                <div className="qp-drawer-conf-box">
                  <div className="qp-drawer-conf-top">
                    <span>Cross-Sensor Confidence Score</span>
                    <strong>{inspectingAlert.confidence}% High</strong>
                  </div>
                  <div className="qp-conf-meter-track">
                    <div
                      className="qp-conf-meter-fill qp-conf-meter-fill--high"
                      style={{ width: `${inspectingAlert.confidence}%` }}
                    />
                  </div>
                  <p className="qp-drawer-conf-note">
                    Verified against NOAA gauge telemetry and municipal sensor array #R-104.
                  </p>
                </div>
              </div>

              {/* Description & Citizen Statement */}
              <div className="qp-drawer-section">
                <span className="qp-drawer-section-lbl">INCIDENT STATEMENT</span>
                <div className="qp-drawer-desc-box">
                  <p>{inspectingAlert.description || 'Rapid water elevation detected along municipal underpass. Debris blocking storm drains.'}</p>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="qp-drawer-meta-grid">
                <div className="qp-drawer-meta-item">
                  <span className="qp-drawer-meta-k">Reported By</span>
                  <span className="qp-drawer-meta-v">{inspectingAlert.reportedBy || 'Verified Citizen'}</span>
                </div>
                <div className="qp-drawer-meta-item">
                  <span className="qp-drawer-meta-k">Timestamp</span>
                  <span className="qp-drawer-meta-v">{timeAgo(inspectingAlert.reportedAt)}</span>
                </div>
                <div className="qp-drawer-meta-item">
                  <span className="qp-drawer-meta-k">Assigned Source</span>
                  <span className="qp-drawer-meta-v">{inspectingAlert.sourceAgency}</span>
                </div>
                <div className="qp-drawer-meta-item">
                  <span className="qp-drawer-meta-k">SLA Target</span>
                  <span className="qp-drawer-meta-v text-critical">{inspectingAlert.slaMinutes}m Remaining</span>
                </div>
              </div>

            </div>

            {/* Drawer Footer Actions */}
            <div className="qp-drawer-footer">
              <button
                className="qp-btn qp-btn--secondary"
                onClick={() => {
                  navigate(`/dashboard/alert/${inspectingAlert.id}`)
                  setInspectingAlert(null)
                }}
              >
                <span>Full Alert Page</span>
                <ExternalLink size={14} />
              </button>

              {inspectingAlert.status === 'pending' && (
                <button
                  className="qp-btn qp-btn--primary"
                  onClick={() => {
                    verifyAlert(inspectingAlert.id)
                    showToast(`Incident #${inspectingAlert.reportCode} verified by operator.`)
                    setInspectingAlert(null)
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>Verify Incident Dossier</span>
                </button>
              )}

              {inspectingAlert.status === 'verified' && caps.canCorrect && (
                <button
                  className="qp-btn qp-btn--primary"
                  onClick={() => {
                    navigate(`/dashboard/queue/correct/${inspectingAlert.id}`)
                    setInspectingAlert(null)
                  }}
                >
                  <Wrench size={15} />
                  <span>Apply Corrective Action</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  )
}