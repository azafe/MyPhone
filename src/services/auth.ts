import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/browser'
import type { AuthUser } from '../types'
import { requestFirstAvailable } from './request'

type LoginResponse = {
  token: string
  user: AuthUser | null
}

type PasskeyOptionsResponse<TOptions> = {
  challenge_id: string
  options: TOptions
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

function ensurePasskeySupported() {
  if (!browserSupportsWebAuthn()) {
    throw new Error('Este dispositivo no soporta Face ID / Passkeys')
  }
}

function parsePasskeyOptions<TOptions>(payload: unknown): PasskeyOptionsResponse<TOptions> {
  const body = asObject(payload)
  if (!body) {
    throw new Error('Respuesta inválida del servidor de passkeys')
  }

  const challengeId = pickString(body.challenge_id)
  const options = body.options as TOptions | undefined

  if (!challengeId || !options || typeof options !== 'object') {
    throw new Error('Opciones de passkey incompletas')
  }

  return {
    challenge_id: challengeId,
    options,
  }
}

function mapPasskeyError(error: unknown, fallback: string) {
  const err = error as Error & { name?: string }
  const name = String(err?.name ?? '')

  if (name === 'NotAllowedError') {
    return 'Operación cancelada. Volvé a intentar Face ID.'
  }

  if (name === 'InvalidStateError') {
    return 'La credencial ya está registrada en este dispositivo.'
  }

  return err?.message || fallback
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

export function supportsPasskeyLogin() {
  return browserSupportsWebAuthn()
}

export async function loginWithPasskey(emailRaw?: string): Promise<LoginResponse> {
  ensurePasskeySupported()
  const email = (emailRaw ?? '').trim().toLowerCase()

  const optionsResponse = await requestFirstAvailable<unknown>(['/api/auth/passkeys/login/options'], {
    method: 'POST',
    body: email ? { email } : {},
    auth: false,
  })

  const loginOptions = parsePasskeyOptions<PublicKeyCredentialRequestOptionsJSON>(optionsResponse)

  let assertion: AuthenticationResponseJSON
  try {
    assertion = await startAuthentication({
      optionsJSON: loginOptions.options,
    })
  } catch (error) {
    throw new Error(mapPasskeyError(error, 'No se pudo completar la autenticación con Face ID'))
  }

  const verifyResponse = await requestFirstAvailable<unknown>(['/api/auth/passkeys/login/verify'], {
    method: 'POST',
    body: {
      challenge_id: loginOptions.challenge_id,
      response: assertion,
    },
    auth: false,
  })

  const body = asObject(verifyResponse)
  if (!body) {
    throw new Error('Respuesta inválida de login con Face ID')
  }

  const token = pickToken(body)
  if (!token) {
    throw new Error('Login con Face ID sin token')
  }

  return {
    token,
    user: pickUser(body),
  }
}

export async function registerPasskeyForCurrentSession() {
  ensurePasskeySupported()

  const optionsResponse = await requestFirstAvailable<unknown>(['/api/auth/passkeys/register/options'], {
    method: 'POST',
    body: {},
  })

  const registerOptions = parsePasskeyOptions<PublicKeyCredentialCreationOptionsJSON>(optionsResponse)

  let attestation: RegistrationResponseJSON
  try {
    attestation = await startRegistration({
      optionsJSON: registerOptions.options,
    })
  } catch (error) {
    throw new Error(mapPasskeyError(error, 'No se pudo activar Face ID'))
  }

  await requestFirstAvailable(['/api/auth/passkeys/register/verify'], {
    method: 'POST',
    body: {
      challenge_id: registerOptions.challenge_id,
      response: attestation,
    },
  })
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
