import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Cloud, ExternalLink } from 'lucide-react'
import './ResourceDetailPage.css'

const WEATHER_SOURCES = [
  {
    icon: '🌦️',
    name: 'National Weather Service (NWS)',
    url: 'https://www.weather.gov',
    desc: 'Official US government source for weather forecasts, watches, warnings, and advisories.',
    tags: ['Official', 'US', 'Alerts'],
    color: '#3b82f6',
  },
  {
    icon: '🌍',
    name: 'NOAA National Centers',
    url: 'https://www.noaa.gov',
    desc: 'Comprehensive environmental data including ocean, atmosphere, and climate information.',
    tags: ['Official', 'US', 'Climate'],
    color: '#0891b2',
  },
  {
    icon: '🌤️',
    name: 'Weather.com (The Weather Channel)',
    url: 'https://weather.com',
    desc: 'Consumer-grade hourly and 10-day forecasts with severe weather tracking and maps.',
    tags: ['Forecast', 'Radar', 'Maps'],
    color: '#6366f1',
  },
  {
    icon: '📡',
    name: 'Windy.com',
    url: 'https://www.windy.com',
    desc: 'Advanced visualisation of wind, rain, temperature, and pressure using GFS and ECMWF models.',
    tags: ['Visualisation', 'Global', 'Models'],
    color: '#06b6d4',
  },
  {
    icon: '🔥',
    name: 'Fire Weather Outlook (SPC)',
    url: 'https://www.spc.noaa.gov/products/fire_wx/',
    desc: 'NOAA Storm Prediction Center fire weather forecasts for wildfire risk conditions.',
    tags: ['Fire', 'Official', 'US'],
    color: '#f97316',
  },
  {
    icon: '🌀',
    name: 'National Hurricane Center',
    url: 'https://www.nhc.noaa.gov',
    desc: 'Official tracking and forecasts for Atlantic and Eastern Pacific tropical cyclones.',
    tags: ['Cyclone', 'Official', 'US'],
    color: '#8b5cf6',
  },
  {
    icon: '🌏',
    name: 'AccuWeather',
    url: 'https://www.accuweather.com',
    desc: 'Global forecasts with minute-by-minute precision precipitation forecasting.',
    tags: ['Global', 'Forecast', 'Precision'],
    color: '#ef4444',
  },
  {
    icon: '📊',
    name: 'Open-Meteo (API)',
    url: 'https://open-meteo.com',
    desc: 'Free, open-source weather API with global coverage — used by HazardLens Live Map.',
    tags: ['API', 'Open Source', 'Global'],
    color: '#22c55e',
  },
]

const TIPS = [
  { title: 'Cross-reference during emergencies', desc: 'Use at least two independent sources when a watch or warning is in effect. Sources can lag each other by minutes during rapidly evolving events.' },
  { title: 'Prefer official government sources for warnings', desc: 'NWS and NOAA issue legally binding watches and warnings. Consumer apps aggregate these but may delay or filter them.' },
  { title: 'Understand the difference between watch, warning, and advisory', desc: 'Watch = conditions are favourable for the hazard. Warning = hazard is imminent or occurring. Advisory = less serious but still noteworthy.' },
  { title: 'Sign up for Wireless Emergency Alerts (WEA)', desc: 'Your mobile carrier pushes WEA messages automatically in the US. Ensure you have not disabled them in your phone settings.' },
  { title: 'Know your local emergency management agency', desc: 'County and city emergency managers often post faster, more localised updates than national services during active events.' },
]

export default function WeatherSourcesPage() {
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
            <Cloud size={28} />
          </span>
          <div>
            <div className="rdp-tag rdp-tag--blue">Link Directory</div>
            <h1 className="rdp-title">Official Weather Sources</h1>
            <p className="rdp-subtitle">
              Trusted agencies, apps, and websites for weather forecasts, severe weather warnings, and real-time conditions.
            </p>
          </div>
        </div>
      </div>

      <div className="rdp-body">
        {/* Sources list */}
        <div className="rdp-section-card">
          <div className="rdp-section-title">
            <span className="rdp-section-dot" style={{ background: '#3b82f6' }} />
            Trusted Weather Sources
          </div>
          <div className="rdp-source-list">
            {WEATHER_SOURCES.map(src => (
              <a
                key={src.name}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rdp-source-item"
              >
                <span className="rdp-source-icon">{src.icon}</span>
                <div className="rdp-source-body">
                  <div className="rdp-source-name">{src.name}</div>
                  <div className="rdp-source-desc">{src.desc}</div>
                  <div className="ws-tags">
                    {src.tags.map(t => (
                      <span key={t} className="ws-tag" style={{ color: src.color, background: `${src.color}18` }}>{t}</span>
                    ))}
                  </div>
                </div>
                <ExternalLink size={15} className="rdp-source-arrow" />
              </a>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="rdp-section-card">
          <div className="rdp-section-title">
            <span className="rdp-section-dot" style={{ background: '#f97316' }} />
            Tips for Using Weather Sources
          </div>
          <div className="rdp-steps">
            {TIPS.map((tip, i) => (
              <div key={i} className="rdp-step">
                <span className="rdp-step-num">{i + 1}</span>
                <div>
                  <div className="rdp-step-title">{tip.title}</div>
                  <div className="rdp-step-desc">{tip.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
