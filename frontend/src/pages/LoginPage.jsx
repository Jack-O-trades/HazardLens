import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

const ROLES = [
  { value: 'community',  name: 'Community Member', desc: 'Browse alerts and stay informed in your area',   icon: '👥' },
  { value: 'reporter',   name: 'Reporter',         desc: 'Submit hazard reports from the field',           icon: '📢' },
  { value: 'verifier',   name: 'Verifier',         desc: 'Review and confirm submitted reports',           icon: '🔍' },
  { value: 'corrector',  name: 'Corrector',        desc: 'Apply corrections to verified alerts',           icon: '🛠️' },
  { value: 'admin',      name: 'Admin',            desc: 'Full platform oversight and management',         icon: '🛡️' },
]

export default function LoginPage() {
  const { login } = useAuth() // assumed signature: login({ name, role })
  const navigate = useNavigate()

  const [selectedRole, setSelectedRole] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!selectedRole) {
      setError('Please select a role to continue.')
      return
    }
    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }

    login({ name: name.trim(), role: selectedRole })
    navigate('/dashboard')
  }

  return (
    <div className="login-page">

      <div>
        <h1 className="login-title">Sign In</h1>
        <p className="login-subtitle">Select your role, then enter your details to continue.</p>
      </div>

      <div className="login-roles">
        {ROLES.map(r => (
          <button
            key={r.value}
            type="button"
            className={`login-role-btn ${selectedRole === r.value ? 'login-role-btn--active' : ''}`}
            onClick={() => setSelectedRole(r.value)}
            aria-pressed={selectedRole === r.value}
          >
            <span className="login-role-icon">{r.icon}</span>
            <div>
              <p className="login-role-name">{r.name}</p>
              <p className="login-role-desc">{r.desc}</p>
            </div>
            {selectedRole === r.value && (
              <span className="login-role-check">
                <Check size={10} strokeWidth={3} />
              </span>
            )}
          </button>
        ))}
      </div>

      <form className="login-form" onSubmit={handleSubmit}>

        <div className="login-field">
          <label className="login-field-label" htmlFor="login-name">Full name</label>
          <input
            id="login-name"
            className="input"
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoComplete="name"
          />
        </div>

        <div className="login-field">
          <label className="login-field-label" htmlFor="login-password">Password</label>
          <div className="login-pass-wrap">
            <input
              id="login-password"
              className="input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="login-pass-toggle"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="btn btn-primary login-submit-btn">
          Sign In
          <ArrowRight size={16} />
        </button>

      </form>

    </div>
  )
}