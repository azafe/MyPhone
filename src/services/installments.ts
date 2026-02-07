import { supabase } from '../lib/supabase'
import type { InstallmentRule } from '../types'

export async function fetchInstallmentRules() {
  const { data, error } = await supabase.from('installment_rules').select('*')
  if (error) throw error
  return (data ?? []) as InstallmentRule[]
}

export async function upsertInstallmentRule(payload: Partial<InstallmentRule>) {
  const { data, error } = await supabase.from('installment_rules').upsert(payload).select('*').single()
  if (error) throw error
  return data as InstallmentRule
}
