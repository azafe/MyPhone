import type { AdminUser } from '../types'
import { asArray, asObject } from './normalizers'
import { requestFirstAvailable } from './request'

const ADMIN_USERS_ENDPOINT = '/api/admin/users'

function normalizeAdminUser(raw: Partial<AdminUser>): AdminUser {
  const role = String(raw.role ?? 'seller').toLowerCase()
  const safeRole: AdminUser['role'] = role === 'owner' || role === 'admin' ? role : 'seller'

  return {
    id: String(raw.id ?? ''),
    email: raw.email ?? null,
    full_name: String(raw.full_name ?? '').trim() || String(raw.email ?? 'Sin nombre'),
    role: safeRole,
    is_enabled: Boolean(raw.is_enabled ?? true),
  }
}

function unwrapAdminUser(response: unknown): Partial<AdminUser> {
  const root = asObject<Record<string, unknown>>(response)
  const user = root && root.user && typeof root.user === 'object' ? (root.user as Partial<AdminUser>) : null
  const profile = root && root.profile && typeof root.profile === 'object' ? (root.profile as Partial<AdminUser>) : null
  return user ?? profile ?? (root as Partial<AdminUser>)
}

export async function getAdminUsers() {
  const response = await requestFirstAvailable<unknown>([ADMIN_USERS_ENDPOINT])
  return asArray<AdminUser>(response).map(normalizeAdminUser)
}

export async function createUser(payload: {
  email: string
  password: string
  full_name: string
  role: 'seller' | 'admin'
}) {
  const response = await requestFirstAvailable<unknown>([ADMIN_USERS_ENDPOINT], {
    method: 'POST',
    body: payload,
  })
  return normalizeAdminUser(unwrapAdminUser(response))
}

export async function updateUserRole(id: string, role: 'seller' | 'admin') {
  const response = await requestFirstAvailable<unknown>([`${ADMIN_USERS_ENDPOINT}/${id}`], {
    method: 'PATCH',
    body: { role },
  })
  return normalizeAdminUser(unwrapAdminUser(response))
}

export async function deleteAdminUser(userId: string) {
  return requestFirstAvailable<unknown>([`${ADMIN_USERS_ENDPOINT}/${userId}`], {
    method: 'DELETE',
  })
}

export const fetchUsers = getAdminUsers
