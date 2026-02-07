import { supabase } from './supabase'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
}

export async function apiClient<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? (options.body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `API error: ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
