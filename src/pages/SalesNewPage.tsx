import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchStock } from '../services/stock'
import { createSale, fetchSellers, type CreateSalePayload } from '../services/sales'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'

const itemSchema = z
  .object({
    source: z.enum(['stock', 'manual']).default('stock'),
    stock_item_id: z.string().optional(),
    manual_model: z.string().optional(),
    manual_imei: z.string().optional(),
    sale_price_ars: z.coerce.number().min(1, 'Precio mayor a 0'),
  })
  .superRefine((item, ctx) => {
    if (item.source === 'stock' && !item.stock_item_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Seleccioná un equipo de stock', path: ['stock_item_id'] })
    }

    if (item.source === 'manual') {
      if (!item.manual_model?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Modelo manual requerido', path: ['manual_model'] })
      }
      if (!item.manual_imei?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'IMEI manual requerido', path: ['manual_imei'] })
      }
    }
  })

const paymentSchema = z.object({
  method: z.enum(['cash', 'transfer', 'card', 'deposit']),
  currency: z.enum(['ARS', 'USD']),
  amount: z.coerce.number().min(0.01, 'Monto mayor a 0'),
  card_brand: z.string().optional(),
  installments: z.coerce.number().optional().nullable(),
  surcharge_pct: z.coerce.number().optional().nullable(),
  note: z.string().optional(),
})

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

const schema = z
  .object({
    sale_date: z
      .string()
      .trim()
      .min(1, 'Fecha requerida')
      .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Formato DD/MM/AAAA'),
    seller_id: z.string().optional(),
    customer_name: z.string().min(1, 'Nombre requerido'),
    customer_phone: z.string().optional(),
    customer_dni: z.string().optional(),
    fx_rate_used: z.coerce.number().optional().nullable(),
    details: z.string().optional(),
    includes_cube_20w: z.boolean().default(false),
    items: z.array(itemSchema).min(1, 'Debe existir al menos 1 ítem'),
    payments: z.array(paymentSchema).min(1, 'Debe existir al menos 1 pago'),
  })
  .superRefine((values, ctx) => {
    if (!parseDisplayDateToIso(values.sale_date)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Fecha inválida', path: ['sale_date'] })
    }

    const hasUsdPayment = values.payments.some((payment) => payment.currency === 'USD')
    if (hasUsdPayment && (!values.fx_rate_used || values.fx_rate_used <= 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Tipo de cambio requerido para pagos en USD', path: ['fx_rate_used'] })
    }

    const stockIds = new Set<string>()
    const manualImeis = new Set<string>()

    values.items.forEach((item, index) => {
      if (item.source === 'stock' && item.stock_item_id) {
        if (stockIds.has(item.stock_item_id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Equipo repetido en carrito',
            path: ['items', index, 'stock_item_id'],
          })
        }
        stockIds.add(item.stock_item_id)
      }

      if (item.source === 'manual' && item.manual_imei) {
        const normalized = item.manual_imei.trim()
        if (manualImeis.has(normalized)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'IMEI manual repetido',
            path: ['items', index, 'manual_imei'],
          })
        }
        manualImeis.add(normalized)
      }
    })
  })

type SaleFormInput = z.input<typeof schema>
type SaleFormValues = z.output<typeof schema>
type SaleFormItem = SaleFormInput['items'][number]
type SaleFormPayment = SaleFormInput['payments'][number]

const EMPTY_ITEMS: SaleFormItem[] = []
const EMPTY_PAYMENTS: SaleFormPayment[] = []

function todayDisplayDate() {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = String(now.getFullYear())
  return `${day}/${month}/${year}`
}

function getArsAmount(payment: SaleFormPayment, fxRate: number) {
  const currency = payment.currency
  const amount = Number(payment.amount ?? 0)
  if (currency === 'ARS') return amount
  if (!fxRate || fxRate <= 0) return 0
  return amount * fxRate
}

export function SalesNewPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()
  const preselectedStock = searchParams.get('stock') ?? ''

  const stockQuery = useQuery({
    queryKey: ['stock', 'sale_candidates'],
    queryFn: () => fetchStock(),
  })

  const sellersQuery = useQuery({
    queryKey: ['users', 'sellers'],
    queryFn: fetchSellers,
  })

  const availableStock = useMemo(() => {
    const items = stockQuery.data ?? []
    return items.filter((item) => {
      const state = String(item.state ?? item.status ?? 'new')
      return state !== 'sold'
    })
  }, [stockQuery.data])

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

  const form = useForm<SaleFormInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      sale_date: todayDisplayDate(),
      customer_name: '',
      customer_phone: '',
      customer_dni: '',
      fx_rate_used: null,
      details: '',
      includes_cube_20w: false,
      items: [{ source: 'stock', stock_item_id: preselectedStock, sale_price_ars: 0 }],
      payments: [{ method: 'cash', currency: 'ARS', amount: '' as unknown as number }],
    },
  })

  const watchedItems = useWatch({ control: form.control, name: 'items' })
  const watchedPayments = useWatch({ control: form.control, name: 'payments' })
  const watchedFxRate = useWatch({ control: form.control, name: 'fx_rate_used' })

  const items = watchedItems ?? EMPTY_ITEMS
  const payments = watchedPayments ?? EMPTY_PAYMENTS
  const fxRate = Number(watchedFxRate ?? 0)
  const hasUsdPayment = useMemo(() => payments.some((payment) => payment.currency === 'USD'), [payments])

  const totalArs = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.sale_price_ars || 0), 0),
    [items],
  )

  useEffect(() => {
    if (!preselectedStock) return
    const current = form.getValues('items.0.stock_item_id')
    if (current) return
    const selected = availableStock.find((item) => item.id === preselectedStock)
    if (!selected) return
    form.setValue('items.0.stock_item_id', preselectedStock, { shouldDirty: true, shouldValidate: true })
    form.setValue('items.0.sale_price_ars', Number(selected.sale_price_ars ?? 0), {
      shouldDirty: true,
      shouldValidate: true,
    })
  }, [availableStock, form, preselectedStock])

  useEffect(() => {
    if (!profile?.id) return
    const currentSellerId = form.getValues('seller_id')
    if (currentSellerId) return
    form.setValue('seller_id', profile.id, { shouldValidate: true })
  }, [form, profile?.id])

  const paidArs = useMemo(
    () => payments.reduce((sum, payment) => sum + getArsAmount(payment, fxRate), 0),
    [fxRate, payments],
  )

  const balanceDueArs = useMemo(() => Math.max(0, totalArs - paidArs), [paidArs, totalArs])

  const mutation = useMutation({
    mutationFn: createSale,
    onSuccess: () => {
      toast.success('Venta guardada')
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      navigate('/sales')
    },
    onError: (error) => {
      const err = error as Error & { code?: string; details?: unknown }
      const code = String(err.code ?? '').toLowerCase()
      const detailsText =
        typeof err.details === 'string'
          ? err.details.toLowerCase()
          : JSON.stringify(err.details ?? '').toLowerCase()

      if (code === 'stock_conflict') {
        queryClient.invalidateQueries({ queryKey: ['stock'] })
        toast.error('El equipo ya no está disponible. Actualizá Stock e intentá nuevamente.')
        return
      }

      if (
        code === 'sale_create_failed' &&
        detailsText.includes('stock_item_id') &&
        detailsText.includes('already exists')
      ) {
        queryClient.invalidateQueries({ queryKey: ['stock'] })
        toast.error('El equipo ya fue vendido. Actualizá Stock e intentá con otro.')
        return
      }

      if (
        code === 'validation_error' &&
        detailsText.includes('sale_date') &&
        detailsText.includes('invalid datetime')
      ) {
        toast.error('Fecha inválida. Usá formato DD/MM/AAAA.')
        return
      }

      toast.error(err.message || 'No se pudo guardar la venta')
    },
  })

  const addItem = () => {
    form.setValue('items', [...items, { source: 'stock', stock_item_id: '', sale_price_ars: 0 }], {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  const removeItem = (index: number) => {
    if (items.length === 1) {
      toast.error('Debe existir al menos 1 ítem')
      return
    }
    form.setValue(
      'items',
      items.filter((_, idx) => idx !== index),
      { shouldDirty: true, shouldValidate: true },
    )
  }

  const addPayment = () => {
    form.setValue('payments', [...payments, { method: 'cash', currency: 'ARS', amount: '' as unknown as number }], {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  const removePayment = (index: number) => {
    if (payments.length === 1) {
      toast.error('Debe existir al menos 1 pago')
      return
    }
    form.setValue(
      'payments',
      payments.filter((_, idx) => idx !== index),
      { shouldDirty: true, shouldValidate: true },
    )
  }

  const updateItem = (index: number, patch: Partial<SaleFormItem>) => {
    const next = [...items]
    next[index] = { ...next[index], ...patch }
    form.setValue('items', next, { shouldDirty: true, shouldValidate: true })
  }

  const updatePayment = (index: number, patch: Partial<SaleFormPayment>) => {
    const next = [...payments]
    next[index] = { ...next[index], ...patch }
    form.setValue('payments', next, { shouldDirty: true, shouldValidate: true })
  }

  const handleSelectStockItem = (index: number, stockItemId: string) => {
    const selected = availableStock.find((item) => item.id === stockItemId)
    updateItem(index, {
      source: 'stock',
      stock_item_id: stockItemId,
      manual_model: '',
      manual_imei: '',
      sale_price_ars: Number(selected?.sale_price_ars ?? 0),
    })
  }

  const onSubmit = (values: SaleFormInput) => {
    const parsed: SaleFormValues = schema.parse(values)
    const saleDateIso = parseDisplayDateToIso(parsed.sale_date)

    if (!saleDateIso) {
      toast.error('Fecha inválida. Usá formato DD/MM/AAAA.')
      return
    }

    if (totalArs <= 0) {
      toast.error('El total debe ser mayor a 0')
      return
    }

    const paymentMethod =
      parsed.payments.length === 1 ? parsed.payments[0].method : 'mixed'

    const firstCardPayment = parsed.payments.find((payment) => payment.method === 'card')
    const hasUsdPayments = parsed.payments.some((payment) => payment.currency === 'USD')
    const onlyUsdPayments = parsed.payments.length > 0 && parsed.payments.every((payment) => payment.currency === 'USD')
    const fxRateUsed = hasUsdPayments ? Number(parsed.fx_rate_used ?? 0) : 0

    const payload: CreateSalePayload = {
      sale_date: saleDateIso,
      seller_id: parsed.seller_id || undefined,
      customer: {
        name: parsed.customer_name,
        phone: parsed.customer_phone?.trim() || undefined,
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
      total_usd:
        onlyUsdPayments && fxRateUsed > 0
          ? Number((totalArs / fxRateUsed).toFixed(2))
          : null,
      total_ars: totalArs,
      balance_due_ars: balanceDueArs,
      details: parsed.details?.trim() || null,
      notes: parsed.details?.trim() || null,
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
      items: parsed.items.map((item) => ({
        stock_item_id: item.source === 'stock' ? (item.stock_item_id ?? null) : null,
        qty: 1,
        sale_price_ars: Number(item.sale_price_ars),
      })),
    }

    mutation.mutate(payload)
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Nueva venta</h2>
          <p className="text-sm text-[#5B677A]">Carrito simple con pagos múltiples y saldo pendiente automático.</p>
        </div>
      </div>

      <Card className="p-5">
        <h3 className="text-lg font-semibold text-[#0F172A]">Datos generales</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Fecha">
            <Input placeholder="DD/MM/AAAA" inputMode="numeric" {...form.register('sale_date')} />
          </Field>
          <Field label="Vendedor">
            <Select {...form.register('seller_id')}>
              <option value="">Sin asignar</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.full_name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-lg font-semibold text-[#0F172A]">Cliente</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Field label="Nombre">
            <Input {...form.register('customer_name')} />
          </Field>
          <Field label="Teléfono">
            <Input {...form.register('customer_phone')} />
          </Field>
          <Field label="DNI">
            <Input {...form.register('customer_dni')} />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-[#0F172A]">Ítems</h3>
          <Button variant="secondary" onClick={addItem}>
            Agregar ítem
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {items.map((item, index) => {
            const itemErrors = form.formState.errors.items?.[index]

            return (
              <div key={`item-${index}`} className="rounded-xl border border-[#E6EBF2] bg-[#F8FAFC] p-3">
                <div className="grid gap-3 md:grid-cols-[120px_1fr_140px_auto] md:items-end">
                  <Field label="Tipo">
                    <Select
                      value={item.source}
                      onChange={(event) =>
                        updateItem(index, {
                          source: event.target.value as 'stock' | 'manual',
                          stock_item_id: '',
                          manual_model: '',
                          manual_imei: '',
                          sale_price_ars: 0,
                        })
                      }
                    >
                      <option value="stock">Stock</option>
                      <option value="manual">Manual</option>
                    </Select>
                  </Field>

                  {item.source === 'stock' ? (
                    <Field label="Equipo">
                      <Select
                        value={item.stock_item_id ?? ''}
                        onChange={(event) => handleSelectStockItem(index, event.target.value)}
                      >
                        <option value="">Seleccionar equipo</option>
                        {availableStock.map((stockItem) => (
                          <option key={stockItem.id} value={stockItem.id}>
                            {stockItem.model} · {stockItem.storage_gb ?? '—'}GB · IMEI {stockItem.imei ?? '—'}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Modelo manual">
                        <Input
                          value={item.manual_model ?? ''}
                          onChange={(event) => updateItem(index, { manual_model: event.target.value })}
                        />
                      </Field>
                      <Field label="IMEI manual">
                        <Input
                          value={item.manual_imei ?? ''}
                          onChange={(event) => updateItem(index, { manual_imei: event.target.value })}
                        />
                      </Field>
                    </div>
                  )}

                  <Field label="Precio ARS">
                    <Input
                      type="number"
                      min={1}
                      value={Number(item.sale_price_ars ?? 0)}
                      onChange={(event) => updateItem(index, { sale_price_ars: Number(event.target.value) || 0 })}
                    />
                  </Field>

                  <Button variant="secondary" onClick={() => removeItem(index)}>
                    Quitar
                  </Button>
                </div>

                <div className="mt-2 text-xs text-[#5B677A]">Cantidad fija: 1 unidad por equipo único (IMEI).</div>

                {(itemErrors?.stock_item_id || itemErrors?.manual_model || itemErrors?.manual_imei || itemErrors?.sale_price_ars) && (
                  <div className="mt-2 space-y-1 text-xs text-[#DC2626]">
                    {itemErrors.stock_item_id?.message && <p>{itemErrors.stock_item_id.message}</p>}
                    {itemErrors.manual_model?.message && <p>{itemErrors.manual_model.message}</p>}
                    {itemErrors.manual_imei?.message && <p>{itemErrors.manual_imei.message}</p>}
                    {itemErrors.sale_price_ars?.message && <p>{itemErrors.sale_price_ars.message}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-[#0F172A]">Pagos</h3>
          <Button variant="secondary" onClick={addPayment}>
            Agregar pago
          </Button>
        </div>

        {hasUsdPayment ? (
          <div className="mt-4 max-w-[240px]">
            <Field label="Dólar usado (pagos USD)">
              <Input type="number" min={0} step="0.01" {...form.register('fx_rate_used')} />
            </Field>
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {payments.map((payment, index) => {
            const paymentErrors = form.formState.errors.payments?.[index]

            return (
              <div key={`payment-${index}`} className="rounded-xl border border-[#E6EBF2] bg-[#F8FAFC] p-3">
                <div className="grid gap-3 md:grid-cols-[130px_130px_160px_1fr_auto] md:items-end">
                  <Field label="Método">
                    <Select
                      value={payment.method}
                      onChange={(event) =>
                        updatePayment(index, {
                          method: event.target.value as 'cash' | 'transfer' | 'card' | 'deposit',
                        })
                      }
                    >
                      <option value="cash">Efectivo</option>
                      <option value="transfer">Transferencia</option>
                      <option value="card">Tarjeta</option>
                      <option value="deposit">Seña</option>
                    </Select>
                  </Field>
                  <Field label="Moneda">
                    <Select
                      value={payment.currency}
                      onChange={(event) => updatePayment(index, { currency: event.target.value as 'ARS' | 'USD' })}
                    >
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </Select>
                  </Field>
                  <Field label="Monto">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={payment.amount == null ? '' : String(payment.amount)}
                      onChange={(event) =>
                        updatePayment(index, {
                          amount: event.target.value === '' ? ('' as unknown as number) : Number(event.target.value),
                        })
                      }
                    />
                  </Field>
                  {payment.method === 'card' ? (
                    <div className="grid gap-3 md:grid-cols-3">
                      <Field label="Tarjeta">
                        <Input
                          value={payment.card_brand ?? ''}
                          onChange={(event) => updatePayment(index, { card_brand: event.target.value })}
                        />
                      </Field>
                      <Field label="Cuotas">
                        <Input
                          type="number"
                          min={1}
                          value={payment.installments == null ? '' : String(payment.installments)}
                          onChange={(event) =>
                            updatePayment(index, {
                              installments: event.target.value ? Number(event.target.value) : null,
                            })
                          }
                        />
                      </Field>
                      <Field label="Recargo %">
                        <Input
                          type="number"
                          min={0}
                          value={payment.surcharge_pct == null ? '' : String(payment.surcharge_pct)}
                          onChange={(event) =>
                            updatePayment(index, {
                              surcharge_pct: event.target.value ? Number(event.target.value) : null,
                            })
                          }
                        />
                      </Field>
                    </div>
                  ) : (
                    <Field label="Nota">
                      <Input
                        value={payment.note ?? ''}
                        onChange={(event) => updatePayment(index, { note: event.target.value })}
                        placeholder="Referencia"
                      />
                    </Field>
                  )}
                  <Button variant="secondary" onClick={() => removePayment(index)}>
                    Quitar
                  </Button>
                </div>

                {(paymentErrors?.method || paymentErrors?.currency || paymentErrors?.amount) && (
                  <div className="mt-2 space-y-1 text-xs text-[#DC2626]">
                    {paymentErrors.method?.message && <p>{paymentErrors.method.message}</p>}
                    {paymentErrors.currency?.message && <p>{paymentErrors.currency.message}</p>}
                    {paymentErrors.amount?.message && <p>{paymentErrors.amount.message}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-lg font-semibold text-[#0F172A]">Detalle y total</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Detalle libre">
            <Input {...form.register('details')} placeholder="Falta pagar, observaciones, etc." />
          </Field>
          <Field label="Cubo 20W">
            <label className="flex h-11 items-center gap-2 rounded-xl border border-[#E6EBF2] px-3 text-sm text-[#0F172A]">
              <input type="checkbox" {...form.register('includes_cube_20w')} />
              Incluido en la operación
            </label>
          </Field>
        </div>

        <div className="mt-4 grid gap-3 rounded-xl border border-[#E6EBF2] bg-[#F8FAFC] p-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Total venta</p>
            <p className="mt-1 text-lg font-semibold text-[#0F172A]">${totalArs.toLocaleString('es-AR')}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Pagado (ARS)</p>
            <p className="mt-1 text-lg font-semibold text-[#0F172A]">${paidArs.toLocaleString('es-AR')}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Saldo pendiente</p>
            <p className="mt-1 text-lg font-semibold text-[#B91C1C]">${balanceDueArs.toLocaleString('es-AR')}</p>
          </div>
        </div>

        {form.formState.errors.items?.message && <p className="mt-2 text-xs text-[#DC2626]">{form.formState.errors.items.message}</p>}
        {form.formState.errors.payments?.message && <p className="mt-2 text-xs text-[#DC2626]">{form.formState.errors.payments.message}</p>}
      </Card>

      <div className="fixed bottom-0 left-0 right-0 border-t border-[#E6EBF2] bg-white/95 px-4 py-3 backdrop-blur md:static md:border-none md:bg-transparent md:px-0">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
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
