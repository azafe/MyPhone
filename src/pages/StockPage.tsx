import { useMemo, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { fetchStock, setStockStatus, upsertStockItem } from '../services/stock'
import type { StockItem } from '../types'
import { Table } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { cn } from '../lib/utils'
import { useNavigate } from 'react-router-dom'

const schema = z.object({
  id: z.string().optional(),
  category: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().min(1),
  condition: z.string().min(1),
  imei: z.string().optional().nullable(),
  purchase_usd: z.coerce.number().min(0),
  fx_rate_used: z.coerce.number().min(0),
  purchase_ars: z.coerce.number().min(0),
  sale_price_ars: z.coerce.number().min(0),
  warranty_days: z.coerce.number().min(0),
  status: z.enum(['available', 'reserved', 'sold']).default('available'),
})

type FormValues = z.input<typeof schema>

export function StockPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({ status: '', category: '', query: '', condition: '' })
  const [open, setOpen] = useState(false)

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
      warranty_days: 90,
    },
  })

  const watched = form.watch(['purchase_usd', 'fx_rate_used', 'purchase_ars', 'sale_price_ars']) as Array<
    number | string | null | undefined
  >

  const purchaseArs = useMemo(() => {
    const [purchaseUsd, fx, purchaseArsValue] = watched
    const computed = Number(purchaseUsd || 0) * Number(fx || 0)
    return Number(purchaseArsValue ?? computed)
  }, [watched])

  const marginPct = useMemo(() => {
    const sale = Number(watched[3] || 0)
    if (!sale) return 0
    return ((sale - Number(purchaseArs || 0)) / sale) * 100
  }, [purchaseArs, watched])

  const mutation = useMutation({
    mutationFn: upsertStockItem,
    onSuccess: () => {
      toast.success('Equipo guardado')
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      setOpen(false)
      form.reset({ status: 'available', warranty_days: 90 })
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StockItem['status'] }) => setStockStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock'] }),
  })

  const onSubmit = (values: FormValues) => {
    const parsed = schema.parse(values)
    mutation.mutate({
      ...parsed,
      purchase_ars: parsed.purchase_ars || Number(parsed.purchase_usd) * Number(parsed.fx_rate_used),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Stock</h2>
          <p className="text-sm text-ink/60">Gestión rápida de equipos disponibles.</p>
        </div>
        <Button onClick={() => setOpen(true)}>Nuevo equipo</Button>
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

      <Table headers={['Equipo', 'Precio', 'Estado', 'Acciones']}>
        {isLoading ? (
          <tr>
            <td className="px-4 py-4 text-sm text-ink/60" colSpan={4}>
              Cargando...
            </td>
          </tr>
        ) : data.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-sm text-ink/60" colSpan={4}>
              Sin equipos en stock.
            </td>
          </tr>
        ) : (
          data.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-3">
                <div className="text-sm font-medium text-ink">
                  {item.brand} {item.model}
                </div>
                <div className="text-xs text-ink/50">{item.imei ?? 'Sin IMEI'}</div>
              </td>
              <td className="px-4 py-3 text-sm">
                <div>${item.sale_price_ars.toLocaleString('es-AR')}</div>
                <div className="text-xs text-ink/50">Costo ${item.purchase_ars.toLocaleString('es-AR')}</div>
              </td>
              <td className="px-4 py-3">
                <Badge label={item.status} tone={item.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      statusMutation.mutate({
                        id: item.id,
                        status: item.status === 'reserved' ? 'available' : 'reserved',
                      })
                    }
                  >
                    {item.status === 'reserved' ? 'Liberar' : 'Reservar'}
                  </Button>
                  <Button size="sm" onClick={() => navigate(`/sales/new?stock=${item.id}`)}>
                    Vender
                  </Button>
                </div>
              </td>
            </tr>
          ))
        )}
      </Table>

      <Modal
        open={open}
        title={form.watch('id') ? 'Editar equipo' : 'Nuevo equipo'}
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
        <form id="stock-form" className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          <Field label="Categoría">
            <Input {...form.register('category')} placeholder="Ej: iPhone, Android" />
          </Field>
          <Field label="Marca">
            <Input {...form.register('brand')} placeholder="Apple" />
          </Field>
          <Field label="Modelo">
            <Input {...form.register('model')} placeholder="iPhone 13" />
          </Field>
          <Field label="Condición">
            <Input {...form.register('condition')} placeholder="Nuevo / Usado" />
          </Field>
          <Field label="IMEI">
            <Input {...form.register('imei')} placeholder="Opcional" />
          </Field>
          <div className="hidden md:block" />
          <Field label="Costo USD">
            <Input type="number" step="0.01" {...form.register('purchase_usd')} />
          </Field>
          <Field label="Tipo de cambio">
            <Input type="number" step="0.01" {...form.register('fx_rate_used')} />
          </Field>
          <Field label="Costo ARS">
            <Input type="number" step="0.01" {...form.register('purchase_ars')} placeholder={purchaseArs.toFixed(0)} />
            <div className="text-xs text-ink/40">Auto: USD x TC = {purchaseArs.toFixed(0)}</div>
          </Field>
          <Field label="Precio venta ARS">
            <Input type="number" step="0.01" {...form.register('sale_price_ars')} />
          </Field>
          <Field label="Warranty (días)">
            <Input type="number" {...form.register('warranty_days')} />
          </Field>
          <div className="md:col-span-2">
            <div
              className={cn(
                'rounded-xl px-3 py-2 text-xs font-medium',
                marginPct > 20 ? 'bg-moss/15 text-moss' : marginPct >= 10 ? 'bg-sun/20 text-sun' : 'bg-rose/15 text-rose',
              )}
            >
              Margen estimado: {marginPct.toFixed(1)}%
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
