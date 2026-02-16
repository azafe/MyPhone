import type { InstallmentRule, QuoteSnapshotPayload } from '../types'
import { asArray, asObject, toQueryString } from './normalizers'
import { requestFirstAvailable } from './request'

const RULES_ENDPOINTS = ['/api/installment-rules', '/api/installments/rules']
const QUOTES_ENDPOINTS = ['/api/installments/quotes', '/api/quotes/installments']

export async function fetchInstallmentRules(filters?: { channel?: string; card_brand?: string }) {
  const query = toQueryString({ channel: filters?.channel, card_brand: filters?.card_brand })
  const response = await requestFirstAvailable<unknown>(RULES_ENDPOINTS.map((endpoint) => `${endpoint}${query}`))
  return asArray<InstallmentRule>(response)
}

export async function upsertInstallmentRule(payload: Partial<InstallmentRule>) {
  if (payload.id) {
    const response = await requestFirstAvailable<unknown>(RULES_ENDPOINTS.map((endpoint) => `${endpoint}/${payload.id}`), {
      method: 'PATCH',
      body: payload,
    })
    return asObject<InstallmentRule>(response)
  }

  const response = await requestFirstAvailable<unknown>(RULES_ENDPOINTS, {
    method: 'POST',
    body: payload,
  })
  return asObject<InstallmentRule>(response)
}

export async function saveQuoteSnapshot(payload: QuoteSnapshotPayload) {
  return requestFirstAvailable<unknown>(QUOTES_ENDPOINTS, {
    method: 'POST',
    body: payload,
  })
}
