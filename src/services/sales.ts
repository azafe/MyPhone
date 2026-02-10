import { apiClient } from '../lib/apiClient'
import type { Sale } from '../types'

type SalesResponse =
  | Sale[]
  | { data?: Sale[] | { data?: Sale[]; rows?: Sale[]; sales?: Sale[] } }
  | { rows?: Sale[] }
  | { sales?: Sale[] }

export async function fetchSales(query?: string) {
  const response = (await apiClient('/api/sales')) as SalesResponse
  const data =
    (Array.isArray(response) && response) ||
    (Array.isArray(response?.data) && response?.data) ||
    (Array.isArray(response?.data?.data) && response?.data?.data) ||
    (Array.isArray(response?.data?.rows) && response?.data?.rows) ||
    (Array.isArray(response?.data?.sales) && response?.data?.sales) ||
    (Array.isArray((response as { rows?: Sale[] }).rows) && (response as { rows?: Sale[] }).rows) ||
    (Array.isArray((response as { sales?: Sale[] }).sales) && (response as { sales?: Sale[] }).sales) ||
    []
  if (!query) return data
  const q = query.toLowerCase()
  return data.filter((sale) => {
    return (
      sale.customer_name?.toLowerCase().includes(q) ||
      sale.customer_phone?.toLowerCase().includes(q) ||
      sale.stock_imei?.toLowerCase().includes(q) ||
      sale.stock_model?.toLowerCase().includes(q) ||
      sale.stock_item_id?.toLowerCase().includes(q)
    )
  })
}

export type CreateSalePayload = {
  sale_date: string
  customer: { name: string; phone: string }
  payment: {
    method: string
    card_brand?: string | null
    installments?: number | null
    surcharge_pct?: number | null
    deposit_ars?: number | null
    total_ars: number
  }
  items: Array<{ stock_item_id: string; sale_price_ars: number }>
  trade_in?: {
    enabled: boolean
    device: {
      brand: string
      model: string
      storage_gb?: number
      color?: string
      condition?: string
      imei?: string
    }
    trade_value_usd: number
    fx_rate_used: number
  }
}

export async function createSale(payload: CreateSalePayload) {
  return apiClient('/api/sales', { method: 'POST', body: payload })
}

export async function deleteSale(id: string) {
  return apiClient(`/api/sales/${id}`, { method: 'DELETE' })
}
