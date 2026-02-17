type Envelope = {
  data?: unknown
  rows?: unknown
  items?: unknown
  results?: unknown
  sales?: unknown
  stock?: unknown
  stock_items?: unknown
  trade_ins?: unknown
  warranties?: unknown
  users?: unknown
  rules?: unknown
  values?: unknown
  list?: unknown
  records?: unknown
}

function firstArray(value: unknown): unknown[] | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const entries = Object.values(value as Record<string, unknown>)
  for (const item of entries) {
    if (Array.isArray(item)) return item
  }
  return null
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
    (Array.isArray(root?.stock) ? (root.stock as T[]) : null) ||
    (Array.isArray(root?.stock_items) ? (root.stock_items as T[]) : null) ||
    (Array.isArray(root?.trade_ins) ? (root.trade_ins as T[]) : null) ||
    (Array.isArray(root?.warranties) ? (root.warranties as T[]) : null) ||
    (Array.isArray(root?.users) ? (root.users as T[]) : null) ||
    (Array.isArray(root?.rules) ? (root.rules as T[]) : null) ||
    (Array.isArray(root?.values) ? (root.values as T[]) : null) ||
    (Array.isArray(root?.list) ? (root.list as T[]) : null) ||
    (Array.isArray(root?.records) ? (root.records as T[]) : null) ||
    (Array.isArray(nested?.data) ? (nested.data as T[]) : null) ||
    (Array.isArray(nested?.rows) ? (nested.rows as T[]) : null) ||
    (Array.isArray(nested?.items) ? (nested.items as T[]) : null) ||
    (Array.isArray(nested?.results) ? (nested.results as T[]) : null) ||
    (Array.isArray(nested?.sales) ? (nested.sales as T[]) : null) ||
    (Array.isArray(nested?.stock) ? (nested.stock as T[]) : null) ||
    (Array.isArray(nested?.stock_items) ? (nested.stock_items as T[]) : null) ||
    (Array.isArray(nested?.trade_ins) ? (nested.trade_ins as T[]) : null) ||
    (Array.isArray(nested?.warranties) ? (nested.warranties as T[]) : null) ||
    (Array.isArray(nested?.users) ? (nested.users as T[]) : null) ||
    (Array.isArray(nested?.rules) ? (nested.rules as T[]) : null) ||
    (Array.isArray(nested?.values) ? (nested.values as T[]) : null) ||
    (Array.isArray(nested?.list) ? (nested.list as T[]) : null) ||
    (Array.isArray(nested?.records) ? (nested.records as T[]) : null) ||
    (firstArray(root) as T[] | null) ||
    (firstArray(nested) as T[] | null) ||
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
