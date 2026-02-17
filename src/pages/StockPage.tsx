import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { createStockItem, fetchStock, reserveStockItem, setStockPromo, setStockState } from '../services/stock'
import type { StockItem, StockState } from '../types'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Select } from '../components/ui/Select'
import { Table } from '../components/ui/Table'

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

export function StockPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [stateFilter, setStateFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [storageFilter, setStorageFilter] = useState('')
  const [batteryFilter, setBatteryFilter] = useState('')
  const [promoFilter, setPromoFilter] = useState<'all' | 'promo' | 'no_promo'>('all')
  const [providerFilter, setProviderFilter] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [newOpen, setNewOpen] = useState(false)
  const [reserveOpen, setReserveOpen] = useState(false)
  const [reserveTarget, setReserveTarget] = useState<StockItem | null>(null)

  const stockQuery = useQuery({
    queryKey: ['stock', stateFilter, modelFilter, storageFilter, batteryFilter, promoFilter, providerFilter],
    queryFn: () =>
      fetchStock({
        state: stateFilter || undefined,
        model: modelFilter || undefined,
        storage_gb: storageFilter ? Number(storageFilter) : undefined,
        battery_min: batteryFilter ? Number(batteryFilter) : undefined,
        promo: promoFilter === 'all' ? undefined : promoFilter === 'promo',
        provider: providerFilter || undefined,
      }),
  })

  const stockItems = stockQuery.data ?? []

  const stockAfterBaseFilters = useMemo(() => {
    return stockItems.filter((item) => {
      if (modelFilter && !String(item.model ?? '').toLowerCase().includes(modelFilter.toLowerCase())) return false
      if (providerFilter && !String(item.provider_name ?? '').toLowerCase().includes(providerFilter.toLowerCase())) return false
      if (storageFilter && Number(item.storage_gb ?? 0) !== Number(storageFilter)) return false
      if (batteryFilter && Number(item.battery_pct ?? 0) < Number(batteryFilter)) return false
      if (promoFilter === 'promo' && !item.is_promo) return false
      if (promoFilter === 'no_promo' && item.is_promo) return false
      return true
    })
  }, [batteryFilter, modelFilter, promoFilter, providerFilter, stockItems, storageFilter])

  const filteredStock = useMemo(() => {
    if (!stateFilter) return stockAfterBaseFilters
    return stockAfterBaseFilters.filter((item) => resolveState(item) === stateFilter)
  }, [stateFilter, stockAfterBaseFilters])

  const countsByState = useMemo(() => {
    const entries = stateOptions.map((option) => [option.value, 0] as const)
    const initial = Object.fromEntries(entries) as Record<StockState, number>
    stockAfterBaseFilters.forEach((item) => {
      initial[resolveState(item)] += 1
    })
    return initial
  }, [stockAfterBaseFilters])

  const sortedStock = useMemo(() => {
    return [...filteredStock].sort((a, b) => {
      const aDate = new Date(a.received_at ?? a.created_at ?? 0).getTime()
      const bDate = new Date(b.received_at ?? b.created_at ?? 0).getTime()
      return bDate - aDate
    })
  }, [filteredStock])

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

  const stateMutation = useMutation({
    mutationFn: ({ id, state }: { id: string; state: StockState }) => setStockState(id, state, { status: state }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      toast.success('Estado actualizado')
    },
    onError: (error) => {
      const err = error as Error
      toast.error(err.message || 'No se pudo cambiar estado')
    },
  })

  const promoMutation = useMutation({
    mutationFn: ({ id, isPromo }: { id: string; isPromo: boolean }) => setStockPromo(id, isPromo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] })
    },
    onError: (error) => {
      const err = error as Error
      toast.error(err.message || 'No se pudo actualizar promo')
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
      const err = error as Error
      toast.error(err.message || 'No se pudo reservar/señar')
    },
  })

  const handleCreate = (values: unknown) => {
    const parsed = createSchema.parse(values)
    const duplicatedImei = stockItems.some(
      (item) => String(item.imei ?? '').trim() !== '' && String(item.imei).trim() === parsed.imei.trim(),
    )

    if (duplicatedImei) {
      toast.error('IMEI duplicado. Debe ser único.')
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
      imei: parsed.imei.trim(),
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

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Stock</h2>
          <p className="text-sm text-[#5B677A]">Vista operativa por estado, precio, proveedor e IMEI.</p>
        </div>
        <Button onClick={() => setNewOpen(true)}>Nuevo equipo</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-6">
        <Select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
          <option value="">Estado (todos)</option>
          {stateOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Input placeholder="Modelo" value={modelFilter} onChange={(event) => setModelFilter(event.target.value)} />
        <Input
          type="number"
          min={1}
          placeholder="GB"
          value={storageFilter}
          onChange={(event) => setStorageFilter(event.target.value)}
        />
        <Input
          type="number"
          min={0}
          max={100}
          placeholder="Batería mínima"
          value={batteryFilter}
          onChange={(event) => setBatteryFilter(event.target.value)}
        />
        <Select value={promoFilter} onChange={(event) => setPromoFilter(event.target.value as 'all' | 'promo' | 'no_promo')}>
          <option value="all">Promo: todos</option>
          <option value="promo">Solo promo</option>
          <option value="no_promo">Sin promo</option>
        </Select>
        <Input placeholder="Proveedor" value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">
          {filteredStock.length} equipos
        </p>
        <div className="inline-flex rounded-xl border border-[#E6EBF2] bg-white p-1">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`rounded-lg px-3 py-1 text-xs font-semibold ${
              viewMode === 'cards' ? 'bg-[#0B4AA2] text-white' : 'text-[#475569]'
            }`}
          >
            Tarjetas
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`rounded-lg px-3 py-1 text-xs font-semibold ${
              viewMode === 'table' ? 'bg-[#0B4AA2] text-white' : 'text-[#475569]'
            }`}
          >
            Tabla
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <Table
          headers={[
            'Estado',
            'Modelo',
            'GB',
            'Batería',
            'Color',
            'Precio',
            'Detalles',
            'IMEI',
            'Ingreso',
            'Proveedor',
            'Promo',
            'Días',
            'Acciones',
          ]}
        >
          {stockQuery.error ? (
            <tr>
              <td className="px-4 py-6 text-sm text-[#B91C1C]" colSpan={13}>
                No se pudo cargar stock: {(stockQuery.error as Error).message}
              </td>
            </tr>
          ) : stockQuery.isLoading ? (
            <tr>
              <td className="px-4 py-6 text-sm text-[#5B677A]" colSpan={13}>
                Cargando stock...
              </td>
            </tr>
          ) : filteredStock.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-sm text-[#5B677A]" colSpan={13}>
                Sin registros para los filtros actuales.
              </td>
            </tr>
          ) : (
            filteredStock.map((item) => {
              const rowState = resolveState(item)
              return (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm">
                    <Select
                      className="h-9"
                      value={rowState}
                      onChange={(event) => stateMutation.mutate({ id: item.id, state: event.target.value as StockState })}
                    >
                      {stateOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-[#0F172A]">{item.model || '—'}</td>
                  <td className="px-4 py-3 text-sm">{item.storage_gb ?? '—'}</td>
                  <td className="px-4 py-3 text-sm">{typeof item.battery_pct === 'number' ? `${item.battery_pct}%` : '—'}</td>
                  <td className="px-4 py-3 text-sm">{item.color || '—'}</td>
                  <td className="px-4 py-3 text-sm">{formatMoney(item.sale_price_ars)}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-sm" title={item.details ?? ''}>
                    {item.details || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm">{item.imei || '—'}</td>
                  <td className="px-4 py-3 text-sm">{formatDate(item.received_at ?? item.created_at)}</td>
                  <td className="px-4 py-3 text-sm">{item.provider_name || '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      type="button"
                      onClick={() => promoMutation.mutate({ id: item.id, isPromo: !Boolean(item.is_promo) })}
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        item.is_promo ? 'bg-[rgba(220,38,38,0.12)] text-[#991B1B]' : 'bg-[#EEF2F7] text-[#475569]'
                      }`}
                    >
                      {item.is_promo ? 'Sí' : 'No'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm">{item.days_in_stock ?? '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => navigate(`/sales/new?stock=${item.id}`)}>
                        Vender
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => openReserveModal(item)}>
                        Reservar/Señar
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </Table>
      ) : stockQuery.error ? (
        <div className="rounded-2xl border border-[rgba(185,28,28,0.2)] bg-[rgba(185,28,28,0.08)] px-4 py-6 text-sm text-[#B91C1C]">
          No se pudo cargar stock: {(stockQuery.error as Error).message}
        </div>
      ) : stockQuery.isLoading ? (
        <div className="rounded-2xl border border-[#E6EBF2] bg-white px-4 py-6 text-sm text-[#5B677A]">
          Cargando stock...
        </div>
      ) : filteredStock.length === 0 ? (
        <div className="rounded-2xl border border-[#E6EBF2] bg-white px-4 py-6 text-sm text-[#5B677A]">
          Sin registros para los filtros actuales.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#E6EBF2] bg-white p-3">
            <div className="flex flex-wrap gap-2">
              {stateOptions.map((option) => {
                const isActive = stateFilter === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStateFilter(isActive ? '' : option.value)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? 'border-[#0B4AA2] bg-[rgba(11,74,162,0.1)] text-[#0B4AA2]'
                        : 'border-[#E6EBF2] bg-[#F8FAFC] text-[#334155] hover:border-[#CBD5E1]'
                    }`}
                  >
                    {option.label}
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-[#334155]">
                      {countsByState[option.value]}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {sortedStock.map((item) => {
              const itemState = resolveState(item)
              return (
                <article key={item.id} className="rounded-2xl border border-[#E6EBF2] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${stateBadgeClass[itemState]}`}>
                      {stateLabelMap[itemState]}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="rounded-full bg-[#EEF2F7] px-2 py-0.5 text-[11px] font-semibold text-[#334155]">
                        {item.days_in_stock ?? '—'} días
                      </span>
                      {item.is_promo ? (
                        <span className="rounded-full bg-[rgba(220,38,38,0.12)] px-2 py-0.5 text-[11px] font-semibold text-[#991B1B]">
                          Promo
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-2">
                    <h4 className="text-base font-semibold leading-tight text-[#0F172A]">{item.model || 'Equipo sin modelo'}</h4>
                    <p className="text-xs text-[#64748B]">IMEI {item.imei || '—'}</p>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#475569]">
                    <span className="rounded-full bg-[#F8FAFC] px-2 py-1">{item.storage_gb ?? '—'} GB</span>
                    <span className="rounded-full bg-[#F8FAFC] px-2 py-1">
                      Bat {typeof item.battery_pct === 'number' ? `${item.battery_pct}%` : '—'}
                    </span>
                    <span className="rounded-full bg-[#F8FAFC] px-2 py-1">{item.color || 'Sin color'}</span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#334155]">
                    <div className="rounded-lg bg-[#F8FAFC] p-2">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-[#64748B]">Precio</p>
                      <p className="text-sm font-semibold text-[#0F172A]">{formatMoney(item.sale_price_ars)}</p>
                    </div>
                    <div className="rounded-lg bg-[#F8FAFC] p-2">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-[#64748B]">Proveedor</p>
                      <p className="truncate text-sm font-medium text-[#0F172A]">{item.provider_name || '—'}</p>
                    </div>
                    <div className="col-span-2 rounded-lg bg-[#F8FAFC] p-2">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-[#64748B]">Ingreso</p>
                      <p className="text-sm font-medium text-[#0F172A]">{formatDate(item.received_at ?? item.created_at)}</p>
                    </div>
                    {item.details ? (
                      <div className="col-span-2 rounded-lg border border-[#E6EBF2] p-2 text-xs text-[#475569]">{item.details}</div>
                    ) : null}
                  </div>

                  <div className="mt-3 space-y-2">
                    <Select
                      className="h-9 text-xs"
                      value={itemState}
                      onChange={(event) => stateMutation.mutate({ id: item.id, state: event.target.value as StockState })}
                    >
                      {stateOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>

                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" onClick={() => navigate(`/sales/new?stock=${item.id}`)}>
                        Vender
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => openReserveModal(item)}>
                        Reservar/Señar
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full"
                      onClick={() => promoMutation.mutate({ id: item.id, isPromo: !Boolean(item.is_promo) })}
                    >
                      {item.is_promo ? 'Quitar promo' : 'Marcar promo'}
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}

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
        <form className="grid gap-3 md:grid-cols-2" onSubmit={newForm.handleSubmit(handleCreate)}>
          <Field label="Estado">
            <Select {...newForm.register('state')}>
              {stateOptions.filter((option) => option.value !== 'sold').map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Modelo">
            <Input {...newForm.register('model')} placeholder="iPhone 13" />
          </Field>
          <Field label="GB">
            <Input type="number" min={1} {...newForm.register('storage_gb')} />
          </Field>
          <Field label="Batería %">
            <Input type="number" min={0} max={100} {...newForm.register('battery_pct')} />
          </Field>
          <Field label="Color">
            <Input {...newForm.register('color')} />
          </Field>
          <Field label="Precio ARS">
            <Input type="number" min={1} {...newForm.register('sale_price_ars')} />
          </Field>
          <Field label="IMEI">
            <Input {...newForm.register('imei')} />
          </Field>
          <Field label="Fecha ingreso">
            <Input type="date" {...newForm.register('received_at')} />
          </Field>
          <Field label="Proveedor">
            <Input {...newForm.register('provider_name')} />
          </Field>
          <Field label="Promo">
            <label className="flex h-11 items-center gap-2 rounded-xl border border-[#E6EBF2] px-3 text-sm text-[#0F172A]">
              <input type="checkbox" {...newForm.register('is_promo')} />
              Marcar promoción
            </label>
          </Field>
          <div className="md:col-span-2">
            <Field label="Detalles">
              <Input {...newForm.register('details')} placeholder="Detalle estético, faltante, etc." />
            </Field>
          </div>
          {Object.keys(newForm.formState.errors).length > 0 && (
            <div className="md:col-span-2 space-y-1 rounded-xl border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.06)] p-3 text-xs text-[#991B1B]">
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
              value={reserveForm.watch('reserve_amount_ars') == null ? '' : String(reserveForm.watch('reserve_amount_ars'))}
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
