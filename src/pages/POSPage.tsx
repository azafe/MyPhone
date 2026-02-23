import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { fetchStockPage, isStockItemSoldOrLinked, reserveStockItem, resolveStockMutationErrorMessage } from '../services/stock'
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

export function POSPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [stateFilter, setStateFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [page, setPage] = useState(1)
  const [reserveOpen, setReserveOpen] = useState(false)
  const [reserveTarget, setReserveTarget] = useState<StockItem | null>(null)
  const [reserveType, setReserveType] = useState<'reserva' | 'sena'>('reserva')
  const [reserveAmountArs, setReserveAmountArs] = useState('')
  const [reserveNotes, setReserveNotes] = useState('')

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

  const fetchedStock = stockQuery.data?.items ?? EMPTY_STOCK_ITEMS

  const items = useMemo(() => fetchedStock.filter((item) => !isStockItemSoldOrLinked(item)), [fetchedStock])

  const totalCount = Number(stockQuery.data?.total ?? items.length)
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const totalArs = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.sale_price_ars ?? 0), 0),
    [items],
  )

  const openReserveModal = (item: StockItem) => {
    setReserveTarget(item)
    setReserveType('reserva')
    setReserveAmountArs('')
    setReserveNotes('')
    setReserveOpen(true)
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

  return (
    <div className="space-y-6 pb-24">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Punto de venta</h2>
        <p className="text-sm text-[#5B677A]">Buscá equipos de stock y vendé rápido desde mostrador.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex h-11 items-center rounded-xl bg-[#0B4AA2] px-4 text-sm font-semibold text-white"
        >
          Minorista
        </button>
        <button
          type="button"
          disabled
          className="inline-flex h-11 items-center rounded-xl border border-[#D7DCE4] bg-white px-4 text-sm font-semibold text-[#94A3B8]"
        >
          Mayorista
        </button>
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
          {items.length} equipos · {formatMoney(totalArs)}
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
                  <p className="text-4xl font-semibold leading-none text-[#0B4AA2]">{formatMoney(item.sale_price_ars)}</p>
                  <p className="mt-1 text-lg text-[#64748B]">{formatMoney(item.sale_price_usd, 'USD')}</p>
                </div>

                <div className="mt-2 text-sm text-[#5B677A]">
                  <p>Ingreso: {formatDate(item.received_at ?? item.created_at)}</p>
                  <p>Stock: 1</p>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button className="flex-1" onClick={() => navigate(`/sales/new?stock=${item.id}`)}>
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
