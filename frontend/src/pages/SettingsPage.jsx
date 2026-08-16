import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ChevronLeft, ChevronRight, Info, BarChart2, Save, Check, Camera, Mail, Building2, Calendar, FileText } from 'lucide-react'
import './SettingsPage.css'

/* ── Role icons ── */
function CitizenIcon() {
  return (
    <svg viewBox="0 0 40 40" width="32" height="32" fill="none">
      <circle cx="14" cy="13" r="5" stroke="#4a5568" strokeWidth="2" fill="none"/>
      <path d="M4 32c0-5.5 4.5-10 10-10" stroke="#4a5568" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <circle cx="26" cy="13" r="5" stroke="#4a5568" strokeWidth="2" fill="none"/>
      <path d="M36 32c0-5.5-4.5-10-10-10" stroke="#4a5568" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M14 22c2-1 4.5-1.5 6-1.5s4 .5 6 1.5C30 24 33 27.5 33 32H7c0-4.5 3-8 7-10z" stroke="#4a5568" strokeWidth="2" fill="none"/>
      {/* Checkmark badge */}
      <circle cx="30" cy="30" r="7" fill="#4a6741" stroke="white" strokeWidth="1.5"/>
      <path d="M26.5 30 L29 32.5 L33.5 27.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

function ResponderIcon({ selected }) {
  return (
    <svg viewBox="0 0 40 40" width="32" height="32" fill="none">
      <path
        d="M20 4 L34 10 L34 22 C34 30 27 36 20 38 C13 36 6 30 6 22 L6 10 Z"
        stroke={selected ? '#4a5568' : '#6b7280'}
        strokeWidth="2"
        fill="none"
      />
    </svg>
  )
}

function OfficialIcon({ selected }) {
  return (
    <svg viewBox="0 0 40 40" width="32" height="32" fill="none">
      <rect x="6" y="16" width="28" height="18" rx="2" stroke={selected ? '#4a5568' : '#6b7280'} strokeWidth="2" fill="none"/>
      <path d="M10 16 V12 C10 8.7 14.5 6 20 6 C25.5 6 30 8.7 30 12 V16" stroke={selected ? '#4a5568' : '#6b7280'} strokeWidth="2" fill="none"/>
      <line x1="12" y1="22" x2="28" y2="22" stroke={selected ? '#4a5568' : '#6b7280'} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="27" x2="22" y2="27" stroke={selected ? '#4a5568' : '#6b7280'} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

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
function Toggle({ id, on, onChange }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={on}
      className={`sp-toggle ${on ? 'sp-toggle--on' : ''}`}
      onClick={onChange}
    >
      <span className="sp-toggle-thumb" />
    </button>
  )
}

/* ── Chevron row (notification prefs) ── */
function PrefRow({ id, icon, label }) {
  return (
    <div className="sp-pref-row" id={id}>
      <span className="sp-pref-icon">{icon}</span>
      <span className="sp-pref-label">{label}</span>
      <ChevronRight size={16} className="sp-pref-chevron" />
    </div>
  )
}

/* ── Notification icons ── */
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
function DigestIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="#5a6475" strokeWidth="1.7" strokeLinecap="round">
      <path d="M8 6 L5 10 L8 14"/>
      <path d="M5 10 h10"/>
      <path d="M13 3 C16 5 18 8 18 11 A8 8 0 0 1 4 14"/>
    </svg>
  )
}

/* ── Role colour map ── */
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
const PERSONAS = [
  { id: 'resident', label: 'Resident', description: 'Local updates for my area' },
  { id: 'worker', label: 'Worker', description: 'Route and infrastructure alerts' },
  { id: 'traveler', label: 'Traveler', description: 'Road closures and detours' },
  { id: 'official', label: 'Official', description: 'Operational and verified advisories' },
]
const LANGUAGES = ['English', 'Spanish', 'Arabic', 'French']

export default function SettingsPage() {
  const { user, preferences, updatePreferences } = useAuth()
  const navigate = useNavigate()

  // Hide sidebar, use full-width layout like dashboard
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

  /* ── Alert settings state ── */
  const [role, setRole] = useState('citizen')
  const [distance, setDistance] = useState(preferences?.distance ?? 15)
  const [severity, setSeverity] = useState(preferences?.severity ?? 2)
  const [quietHours, setQuietHours] = useState(preferences?.quietHours ?? false)
  const [highConfOnly, setHighConfOnly] = useState(preferences?.highConfOnly ?? true)
  const [locationSubscriptions, setLocationSubscriptions] = useState(preferences?.locationSubscriptions ?? ['Southbank', 'Westgate'])
  const [mutedHazardTypes, setMutedHazardTypes] = useState(preferences?.mutedHazardTypes ?? [])
  const [mutedAreas, setMutedAreas] = useState(preferences?.mutedAreas ?? [])
  const [persona, setPersona] = useState(preferences?.persona ?? 'resident')
  const [language, setLanguage] = useState(preferences?.language ?? 'English')
  const [notifMode, setNotifMode] = useState(preferences?.notifMode ?? 'digest')

  useEffect(() => {
    if (!preferences) return
    setDistance(preferences.distance ?? 15)
    setSeverity(preferences.severity ?? 2)
    setQuietHours(Boolean(preferences.quietHours))
    setHighConfOnly(Boolean(preferences.highConfOnly))
    setLocationSubscriptions(preferences.locationSubscriptions ?? ['Southbank', 'Westgate'])
    setMutedHazardTypes(preferences.mutedHazardTypes ?? [])
    setMutedAreas(preferences.mutedAreas ?? [])
    setPersona(preferences.persona ?? 'resident')
    setLanguage(preferences.language ?? 'English')
    setNotifMode(preferences.notifMode ?? 'digest')
  }, [preferences])

  const ROLES = [
    { id: 'citizen', label: 'Citizen', Icon: CitizenIcon },
    { id: 'responder', label: 'Responder', Icon: ResponderIcon },
    { id: 'official', label: 'Official', Icon: OfficialIcon },
  ]

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

  const toggleMutedArea = (area) => {
    const next = mutedAreas.includes(area)
      ? mutedAreas.filter(item => item !== area)
      : [...mutedAreas, area]
    setMutedAreas(next)
    updatePreferences({ mutedAreas: next })
  }

  const setPersonaMode = (nextPersona) => {
    setPersona(nextPersona)
    updatePreferences({ persona: nextPersona })
  }

  const setLanguageMode = (nextLanguage) => {
    setLanguage(nextLanguage)
    updatePreferences({ language: nextLanguage })
  }

  const setAlertMode = (mode) => {
    setNotifMode(mode)
    updatePreferences({ notifMode: mode })
  }

  const SEV_LABELS = ['Low', 'Moderate', 'High', 'Extreme']
  const sevLabel = SEV_LABELS[severity]
  const sevPct = (severity / 3) * 100

  const roleColors = ROLE_COLORS[user?.role] || ROLE_COLORS.community

  return (
    <div className="sp-page">
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

      <div className="sp-content">

        {/* ── MY PROFILE card ── */}
        <div className="sp-card sp-profile-card">
          {/* Avatar row */}
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

          {/* Profile stats row */}
          <div className="sp-profile-stats">
            <div className="sp-profile-stat">
              <span className="sp-profile-stat-val">{user?.reportsCount ?? 0}</span>
              <span className="sp-profile-stat-label">Reports</span>
            </div>
            <div className="sp-profile-stat-sep" />
            <div className="sp-profile-stat">
              <FileText size={14} style={{ color: roleColors.text }} />
              <span className="sp-profile-stat-label">
                Member since {formatJoinDate(user?.joinedAt)}
              </span>
            </div>
          </div>

          <div className="sp-card-divider" />

          {/* Editable fields */}
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

            <div className="sp-field-group sp-field-group--readonly">
              <label className="sp-field-label">
                <Calendar size={14} />
                Member Since
              </label>
              <div className="sp-field-readonly">{formatJoinDate(user?.joinedAt)}</div>
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

        {/* ── My Role ── */}
        <div className="sp-card">
          <div className="sp-card-header">
            <span className="sp-card-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#5a6475" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </span>
            <div>
              <h2 className="sp-card-title">Alert Role</h2>
              <p className="sp-card-desc">Choose the role that best describes you for alert tailoring.</p>
            </div>
          </div>

          <div className="sp-role-grid">
            {ROLES.map(r => (
              <button
                key={r.id}
                id={`role-${r.id}`}
                className={`sp-role-btn ${role === r.id ? 'sp-role-btn--active' : ''}`}
                onClick={() => setRole(r.id)}
              >
                <r.Icon selected={role === r.id} />
                <span className="sp-role-label">{r.label}</span>
              </button>
            ))}
          </div>

          <div className="sp-info-row">
            <Info size={14} className="sp-info-icon" />
            <span>Your role helps tailor alert types, sources, and urgency.</span>
          </div>
        </div>

        {/* ── Distance Threshold ── */}
        <div className="sp-card">
          <div className="sp-card-header sp-card-header--space">
            <div className="sp-card-header-left">
              <span className="sp-card-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#5a6475" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="10" r="3"/>
                  <path d="M12 2C8.1 2 5 5.1 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.9-3.1-7-7-7z"/>
                </svg>
              </span>
              <div>
                <h2 className="sp-card-title">Distance Threshold</h2>
                <p className="sp-card-desc">You'll receive alerts for hazards within this distance.</p>
              </div>
            </div>
            <span className="sp-value-badge">{distance} km</span>
          </div>

          <div className="sp-slider-wrap">
            <input
              id="distance-slider"
              type="range"
              className="sp-slider sp-slider--blue"
              min={1} max={25} step={1}
              value={distance}
              onChange={e => setDistance(Number(e.target.value))}
              style={{ '--fill-pct': `${((distance - 1) / 24) * 100}%` }}
            />
            <div className="sp-slider-labels">
              <span>1 km</span>
              <span className="sp-slider-rec">(recommended)</span>
              <span>25 km</span>
            </div>
          </div>
        </div>

        {/* ── Severity Threshold ── */}
        <div className="sp-card">
          <div className="sp-card-header sp-card-header--space">
            <div className="sp-card-header-left">
              <span className="sp-card-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#5a6475" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </span>
              <div>
                <h2 className="sp-card-title">Severity Threshold</h2>
                <p className="sp-card-desc">Get alerts for hazards at this severity or higher.</p>
              </div>
            </div>
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
            <p className="sp-sev-rec">(recommended: Moderate or higher)</p>
          </div>
        </div>

        {/* ── Quiet Hours ── */}
        <div className="sp-card sp-card--compact">
          <div className="sp-row-main">
            <span className="sp-card-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#5a6475" strokeWidth="2" strokeLinecap="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </span>
            <div className="sp-row-text">
              <h2 className="sp-card-title">Quiet Hours</h2>
              <p className="sp-card-desc">Pause non-critical notifications during these hours.</p>
            </div>
            <Toggle id="quiet-toggle" on={quietHours} onChange={handleQuietToggle} />
          </div>
          <div className="sp-card-divider" />
          <div className="sp-sub-row">
            <span className="sp-sub-label">Currently: 22:00 – 07:00</span>
            <ChevronRight size={15} className="sp-sub-chevron" />
          </div>
        </div>

        {/* ── High-Confidence Only ── */}
        <div className="sp-card sp-card--compact">
          <div className="sp-row-main">
            <span className="sp-card-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#5a6475" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6L12 2z"/>
              </svg>
            </span>
            <div className="sp-row-text">
              <h2 className="sp-card-title">High-Confidence Only</h2>
              <p className="sp-card-desc">Receive alerts only when system confidence is high. Reduces noise.</p>
            </div>
            <Toggle id="confidence-toggle" on={highConfOnly} onChange={handleHighConfToggle} />
          </div>
          <div className="sp-card-divider" />
          <div className="sp-sub-row sp-sub-row--info">
            <BarChart2 size={14} className="sp-sub-icon" />
            <span className="sp-sub-label">Fewer alerts, higher accuracy. Ideal for reducing alarm fatigue.</span>
          </div>
        </div>

        {/* ── Personalization + subscriptions ── */}
        <div className="sp-card sp-card--compact">
          <div className="sp-card-header">
            <span className="sp-card-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#5a6475" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18M3 12h18" />
              </svg>
            </span>
            <div>
              <h2 className="sp-card-title">Preferences</h2>
              <p className="sp-card-desc">Keep alerts relevant without creating notification overload.</p>
            </div>
          </div>

          <div className="sp-pref-section">
            <div className="sp-section-label">Location subscriptions</div>
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

          <div className="sp-pref-section">
            <div className="sp-section-label">Persona</div>
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

          <div className="sp-pref-section sp-pref-section--inline">
            <div className="sp-inline-field">
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

            <div className="sp-inline-field">
              <label className="sp-section-label">Alert cadence</label>
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
        </div>

        {/* ── Notification Preferences ── */}
        <div className="sp-card sp-card--compact">
          <div className="sp-row-main sp-row-main--header">
            <span className="sp-card-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#5a6475" strokeWidth="2" strokeLinecap="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </span>
            <div>
              <h2 className="sp-card-title">Notification Preferences</h2>
              <p className="sp-card-desc">Choose how you'd like to be notified.</p>
            </div>
          </div>

          <div className="sp-pref-list">
            <PrefRow id="pref-push"   icon={<PushIcon />}   label="Push Notifications" />
            <PrefRow id="pref-sms"    icon={<SMSIcon />}    label="SMS Fallback" />
            <PrefRow id="pref-email"  icon={<EmailIcon />}  label="Email Summary" />
            <PrefRow id="pref-digest" icon={<DigestIcon />} label="In-App Digest" />
          </div>
        </div>

        {/* ── Alarm fatigue controls ── */}
        <div className="sp-card sp-card--compact">
          <div className="sp-row-main sp-row-main--header">
            <span className="sp-card-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#5a6475" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l9 16H3L12 2z" />
                <path d="M12 8v5" />
                <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <div>
              <h2 className="sp-card-title">Alarm Fatigue Controls</h2>
              <p className="sp-card-desc">Hide low-signal noise and reduce repeated alerts from the same area.</p>
            </div>
          </div>

          <div className="sp-pref-section">
            <div className="sp-section-label">Mute hazard types</div>
            <div className="sp-chip-grid">
              {['river', 'fire', 'infrastructure', 'weather', 'seismic'].map(type => (
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

          <div className="sp-pref-section">
            <div className="sp-section-label">Mute areas</div>
            <div className="sp-chip-grid">
              {LOCATION_OPTIONS.map(location => (
                <button
                  key={location}
                  type="button"
                  className={`sp-chip ${mutedAreas.includes(location) ? 'sp-chip--active' : ''}`}
                  onClick={() => toggleMutedArea(location)}
                >
                  {location}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── Footer info bar ── */}
      <div className="sp-footer">
        <Info size={14} className="sp-footer-icon" />
        <span>These settings help reduce alarm fatigue while keeping you informed.</span>
      </div>
    </div>
  )
}
