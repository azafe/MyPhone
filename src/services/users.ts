import type { Profile } from '../types'
import { asArray, asObject } from './normalizers'
import { requestFirstAvailable } from './request'

const USER_ENDPOINTS = ['/api/admin/users', '/api/users']

export async function fetchUsers() {
  const response = await requestFirstAvailable<unknown>(USER_ENDPOINTS)
  return asArray<Profile>(response)
}

export async function createUser(payload: {
  email: string
  password: string
  full_name: string
  role: 'seller' | 'admin'
}) {
  const response = await requestFirstAvailable<unknown>(USER_ENDPOINTS, {
    method: 'POST',
    body: payload,
  })
  return asObject<Profile>(response)
}

export async function updateUserRole(id: string, role: 'seller' | 'admin') {
  const response = await requestFirstAvailable<unknown>(USER_ENDPOINTS.map((endpoint) => `${endpoint}/${id}`), {
    method: 'PATCH',
    body: { role },
  })
  return asObject<Profile>(response)
}
