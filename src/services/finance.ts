import { apiClient } from '../lib/apiClient'
import type { FinanceSummary } from '../types'

export async function fetchFinanceSummary(from: string, to: string) {
  return apiClient<FinanceSummary>(`/api/finance/summary?from=${from}&to=${to}`)
}
