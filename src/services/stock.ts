import type { StockItem, StockState } from '../types'
import { asArray, asObject, toQueryString } from './normalizers'
import { requestFirstAvailable } from './request'

const STOCK_ENDPOINTS = ['/api/stock-items', '/api/stock']

type StockFilters = {
  state?: string
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

function mapLegacyStatus(status?: string | null, category?: string | null): StockState {
  if (status === 'sold') return 'sold'
  if (status === 'reserved') return 'reserved'
  if (status === 'drawer') return 'drawer'
  if (status === 'service_tech') return 'service_tech'
  if (category === 'outlet') return 'outlet'
  if (category === 'used_premium') return 'used_premium'
  if (category === 'new') return 'new'
  return 'new'
}

function normalizeStockItem(raw: Record<string, unknown>): StockItem {
  const state = (raw.state as StockState | undefined) ?? mapLegacyStatus((raw.status as string | undefined) ?? null, (raw.category as string | undefined) ?? null)
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

export async function fetchStock(filters: StockFilters = {}) {
  const query = toQueryString({
    state: filters.state,
    status: filters.status,
    statuses: filters.statuses?.join(','),
    category: filters.category,
    model: filters.model,
    storage_gb: filters.storage_gb,
    battery_min: filters.battery_min,
    battery_max: filters.battery_max,
    promo: filters.promo,
    provider: filters.provider,
    query: filters.query,
    condition: filters.condition,
  })

  const response = await requestFirstAvailable<unknown>(STOCK_ENDPOINTS.map((endpoint) => `${endpoint}${query}`))
  return normalizeStockArray(response)
}

export async function createStockItem(payload: Partial<StockItem>) {
  const response = await requestFirstAvailable<unknown>(STOCK_ENDPOINTS, {
    method: 'POST',
    body: payload,
  })
  return asObject<StockItem>(response)
}

export async function updateStockItem(id: string, payload: Partial<StockItem>) {
  const response = await requestFirstAvailable<unknown>(STOCK_ENDPOINTS.map((endpoint) => `${endpoint}/${id}`), {
    method: 'PATCH',
    body: payload,
  })
  return asObject<StockItem>(response)
}

export async function upsertStockItem(payload: Partial<StockItem>) {
  if (payload.id) {
    return updateStockItem(payload.id, payload)
  }
  return createStockItem(payload)
}

export async function setStockState(id: string, state: StockState, extra: Partial<StockItem> = {}) {
  return updateStockItem(id, { state, ...extra })
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
  return updateStockItem(id, {
    state: payload.reserve_type === 'reserva' ? 'reserved' : 'deposit',
    status: payload.reserve_type === 'reserva' ? 'reserved' : 'deposit',
    reserve_type: payload.reserve_type,
    reserve_amount_ars: payload.reserve_amount_ars,
    reserve_notes: payload.reserve_notes,
  })
}

export async function deleteStockItem(id: string) {
  return requestFirstAvailable<unknown>(STOCK_ENDPOINTS.map((endpoint) => `${endpoint}/${id}`), {
    method: 'DELETE',
  })
}
