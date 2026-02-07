import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

type AuthContextValue = {
  loading: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, active')
    .eq('id', userId)
    .single()

  if (error) {
    throw error
  }

  return data as Profile
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      return
    }

    let cancelled = false

    fetchProfile(session.user.id)
      .then((data) => {
        if (!cancelled) setProfile(data)
      })
      .catch(() => {
        if (!cancelled) setProfile(null)
      })

    return () => {
      cancelled = true
    }
  }, [session?.user?.id])

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      signOut: async () => {
        await supabase.auth.signOut()
      },
    }),
    [loading, session, profile]
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
