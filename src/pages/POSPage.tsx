import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createSale, fetchSellers, type CreateSalePayload } from '../services/sales'
import { fetchStockPage, isStockItemSoldOrLinked, reserveStockItem, resolveStockMutationErrorMessage } from '../services/stock'
import { useAuth } from '../hooks/useAuth'
import type { StockItem, StockState } from '../types'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Select } from '../components/ui/Select'

const stateOptions: Array<{ value: StockState; label: string }> = [
  { value: 'outlet', label: 'Outlet' },
  { value: 'used_premium', label: 'Usados Premium' },
  { value: 'new', label: 'Nuevo' },
  { value: 'reserved', label: 'Reserva' },
  { value: 'deposit', label: 'Seña' },
  { value: 'drawer', label: 'Cajón' },
  { value: 'service_tech', label: 'Servicio Técnico' },
]

const stateLabelMap = stateOptions.reduce(
  (acc, option) => {
    acc[option.value] = option.label
    return acc
  },
  {} as Record<StockState, string>,
)

const statusToState: Record<string, StockState> = {
  available: 'new',
  reserved: 'reserved',
  sold: 'sold',
  drawer: 'drawer',
  service_tech: 'service_tech',
}

const unsoldStatuses = ['available', 'reserved', 'drawer', 'service_tech']
const PAGE_SIZE = 24
const EMPTY_STOCK_ITEMS: StockItem[] = []

const paymentSchema = z.object({
  method: z.enum(['cash', 'transfer', 'card', 'deposit']),
  currency: z.enum(['ARS', 'USD']),
  amount: z.coerce.number().min(0.01, 'Monto mayor a 0'),
  card_brand: z.string().optional(),
  installments: z.coerce.number().optional().nullable(),
  surcharge_pct: z.coerce.number().optional().nullable(),
  note: z.string().optional(),
})

const saleModalSchema = z
  .object({
    sale_date: z
      .string()
      .trim()
      .min(1, 'Fecha requerida')
      .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Formato DD/MM/AAAA'),
    seller_id: z.string().optional(),
    customer_name: z.string().min(1, 'Nombre requerido'),
    customer_phone: z.string().min(1, 'Teléfono requerido'),
    customer_dni: z.string().optional(),
    sale_price_ars: z.coerce.number().min(1, 'Precio mayor a 0'),
    details: z.string().optional(),
    includes_cube_20w: z.boolean().default(false),
    fx_rate_used: z.coerce.number().optional().nullable(),
    payments: z.array(paymentSchema).min(1, 'Debe existir al menos 1 pago'),
    plan_canje_enabled: z.boolean().default(false),
    trade_model: z.string().optional(),
    trade_storage_gb: z.coerce.number().optional().nullable(),
    trade_color: z.string().optional(),
    trade_battery_pct: z.coerce.number().optional().nullable(),
    trade_state: z.string().optional(),
    trade_imei: z.string().optional(),
    trade_value_taken_usd: z.coerce.number().optional().nullable(),
    trade_resale_usd: z.coerce.number().optional().nullable(),
    trade_send_tech: z.boolean().default(false),
    trade_notes: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!parseDisplayDateToIso(values.sale_date)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Fecha inválida', path: ['sale_date'] })
    }

    const hasUsdPayment = values.payments.some((payment) => payment.currency === 'USD')
    if (hasUsdPayment && (!values.fx_rate_used || values.fx_rate_used <= 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Tipo de cambio requerido para pagos en USD', path: ['fx_rate_used'] })
    }

    if (values.plan_canje_enabled) {
      if (!values.trade_model?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Modelo requerido', path: ['trade_model'] })
      }

      const taken = Number(values.trade_value_taken_usd ?? 0)
      if (!Number.isFinite(taken) || taken <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Valor tomado requerido', path: ['trade_value_taken_usd'] })
      }
    }
  })

type SaleModalFormInput = z.input<typeof saleModalSchema>
type SaleModalFormValues = z.output<typeof saleModalSchema>
type SaleModalPayment = SaleModalFormInput['payments'][number]

const EMPTY_PAYMENTS: SaleModalPayment[] = []

function createEmptyPayment(): SaleModalPayment {
  return {
    method: 'cash',
    currency: 'ARS',
    amount: '' as unknown as number,
  }
}

function resolveState(item: StockItem): StockState {
  if (item.state) return item.state
  const status = item.status ? String(item.status) : ''
  return statusToState[status] ?? 'new'
}

function formatMoney(value?: number | null, currency = 'ARS') {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  const formatted = value.toLocaleString('es-AR')
  return currency === 'USD' ? `USD $${formatted}` : `ARS $${formatted}`
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

function parseDisplayDateToIso(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim())
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }

  return date.toISOString()
}

function todayDisplayDate() {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = String(now.getFullYear())
  return `${day}/${month}/${year}`
}

function getArsAmount(payment: SaleModalPayment, fxRate: number) {
  const amount = Number(payment.amount ?? 0)
  if (payment.currency === 'ARS') return amount
  if (!fxRate || fxRate <= 0) return 0
  return amount * fxRate
}

export function POSPage() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const [stateFilter, setStateFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [page, setPage] = useState(1)

  const [reserveOpen, setReserveOpen] = useState(false)
  const [reserveTarget, setReserveTarget] = useState<StockItem | null>(null)
  const [reserveType, setReserveType] = useState<'reserva' | 'sena'>('reserva')
  const [reserveAmountArs, setReserveAmountArs] = useState('')
  const [reserveNotes, setReserveNotes] = useState('')

  const [saleOpen, setSaleOpen] = useState(false)
  const [saleTarget, setSaleTarget] = useState<StockItem | null>(null)

  const stockQuery = useQuery({
    queryKey: ['pos', 'stock', stateFilter, searchFilter, page, PAGE_SIZE],
    queryFn: () =>
      fetchStockPage({
        statuses: unsoldStatuses,
        state: stateFilter || undefined,
        query: searchFilter || undefined,
        page,
        page_size: PAGE_SIZE,
        sort_by: 'received_at',
        sort_dir: 'desc',
      }),
  })

  const sellersQuery = useQuery({
    queryKey: ['users', 'sellers'],
    queryFn: fetchSellers,
  })

  const sellers = (() => {
    const list = sellersQuery.data ?? []
    if (!profile?.id) return list

    const exists = list.some((seller) => seller.id === profile.id)
    if (exists) return list

    return [
      {
        id: profile.id,
        full_name: profile.full_name || profile.email || 'Usuario actual',
        role: profile.role,
      },
      ...list,
    ]
  })()

  const saleForm = useForm<SaleModalFormInput>({
    resolver: zodResolver(saleModalSchema),
    defaultValues: {
      sale_date: todayDisplayDate(),
      seller_id: profile?.id ?? undefined,
      customer_name: '',
      customer_phone: '',
      customer_dni: '',
      sale_price_ars: 0,
      details: '',
      includes_cube_20w: false,
      fx_rate_used: null,
      payments: [createEmptyPayment()],
      plan_canje_enabled: false,
      trade_model: '',
      trade_storage_gb: null,
      trade_color: '',
      trade_battery_pct: null,
      trade_state: '',
      trade_imei: '',
      trade_value_taken_usd: null,
      trade_resale_usd: null,
      trade_send_tech: false,
      trade_notes: '',
    },
  })

  const watchedPayments = useWatch({ control: saleForm.control, name: 'payments' })
  const watchedFxRate = useWatch({ control: saleForm.control, name: 'fx_rate_used' })
  const watchedSalePriceArs = useWatch({ control: saleForm.control, name: 'sale_price_ars' })
  const watchedPlanCanjeEnabled = useWatch({ control: saleForm.control, name: 'plan_canje_enabled' })

  const payments = watchedPayments ?? EMPTY_PAYMENTS
  const fxRate = Number(watchedFxRate ?? 0)
  const salePriceArs = Number(watchedSalePriceArs ?? 0)

  const reserveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { reserve_type: 'reserva' | 'sena'; reserve_amount_ars?: number; reserve_notes?: string } }) =>
      reserveStockItem(id, payload),
    onSuccess: () => {
      toast.success('Equipo actualizado')
      queryClient.invalidateQueries({ queryKey: ['pos', 'stock'] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      setReserveOpen(false)
      setReserveTarget(null)
      setReserveType('reserva')
      setReserveAmountArs('')
      setReserveNotes('')
    },
    onError: (error) => {
      toast.error(resolveStockMutationErrorMessage(error, 'No se pudo reservar/señar'))
    },
  })

  const saleMutation = useMutation({
    mutationFn: createSale,
    onSuccess: () => {
      toast.success('Venta guardada')
      queryClient.invalidateQueries({ queryKey: ['pos', 'stock'] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      setSaleOpen(false)
      setSaleTarget(null)
    },
    onError: (error) => {
      const err = error as Error & { code?: string; details?: unknown }
      const code = String(err.code ?? '').toLowerCase()
      const detailsText =
        typeof err.details === 'string'
          ? err.details.toLowerCase()
          : JSON.stringify(err.details ?? '').toLowerCase()

      if (code === 'stock_conflict') {
        toast.error('El equipo ya fue vendido o está reservado por otra operación.')
        return
      }

      if (detailsText.includes('qty_not_supported_for_serialized_stock')) {
        toast.error('Este equipo es único por IMEI y solo admite cantidad 1.')
        return
      }

      toast.error(err.message || 'No se pudo guardar la venta')
    },
  })

  const fetchedStock = stockQuery.data?.items ?? EMPTY_STOCK_ITEMS
  const items = useMemo(() => fetchedStock.filter((item) => !isStockItemSoldOrLinked(item)), [fetchedStock])

  const totalCount = Number(stockQuery.data?.total ?? items.length)
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const paidArs = useMemo(
    () => payments.reduce((sum, payment) => sum + getArsAmount(payment, fxRate), 0),
    [payments, fxRate],
  )

  const balanceDueArs = useMemo(() => Math.max(0, salePriceArs - paidArs), [paidArs, salePriceArs])

  const openReserveModal = (item: StockItem) => {
    setReserveTarget(item)
    setReserveType('reserva')
    setReserveAmountArs('')
    setReserveNotes('')
    setReserveOpen(true)
  }

  const openSaleModal = (item: StockItem) => {
    setSaleTarget(item)
    setSaleOpen(true)

    const defaultPrice = Number(item.sale_price_ars ?? 0)

    saleForm.reset({
      sale_date: todayDisplayDate(),
      seller_id: profile?.id ?? undefined,
      customer_name: '',
      customer_phone: '',
      customer_dni: '',
      sale_price_ars: defaultPrice,
      details: '',
      includes_cube_20w: false,
      fx_rate_used: null,
      payments: [{ method: 'cash', currency: 'ARS', amount: defaultPrice as unknown as number }],
      plan_canje_enabled: false,
      trade_model: '',
      trade_storage_gb: null,
      trade_color: '',
      trade_battery_pct: null,
      trade_state: '',
      trade_imei: '',
      trade_value_taken_usd: null,
      trade_resale_usd: null,
      trade_send_tech: false,
      trade_notes: '',
    })
  }

  const handleReserve = () => {
    if (!reserveTarget) return

    reserveMutation.mutate({
      id: reserveTarget.id,
      payload: {
        reserve_type: reserveType,
        reserve_amount_ars: asPositiveNumber(reserveAmountArs) ?? undefined,
        reserve_notes: reserveNotes.trim() || undefined,
      },
    })
  }

  const addPayment = () => {
    const next = [...payments, createEmptyPayment()]
    saleForm.setValue('payments', next, { shouldDirty: true, shouldValidate: true })
  }

  const removePayment = (index: number) => {
    if (payments.length <= 1) return
    const next = payments.filter((_, paymentIndex) => paymentIndex !== index)
    saleForm.setValue('payments', next, { shouldDirty: true, shouldValidate: true })
  }

  const updatePayment = (index: number, patch: Partial<SaleModalPayment>) => {
    const next = [...payments]
    next[index] = { ...next[index], ...patch }
    saleForm.setValue('payments', next, { shouldDirty: true, shouldValidate: true })
  }

  const handleSubmitSale = (values: SaleModalFormInput) => {
    if (!saleTarget) return

    const parsed: SaleModalFormValues = saleModalSchema.parse(values)
    const saleDateIso = parseDisplayDateToIso(parsed.sale_date)

    if (!saleDateIso) {
      toast.error('Fecha inválida. Usá formato DD/MM/AAAA.')
      return
    }

    if (!Number.isFinite(salePriceArs) || salePriceArs <= 0) {
      toast.error('El total debe ser mayor a 0.')
      return
    }

    const paymentMethod = parsed.payments.length === 1 ? parsed.payments[0].method : 'mixed'
    const firstCardPayment = parsed.payments.find((payment) => payment.method === 'card')
    const hasUsdPayments = parsed.payments.some((payment) => payment.currency === 'USD')
    const onlyUsdPayments = parsed.payments.length > 0 && parsed.payments.every((payment) => payment.currency === 'USD')
    const fxRateUsed = hasUsdPayments ? Number(parsed.fx_rate_used ?? 0) : 0

    const planCanjeText = parsed.plan_canje_enabled
      ? [
          'PLAN CANJE',
          `Modelo: ${parsed.trade_model?.trim() || '—'}`,
          `GB: ${parsed.trade_storage_gb ?? '—'}`,
          `Color: ${parsed.trade_color?.trim() || '—'}`,
          `Batería: ${parsed.trade_battery_pct ?? '—'}%`,
          `Estado: ${parsed.trade_state?.trim() || '—'}`,
          `IMEI: ${parsed.trade_imei?.trim() || '—'}`,
          `Valor tomado USD: ${parsed.trade_value_taken_usd ?? 0}`,
          `Valor reventa USD: ${parsed.trade_resale_usd ?? 0}`,
          `Enviar a técnico: ${parsed.trade_send_tech ? 'Sí' : 'No'}`,
          `Observaciones: ${parsed.trade_notes?.trim() || '—'}`,
        ].join(' | ')
      : ''

    const mergedDetails = [parsed.details?.trim() || '', planCanjeText].filter(Boolean).join('\n')

    const payload: CreateSalePayload = {
      sale_date: saleDateIso,
      seller_id: parsed.seller_id || undefined,
      customer: {
        name: parsed.customer_name,
        phone: parsed.customer_phone,
        dni: parsed.customer_dni?.trim() || undefined,
      },
      payment_method: paymentMethod,
      card_brand: firstCardPayment?.card_brand?.trim() || null,
      installments: firstCardPayment?.installments ?? null,
      surcharge_pct: firstCardPayment?.surcharge_pct ?? null,
      deposit_ars: parsed.payments
        .filter((payment) => payment.method === 'deposit')
        .reduce((sum, payment) => sum + getArsAmount(payment, fxRateUsed), 0),
      currency: onlyUsdPayments ? 'USD' : 'ARS',
      fx_rate_used: hasUsdPayments ? fxRateUsed : null,
      total_usd: onlyUsdPayments && fxRateUsed > 0 ? Number((salePriceArs / fxRateUsed).toFixed(2)) : null,
      total_ars: salePriceArs,
      balance_due_ars: balanceDueArs,
      details: mergedDetails || null,
      notes: mergedDetails || null,
      includes_cube_20w: parsed.includes_cube_20w,
      payments: parsed.payments.map((payment) => ({
        method: payment.method,
        currency: payment.currency,
        amount: Number(payment.amount),
        card_brand: payment.card_brand?.trim() || null,
        installments: payment.installments ?? null,
        surcharge_pct: payment.surcharge_pct ?? null,
        note: payment.note?.trim() || null,
      })),
      items: [
        {
          stock_item_id: saleTarget.id,
          qty: 1,
          sale_price_ars: salePriceArs,
        },
      ],
    }

    saleMutation.mutate(payload)
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Punto de venta</h2>
        <p className="text-sm text-[#5B677A]">Buscá equipos de stock y vendé rápido desde mostrador.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <label className="relative block">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#94A3B8]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <Input
            className="h-12 pl-12 text-base"
            placeholder="Buscar modelo, color, código, IMEI..."
            value={searchFilter}
            onChange={(event) => {
              setSearchFilter(event.target.value)
              setPage(1)
            }}
          />
        </label>

        <label className="relative block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
              <path
                d="M3 5h18l-7 8v5l-4 2v-7L3 5Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <Select
            className="h-12 appearance-none pl-11 pr-10"
            value={stateFilter}
            onChange={(event) => {
              setStateFilter(event.target.value)
              setPage(1)
            }}
          >
            <option value="">Todos</option>
            {stateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
              <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">
          {items.length} equipos
        </p>
        <p className="text-xs text-[#64748B]">Venta rápida desde inventario</p>
      </div>

      {stockQuery.error ? (
        <div className="rounded-2xl border border-[rgba(185,28,28,0.2)] bg-[rgba(185,28,28,0.08)] px-4 py-6 text-sm text-[#B91C1C]">
          No se pudo cargar POS: {(stockQuery.error as Error).message}
        </div>
      ) : stockQuery.isLoading ? (
        <div className="rounded-2xl border border-[#E6EBF2] bg-white px-4 py-6 text-sm text-[#5B677A]">
          Cargando equipos...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-[#E6EBF2] bg-white px-4 py-6 text-sm text-[#5B677A]">
          No hay equipos para vender con estos filtros.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const state = resolveState(item)

            return (
              <article key={item.id} className="rounded-2xl border border-[#E6EBF2] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-[#0F172A]">
                      {item.model || 'Equipo'}
                      {item.storage_gb ? ` · ${item.storage_gb}GB` : ''}
                    </h3>
                    <p className="text-sm text-[#64748B]">{item.color || '—'} · IMEI {item.imei || '—'}</p>
                  </div>
                  <span className="rounded-full border border-[rgba(22,163,74,0.25)] bg-[rgba(22,163,74,0.1)] px-3 py-1 text-xs font-semibold text-[#15803D]">
                    Disponible
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded-full border border-[#D7DCE4] bg-[#F8FAFC] px-2 py-1 font-medium text-[#334155]">
                    {stateLabelMap[state]}
                  </span>
                  {typeof item.battery_pct === 'number' ? (
                    <span className="rounded-full border border-[#D7DCE4] bg-[#F8FAFC] px-2 py-1 font-medium text-[#334155]">Bat {item.battery_pct}%</span>
                  ) : null}
                  {item.is_promo ? (
                    <span className="rounded-full border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.08)] px-2 py-1 font-medium text-[#991B1B]">Promo</span>
                  ) : null}
                </div>

                <div className="mt-4">
                  <p className="text-[2.05rem] font-semibold leading-none text-[#0B4AA2]">{formatMoney(item.sale_price_ars)}</p>
                  <p className="mt-1 text-base text-[#64748B]">{formatMoney(item.sale_price_usd, 'USD')}</p>
                </div>

                <div className="mt-2 text-sm text-[#5B677A]">
                  <p>Ingreso: {formatDate(item.received_at ?? item.created_at)}</p>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button className="flex-1" onClick={() => openSaleModal(item)}>
                    Vender
                  </Button>
                  <Button className="flex-1" variant="secondary" onClick={() => openReserveModal(item)}>
                    Reservar/Señar
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {!stockQuery.error && !stockQuery.isLoading && totalCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E6EBF2] bg-white px-3 py-2">
          <p className="text-xs text-[#475569]">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={currentPage <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
              Anterior
            </Button>
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
        open={saleOpen}
        title="Vender equipo"
        subtitle={saleTarget ? `${saleTarget.model || 'Equipo'} · IMEI ${saleTarget.imei ?? '—'}` : undefined}
        onClose={() => {
          setSaleOpen(false)
          setSaleTarget(null)
        }}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setSaleOpen(false)
                setSaleTarget(null)
              }}
            >
              Cancelar
            </Button>
            <Button onClick={saleForm.handleSubmit(handleSubmitSale)} disabled={saleMutation.isPending}>
              {saleMutation.isPending ? 'Guardando...' : 'Guardar venta'}
            </Button>
          </>
        }
      >
        {saleTarget ? (
          <form className="space-y-4" onSubmit={saleForm.handleSubmit(handleSubmitSale)}>
            <section className="rounded-2xl border border-[#E6EBF2] bg-[#F8FAFC] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5B677A]">Equipo</p>
              <h3 className="mt-1 text-lg font-semibold text-[#0F172A]">{saleTarget.model || 'Equipo'} · IMEI {saleTarget.imei || '—'}</h3>
              <p className="mt-1 text-sm text-[#64748B]">Precio base: {formatMoney(saleTarget.sale_price_ars)}</p>
            </section>

            <section className="space-y-3 rounded-2xl border border-[#E6EBF2] bg-[#F8FAFC] p-4">
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#0F172A]">Datos Generales</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Fecha">
                  <Input placeholder="DD/MM/AAAA" inputMode="numeric" {...saleForm.register('sale_date')} />
                </Field>
                <Field label="Vendedor">
                  <Select {...saleForm.register('seller_id')}>
                    <option value="">Seleccionar vendedor</option>
                    {sellers.map((seller) => (
                      <option key={seller.id} value={seller.id}>
                        {seller.full_name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-[#E6EBF2] bg-[#F8FAFC] p-4">
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#0F172A]">Cliente</h3>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Nombre">
                  <Input {...saleForm.register('customer_name')} />
                </Field>
                <Field label="Teléfono">
                  <Input {...saleForm.register('customer_phone')} />
                </Field>
                <Field label="DNI (opcional)">
                  <Input {...saleForm.register('customer_dni')} />
                </Field>
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-[rgba(234,88,12,0.35)] bg-[rgba(234,88,12,0.06)] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#C2410C]">Plan Canje</h3>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-[#7C2D12]">
                  <input type="checkbox" {...saleForm.register('plan_canje_enabled')} />
                  Activar
                </label>
              </div>

              {watchedPlanCanjeEnabled ? (
                <div className="space-y-3">
                  <div className="space-y-3 rounded-xl border border-[#E6EBF2] bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5B677A]">Equipo a tomar</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Modelo">
                        <Input placeholder="Ej: iPhone 13 Pro" {...saleForm.register('trade_model')} />
                      </Field>
                      <Field label="IMEI (opcional)">
                        <Input placeholder="Opcional" {...saleForm.register('trade_imei')} />
                      </Field>
                      <Field label="GB">
                        <Input type="number" min={1} {...saleForm.register('trade_storage_gb')} />
                      </Field>
                      <Field label="Color">
                        <Input {...saleForm.register('trade_color')} />
                      </Field>
                      <Field label="Batería %">
                        <Input type="number" min={0} max={100} {...saleForm.register('trade_battery_pct')} />
                      </Field>
                      <Field label="Estado">
                        <Input placeholder="Ej: Usado" {...saleForm.register('trade_state')} />
                      </Field>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-xl border border-[#E6EBF2] bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5B677A]">Valorización</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Valor tomado (USD)">
                        <Input type="number" min={0} step="0.01" {...saleForm.register('trade_value_taken_usd')} />
                      </Field>
                      <Field label="Valor reventa (USD)">
                        <Input type="number" min={0} step="0.01" {...saleForm.register('trade_resale_usd')} />
                      </Field>
                    </div>
                  </div>

                  <label className="flex h-11 items-center gap-2 rounded-xl border border-[#E6EBF2] bg-white px-3 text-sm text-[#0F172A]">
                    <input type="checkbox" {...saleForm.register('trade_send_tech')} />
                    Enviar a técnico
                  </label>

                  <Field label="Observaciones adicionales">
                    <Input placeholder="Observaciones" {...saleForm.register('trade_notes')} />
                  </Field>
                </div>
              ) : null}
            </section>

            <section className="space-y-3 rounded-2xl border border-[#E6EBF2] bg-[#F8FAFC] p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#0F172A]">Pagos</h3>
                <Button type="button" size="sm" variant="secondary" onClick={addPayment}>
                  Agregar pago
                </Button>
              </div>

              {payments.map((payment, index) => (
                <div key={`payment-${index}`} className="space-y-3 rounded-xl border border-[#E6EBF2] bg-white p-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Método">
                      <Select value={payment.method} onChange={(event) => updatePayment(index, { method: event.target.value as SaleModalPayment['method'] })}>
                        <option value="cash">Efectivo</option>
                        <option value="transfer">Transferencia</option>
                        <option value="card">Tarjeta</option>
                        <option value="deposit">Seña</option>
                      </Select>
                    </Field>
                    <Field label="Moneda">
                      <Select value={payment.currency} onChange={(event) => updatePayment(index, { currency: event.target.value as 'ARS' | 'USD' })}>
                        <option value="ARS">ARS</option>
                        <option value="USD">USD</option>
                      </Select>
                    </Field>
                    <Field label="Monto">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={payment.amount == null ? '' : String(payment.amount)}
                        onChange={(event) => updatePayment(index, { amount: event.target.value as unknown as number })}
                      />
                    </Field>
                    {payment.method === 'card' ? (
                      <>
                        <Field label="Tarjeta">
                          <Input value={payment.card_brand ?? ''} onChange={(event) => updatePayment(index, { card_brand: event.target.value })} />
                        </Field>
                        <Field label="Cuotas">
                          <Input
                            type="number"
                            min={1}
                            value={payment.installments == null ? '' : String(payment.installments)}
                            onChange={(event) => updatePayment(index, { installments: asPositiveNumber(event.target.value) ?? null })}
                          />
                        </Field>
                        <Field label="Recargo %">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={payment.surcharge_pct == null ? '' : String(payment.surcharge_pct)}
                            onChange={(event) => updatePayment(index, { surcharge_pct: asPositiveNumber(event.target.value) ?? null })}
                          />
                        </Field>
                      </>
                    ) : null}
                  </div>

                  {payments.length > 1 ? (
                    <Button type="button" size="sm" variant="ghost" onClick={() => removePayment(index)}>
                      Quitar pago
                    </Button>
                  ) : null}
                </div>
              ))}

              <Field label="Dólar usado (si hay pagos USD)">
                <Input type="number" min={0} step="0.01" {...saleForm.register('fx_rate_used')} />
              </Field>
            </section>

            <section className="space-y-3 rounded-2xl border border-[#E6EBF2] bg-[#F8FAFC] p-4">
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#0F172A]">Detalle y Total</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Precio venta ARS">
                  <Input type="number" min={1} {...saleForm.register('sale_price_ars')} />
                </Field>
                <Field label="Incluye Cubo 20W">
                  <label className="flex h-11 items-center gap-2 rounded-xl border border-[#E6EBF2] bg-white px-3 text-sm text-[#0F172A]">
                    <input type="checkbox" {...saleForm.register('includes_cube_20w')} />
                    Sí, incluye cubo
                  </label>
                </Field>
              </div>

              <Field label="Detalle libre">
                <Input placeholder="Detalle de la venta" {...saleForm.register('details')} />
              </Field>

              <div className="rounded-xl border border-[#D7DCE4] bg-white p-3 text-sm text-[#334155]">
                <div className="flex items-center justify-between">
                  <span>Precio producto:</span>
                  <strong>{formatMoney(salePriceArs)}</strong>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span>Pagado:</span>
                  <strong>{formatMoney(paidArs)}</strong>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span>Saldo pendiente:</span>
                  <strong>{formatMoney(balanceDueArs)}</strong>
                </div>
              </div>
            </section>

            {Object.keys(saleForm.formState.errors).length > 0 ? (
              <div className="space-y-1 rounded-xl border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.06)] p-3 text-xs text-[#991B1B]">
                {saleForm.formState.errors.sale_date?.message ? <p>{saleForm.formState.errors.sale_date.message}</p> : null}
                {saleForm.formState.errors.customer_name?.message ? <p>{saleForm.formState.errors.customer_name.message}</p> : null}
                {saleForm.formState.errors.customer_phone?.message ? <p>{saleForm.formState.errors.customer_phone.message}</p> : null}
                {saleForm.formState.errors.sale_price_ars?.message ? <p>{saleForm.formState.errors.sale_price_ars.message}</p> : null}
                {saleForm.formState.errors.fx_rate_used?.message ? <p>{saleForm.formState.errors.fx_rate_used.message}</p> : null}
                {saleForm.formState.errors.trade_model?.message ? <p>{saleForm.formState.errors.trade_model.message}</p> : null}
                {saleForm.formState.errors.trade_value_taken_usd?.message ? <p>{saleForm.formState.errors.trade_value_taken_usd.message}</p> : null}
                {saleForm.formState.errors.payments?.root?.message ? <p>{saleForm.formState.errors.payments.root.message}</p> : null}
              </div>
            ) : null}
          </form>
        ) : null}
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
            <Button onClick={handleReserve} disabled={reserveMutation.isPending}>
              {reserveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Tipo">
            <Select value={reserveType} onChange={(event) => setReserveType(event.target.value as 'reserva' | 'sena')}>
              <option value="reserva">Reserva</option>
              <option value="sena">Seña</option>
            </Select>
          </Field>
          <Field label="Monto ARS (opcional)">
            <Input
              type="number"
              min={0}
              value={reserveAmountArs}
              onChange={(event) => setReserveAmountArs(event.target.value)}
            />
          </Field>
          <Field label="Observación">
            <Input value={reserveNotes} onChange={(event) => setReserveNotes(event.target.value)} placeholder="Fecha límite, faltante, etc." />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
