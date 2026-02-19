import type { AuthUser } from '../types'
import { requestFirstAvailable } from './request'

type LoginResponse = {
  token: string
  user: AuthUser | null
}

type SupabaseClient = {
  auth: {
    signInWithPassword: (payload: { email: string; password: string }) => Promise<{
      data: { session: { access_token: string | null } | null; user: Record<string, unknown> | null }
      error: { message: string } | null
    }>
    getUser: () => Promise<{
      data: { user: Record<string, unknown> | null }
      error: { message: string } | null
    }>
  }
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{
          data: Record<string, unknown> | null
          error: { message: string } | null
        }>
      }
    }
  }
}

const hasSupabaseEnv = Boolean(
  String(import.meta.env.VITE_SUPABASE_URL ?? '').trim() &&
    String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim(),
)

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function pickString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function toAuthUser(payload: {
  id: string
  email: string
  full_name?: string | null
  role?: string | null
}): AuthUser {
  return {
    id: payload.id,
    email: payload.email,
    full_name: payload.full_name?.trim() || payload.email,
    role: (payload.role as AuthUser['role']) ?? 'seller',
  }
}

function pickToken(payload: Record<string, unknown>): string | null {
  const direct =
    pickString(payload.token) ??
    pickString(payload.access_token) ??
    pickString(payload.accessToken) ??
    pickString(payload.jwt)
  if (direct) return direct

  const data = asObject(payload.data)
  if (data) {
    const fromData =
      pickString(data.token) ??
      pickString(data.access_token) ??
      pickString(data.accessToken) ??
      pickString(data.jwt)
    if (fromData) return fromData

    const session = asObject(data.session)
    const fromDataSession =
      (session && (pickString(session.access_token) ?? pickString(session.accessToken) ?? pickString(session.token))) ||
      null
    if (fromDataSession) return fromDataSession
  }

  const session = asObject(payload.session)
  if (session) {
    const fromSession = pickString(session.access_token) ?? pickString(session.accessToken) ?? pickString(session.token)
    if (fromSession) return fromSession
  }

  return null
}

function normalizeUser(value: unknown): AuthUser | null {
  const raw = asObject(value)
  if (!raw) return null

  const id = pickString(raw.id)
  const email = pickString(raw.email)
  if (!id || !email) return null

  return toAuthUser({
    id,
    email,
    full_name: pickString(raw.full_name) ?? pickString(raw.name) ?? email,
    role: pickString(raw.role),
  })
}

function pickUser(payload: Record<string, unknown>): AuthUser | null {
  const direct = normalizeUser(payload.user)
  if (direct) return direct

  const data = asObject(payload.data)
  if (!data) return null

  const fromDataUser = normalizeUser(data.user)
  if (fromDataUser) return fromDataUser

  return normalizeUser(data.profile)
}

function isMissingBearerError(error: unknown) {
  const err = error as Error & { code?: string }
  const code = String(err?.code ?? '').toLowerCase()
  const message = String(err?.message ?? '').toLowerCase()

  return code === 'unauthorized' || message.includes('missing bearer token') || message.includes('bearer token')
}

async function loadSupabaseClient(): Promise<SupabaseClient | null> {
  if (!hasSupabaseEnv) {
    return null
  }

  try {
    const module = await import('../lib/supabase')
    return module.supabase as unknown as SupabaseClient
  } catch {
    return null
  }
}

async function fetchSupabaseProfile(supabase: SupabaseClient, userId: string) {
  const response = await supabase.from('profiles').select('id,email,full_name,role').eq('id', userId).maybeSingle()
  return response.data
}

async function loginWithSupabase(payload: { email: string; password: string }): Promise<LoginResponse> {
  const supabase = await loadSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase auth no está configurado')
  }

  const { data, error } = await supabase.auth.signInWithPassword(payload)
  if (error) {
    throw new Error(error.message || 'No se pudo iniciar sesión')
  }

  const token = pickString(data?.session?.access_token)
  if (!token) {
    throw new Error('Supabase login sin token')
  }

  const rawUser = asObject(data?.user)
  if (!rawUser) {
    return {
      token,
      user: null,
    }
  }

  const id = pickString(rawUser.id)
  const email = pickString(rawUser.email) ?? payload.email
  if (!id) {
    return {
      token,
      user: null,
    }
  }

  const profile = await fetchSupabaseProfile(supabase, id)
  const metadata = asObject(rawUser.user_metadata)

  return {
    token,
    user: toAuthUser({
      id,
      email,
      full_name: pickString(profile?.full_name) ?? pickString(metadata?.full_name) ?? email,
      role: pickString(profile?.role),
    }),
  }
}

async function fetchSupabaseMe(): Promise<AuthUser | null> {
  const supabase = await loadSupabaseClient()
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    return null
  }

  const rawUser = asObject(data.user)
  if (!rawUser) {
    return null
  }

  const id = pickString(rawUser.id)
  const email = pickString(rawUser.email)
  if (!id || !email) {
    return null
  }

  const profile = await fetchSupabaseProfile(supabase, id)
  const metadata = asObject(rawUser.user_metadata)

  return toAuthUser({
    id,
    email,
    full_name: pickString(profile?.full_name) ?? pickString(metadata?.full_name) ?? email,
    role: pickString(profile?.role),
  })
}

async function loginWithBackend(payload: { email: string; password: string }): Promise<LoginResponse> {
  const response = await requestFirstAvailable<unknown>(['/api/auth/login'], {
    method: 'POST',
    body: payload,
    auth: false,
  })

  const body = asObject(response)
  if (!body) {
    throw new Error('Respuesta inválida de login')
  }

  const token = pickToken(body)
  if (!token) {
    throw new Error('Login sin token. Revisar formato de respuesta del backend.')
  }

  return {
    token,
    user: pickUser(body),
  }
}

export async function loginWithPassword(payload: { email: string; password: string }): Promise<LoginResponse> {
  if (hasSupabaseEnv) {
    // In current production backend, /api/auth/login is protected by bearer middleware.
    // Prefer Supabase direct auth to keep legacy credentials working.
    return loginWithSupabase(payload)
  }

  try {
    return await loginWithBackend(payload)
  } catch (backendError) {
    // Railway backend can have all /api routes protected and return missing bearer for /api/auth/login.
    if (isMissingBearerError(backendError)) {
      return loginWithSupabase(payload)
    }

    if (hasSupabaseEnv) {
      try {
        return await loginWithSupabase(payload)
      } catch {
        // ignore and throw backend error below
      }
    }

    throw backendError
  }
}

export async function fetchAuthMe(): Promise<AuthUser> {
  if (hasSupabaseEnv) {
    const userFromSupabase = await fetchSupabaseMe()
    if (userFromSupabase) {
      return userFromSupabase
    }
  }

  try {
    const response = await requestFirstAvailable<unknown>(['/api/auth/me'])
    const body = asObject(response)

    if (!body) {
      throw new Error('Respuesta inválida de /auth/me')
    }

    const direct = normalizeUser(body)
    if (direct) return direct

    const fromData = asObject(body.data)
    if (fromData) {
      const normalized = normalizeUser(fromData.user) ?? normalizeUser(fromData.profile) ?? normalizeUser(fromData)
      if (normalized) return normalized
    }
  } catch (backendError) {
    const fromSupabase = await fetchSupabaseMe()
    if (fromSupabase) {
      return fromSupabase
    }

    throw backendError
  }

  const fromSupabase = await fetchSupabaseMe()
  if (fromSupabase) {
    return fromSupabase
  }

  throw new Error('No se pudo resolver usuario autenticado')
}
