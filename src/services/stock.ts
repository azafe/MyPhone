import type { StockItem, StockState } from '../types'
import { asArray, asObject, toQueryString } from './normalizers'
import { requestFirstAvailable } from './request'

const STOCK_ENDPOINTS = ['/api/stock-items']
const hasSupabaseEnv = Boolean(
  String(import.meta.env.VITE_SUPABASE_URL ?? '').trim() &&
    String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim(),
)

type StockFilters = {
  state?: StockState | string
  status?: string
  category?: string
  statuses?: string[]
  model?: string
  storage_gb?: number
  battery_min?: number
  battery_max?: number
  promo?: boolean
  provider?: string
  query?: string
  condition?: string
}

const LEGACY_STOCK_CATEGORIES = new Set(['outlet', 'used_premium', 'new'])

function parseNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function diffDays(fromIso?: string | null) {
  if (!fromIso) return null
  const from = new Date(fromIso)
  if (Number.isNaN(from.getTime())) return null
  const now = new Date()
  const utcFrom = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
  const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.max(0, Math.floor((utcNow - utcFrom) / 86400000))
}

function mapLegacyStatus(
  status?: string | null,
  category?: string | null,
  reserveType?: 'reserva' | 'sena' | string | null,
): StockState {
  if (status === 'sold') return 'sold'
  if (status === 'reserved') return reserveType === 'sena' ? 'deposit' : 'reserved'
  if (status === 'drawer') return 'drawer'
  if (status === 'service_tech') return 'service_tech'
  if (category === 'outlet') return 'outlet'
  if (category === 'used_premium') return 'used_premium'
  if (category === 'new') return 'new'
  return 'new'
}

function mapStateToLegacy(state?: StockState | string | null): {
  status?: StockItem['status']
  category?: string
} {
  switch (state) {
    case 'outlet':
      return { status: 'available', category: 'outlet' }
    case 'used_premium':
      return { status: 'available', category: 'used_premium' }
    case 'new':
      return { status: 'available', category: 'new' }
    case 'reserved':
      return { status: 'reserved' }
    case 'deposit':
      return { status: 'reserved' }
    case 'drawer':
      return { status: 'drawer' }
    case 'service_tech':
      return { status: 'service_tech' }
    case 'sold':
      return { status: 'sold' }
    default:
      return {}
  }
}

function sanitizeLegacyStatus(status?: unknown): StockItem['status'] | undefined {
  if (typeof status !== 'string') return undefined
  if (status === 'outlet' || status === 'used_premium' || status === 'new') return 'available'
  if (status === 'deposit') return 'reserved'
  return status as StockItem['status']
}

function sanitizeLegacyCategory(category?: unknown): string | undefined {
  if (typeof category !== 'string') return undefined
  return LEGACY_STOCK_CATEGORIES.has(category) ? category : undefined
}

function toLegacyPayload(payload: Partial<StockItem>): Partial<StockItem> {
  const legacyPayload: Partial<StockItem> = { ...payload }
  const mapped = mapStateToLegacy(legacyPayload.state)
  const hasCanonicalState = legacyPayload.state != null

  delete legacyPayload.state

  if (hasCanonicalState) {
    legacyPayload.status = mapped.status
    legacyPayload.category = mapped.category
    return legacyPayload
  }

  if (legacyPayload.status == null) {
    legacyPayload.status = mapped.status
  } else {
    legacyPayload.status = sanitizeLegacyStatus(legacyPayload.status)
  }

  legacyPayload.category = sanitizeLegacyCategory(legacyPayload.category)
  if (!legacyPayload.category && mapped.category) {
    legacyPayload.category = mapped.category
  }

  return legacyPayload
}

function normalizeStockItem(raw: Record<string, unknown>): StockItem {
  const state =
    (raw.state as StockState | undefined) ??
    mapLegacyStatus(
      (raw.status as string | undefined) ?? null,
      (raw.category as string | undefined) ?? null,
      (raw.reserve_type as string | undefined) ?? null,
    )
  const receivedAt = (raw.received_at as string | undefined) ?? (raw.created_at as string | undefined) ?? null

  return {
    id: String(raw.id ?? ''),
    state,
    status: (raw.status as StockItem['status']) ?? state,
    category: (raw.category as string | undefined) ?? null,
    brand: (raw.brand as string | undefined) ?? null,
    model: String(raw.model ?? ''),
    storage_gb: parseNumber(raw.storage_gb),
    color: (raw.color as string | undefined) ?? null,
    color_other: (raw.color_other as string | undefined) ?? null,
    condition: (raw.condition as string | undefined) ?? null,
    imei: (raw.imei as string | undefined) ?? null,
    battery_pct: parseNumber(raw.battery_pct),
    purchase_usd: parseNumber(raw.purchase_usd),
    fx_rate_used: parseNumber(raw.fx_rate_used),
    purchase_ars: parseNumber(raw.purchase_ars),
    sale_price_usd: parseNumber(raw.sale_price_usd),
    sale_price_ars: parseNumber(raw.sale_price_ars),
    warranty_days: parseNumber(raw.warranty_days),
    provider_name: (raw.provider_name as string | undefined) ?? null,
    details: (raw.details as string | undefined) ?? null,
    received_at: receivedAt,
    is_promo: Boolean(raw.is_promo),
    is_sealed: Boolean(raw.is_sealed),
    reserve_type: (raw.reserve_type as 'reserva' | 'sena' | undefined) ?? null,
    reserve_amount_ars: parseNumber(raw.reserve_amount_ars),
    reserve_notes: (raw.reserve_notes as string | undefined) ?? null,
    days_in_stock: diffDays(receivedAt),
    created_at: (raw.created_at as string | undefined) ?? undefined,
    updated_at: (raw.updated_at as string | undefined) ?? undefined,
  }
}

function normalizeStockArray(response: unknown): StockItem[] {
  return asArray<Record<string, unknown>>(response).map(normalizeStockItem)
}

function normalizeStockObject(response: unknown): StockItem {
  const raw = asObject<Record<string, unknown>>(response)
  return normalizeStockItem(raw)
}

function applyStateFilter(items: StockItem[], state?: string) {
  if (!state) return items
  return items.filter((item) => item.state === state)
}

function isRouteNotFoundError(error: unknown) {
  const err = error as Error & { code?: string }
  const code = String(err?.code ?? '').toLowerCase()
  const message = String(err?.message ?? '').toLowerCase()

  return (
    code.includes('not_found') ||
    code.includes('route_not_found') ||
    message.includes('route not found') ||
    message.includes('api error: 404') ||
    message.includes(' 404')
  )
}

async function getSupabaseClient() {
  if (!hasSupabaseEnv) {
    return null
  }

  try {
    const module = await import('../lib/supabase')
    return module.supabase
  } catch {
    return null
  }
}

async function fetchStockFromSupabase(filters: StockFilters = {}) {
  const supabase = await getSupabaseClient()
  if (!supabase) {
    throw new Error('Stock API no disponible y Supabase no configurado')
  }

  let query = supabase.from('stock_items').select('*').order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.statuses?.length) query = query.in('status', filters.statuses)
  if (filters.category) query = query.eq('category', filters.category)
  if (filters.model) query = query.ilike('model', `%${filters.model}%`)
  if (filters.storage_gb != null) query = query.eq('storage_gb', filters.storage_gb)
  if (filters.battery_min != null) query = query.gte('battery_pct', filters.battery_min)
  if (filters.battery_max != null) query = query.lte('battery_pct', filters.battery_max)
  if (filters.promo != null) query = query.eq('is_promo', filters.promo)
  if (filters.provider) query = query.ilike('provider_name', `%${filters.provider}%`)
  if (filters.condition) query = query.eq('condition', filters.condition)
  if (filters.query) {
    const encoded = filters.query.replaceAll(',', ' ')
    query = query.or(
      `model.ilike.%${encoded}%,imei.ilike.%${encoded}%,provider_name.ilike.%${encoded}%,details.ilike.%${encoded}%`,
    )
  }

  const { data, error } = await query
  if (error) throw error

  return applyStateFilter(normalizeStockArray(data ?? []), filters.state)
}

async function createStockItemFromSupabase(payload: Partial<StockItem>) {
  const supabase = await getSupabaseClient()
  if (!supabase) throw new Error('Supabase no configurado')
  const { data, error } = await supabase.from('stock_items').insert(toLegacyPayload(payload)).select('*').single()
  if (error) throw error
  return normalizeStockItem((data ?? {}) as Record<string, unknown>)
}

async function updateStockItemFromSupabase(id: string, payload: Partial<StockItem>) {
  const supabase = await getSupabaseClient()
  if (!supabase) throw new Error('Supabase no configurado')
  const { data, error } = await supabase.from('stock_items').update(toLegacyPayload(payload)).eq('id', id).select('*').single()
  if (error) throw error
  return normalizeStockItem((data ?? {}) as Record<string, unknown>)
}

async function deleteStockItemFromSupabase(id: string) {
  const supabase = await getSupabaseClient()
  if (!supabase) throw new Error('Supabase no configurado')
  const { error } = await supabase.from('stock_items').delete().eq('id', id)
  if (error) throw error
  return undefined
}

export async function fetchStock(filters: StockFilters = {}) {
  const mappedState = mapStateToLegacy(filters.state)
  const query = toQueryString({
    status: filters.status ?? mappedState.status,
    statuses: filters.statuses?.join(','),
    category: filters.category ?? mappedState.category,
    model: filters.model,
    storage_gb: filters.storage_gb,
    battery_min: filters.battery_min,
    battery_max: filters.battery_max,
    promo: filters.promo,
    provider: filters.provider,
    query: filters.query,
    condition: filters.condition,
  })

  try {
    const response = await requestFirstAvailable<unknown>(STOCK_ENDPOINTS.map((endpoint) => `${endpoint}${query}`))
    return applyStateFilter(normalizeStockArray(response), filters.state)
  } catch (error) {
    if (isRouteNotFoundError(error) && hasSupabaseEnv) {
      return fetchStockFromSupabase(filters)
    }
    throw error
  }
}

export async function createStockItem(payload: Partial<StockItem>) {
  const wirePayload = toLegacyPayload(payload)

  try {
    const response = await requestFirstAvailable<unknown>(STOCK_ENDPOINTS, {
      method: 'POST',
      body: wirePayload,
    })
    return normalizeStockObject(response)
  } catch (error) {
    if (isRouteNotFoundError(error) && hasSupabaseEnv) {
      return createStockItemFromSupabase(payload)
    }
    throw error
  }
}

export async function updateStockItem(id: string, payload: Partial<StockItem>) {
  const wirePayload = toLegacyPayload(payload)

  try {
    const response = await requestFirstAvailable<unknown>(STOCK_ENDPOINTS.map((endpoint) => `${endpoint}/${id}`), {
      method: 'PATCH',
      body: wirePayload,
    })
    return normalizeStockObject(response)
  } catch (error) {
    if (isRouteNotFoundError(error) && hasSupabaseEnv) {
      return updateStockItemFromSupabase(id, payload)
    }
    throw error
  }
}

export async function upsertStockItem(payload: Partial<StockItem>) {
  if (payload.id) {
    return updateStockItem(payload.id, payload)
  }
  return createStockItem(payload)
}

export async function setStockState(id: string, state: StockState, extra: Partial<StockItem> = {}) {
  const mapped = mapStateToLegacy(state)
  return updateStockItem(id, {
    state,
    status: mapped.status,
    category: mapped.category,
    ...extra,
  })
}

export async function setStockStatus(id: string, status: string, extra: Partial<StockItem> = {}) {
  return updateStockItem(id, { status: status as StockItem['status'], ...extra })
}

export async function setStockPromo(id: string, is_promo: boolean) {
  return updateStockItem(id, { is_promo })
}

export async function reserveStockItem(
  id: string,
  payload: { reserve_type: 'reserva' | 'sena'; reserve_amount_ars?: number; reserve_notes?: string },
) {
  const state = payload.reserve_type === 'reserva' ? 'reserved' : 'deposit'
  const mapped = mapStateToLegacy(state)
  return updateStockItem(id, {
    state,
    status: mapped.status,
    reserve_type: payload.reserve_type,
    reserve_amount_ars: payload.reserve_amount_ars,
    reserve_notes: payload.reserve_notes,
  })
}

export async function deleteStockItem(id: string) {
  try {
    return await requestFirstAvailable<unknown>(STOCK_ENDPOINTS.map((endpoint) => `${endpoint}/${id}`), {
      method: 'DELETE',
    })
  } catch (error) {
    if (isRouteNotFoundError(error) && hasSupabaseEnv) {
      return deleteStockItemFromSupabase(id)
    }
    throw error
  }
}
