import './AuthLayout.css'

function HazardIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className="auth-logo-icon">
      <circle cx="32" cy="32" r="30" fill="hsl(220,25%,10%)" stroke="var(--accent)" strokeWidth="2.5"/>
      <path d="M32 15 L50 47 H14 Z" fill="none" stroke="var(--accent)" strokeWidth="2.8" strokeLinejoin="round"/>
      <circle cx="32" cy="41" r="2.8" fill="var(--accent)"/>
      <rect x="30.5" y="25" width="3" height="12" rx="1.5" fill="var(--accent)"/>
    </svg>
  )
}

export { HazardIcon }

export default function AuthLayout({ children }) {
  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-logo">
          <HazardIcon size={40} />
          <span className="auth-logo-name">Hazard<span>Lens</span></span>
        </div>
        {children}
      </div>
    </div>
  )
}
