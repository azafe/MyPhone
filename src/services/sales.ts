import { apiClient } from '../lib/apiClient'
import type { Sale } from '../types'

type SalesResponse = unknown

type SalesEnvelope = {
  data?: unknown
  rows?: unknown
  sales?: unknown
}

export async function fetchSales(query?: string) {
  const response = (await apiClient('/api/sales')) as SalesResponse
  const root = response as SalesEnvelope
  const nested = (root?.data ?? {}) as SalesEnvelope
  const data =
    (Array.isArray(response) && (response as Sale[])) ||
    (Array.isArray(root?.data) && (root.data as Sale[])) ||
    (Array.isArray(nested?.data) && (nested.data as Sale[])) ||
    (Array.isArray(nested?.rows) && (nested.rows as Sale[])) ||
    (Array.isArray(nested?.sales) && (nested.sales as Sale[])) ||
    (Array.isArray(root?.rows) && (root.rows as Sale[])) ||
    (Array.isArray(root?.sales) && (root.sales as Sale[])) ||
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
  customer?: { name: string; phone: string }
  customer_id?: string
  payment_method?: string
  card_brand?: string | null
  installments?: number | null
  surcharge_pct?: number | null
  deposit_ars?: number | null
  total_ars: number
  items: Array<{ stock_item_id: string; qty: number; sale_price_ars: number }>
  payment?: {
    method: string
    card_brand?: string | null
    installments?: number | null
    surcharge_pct?: number | null
    deposit_ars?: number | null
    total_ars: number
  }
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
