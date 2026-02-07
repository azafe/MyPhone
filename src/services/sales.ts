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

export async function createSale(payload: Record<string, unknown>) {
  return apiClient('/api/sales', { method: 'POST', body: payload })
}
