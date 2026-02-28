import type { StockItem, StockState } from '../types'
import { asArray, asObject, toQueryString } from './normalizers'
import { requestFirstAvailable } from './request'

const STOCK_ENDPOINTS = ['/api/stock-items']

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
  page?: number
  page_size?: number
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
}

const LEGACY_STOCK_CATEGORIES = new Set(['outlet', 'used_premium', 'new'])

export type StockPageResult = {
  items: StockItem[]
  total: number
  page: number
  page_size: number
  serverPagination: boolean
}

export const STOCK_SOLD_LINKED_LABEL = 'Vendido (vinculado a venta)'
export const STOCK_SOLD_LINKED_HELP = 'Para revertir, cancelar la venta o reingresar el equipo.'
export const STOCK_CONFLICT_MESSAGE = 'El equipo ya está vendido y no puede cambiarse desde stock. Cancelá la venta o reingresalo.'
export const STOCK_PROMO_BLOCKED_MESSAGE = 'El equipo ya está vendido y no puede marcarse como promo.'

function parseNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parsePositiveInt(value: unknown) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function asOptionalString(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function pickNumber(record: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!record) return null
  for (const key of keys) {
    const parsed = parseNumber(record[key])
    if (parsed != null) return parsed
  }
  return null
}

function extractPaginationMeta(response: unknown) {
  const root = asRecord(response)
  const nested = asRecord(root?.data)
  const rootPagination = asRecord(root?.pagination)
  const nestedPagination = asRecord(nested?.pagination)

  const total =
    pickNumber(root, ['total', 'total_count', 'count']) ??
    pickNumber(nested, ['total', 'total_count', 'count']) ??
    pickNumber(rootPagination, ['total', 'total_count', 'count']) ??
    pickNumber(nestedPagination, ['total', 'total_count', 'count'])

  const page =
    parsePositiveInt(root?.page) ??
    parsePositiveInt(root?.current_page) ??
    parsePositiveInt(nested?.page) ??
    parsePositiveInt(nested?.current_page) ??
    parsePositiveInt(rootPagination?.page) ??
    parsePositiveInt(rootPagination?.current_page) ??
    parsePositiveInt(nestedPagination?.page) ??
    parsePositiveInt(nestedPagination?.current_page)

  const pageSize =
    parsePositiveInt(root?.page_size) ??
    parsePositiveInt(root?.per_page) ??
    parsePositiveInt(nested?.page_size) ??
    parsePositiveInt(nested?.per_page) ??
    parsePositiveInt(rootPagination?.page_size) ??
    parsePositiveInt(rootPagination?.per_page) ??
    parsePositiveInt(nestedPagination?.page_size) ??
    parsePositiveInt(nestedPagination?.per_page)

  return {
    total,
    page,
    pageSize,
    serverPagination: total != null,
  }
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

export function isStockItemSoldOrLinked(item: Pick<StockItem, 'state' | 'status' | 'sale_id'>) {
  const status = String(item.status ?? '').toLowerCase()
  const isSoldState = item.state === 'sold' || status === 'sold'
  const hasSaleLink = typeof item.sale_id === 'string' && item.sale_id.trim().length > 0
  return isSoldState || hasSaleLink
}

export function canChangeStockState(item: Pick<StockItem, 'state' | 'status' | 'sale_id'>, nextState: StockState) {
  if (isStockItemSoldOrLinked(item) && nextState !== 'sold') {
    return false
  }
  return true
}

export function canToggleStockPromo(item: Pick<StockItem, 'state' | 'status' | 'sale_id'>) {
  return !isStockItemSoldOrLinked(item)
}

export function runStockStateTransitionGuard(
  item: Pick<StockItem, 'state' | 'status' | 'sale_id'>,
  nextState: StockState,
  onAllowed: () => void,
) {
  if (!canChangeStockState(item, nextState)) {
    return { allowed: false as const, message: STOCK_CONFLICT_MESSAGE }
  }

  onAllowed()
  return { allowed: true as const }
}

export function resolveStockMutationErrorMessage(error: unknown, fallbackMessage: string) {
  const err = error as Error & { code?: string }
  if (err?.code === 'stock_conflict') {
    return STOCK_CONFLICT_MESSAGE
  }
  return err?.message || fallbackMessage
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
    sale_id: asOptionalString(raw.sale_id) ?? asOptionalString(raw.saleId),
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

function normalizeStockPageResponse(response: unknown, requestedPage: number, requestedPageSize: number): StockPageResult {
  const items = normalizeStockArray(response)
  const meta = extractPaginationMeta(response)

  return {
    items,
    total: meta.total != null ? Math.max(0, Math.floor(meta.total)) : items.length,
    page: meta.page ?? requestedPage,
    page_size: meta.pageSize ?? requestedPageSize,
    serverPagination: meta.serverPagination,
  }
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

  const response = await requestFirstAvailable<unknown>(STOCK_ENDPOINTS.map((endpoint) => `${endpoint}${query}`))
  return applyStateFilter(normalizeStockArray(response), filters.state)
}

export async function fetchStockPage(filters: StockFilters = {}): Promise<StockPageResult> {
  const requestedPage = filters.page && filters.page > 0 ? Math.floor(filters.page) : 1
  const requestedPageSize = filters.page_size && filters.page_size > 0 ? Math.floor(filters.page_size) : 40
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
    page: requestedPage,
    page_size: requestedPageSize,
    sort_by: filters.sort_by,
    sort_dir: filters.sort_dir,
  })

  const response = await requestFirstAvailable<unknown>(STOCK_ENDPOINTS.map((endpoint) => `${endpoint}${query}`))
  return normalizeStockPageResponse(response, requestedPage, requestedPageSize)
}

export async function createStockItem(payload: Partial<StockItem>) {
  const wirePayload = toLegacyPayload(payload)
  const response = await requestFirstAvailable<unknown>(STOCK_ENDPOINTS, {
    method: 'POST',
    body: wirePayload,
  })
  return normalizeStockObject(response)
}

export async function updateStockItem(id: string, payload: Partial<StockItem>) {
  const wirePayload = toLegacyPayload(payload)
  const response = await requestFirstAvailable<unknown>(STOCK_ENDPOINTS.map((endpoint) => `${endpoint}/${id}`), {
    method: 'PATCH',
    body: wirePayload,
  })
  return normalizeStockObject(response)
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
  return requestFirstAvailable<unknown>(STOCK_ENDPOINTS.map((endpoint) => `${endpoint}/${id}`), {
    method: 'DELETE',
  })
}
