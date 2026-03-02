import type { AuditLog } from '../types'
import { asArray, toQueryString } from './normalizers'
import { requestFirstAvailable } from './request'

const AUDIT_ENDPOINTS = ['/api/admin/audit-logs']

export type AuditFilters = {
  entity_type?: string
  action?: string
  actor_user_id?: string
  query?: string
  from?: string
  to?: string
  page?: number
  page_size?: number
}

export type AuditPageResult = {
  items: AuditLog[]
  total: number
  page: number
  page_size: number
  serverPagination: boolean
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function parseNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeAuditLog(raw: Record<string, unknown>): AuditLog {
  const actorRaw = asRecord(raw.actor)
  return {
    id: String(raw.id ?? ''),
    actor_user_id: typeof raw.actor_user_id === 'string' ? raw.actor_user_id : null,
    action: String(raw.action ?? ''),
    entity_type: String(raw.entity_type ?? ''),
    entity_id: typeof raw.entity_id === 'string' ? raw.entity_id : null,
    before_json: asRecord(raw.before_json),
    after_json: asRecord(raw.after_json),
    meta_json: asRecord(raw.meta_json),
    created_at: String(raw.created_at ?? ''),
    actor: actorRaw
      ? {
        id: String(actorRaw.id ?? ''),
        full_name: typeof actorRaw.full_name === 'string' ? actorRaw.full_name : null,
        role: typeof actorRaw.role === 'string' ? actorRaw.role : null,
      }
      : null,
  }
}

function normalizeAuditResponse(response: unknown, requestedPage: number, requestedPageSize: number): AuditPageResult {
  const root = asRecord(response)
  const itemsRaw = asArray<Record<string, unknown>>(response)
  const total = parseNumber(root?.total) ?? itemsRaw.length
  const page = parseNumber(root?.page) ?? requestedPage
  const pageSize = parseNumber(root?.page_size) ?? requestedPageSize

  return {
    items: itemsRaw.map(normalizeAuditLog),
    total: Math.max(0, Math.floor(total)),
    page: Math.max(1, Math.floor(page)),
    page_size: Math.max(1, Math.floor(pageSize)),
    serverPagination: parseNumber(root?.total) != null,
  }
}

export async function fetchAuditLogs(filters: AuditFilters = {}): Promise<AuditPageResult> {
  const requestedPage = filters.page && filters.page > 0 ? Math.floor(filters.page) : 1
  const requestedPageSize = filters.page_size && filters.page_size > 0 ? Math.floor(filters.page_size) : 30

  const query = toQueryString({
    entity_type: filters.entity_type,
    action: filters.action,
    actor_user_id: filters.actor_user_id,
    query: filters.query,
    from: filters.from,
    to: filters.to,
    page: requestedPage,
    page_size: requestedPageSize,
  })

  const response = await requestFirstAvailable<unknown>(AUDIT_ENDPOINTS.map((endpoint) => `${endpoint}${query}`))
  return normalizeAuditResponse(response, requestedPage, requestedPageSize)
}

