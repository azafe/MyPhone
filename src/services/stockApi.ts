import { apiClient } from '../lib/apiClient'

export type StockItemPayload = {
  category: string
  brand: string
  model: string
  condition: string
  imei?: string | null
  purchase_usd: number
  fx_rate_used: number
  purchase_ars: number
  sale_price_usd?: number
  sale_price_ars: number
  warranty_days: number
  battery_pct?: number
  storage_gb?: number
  color?: string
  color_other?: string
}

export async function createStockItemApi(payload: StockItemPayload) {
  return apiClient('/api/stock-items', { method: 'POST', body: payload })
}
