import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  cancelSale,
  fetchSaleById,
  fetchSalesPage,
  fetchSellers,
  registerSalePayment,
  settleSale,
  updateSale,
  type CancelSalePayload,
  type RegisterSalePaymentPayload,
  type SettleSalePayload,
  type UpdateSalePayload,
} from '../services/sales'
import { useAuth } from '../hooks/useAuth'
import type { Sale } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Select } from '../components/ui/Select'

const PAGE_SIZE = 30
const EMPTY_SALES: Sale[] = []
const RESTOCK_STATE_OPTIONS: Array<{ value: CancelSalePayload['restock_state']; label: string }> = [
  { value: 'used_premium', label: 'Usados Premium' },
  { value: 'outlet', label: 'Outlet' },
  { value: 'new', label: 'Nuevo' },
  { value: 'drawer', label: 'Cajón' },
  { value: 'service_tech', label: 'Servicio Técnico' },
  { value: 'reserved', label: 'Reserva' },
  { value: 'deposit', label: 'Seña' },
]

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-AR')
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('es-AR')
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

function formatSaleStatus(value?: string | null) {
  const status = String(value ?? '').toLowerCase()
  if (status === 'completed' || status === 'paid') return 'Completada'
  if (status === 'pending') return 'Pendiente'
  if (status === 'cancelled') return 'Cancelada'
  return value || '—'
}

export function SalesPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [, setSearchParams] = useSearchParams()
  const { profile } = useAuth()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sellerId, setSellerId] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [editSellerId, setEditSellerId] = useState('')
  const [editDetails, setEditDetails] = useState('')
  const [editIncludesCube, setEditIncludesCube] = useState(false)
  const [cancelRestockState, setCancelRestockState] = useState<CancelSalePayload['restock_state']>('used_premium')
  const [cancelReason, setCancelReason] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<RegisterSalePaymentPayload['method']>('cash')
  const [paymentCurrency, setPaymentCurrency] = useState<RegisterSalePaymentPayload['currency']>('ARS')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')

  const canOperateSales = profile?.role === 'owner'

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

  const saleDetailQuery = useQuery({
    queryKey: ['sale-detail', selectedSale?.id],
    queryFn: () => fetchSaleById(selectedSale!.id),
    enabled: Boolean(selectedSale?.id),
  })

  const activeSale = saleDetailQuery.data ?? selectedSale

  const updateMutation = useMutation({
    mutationFn: ({ saleId, payload }: { saleId: string; payload: UpdateSalePayload }) => updateSale(saleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      toast.success('Venta actualizada')
    },
    onError: (error) => {
      const err = error as Error
      toast.error(err.message || 'No se pudo actualizar la venta')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: ({ saleId, payload }: { saleId: string; payload: CancelSalePayload }) => cancelSale(saleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      toast.success('Venta cancelada y equipo reingresado')
      setSelectedSale(null)
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        next.delete('sale_id')
        return next
      })
    },
    onError: (error) => {
      const err = error as Error
      toast.error(err.message || 'No se pudo cancelar la venta')
    },
  })

  const registerPaymentMutation = useMutation({
    mutationFn: ({ saleId, payload }: { saleId: string; payload: RegisterSalePaymentPayload }) => registerSalePayment(saleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['sale-detail'] })
      setPaymentAmount('')
      setPaymentNote('')
      toast.success('Pago registrado')
    },
    onError: (error) => {
      const err = error as Error
      toast.error(err.message || 'No se pudo registrar el pago')
    },
  })

  const settleMutation = useMutation({
    mutationFn: ({ saleId, payload }: { saleId: string; payload: SettleSalePayload }) => settleSale(saleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['sale-detail'] })
      toast.success('Venta cerrada')
    },
    onError: (error) => {
      const err = error as Error
      toast.error(err.message || 'No se pudo cerrar la venta')
    },
  })

  const salesPageData = salesQuery.data
  const fetchedSales = salesPageData?.items ?? EMPTY_SALES
  const usingServerPagination = Boolean(salesPageData?.serverPagination)

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
    const totalArs = usingServerPagination
      ? (typeof salesPageData?.total_ars === 'number' ? salesPageData.total_ars : null)
      : sortedSales.reduce((sum, sale) => sum + Number(sale.total_ars || 0), 0)
    const pendingArs = usingServerPagination
      ? (typeof salesPageData?.pending_ars === 'number' ? salesPageData.pending_ars : null)
      : sortedSales.reduce((sum, sale) => sum + Number(sale.balance_due_ars || 0), 0)
    return {
      totalArs,
      pendingArs,
      count: totalCount,
    }
  }, [salesPageData, sortedSales, totalCount, usingServerPagination])

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

  const openSaleModal = (sale: Sale) => {
    setSelectedSale(sale)
    setEditSellerId(sale.seller_id ?? '')
    setEditDetails((sale.details ?? sale.notes ?? '').trim())
    setEditIncludesCube(Boolean(sale.includes_cube_20w))
    setCancelRestockState('used_premium')
    setCancelReason('')
    setPaymentMethod('cash')
    setPaymentCurrency('ARS')
    setPaymentAmount('')
    setPaymentNote('')
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('sale_id', sale.id)
      return next
    })
  }

  const closeSaleModal = () => {
    setSelectedSale(null)
    setPaymentAmount('')
    setPaymentNote('')
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('sale_id')
      return next
    })
  }

  const handleSaveSale = () => {
    if (!activeSale || !canOperateSales) return
    const payload: UpdateSalePayload = {
      seller_id: editSellerId || null,
      details: editDetails.trim() || null,
      notes: editDetails.trim() || null,
      includes_cube_20w: editIncludesCube,
    }
    updateMutation.mutate({ saleId: activeSale.id, payload })
  }

  const handleCancelSale = () => {
    if (!activeSale || !canOperateSales) return
    if (String(activeSale.status ?? '').toLowerCase() === 'cancelled') {
      toast.error('La venta ya está cancelada.')
      return
    }

    const normalizedReason = cancelReason.trim()
    if (!normalizedReason) {
      toast.error('Ingresá el motivo de cancelación.')
      return
    }

    const payload: CancelSalePayload = {
      restock_state: cancelRestockState,
      reason: normalizedReason,
    }

    cancelMutation.mutate({
      saleId: activeSale.id,
      payload,
    })
  }

  const handleRegisterPayment = () => {
    if (!activeSale || !canOperateSales) return
    if (String(activeSale.status ?? '').toLowerCase() === 'cancelled') {
      toast.error('No podés registrar pagos en una venta cancelada.')
      return
    }

    const amount = Number(paymentAmount.replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Ingresá un monto válido mayor a 0.')
      return
    }

    registerPaymentMutation.mutate({
      saleId: activeSale.id,
      payload: {
        method: paymentMethod,
        currency: paymentCurrency,
        amount,
        note: paymentNote.trim() || null,
      },
    })
  }

  const handleSettleSale = () => {
    if (!activeSale || !canOperateSales) return
    if (String(activeSale.status ?? '').toLowerCase() === 'cancelled') {
      toast.error('La venta ya está cancelada.')
      return
    }

    settleMutation.mutate({
      saleId: activeSale.id,
      payload: {
        method: paymentMethod,
        currency: paymentCurrency,
        note: paymentNote.trim() || null,
      },
    })
  }

  const handlePrintReceipt = () => {
    if (!activeSale) return

    const customer = resolveCustomer(activeSale)
    const phone = activeSale.customer_phone || activeSale.customer?.phone || '—'
    const dni = activeSale.customer_dni || activeSale.customer?.dni || '—'
    const items = activeSale.items && activeSale.items.length > 0
      ? activeSale.items
      : [{
        model: activeSale.stock_model || 'Equipo',
        imei: activeSale.stock_imei || null,
        qty: 1,
        sale_price_ars: activeSale.total_ars,
      }]
    const payments = activeSale.payments ?? []
    const seller = activeSale.seller_name || activeSale.seller_full_name || '—'
    const pending = Number(activeSale.balance_due_ars ?? 0)

    const rowsHtml = items
      .map((item) => {
        const label = `${item.model || 'Equipo'}${item.imei ? ` · IMEI ${item.imei}` : ''}`
        const subtotal = Number(item.sale_price_ars ?? 0) * Number(item.qty ?? 1)
        return `<tr><td style="padding:6px 0;border-bottom:1px solid #e5e7eb">${label}</td><td style="padding:6px 0;border-bottom:1px solid #e5e7eb;text-align:right">$${subtotal.toLocaleString('es-AR')}</td></tr>`
      })
      .join('')

    const paymentsHtml = payments.length > 0
      ? `<h3 style="margin:14px 0 6px;font-size:12px;color:#475569;text-transform:uppercase;letter-spacing:.08em">Pagos</h3>
         <ul style="padding-left:18px;margin:0">
          ${payments
            .map((payment) => `<li style="margin-bottom:4px">${formatPaymentMethod(payment.method)} ${payment.currency} $${Number(payment.amount ?? 0).toLocaleString('es-AR')}</li>`)
            .join('')}
         </ul>`
      : ''

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Comprobante ${activeSale.id.slice(0, 8)}</title>
        </head>
        <body style="font-family:Arial,sans-serif;padding:20px;color:#0f172a">
          <h2 style="margin:0 0 4px">MyPhone - Comprobante</h2>
          <p style="margin:0 0 10px;color:#475569">Venta ${activeSale.id.slice(0, 8)} · ${formatDateTime(activeSale.sale_date ?? activeSale.created_at)}</p>
          <p style="margin:0 0 2px"><strong>Cliente:</strong> ${customer}</p>
          <p style="margin:0 0 2px"><strong>Tel:</strong> ${phone}</p>
          <p style="margin:0 0 2px"><strong>DNI:</strong> ${dni}</p>
          <p style="margin:0 0 12px"><strong>Vendedor:</strong> ${seller}</p>

          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr><th style="text-align:left;padding:6px 0;border-bottom:1px solid #cbd5e1">Equipo</th><th style="text-align:right;padding:6px 0;border-bottom:1px solid #cbd5e1">Subtotal</th></tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>

          ${paymentsHtml}

          <div style="margin-top:16px;border-top:1px solid #cbd5e1;padding-top:8px">
            <p style="margin:0 0 2px"><strong>Total:</strong> ${formatMoney(activeSale.total_ars)}</p>
            <p style="margin:0 0 2px"><strong>Saldo pendiente:</strong> ${formatMoney(pending)}</p>
            <p style="margin:0"><strong>Cubo 20W:</strong> ${activeSale.includes_cube_20w ? 'Sí' : 'No'}</p>
          </div>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=760,height=860')
    if (!printWindow) {
      toast.error('No se pudo abrir la ventana de impresión')
      return
    }
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 200)
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
            const status = String(sale.status ?? '').toLowerCase()
            return (
              <article
                key={sale.id}
                className="cursor-pointer rounded-xl border border-[#E6EBF2] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.06)] transition hover:border-[#BFDBFE]"
                onClick={() => openSaleModal(sale)}
              >
                <div className="grid gap-3 md:grid-cols-[2fr_1.5fr_1fr_1fr] md:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#EEF2F7] px-2 py-0.5 text-[11px] font-semibold text-[#334155]">
                        {formatDate(sale.sale_date ?? sale.created_at)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          status === 'cancelled'
                            ? 'bg-[rgba(220,38,38,0.12)] text-[#991B1B]'
                            : 'bg-[rgba(22,163,74,0.12)] text-[#166534]'
                        }`}
                      >
                        {formatSaleStatus(sale.status)}
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

      <Modal
        open={Boolean(selectedSale)}
        title={activeSale ? `Venta ${activeSale.id.slice(0, 8)}` : 'Venta'}
        subtitle={activeSale ? 'Gestión operativa de la venta seleccionada.' : undefined}
        onClose={closeSaleModal}
        actions={
          <>
            <Button variant="secondary" onClick={closeSaleModal}>
              Cerrar
            </Button>
            {activeSale ? (
              <Button variant="secondary" onClick={handlePrintReceipt}>
                Imprimir comprobante
              </Button>
            ) : null}
            {canOperateSales && activeSale && String(activeSale.status ?? '').toLowerCase() !== 'cancelled' ? (
              <>
                <Button
                  variant="danger"
                  onClick={handleCancelSale}
                  disabled={
                    cancelMutation.isPending ||
                    updateMutation.isPending ||
                    registerPaymentMutation.isPending ||
                    settleMutation.isPending ||
                    cancelReason.trim().length === 0
                  }
                >
                  {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar venta'}
                </Button>
                <Button
                  onClick={handleSaveSale}
                  disabled={
                    updateMutation.isPending ||
                    cancelMutation.isPending ||
                    registerPaymentMutation.isPending ||
                    settleMutation.isPending
                  }
                >
                  {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </>
            ) : null}
          </>
        }
      >
        {selectedSale && !activeSale ? (
          <div className="rounded-2xl border border-[#E6EBF2] bg-white px-4 py-6 text-sm text-[#5B677A]">
            Cargando detalle de venta...
          </div>
        ) : null}

        {activeSale ? (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-[#E6EBF2] bg-[#F8FAFC] p-3 text-sm text-[#334155]">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#64748B]">Cliente</p>
                <p className="mt-1 font-medium text-[#0F172A]">{resolveCustomer(activeSale)}</p>
                <p className="text-xs text-[#64748B]">
                  Tel: {activeSale.customer_phone || activeSale.customer?.phone || '—'} · DNI:{' '}
                  {activeSale.customer_dni || activeSale.customer?.dni || '—'}
                </p>
              </div>
              <div className="rounded-xl border border-[#E6EBF2] bg-[#F8FAFC] p-3 text-sm text-[#334155]">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#64748B]">Estado y totales</p>
                <p className="mt-1 font-medium text-[#0F172A]">{formatSaleStatus(activeSale.status)}</p>
                <p className="text-xs text-[#64748B]">Fecha: {formatDate(activeSale.sale_date ?? activeSale.created_at)}</p>
                <p className="text-xs text-[#64748B]">Total: {formatMoney(activeSale.total_ars)}</p>
                <p className="text-xs text-[#64748B]">Saldo: {formatMoney(activeSale.balance_due_ars ?? 0)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-[#E6EBF2] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#64748B]">Equipo</p>
              <p className="mt-1 text-sm font-medium text-[#0F172A]">{resolveItemSummary(activeSale)}</p>
              {activeSale.items && activeSale.items.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-[#64748B]">
                  {activeSale.items.map((item, index) => (
                    <li key={`${activeSale.id}-item-${index}`}>
                      {item.model || 'Equipo'} {item.imei ? `· IMEI ${item.imei}` : ''} · {formatMoney(item.sale_price_ars ?? 0)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-[#64748B]">Vendedor</label>
                <Select
                  value={editSellerId}
                  onChange={(event) => setEditSellerId(event.target.value)}
                  disabled={!canOperateSales || String(activeSale.status ?? '').toLowerCase() === 'cancelled'}
                >
                  <option value="">Sin asignar</option>
                  {(sellersQuery.data ?? []).map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.full_name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-[#64748B]">Cubo 20W</label>
                <label className="flex h-11 items-center gap-2 rounded-xl border border-[#E6EBF2] px-3 text-sm text-[#0F172A]">
                  <input
                    type="checkbox"
                    checked={editIncludesCube}
                    disabled={!canOperateSales || String(activeSale.status ?? '').toLowerCase() === 'cancelled'}
                    onChange={(event) => setEditIncludesCube(event.target.checked)}
                  />
                  Incluye cubo de 20W
                </label>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-[#64748B]">Detalle</label>
              <Input
                value={editDetails}
                onChange={(event) => setEditDetails(event.target.value)}
                disabled={!canOperateSales || String(activeSale.status ?? '').toLowerCase() === 'cancelled'}
              />
            </div>

            {canOperateSales && String(activeSale.status ?? '').toLowerCase() !== 'cancelled' ? (
              <div className="space-y-3 rounded-xl border border-[#E6EBF2] bg-white p-3">
                <p className="text-sm font-semibold text-[#0F172A]">Cobros y cierre de venta</p>
                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-[#64748B]">Método</label>
                    <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as RegisterSalePaymentPayload['method'])}>
                      <option value="cash">Efectivo</option>
                      <option value="transfer">Transferencia</option>
                      <option value="card">Tarjeta</option>
                      <option value="mixed">Mixto</option>
                      <option value="trade_in">Permuta</option>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-[#64748B]">Moneda</label>
                    <Select value={paymentCurrency} onChange={(event) => setPaymentCurrency(event.target.value as RegisterSalePaymentPayload['currency'])}>
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-[#64748B]">Monto</label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={paymentAmount}
                      onChange={(event) => setPaymentAmount(event.target.value)}
                      placeholder="Ej: 100000"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-[#64748B]">Nota</label>
                    <Input value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="Opcional" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleRegisterPayment}
                    disabled={registerPaymentMutation.isPending || settleMutation.isPending}
                  >
                    {registerPaymentMutation.isPending ? 'Registrando...' : 'Registrar pago'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleSettleSale}
                    disabled={settleMutation.isPending || registerPaymentMutation.isPending}
                  >
                    {settleMutation.isPending ? 'Cerrando...' : 'Cerrar saldo'}
                  </Button>
                </div>
                {activeSale.payments && activeSale.payments.length > 0 ? (
                  <div className="rounded-lg border border-[#E6EBF2] bg-[#F8FAFC] p-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#64748B]">Pagos registrados</p>
                    <ul className="mt-1 space-y-1 text-xs text-[#334155]">
                      {activeSale.payments.map((payment) => (
                        <li key={payment.id ?? `${payment.method}-${payment.amount}`}>
                          {formatPaymentMethod(payment.method)} · {payment.currency} {formatMoney(payment.amount)} {payment.note ? `· ${payment.note}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            {canOperateSales && String(activeSale.status ?? '').toLowerCase() !== 'cancelled' ? (
              <div className="space-y-3 rounded-xl border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.06)] p-3">
                <p className="text-sm font-semibold text-[#991B1B]">Cancelar venta y reingresar equipo</p>
                <p className="text-xs text-[#7F1D1D]">Elegí el estado de reingreso. Este cambio impacta en stock.</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-[#7F1D1D]">
                      Estado de reingreso
                    </label>
                    <Select value={cancelRestockState} onChange={(event) => setCancelRestockState(event.target.value as CancelSalePayload['restock_state'])}>
                      {RESTOCK_STATE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.1em] text-[#7F1D1D]">Motivo (requerido)</label>
                    <Input value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Ej: cliente se arrepintió" />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
