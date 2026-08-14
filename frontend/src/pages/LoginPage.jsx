import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import './LoginPage.css'

const ROLES = [
  {
    id: 'community',
    label: 'Community',
    icon: '👥',
    desc: 'Receive local hazard alerts and report observations',
    color: 'hsl(210,65%,55%)',
    email: 'maya.chen@riverdale.gov',
    pass: 'community123',
  },
  {
    id: 'reporter',
    label: 'Reporter',
    icon: '📋',
    desc: 'Submit hazard reports from the field',
    color: 'hsl(42,95%,55%)',
    email: 'jordan.lee@hazardlens.io',
    pass: 'reporter123',
  },
  {
    id: 'verifier',
    label: 'Verifier',
    icon: '🔍',
    desc: 'Review and verify submitted incidents',
    color: 'hsl(195,70%,55%)',
    email: 'sam.rivera@hazardlens.io',
    pass: 'verifier123',
  },
  {
    id: 'corrector',
    label: 'Corrector',
    icon: '🛠️',
    desc: 'Implement and document corrections',
    color: 'hsl(145,60%,48%)',
    email: 'alex.morgan@hazardlens.io',
    pass: 'corrector123',
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: '🛡️',
    desc: 'Full platform administration',
    color: 'hsl(280,70%,68%)',
    email: 'priya.nair@hazardlens.io',
    pass: 'admin123',
  },
]

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function selectRole(role) {
    setSelectedRole(role)
    setEmail(role.email)
    setPassword(role.pass)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedRole) { setError('Please select a role to continue.'); return }
    setLoading(true)
    // Simulate network delay
    await new Promise(r => setTimeout(r, 600))
    login(selectedRole.id)
    navigate('/dashboard')
  }

  return (
    <div className="login-page">
      <h2 className="login-title">Welcome Back</h2>
      <p className="login-subtitle">Select your role to sign in</p>

      {/* Role selection */}
      <div className="login-roles">
        {ROLES.map((role) => (
          <button
            key={role.id}
            id={`role-btn-${role.id}`}
            className={`login-role-btn ${selectedRole?.id === role.id ? 'login-role-btn--active' : ''}`}
            style={selectedRole?.id === role.id ? { borderColor: role.color, boxShadow: `0 0 0 3px ${role.color}22` } : {}}
            onClick={() => selectRole(role)}
            type="button"
          >
            <span className="login-role-icon">{role.icon}</span>
            <div>
              <p className="login-role-name" style={selectedRole?.id === role.id ? { color: role.color } : {}}>
                {role.label}
              </p>
              <p className="login-role-desc">{role.desc}</p>
            </div>
            {selectedRole?.id === role.id && (
              <span className="login-role-check" style={{ background: role.color }}>✓</span>
            )}
          </button>
        ))}
      </div>

      {/* Credentials form */}
      <form className="login-form" onSubmit={handleSubmit} id="login-form">
        <div className="input-group">
          <label className="input-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
          />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="login-password">Password</label>
          <div className="login-pass-wrap">
            <input
              id="login-password"
              type={showPass ? 'text' : 'password'}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              className="login-pass-toggle"
              onClick={() => setShowPass(!showPass)}
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && <p className="login-error">{error}</p>}

        <button
          id="login-submit-btn"
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 4, justifyContent: 'center' }}
          disabled={loading}
        >
          {loading ? <span className="spinner" /> : <>Sign In <ArrowRight size={16} /></>}
        </button>
      </form>

      <p className="login-hint">
        💡 Click any role above to auto-fill demo credentials
      </p>
    </div>
  )
}
