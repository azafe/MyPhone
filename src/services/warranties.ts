import { supabase } from '../lib/supabase'
import type { Warranty } from '../types'

export async function fetchWarranties(filters: { status?: string; query?: string } = {}) {
  let request = supabase.from('warranties').select('*').order('ends_at', { ascending: true })
  if (filters.status) request = request.eq('status', filters.status)
  if (filters.query) {
    request = request.or(
      `customer_name.ilike.%${filters.query}%,customer_phone.ilike.%${filters.query}%,imei.ilike.%${filters.query}%,issue_reason.ilike.%${filters.query}%,replacement_device_label.ilike.%${filters.query}%`
    )
  }
  const { data, error } = await request
  if (error) throw error
  return (data ?? []) as Warranty[]
}
