import type { Sale, SalePayment } from '../types'
import { asArray, asObject, toQueryString } from './normalizers'
import { requestFirstAvailable } from './request'

const SALES_ENDPOINTS = ['/api/sales']
const SELLERS_ENDPOINTS = ['/api/users?simple=1', '/api/admin/users', '/api/sellers']

export type SalesFilters = {
  query?: string
  from?: string
  to?: string
  seller_id?: string
  seller?: string
  page?: number
  page_size?: number
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
}

export type SalesPageResult = {
  items: Sale[]
  total: number
  page: number
  page_size: number
  serverPagination: boolean
  total_ars: number | null
  pending_ars: number | null
}

export type CreateSalePayload = {
  sale_date: string
  customer?: { name: string; phone?: string; dni?: string }
  customer_id?: string
  seller_id?: string
  payment_method?: string
  card_brand?: string | null
  installments?: number | null
  surcharge_pct?: number | null
  deposit_ars?: number | null
  currency?: 'ARS' | 'USD'
  fx_rate_used?: number | null
  total_usd?: number | null
  total_ars: number
  balance_due_ars?: number | null
  details?: string | null
  notes?: string | null
  includes_cube_20w?: boolean
  payments?: Array<{
    method: string
    currency: 'ARS' | 'USD'
    amount: number
    card_brand?: string | null
    installments?: number | null
    surcharge_pct?: number | null
    note?: string | null
  }>
  items: Array<{ stock_item_id: string | null; qty: number; sale_price_ars: number }>
}

export type SellerOption = {
  id: string
  full_name: string
  role?: string | null
}

export type UpdateSalePayload = {
  seller_id?: string | null
  details?: string | null
  notes?: string | null
  includes_cube_20w?: boolean
}

export type RegisterSalePaymentPayload = {
  method: 'cash' | 'transfer' | 'card' | 'mixed' | 'trade_in'
  currency: 'ARS' | 'USD'
  amount: number
  card_brand?: string | null
  installments?: number | null
  surcharge_pct?: number | null
  note?: string | null
}

export type SettleSalePayload = {
  method?: 'cash' | 'transfer' | 'card' | 'mixed' | 'trade_in'
  currency?: 'ARS' | 'USD'
  note?: string | null
}

export type CancelSalePayload = {
  restock_state: 'outlet' | 'used_premium' | 'reserved' | 'deposit' | 'new' | 'drawer' | 'service_tech'
  reason: string
}

function parseNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parsePositiveInt(value: unknown) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
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

  const totalArs =
    pickNumber(root, ['total_ars', 'sales_total', 'sales_total_ars']) ??
    pickNumber(nested, ['total_ars', 'sales_total', 'sales_total_ars'])
  const pendingArs =
    pickNumber(root, ['pending_ars', 'balance_due_ars', 'total_pending_ars']) ??
    pickNumber(nested, ['pending_ars', 'balance_due_ars', 'total_pending_ars'])

  return {
    total,
    page,
    pageSize,
    totalArs,
    pendingArs,
    serverPagination: total != null,
  }
}

function normalizeSale(raw: Record<string, unknown>): Sale {
  const customerFromCustomer = raw.customer && typeof raw.customer === 'object' ? (raw.customer as Sale['customer']) : null
  const customerFromCustomers = raw.customers && typeof raw.customers === 'object' ? (raw.customers as Sale['customer']) : null
  const customer = customerFromCustomer ?? customerFromCustomers ?? null

  const rawItems = Array.isArray(raw.items)
    ? (raw.items as Record<string, unknown>[])
    : Array.isArray(raw.sale_items)
      ? (raw.sale_items as Record<string, unknown>[])
      : []

  const items = rawItems.map((item) => {
    const stock = item.stock_items && typeof item.stock_items === 'object' ? (item.stock_items as Record<string, unknown>) : null
    return {
      id: typeof item.id === 'string' ? item.id : undefined,
      stock_item_id: (item.stock_item_id as string | undefined) ?? null,
      qty: typeof item.qty === 'number' ? item.qty : item.qty ? Number(item.qty) : undefined,
      model: (item.model as string | undefined) ?? (stock?.model as string | undefined) ?? null,
      storage_gb:
        typeof item.storage_gb === 'number'
          ? item.storage_gb
          : item.storage_gb
            ? Number(item.storage_gb)
            : (typeof stock?.storage_gb === 'number' ? stock.storage_gb : stock?.storage_gb ? Number(stock.storage_gb) : null),
      battery_pct:
        typeof item.battery_pct === 'number'
          ? item.battery_pct
          : item.battery_pct
            ? Number(item.battery_pct)
            : (typeof stock?.battery_pct === 'number' ? stock.battery_pct : stock?.battery_pct ? Number(stock.battery_pct) : null),
      color: (item.color as string | undefined) ?? (stock?.color as string | undefined) ?? null,
      imei: (item.imei as string | undefined) ?? (stock?.imei as string | undefined) ?? null,
      sale_price_ars:
        typeof item.sale_price_ars === 'number' ? item.sale_price_ars : item.sale_price_ars ? Number(item.sale_price_ars) : null,
      sale_price_usd:
        typeof item.sale_price_usd === 'number' ? item.sale_price_usd : item.sale_price_usd ? Number(item.sale_price_usd) : null,
    }
  })

  const rawPayments = Array.isArray(raw.payments)
    ? (raw.payments as Record<string, unknown>[])
    : Array.isArray(raw.sale_payments)
      ? (raw.sale_payments as Record<string, unknown>[])
      : []

  const payments: SalePayment[] = rawPayments.map((payment) => ({
    id: typeof payment.id === 'string' ? payment.id : undefined,
    method: String(payment.method ?? ''),
    currency: String(payment.currency ?? 'ARS').toUpperCase() === 'USD' ? 'USD' : 'ARS',
    amount: typeof payment.amount === 'number' ? payment.amount : Number(payment.amount ?? 0),
    amount_ars:
      typeof payment.amount_ars === 'number' ? payment.amount_ars : payment.amount_ars ? Number(payment.amount_ars) : null,
    amount_usd:
      typeof payment.amount_usd === 'number' ? payment.amount_usd : payment.amount_usd ? Number(payment.amount_usd) : null,
    card_brand: (payment.card_brand as string | undefined) ?? null,
    installments:
      typeof payment.installments === 'number' ? payment.installments : payment.installments ? Number(payment.installments) : null,
    surcharge_pct:
      typeof payment.surcharge_pct === 'number' ? payment.surcharge_pct : payment.surcharge_pct ? Number(payment.surcharge_pct) : null,
    note: (payment.note as string | undefined) ?? null,
  }))

  return {
    id: String(raw.id ?? ''),
    sale_date: (raw.sale_date as string | undefined) ?? null,
    created_at: (raw.created_at as string | undefined) ?? undefined,
    seller_id: (raw.seller_id as string | undefined) ?? null,
    seller_name: (raw.seller_name as string | undefined) ?? (raw.seller_full_name as string | undefined) ?? null,
    seller_full_name: (raw.seller_full_name as string | undefined) ?? null,
    customer_id: (raw.customer_id as string | undefined) ?? null,
    customer_name: (raw.customer_name as string | undefined) ?? (customer?.name ?? customer?.full_name ?? null) ?? null,
    customer_phone: (raw.customer_phone as string | undefined) ?? (customer?.phone ?? null) ?? null,
    customer_dni: (raw.customer_dni as string | undefined) ?? (customer?.dni ?? null) ?? null,
    customer,
    payment_method: (raw.payment_method as string | undefined) ?? (raw.method as string | undefined) ?? null,
    method: (raw.method as Sale['method']) ?? (raw.payment_method as Sale['method']) ?? null,
    card_brand: (raw.card_brand as string | undefined) ?? null,
    installments: typeof raw.installments === 'number' ? raw.installments : raw.installments ? Number(raw.installments) : null,
    surcharge_pct:
      typeof raw.surcharge_pct === 'number' ? raw.surcharge_pct : raw.surcharge_pct ? Number(raw.surcharge_pct) : null,
    deposit_ars: typeof raw.deposit_ars === 'number' ? raw.deposit_ars : raw.deposit_ars ? Number(raw.deposit_ars) : null,
    total_ars: Number(raw.total_ars ?? 0),
    total_usd: typeof raw.total_usd === 'number' ? raw.total_usd : raw.total_usd ? Number(raw.total_usd) : null,
    currency: (raw.currency as Sale['currency']) ?? 'ARS',
    fx_rate_used:
      typeof raw.fx_rate_used === 'number' ? raw.fx_rate_used : raw.fx_rate_used ? Number(raw.fx_rate_used) : null,
    balance_due_ars:
      typeof raw.balance_due_ars === 'number'
        ? raw.balance_due_ars
        : raw.balance_due_ars
          ? Number(raw.balance_due_ars)
          : null,
    notes: (raw.notes as string | undefined) ?? null,
    details: (raw.details as string | undefined) ?? null,
    includes_cube_20w: Boolean(raw.includes_cube_20w),
    status: (raw.status as Sale['status']) ?? null,
    stock_item_id: (raw.stock_item_id as string | undefined) ?? null,
    stock_model: (raw.stock_model as string | undefined) ?? null,
    stock_imei: (raw.stock_imei as string | undefined) ?? null,
    stock_brand: (raw.stock_brand as string | undefined) ?? null,
    stock_storage_gb:
      typeof raw.stock_storage_gb === 'number' ? raw.stock_storage_gb : raw.stock_storage_gb ? Number(raw.stock_storage_gb) : null,
    stock_color: (raw.stock_color as string | undefined) ?? null,
    stock_condition: (raw.stock_condition as string | undefined) ?? null,
    stock_battery_pct:
      typeof raw.stock_battery_pct === 'number' ? raw.stock_battery_pct : raw.stock_battery_pct ? Number(raw.stock_battery_pct) : null,
    items: items.length > 0 ? items : undefined,
    payments: payments.length > 0 ? payments : undefined,
  }
}

export async function fetchSales(filters: SalesFilters = {}) {
  const query = toQueryString({
    query: filters.query,
    from: filters.from,
    to: filters.to,
    seller_id: filters.seller_id,
    seller: filters.seller,
  })

  const response = await requestFirstAvailable<unknown>(SALES_ENDPOINTS.map((endpoint) => `${endpoint}${query}`))
  return asArray<Record<string, unknown>>(response).map(normalizeSale)
}

export async function fetchSalesPage(filters: SalesFilters = {}): Promise<SalesPageResult> {
  const requestedPage = filters.page && filters.page > 0 ? Math.floor(filters.page) : 1
  const requestedPageSize = filters.page_size && filters.page_size > 0 ? Math.floor(filters.page_size) : 30
  const query = toQueryString({
    query: filters.query,
    from: filters.from,
    to: filters.to,
    seller_id: filters.seller_id,
    seller: filters.seller,
    page: requestedPage,
    page_size: requestedPageSize,
    sort_by: filters.sort_by,
    sort_dir: filters.sort_dir,
  })

  const response = await requestFirstAvailable<unknown>(SALES_ENDPOINTS.map((endpoint) => `${endpoint}${query}`))
  const items = asArray<Record<string, unknown>>(response).map(normalizeSale)
  const meta = extractPaginationMeta(response)

  return {
    items,
    total: meta.total != null ? Math.max(0, Math.floor(meta.total)) : items.length,
    page: meta.page ?? requestedPage,
    page_size: meta.pageSize ?? requestedPageSize,
    serverPagination: meta.serverPagination,
    total_ars: meta.totalArs,
    pending_ars: meta.pendingArs,
  }
}

export async function createSale(payload: CreateSalePayload) {
  const response = await requestFirstAvailable<unknown>(SALES_ENDPOINTS, {
    method: 'POST',
    body: payload,
  })
  return asObject<Sale>(response)
}

export async function deleteSale(id: string) {
  return requestFirstAvailable<unknown>(SALES_ENDPOINTS.map((endpoint) => `${endpoint}/${id}`), {
    method: 'DELETE',
  })
}

export async function updateSale(id: string, payload: UpdateSalePayload) {
  const response = await requestFirstAvailable<unknown>(SALES_ENDPOINTS.map((endpoint) => `${endpoint}/${id}`), {
    method: 'PATCH',
    body: payload,
  })
  return asObject<Sale>(response)
}

export async function fetchSaleById(id: string) {
  const response = await requestFirstAvailable<unknown>(SALES_ENDPOINTS.map((endpoint) => `${endpoint}/${id}`))
  const root = asObject<Record<string, unknown>>(response)
  const saleRaw =
    root && root.sale && typeof root.sale === 'object'
      ? (root.sale as Record<string, unknown>)
      : root
  return normalizeSale(saleRaw)
}

export async function registerSalePayment(id: string, payload: RegisterSalePaymentPayload) {
  return requestFirstAvailable<unknown>(SALES_ENDPOINTS.map((endpoint) => `${endpoint}/${id}/payments`), {
    method: 'POST',
    body: payload,
  })
}

export async function settleSale(id: string, payload: SettleSalePayload = {}) {
  return requestFirstAvailable<unknown>(SALES_ENDPOINTS.map((endpoint) => `${endpoint}/${id}/settle`), {
    method: 'POST',
    body: payload,
  })
}

export async function cancelSale(id: string, payload: CancelSalePayload) {
  const cancelEndpoints = SALES_ENDPOINTS.map((endpoint) => `${endpoint}/${id}/cancel`)

  try {
    const response = await requestFirstAvailable<unknown>(cancelEndpoints, {
      method: 'PATCH',
      body: payload,
    })
    return asObject<Sale>(response)
  } catch (error) {
    if (!isRouteNotFoundError(error)) {
      throw error
    }
  }

  try {
    const response = await requestFirstAvailable<unknown>(cancelEndpoints, {
      method: 'POST',
      body: payload,
    })
    return asObject<Sale>(response)
  } catch (error) {
    if (!isRouteNotFoundError(error)) {
      throw error
    }
  }

  const response = await requestFirstAvailable<unknown>(SALES_ENDPOINTS.map((endpoint) => `${endpoint}/${id}`), {
    method: 'DELETE',
    body: payload,
  })
  return asObject<Sale>(response)
}

export async function fetchSellers() {
  const response = await requestFirstAvailable<unknown>(SELLERS_ENDPOINTS)
  const users = asArray<Record<string, unknown>>(response)
  return users
    .filter((user) => {
      const role = String(user.role ?? '').toLowerCase()
      return !role || role === 'seller' || role === 'admin' || role === 'owner'
    })
    .map((user) => ({
      id: String(user.id ?? ''),
      full_name: String(user.full_name ?? user.name ?? user.email ?? 'Sin nombre'),
      role: user.role ? String(user.role) : null,
    }))
    .filter((user) => user.id)
}
