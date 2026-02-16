import type { PlanCanjeValue, TradeIn, TradeStatus } from '../types'
import { asArray, asObject, toQueryString } from './normalizers'
import { requestFirstAvailable } from './request'

const TRADEIN_ENDPOINTS = ['/api/trade-ins', '/api/tradeins']
const PLAN_CANJE_ENDPOINTS = ['/api/plan-canje-values', '/api/plan-canje', '/api/plan-canje/rules']

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeTradeIn(raw: Record<string, unknown>): TradeIn {
  return {
    id: String(raw.id ?? ''),
    trade_date: (raw.trade_date as string | undefined) ?? (raw.created_at as string | undefined) ?? null,
    sale_ref: (raw.sale_ref as string | undefined) ?? null,
    customer_name: (raw.customer_name as string | undefined) ?? null,
    customer_phone: (raw.customer_phone as string | undefined) ?? null,
    customer_dni: (raw.customer_dni as string | undefined) ?? null,
    brand: (raw.brand as string | undefined) ?? null,
    model: String(raw.model ?? ''),
    storage: (raw.storage as string | undefined) ?? null,
    storage_gb: toNumber(raw.storage_gb),
    battery_pct: toNumber(raw.battery_pct),
    color: (raw.color as string | undefined) ?? null,
    condition: (raw.condition as string | undefined) ?? null,
    imei: (raw.imei as string | undefined) ?? null,
    trade_value_usd: toNumber(raw.trade_value_usd),
    fx_rate_used: toNumber(raw.fx_rate_used),
    trade_value_ars: Number(raw.trade_value_ars ?? 0),
    suggested_value_ars: toNumber(raw.suggested_value_ars),
    details: (raw.details as string | undefined) ?? null,
    observation: (raw.observation as string | undefined) ?? null,
    converted_stock_item_id: (raw.converted_stock_item_id as string | undefined) ?? null,
    notes: (raw.notes as string | undefined) ?? null,
    status: (raw.status as TradeStatus | undefined) ?? 'pending',
    created_at: (raw.created_at as string | undefined) ?? undefined,
  }
}

function normalizePlanCanjeValue(raw: Record<string, unknown>): PlanCanjeValue {
  return {
    id: String(raw.id ?? ''),
    model: String(raw.model ?? ''),
    storage_gb: toNumber(raw.storage_gb),
    battery_min: Number(raw.battery_min ?? 0),
    battery_max: Number(raw.battery_max ?? 0),
    pct_of_reference: toNumber(raw.pct_of_reference),
    value_ars: toNumber(raw.value_ars),
    created_at: (raw.created_at as string | undefined) ?? undefined,
    updated_at: (raw.updated_at as string | undefined) ?? undefined,
  }
}

export async function fetchTradeIns(status?: TradeStatus) {
  const query = toQueryString({ status })
  const response = await requestFirstAvailable<unknown>(TRADEIN_ENDPOINTS.map((endpoint) => `${endpoint}${query}`))
  return asArray<Record<string, unknown>>(response).map(normalizeTradeIn)
}

export async function createTradeIn(payload: Partial<TradeIn>) {
  const response = await requestFirstAvailable<unknown>(TRADEIN_ENDPOINTS, {
    method: 'POST',
    body: payload,
  })
  return asObject<TradeIn>(response)
}

export async function updateTradeIn(id: string, payload: Partial<TradeIn>) {
  const response = await requestFirstAvailable<unknown>(TRADEIN_ENDPOINTS.map((endpoint) => `${endpoint}/${id}`), {
    method: 'PATCH',
    body: payload,
  })
  return asObject<TradeIn>(response)
}

export async function convertTradeInToStock(
  id: string,
  payload: {
    state?: string
    status?: string
    sale_price_ars?: number
    provider_name?: string
  },
) {
  return requestFirstAvailable<unknown>(
    TRADEIN_ENDPOINTS.map((endpoint) => `${endpoint}/${id}/convert-to-stock`),
    {
      method: 'POST',
      body: payload,
    },
  )
}

export async function fetchPlanCanjeValues() {
  const response = await requestFirstAvailable<unknown>(PLAN_CANJE_ENDPOINTS)
  return asArray<Record<string, unknown>>(response).map(normalizePlanCanjeValue)
}

export async function upsertPlanCanjeValue(payload: Partial<PlanCanjeValue>) {
  if (payload.id) {
    const response = await requestFirstAvailable<unknown>(
      PLAN_CANJE_ENDPOINTS.map((endpoint) => `${endpoint}/${payload.id}`),
      { method: 'PATCH', body: payload },
    )
    return asObject<PlanCanjeValue>(response)
  }

  const response = await requestFirstAvailable<unknown>(PLAN_CANJE_ENDPOINTS, {
    method: 'POST',
    body: payload,
  })
  return asObject<PlanCanjeValue>(response)
}

export async function deletePlanCanjeValue(id: string) {
  return requestFirstAvailable<unknown>(PLAN_CANJE_ENDPOINTS.map((endpoint) => `${endpoint}/${id}`), {
    method: 'DELETE',
  })
}

export function calculateSuggestedTradeValue(params: {
  model: string
  batteryPct: number
  referencePriceArs: number
  rules: PlanCanjeValue[]
}) {
  const normalizedModel = params.model.trim().toLowerCase()
  const rule = params.rules.find((item) => {
    const sameModel = item.model.trim().toLowerCase() === normalizedModel
    const inRange = params.batteryPct >= item.battery_min && params.batteryPct <= item.battery_max
    return sameModel && inRange
  })

  if (!rule) {
    return null
  }

  if (typeof rule.value_ars === 'number' && rule.value_ars > 0) {
    return Math.round(rule.value_ars)
  }

  if (typeof rule.pct_of_reference === 'number' && rule.pct_of_reference > 0) {
    return Math.round((params.referencePriceArs * rule.pct_of_reference) / 100)
  }

  return null
}
