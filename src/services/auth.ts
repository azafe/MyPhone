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

  return {
    id,
    email,
    full_name: pickString(raw.full_name) ?? pickString(raw.name) ?? email,
    role: (pickString(raw.role) as AuthUser['role']) ?? 'seller',
  }
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

export async function loginWithPassword(payload: { email: string; password: string }): Promise<LoginResponse> {
  const response = await requestFirstAvailable<unknown>(['/auth/login', '/api/auth/login'], {
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
  const response = await requestFirstAvailable<unknown>(['/auth/me', '/api/auth/me'])
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

  throw new Error('No se pudo resolver usuario autenticado')
}
