import { useState } from 'react'
import {
  AlertTriangle, Users, Bell, Download,
  TrendingUp, TrendingDown, Minus, RefreshCw,
  BarChart2, Activity, Globe
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAlerts } from '../context/AlertsContext'
import './AnalyticsPage.css'

/* ─── Time Horizon Pills ─── */
const TIME_HORIZONS = [
  { id: '24h', label: '24 Hours' },
  { id: '7d',  label: '7 Days'  },
  { id: '30d', label: '30 Days' },
  { id: '90d', label: '90 Days' },
]

/* ─── Hazard Trend Series ─── */
const TREND_SERIES = [
  { label: 'Flood',      color: '#3b82f6', values: [180, 220, 260, 300, 340, 310, 460] },
  { label: 'Fire',       color: '#f97316', values: [90,  140, 120, 260, 300, 380, 350] },
  { label: 'Earthquake', color: '#22c55e', values: [260, 240, 300, 280, 260, 300, 280] },
  { label: 'Landslide',  color: '#8b5cf6', values: [60,  90,  130, 110, 160, 150, 190] },
]
const TREND_DAYS = ['May 8', 'May 9', 'May 10', 'May 11', 'May 12', 'May 13', 'May 14']

/* ─── Risk Distribution ─── */
const RISK_DISTRIBUTION = [
  { label: 'Very High', value: 15, color: '#ef4444' },
  { label: 'High',      value: 30, color: '#f97316' },
  { label: 'Medium',    value: 35, color: '#eab308' },
  { label: 'Low',       value: 20, color: '#22c55e' },
]

/* ─── Regional Vulnerability Index ─── */
const REGIONS = [
  { name: 'Northern Coast',  score: 87, primary: 'Cyclone',   alerts: 14, trend: 'up'     },
  { name: 'Western Plateau', score: 72, primary: 'Wildfire',  alerts: 9,  trend: 'up'     },
  { name: 'River Delta',     score: 68, primary: 'Flood',     alerts: 11, trend: 'stable' },
  { name: 'Mountain Range',  score: 54, primary: 'Landslide', alerts: 6,  trend: 'down'   },
  { name: 'Southern Plains', score: 41, primary: 'Drought',   alerts: 3,  trend: 'stable' },
  { name: 'Urban Centre',    score: 33, primary: 'Heat',      alerts: 2,  trend: 'down'   },
]

/* ─── Smooth SVG path ─── */
function smoothPath(pts) {
  if (pts.length < 3) return `M ${pts.map(p => p.join(',')).join(' L ')}`
  let d = `M ${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[i + 1]
    d += ` Q ${x0},${y0} ${(x0 + x1) / 2},${(y0 + y1) / 2}`
  }
  const last = pts[pts.length - 1]
  d += ` L ${last[0]},${last[1]}`
  return d
}

/* ─── Inline Sparkline ─── */
function Sparkline({ values, color, width = 64, height = 28 }) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const xStep = width / (values.length - 1)
  const pts = values.map((v, i) => [
    i * xStep,
    height - ((v - min) / range) * (height - 4) - 2,
  ])
  const linePath = smoothPath(pts)
  const areaPath = `${linePath} L ${pts[pts.length - 1][0]},${height} L 0,${height} Z`
  const gradId = `spark-${color.replace('#', '')}`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="an-sparkline">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ─── Risk Score Bar ─── */
function RiskBar({ score }) {
  const color = score >= 75 ? '#ef4444' : score >= 55 ? '#f97316' : score >= 40 ? '#eab308' : '#22c55e'
  return (
    <div className="an-risk-bar-track">
      <div className="an-risk-bar-fill" style={{ width: `${score}%`, background: color }} />
    </div>
  )
}

/* ─── Trend Direction Icon ─── */
function TrendIcon({ trend }) {
  if (trend === 'up')   return <TrendingUp   size={13} className="an-trend-icon an-trend-icon--up"   />
  if (trend === 'down') return <TrendingDown  size={13} className="an-trend-icon an-trend-icon--down" />
  return                       <Minus         size={13} className="an-trend-icon an-trend-icon--flat" />
}

/* ─── Donut chart — plain SVG ─── */
function DonutChart({ data, size = 140, strokeWidth = 20 }) {
  const [hovered, setHovered] = useState(null)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const dominant = [...data].sort((a, b) => b.value - a.value)[0]
  const gap = 3
  let cumulative = 0

  return (
    <div className="an-donut-svg-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
          {data.map(d => {
            const fraction = d.value / total
            const dash = Math.max(fraction * circumference - gap, 0)
            const offset = -(cumulative / total) * circumference
            cumulative += d.value
            const isHovered = hovered === d.label
            return (
              <circle
                key={d.label}
                cx={size / 2} cy={size / 2} r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                opacity={hovered && !isHovered ? 0.35 : 1}
                style={{ transition: 'stroke-width 120ms ease, opacity 120ms ease', cursor: 'pointer' }}
                onMouseEnter={() => setHovered(d.label)}
                onMouseLeave={() => setHovered(null)}
              />
            )
          })}
        </g>
      </svg>
      <div className="an-donut-center">
        <span className="an-donut-center-val">
          {hovered ? `${data.find(d => d.label === hovered).value}%` : `${dominant.value}%`}
        </span>
        <span className="an-donut-center-label">{hovered || dominant.label}</span>
      </div>
    </div>
  )
}

/* ─── Line chart — plain SVG ─── */
function TrendChart({ series, days, height = 260, maxY = 500, uid = 'a' }) {
  const [hoverIdx, setHoverIdx] = useState(null)
  const width = 600
  const pad = { top: 12, right: 14, bottom: 26, left: 34 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom
  const xStep = chartW / (days.length - 1)
  const yTicks = [0, 100, 200, 300, 400, 500].filter(t => t <= maxY)

  function xy(i, v) {
    return [pad.left + i * xStep, pad.top + chartH - (v / maxY) * chartH]
  }

  function handleMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / rect.width
    const svgX = relX * width
    const idx = Math.round((svgX - pad.left) / xStep)
    setHoverIdx(Math.max(0, Math.min(days.length - 1, idx)))
  }

  const hoverLeftPct = hoverIdx === null ? 0 : ((pad.left + hoverIdx * xStep) / width) * 100

  return (
    <div className="an-trend-wrap" onMouseMove={handleMove} onMouseLeave={() => setHoverIdx(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
        <defs>
          {series.map(s => (
            <linearGradient key={s.label} id={`tf-${uid}-${s.label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={s.color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {yTicks.map(t => {
          const y = pad.top + chartH - (t / maxY) * chartH
          return (
            <g key={t}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="2 4" />
              <text x={pad.left - 8} y={y + 3} textAnchor="end" fontSize="9" fill="var(--text-muted)">{t}</text>
            </g>
          )
        })}

        {hoverIdx !== null && (
          <line
            x1={pad.left + hoverIdx * xStep} y1={pad.top}
            x2={pad.left + hoverIdx * xStep} y2={pad.top + chartH}
            stroke="var(--border-hover)" strokeWidth="1" strokeDasharray="3 3"
          />
        )}

        {series.map(s => {
          const pts = s.values.map((v, i) => xy(i, v))
          const linePath = smoothPath(pts)
          const areaPath = `${linePath} L ${pts[pts.length - 1][0]},${pad.top + chartH} L ${pts[0][0]},${pad.top + chartH} Z`
          return (
            <g key={s.label}>
              <path d={areaPath} fill={`url(#tf-${uid}-${s.label})`} stroke="none" />
              <path d={linePath} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {hoverIdx !== null && (
                <circle cx={pts[hoverIdx][0]} cy={pts[hoverIdx][1]} r="4" fill="var(--bg-surface)" stroke={s.color} strokeWidth="2" />
              )}
            </g>
          )
        })}

        <text x={width - pad.right} y={height - 4} textAnchor="end" fontSize="9" fill="var(--text-muted)">
          {days[days.length - 1]}
        </text>
      </svg>

      {hoverIdx !== null && (
        <div className="an-trend-tooltip" style={{ left: `${hoverLeftPct}%` }}>
          <p className="an-trend-tooltip-day">{days[hoverIdx]}</p>
          {series.map(s => (
            <div key={s.label} className="an-trend-tooltip-row">
              <span className="an-trend-tooltip-dot" style={{ background: s.color }} />
              <span className="an-trend-tooltip-label">{s.label}</span>
              <span className="an-trend-tooltip-val">{s.values[hoverIdx]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
export default function AnalyticsPage() {
  const { user } = useAuth()
  const { alerts } = useAlerts()
  const [horizon, setHorizon] = useState('7d')

  const alertsThisWeek = alerts.length
  const avgConfidence  = Math.round(alerts.reduce((s, a) => s + (a.confidence || 0), 0) / (alerts.length || 1))
  const criticalCount  = alerts.filter(a => a.severity === 'critical').length

  const KPI_TILES = [
    { label: 'High-Risk Areas',    value: '12',                   sub: '+2 since last period',         trend: 'up',                           sparkValues: [7, 8, 9, 10, 10, 11, 12],                                    sparkColor: '#ef4444', icon: Globe,         tone: 'critical' },
    { label: 'Active Alerts',      value: String(alertsThisWeek), sub: 'Across all hazard types',      trend: 'up',                           sparkValues: [5, 7, 8, 9, 11, alertsThisWeek - 1, alertsThisWeek],         sparkColor: '#f97316', icon: Bell,          tone: 'high'     },
    { label: 'AI Confidence',      value: `${avgConfidence}%`,    sub: 'Multi-sensor cross-validation', trend: 'up',                          sparkValues: [68, 72, 75, 71, 78, 80, avgConfidence],                       sparkColor: '#22c55e', icon: Activity,      tone: 'safe'     },
    { label: 'Critical Incidents', value: String(criticalCount),  sub: 'Requiring immediate response', trend: criticalCount > 2 ? 'up' : 'down', sparkValues: [4, 3, 5, 4, criticalCount + 2, criticalCount + 1, criticalCount], sparkColor: '#8b5cf6', icon: AlertTriangle, tone: 'medium'  },
    { label: 'People at Risk',     value: '1.2M',                 sub: 'Estimated exposure index',     trend: 'stable',                       sparkValues: [1.0, 1.1, 1.1, 1.2, 1.2, 1.2, 1.2],                        sparkColor: '#3b82f6', icon: Users,         tone: 'info'     },
  ]

  function handleExport() {
    const rows = [
      ['Metric', 'Value'],
      ['Active Alerts', alertsThisWeek],
      ['Avg Confidence', `${avgConfidence}%`],
      ['Critical Incidents', criticalCount],
      [],
      ['Region', 'Score', 'Primary Hazard', 'Alerts', 'Trend'],
      ...REGIONS.map(r => [r.name, r.score, r.primary, r.alerts, r.trend]),
    ]
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })),
      download: `HazardLens_Analytics_${horizon}.csv`,
    })
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="an-page">

      {/* ── Top Bar ── */}
      <div className="an-topbar">
        <div className="an-topbar-left">
          <h1 className="an-page-title">Analytics &amp; Insights</h1>
          <p className="an-page-sub">
            {user?.role ? `Tailored for ${user.role} oversight` : 'Operational risk overview'} · All regions
          </p>
        </div>
        <div className="an-topbar-right">
          <div className="an-horizon-pills">
            {TIME_HORIZONS.map(h => (
              <button
                key={h.id}
                className={`an-pill ${horizon === h.id ? 'an-pill--active' : ''}`}
                onClick={() => setHorizon(h.id)}
              >
                {h.label}
              </button>
            ))}
          </div>
          <button className="an-export-btn" onClick={handleExport}>
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ── KPI Sparkline Tiles ── */}
      <div className="an-kpi-row">
        {KPI_TILES.map((tile, i) => {
          const Icon = tile.icon
          return (
            <div key={i} className={`an-kpi-tile an-kpi-tile--${tile.tone}`}>
              <div className="an-kpi-top">
                <div className={`an-kpi-icon an-kpi-icon--${tile.tone}`}>
                  <Icon size={15} />
                </div>
                <TrendIcon trend={tile.trend} />
              </div>
              <div className="an-kpi-body">
                <span className={`an-kpi-value an-kpi-value--${tile.tone}`}>{tile.value}</span>
                <span className="an-kpi-label">{tile.label}</span>
              </div>
              <div className="an-kpi-footer">
                <span className="an-kpi-sub">{tile.sub}</span>
                <Sparkline values={tile.sparkValues} color={tile.sparkColor} />
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Asymmetric Chart Grid (8 col + 4 col) ── */}
      <div className="an-chart-grid">

        {/* LEFT — multi-hazard trend chart */}
        <div className="an-chart-card an-chart-card--main">
          <div className="an-chart-card-header">
            <div className="an-chart-card-title-wrap">
              <BarChart2 size={16} className="an-chart-card-icon" />
              <h2 className="an-chart-card-title">Hazard Trend Analysis</h2>
              <span className="an-chart-card-period">
                {TIME_HORIZONS.find(h => h.id === horizon)?.label}
              </span>
            </div>
            <div className="an-chart-legend">
              {TREND_SERIES.map(s => (
                <span key={s.label} className="an-legend-item">
                  <span className="an-legend-dot" style={{ background: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
          <TrendChart series={TREND_SERIES} days={TREND_DAYS} uid="main" />
        </div>

        {/* RIGHT — donut + legend */}
        <div className="an-chart-card an-chart-card--donut">
          <div className="an-chart-card-header">
            <div className="an-chart-card-title-wrap">
              <Activity size={16} className="an-chart-card-icon" />
              <h2 className="an-chart-card-title">Risk Distribution</h2>
            </div>
          </div>
          <div className="an-donut-layout">
            <DonutChart data={RISK_DISTRIBUTION} />
            <div className="an-donut-legend">
              {RISK_DISTRIBUTION.map(r => (
                <div key={r.label} className="an-donut-legend-row">
                  <span className="an-donut-legend-dot" style={{ background: r.color }} />
                  <span className="an-donut-legend-label">{r.label}</span>
                  <span className="an-donut-legend-bar">
                    <span className="an-donut-legend-fill" style={{ width: `${r.value * 2}%`, background: r.color }} />
                  </span>
                  <span className="an-donut-legend-val">{r.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Regional Vulnerability Index Table ── */}
      <div className="an-region-card">
        <div className="an-chart-card-header">
          <div className="an-chart-card-title-wrap">
            <Globe size={16} className="an-chart-card-icon" />
            <h2 className="an-chart-card-title">Regional Vulnerability Index</h2>
            <span className="an-chart-card-period">Ranked by composite risk score</span>
          </div>
          <button className="an-refresh-btn">
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
        </div>
        <div className="an-region-table-wrap">
          <table className="an-region-table">
            <thead>
              <tr>
                <th>Region</th>
                <th>Risk Score</th>
                <th>Vulnerability</th>
                <th>Primary Hazard</th>
                <th>Active Alerts</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {REGIONS.map((r, i) => (
                <tr key={r.name} className={i % 2 === 0 ? 'an-region-row--even' : ''}>
                  <td className="an-region-name">
                    <span className="an-region-rank">{i + 1}</span>
                    {r.name}
                  </td>
                  <td>
                    <span className={`an-score-chip an-score-chip--${r.score >= 75 ? 'crit' : r.score >= 55 ? 'high' : r.score >= 40 ? 'med' : 'low'}`}>
                      {r.score}
                    </span>
                  </td>
                  <td style={{ width: 160 }}>
                    <RiskBar score={r.score} />
                  </td>
                  <td className="an-region-hazard">{r.primary}</td>
                  <td className="an-region-alerts">{r.alerts}</td>
                  <td><TrendIcon trend={r.trend} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

