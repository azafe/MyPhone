import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchStock } from '../services/stock'
import { createSale } from '../services/sales'
import { fetchInstallmentRules } from '../services/installments'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Card } from '../components/ui/Card'

const schema = z.object({
  stock_item_id: z.string().min(1),
  customer_name: z.string().min(1),
  customer_phone: z.string().min(1),
  method: z.enum(['cash', 'transfer', 'card', 'mixed', 'trade_in']),
  card_brand: z.string().optional().nullable(),
  installments: z.coerce.number().optional().nullable(),
  surcharge_pct: z.coerce.number().optional().nullable(),
  total_ars: z.coerce.number().min(0),
  deposit_ars: z.coerce.number().optional().nullable(),
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
      stock_item_id: preselected,
      method: 'cash',
      trade_in_enabled: false,
    },
  })

  const watchMethod = form.watch('method')
  const tradeEnabled = form.watch('trade_in_enabled')
  const tradeUsd = form.watch('trade_value_usd') ?? 0
  const tradeFx = form.watch('trade_fx_rate') ?? 0
  const cardBrand = form.watch('card_brand')
  const installments = form.watch('installments')

  const tradeArs = useMemo(() => Number(tradeUsd) * Number(tradeFx), [tradeUsd, tradeFx])

  const surcharge = useMemo(() => {
    if (!cardBrand || !installments) return 0
    const rule = rules.find((r) => r.card_brand === cardBrand && r.installments === Number(installments))
    return rule?.surcharge_pct ?? 0
  }, [rules, cardBrand, installments])

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

  const onSubmit = (values: FormValues) => {
    const parsed = schema.parse(values)
    const payload = {
      sale_date: new Date().toISOString().slice(0, 10),
      customer: {
        name: parsed.customer_name,
        phone: parsed.customer_phone,
      },
      payment: {
        method: parsed.method,
        card_brand: parsed.card_brand,
        installments: parsed.installments,
        surcharge_pct: parsed.surcharge_pct ?? surcharge,
        total_ars: parsed.total_ars,
        deposit_ars: parsed.deposit_ars,
      },
      items: [
        {
          stock_item_id: parsed.stock_item_id,
        },
      ],
      trade_in: parsed.trade_in_enabled
        ? {
            brand: parsed.trade_brand,
            model: parsed.trade_model,
            storage: parsed.trade_storage,
            color: parsed.trade_color,
            condition: parsed.trade_condition,
            imei: parsed.trade_imei,
            trade_value_usd: parsed.trade_value_usd,
            fx_rate_used: parsed.trade_fx_rate,
            trade_value_ars: parsed.trade_value_ars ?? tradeArs,
          }
        : {},
    }

    mutation.mutate(payload)
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Nueva venta</h2>
        <p className="text-sm text-[#5B677A]">Cargá los datos en secciones rápidas.</p>
      </div>

      <Card className="p-5">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setOpenSections((prev) => ({ ...prev, stock: !prev.stock }))}
        >
          <h3 className="text-lg font-semibold text-[#0F172A]">1. Equipo</h3>
          <span className="text-xs text-[#5B677A]">{openSections.stock ? 'Ocultar' : 'Mostrar'}</span>
        </button>
        {openSections.stock && (
          <div className="mt-4">
            <Field label="Equipo disponible">
              <Select {...form.register('stock_item_id')}>
                <option value="">Seleccionar equipo</option>
                {stock.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.brand} {item.model} - ${item.sale_price_ars.toLocaleString('es-AR')}
                  </option>
                ))}
              </Select>
            </Field>
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
            <Field label="Método">
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
              <Field label="Total ARS">
                <Input type="number" {...form.register('total_ars')} />
              </Field>
              <Field label="Seña (opcional)">
                <Input type="number" {...form.register('deposit_ars')} />
              </Field>
            </div>
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
