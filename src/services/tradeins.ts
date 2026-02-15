import { supabase } from '../lib/supabase'
import { apiClient } from '../lib/apiClient'
import type { PlanCanjeValue, TradeIn, TradeStatus } from '../types'

export async function fetchTradeIns(status?: TradeStatus) {
  let query = supabase.from('trade_ins').select('*').order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as TradeIn[]
}

export async function createTradeIn(payload: Partial<TradeIn>) {
  const { data, error } = await supabase.from('trade_ins').insert(payload).select('*').single()
  if (error) throw error
  return data as TradeIn
}

export async function updateTradeIn(id: string, payload: Partial<TradeIn>) {
  const { data, error } = await supabase.from('trade_ins').update(payload).eq('id', id).select('*').single()
  if (error) throw error
  return data as TradeIn
}

export async function convertTradeInToStock(id: string, payload: Record<string, unknown>) {
  return apiClient(`/api/trade-ins/${id}/convert-to-stock`, { method: 'POST', body: payload })
}

export async function fetchPlanCanjeValues() {
  const { data, error } = await supabase
    .from('plan_canje_values')
    .select('*')
    .order('model', { ascending: true })
    .order('battery_min', { ascending: false })
  if (error) throw error
  return (data ?? []) as PlanCanjeValue[]
}
