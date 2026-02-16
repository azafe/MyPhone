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

function sanitizeToken(raw: string | null) {
  if (!raw) return null
  const value = raw.trim()
  if (!value || value === 'undefined' || value === 'null') return null
  return value
}

function readStoredAuth() {
  if (typeof window === 'undefined') {
    return { token: null, user: null as AuthUser | null }
  }

  const token = sanitizeToken(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY))
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

function persistAuth(token: string, user: AuthUser | null) {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
  if (user) {
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(AUTH_USER_STORAGE_KEY)
  }
}

function clearStoredAuth() {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
  localStorage.removeItem(AUTH_USER_STORAGE_KEY)
}

function shouldDropSession(error: unknown) {
  const err = error as Error & { code?: string }
  const message = String(err?.message ?? '').toLowerCase()
  const code = String(err?.code ?? '').toLowerCase()

  return (
    code.includes('unauthorized') ||
    code.includes('forbidden') ||
    code.includes('invalid_token') ||
    message.includes('401') ||
    message.includes('403')
  )
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
      .catch((error) => {
        if (shouldDropSession(error)) {
          clearStoredAuth()
          setToken(null)
          setUser(null)
          return
        }

        // Keep token if /auth/me is unavailable but credentials are valid for API usage.
        setUser(stored.user)
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
        const nextToken = sanitizeToken(response.token)
        if (!nextToken) {
          throw new Error('Login sin token válido')
        }

        // Persist token first so any subsequent request (e.g. /auth/me) already sends Bearer.
        setToken(nextToken)

        let nextUser = response.user
        if (nextUser) {
          setUser(nextUser)
        }

        persistAuth(nextToken, nextUser)

        if (!nextUser) {
          try {
            nextUser = await fetchAuthMe()
          } catch {
            nextUser = {
              id: 'me',
              email: credentials.email,
              full_name: credentials.email,
              role: 'seller',
            }
          }
        }

        persistAuth(nextToken, nextUser)
        setUser(nextUser)
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
