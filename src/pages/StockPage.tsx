import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  STOCK_SOLD_LINKED_HELP,
  STOCK_SOLD_LINKED_LABEL,
  STOCK_PROMO_BLOCKED_MESSAGE,
  canToggleStockPromo,
  createStockItem,
  fetchStockPage,
  isStockItemSoldOrLinked,
  reserveStockItem,
  resolveStockMutationErrorMessage,
  runStockStateTransitionGuard,
  updateStockItem,
} from '../services/stock'
import type { StockItem, StockState } from '../types'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Select } from '../components/ui/Select'

const stateOptions: Array<{ value: StockState; label: string }> = [
  { value: 'outlet', label: 'Outlet' },
  { value: 'used_premium', label: 'Usados Premium' },
  { value: 'reserved', label: 'Reserva' },
  { value: 'deposit', label: 'Seña' },
  { value: 'new', label: 'Nuevo' },
  { value: 'drawer', label: 'Cajón' },
  { value: 'service_tech', label: 'Servicio Técnico' },
  { value: 'sold', label: 'Vendido' },
]

const iphoneModelSuggestions = [
  'iPhone SE',
  'iPhone 11',
  'iPhone 11 Pro',
  'iPhone 11 Pro Max',
  'iPhone 12',
  'iPhone 12 mini',
  'iPhone 12 Pro',
  'iPhone 12 Pro Max',
  'iPhone 13',
  'iPhone 13 mini',
  'iPhone 13 Pro',
  'iPhone 13 Pro Max',
  'iPhone 14',
  'iPhone 14 Plus',
  'iPhone 14 Pro',
  'iPhone 14 Pro Max',
  'iPhone 15',
  'iPhone 15 Plus',
  'iPhone 15 Pro',
  'iPhone 15 Pro Max',
  'iPhone 16',
  'iPhone 16 Plus',
  'iPhone 16 Pro',
  'iPhone 16 Pro Max',
] as const

const stateLabelMap = stateOptions.reduce(
  (acc, option) => {
    acc[option.value] = option.label
    return acc
  },
  {} as Record<StockState, string>,
)

const stateBadgeClass: Record<StockState, string> = {
  outlet: 'bg-[rgba(245,158,11,0.14)] text-[#92400E]',
  used_premium: 'bg-[rgba(14,116,144,0.14)] text-[#0E7490]',
  reserved: 'bg-[rgba(124,58,237,0.14)] text-[#6D28D9]',
  deposit: 'bg-[rgba(217,119,6,0.14)] text-[#9A3412]',
  new: 'bg-[rgba(22,163,74,0.14)] text-[#166534]',
  drawer: 'bg-[rgba(71,85,105,0.14)] text-[#334155]',
  service_tech: 'bg-[rgba(220,38,38,0.14)] text-[#991B1B]',
  sold: 'bg-[rgba(15,23,42,0.12)] text-[#1E293B]',
}

const statusToState: Record<string, StockState> = {
  available: 'new',
  reserved: 'reserved',
  sold: 'sold',
  drawer: 'drawer',
  service_tech: 'service_tech',
}

function resolveState(item: StockItem): StockState {
  if (item.state) return item.state
  const status = item.status ? String(item.status) : ''
  return statusToState[status] ?? 'new'
}

function formatMoney(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `$${value.toLocaleString('es-AR')}`
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-AR')
}

function asPositiveNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const createSchema = z.object({
  state: z.enum(stateOptions.map((option) => option.value) as [StockState, ...StockState[]]),
  model: z.string().min(1, 'Modelo requerido'),
  storage_gb: z.coerce.number().int().min(1, 'GB debe ser mayor a 0'),
  battery_pct: z.coerce.number().min(0, '0 mínimo').max(100, '100 máximo'),
  color: z.string().optional(),
  sale_price_ars: z.coerce.number().min(1, 'Precio requerido'),
  details: z.string().optional(),
  imei: z.string().min(4, 'IMEI requerido'),
  received_at: z.string().min(1, 'Fecha requerida'),
  provider_name: z.string().optional(),
  is_promo: z.boolean().default(false),
})

const reserveSchema = z.object({
  reserve_type: z.enum(['reserva', 'sena']),
  reserve_amount_ars: z.coerce.number().optional().nullable(),
  reserve_notes: z.string().optional(),
})

const PAGE_SIZE = 40
const EMPTY_STOCK_ITEMS: StockItem[] = []

export function StockPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [stateFilter, setStateFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [promoFilter, setPromoFilter] = useState<'all' | 'promo' | 'no_promo'>('all')
  const [page, setPage] = useState(1)
  const [newOpen, setNewOpen] = useState(false)
  const [reserveOpen, setReserveOpen] = useState(false)
  const [reserveTarget, setReserveTarget] = useState<StockItem | null>(null)
  const [detailTarget, setDetailTarget] = useState<StockItem | null>(null)
  const [detailState, setDetailState] = useState<StockState>('new')
  const [detailPrice, setDetailPrice] = useState('')
  const [detailProvider, setDetailProvider] = useState('')
  const [detailDetails, setDetailDetails] = useState('')
  const [detailPromo, setDetailPromo] = useState(false)

  const stockQuery = useQuery({
    queryKey: ['stock', stateFilter, modelFilter, promoFilter, page, PAGE_SIZE],
    queryFn: () =>
      fetchStockPage({
        state: stateFilter || undefined,
        model: modelFilter || undefined,
        promo: promoFilter === 'all' ? undefined : promoFilter === 'promo',
        page,
        page_size: PAGE_SIZE,
        sort_by: 'received_at',
        sort_dir: 'desc',
      }),
  })

  const fetchedStock = stockQuery.data?.items ?? EMPTY_STOCK_ITEMS
  const usingServerPagination = Boolean(stockQuery.data?.serverPagination)
  const modelSuggestions = useMemo(() => {
    const suggestions = new Set<string>(iphoneModelSuggestions)
    fetchedStock.forEach((item) => {
      const model = String(item.model ?? '').trim()
      if (model) suggestions.add(model)
    })
    return [...suggestions].sort((a, b) => a.localeCompare(b, 'es'))
  }, [fetchedStock])

  const processedStock = useMemo(() => {
    if (usingServerPagination) {
      return fetchedStock
    }

    return fetchedStock
      .filter((item) => {
        if (modelFilter && !String(item.model ?? '').toLowerCase().includes(modelFilter.toLowerCase())) return false
        if (promoFilter === 'promo' && !item.is_promo) return false
        if (promoFilter === 'no_promo' && item.is_promo) return false
        return true
      })
      .sort((a, b) => {
        const aDate = new Date(a.received_at ?? a.created_at ?? 0).getTime()
        const bDate = new Date(b.received_at ?? b.created_at ?? 0).getTime()
        return bDate - aDate
      })
  }, [fetchedStock, modelFilter, promoFilter, usingServerPagination])

  const totalCount = usingServerPagination
    ? Number(stockQuery.data?.total ?? fetchedStock.length)
    : processedStock.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const currentPage = usingServerPagination ? page : safePage

  const paginatedStock = useMemo(
    () => {
      if (usingServerPagination) return processedStock
      const pageOffset = (safePage - 1) * PAGE_SIZE
      return processedStock.slice(pageOffset, pageOffset + PAGE_SIZE)
    },
    [processedStock, safePage, usingServerPagination],
  )
  const pageStart = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const pageEnd = totalCount === 0 ? 0 : Math.min((currentPage - 1) * PAGE_SIZE + paginatedStock.length, totalCount)

  const newForm = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: {
      state: 'new',
      battery_pct: 100,
      storage_gb: 128,
      sale_price_ars: 0,
      received_at: new Date().toISOString().slice(0, 10),
      is_promo: false,
    },
  })

  const reserveForm = useForm({
    resolver: zodResolver(reserveSchema),
    defaultValues: {
      reserve_type: 'reserva',
      reserve_amount_ars: null,
      reserve_notes: '',
    },
  })
  const reserveAmountArs = useWatch({ control: reserveForm.control, name: 'reserve_amount_ars' })

  const createMutation = useMutation({
    mutationFn: createStockItem,
    onSuccess: () => {
      toast.success('Equipo creado')
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      setNewOpen(false)
      newForm.reset({
        state: 'new',
        battery_pct: 100,
        storage_gb: 128,
        sale_price_ars: 0,
        received_at: new Date().toISOString().slice(0, 10),
        is_promo: false,
      })
    },
    onError: (error) => {
      const err = error as Error
      toast.error(err.message || 'No se pudo crear el equipo')
    },
  })

  const detailMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<StockItem> }) => updateStockItem(id, payload),
    onSuccess: () => {
      toast.success('Equipo actualizado')
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      setDetailTarget(null)
    },
    onError: (error) => {
      toast.error(resolveStockMutationErrorMessage(error, 'No se pudo actualizar equipo'))
    },
  })

  const reserveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) => {
      const parsed = reserveSchema.parse(payload)
      return reserveStockItem(id, {
        reserve_type: parsed.reserve_type,
        reserve_amount_ars: parsed.reserve_amount_ars ?? undefined,
        reserve_notes: parsed.reserve_notes,
      })
    },
    onSuccess: () => {
      toast.success('Equipo actualizado')
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      setReserveOpen(false)
      setReserveTarget(null)
      reserveForm.reset({ reserve_type: 'reserva', reserve_amount_ars: null, reserve_notes: '' })
    },
    onError: (error) => {
      toast.error(resolveStockMutationErrorMessage(error, 'No se pudo reservar/señar'))
    },
  })

  const handleCreate = async (values: unknown) => {
    const parsed = createSchema.parse(values)
    const normalizedImei = parsed.imei.trim()
    const duplicatedImeiInPage = fetchedStock.some(
      (item) => String(item.imei ?? '').trim() !== '' && String(item.imei).trim() === normalizedImei,
    )

    if (duplicatedImeiInPage) {
      toast.error('IMEI duplicado. Debe ser único.')
      return
    }

    try {
      const lookup = await fetchStockPage({
        query: normalizedImei,
        page: 1,
        page_size: 100,
        sort_by: 'received_at',
        sort_dir: 'desc',
      })

      const duplicatedImeiInServer = lookup.items.some(
        (item) => String(item.imei ?? '').trim() !== '' && String(item.imei).trim() === normalizedImei,
      )

      if (duplicatedImeiInServer) {
        toast.error('IMEI duplicado. Debe ser único.')
        return
      }
    } catch (error) {
      const err = error as Error
      toast.error(err.message || 'No se pudo validar IMEI')
      return
    }

    createMutation.mutate({
      state: parsed.state,
      status: parsed.state,
      category: parsed.state,
      brand: 'Apple',
      model: parsed.model,
      storage_gb: parsed.storage_gb,
      battery_pct: parsed.battery_pct,
      color: parsed.color?.trim() || null,
      sale_price_ars: parsed.sale_price_ars,
      details: parsed.details?.trim() || null,
      imei: normalizedImei,
      received_at: parsed.received_at,
      provider_name: parsed.provider_name?.trim() || null,
      is_promo: parsed.is_promo,
    })
  }

  const handleReserveSubmit = (values: unknown) => {
    if (!reserveTarget) return
    reserveMutation.mutate({ id: reserveTarget.id, payload: reserveSchema.parse(values) })
  }

  const openReserveModal = (item: StockItem) => {
    setReserveTarget(item)
    reserveForm.reset({ reserve_type: 'reserva', reserve_amount_ars: null, reserve_notes: '' })
    setReserveOpen(true)
  }

  const handleStateFilterChange = (value: string) => {
    setStateFilter(value)
    setPage(1)
  }

  const handleModelFilterChange = (value: string) => {
    setModelFilter(value)
    setPage(1)
  }

  const handlePromoFilterChange = (value: 'all' | 'promo' | 'no_promo') => {
    setPromoFilter(value)
    setPage(1)
  }

  const openDetailModal = (item: StockItem) => {
    setDetailTarget(item)
    setDetailState(resolveState(item))
    setDetailPrice(item.sale_price_ars != null ? String(item.sale_price_ars) : '')
    setDetailProvider(item.provider_name ?? '')
    setDetailDetails(item.details ?? '')
    setDetailPromo(Boolean(item.is_promo))
  }

  const closeDetailModal = () => {
    setDetailTarget(null)
  }

  const handleSaveDetail = () => {
    if (!detailTarget) return

    const stateGuard = runStockStateTransitionGuard(detailTarget, detailState, () => {})
    if (!stateGuard.allowed) {
      toast.error(stateGuard.message)
      return
    }

    if (detailPromo !== Boolean(detailTarget.is_promo) && !canToggleStockPromo(detailTarget)) {
      toast.error(STOCK_PROMO_BLOCKED_MESSAGE)
      return
    }

    const normalizedPrice = Number(String(detailPrice).replace(',', '.'))
    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      toast.error('Ingresá un precio válido mayor a 0.')
      return
    }

    detailMutation.mutate({
      id: detailTarget.id,
      payload: {
        state: detailState,
        sale_price_ars: normalizedPrice,
        provider_name: detailProvider.trim() || null,
        details: detailDetails.trim() || null,
        is_promo: detailPromo,
      },
    })
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Stock</h2>
          <p className="text-sm text-[#5B677A]">Vista operativa rápida por estado, modelo, promo e IMEI.</p>
        </div>
        <Button onClick={() => setNewOpen(true)}>Nuevo equipo</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Select value={stateFilter} onChange={(event) => handleStateFilterChange(event.target.value)}>
          <option value="">Estado (todos)</option>
          {stateOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Input
          list="stock-model-suggestions"
          placeholder="Modelo (ej: iPhone 13 Pro Max)"
          value={modelFilter}
          onChange={(event) => handleModelFilterChange(event.target.value)}
        />
        <datalist id="stock-model-suggestions">
          {modelSuggestions.map((model) => (
            <option key={model} value={model} />
          ))}
        </datalist>
        <Select value={promoFilter} onChange={(event) => handlePromoFilterChange(event.target.value as 'all' | 'promo' | 'no_promo')}>
          <option value="all">Promo: todos</option>
          <option value="promo">Solo promo</option>
          <option value="no_promo">Sin promo</option>
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">
          {totalCount} equipos
        </p>
        <p className="text-xs text-[#64748B]">Lista compacta (rápida para alto volumen)</p>
      </div>

      {stockQuery.error ? (
        <div className="rounded-2xl border border-[rgba(185,28,28,0.2)] bg-[rgba(185,28,28,0.08)] px-4 py-6 text-sm text-[#B91C1C]">
          No se pudo cargar stock: {(stockQuery.error as Error).message}
        </div>
      ) : stockQuery.isLoading ? (
        <div className="rounded-2xl border border-[#E6EBF2] bg-white px-4 py-6 text-sm text-[#5B677A]">
          Cargando stock...
        </div>
      ) : totalCount === 0 ? (
        <div className="rounded-2xl border border-[#E6EBF2] bg-white px-4 py-6 text-sm text-[#5B677A]">
          Sin registros para los filtros actuales.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {paginatedStock.map((item) => {
              const itemState = resolveState(item)
              const isSoldLinked = isStockItemSoldOrLinked(item)
              return (
                <article
                  key={item.id}
                  className="cursor-pointer rounded-lg border border-[#E6EBF2] bg-white p-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.06)] transition hover:border-[#BFDBFE]"
                  onClick={() => openDetailModal(item)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${stateBadgeClass[itemState]}`}>
                          {stateLabelMap[itemState]}
                        </span>
                        {item.is_promo ? (
                          <span className="rounded-full bg-[rgba(220,38,38,0.12)] px-2 py-0.5 text-[10px] font-semibold text-[#991B1B]">
                            Promo
                          </span>
                        ) : null}
                        <span className="rounded-full bg-[#EEF2F7] px-2 py-0.5 text-[10px] font-semibold text-[#334155]">
                          {item.days_in_stock ?? '—'} días
                        </span>
                      </div>
                      <h4 className="mt-1 text-base font-semibold leading-tight text-[#0F172A]">
                        {item.model || 'Equipo sin modelo'}
                      </h4>
                      <p className="truncate text-xs text-[#64748B]">IMEI {item.imei || '—'}</p>
                      <p className="mt-0.5 truncate text-xs text-[#475569]">
                        {item.storage_gb ?? '—'} GB · Bat {typeof item.battery_pct === 'number' ? `${item.battery_pct}%` : '—'} ·{' '}
                        {item.color || 'Sin color'}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-lg font-semibold text-[#0F172A]">{formatMoney(item.sale_price_ars)}</p>
                      <p className="text-[11px] text-[#64748B]">{formatDate(item.received_at ?? item.created_at)}</p>
                    </div>
                  </div>

                  <p className="mt-1 truncate text-[11px] text-[#64748B]">
                    Prov: {item.provider_name || '—'}{item.details ? ` · ${item.details}` : ''}
                  </p>

                  {isSoldLinked ? (
                    <div className="mt-1 rounded-md border border-[rgba(11,74,162,0.2)] bg-[rgba(11,74,162,0.06)] px-2 py-1">
                      <p className="text-[11px] font-semibold text-[#0B4AA2]">{STOCK_SOLD_LINKED_LABEL}</p>
                      <p className="text-[10px] text-[#1D4E89]">{STOCK_SOLD_LINKED_HELP}</p>
                    </div>
                  ) : null}

                  <div className="mt-2 flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                    {!isSoldLinked ? (
                      <>
                        <Button size="sm" className="h-8 px-3" onClick={() => navigate(`/sales/new?stock=${item.id}`)}>
                          Vender
                        </Button>
                        <Button size="sm" variant="secondary" className="h-8 px-3" onClick={() => openReserveModal(item)}>
                          Reservar/Señar
                        </Button>
                      </>
                    ) : null}
                    {item.sale_id ? (
                      <Button size="sm" variant="ghost" className="h-8 px-3" onClick={() => navigate(`/sales?sale_id=${item.sale_id}`)}>
                        Ver venta
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" className="h-8 px-3" onClick={() => openDetailModal(item)}>
                      Editar
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}

      {!stockQuery.error && !stockQuery.isLoading && totalCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E6EBF2] bg-white px-3 py-2">
          <p className="text-xs text-[#475569]">
            Mostrando {pageStart}-{pageEnd} de {totalCount} equipos
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
        open={Boolean(detailTarget)}
        title={detailTarget ? detailTarget.model || 'Equipo' : 'Equipo'}
        subtitle={detailTarget ? `IMEI ${detailTarget.imei ?? '—'}` : undefined}
        onClose={closeDetailModal}
        actions={
          <>
            <Button variant="secondary" onClick={closeDetailModal}>
              Cerrar
            </Button>
            {detailTarget ? (
              <Button onClick={handleSaveDetail} disabled={detailMutation.isPending}>
                {detailMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            ) : null}
          </>
        }
      >
        {detailTarget ? (
          <div className="space-y-4">
            {isStockItemSoldOrLinked(detailTarget) ? (
              <div className="rounded-lg border border-[rgba(11,74,162,0.2)] bg-[rgba(11,74,162,0.06)] px-3 py-2">
                <p className="text-sm font-semibold text-[#0B4AA2]">{STOCK_SOLD_LINKED_LABEL}</p>
                <p className="text-xs text-[#1D4E89]">{STOCK_SOLD_LINKED_HELP}</p>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Estado">
                <Select
                  value={detailState}
                  disabled={isStockItemSoldOrLinked(detailTarget)}
                  onChange={(event) => setDetailState(event.target.value as StockState)}
                >
                  {stateOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Precio ARS">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={detailPrice}
                  onChange={(event) => setDetailPrice(event.target.value)}
                />
              </Field>
              <Field label="Proveedor">
                <Input value={detailProvider} onChange={(event) => setDetailProvider(event.target.value)} />
              </Field>
              <Field label="Promo">
                <label className="flex h-11 items-center gap-2 rounded-xl border border-[#E6EBF2] px-3 text-sm text-[#0F172A]">
                  <input
                    type="checkbox"
                    checked={detailPromo}
                    disabled={isStockItemSoldOrLinked(detailTarget)}
                    onChange={(event) => setDetailPromo(event.target.checked)}
                  />
                  Equipo en promoción
                </label>
              </Field>
            </div>

            <Field label="Detalle">
              <Input value={detailDetails} onChange={(event) => setDetailDetails(event.target.value)} />
            </Field>

            <div className="rounded-xl border border-[#E6EBF2] bg-[#F8FAFC] p-3 text-xs text-[#64748B]">
              <p>
                GB: {detailTarget.storage_gb ?? '—'} · Bat: {typeof detailTarget.battery_pct === 'number' ? `${detailTarget.battery_pct}%` : '—'} ·
                Color: {detailTarget.color || '—'}
              </p>
              <p>Ingreso: {formatDate(detailTarget.received_at ?? detailTarget.created_at)}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {!isStockItemSoldOrLinked(detailTarget) ? (
                <>
                  <Button size="sm" onClick={() => navigate(`/sales/new?stock=${detailTarget.id}`)}>
                    Vender
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      closeDetailModal()
                      openReserveModal(detailTarget)
                    }}
                  >
                    Reservar/Señar
                  </Button>
                </>
              ) : null}
              {detailTarget.sale_id ? (
                <Button size="sm" variant="ghost" onClick={() => navigate(`/sales?sale_id=${detailTarget.sale_id}`)}>
                  Ver venta
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={newOpen}
        title="Nuevo equipo"
        subtitle="Carga rápida para operación diaria"
        onClose={() => setNewOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setNewOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={newForm.handleSubmit(handleCreate)} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={newForm.handleSubmit(handleCreate)}>
          <section className="space-y-3 rounded-2xl border border-[#E6EBF2] bg-[#F8FAFC] p-4">
            <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#0F172A]">Información básica</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Modelo">
                <Input list="stock-model-create-suggestions" {...newForm.register('model')} placeholder="Ej: iPhone 13 Pro" />
              </Field>
              <Field label="Almacenamiento (GB)">
                <Input type="number" min={1} {...newForm.register('storage_gb')} />
              </Field>
              <Field label="Color">
                <Input {...newForm.register('color')} placeholder="Ej: Blanco" />
              </Field>
              <Field label="Condición">
                <Select {...newForm.register('state')}>
                  {stateOptions.filter((option) => option.value !== 'sold').map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Precio ARS">
                <Input type="number" min={1} {...newForm.register('sale_price_ars')} />
              </Field>
              <Field label="Promo">
                <label className="flex h-11 items-center gap-2 rounded-xl border border-[#E6EBF2] bg-white px-3 text-sm text-[#0F172A] shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
                  <input type="checkbox" {...newForm.register('is_promo')} />
                  Marcar promoción
                </label>
              </Field>
            </div>
            <datalist id="stock-model-create-suggestions">
              {modelSuggestions.map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
          </section>

          <section className="space-y-3 rounded-2xl border border-[#E6EBF2] bg-[#F8FAFC] p-4">
            <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#0F172A]">Identificación</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="IMEI">
                <Input {...newForm.register('imei')} placeholder="15 dígitos" />
              </Field>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-[#E6EBF2] bg-[#F8FAFC] p-4">
            <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#0F172A]">Detalles de estado</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Batería (%)">
                <Input type="number" min={0} max={100} {...newForm.register('battery_pct')} />
              </Field>
              <Field label="Detalles adicionales">
                <Input {...newForm.register('details')} placeholder="Detalle estético, faltante, etc." />
              </Field>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-[#E6EBF2] bg-[#F8FAFC] p-4">
            <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#0F172A]">Origen / Compra</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Proveedor">
                <Input {...newForm.register('provider_name')} placeholder="Proveedor" />
              </Field>
              <Field label="Fecha de ingreso">
                <Input type="date" {...newForm.register('received_at')} />
              </Field>
            </div>
          </section>

          {Object.keys(newForm.formState.errors).length > 0 && (
            <div className="space-y-1 rounded-xl border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.06)] p-3 text-xs text-[#991B1B]">
              {newForm.formState.errors.model?.message && <p>{newForm.formState.errors.model.message}</p>}
              {newForm.formState.errors.storage_gb?.message && <p>{newForm.formState.errors.storage_gb.message}</p>}
              {newForm.formState.errors.battery_pct?.message && <p>{newForm.formState.errors.battery_pct.message}</p>}
              {newForm.formState.errors.sale_price_ars?.message && <p>{newForm.formState.errors.sale_price_ars.message}</p>}
              {newForm.formState.errors.imei?.message && <p>{newForm.formState.errors.imei.message}</p>}
              {newForm.formState.errors.received_at?.message && <p>{newForm.formState.errors.received_at.message}</p>}
            </div>
          )}
        </form>
      </Modal>

      <Modal
        open={reserveOpen}
        title="Reservar / Señar"
        subtitle={reserveTarget ? `${reserveTarget.model} · ${reserveTarget.imei ?? 'Sin IMEI'}` : undefined}
        onClose={() => {
          setReserveOpen(false)
          setReserveTarget(null)
        }}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setReserveOpen(false)
                setReserveTarget(null)
              }}
            >
              Cancelar
            </Button>
            <Button onClick={reserveForm.handleSubmit(handleReserveSubmit)} disabled={reserveMutation.isPending}>
              {reserveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </>
        }
      >
        <form className="space-y-3" onSubmit={reserveForm.handleSubmit(handleReserveSubmit)}>
          <Field label="Tipo">
            <Select {...reserveForm.register('reserve_type')}>
              <option value="reserva">Reserva</option>
              <option value="sena">Seña</option>
            </Select>
          </Field>
          <Field label="Monto ARS (opcional)">
            <Input
              type="number"
              min={0}
              value={reserveAmountArs == null ? '' : String(reserveAmountArs)}
              onChange={(event) => {
                reserveForm.setValue('reserve_amount_ars', asPositiveNumber(event.target.value), {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }}
            />
          </Field>
          <Field label="Observación">
            <Input {...reserveForm.register('reserve_notes')} placeholder="Fecha límite, faltante, etc." />
          </Field>
        </form>
      </Modal>
    </div>
  )
}
