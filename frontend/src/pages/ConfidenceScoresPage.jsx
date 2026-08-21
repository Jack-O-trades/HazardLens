import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, Info } from 'lucide-react'
import './ResourceDetailPage.css'

const TIERS = [
  {
    range: '0–39%',
    label: 'Low',
    color: '#ef4444',
    bg: 'hsla(0,75%,55%,0.08)',
    desc: 'Alert is unverified or conflicting data exists. Treat as preliminary. Do not act on it alone.',
  },
  {
    range: '40–69%',
    label: 'Medium',
    color: '#f97316',
    bg: 'hsla(25,95%,55%,0.08)',
    desc: 'Partial corroboration from sensors or community reports. Monitor closely; prepare to act.',
  },
  {
    range: '70–89%',
    label: 'High',
    color: '#eab308',
    bg: 'hsla(42,90%,50%,0.08)',
    desc: 'Multiple reliable sources confirm the event. Take preparedness actions now.',
  },
  {
    range: '90–100%',
    label: 'Very High',
    color: '#22c55e',
    bg: 'hsla(142,71%,45%,0.08)',
    desc: 'Official feeds + sensor data + community verification all agree. Act immediately if in the affected area.',
  },
]

const FACTORS = [
  {
    title: 'Official Data Sources',
    desc: 'Feeds from NOAA, USGS, NWS, and fire weather services carry the highest weight. A confirmed government warning immediately elevates confidence.',
    weight: 40,
    color: '#3b82f6',
  },
  {
    title: 'Sensor Network Readings',
    desc: 'IoT sensors (river gauges, seismic detectors, air quality monitors) provide real-time physical measurements that corroborate or contradict reports.',
    weight: 30,
    color: '#8b5cf6',
  },
  {
    title: 'Community Reports',
    desc: 'Verified citizen submissions from the field. Each additional matching report nudges confidence upward; disputed reports push it down.',
    weight: 20,
    color: '#f97316',
  },
  {
    title: 'Report Age & Recency',
    desc: 'Events older than 6 hours receive a decay factor. Actively updated alerts maintain their score while stale data is discounted.',
    weight: 10,
    color: '#22c55e',
  },
]

export default function ConfidenceScoresPage() {
  const navigate = useNavigate()

  return (
    <div className="rdp-page animate-fade-in">
      <div className="rdp-header">
        <button className="rdp-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={16} />
          Back to Resources
        </button>
        <div className="rdp-hero">
          <span className="rdp-hero-icon" style={{ background: 'hsla(217,91%,60%,0.12)', color: '#3b82f6' }}>
            <ShieldCheck size={28} />
          </span>
          <div>
            <div className="rdp-tag rdp-tag--blue">Guide</div>
            <h1 className="rdp-title">What Confidence Scores Mean</h1>
            <p className="rdp-subtitle">
              Every alert in HazardLens carries a confidence score. Here's exactly how to read it and how it's calculated.
            </p>
          </div>
        </div>
      </div>

      <div className="rdp-body">
        {/* Tiers */}
        <div className="rdp-section-card">
          <div className="rdp-section-title">
            <span className="rdp-section-dot" style={{ background: '#3b82f6' }} />
            Confidence Tiers
          </div>
          <p className="rdp-section-intro">
            Each alert's confidence is displayed as a percentage. Here is what each range means in practice.
          </p>
          <div className="conf-tier-list">
            {TIERS.map(tier => (
              <div key={tier.range} className="conf-tier-row" style={{ background: tier.bg, borderLeft: `3px solid ${tier.color}` }}>
                <div className="conf-tier-left">
                  <span className="conf-tier-range" style={{ color: tier.color }}>{tier.range}</span>
                  <span className="conf-tier-label" style={{ color: tier.color }}>{tier.label}</span>
                </div>
                <div className="conf-tier-bar-wrap">
                  <div className="rdp-score-bar">
                    <div className="rdp-score-fill" style={{
                      width: tier.range.split('–')[1],
                      background: tier.color,
                      opacity: 0.8,
                    }} />
                  </div>
                  <p className="conf-tier-desc">{tier.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Factors */}
        <div className="rdp-section-card">
          <div className="rdp-section-title">
            <span className="rdp-section-dot" style={{ background: '#8b5cf6' }} />
            How the Score is Calculated
          </div>
          <p className="rdp-section-intro">
            HazardLens's AI engine weights four categories of evidence to compute each alert's confidence score.
          </p>
          <div className="conf-factors-list">
            {FACTORS.map(f => (
              <div key={f.title} className="conf-factor-item">
                <div className="conf-factor-header">
                  <span className="conf-factor-title">{f.title}</span>
                  <span className="conf-factor-weight" style={{ color: f.color }}>{f.weight}% weight</span>
                </div>
                <p className="conf-factor-desc">{f.desc}</p>
                <div className="rdp-score-bar" style={{ marginTop: '6px' }}>
                  <div className="rdp-score-fill" style={{ width: `${f.weight * 2.5}%`, background: f.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* What to do */}
        <div className="rdp-section-card">
          <div className="rdp-section-title">
            <span className="rdp-section-dot" style={{ background: '#22c55e' }} />
            What Should You Do?
          </div>
          <div className="rdp-do-dont-grid">
            <div className="rdp-section-card rdp-do-card" style={{ padding: '1rem', boxShadow: 'none' }}>
              <div className="rdp-do-dont-title">✓ Do</div>
              <ul className="rdp-do-dont-list">
                <li>✓ Use confidence as one input — not the only one</li>
                <li>✓ Check the source list on each alert card</li>
                <li>✓ Follow official instructions even if score is low</li>
                <li>✓ Submit community reports to help raise accuracy</li>
                <li>✓ Enable your notification preferences for high-conf alerts</li>
              </ul>
            </div>
            <div className="rdp-section-card rdp-dont-card" style={{ padding: '1rem', boxShadow: 'none' }}>
              <div className="rdp-do-dont-title">✗ Don't</div>
              <ul className="rdp-do-dont-list">
                <li>✗ Dismiss a low-score alert near an official warning zone</li>
                <li>✗ Wait for 100% before evacuating if ordered to do so</li>
                <li>✗ Share an alert as fact when score is under 40%</li>
                <li>✗ Ignore alerts that affect your subscribed areas</li>
                <li>✗ Assume low confidence means the event isn't real</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
