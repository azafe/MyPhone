import { apiClient } from '../lib/apiClient'
import type { FinanceSummary } from '../types'

type FinanceResponse = FinanceSummary | { data?: FinanceSummary }

export async function fetchFinanceSummary(from: string, to: string) {
  const response = (await apiClient<FinanceResponse>(`/api/finance/summary?from=${from}&to=${to}`)) as FinanceResponse
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data?: FinanceSummary }).data ?? ({} as FinanceSummary)
  }
  return response as FinanceSummary
}
