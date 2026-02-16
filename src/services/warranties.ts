import type { Warranty } from '../types'
import { asArray, asObject, toQueryString } from './normalizers'
import { requestFirstAvailable } from './request'

const WARRANTY_ENDPOINTS = ['/api/warranties', '/api/warranty-cases']

export async function fetchWarranties(filters: { status?: string; query?: string } = {}) {
  const query = toQueryString({ status: filters.status, query: filters.query })
  const response = await requestFirstAvailable<unknown>(WARRANTY_ENDPOINTS.map((endpoint) => `${endpoint}${query}`))
  return asArray<Warranty>(response)
}

export async function createWarranty(payload: Partial<Warranty>) {
  const response = await requestFirstAvailable<unknown>(WARRANTY_ENDPOINTS, {
    method: 'POST',
    body: payload,
  })
  return asObject<Warranty>(response)
}

export async function updateWarranty(id: string, payload: Partial<Warranty>) {
  const response = await requestFirstAvailable<unknown>(WARRANTY_ENDPOINTS.map((endpoint) => `${endpoint}/${id}`), {
    method: 'PATCH',
    body: payload,
  })
  return asObject<Warranty>(response)
}
