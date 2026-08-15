import { useState } from 'react'
import { AlertTriangle, Users, Bell, Percent, Download, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { MOCK_ALERTS } from '../data/mockData'
import './AnalyticsPage.css'

const TABS = ['Risk Overview', 'Trends', 'Resources']
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

/* ─── Donut chart — plain SVG, no dependency ─── */
function DonutChart({ data, size = 148, strokeWidth = 24 }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const total = data.reduce((sum, d) => sum + d.value, 0)
  let cumulative = 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth={strokeWidth} />
        {data.map(d => {
          const fraction = d.value / total
          const dash = fraction * circumference
          const offset = -(cumulative / total) * circumference
          cumulative += d.value
          return (
            <circle
              key={d.label}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
            />
          )
        })}
      </g>
    </svg>
  )
}

/* ─── Line chart — plain SVG, no dependency ─── */
function TrendChart({ series, days, height = 230, maxY = 500 }) {
  const width = 600
  const pad = { top: 12, right: 14, bottom: 26, left: 34 }
  const chartW = width - pad.left - pad.right
  const chartH = height - pad.top - pad.bottom
  const xStep = chartW / (days.length - 1)
  const yTicks = [0, 100, 200, 300, 400, 500].filter(t => t <= maxY)

  function points(values) {
    return values
      .map((v, i) => `${pad.left + i * xStep},${pad.top + chartH - (v / maxY) * chartH}`)
      .join(' ')
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      {yTicks.map(t => {
        const y = pad.top + chartH - (t / maxY) * chartH
        return (
          <g key={t}>
            <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="var(--border-subtle)" strokeWidth="1" />
            <text x={pad.left - 8} y={y + 3} textAnchor="end" fontSize="9.5" fill="var(--text-muted)">{t}</text>
          </g>
        )
      })}
      <text x={width - pad.right} y={height - 6} textAnchor="end" fontSize="9.5" fill="var(--text-muted)">
        {days[days.length - 1]}
      </text>
      {series.map(s => (
        <polyline
          key={s.label}
          points={points(s.values)}
          fill="none"
          stroke={s.color}
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
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
            key={tab}
            className={`analytics-tab ${activeTab === tab ? 'analytics-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Risk Overview' && (
        <>
          <div className="analytics-stats">
            {stats.map(s => (
              <div key={s.key} className="analytics-stat-card">
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
              <TrendChart series={TREND_SERIES} days={TREND_DAYS} />
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
          <TrendChart series={TREND_SERIES} days={TREND_DAYS} height={320} />
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
