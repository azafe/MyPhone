import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchSalesPage, fetchSellers } from '../services/sales'
import type { Sale } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'

const PAGE_SIZE = 30
const EMPTY_SALES: Sale[] = []

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-AR')
}

function formatMoney(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `$${value.toLocaleString('es-AR')}`
}

function resolveCustomer(sale: Sale) {
  return sale.customer_name || sale.customer?.name || sale.customer?.full_name || '—'
}

function resolvePaymentMethod(sale: Sale) {
  return sale.payment_method || sale.method || '—'
}

function formatPaymentMethod(value: string) {
  const normalized = value.toLowerCase()
  if (normalized === 'cash') return 'Efectivo'
  if (normalized === 'transfer') return 'Transferencia'
  if (normalized === 'card') return 'Tarjeta'
  if (normalized === 'mixed') return 'Mixto'
  if (normalized === 'deposit') return 'Seña'
  if (normalized === 'trade_in') return 'Permuta'
  return value
}

function resolveSaleDateMillis(sale: Sale) {
  const date = new Date(sale.sale_date ?? sale.created_at ?? 0)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function resolveItemSummary(sale: Sale) {
  if (sale.items && sale.items.length > 0) {
    const first = sale.items[0]
    const firstLabel = first.model || sale.stock_model || 'Equipo'
    const firstImei = first.imei || sale.stock_imei || null
    if (sale.items.length === 1) return firstImei ? `${firstLabel} · IMEI ${firstImei}` : firstLabel
    return `${firstLabel}${firstImei ? ` · IMEI ${firstImei}` : ''} +${sale.items.length - 1} más`
  }

  if (sale.stock_model) {
    return sale.stock_imei ? `${sale.stock_model} · IMEI ${sale.stock_imei}` : sale.stock_model
  }

  return 'Sin equipo asociado'
}

export function SalesPage() {
  const navigate = useNavigate()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sellerId, setSellerId] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const sellersQuery = useQuery({
    queryKey: ['users', 'sellers'],
    queryFn: fetchSellers,
  })

  const salesQuery = useQuery({
    queryKey: ['sales', from, to, sellerId, query, page, PAGE_SIZE],
    queryFn: () =>
      fetchSalesPage({
        from: from || undefined,
        to: to || undefined,
        seller_id: sellerId || undefined,
        query: query || undefined,
        page,
        page_size: PAGE_SIZE,
        sort_by: 'sale_date',
        sort_dir: 'desc',
      }),
  })

  const fetchedSales = salesQuery.data?.items ?? EMPTY_SALES
  const usingServerPagination = Boolean(salesQuery.data?.serverPagination)

  const sortedSales = useMemo(() => {
    if (usingServerPagination) {
      return fetchedSales
    }

    const rows = fetchedSales
    return [...rows].sort((a, b) => resolveSaleDateMillis(b) - resolveSaleDateMillis(a))
  }, [fetchedSales, usingServerPagination])

  const totalCount = usingServerPagination ? Number(salesQuery.data?.total ?? fetchedSales.length) : sortedSales.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const currentPage = usingServerPagination ? page : safePage

  const paginatedSales = useMemo(() => {
    if (usingServerPagination) return sortedSales
    const pageOffset = (safePage - 1) * PAGE_SIZE
    return sortedSales.slice(pageOffset, pageOffset + PAGE_SIZE)
  }, [safePage, sortedSales, usingServerPagination])
  const pageStart = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const pageEnd = totalCount === 0 ? 0 : Math.min((currentPage - 1) * PAGE_SIZE + paginatedSales.length, totalCount)

  const totals = useMemo(() => {
    const fallbackTotalArs = paginatedSales.reduce((sum, sale) => sum + Number(sale.total_ars || 0), 0)
    const fallbackPendingArs = paginatedSales.reduce((sum, sale) => sum + Number(sale.balance_due_ars || 0), 0)
    const totalArs = usingServerPagination ? Number(salesQuery.data?.total_ars ?? fallbackTotalArs) : sortedSales.reduce((sum, sale) => sum + Number(sale.total_ars || 0), 0)
    const pendingArs = usingServerPagination
      ? Number(salesQuery.data?.pending_ars ?? fallbackPendingArs)
      : sortedSales.reduce((sum, sale) => sum + Number(sale.balance_due_ars || 0), 0)
    return {
      totalArs,
      pendingArs,
      count: totalCount,
    }
  }, [paginatedSales, salesQuery.data?.pending_ars, salesQuery.data?.total_ars, sortedSales, totalCount, usingServerPagination])

  const handleFromChange = (value: string) => {
    setFrom(value)
    setPage(1)
  }

  const handleToChange = (value: string) => {
    setTo(value)
    setPage(1)
  }

  const handleSellerChange = (value: string) => {
    setSellerId(value)
    setPage(1)
  }

  const handleQueryChange = (value: string) => {
    setQuery(value)
    setPage(1)
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Ventas</h2>
          <p className="text-sm text-[#5B677A]">Listado por fecha y vendedor.</p>
        </div>
        <Button onClick={() => navigate('/sales/new')}>Nueva venta</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Input type="date" value={from} onChange={(event) => handleFromChange(event.target.value)} />
        <Input type="date" value={to} onChange={(event) => handleToChange(event.target.value)} />
        <Select value={sellerId} onChange={(event) => handleSellerChange(event.target.value)}>
          <option value="">Todos los vendedores</option>
          {(sellersQuery.data ?? []).map((seller) => (
            <option key={seller.id} value={seller.id}>
              {seller.full_name}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Buscar cliente, DNI, IMEI"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[#E6EBF2] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Ventas</p>
          <p className="mt-2 text-2xl font-semibold text-[#0F172A]">{totals.count}</p>
        </div>
        <div className="rounded-2xl border border-[#E6EBF2] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Total</p>
          <p className="mt-2 text-2xl font-semibold text-[#0F172A]">{formatMoney(totals.totalArs)}</p>
        </div>
        <div className="rounded-2xl border border-[#E6EBF2] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Saldo pendiente</p>
          <p className="mt-2 text-2xl font-semibold text-[#B91C1C]">{formatMoney(totals.pendingArs)}</p>
        </div>
      </div>

      {salesQuery.error ? (
        <div className="rounded-2xl border border-[rgba(185,28,28,0.2)] bg-[rgba(185,28,28,0.08)] px-4 py-6 text-sm text-[#B91C1C]">
          No se pudo cargar ventas: {(salesQuery.error as Error).message}
        </div>
      ) : salesQuery.isLoading ? (
        <div className="rounded-2xl border border-[#E6EBF2] bg-white px-4 py-6 text-sm text-[#5B677A]">
          Cargando ventas...
        </div>
      ) : totalCount === 0 ? (
        <div className="rounded-2xl border border-[#E6EBF2] bg-white px-4 py-6 text-sm text-[#5B677A]">
          No hay ventas para los filtros seleccionados.
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedSales.map((sale) => {
            const paymentLabel = formatPaymentMethod(resolvePaymentMethod(sale))
            const pendingBalance = Number(sale.balance_due_ars ?? 0)
            return (
              <article key={sale.id} className="rounded-xl border border-[#E6EBF2] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
                <div className="grid gap-3 md:grid-cols-[2fr_1.5fr_1fr_1fr] md:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#EEF2F7] px-2 py-0.5 text-[11px] font-semibold text-[#334155]">
                        {formatDate(sale.sale_date ?? sale.created_at)}
                      </span>
                      {pendingBalance > 0 ? (
                        <span className="rounded-full bg-[rgba(220,38,38,0.12)] px-2 py-0.5 text-[11px] font-semibold text-[#991B1B]">
                          Saldo pendiente
                        </span>
                      ) : null}
                    </div>
                    <h4 className="mt-2 text-base font-semibold leading-tight text-[#0F172A]">{resolveCustomer(sale)}</h4>
                    <p className="text-xs text-[#64748B]">
                      Tel: {sale.customer_phone || sale.customer?.phone || '—'} · DNI: {sale.customer_dni || sale.customer?.dni || '—'}
                    </p>
                    <p className="mt-1 text-xs text-[#64748B]">Vendedor: {sale.seller_name || sale.seller_full_name || '—'}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#64748B]">Equipo</p>
                    <p className="mt-1 text-sm font-medium text-[#0F172A]">{resolveItemSummary(sale)}</p>
                    {sale.details || sale.notes ? (
                      <p className="mt-1 truncate text-xs text-[#64748B]">{sale.details || sale.notes}</p>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#64748B]">Pago</p>
                    <p className="mt-1 text-sm font-medium text-[#0F172A]">{paymentLabel}</p>
                    <p className="text-xs text-[#64748B]">Moneda: {sale.currency || 'ARS'}</p>
                    <p className="text-xs text-[#64748B]">Cubo 20W: {sale.includes_cube_20w ? 'Sí' : 'No'}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#64748B]">Totales</p>
                    <p className="mt-1 text-lg font-semibold text-[#0F172A]">{formatMoney(sale.total_ars)}</p>
                    <p className={`text-xs ${pendingBalance > 0 ? 'text-[#B91C1C]' : 'text-[#64748B]'}`}>
                      Saldo: {formatMoney(pendingBalance)}
                    </p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {!salesQuery.error && !salesQuery.isLoading && totalCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E6EBF2] bg-white px-3 py-2">
          <p className="text-xs text-[#475569]">
            Mostrando {pageStart}-{pageEnd} de {totalCount} ventas
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={currentPage <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
              Anterior
            </Button>
            <span className="text-xs font-semibold text-[#334155]">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
