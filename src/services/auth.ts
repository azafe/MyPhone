import type { AuthUser } from '../types'
import { requestFirstAvailable } from './request'

type LoginResponse = {
  token: string
  user: AuthUser | null
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function pickString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function pickRole(value: unknown): AuthUser['role'] | null {
  const role = pickString(value)?.toLowerCase()
  if (!role) return null
  if (role === 'owner' || role === 'admin' || role === 'seller' || role === 'user') {
    return role
  }
  return null
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
    role: pickRole(payload.role) ?? 'seller',
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
  if (!data) return null

  return (
    pickString(data.token) ??
    pickString(data.access_token) ??
    pickString(data.accessToken) ??
    pickString(data.jwt)
  )
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

  return normalizeUser(data.profile) ?? normalizeUser(data)
}

export async function loginWithPassword(payload: { email: string; password: string }): Promise<LoginResponse> {
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

export async function fetchAuthMe(): Promise<AuthUser> {
  const response = await requestFirstAvailable<unknown>(['/api/auth/me'])
  const body = asObject(response)

  if (!body) {
    throw new Error('Respuesta inválida de /auth/me')
  }

  const direct = normalizeUser(body)
  if (direct) return direct

  const data = asObject(body.data)
  if (data) {
    const normalized = normalizeUser(data.user) ?? normalizeUser(data.profile) ?? normalizeUser(data)
    if (normalized) return normalized
  }

  throw new Error('No se pudo resolver usuario autenticado')
}
