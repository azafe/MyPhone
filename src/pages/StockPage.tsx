import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { deleteStockItem, fetchStock, setStockStatus, upsertStockItem } from '../services/stock'
import type { StockItem } from '../types'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { cn } from '../lib/utils'
import { useNavigate } from 'react-router-dom'
import { IphoneModelSelector, IPHONE_MODELS } from '../components/ui/IphoneModelSelector'
import { createStockItemApi } from '../services/stockApi'
import { StockListItem } from '../components/stock/StockListItem'
import { StockItemDetailsModal } from '../components/stock/StockItemDetailsModal'

const isAppleBrand = (brand?: string | null) => (brand ?? '').trim().toLowerCase() === 'apple'

const schema = z
  .object({
    id: z.string().optional(),
    category: z.enum(['new', 'promotion', 'outlet', 'used_premium']),
    brand: z.string().min(1),
    model: z.string().optional(),
    iphone_model: z.string().optional(),
    model_other: z.string().optional(),
    storage_gb: z.coerce.number().optional(),
    color: z.string().optional(),
    color_other: z.string().optional(),
    imei: z.string().optional(),
    imei_later: z.boolean().default(false),
    condition: z.enum(['new', 'like_new', 'used', 'outlet']),
    battery_pct: z.coerce.number().min(0).max(100),
    purchase_usd: z.coerce.number().min(0.01),
    fx_rate_used: z.coerce.number().min(0.01),
    purchase_ars: z.coerce.number().min(0),
    sale_price_usd: z.coerce.number().min(0.01),
    sale_price_ars: z.coerce.number().min(0),
    warranty_days: z.coerce.number().min(0).max(3650),
    status: z.enum(['available', 'reserved', 'sold']).default('available'),
  })
  .superRefine((values, ctx) => {
    const isIphone = isAppleBrand(values.brand)
    if (isIphone) {
      if (!values.iphone_model) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Seleccioná un modelo de iPhone', path: ['iphone_model'] })
      }
      if (values.iphone_model === 'other' && !values.model_other) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Especificá el modelo', path: ['model_other'] })
      }
      if (!values.storage_gb) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Seleccioná la capacidad', path: ['storage_gb'] })
      }
      if (!values.color) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Seleccioná el color', path: ['color'] })
      }
      if (values.color === 'Otro' && !values.color_other) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Especificá el color', path: ['color_other'] })
      }
      if (!values.imei_later) {
        if (!values.imei) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El IMEI es requerido', path: ['imei'] })
        } else if (!/^\d{14,16}$/.test(values.imei)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'IMEI inválido (14-16 dígitos)', path: ['imei'] })
        }
      }
    } else {
      if (!values.model) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ingresá el modelo', path: ['model'] })
      }
    }

    if (values.condition === 'new' && values.battery_pct !== 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Batería debe ser 100%', path: ['battery_pct'] })
    }
  })

type FormValues = z.input<typeof schema>

const conditionLabels: Record<string, string> = {
  new: 'Nuevo',
  like_new: 'Como nuevo',
  used: 'Usado',
  outlet: 'Outlet',
}

export function StockPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ status: '', category: '', query: '', condition: '' })
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<StockItem | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const fxStorageKey = 'myphone_fx_rate'

  const { data = [], isLoading } = useQuery({
    queryKey: ['stock', filters],
    queryFn: () =>
      fetchStock({
        status: filters.status ? (filters.status as StockItem['status']) : undefined,
        category: filters.category || undefined,
        query: filters.query || undefined,
        condition: filters.condition || undefined,
      }),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'available',
      category: 'new',
      brand: '',
      condition: 'used',
      battery_pct: 85,
      warranty_days: 90,
      imei_later: false,
    },
  })

  const watched = form.watch([
    'purchase_usd',
    'fx_rate_used',
    'purchase_ars',
    'sale_price_usd',
    'sale_price_ars',
    'category',
    'condition',
  ]) as Array<number | string | null | undefined>

  const purchaseArs = useMemo(() => {
    const [purchaseUsd, fx, purchaseArsValue] = watched
    const computed = Number(purchaseUsd || 0) * Number(fx || 0)
    return Number(purchaseArsValue ?? computed)
  }, [watched])

  const saleArs = useMemo(() => {
    const saleUsd = Number(watched[3] || 0)
    const fx = Number(watched[1] || 0)
    const saleArsValue = Number(watched[4] || 0)
    const computed = saleUsd * fx
    return Number(saleArsValue ?? computed)
  }, [watched])

  const marginPct = useMemo(() => {
    const sale = Number(saleArs || 0)
    if (!sale) return 0
    return ((sale - Number(purchaseArs || 0)) / sale) * 100
  }, [purchaseArs, saleArs])

  const gainArs = useMemo(() => {
    return Number(saleArs || 0) - Number(purchaseArs || 0)
  }, [saleArs, purchaseArs])

  const category = form.watch('category')
  const brand = form.watch('brand')
  const condition = form.watch('condition') as FormValues['condition'] | undefined
  const conditionValue = (condition ?? 'used') as FormValues['condition']
  const isConditionNew = conditionValue === 'new'
  const imeiLater = form.watch('imei_later')
  const color = form.watch('color')
  const iphoneModel = form.watch('iphone_model')
  const fxRate = form.watch('fx_rate_used')

  useEffect(() => {
    if (isAppleBrand(brand) && !form.getValues('iphone_model')) {
      form.setValue('iphone_model', '', { shouldValidate: true })
    }
  }, [brand, form])

  useEffect(() => {
    if (category === 'new') {
      form.setValue('condition', 'new', { shouldValidate: true })
      return
    }
    if (category === 'used_premium') {
      form.setValue('condition', 'like_new', { shouldValidate: true })
      return
    }
    if (category === 'outlet') {
      form.setValue('condition', 'outlet', { shouldValidate: true })
      return
    }
  }, [category, form])

  useEffect(() => {
    if (iphoneModel && iphoneModel !== 'other') {
      form.setValue('model_other', '', { shouldValidate: true })
    }
  }, [iphoneModel, form])

  useEffect(() => {
    if (isConditionNew) {
      form.setValue('battery_pct', 100, { shouldValidate: true })
      return
    }
    if (!isConditionNew && form.getValues('battery_pct') === 100) {
      form.setValue('battery_pct', 85, { shouldValidate: true })
    }
  }, [isConditionNew, form])

  useEffect(() => {
    form.setValue('purchase_ars', Number(purchaseArs || 0), { shouldValidate: true })
  }, [purchaseArs, form])

  useEffect(() => {
    form.setValue('sale_price_ars', Number(saleArs || 0), { shouldValidate: true })
  }, [saleArs, form])

  useEffect(() => {
    if (open) {
      const storedFx = localStorage.getItem(fxStorageKey)
      if (storedFx && !form.getValues('fx_rate_used')) {
        form.setValue('fx_rate_used', Number(storedFx), { shouldValidate: true })
      }
    }
  }, [open, form, fxStorageKey])

  useEffect(() => {
    const fx = Number(fxRate || 0)
    if (fx > 0) {
      localStorage.setItem(fxStorageKey, String(fx))
    }
  }, [fxRate, fxStorageKey])

  const mutation = useMutation({
    mutationFn: upsertStockItem,
    onSuccess: () => {
      toast.success('Equipo guardado')
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      setOpen(false)
      form.reset({
        status: 'available',
        category: 'new',
        brand: '',
        condition: 'used',
        battery_pct: 85,
        warranty_days: 90,
        imei_later: false,
        fx_rate_used: form.getValues('fx_rate_used'),
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteStockItem,
    onSuccess: () => {
      toast.success('Equipo eliminado')
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      setConfirmDeleteOpen(false)
      setDetailsOpen(false)
      setSelected(null)
    },
    onError: (error) => {
      const err = error as Error & { code?: string; details?: unknown }
      toast.error(err.message || 'No se pudo eliminar el equipo')
      if (err.code) {
        console.error('deleteStockItem error', err.code, err.details)
      }
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StockItem['status'] }) => setStockStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock'] }),
  })

  const onSubmit = (values: FormValues) => {
    const parsed = schema.parse(values)
    const finalModel =
      isAppleBrand(parsed.brand)
        ? parsed.iphone_model === 'other'
          ? parsed.model_other ?? ''
          : parsed.iphone_model ?? ''
        : parsed.model ?? ''
    const imeiValue = parsed.imei_later ? null : parsed.imei ?? null
    const batteryValue = parsed.condition === 'new' ? 100 : parsed.battery_pct
    mutation.mutate({
      id: parsed.id,
      category: parsed.category,
      brand: parsed.brand,
      model: finalModel,
      condition: parsed.condition,
      imei: imeiValue,
      storage_gb: parsed.storage_gb,
      color: parsed.color,
      color_other: parsed.color_other,
      battery_pct: batteryValue,
      purchase_usd: parsed.purchase_usd,
      fx_rate_used: parsed.fx_rate_used,
      purchase_ars: Number(purchaseArs || 0),
      sale_price_usd: parsed.sale_price_usd,
      sale_price_ars: Number(saleArs || 0),
      warranty_days: parsed.warranty_days,
      status: parsed.status,
    })
  }

  const openDetails = (item: StockItem) => {
    setSelected(item)
    setDetailsOpen(true)
  }

  const openEdit = (item: StockItem) => {
    const modelMatch = IPHONE_MODELS.includes(item.model)
    form.reset({
      id: item.id,
      category: item.category as FormValues['category'],
      brand: item.brand,
      model: modelMatch ? undefined : item.model,
      iphone_model: modelMatch ? item.model : isAppleBrand(item.brand) ? 'other' : undefined,
      model_other: modelMatch ? undefined : item.model,
      storage_gb: (item as StockItem & { storage_gb?: number | null }).storage_gb ?? undefined,
      color: (item as StockItem & { color?: string | null }).color ?? undefined,
      color_other: (item as StockItem & { color_other?: string | null }).color_other ?? undefined,
      imei: item.imei ?? undefined,
      imei_later: false,
      condition: item.condition as FormValues['condition'],
      battery_pct: (item as StockItem & { battery_pct?: number | null }).battery_pct ?? 85,
      purchase_usd: item.purchase_usd,
      fx_rate_used: item.fx_rate_used,
      purchase_ars: item.purchase_ars,
      sale_price_usd: (item as StockItem & { sale_price_usd?: number | null }).sale_price_usd ?? undefined,
      sale_price_ars: item.sale_price_ars,
      warranty_days: item.warranty_days ?? 90,
      status: item.status,
    })
    setOpen(true)
    setDetailsOpen(false)
  }

  const handleAddNewEquipmentClick = async () => {
    setOpen(true)
    const payload = {
      category: 'new',
      brand: 'Apple',
      model: 'iPhone 15 Pro',
      condition: 'used',
      imei: null,
      purchase_usd: 500,
      fx_rate_used: Number(form.getValues('fx_rate_used') || 1000),
      purchase_ars: 500 * Number(form.getValues('fx_rate_used') || 1000),
      sale_price_usd: 650,
      sale_price_ars: 650 * Number(form.getValues('fx_rate_used') || 1000),
      warranty_days: 90,
      battery_pct: 85,
      storage_gb: 256,
      color: 'Negro',
    }
    try {
      if (import.meta.env.DEV) {
        await createStockItemApi(payload)
        toast.success('Ejemplo enviado al backend')
      } else {
        console.info('Ejemplo payload /api/stock-items', payload)
        toast.success('Ejemplo de payload en consola')
      }
    } catch (error) {
      const err = error as Error & { code?: string; details?: unknown }
      toast.error(err.message || 'Error en backend')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Stock</h2>
          <p className="text-sm text-[#5B677A]">Gestión rápida de equipos disponibles.</p>
        </div>
        <Button onClick={handleAddNewEquipmentClick}>Agregar nuevo equipo</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Input placeholder="Buscar marca, modelo o IMEI" value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} />
        <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">Estado</option>
          <option value="available">Disponible</option>
          <option value="reserved">Reservado</option>
          <option value="sold">Vendido</option>
        </Select>
        <Input placeholder="Categoría" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} />
        <Input placeholder="Condición" value={filters.condition} onChange={(e) => setFilters({ ...filters, condition: e.target.value })} />
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="rounded-2xl border border-[#E6EBF2] bg-white p-6 text-sm text-[#5B677A]">Cargando...</div>
        ) : data.length === 0 ? (
          <div className="rounded-2xl border border-[#E6EBF2] bg-white p-6 text-sm text-[#5B677A]">Sin equipos en stock.</div>
        ) : (
          data.map((item) => <StockListItem key={item.id} item={item} onClick={() => openDetails(item)} />)
        )}
      </div>

      <Modal
        open={open}
        title={form.watch('id') ? 'Editar equipo' : 'Nuevo equipo'}
        subtitle="Cargá los datos del equipo"
        onClose={() => setOpen(false)}
        actions={
          <>
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="stock-form" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar equipo'}
            </Button>
          </>
        }
      >
        <form id="stock-form" className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Datos del equipo</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Categoría">
                <Select {...form.register('category')}>
                  <option value="new">Nuevo</option>
                  <option value="promotion">Promoción</option>
                  <option value="outlet">Outlet</option>
                  <option value="used_premium">Usado Premium</option>
                </Select>
              </Field>
              <Field label="Marca">
                <>
                  <Input className="h-11" list="brand-suggestions" {...form.register('brand')} placeholder="Apple, Samsung, Xiaomi" />
                  <datalist id="brand-suggestions">
                    <option value="Apple" />
                    <option value="Samsung" />
                    <option value="Motorola" />
                    <option value="Xiaomi" />
                    <option value="Huawei" />
                    <option value="Google" />
                    <option value="OnePlus" />
                  </datalist>
                </>
              </Field>
              {isAppleBrand(brand) ? (
                <Field label="Modelo iPhone">
                  <Controller
                    name="iphone_model"
                    control={form.control}
                    render={({ field }) => (
                      <IphoneModelSelector
                        value={field.value ?? ''}
                        onChange={(value) => field.onChange(value)}
                        onOther={() => field.onChange('other')}
                      />
                    )}
                  />
                </Field>
              ) : (
                <Field label="Modelo">
                  <Input className="h-11" {...form.register('model')} placeholder="Galaxy S23, Moto G" />
                </Field>
              )}
              {isAppleBrand(brand) && iphoneModel === 'other' && (
                <Field label="Otro iPhone">
                  <Input className="h-11" {...form.register('model_other')} placeholder="iPhone 15 Ultra" />
                </Field>
              )}
              <Field label="Capacidad (GB)">
                <Select {...form.register('storage_gb')}>
                  <option value="">Seleccionar</option>
                  <option value="64">64</option>
                  <option value="128">128</option>
                  <option value="256">256</option>
                  <option value="512">512</option>
                  <option value="1024">1024</option>
                </Select>
              </Field>
              <Field label="Condición">
                {category === 'promotion' ? (
                  <Select {...form.register('condition')}>
                    <option value="new">Nuevo</option>
                    <option value="like_new">Como nuevo</option>
                    <option value="used">Usado</option>
                    <option value="outlet">Outlet</option>
                  </Select>
                ) : (
                  <Input className="h-11" value={conditionLabels[conditionValue]} readOnly />
                )}
              </Field>
              <Field label="Batería (%)">
                <Input className="h-11" type="number" min={0} max={100} {...form.register('battery_pct')} disabled={isConditionNew} />
              </Field>
              <Field label="Color">
                <Select {...form.register('color')}>
                  <option value="">Seleccionar</option>
                  <option value="Negro">Negro</option>
                  <option value="Blanco">Blanco</option>
                  <option value="Azul">Azul</option>
                  <option value="Rojo">Rojo</option>
                  <option value="Verde">Verde</option>
                  <option value="Gris">Gris</option>
                  <option value="Titanio">Titanio</option>
                  <option value="Gold">Gold</option>
                  <option value="Purple">Purple</option>
                  <option value="Pink">Pink</option>
                  <option value="Starlight">Starlight</option>
                  <option value="Midnight">Midnight</option>
                  <option value="Otro">Otro</option>
                </Select>
              </Field>
              {color === 'Otro' && (
                <Field label="Especificar color">
                  <Input className="h-11" {...form.register('color_other')} placeholder="Ej: Azul oscuro" />
                </Field>
              )}
              <Field label="Garantía (días)">
                <Input className="h-11" type="number" {...form.register('warranty_days')} />
                <div className="mt-2 flex gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => form.setValue('warranty_days', 30)}>
                    30
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => form.setValue('warranty_days', 90)}>
                    90
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => form.setValue('warranty_days', 180)}>
                    180
                  </Button>
                </div>
              </Field>
              <div className="md:col-span-2">
                <Field label="IMEI (opcional)">
                  <Input className="h-11" {...form.register('imei')} placeholder="14–16 dígitos" disabled={imeiLater} />
                  {isAppleBrand(brand) && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-[#5B677A]">
                      <input type="checkbox" {...form.register('imei_later')} />
                      Cargar después (se requiere antes de vender)
                    </div>
                  )}
                  {isAppleBrand(brand) && imeiLater && (
                    <div className="mt-2 text-xs text-[#92400E]">Atención: el IMEI es obligatorio para vender.</div>
                  )}
                </Field>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Costos y precio</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Costo USD">
                <Input className="h-11" type="number" step="0.01" {...form.register('purchase_usd')} />
              </Field>
              <Field label="Tipo de cambio (ARS/USD)">
                <Input className="h-11" type="number" step="0.01" {...form.register('fx_rate_used')} />
              </Field>
              <Field label="Costo ARS">
                <Input
                  className="h-11"
                  type="number"
                  step="0.01"
                  value={purchaseArs ? purchaseArs.toFixed(0) : ''}
                  readOnly
                  disabled
                />
                <div className="mt-1.5 text-xs text-[#5B677A]">Auto: USD × TC</div>
              </Field>
              <Field label="Precio de venta sugerido (USD)">
                <Input className="h-11" type="number" step="0.01" {...form.register('sale_price_usd')} />
              </Field>
              <Field label="Precio de venta ARS">
                <Input
                  className="h-11"
                  type="number"
                  step="0.01"
                  value={saleArs ? saleArs.toFixed(0) : ''}
                  readOnly
                  disabled
                />
                <div className="mt-1.5 text-xs text-[#5B677A]">Auto: USD × TC</div>
              </Field>
              <div className="md:col-span-2">
                <div
                  className={cn(
                    'rounded-xl px-3 py-3 text-xs font-medium',
                    !purchaseArs || !saleArs
                      ? 'bg-[#F8FAFC] text-[#5B677A]'
                      : marginPct < 0
                      ? 'bg-[rgba(220,38,38,0.12)] text-[#991B1B]'
                      : marginPct < 10
                      ? 'bg-[rgba(245,158,11,0.14)] text-[#92400E]'
                      : 'bg-[rgba(22,163,74,0.12)] text-[#166534]',
                  )}
                >
                  <div>Margen estimado: {purchaseArs && saleArs ? `${marginPct.toFixed(1)}%` : '—'}</div>
                  <div className="mt-1 text-[11px] text-[#5B677A]">
                    Ganancia estimada: {purchaseArs && saleArs ? `ARS $${gainArs.toLocaleString('es-AR')}` : '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <input type="hidden" {...form.register('purchase_ars')} />
          <input type="hidden" {...form.register('sale_price_ars')} />
        </form>
      </Modal>

      <StockItemDetailsModal
        open={detailsOpen}
        item={selected}
        onClose={() => setDetailsOpen(false)}
        onEdit={() => selected && openEdit(selected)}
        onDelete={() => setConfirmDeleteOpen(true)}
        onReserve={() =>
          selected &&
          statusMutation.mutate({
            id: selected.id,
            status: 'reserved',
          })
        }
        onRelease={() =>
          selected &&
          statusMutation.mutate({
            id: selected.id,
            status: 'available',
          })
        }
        onSell={() => selected && navigate(`/sales/new?stock=${selected.id}`)}
      />

      <Modal
        open={confirmDeleteOpen}
        title="Eliminar equipo"
        onClose={() => setConfirmDeleteOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => selected && deleteMutation.mutate(selected.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-[#5B677A]">¿Eliminar este equipo? Esta acción no se puede deshacer.</p>
      </Modal>
    </div>
  )
}
