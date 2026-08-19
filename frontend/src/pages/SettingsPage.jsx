import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ChevronLeft, Info, BarChart2, Save, Check, Camera, Mail, Building2 } from 'lucide-react'
import './SettingsPage.css'

/* ── Warning triangle icon (golden) ── */
function WarnTriangle() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
      <path d="M8 2 L15 14 H1 Z" fill="#c8a820" stroke="none"/>
      <text x="8" y="12.5" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">!</text>
    </svg>
  )
}

/* ── Custom toggle ── */
function Toggle({ id, on, onChange, label }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`sp-toggle ${on ? 'sp-toggle--on' : ''}`}
      onClick={onChange}
    >
      <span className="sp-toggle-thumb" />
    </button>
  )
}

/* ── Channel row (Push / SMS / Email) ── */
function ChannelRow({ id, icon, label, on, onChange }) {
  return (
    <div className="sp-channel-row">
      <span className="sp-channel-icon">{icon}</span>
      <span className="sp-channel-label">{label}</span>
      <Toggle id={id} on={on} onChange={onChange} label={label} />
    </div>
  )
}

/* ── Notification channel icons ── */
function PushIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="#5a6475" strokeWidth="1.7" strokeLinecap="round">
      <rect x="3" y="4" width="14" height="11" rx="2"/>
      <path d="M3 7h14"/>
      <path d="M7 17h6"/>
    </svg>
  )
}
function SMSIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="#5a6475" strokeWidth="1.7" strokeLinecap="round">
      <path d="M4 4h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6l-4 3V6a2 2 0 0 1 2-2z"/>
    </svg>
  )
}
function EmailIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="#5a6475" strokeWidth="1.7" strokeLinecap="round">
      <rect x="2" y="5" width="16" height="12" rx="2"/>
      <path d="M2 8l8 5 8-5"/>
    </svg>
  )
}

/* ── Role colour map (account-level role, shown read-only on the profile badge) ── */
const ROLE_COLORS = {
  community: { bg: 'hsla(210,55%,55%,0.15)', text: 'hsl(210,65%,55%)', border: 'hsla(210,55%,55%,0.35)' },
  reporter:  { bg: 'hsla(35,95%,55%,0.15)',  text: 'hsl(35,100%,55%)',  border: 'hsla(35,95%,55%,0.35)'  },
  verifier:  { bg: 'hsla(195,70%,50%,0.15)', text: 'hsl(195,70%,52%)',  border: 'hsla(195,70%,50%,0.35)' },
  corrector: { bg: 'hsla(145,60%,45%,0.15)', text: 'hsl(145,60%,48%)',  border: 'hsla(145,60%,45%,0.35)' },
  admin:     { bg: 'hsla(280,65%,60%,0.15)', text: 'hsl(280,65%,65%)',  border: 'hsla(280,65%,60%,0.35)' },
}

/* ── Format join date ── */
function formatJoinDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

/* ── Main Settings Page ── */
const LOCATION_OPTIONS = ['Southbank', 'Westgate', 'Eastvale', 'Northwood', 'Riverview']
const HAZARD_TYPES = ['river', 'fire', 'infrastructure', 'weather', 'seismic']
const PERSONAS = [
  { id: 'resident', label: 'Resident', description: 'Local updates for my area' },
  { id: 'worker', label: 'Worker', description: 'Route and infrastructure alerts' },
  { id: 'traveler', label: 'Traveler', description: 'Road closures and detours' },
  { id: 'official', label: 'Official', description: 'Operational and verified advisories' },
]
const LANGUAGES = ['English', 'Spanish', 'Arabic', 'French']
const SEV_LABELS = ['Low', 'Moderate', 'High', 'Extreme']

export default function SettingsPage() {
  const { user, preferences, updatePreferences } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    document.documentElement.classList.add('hl-light')
    return () => document.documentElement.classList.remove('hl-light')
  }, [])

  /* ── Profile state ── */
  const [profileName,  setProfileName]  = useState(user?.name || '')
  const [profileEmail, setProfileEmail] = useState(user?.email || '')
  const [profileDept,  setProfileDept]  = useState(user?.department || '')
  const [savedProfile, setSavedProfile] = useState(false)

  function handleSaveProfile(e) {
    e.preventDefault()
    setSavedProfile(true)
    setTimeout(() => setSavedProfile(false), 2500)
  }

  /* ── Alert + notification state ── */
  const [distance, setDistance] = useState(preferences?.distance ?? 15)
  const [severity, setSeverity] = useState(preferences?.severity ?? 2)
  const [quietHours, setQuietHours] = useState(preferences?.quietHours ?? false)
  const [highConfOnly, setHighConfOnly] = useState(preferences?.highConfOnly ?? true)
  const [channels, setChannels] = useState(preferences?.channels ?? { push: true, sms: false, email: true })
  const [notifMode, setNotifMode] = useState(preferences?.notifMode ?? 'digest')
  const [locationSubscriptions, setLocationSubscriptions] = useState(preferences?.locationSubscriptions ?? ['Southbank', 'Westgate'])
  const [mutedHazardTypes, setMutedHazardTypes] = useState(preferences?.mutedHazardTypes ?? [])
  const [persona, setPersona] = useState(preferences?.persona ?? 'resident')
  const [language, setLanguage] = useState(preferences?.language ?? 'English')

  useEffect(() => {
    if (!preferences) return
    setDistance(preferences.distance ?? 15)
    setSeverity(preferences.severity ?? 2)
    setQuietHours(Boolean(preferences.quietHours))
    setHighConfOnly(Boolean(preferences.highConfOnly))
    setChannels(preferences.channels ?? { push: true, sms: false, email: true })
    setNotifMode(preferences.notifMode ?? 'digest')
    setLocationSubscriptions(preferences.locationSubscriptions ?? ['Southbank', 'Westgate'])
    setMutedHazardTypes(preferences.mutedHazardTypes ?? [])
    setPersona(preferences.persona ?? 'resident')
    setLanguage(preferences.language ?? 'English')
  }, [preferences])

  const handleDistanceChange = (value) => {
    setDistance(value)
    updatePreferences({ distance: value })
  }

  const handleSeverityChange = (value) => {
    setSeverity(value)
    updatePreferences({ severity: value })
  }

  const handleQuietToggle = () => {
    const next = !quietHours
    setQuietHours(next)
    updatePreferences({ quietHours: next })
  }

  const handleHighConfToggle = () => {
    const next = !highConfOnly
    setHighConfOnly(next)
    updatePreferences({ highConfOnly: next })
  }

  const toggleChannel = (key) => {
    const next = { ...channels, [key]: !channels[key] }
    setChannels(next)
    updatePreferences({ channels: next })
  }

  const setAlertMode = (mode) => {
    setNotifMode(mode)
    updatePreferences({ notifMode: mode })
  }

  const toggleLocationSubscription = (loc) => {
    const next = locationSubscriptions.includes(loc)
      ? locationSubscriptions.filter(item => item !== loc)
      : [...locationSubscriptions, loc]
    setLocationSubscriptions(next)
    updatePreferences({ locationSubscriptions: next })
  }

  const toggleMutedHazardType = (hazardType) => {
    const next = mutedHazardTypes.includes(hazardType)
      ? mutedHazardTypes.filter(type => type !== hazardType)
      : [...mutedHazardTypes, hazardType]
    setMutedHazardTypes(next)
    updatePreferences({ mutedHazardTypes: next })
  }

  const setPersonaMode = (nextPersona) => {
    setPersona(nextPersona)
    updatePreferences({ persona: nextPersona })
  }

  const setLanguageMode = (nextLanguage) => {
    setLanguage(nextLanguage)
    updatePreferences({ language: nextLanguage })
  }

  const sevLabel = SEV_LABELS[severity]
  const sevPct = (severity / 3) * 100
  const roleColors = ROLE_COLORS[user?.role] || ROLE_COLORS.community

  return (
    <div className="sp-page">
      {/* ── Centered container — single source of truth for the page's max width
          and horizontal padding, so the header and every card below it line up
          on the same left/right edges at any viewport size. ── */}
      <div className="sp-container">

        {/* ── Page header ── */}
        <div className="sp-header">
          <button className="sp-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <ChevronLeft size={22} />
          </button>
          <div className="sp-header-text">
            <h1 className="sp-title">Settings</h1>
            <p className="sp-subtitle">Manage your profile and alert preferences.</p>
          </div>
        </div>

        {/* ── Content — a sticky profile rail on wide screens, a single
            flowing column on tablet/mobile. ── */}
        <div className="sp-content">

          {/* ── PROFILE (sticky rail on desktop) ── */}
          <div className="sp-col-side">
            <div className="sp-card sp-profile-card">
              <div className="sp-profile-banner" style={{ background: `linear-gradient(120deg, ${roleColors.border}, transparent)` }} />
              <div className="sp-profile-avatar-row">
                <div
                  className="sp-profile-avatar"
                  style={{ background: roleColors.bg, color: roleColors.text, border: `2px solid ${roleColors.border}` }}
                >
                  {user?.avatar || 'U'}
                </div>
                <div className="sp-profile-avatar-info">
                  <p className="sp-profile-avatar-name">{user?.name}</p>
                  <span
                    className="sp-profile-role-badge"
                    style={{ background: roleColors.bg, color: roleColors.text, border: `1px solid ${roleColors.border}` }}
                  >
                    {user?.role}
                  </span>
                </div>
                <button className="sp-avatar-change-btn" aria-label="Change photo">
                  <Camera size={14} />
                  <span>Photo</span>
                </button>
              </div>

              <div className="sp-profile-stats">
                <div className="sp-profile-stat">
                  <span className="sp-profile-stat-val">{user?.reportsCount ?? 0}</span>
                  <span className="sp-profile-stat-label">Reports</span>
                </div>
                <div className="sp-profile-stat-sep" />
                <div className="sp-profile-stat">
                  <span className="sp-profile-stat-label">Member since {formatJoinDate(user?.joinedAt)}</span>
                </div>
              </div>

              <div className="sp-card-divider" />

              <form className="sp-profile-form" onSubmit={handleSaveProfile} id="profile-form">
                <div className="sp-field-group">
                  <label className="sp-field-label" htmlFor="profile-name">
                    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <circle cx="10" cy="7" r="3.5"/>
                      <path d="M3 18c0-3.9 3.1-7 7-7s7 3.1 7 7"/>
                    </svg>
                    Display Name
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    className="sp-field-input"
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    placeholder="Your display name"
                  />
                </div>

                <div className="sp-field-group">
                  <label className="sp-field-label" htmlFor="profile-email">
                    <Mail size={14} />
                    Email Address
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    className="sp-field-input"
                    value={profileEmail}
                    onChange={e => setProfileEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>

                <div className="sp-field-group">
                  <label className="sp-field-label" htmlFor="profile-dept">
                    <Building2 size={14} />
                    Department / Organization
                  </label>
                  <input
                    id="profile-dept"
                    type="text"
                    className="sp-field-input"
                    value={profileDept}
                    onChange={e => setProfileDept(e.target.value)}
                    placeholder="Your department or organization"
                  />
                </div>

                <button
                  type="submit"
                  id="save-profile-btn"
                  className={`sp-save-btn ${savedProfile ? 'sp-save-btn--saved' : ''}`}
                >
                  {savedProfile
                    ? <><Check size={16} /> Saved!</>
                    : <><Save size={16} /> Save Changes</>
                  }
                </button>
              </form>
            </div>
          </div>

          {/* ── MAIN COLUMN — alert + notification + personalization settings ── */}
          <div className="sp-col-main">

            {/* ── ALERT CRITERIA (distance + severity together — both define what reaches you) ── */}
            <div className="sp-card">
              <div className="sp-card-header">
                <span className="sp-card-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="10" r="3"/>
                    <path d="M12 2C8.1 2 5 5.1 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.9-3.1-7-7-7z"/>
                  </svg>
                </span>
                <div>
                  <h2 className="sp-card-title">Alert Criteria</h2>
                  <p className="sp-card-desc">What has to be true about a hazard for it to reach you.</p>
                </div>
              </div>

              <div className="sp-criteria-row">
                <div className="sp-criteria-label-row">
                  <span className="sp-criteria-label">Distance</span>
                  <span className="sp-value-badge">{distance} km</span>
                </div>
                <div className="sp-slider-wrap">
                  <input
                    id="distance-slider"
                    type="range"
                    className="sp-slider sp-slider--blue"
                    min={1} max={25} step={1}
                    value={distance}
                    onChange={e => handleDistanceChange(Number(e.target.value))}
                    style={{ '--fill-pct': `${((distance - 1) / 24) * 100}%` }}
                  />
                  <div className="sp-slider-labels">
                    <span>1 km</span>
                    <span>25 km</span>
                  </div>
                </div>
              </div>

              <div className="sp-card-divider" />

              <div className="sp-criteria-row">
                <div className="sp-criteria-label-row">
                  <span className="sp-criteria-label">Severity</span>
                  <span className="sp-value-badge sp-value-badge--muted">{sevLabel}</span>
                </div>
                <div className="sp-slider-wrap">
                  <div className="sp-sev-slider-track">
                    <div className="sp-sev-fill" style={{ width: `${sevPct}%` }} />
                    <input
                      id="severity-slider"
                      type="range"
                      className="sp-slider sp-slider--sev"
                      min={0} max={3} step={1}
                      value={severity}
                      onChange={e => handleSeverityChange(Number(e.target.value))}
                      style={{ '--fill-pct': `${sevPct}%` }}
                    />
                  </div>
                  <div className="sp-sev-labels">
                    {SEV_LABELS.map((l, i) => (
                      <div key={l} className="sp-sev-label-col">
                        <span className={`sp-sev-label-text ${i === severity ? 'sp-sev-label-text--active' : ''}`}>{l}</span>
                        {(l === 'Moderate' || l === 'Extreme') && (
                          <span className="sp-sev-warn"><WarnTriangle /></span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Notifications + Personalization sit side by side once there's room ── */}
            <div className="sp-row-2col">

              {/* ── NOTIFICATIONS (quiet hours, confidence filter, channels, cadence) ── */}
              <div className="sp-card sp-card--compact">
                <div className="sp-card-header">
                  <span className="sp-card-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                  </span>
                  <div>
                    <h2 className="sp-card-title">Notifications</h2>
                    <p className="sp-card-desc">How and when you hear from us.</p>
                  </div>
                </div>

                <div className="sp-row-main">
                  <div className="sp-row-text">
                    <span className="sp-row-title">Quiet Hours</span>
                    <span className="sp-row-sub">Pause non-critical alerts, 22:00–07:00</span>
                  </div>
                  <Toggle id="quiet-toggle" on={quietHours} onChange={handleQuietToggle} label="Quiet hours" />
                </div>

                <div className="sp-row-main">
                  <div className="sp-row-text">
                    <span className="sp-row-title">High-Confidence Only</span>
                    <span className="sp-row-sub">Fewer alerts, higher accuracy</span>
                  </div>
                  <Toggle id="confidence-toggle" on={highConfOnly} onChange={handleHighConfToggle} label="High-confidence only" />
                </div>

                <div className="sp-card-divider" />

                <div className="sp-pref-section">
                  <div className="sp-section-label">Channels</div>
                  <div className="sp-channel-list">
                    <ChannelRow id="channel-push" icon={<PushIcon />} label="Push notifications" on={channels.push} onChange={() => toggleChannel('push')} />
                    <ChannelRow id="channel-sms" icon={<SMSIcon />} label="SMS fallback" on={channels.sms} onChange={() => toggleChannel('sms')} />
                    <ChannelRow id="channel-email" icon={<EmailIcon />} label="Email summary" on={channels.email} onChange={() => toggleChannel('email')} />
                  </div>
                </div>

                <div className="sp-pref-section">
                  <div className="sp-section-label">Delivery</div>
                  <div className="sp-mode-toggle" role="tablist" aria-label="Notification cadence">
                    <button
                      type="button"
                      className={`sp-mode-toggle-btn ${notifMode === 'immediate' ? 'sp-mode-toggle-btn--active' : ''}`}
                      onClick={() => setAlertMode('immediate')}
                    >
                      Immediate
                    </button>
                    <button
                      type="button"
                      className={`sp-mode-toggle-btn ${notifMode === 'digest' ? 'sp-mode-toggle-btn--active' : ''}`}
                      onClick={() => setAlertMode('digest')}
                    >
                      Digest
                    </button>
                  </div>
                </div>
              </div>

              {/* ── PERSONALIZATION (persona, language, and which areas you follow) ── */}
              <div className="sp-card sp-card--compact">
                <div className="sp-card-header">
                  <span className="sp-card-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v18M3 12h18" />
                    </svg>
                  </span>
                  <div>
                    <h2 className="sp-card-title">Personalization</h2>
                    <p className="sp-card-desc">Tailor what's relevant to you.</p>
                  </div>
                </div>

                <div className="sp-pref-section">
                  <div className="sp-section-label">I'm here as a</div>
                  <div className="sp-persona-grid">
                    {PERSONAS.map(option => (
                      <button
                        key={option.id}
                        type="button"
                        className={`sp-persona-card ${persona === option.id ? 'sp-persona-card--active' : ''}`}
                        onClick={() => setPersonaMode(option.id)}
                      >
                        <span className="sp-persona-name">{option.label}</span>
                        <span className="sp-persona-desc">{option.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sp-pref-section">
                  <label htmlFor="language-select" className="sp-section-label">Language</label>
                  <select
                    id="language-select"
                    className="sp-language-select"
                    value={language}
                    onChange={(e) => setLanguageMode(e.target.value)}
                  >
                    {LANGUAGES.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div className="sp-pref-section">
                  <div className="sp-section-label">Areas you follow</div>
                  <div className="sp-chip-grid">
                    {LOCATION_OPTIONS.map(location => (
                      <button
                        key={location}
                        type="button"
                        className={`sp-chip ${locationSubscriptions.includes(location) ? 'sp-chip--active' : ''}`}
                        onClick={() => toggleLocationSubscription(location)}
                      >
                        {location}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* ── REDUCE NOISE (mute hazard types within the areas you follow) ── */}
            <div className="sp-card sp-card--compact">
              <div className="sp-card-header">
                <span className="sp-card-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l9 16H3L12 2z" />
                    <path d="M12 8v5" />
                    <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </span>
                <div>
                  <h2 className="sp-card-title">Reduce Noise</h2>
                  <p className="sp-card-desc">Mute hazard types you don't need alerts about, within the areas you follow.</p>
                </div>
              </div>

              <div className="sp-pref-section">
                <div className="sp-chip-grid">
                  {HAZARD_TYPES.map(type => (
                    <button
                      key={type}
                      type="button"
                      className={`sp-chip ${mutedHazardTypes.includes(type) ? 'sp-chip--active' : ''}`}
                      onClick={() => toggleMutedHazardType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sp-sub-row sp-sub-row--info">
                <BarChart2 size={14} className="sp-sub-icon" />
                <span className="sp-sub-label">Muted types stay muted even in areas you follow.</span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}