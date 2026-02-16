import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AUTH_TOKEN_STORAGE_KEY } from '../lib/apiClient'
import { fetchAuthMe, loginWithPassword } from '../services/auth'
import type { AuthUser } from '../types'

type AuthContextValue = {
  loading: boolean
  token: string | null
  isAuthenticated: boolean
  user: AuthUser | null
  profile: AuthUser | null
  signIn: (credentials: { email: string; password: string }) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const AUTH_USER_STORAGE_KEY = 'myphone_auth_user'

function readStoredAuth() {
  if (typeof window === 'undefined') {
    return { token: null, user: null as AuthUser | null }
  }

  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  const userRaw = localStorage.getItem(AUTH_USER_STORAGE_KEY)
  if (!userRaw) {
    return { token, user: null as AuthUser | null }
  }

  try {
    const parsed = JSON.parse(userRaw) as AuthUser
    return { token, user: parsed }
  } catch {
    return { token, user: null as AuthUser | null }
  }
}

function persistAuth(token: string, user: AuthUser) {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user))
}

function clearStoredAuth() {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  localStorage.removeItem(AUTH_USER_STORAGE_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    const stored = readStoredAuth()
    setToken(stored.token)
    setUser(stored.user)

    if (!stored.token) {
      setLoading(false)
      return
    }

    fetchAuthMe()
      .then((me) => {
        setUser(me)
        localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(me))
      })
      .catch(() => {
        clearStoredAuth()
        setToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      token,
      isAuthenticated: Boolean(token),
      user,
      profile: user,
      signIn: async (credentials) => {
        const response = await loginWithPassword(credentials)
        persistAuth(response.token, response.user)
        setToken(response.token)
        setUser(response.user)
      },
      signOut: async () => {
        clearStoredAuth()
        setToken(null)
        setUser(null)
      },
    }),
    [loading, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return ctx
}
