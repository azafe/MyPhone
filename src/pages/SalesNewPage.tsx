import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchStock } from '../services/stock'
import { createSale, type CreateSalePayload } from '../services/sales'
import { fetchInstallmentRules } from '../services/installments'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card } from '../components/ui/Card'

const saleItemSchema = z.object({
  stock_item_id: z.string().min(1, 'Seleccioná un equipo'),
  sale_price_ars: z.coerce.number().min(0.01, 'Ingresá un precio mayor a 0'),
})

const schema = z
  .object({
    customer_name: z.string().min(1, 'Ingresá el nombre del cliente'),
    customer_phone: z.string().min(1, 'Ingresá el teléfono del cliente'),
    currency: z.enum(['ARS', 'USD']).default('ARS'),
    fx_rate_used: z.coerce.number().optional().nullable(),
    method: z.enum(['cash', 'transfer', 'card', 'mixed', 'trade_in']),
    card_brand: z.string().optional().nullable(),
    installments: z.coerce.number().optional().nullable(),
    surcharge_pct: z.coerce.number().optional().nullable(),
    deposit_ars: z.coerce.number().optional().nullable(),
    balance_due_ars: z.coerce.number().optional().nullable(),
    includes_cube_20w: z.boolean().default(false),
    notes: z.string().optional(),
    trade_in_enabled: z.boolean().default(false),
    trade_brand: z.string().optional(),
    trade_model: z.string().optional(),
    trade_storage: z.string().optional(),
    trade_color: z.string().optional(),
    trade_condition: z.string().optional(),
    trade_imei: z.string().optional(),
    trade_value_usd: z.coerce.number().optional().nullable(),
    trade_fx_rate: z.coerce.number().optional().nullable(),
    trade_value_ars: z.coerce.number().optional().nullable(),
    items: z.array(saleItemSchema).min(1, 'Agregá al menos un ítem'),
  })
  .superRefine((values, ctx) => {
    if ((values.method === 'card' || values.method === 'mixed') && !values.card_brand?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ingresá la tarjeta',
        path: ['card_brand'],
      })
    }

    if (values.currency === 'USD' && (!values.fx_rate_used || values.fx_rate_used <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ingresá tipo de cambio para ventas en USD',
        path: ['fx_rate_used'],
      })
    }

    const seen = new Set<string>()
    values.items.forEach((item, index) => {
      if (!item.stock_item_id) return
      if (seen.has(item.stock_item_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Este equipo ya está agregado',
          path: ['items', index, 'stock_item_id'],
        })
        return
      }
      seen.add(item.stock_item_id)
    })
  })

type FormValues = z.input<typeof schema>

export function SalesNewPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const preselected = params.get('stock') ?? ''
  const [openSections, setOpenSections] = useState({
    stock: true,
    customer: true,
    payment: true,
    tradein: true,
  })

  const { data: stock = [] } = useQuery({
    queryKey: ['stock', 'available_reserved'],
    queryFn: () => fetchStock({ statuses: ['available', 'reserved'] }),
  })

  const { data: rules = [] } = useQuery({
    queryKey: ['installment_rules'],
    queryFn: fetchInstallmentRules,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: 'ARS',
      method: 'cash',
      fx_rate_used: null,
      balance_due_ars: null,
      includes_cube_20w: false,
      notes: '',
      trade_in_enabled: false,
      items: [{ stock_item_id: preselected, sale_price_ars: 0 }],
    },
  })

  const items = form.watch('items')
  const watchMethod = form.watch('method')
  const currency = form.watch('currency')
  const fxRateUsed = form.watch('fx_rate_used') ?? 0
  const tradeEnabled = form.watch('trade_in_enabled')
  const tradeUsd = form.watch('trade_value_usd') ?? 0
  const tradeFx = form.watch('trade_fx_rate') ?? 0
  const cardBrand = form.watch('card_brand')
  const installments = form.watch('installments')

  const stockById = useMemo(() => {
    const map = new Map<string, (typeof stock)[number]>()
    stock.forEach((item) => map.set(item.id, item))
    return map
  }, [stock])

  const tradeArs = useMemo(() => Number(tradeUsd) * Number(tradeFx), [tradeUsd, tradeFx])

  const surcharge = useMemo(() => {
    if (!cardBrand || !installments) return 0
    const rule = rules.find((r) => r.card_brand === cardBrand && r.installments === Number(installments))
    return rule?.surcharge_pct ?? 0
  }, [rules, cardBrand, installments])

  const lineSubtotals = useMemo(
    () =>
      items.map((item) => {
        const price = Number(item?.sale_price_ars || 0)
        return price > 0 ? price : 0
      }),
    [items],
  )

  const totalArs = useMemo(() => lineSubtotals.reduce((acc, subtotal) => acc + subtotal, 0), [lineSubtotals])
  const totalUsd = useMemo(() => {
    if (currency !== 'USD') return null
    const fx = Number(fxRateUsed || 0)
    if (!fx || fx <= 0) return null
    return totalArs / fx
  }, [currency, fxRateUsed, totalArs])

  useEffect(() => {
    if (!preselected) return
    const current = form.getValues('items.0.stock_item_id')
    if (current) return
    const selectedStock = stock.find((item) => item.id === preselected)
    if (!selectedStock) return
    form.setValue('items.0.stock_item_id', preselected, { shouldValidate: true, shouldDirty: true })
    form.setValue('items.0.sale_price_ars', Number(selectedStock.sale_price_ars || 0), {
      shouldValidate: true,
      shouldDirty: true,
    })
  }, [preselected, stock, form])

  const mutation = useMutation({
    mutationFn: createSale,
    onSuccess: () => {
      toast.success('Venta registrada')
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['tradeins'] })
      queryClient.invalidateQueries({ queryKey: ['warranties'] })
      navigate('/sales')
    },
    onError: () => toast.error('No se pudo guardar la venta'),
  })

  const addItem = () => {
    form.setValue(
      'items',
      [...items, { stock_item_id: '', sale_price_ars: 0 }],
      { shouldDirty: true, shouldValidate: true },
    )
  }

  const removeItem = (index: number) => {
    if (items.length === 1) {
      toast.error('La venta debe tener al menos un ítem')
      return
    }
    form.setValue(
      'items',
      items.filter((_, currentIndex) => currentIndex !== index),
      { shouldDirty: true, shouldValidate: true },
    )
  }

  const updateItem = (index: number, next: Partial<FormValues['items'][number]>) => {
    const nextItems = [...items]
    nextItems[index] = { ...nextItems[index], ...next }
    form.setValue('items', nextItems, { shouldDirty: true, shouldValidate: true })
  }

  const handleSelectItem = (index: number, stockItemId: string) => {
    const duplicateIndex = items.findIndex(
      (item, currentIndex) => currentIndex !== index && item.stock_item_id === stockItemId,
    )

    if (stockItemId && duplicateIndex >= 0) {
      toast.error('Ese equipo ya está agregado')
      return
    }

    const selectedStock = stockById.get(stockItemId)
    updateItem(index, {
      stock_item_id: stockItemId,
      sale_price_ars: Number(selectedStock?.sale_price_ars || 0),
    })
  }

  const onSubmit = (values: FormValues) => {
    if (mutation.isPending) return

    const parsed = schema.parse(values)

    const itemsPayload = parsed.items.map((item) => ({
      stock_item_id: item.stock_item_id,
      qty: 1,
      sale_price_ars: Number(item.sale_price_ars),
    }))

    const calculatedTotal = itemsPayload.reduce((acc, item) => acc + item.sale_price_ars, 0)

    if (calculatedTotal <= 0) {
      toast.error('El total debe ser mayor a cero')
      return
    }

    const payload: CreateSalePayload = {
      sale_date: new Date().toISOString(),
      customer: {
        name: parsed.customer_name,
        phone: parsed.customer_phone,
      },
      payment_method: parsed.method,
      currency: parsed.currency,
      fx_rate_used: parsed.currency === 'USD' ? parsed.fx_rate_used ?? null : null,
      total_usd: parsed.currency === 'USD' ? (totalUsd ?? null) : null,
      card_brand: parsed.card_brand || null,
      installments: parsed.installments ?? null,
      surcharge_pct: parsed.surcharge_pct ?? surcharge,
      deposit_ars: parsed.deposit_ars ?? null,
      balance_due_ars: parsed.balance_due_ars ?? null,
      notes: parsed.notes?.trim() || null,
      includes_cube_20w: parsed.includes_cube_20w,
      total_ars: calculatedTotal,
      items: itemsPayload,
      payment: {
        method: parsed.method,
        card_brand: parsed.card_brand || null,
        installments: parsed.installments ?? null,
        surcharge_pct: parsed.surcharge_pct ?? surcharge,
        total_ars: calculatedTotal,
        deposit_ars: parsed.deposit_ars ?? null,
      },
      trade_in: parsed.trade_in_enabled
        ? {
            enabled: true,
            device: {
              brand: parsed.trade_brand ?? '',
              model: parsed.trade_model ?? '',
              storage_gb: parsed.trade_storage ? Number(parsed.trade_storage) : undefined,
              color: parsed.trade_color,
              condition: parsed.trade_condition,
              imei: parsed.trade_imei,
            },
            trade_value_usd: parsed.trade_value_usd ?? 0,
            fx_rate_used: parsed.trade_fx_rate ?? 0,
          }
        : undefined,
    }

    mutation.mutate(payload)
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Nueva venta</h2>
        <p className="text-sm text-[#5B677A]">Cargá cliente, ítems y pago en pasos simples.</p>
      </div>

      <Card className="p-5">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setOpenSections((prev) => ({ ...prev, stock: !prev.stock }))}
        >
          <h3 className="text-lg font-semibold text-[#0F172A]">1. Ítems de venta</h3>
          <span className="text-xs text-[#5B677A]">{openSections.stock ? 'Ocultar' : 'Mostrar'}</span>
        </button>

        {openSections.stock && (
          <div className="mt-4 space-y-3">
            {items.map((item, index) => {
              const selectedStock = stockById.get(item.stock_item_id)
              const itemErrors = form.formState.errors.items?.[index]

              return (
                <div key={`${item.stock_item_id || 'new'}-${index}`} className="rounded-xl border border-[#E6EBF2] bg-[#F8FAFC] p-3">
                  <div className="grid gap-3 md:grid-cols-[2fr_180px_120px_auto] md:items-end">
                    <Field label={`Equipo #${index + 1}`}>
                      <Select
                        value={item.stock_item_id}
                        onChange={(event) => handleSelectItem(index, event.target.value)}
                      >
                        <option value="">Seleccionar equipo</option>
                        {stock.map((stockItem) => (
                          <option key={stockItem.id} value={stockItem.id}>
                            {stockItem.brand} {stockItem.model} - {stockItem.imei ?? 'Sin IMEI'} - ${' '}
                            {stockItem.sale_price_ars?.toLocaleString('es-AR') ?? '—'}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field label="Precio ARS">
                      <Input
                        type="number"
                        min={1}
                        value={Number(item.sale_price_ars ?? 0)}
                        onChange={(event) => updateItem(index, { sale_price_ars: Number(event.target.value) || 0 })}
                      />
                    </Field>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Subtotal</p>
                      <p className="mt-2 text-sm font-semibold text-[#0F172A]">
                        ${lineSubtotals[index]?.toLocaleString('es-AR') ?? '0'}
                      </p>
                    </div>

                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                    >
                      Quitar
                    </Button>
                  </div>

                  {selectedStock && (
                    <p className="mt-2 text-xs text-[#5B677A]">
                      {selectedStock.brand} {selectedStock.model} · IMEI {selectedStock.imei ?? '—'}
                    </p>
                  )}

                  {(itemErrors?.stock_item_id || itemErrors?.sale_price_ars) && (
                    <div className="mt-2 space-y-1 text-xs text-[#DC2626]">
                      {itemErrors.stock_item_id?.message && <p>{itemErrors.stock_item_id.message}</p>}
                      {itemErrors.sale_price_ars?.message && <p>{itemErrors.sale_price_ars.message}</p>}
                    </div>
                  )}
                </div>
              )
            })}

            {form.formState.errors.items?.message && (
              <p className="text-xs text-[#DC2626]">{form.formState.errors.items.message}</p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E6EBF2] bg-white px-4 py-3">
              <Button type="button" variant="secondary" onClick={addItem}>
                Agregar ítem
              </Button>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Total general</p>
                <p className="mt-1 text-lg font-semibold text-[#0F172A]">${totalArs.toLocaleString('es-AR')}</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setOpenSections((prev) => ({ ...prev, customer: !prev.customer }))}
        >
          <h3 className="text-lg font-semibold text-[#0F172A]">2. Cliente</h3>
          <span className="text-xs text-[#5B677A]">{openSections.customer ? 'Ocultar' : 'Mostrar'}</span>
        </button>
        {openSections.customer && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Nombre">
              <Input {...form.register('customer_name')} placeholder="Cliente" />
            </Field>
            <Field label="Teléfono">
              <Input {...form.register('customer_phone')} placeholder="11 1234-5678" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Observaciones">
                <Input {...form.register('notes')} placeholder="Detalle de venta, faltante de pago, estado del equipo..." />
              </Field>
            </div>
            {(form.formState.errors.customer_name || form.formState.errors.customer_phone) && (
              <div className="md:col-span-2 space-y-1 text-xs text-[#DC2626]">
                {form.formState.errors.customer_name?.message && <p>{form.formState.errors.customer_name.message}</p>}
                {form.formState.errors.customer_phone?.message && <p>{form.formState.errors.customer_phone.message}</p>}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setOpenSections((prev) => ({ ...prev, payment: !prev.payment }))}
        >
          <h3 className="text-lg font-semibold text-[#0F172A]">3. Pago</h3>
          <span className="text-xs text-[#5B677A]">{openSections.payment ? 'Ocultar' : 'Mostrar'}</span>
        </button>
        {openSections.payment && (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Moneda de la operación">
                <Select {...form.register('currency')}>
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </Select>
              </Field>
              {currency === 'USD' && (
                <Field label="Tipo de cambio">
                  <Input type="number" min={0} {...form.register('fx_rate_used')} placeholder="Ej: 1250" />
                </Field>
              )}
            </div>

            <Field label="Método de pago">
              <Select {...form.register('method')}>
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="card">Tarjeta</option>
                <option value="mixed">Mixto</option>
                <option value="trade_in">Permuta</option>
              </Select>
            </Field>

            {(watchMethod === 'card' || watchMethod === 'mixed') && (
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Tarjeta">
                  <Input {...form.register('card_brand')} placeholder="Visa / Master" />
                </Field>
                <Field label="Cuotas">
                  <Input type="number" {...form.register('installments')} placeholder="3" />
                </Field>
                <Field label="Recargo %">
                  <Input type="number" {...form.register('surcharge_pct')} placeholder={String(surcharge)} />
                </Field>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Seña (opcional)">
                <Input type="number" {...form.register('deposit_ars')} />
              </Field>
              <Field label="Saldo pendiente (opcional)">
                <Input type="number" {...form.register('balance_due_ars')} />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Total ARS (calculado)">
                <Input type="number" value={totalArs ? Number(totalArs).toFixed(0) : ''} readOnly disabled />
              </Field>
              <Field label="Total USD (estimado)">
                <Input
                  type="number"
                  value={typeof totalUsd === 'number' ? totalUsd.toFixed(2) : ''}
                  readOnly
                  disabled
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm text-[#5B677A]">
              <input type="checkbox" {...form.register('includes_cube_20w')} />
              Incluye cubo 20W
            </label>

            {(form.formState.errors.card_brand?.message || form.formState.errors.fx_rate_used?.message) && (
              <div className="space-y-1 text-xs text-[#DC2626]">
                {form.formState.errors.card_brand?.message && <p>{form.formState.errors.card_brand.message}</p>}
                {form.formState.errors.fx_rate_used?.message && <p>{form.formState.errors.fx_rate_used.message}</p>}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setOpenSections((prev) => ({ ...prev, tradein: !prev.tradein }))}
        >
          <h3 className="text-lg font-semibold text-[#0F172A]">4. Permuta (opcional)</h3>
          <span className="text-xs text-[#5B677A]">{openSections.tradein ? 'Ocultar' : 'Mostrar'}</span>
        </button>
        {openSections.tradein && (
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-2 text-sm text-[#5B677A]">
              <input type="checkbox" {...form.register('trade_in_enabled')} />
              Recibe equipo en parte de pago
            </label>
            {tradeEnabled && (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Marca">
                    <Input {...form.register('trade_brand')} />
                  </Field>
                  <Field label="Modelo">
                    <Input {...form.register('trade_model')} />
                  </Field>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Storage">
                    <Input {...form.register('trade_storage')} />
                  </Field>
                  <Field label="Color">
                    <Input {...form.register('trade_color')} />
                  </Field>
                  <Field label="Condición">
                    <Input {...form.register('trade_condition')} />
                  </Field>
                </div>
                <Field label="IMEI">
                  <Input {...form.register('trade_imei')} />
                </Field>
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Valor USD">
                    <Input type="number" {...form.register('trade_value_usd')} />
                  </Field>
                  <Field label="Tipo de cambio">
                    <Input type="number" {...form.register('trade_fx_rate')} />
                  </Field>
                  <Field label="Valor ARS">
                    <Input type="number" {...form.register('trade_value_ars')} placeholder={tradeArs.toFixed(0)} />
                  </Field>
                </div>
              </>
            )}
          </div>
        )}
      </Card>

      <div className="fixed bottom-0 left-0 right-0 border-t border-[#E6EBF2] bg-white/95 px-4 py-3 backdrop-blur md:static md:border-none md:bg-transparent md:px-0">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Button variant="secondary" onClick={() => navigate('/sales')}>
            Cancelar
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Guardar venta'}
          </Button>
        </div>
      </div>
    </div>
  )
}
