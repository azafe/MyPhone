import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { createWarranty, fetchWarranties, updateWarranty } from '../services/warranties'
import type { Warranty } from '../types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Table } from '../components/ui/Table'

const schema = z.object({
  warranty_date: z.string().min(1, 'Fecha requerida'),
  customer_name: z.string().min(1, 'Cliente requerido'),
  customer_phone: z.string().optional(),
  customer_dni: z.string().optional(),
  original_model: z.string().min(1, 'Equipo original requerido'),
  original_imei: z.string().min(4, 'IMEI original requerido'),
  failure: z.string().min(1, 'Falla requerida'),
  imei: z.string().min(4, 'IMEI caso requerido'),
  resolution: z.enum(['swap', 'repair', 'refund']),
  replacement_device_label: z.string().optional(),
  case_status: z.enum(['open', 'in_progress', 'closed']).default('open'),
  notes: z.string().optional(),
})

const caseStatusLabels: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'En proceso',
  closed: 'Cerrado',
}

export function WarrantiesPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [query, setQuery] = useState('')

  const warrantiesQuery = useQuery({
    queryKey: ['warranties', statusFilter, query],
    queryFn: () => fetchWarranties({ status: statusFilter || undefined, query: query || undefined }),
  })

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      warranty_date: new Date().toISOString().slice(0, 10),
      resolution: 'swap',
      case_status: 'open',
    },
  })

  const createMutation = useMutation({
    mutationFn: createWarranty,
    onSuccess: () => {
      toast.success('Caso de garantía creado')
      queryClient.invalidateQueries({ queryKey: ['warranties'] })
      form.reset({
        warranty_date: new Date().toISOString().slice(0, 10),
        resolution: 'swap',
        case_status: 'open',
      })
    },
    onError: (error) => {
      const err = error as Error
      toast.error(err.message || 'No se pudo crear el caso')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Warranty> }) => updateWarranty(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warranties'] }),
    onError: (error) => {
      const err = error as Error
      toast.error(err.message || 'No se pudo actualizar')
    },
  })

  const rows = warrantiesQuery.data ?? []

  const onSubmit = (values: unknown) => {
    const parsed = schema.parse(values)
    createMutation.mutate({
      warranty_date: parsed.warranty_date,
      customer_name: parsed.customer_name,
      customer_phone: parsed.customer_phone?.trim() || null,
      customer_dni: parsed.customer_dni?.trim() || null,
      original_model: parsed.original_model,
      original_imei: parsed.original_imei,
      failure: parsed.failure,
      imei: parsed.imei,
      issue_reason: parsed.failure,
      resolution: parsed.resolution,
      replacement_device_label: parsed.replacement_device_label?.trim() || null,
      case_status: parsed.case_status,
      notes: parsed.notes?.trim() || null,
      status: parsed.case_status === 'closed' ? 'expired' : 'active',
    })
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Garantías</h2>
        <p className="text-sm text-[#5B677A]">Casos por falla, resolución y equipo entregado.</p>
      </div>

      <Card className="p-5">
        <h3 className="text-lg font-semibold text-[#0F172A]">Nuevo caso</h3>
        <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={form.handleSubmit(onSubmit)}>
          <Field label="Fecha">
            <Input type="date" {...form.register('warranty_date')} />
          </Field>
          <Field label="Cliente">
            <Input {...form.register('customer_name')} />
          </Field>
          <Field label="Teléfono">
            <Input {...form.register('customer_phone')} />
          </Field>
          <Field label="DNI">
            <Input {...form.register('customer_dni')} />
          </Field>
          <Field label="Equipo original">
            <Input {...form.register('original_model')} placeholder="iPhone 13 128GB" />
          </Field>
          <Field label="IMEI original">
            <Input {...form.register('original_imei')} />
          </Field>
          <Field label="Falla">
            <Input {...form.register('failure')} placeholder="No carga / pantalla" />
          </Field>
          <Field label="IMEI caso">
            <Input {...form.register('imei')} />
          </Field>
          <Field label="Resolución">
            <Select {...form.register('resolution')}>
              <option value="swap">Swap</option>
              <option value="repair">Reparación</option>
              <option value="refund">Reintegro</option>
            </Select>
          </Field>
          <Field label="Equipo entregado (si swap)">
            <Input {...form.register('replacement_device_label')} />
          </Field>
          <Field label="Estado caso">
            <Select {...form.register('case_status')}>
              <option value="open">Abierto</option>
              <option value="in_progress">En proceso</option>
              <option value="closed">Cerrado</option>
            </Select>
          </Field>
          <Field label="Notas">
            <Input {...form.register('notes')} />
          </Field>

          {Object.keys(form.formState.errors).length > 0 && (
            <div className="md:col-span-3 space-y-1 rounded-xl border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.06)] p-3 text-xs text-[#991B1B]">
              {form.formState.errors.customer_name?.message && <p>{form.formState.errors.customer_name.message}</p>}
              {form.formState.errors.original_model?.message && <p>{form.formState.errors.original_model.message}</p>}
              {form.formState.errors.original_imei?.message && <p>{form.formState.errors.original_imei.message}</p>}
              {form.formState.errors.failure?.message && <p>{form.formState.errors.failure.message}</p>}
              {form.formState.errors.imei?.message && <p>{form.formState.errors.imei.message}</p>}
            </div>
          )}

          <div className="md:col-span-3">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Guardando...' : 'Guardar caso'}
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Input placeholder="Buscar cliente o IMEI" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">Todos los estados</option>
          <option value="open">Abierto</option>
          <option value="in_progress">En proceso</option>
          <option value="closed">Cerrado</option>
        </Select>
      </div>

      <Table headers={['Fecha', 'Cliente', 'Equipo original', 'Falla', 'Resolución', 'Estado', 'Acciones']}>
        {warrantiesQuery.isLoading ? (
          <tr>
            <td className="px-4 py-6 text-sm text-[#5B677A]" colSpan={7}>
              Cargando garantías...
            </td>
          </tr>
        ) : rows.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-sm text-[#5B677A]" colSpan={7}>
              Sin casos registrados.
            </td>
          </tr>
        ) : (
          rows.map((warranty) => {
            const status = warranty.case_status ?? 'open'
            return (
              <tr key={warranty.id}>
                <td className="px-4 py-3 text-sm">
                  {warranty.warranty_date ? new Date(warranty.warranty_date).toLocaleDateString('es-AR') : '—'}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div>{warranty.customer_name || '—'}</div>
                  <div className="text-xs text-[#5B677A]">{warranty.customer_phone || '—'}</div>
                </td>
                <td className="px-4 py-3 text-sm">
                  {warranty.original_model || '—'}
                  <div className="text-xs text-[#5B677A]">IMEI {warranty.original_imei || '—'}</div>
                </td>
                <td className="px-4 py-3 text-sm">{warranty.failure || warranty.issue_reason || '—'}</td>
                <td className="px-4 py-3 text-sm capitalize">{warranty.resolution || '—'}</td>
                <td className="px-4 py-3 text-sm">{caseStatusLabels[status] || status}</td>
                <td className="px-4 py-3 text-sm">
                  <Select
                    className="h-9"
                    value={status}
                    onChange={(event) =>
                      updateMutation.mutate({
                        id: warranty.id,
                        payload: {
                          case_status: event.target.value as 'open' | 'in_progress' | 'closed',
                          status: event.target.value === 'closed' ? 'expired' : 'active',
                        },
                      })
                    }
                  >
                    <option value="open">Abierto</option>
                    <option value="in_progress">En proceso</option>
                    <option value="closed">Cerrado</option>
                  </Select>
                </td>
              </tr>
            )
          })
        )}
      </Table>
    </div>
  )
}
