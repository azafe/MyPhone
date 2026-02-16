type Envelope = {
  data?: unknown
  rows?: unknown
  items?: unknown
  results?: unknown
  sales?: unknown
}

export function asArray<T>(response: unknown): T[] {
  const root = response as Envelope
  const nested = (root?.data ?? {}) as Envelope

  return (
    (Array.isArray(response) ? (response as T[]) : null) ||
    (Array.isArray(root?.data) ? (root.data as T[]) : null) ||
    (Array.isArray(root?.rows) ? (root.rows as T[]) : null) ||
    (Array.isArray(root?.items) ? (root.items as T[]) : null) ||
    (Array.isArray(root?.results) ? (root.results as T[]) : null) ||
    (Array.isArray(root?.sales) ? (root.sales as T[]) : null) ||
    (Array.isArray(nested?.data) ? (nested.data as T[]) : null) ||
    (Array.isArray(nested?.rows) ? (nested.rows as T[]) : null) ||
    (Array.isArray(nested?.items) ? (nested.items as T[]) : null) ||
    (Array.isArray(nested?.results) ? (nested.results as T[]) : null) ||
    (Array.isArray(nested?.sales) ? (nested.sales as T[]) : null) ||
    []
  )
}

export function asObject<T>(response: unknown): T {
  const root = response as Envelope
  if (root && typeof root === 'object' && root.data && typeof root.data === 'object' && !Array.isArray(root.data)) {
    return root.data as T
  }
  return response as T
}

export function toQueryString(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    search.set(key, String(value))
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}
