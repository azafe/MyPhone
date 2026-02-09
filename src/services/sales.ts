import { supabase } from '../lib/supabase'
import { apiClient } from '../lib/apiClient'
import type { Sale } from '../types'

export async function fetchSales(query?: string) {
  let request = supabase.from('sales').select('*').order('created_at', { ascending: false })
  if (query) {
    request = request.or(
      `customer_name.ilike.%${query}%,customer_phone.ilike.%${query}%,imei.ilike.%${query}%`
    )
  }
  const { data, error } = await request
  if (error) throw error
  return (data ?? []) as Sale[]
}

export type CreateSalePayload = {
  sale_date: string
  customer: { name: string; phone: string }
  payment: {
    method: string
    card_brand?: string | null
    installments?: number
    surcharge_pct?: number
    deposit_ars?: number
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
