import { supabase } from '../lib/supabase'
import { apiClient } from '../lib/apiClient'
import type { Profile } from '../types'

export async function fetchUsers() {
  const { data, error } = await supabase.from('profiles').select('*').order('full_name')
  if (error) throw error
  return (data ?? []) as Profile[]
}

export async function createUser(payload: {
  email: string
  password: string
  full_name: string
  role: 'seller' | 'admin'
}) {
  return apiClient('/api/admin/users', { method: 'POST', body: payload })
}

export async function updateUserRole(id: string, role: 'seller' | 'admin') {
  const { data, error } = await supabase.from('profiles').update({ role }).eq('id', id).select('*').single()
  if (error) throw error
  return data as Profile
}
