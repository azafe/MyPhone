const apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? ''
export const AUTH_TOKEN_STORAGE_KEY = 'myphone_auth_token'

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  auth?: boolean
}

function sanitizeToken(raw: string | null) {
  if (!raw) return null
  const token = raw.trim()
  if (!token || token === 'undefined' || token === 'null') return null
  return token
}

function readToken() {
  if (typeof window === 'undefined') return null

  const primary = sanitizeToken(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY))
  if (primary) return primary

  const legacyKeys = ['myphone_token', 'auth_token', 'token', 'access_token']
  for (const key of legacyKeys) {
    const candidate = sanitizeToken(localStorage.getItem(key))
    if (candidate) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, candidate)
      return candidate
    }
  }

  return null
}

export async function apiClient<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = readToken()
  const requiresAuth = options.auth ?? true
  const url = /^https?:\/\//.test(path) ? path : `${apiBaseUrl}${path}`

  const response = await fetch(url, {
    method: options.method ?? (options.body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(requiresAuth && token ? { Authorization: `Bearer ${token}` } : {}),
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
