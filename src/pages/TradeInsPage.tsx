import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import {
  fetchTradeIns,
  createTradeIn,
  updateTradeIn,
  convertTradeInToStock,
  fetchPlanCanjeValues,
} from '../services/tradeins'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Modal } from '../components/ui/Modal'
import { Table } from '../components/ui/Table'
import { ActionMenu, ActionMenuItem } from '../components/ui/ActionMenu'
import type { TradeIn, TradeStatus } from '../types'

const schema = z.object({
  sale_ref: z.string().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  brand: z.string().min(1),
  model: z.string().min(1),
  storage: z.string().optional(),
  color: z.string().optional(),
  condition: z.string().min(1),
  imei: z.string().optional(),
  trade_value_usd: z.coerce.number().min(0),
  fx_rate_used: z.coerce.number().min(0),
  trade_value_ars: z.coerce.number().min(0),
  notes: z.string().optional(),
  status: z.enum(['pending', 'valued', 'added_to_stock', 'sold', 'rejected']).default('pending'),
})

type FormValues = z.input<typeof schema>

export function TradeInsPage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<TradeStatus | ''>('')
  const [selected, setSelected] = useState<TradeIn | null>(null)
  const [convertOpen, setConvertOpen] = useState(false)
  const [convertValues, setConvertValues] = useState({ category: '', sale_price_ars: '', warranty_days: '90', imei: '' })

  const { data = [] } = useQuery({
    queryKey: ['tradeins', status],
    queryFn: () => fetchTradeIns(status || undefined),
  })
  const { data: planCanjeValues = [] } = useQuery({
    queryKey: ['plan_canje_values'],
    queryFn: fetchPlanCanjeValues,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'pending' },
  })

  const tradeUsd = form.watch('trade_value_usd') ?? 0
  const tradeFx = form.watch('fx_rate_used') ?? 0

  const tradeArs = useMemo(() => {
    return Number(tradeUsd) * Number(tradeFx)
  }, [tradeUsd, tradeFx])

  const createMutation = useMutation({
    mutationFn: createTradeIn,
    onSuccess: () => {
      toast.success('Permuta registrada')
      queryClient.invalidateQueries({ queryKey: ['tradeins'] })
      form.reset({ status: 'pending' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TradeIn> }) => updateTradeIn(id, payload),
    onSuccess: () => {
      toast.success('Permuta actualizada')
      queryClient.invalidateQueries({ queryKey: ['tradeins'] })
    },
  })

  const convertMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      convertTradeInToStock(id, payload),
    onSuccess: () => {
      toast.success('Convertido a stock')
      queryClient.invalidateQueries({ queryKey: ['tradeins'] })
      setConvertOpen(false)
    },
  })

  const onSubmit = (values: FormValues) => {
    const parsed = schema.parse(values)
    createMutation.mutate({
      ...parsed,
      trade_value_ars: parsed.trade_value_ars || tradeArs,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Permutas</h2>
          <p className="text-sm text-[#5B677A]">Registro y seguimiento de equipos recibidos.</p>
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value as TradeStatus | '')} className="max-w-[180px]">
          <option value="">Todas</option>
          <option value="pending">Pendientes</option>
          <option value="valued">Valoradas</option>
          <option value="added_to_stock">En stock</option>
          <option value="sold">Vendidas</option>
          <option value="rejected">Rechazadas</option>
        </Select>
      </div>

      <Card className="p-5">
        <h3 className="text-lg font-semibold text-[#0F172A]">Nueva permuta</h3>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          <Field label="Ref. venta (opcional)">
            <Input {...form.register('sale_ref')} placeholder="Ej: 44" />
          </Field>
          <Field label="Cliente (opcional)">
            <Input {...form.register('customer_name')} placeholder="Nombre cliente" />
          </Field>
          <Field label="Teléfono (opcional)">
            <Input {...form.register('customer_phone')} placeholder="11 1234-5678" />
          </Field>
          <Field label="Marca">
            <Input {...form.register('brand')} />
          </Field>
          <Field label="Modelo">
            <Input {...form.register('model')} />
          </Field>
          <Field label="Storage">
            <Input {...form.register('storage')} />
          </Field>
          <Field label="Color">
            <Input {...form.register('color')} />
          </Field>
          <Field label="Condición">
            <Input {...form.register('condition')} />
          </Field>
          <Field label="IMEI">
            <Input {...form.register('imei')} />
          </Field>
          <Field label="Valor USD">
            <Input type="number" {...form.register('trade_value_usd')} />
          </Field>
          <Field label="Tipo de cambio">
            <Input type="number" {...form.register('fx_rate_used')} />
          </Field>
          <Field label="Valor ARS">
            <Input type="number" {...form.register('trade_value_ars')} placeholder={tradeArs.toFixed(0)} />
          </Field>
          <Field label="Estado inicial">
            <Select {...form.register('status')}>
              <option value="pending">Pendiente</option>
              <option value="valued">Valorada</option>
              <option value="added_to_stock">Convertir a stock</option>
            </Select>
          </Field>
          <Field label="Notas">
            <Input {...form.register('notes')} />
          </Field>
          <Button type="submit" className="md:col-span-2" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Guardando...' : 'Guardar permuta'}
          </Button>
        </form>
      </Card>

      <Card className="p-5">
        <h3 className="text-lg font-semibold text-[#0F172A]">Valores de plan canje</h3>
        <p className="mt-1 text-xs text-[#5B677A]">Por línea de iPhone y rango de batería.</p>
        <div className="mt-4">
          <Table headers={['Modelo', 'Batería %', '% referencia']}>
            {planCanjeValues.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-[#5B677A]" colSpan={3}>
                  Sin valores cargados.
                </td>
              </tr>
            ) : (
              planCanjeValues.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-sm">{row.model}</td>
                  <td className="px-4 py-3 text-sm">
                    {row.battery_min}% - {row.battery_max}%
                  </td>
                  <td className="px-4 py-3 text-sm">{row.pct_of_reference}%</td>
                </tr>
              ))
            )}
          </Table>
        </div>
      </Card>

      <Table headers={['Ref', 'Equipo', 'Valor', 'Estado', 'Acciones']}>
        {data.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-sm text-[#5B677A]" colSpan={5}>
              No hay permutas.
            </td>
          </tr>
        ) : (
          data.map((trade) => (
            <tr key={trade.id}>
              <td className="px-4 py-3 text-sm">{trade.sale_ref ?? '—'}</td>
              <td className="px-4 py-3">
                <div className="text-sm font-medium text-[#0F172A]">
                  {trade.brand} {trade.model}
                </div>
                <div className="text-xs text-[#5B677A]">
                  {trade.imei ?? 'Sin IMEI'}
                  {trade.customer_name ? ` · ${trade.customer_name}` : ''}
                </div>
              </td>
              <td className="px-4 py-3 text-sm">${trade.trade_value_ars.toLocaleString('es-AR')}</td>
              <td className="px-4 py-3">
                <Badge label={trade.status} tone={trade.status} />
              </td>
              <td className="px-4 py-3">
                <ActionMenu>
                  <ActionMenuItem onClick={() => updateMutation.mutate({ id: trade.id, payload: { status: 'valued' } })}>
                    Valorar
                  </ActionMenuItem>
                  <ActionMenuItem
                    onClick={() => {
                      setSelected(trade)
                      setConvertOpen(true)
                    }}
                  >
                    Convertir a stock
                  </ActionMenuItem>
                  <ActionMenuItem onClick={() => updateMutation.mutate({ id: trade.id, payload: { status: 'rejected' } })}>
                    Rechazar
                  </ActionMenuItem>
                  <ActionMenuItem onClick={() => updateMutation.mutate({ id: trade.id, payload: { status: 'sold' } })}>
                    Marcar vendida
                  </ActionMenuItem>
                </ActionMenu>
              </td>
            </tr>
          ))
        )}
      </Table>

      <Modal
        open={convertOpen}
        title="Convertir a stock"
        onClose={() => setConvertOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConvertOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!selected) return
                convertMutation.mutate({
                  id: selected.id,
                  payload: {
                    category: convertValues.category,
                    sale_price_ars: Number(convertValues.sale_price_ars),
                    warranty_days: Number(convertValues.warranty_days),
                    imei: convertValues.imei || selected.imei,
                  },
                })
              }}
            >
              Confirmar
            </Button>
          </>
        }
      >
        <Field label="Categoría">
          <Input value={convertValues.category} onChange={(e) => setConvertValues({ ...convertValues, category: e.target.value })} />
        </Field>
        <Field label="Precio venta ARS">
          <Input
            type="number"
            value={convertValues.sale_price_ars}
            onChange={(e) => setConvertValues({ ...convertValues, sale_price_ars: e.target.value })}
          />
        </Field>
        <Field label="Warranty días">
          <Input
            type="number"
            value={convertValues.warranty_days}
            onChange={(e) => setConvertValues({ ...convertValues, warranty_days: e.target.value })}
          />
        </Field>
        <Field label="IMEI">
          <Input value={convertValues.imei} onChange={(e) => setConvertValues({ ...convertValues, imei: e.target.value })} />
        </Field>
      </Modal>
    </div>
  )
}
