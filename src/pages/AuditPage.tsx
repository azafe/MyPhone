import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAuditLogs } from '../services/audit'
import type { AuditLog } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Table } from '../components/ui/Table'

const PAGE_SIZE = 30
const EMPTY_AUDIT_LOGS: AuditLog[] = []
const DEFAULT_ENTITY_OPTIONS = [
  { value: '', label: 'Todas las entidades' },
  { value: 'stock_item', label: 'Stock' },
  { value: 'sale', label: 'Venta' },
  { value: 'user', label: 'Usuario' },
]

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('es-AR')
}

function formatActor(log: AuditLog) {
  const fullName = log.actor?.full_name?.trim()
  const role = log.actor?.role?.trim()
  if (fullName && role) return `${fullName} (${role})`
  if (fullName) return fullName
  if (role && log.actor?.id) return `${role} · ${log.actor.id.slice(0, 8)}`
  if (log.actor?.id) return log.actor.id.slice(0, 8)
  if (log.actor_user_id) return log.actor_user_id.slice(0, 8)
  return 'Sistema'
}

function describeChange(log: AuditLog) {
  const before = log.before_json ?? null
  const after = log.after_json ?? null
  if (before && after && typeof before === 'object' && typeof after === 'object') {
    const beforeStatus = typeof before.status === 'string' ? before.status : null
    const afterStatus = typeof after.status === 'string' ? after.status : null
    if (beforeStatus && afterStatus && beforeStatus !== afterStatus) {
      return `Estado: ${beforeStatus} -> ${afterStatus}`
    }

    const beforePromo = typeof before.is_promo === 'boolean' ? before.is_promo : null
    const afterPromo = typeof after.is_promo === 'boolean' ? after.is_promo : null
    if (beforePromo != null && afterPromo != null && beforePromo !== afterPromo) {
      return `Promo: ${beforePromo ? 'Sí' : 'No'} -> ${afterPromo ? 'Sí' : 'No'}`
    }

    const beforePrice = typeof before.sale_price_ars === 'number' ? before.sale_price_ars : null
    const afterPrice = typeof after.sale_price_ars === 'number' ? after.sale_price_ars : null
    if (beforePrice != null && afterPrice != null && beforePrice !== afterPrice) {
      return `Precio ARS: $${beforePrice.toLocaleString('es-AR')} -> $${afterPrice.toLocaleString('es-AR')}`
    }
  }

  const metaSource = typeof log.meta_json?.source === 'string' ? log.meta_json.source : null
  if (metaSource) return metaSource

  return log.action
}

export function AuditPage() {
  const [entityType, setEntityType] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const auditQuery = useQuery({
    queryKey: ['audit-logs', entityType, actionFilter, query, from, to, page, PAGE_SIZE],
    queryFn: () =>
      fetchAuditLogs({
        entity_type: entityType || undefined,
        action: actionFilter || undefined,
        query: query || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        page_size: PAGE_SIZE,
      }),
  })

  const logs = auditQuery.data?.items ?? EMPTY_AUDIT_LOGS
  const total = Number(auditQuery.data?.total ?? logs.length)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const pageEnd = total === 0 ? 0 : Math.min((currentPage - 1) * PAGE_SIZE + logs.length, total)

  const entityOptions = useMemo(() => {
    const discovered = new Set<string>()
    logs.forEach((log) => {
      if (log.entity_type) discovered.add(log.entity_type)
    })

    const discoveredOptions = [...discovered]
      .filter((entry) => !DEFAULT_ENTITY_OPTIONS.some((option) => option.value === entry))
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map((value) => ({ value, label: value }))

    return [...DEFAULT_ENTITY_OPTIONS, ...discoveredOptions]
  }, [logs])

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Auditoría</h2>
        <p className="text-sm text-[#5B677A]">Trazabilidad de cambios operativos críticos (stock, ventas, usuarios).</p>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <Select
          value={entityType}
          onChange={(event) => {
            setEntityType(event.target.value)
            setPage(1)
          }}
        >
          {entityOptions.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Acción (ej: stock_updated)"
          value={actionFilter}
          onChange={(event) => {
            setActionFilter(event.target.value)
            setPage(1)
          }}
        />
        <Input
          placeholder="Buscar en acción/entidad"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setPage(1)
          }}
        />
        <Input
          type="date"
          value={from}
          onChange={(event) => {
            setFrom(event.target.value)
            setPage(1)
          }}
        />
        <Input
          type="date"
          value={to}
          onChange={(event) => {
            setTo(event.target.value)
            setPage(1)
          }}
        />
      </div>

      {auditQuery.error ? (
        <div className="rounded-2xl border border-[rgba(185,28,28,0.2)] bg-[rgba(185,28,28,0.08)] px-4 py-6 text-sm text-[#B91C1C]">
          No se pudo cargar auditoría: {(auditQuery.error as Error).message}
        </div>
      ) : auditQuery.isLoading ? (
        <div className="rounded-2xl border border-[#E6EBF2] bg-white px-4 py-6 text-sm text-[#5B677A]">
          Cargando eventos...
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-[#E6EBF2] bg-white px-4 py-6 text-sm text-[#5B677A]">
          Sin eventos para los filtros seleccionados.
        </div>
      ) : (
        <Table headers={['Fecha', 'Actor', 'Acción', 'Entidad', 'Detalle']}>
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="px-4 py-3 align-top text-xs text-[#334155]">{formatDateTime(log.created_at)}</td>
              <td className="px-4 py-3 align-top text-xs text-[#334155]">{formatActor(log)}</td>
              <td className="px-4 py-3 align-top text-sm font-semibold text-[#0F172A]">{log.action}</td>
              <td className="px-4 py-3 align-top text-xs text-[#334155]">
                <div>{log.entity_type}</div>
                <div className="text-[11px] text-[#64748B]">{log.entity_id ? log.entity_id.slice(0, 8) : '—'}</div>
              </td>
              <td className="px-4 py-3 align-top text-xs text-[#334155]">{describeChange(log)}</td>
            </tr>
          ))}
        </Table>
      )}

      {!auditQuery.error && !auditQuery.isLoading && logs.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E6EBF2] bg-white px-3 py-2">
          <p className="text-xs text-[#475569]">
            Mostrando {pageStart}-{pageEnd} de {total} eventos
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={currentPage <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
              Anterior
            </Button>
            <span className="text-xs font-semibold text-[#334155]">
              Página {currentPage} de {totalPages}
            </span>
            <Button size="sm" variant="secondary" disabled={currentPage >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
