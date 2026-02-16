import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import {
  calculateSuggestedTradeValue,
  convertTradeInToStock,
  createTradeIn,
  fetchPlanCanjeValues,
  fetchTradeIns,
  updateTradeIn,
} from '../services/tradeins'
import type { TradeIn, TradeStatus } from '../types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Table } from '../components/ui/Table'
import { Modal } from '../components/ui/Modal'

const schema = z.object({
  trade_date: z.string().min(1, 'Fecha requerida'),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_dni: z.string().optional(),
  model: z.string().min(1, 'Modelo requerido'),
  storage_gb: z.coerce.number().min(1, 'GB mayor a 0'),
  battery_pct: z.coerce.number().min(0, '0 mínimo').max(100, '100 máximo'),
  color: z.string().optional(),
  imei: z.string().min(4, 'IMEI requerido'),
  details: z.string().optional(),
  observation: z.string().optional(),
  reference_price_ars: z.coerce.number().min(1, 'Precio referencia requerido'),
  trade_value_ars: z.coerce.number().min(1, 'Valor tomado requerido'),
})

const statusLabels: Record<TradeStatus, string> = {
  pending: 'Pendiente',
  valued: 'Valorada',
  added_to_stock: 'En stock',
  sold: 'Vendida',
  rejected: 'Rechazada',
}

function formatMoney(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `$${value.toLocaleString('es-AR')}`
}

export function TradeInsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<TradeStatus | ''>('')
  const [suggestedValue, setSuggestedValue] = useState<number | null>(null)
  const [convertModalOpen, setConvertModalOpen] = useState(false)
  const [convertTarget, setConvertTarget] = useState<TradeIn | null>(null)
  const [convertState, setConvertState] = useState<'drawer' | 'used_premium'>('drawer')

  const tradeInsQuery = useQuery({
    queryKey: ['tradeins', statusFilter],
    queryFn: () => fetchTradeIns(statusFilter || undefined),
  })

  const planCanjeQuery = useQuery({
    queryKey: ['plan-canje'],
    queryFn: fetchPlanCanjeValues,
  })

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      trade_date: new Date().toISOString().slice(0, 10),
      storage_gb: 128,
      battery_pct: 85,
      reference_price_ars: 0,
      trade_value_ars: 0,
    },
  })

  const createMutation = useMutation({
    mutationFn: createTradeIn,
    onSuccess: () => {
      toast.success('Permuta guardada')
      queryClient.invalidateQueries({ queryKey: ['tradeins'] })
      form.reset({
        trade_date: new Date().toISOString().slice(0, 10),
        storage_gb: 128,
        battery_pct: 85,
        reference_price_ars: 0,
        trade_value_ars: 0,
      })
      setSuggestedValue(null)
    },
    onError: (error) => {
      const err = error as Error
      toast.error(err.message || 'No se pudo guardar la permuta')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TradeIn> }) => updateTradeIn(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tradeins'] }),
  })

  const convertMutation = useMutation({
    mutationFn: ({ id, state }: { id: string; state: 'drawer' | 'used_premium' }) =>
      convertTradeInToStock(id, { state, status: state }),
    onSuccess: () => {
      toast.success('Permuta convertida a stock')
      queryClient.invalidateQueries({ queryKey: ['tradeins'] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      setConvertModalOpen(false)
      setConvertTarget(null)
    },
    onError: (error) => {
      const err = error as Error
      toast.error(err.message || 'No se pudo convertir')
    },
  })

  const rows = tradeInsQuery.data ?? []

  const grouped = useMemo(() => {
    return rows.map((row) => ({
      ...row,
      statusLabel: statusLabels[row.status] ?? row.status,
    }))
  }, [rows])

  const calculateSuggested = () => {
    const model = form.getValues('model')
    const batteryPct = Number(form.getValues('battery_pct'))
    const referencePriceArs = Number(form.getValues('reference_price_ars'))

    if (!model || !referencePriceArs) {
      toast.error('Completá modelo y precio referencia')
      return
    }

    const calculated = calculateSuggestedTradeValue({
      model,
      batteryPct,
      referencePriceArs,
      rules: planCanjeQuery.data ?? [],
    })

    if (!calculated) {
      toast.error('No hay regla de plan canje para ese modelo/batería')
      return
    }

    setSuggestedValue(calculated)
    form.setValue('trade_value_ars', calculated, { shouldDirty: true, shouldValidate: true })
  }

  const onSubmit = (values: unknown) => {
    const parsed = schema.parse(values)
    createMutation.mutate({
      trade_date: parsed.trade_date,
      customer_name: parsed.customer_name?.trim() || null,
      customer_phone: parsed.customer_phone?.trim() || null,
      customer_dni: parsed.customer_dni?.trim() || null,
      brand: 'Apple',
      model: parsed.model,
      storage_gb: parsed.storage_gb,
      battery_pct: parsed.battery_pct,
      color: parsed.color?.trim() || null,
      imei: parsed.imei.trim(),
      details: parsed.details?.trim() || null,
      observation: parsed.observation?.trim() || null,
      trade_value_ars: parsed.trade_value_ars,
      suggested_value_ars: suggestedValue,
      status: 'pending',
    })
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Permutas</h2>
          <p className="text-sm text-[#5B677A]">Ingreso de equipos por canje y paso a stock.</p>
        </div>
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TradeStatus | '')} className="max-w-[200px]">
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="valued">Valorada</option>
          <option value="added_to_stock">En stock</option>
          <option value="sold">Vendida</option>
          <option value="rejected">Rechazada</option>
        </Select>
      </div>

      <Card className="p-5">
        <h3 className="text-lg font-semibold text-[#0F172A]">Nueva permuta</h3>
        <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={form.handleSubmit(onSubmit)}>
          <Field label="Fecha">
            <Input type="date" {...form.register('trade_date')} />
          </Field>
          <Field label="Cliente (opcional)">
            <Input {...form.register('customer_name')} />
          </Field>
          <Field label="Teléfono (opcional)">
            <Input {...form.register('customer_phone')} />
          </Field>
          <Field label="DNI (opcional)">
            <Input {...form.register('customer_dni')} />
          </Field>
          <Field label="Modelo">
            <Input {...form.register('model')} placeholder="iPhone 13" />
          </Field>
          <Field label="GB">
            <Input type="number" min={1} {...form.register('storage_gb')} />
          </Field>
          <Field label="Batería %">
            <Input type="number" min={0} max={100} {...form.register('battery_pct')} />
          </Field>
          <Field label="Color">
            <Input {...form.register('color')} />
          </Field>
          <Field label="IMEI">
            <Input {...form.register('imei')} />
          </Field>
          <Field label="Precio referencia ARS">
            <Input type="number" min={1} {...form.register('reference_price_ars')} />
          </Field>
          <Field label="Valor tomado ARS">
            <Input type="number" min={1} {...form.register('trade_value_ars')} />
          </Field>
          <div className="flex items-end">
            <Button type="button" variant="secondary" onClick={calculateSuggested}>
              Calcular valor sugerido
            </Button>
          </div>
          <div className="md:col-span-3">
            <Field label="Detalles">
              <Input {...form.register('details')} />
            </Field>
          </div>
          <div className="md:col-span-3">
            <Field label="Observación">
              <Input {...form.register('observation')} />
            </Field>
          </div>

          {suggestedValue != null && (
            <div className="md:col-span-3 rounded-xl border border-[rgba(11,74,162,0.2)] bg-[rgba(11,74,162,0.06)] px-3 py-2 text-sm text-[#0B4AA2]">
              Valor sugerido por plan canje: {formatMoney(suggestedValue)}
            </div>
          )}

          {Object.keys(form.formState.errors).length > 0 && (
            <div className="md:col-span-3 space-y-1 rounded-xl border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.06)] p-3 text-xs text-[#991B1B]">
              {form.formState.errors.model?.message && <p>{form.formState.errors.model.message}</p>}
              {form.formState.errors.storage_gb?.message && <p>{form.formState.errors.storage_gb.message}</p>}
              {form.formState.errors.battery_pct?.message && <p>{form.formState.errors.battery_pct.message}</p>}
              {form.formState.errors.imei?.message && <p>{form.formState.errors.imei.message}</p>}
              {form.formState.errors.trade_value_ars?.message && <p>{form.formState.errors.trade_value_ars.message}</p>}
            </div>
          )}

          <div className="md:col-span-3">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Guardando...' : 'Guardar permuta'}
            </Button>
          </div>
        </form>
      </Card>

      <Table headers={['Fecha', 'Cliente', 'Equipo', 'IMEI', 'Tomado', 'Estado', 'Acciones']}>
        {tradeInsQuery.isLoading ? (
          <tr>
            <td className="px-4 py-6 text-sm text-[#5B677A]" colSpan={7}>
              Cargando permutas...
            </td>
          </tr>
        ) : grouped.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-sm text-[#5B677A]" colSpan={7}>
              Sin permutas registradas.
            </td>
          </tr>
        ) : (
          grouped.map((trade) => (
            <tr key={trade.id}>
              <td className="px-4 py-3 text-sm">{trade.trade_date ? new Date(trade.trade_date).toLocaleDateString('es-AR') : '—'}</td>
              <td className="px-4 py-3 text-sm">
                <div>{trade.customer_name || '—'}</div>
                <div className="text-xs text-[#5B677A]">{trade.customer_phone || '—'}</div>
              </td>
              <td className="px-4 py-3 text-sm">
                {trade.model} {trade.storage_gb ? `${trade.storage_gb}GB` : ''}
              </td>
              <td className="px-4 py-3 text-sm">{trade.imei || '—'}</td>
              <td className="px-4 py-3 text-sm">{formatMoney(trade.trade_value_ars)}</td>
              <td className="px-4 py-3 text-sm">{trade.statusLabel}</td>
              <td className="px-4 py-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  {trade.status !== 'valued' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => updateMutation.mutate({ id: trade.id, payload: { status: 'valued' } })}
                    >
                      Valorar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => {
                      setConvertTarget(trade)
                      setConvertState('drawer')
                      setConvertModalOpen(true)
                    }}
                  >
                    Convertir a stock
                  </Button>
                </div>
              </td>
            </tr>
          ))
        )}
      </Table>

      <Modal
        open={convertModalOpen}
        title="Convertir permuta a stock"
        subtitle={convertTarget ? `${convertTarget.model} · IMEI ${convertTarget.imei ?? '—'}` : undefined}
        onClose={() => {
          setConvertModalOpen(false)
          setConvertTarget(null)
        }}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setConvertModalOpen(false)
                setConvertTarget(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!convertTarget) return
                convertMutation.mutate({ id: convertTarget.id, state: convertState })
              }}
              disabled={convertMutation.isPending}
            >
              {convertMutation.isPending ? 'Convirtiendo...' : 'Confirmar'}
            </Button>
          </>
        }
      >
        <Field label="Estado destino">
          <Select value={convertState} onChange={(event) => setConvertState(event.target.value as 'drawer' | 'used_premium')}>
            <option value="drawer">Cajón</option>
            <option value="used_premium">Usados Premium</option>
          </Select>
        </Field>
      </Modal>
    </div>
  )
}
