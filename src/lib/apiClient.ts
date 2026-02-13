import { supabase } from './supabase'

// Frontend always calls same-origin /api to avoid browser CORS issues.
// Netlify handles prod proxy and Vite handles dev proxy.
const apiBaseUrl = ''

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
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const body = (await response.json()) as { error?: { code?: string; message?: string; details?: unknown } }
      if (body?.error) {
        const err = new Error(body.error.message || `API error: ${response.status}`)
        ;(err as Error & { code?: string; details?: unknown }).code = body.error.code
        ;(err as Error & { code?: string; details?: unknown }).details = body.error.details
        throw err
      }
    }
    const message = await response.text()
    throw new Error(message || `API error: ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
