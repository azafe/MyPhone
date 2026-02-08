import { supabase } from '../lib/supabase'
import type { StockItem, StockStatus } from '../types'

export type StockFilters = {
  category?: string
  status?: StockStatus
  statuses?: StockStatus[]
  query?: string
  condition?: string
}

export async function fetchStock(filters: StockFilters = {}) {
  let query = supabase.from('stock_items').select('*').order('created_at', { ascending: false })

  if (filters.category) query = query.eq('category', filters.category)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.statuses && filters.statuses.length > 0) {
    query = query.in('status', filters.statuses)
  }
  if (filters.condition) query = query.eq('condition', filters.condition)
  if (filters.query) {
    query = query.or(`brand.ilike.%${filters.query}%,model.ilike.%${filters.query}%,imei.ilike.%${filters.query}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as StockItem[]
}

export async function upsertStockItem(payload: Partial<StockItem>) {
  const { data, error } = await supabase.from('stock_items').upsert(payload).select('*').single()
  if (error) throw error
  return data as StockItem
}

export async function setStockStatus(id: string, status: StockStatus) {
  const { data, error } = await supabase
    .from('stock_items')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as StockItem
}

export async function deleteStockItem(id: string) {
  const { error } = await supabase.from('stock_items').delete().eq('id', id)
  if (error) throw error
}
