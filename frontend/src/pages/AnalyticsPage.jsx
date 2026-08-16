import { useState } from 'react'
import {
  AlertTriangle, Users, Bell, Percent, Download, ChevronDown,
  PieChart, TrendingUp, BookOpen
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { MOCK_ALERTS } from '../data/mockData'
import './AnalyticsPage.css'

const TABS = [
  { id: 'Risk Overview', icon: PieChart },
  { id: 'Trends',        icon: TrendingUp },
  { id: 'Resources',     icon: BookOpen },
]
const DATE_RANGES = ['Last 7 Days', 'Last 30 Days', 'Last 90 Days']

/* ─── Static reference numbers — matches the mockup exactly.
   Not wired to live data yet: High Risk Areas / People at Risk have
   no corresponding field anywhere in mockData. Avg. Confidence below
   IS computed live from MOCK_ALERTS; swap the others in the same way
   once real fields exist. ─── */
const STAT_CARDS = [
  { key: 'areas',  label: 'High Risk Areas',  value: '12',   icon: AlertTriangle, tone: 'critical' },
  { key: 'people', label: 'People at Risk',   value: '1.2M', icon: Users,         tone: 'medium' },
  { key: 'alerts', label: 'Alerts This Week', value: null,   icon: Bell,          tone: 'safe' },
  { key: 'conf',   label: 'Avg. Confidence',  value: null,   icon: Percent,       tone: 'medium' },
]

/* ─── Hazard Trends — illustrative 7-day mock series (no historical
   data source exists yet; replace with real time-series when available) ─── */
const TREND_SERIES = [
  { label: 'Flood',      color: '#3b82f6', values: [180, 220, 260, 300, 340, 310, 460] },
  { label: 'Fire',       color: '#f97316', values: [90,  140, 120, 260, 300, 380, 350] },
  { label: 'Earthquake', color: '#22c55e', values: [260, 240, 300, 280, 260, 300, 280] },
  { label: 'Landslide',  color: '#8b5cf6', values: [60,  90,  130, 110, 160, 150, 190] },
]
const TREND_DAYS = ['May 8', 'May 9', 'May 10', 'May 11', 'May 12', 'May 13', 'May 14']

/* ─── Risk Distribution — matches the mockup's exact percentages ─── */
const RISK_DISTRIBUTION = [
  { label: 'Very High', value: 15, color: '#ef4444' },
  { label: 'High',       value: 30, color: '#f97316' },
  { label: 'Medium',     value: 35, color: '#eab308' },
  { label: 'Low',        value: 20, color: '#22c55e' },
]

/* ─── Smooth a set of [x,y] points into a quadratic-curve path ─── */
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

/* ─── Donut chart — plain SVG, no dependency. Center label shows the
   dominant (largest) slice; hovering a segment emphasizes it. ─── */
function DonutChart({ data, size = 152, strokeWidth = 24 }) {
  const [hovered, setHovered] = useState(null)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const dominant = [...data].sort((a, b) => b.value - a.value)[0]
  const gap = 3 // px gap between segments
  let cumulative = 0

  return (
    <div className="analytics-donut-svg-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth={strokeWidth} />
          {data.map(d => {
            const fraction = d.value / total
            const dash = Math.max(fraction * circumference - gap, 0)
            const offset = -(cumulative / total) * circumference
            cumulative += d.value
            const isHovered = hovered === d.label
            const isDimmed = hovered && !isHovered
            return (
              <circle
                key={d.label}
                cx={size / 2} cy={size / 2} r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                opacity={isDimmed ? 0.35 : 1}
                style={{ transition: 'stroke-width 150ms ease, opacity 150ms ease', cursor: 'pointer' }}
                onMouseEnter={() => setHovered(d.label)}
                onMouseLeave={() => setHovered(null)}
              />
            )
          })}
        </g>
      </svg>
      <div className="analytics-donut-center">
        <span className="analytics-donut-center-val">
          {hovered ? `${data.find(d => d.label === hovered).value}%` : `${dominant.value}%`}
        </span>
        <span className="analytics-donut-center-label">{hovered || dominant.label}</span>
      </div>
    </div>
  )
}

/* ─── Line chart — plain SVG, no dependency. Smoothed curves with a
   soft gradient fill under each line, plus an interactive hover
   crosshair + tooltip. ─── */
function TrendChart({ series, days, height = 230, maxY = 500, uid = 'a' }) {
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
    <div
      className="trend-chart-wrap"
      onMouseMove={handleMove}
      onMouseLeave={() => setHoverIdx(null)}
    >
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
        <defs>
          {series.map(s => (
            <linearGradient key={s.label} id={`trend-fill-${uid}-${s.label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.16" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {yTicks.map(t => {
          const y = pad.top + chartH - (t / maxY) * chartH
          return (
            <g key={t}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="var(--border-subtle)" strokeWidth="1" />
              <text x={pad.left - 8} y={y + 3} textAnchor="end" fontSize="9.5" fill="var(--text-muted)">{t}</text>
            </g>
          )
        })}

        {hoverIdx !== null && (
          <line
            x1={pad.left + hoverIdx * xStep} y1={pad.top}
            x2={pad.left + hoverIdx * xStep} y2={pad.top + chartH}
            stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3"
          />
        )}

        {series.map(s => {
          const pts = s.values.map((v, i) => xy(i, v))
          const linePath = smoothPath(pts)
          const areaPath = `${linePath} L ${pts[pts.length - 1][0]},${pad.top + chartH} L ${pts[0][0]},${pad.top + chartH} Z`
          return (
            <g key={s.label}>
              <path d={areaPath} fill={`url(#trend-fill-${uid}-${s.label})`} stroke="none" />
              <path d={linePath} fill="none" stroke={s.color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
              {hoverIdx !== null && (
                <circle cx={pts[hoverIdx][0]} cy={pts[hoverIdx][1]} r="4" fill="var(--bg-surface)" stroke={s.color} strokeWidth="2.25" />
              )}
            </g>
          )
        })}

        <text x={width - pad.right} y={height - 6} textAnchor="end" fontSize="9.5" fill="var(--text-muted)">
          {days[days.length - 1]}
        </text>
      </svg>

      {hoverIdx !== null && (
        <div
          className="trend-tooltip"
          style={{ left: `${hoverLeftPct}%` }}
        >
          <p className="trend-tooltip-day">{days[hoverIdx]}</p>
          {series.map(s => (
            <div key={s.label} className="trend-tooltip-row">
              <span className="trend-tooltip-dot" style={{ background: s.color }} />
              <span className="trend-tooltip-label">{s.label}</span>
              <span className="trend-tooltip-val">{s.values[hoverIdx]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState('Risk Overview')
  const [dateRange, setDateRange] = useState('Last 7 Days')

  const alertsThisWeek = MOCK_ALERTS.length
  const avgConfidence = Math.round(
    MOCK_ALERTS.reduce((sum, a) => sum + (a.confidence || 0), 0) / (MOCK_ALERTS.length || 1)
  )

  const stats = STAT_CARDS.map(c => {
    if (c.key === 'alerts') return { ...c, value: String(alertsThisWeek) }
    if (c.key === 'conf') return { ...c, value: `${avgConfidence}%` }
    return c
  })

  function handleExport() {
    const rows = [
      ['Metric', 'Value'],
      ...stats.map(s => [s.label, s.value]),
      [],
      ['Risk Level', 'Percent'],
      ...RISK_DISTRIBUTION.map(r => [r.label, `${r.value}%`]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'hazardlens-analytics.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="analytics-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics &amp; Insights</h1>
          <p className="page-subtitle">
            {user?.role ? `Tailored for ${user.role} oversight` : 'Govt / Responder overview'}
          </p>
        </div>
        <div className="analytics-header-actions">
          <div className="analytics-date-wrap">
            <select
              className="analytics-date-select"
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              aria-label="Date range"
            >
              {DATE_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <ChevronDown size={13} className="analytics-date-chevron" />
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleExport}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <div className="analytics-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`analytics-tab ${activeTab === tab.id ? 'analytics-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={14} />
            {tab.id}
          </button>
        ))}
      </div>

      {activeTab === 'Risk Overview' && (
        <>
          <div className="analytics-stats">
            {stats.map((s, i) => (
              <div key={s.key} className={`analytics-stat-card analytics-stat-card--${s.tone}`} style={{ animationDelay: `${i * 60}ms` }}>
                <div className={`analytics-stat-icon analytics-stat-icon--${s.tone}`}>
                  <s.icon size={18} />
                </div>
                <div>
                  <p className="analytics-stat-label">{s.label}</p>
                  <p className={`analytics-stat-value analytics-stat-value--${s.tone}`}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="analytics-charts">
            <div className="card analytics-chart-card">
              <h3 className="analytics-chart-title">
                Hazard Trends <span>({dateRange})</span>
              </h3>
              <TrendChart series={TREND_SERIES} days={TREND_DAYS} uid="overview" />
              <div className="analytics-legend">
                {TREND_SERIES.map(s => (
                  <span key={s.label} className="analytics-legend-item">
                    <span className="analytics-legend-dot" style={{ background: s.color }} />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="card analytics-chart-card analytics-chart-card--donut">
              <h3 className="analytics-chart-title">Risk Distribution</h3>
              <div className="analytics-donut-wrap">
                <DonutChart data={RISK_DISTRIBUTION} />
                <div className="analytics-donut-legend">
                  {RISK_DISTRIBUTION.map(r => (
                    <div key={r.label} className="analytics-donut-legend-row">
                      <span className="analytics-legend-dot" style={{ background: r.color }} />
                      <span className="analytics-donut-legend-label">{r.label}</span>
                      <span className="analytics-donut-legend-val">{r.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'Trends' && (
        <div className="card analytics-chart-card">
          <h3 className="analytics-chart-title">
            Hazard Trends — Expanded View <span>({dateRange})</span>
          </h3>
          <TrendChart series={TREND_SERIES} days={TREND_DAYS} height={320} uid="expanded" />
          <div className="analytics-legend">
            {TREND_SERIES.map(s => (
              <span key={s.label} className="analytics-legend-item">
                <span className="analytics-legend-dot" style={{ background: s.color }} />
                {s.label} — latest: {s.values[s.values.length - 1]}
              </span>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Resources' && (
        <div className="card analytics-placeholder">
          <p>Resource-utilization analytics aren't built out yet — this tab is a placeholder.</p>
          <p className="analytics-placeholder-sub">
            (Separate from the main Resources &amp; Guidance page — this would cover things like
            responder deployment or shelter-capacity analytics instead.)
          </p>
        </div>
      )}
    </div>
  )
}