import { createContext, useContext, useState, useEffect, useCallback } from 'react'

export const ROLE_LABELS = {
  community: 'Community User',
  reporter: 'Reporter',
  verifier: 'Verifier',
  corrector: 'Corrector',
  admin: 'Admin',
}

const MOCK_USERS = {
  community: {
    id: 'u-005',
    name: 'Maya Chen',
    email: 'maya.chen@riverdale.gov',
    role: 'community',
    avatar: 'MC',
    department: 'Riverdale Community',
    reportsCount: 1,
    joinedAt: '2025-06-12',
  },
  reporter: {
    id: 'u-001',
    name: 'Jordan Lee',
    email: 'jordan.lee@hazardlens.io',
    role: 'reporter',
    avatar: 'JL',
    department: 'Field Operations',
    reportsCount: 2,
    joinedAt: '2025-03-10',
  },
  verifier: {
    id: 'u-002',
    name: 'Sam Rivera',
    email: 'sam.rivera@hazardlens.io',
    role: 'verifier',
    avatar: 'SR',
    department: 'Safety Compliance',
    reportsCount: 0,
    joinedAt: '2024-11-05',
  },
  corrector: {
    id: 'u-003',
    name: 'Alex Morgan',
    email: 'alex.morgan@hazardlens.io',
    role: 'corrector',
    avatar: 'AM',
    department: 'Emergency Response',
    reportsCount: 0,
    joinedAt: '2024-08-20',
  },
  admin: {
    id: 'u-004',
    name: 'Dr. Priya Nair',
    email: 'priya.nair@hazardlens.io',
    role: 'admin',
    avatar: 'PN',
    department: 'Administration',
    reportsCount: 0,
    joinedAt: '2024-01-15',
  },
}

export const ROLE_CAPS = {
  community: { canCorrect: false, canQueue: false, canAdmin: false },
  reporter:  { canCorrect: false, canQueue: false, canAdmin: false },
  verifier:  { canCorrect: false, canQueue: true,  canAdmin: false },
  corrector: { canCorrect: true,  canQueue: true,  canAdmin: false },
  admin:     { canCorrect: true,  canQueue: true,  canAdmin: true  },
}

const DEFAULT_PREFERENCES = {
  alertRole: 'citizen',
  distance: 15,
  severity: 2,
  quietHours: false,
  quietStart: '22:00',
  quietEnd: '07:00',
  highConfOnly: true,
  notifPush: true,
  notifSms: false,
  notifEmail: true,
  notifDigest: true,
}

const SESSION_KEY = 'hl_session'
const PROFILE_KEY = 'hl_profiles'
const PREFS_KEY = 'hl_preferences'

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function getInitials(name) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function mergeUserWithProfile(baseUser) {
  const profiles = loadJson(PROFILE_KEY, {})
  const saved = profiles[baseUser.id]
  if (!saved) return { ...baseUser }
  return {
    ...baseUser,
    ...saved,
    role: baseUser.role,
    id: baseUser.id,
    joinedAt: baseUser.joinedAt,
    avatar: saved.avatarImage ? saved.avatarImage : (saved.name ? getInitials(saved.name) : baseUser.avatar),
  }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const session = loadJson(SESSION_KEY, null)
    if (!session?.roleKey) return null
    const base = MOCK_USERS[session.roleKey]
    if (!base) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    const merged = mergeUserWithProfile(base)
    if (session.customName) {
      merged.name = session.customName
      merged.avatar = getInitials(session.customName)
    }
    return merged
  })

  const [preferences, setPreferences] = useState(() => {
    const all = loadJson(PREFS_KEY, {})
    const uid = user?.id
    return uid && all[uid] ? { ...DEFAULT_PREFERENCES, ...all[uid] } : { ...DEFAULT_PREFERENCES }
  })

  useEffect(() => {
    if (!user) return
    const all = loadJson(PREFS_KEY, {})
    setPreferences({ ...DEFAULT_PREFERENCES, ...(all[user.id] || {}) })
  }, [user?.id])

  const login = useCallback((args) => {
    let roleKey = 'community'
    let customName = ''
    if (args && typeof args === 'object') {
      roleKey = args.role || 'community'
      customName = args.name || ''
    } else if (typeof args === 'string') {
      roleKey = args
    }

    const base = MOCK_USERS[roleKey] || MOCK_USERS.community
    const merged = mergeUserWithProfile(base)
    if (customName) {
      merged.name = customName
      merged.avatar = getInitials(customName)
    }
    setUser(merged)
    saveJson(SESSION_KEY, { roleKey, customName })
    const all = loadJson(PREFS_KEY, {})
    setPreferences({ ...DEFAULT_PREFERENCES, ...(all[merged.id] || {}) })
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(SESSION_KEY)
  }, [])

  const updateProfile = useCallback((updates) => {
    if (!user) return
    const profiles = loadJson(PROFILE_KEY, {})
    const next = {
      ...(profiles[user.id] || {}),
      ...updates,
    }
    if (updates.name && !updates.avatarImage) {
      next.avatar = getInitials(updates.name)
    }
    profiles[user.id] = next
    saveJson(PROFILE_KEY, profiles)
    setUser(prev => ({
      ...prev,
      name: updates.name ?? prev.name,
      email: updates.email ?? prev.email,
      department: updates.department ?? prev.department,
      avatarImage: updates.avatarImage ?? prev.avatarImage,
      avatar: updates.avatarImage
        ? updates.avatarImage
        : (updates.name ? getInitials(updates.name) : prev.avatar),
    }))
  }, [user])

  const updatePreferences = useCallback((updates) => {
    if (!user) return
    const all = loadJson(PREFS_KEY, {})
    const next = { ...(all[user.id] || DEFAULT_PREFERENCES), ...updates }
    all[user.id] = next
    saveJson(PREFS_KEY, all)
    setPreferences(next)
  }, [user])

  const incrementReportsCount = useCallback(() => {
    if (!user) return
    setUser(prev => {
      const count = (prev.reportsCount ?? 0) + 1
      const profiles = loadJson(PROFILE_KEY, {})
      profiles[user.id] = { ...(profiles[user.id] || {}), reportsCount: count }
      saveJson(PROFILE_KEY, profiles)
      return { ...prev, reportsCount: count }
    })
  }, [user])

  const caps = user ? (ROLE_CAPS[user.role] || ROLE_CAPS.community) : {}

  return (
    <AuthContext.Provider value={{
      user,
      caps,
      preferences,
      login,
      logout,
      updateProfile,
      updatePreferences,
      incrementReportsCount,
      getRoleLabel: (role) => ROLE_LABELS[role] || role,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
