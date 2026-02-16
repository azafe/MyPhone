import { requestFirstAvailable } from './request'
import type { AuthUser } from '../types'

type LoginResponse = {
  token: string
  user: AuthUser
}

export async function loginWithPassword(payload: { email: string; password: string }) {
  return requestFirstAvailable<LoginResponse>(['/auth/login', '/api/auth/login'], {
    method: 'POST',
    body: payload,
    auth: false,
  })
}

export async function fetchAuthMe() {
  return requestFirstAvailable<AuthUser>(['/auth/me', '/api/auth/me'])
}
