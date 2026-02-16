import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { deletePlanCanjeValue, fetchPlanCanjeValues, upsertPlanCanjeValue } from '../services/tradeins'
import type { PlanCanjeValue } from '../types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Table } from '../components/ui/Table'

const schema = z
  .object({
    id: z.string().optional(),
    model: z.string().min(1, 'Modelo requerido'),
    storage_gb: z.coerce.number().optional().nullable(),
    battery_min: z.coerce.number().min(0).max(100),
    battery_max: z.coerce.number().min(0).max(100),
    pct_of_reference: z.coerce.number().min(0).max(100).optional().nullable(),
    value_ars: z.coerce.number().min(0).optional().nullable(),
  })
  .superRefine((values, ctx) => {
    if (values.battery_min > values.battery_max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['battery_max'],
        message: 'battery_max debe ser mayor o igual a battery_min',
      })
    }

    if ((values.pct_of_reference == null || values.pct_of_reference <= 0) && (values.value_ars == null || values.value_ars <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pct_of_reference'],
        message: 'Definí porcentaje o valor fijo',
      })
    }
  })

function formatMoney(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `$${value.toLocaleString('es-AR')}`
}

export function PlanCanjePage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<PlanCanjeValue | null>(null)

  const rulesQuery = useQuery({
    queryKey: ['plan-canje'],
    queryFn: fetchPlanCanjeValues,
  })

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      battery_min: 85,
      battery_max: 100,
      pct_of_reference: 0,
      value_ars: 0,
    },
  })

  const upsertMutation = useMutation({
    mutationFn: upsertPlanCanjeValue,
    onSuccess: () => {
      toast.success(editing ? 'Regla actualizada' : 'Regla creada')
      queryClient.invalidateQueries({ queryKey: ['plan-canje'] })
      setEditing(null)
      form.reset({
        battery_min: 85,
        battery_max: 100,
        pct_of_reference: 0,
        value_ars: 0,
      })
    },
    onError: (error) => {
      const err = error as Error
      toast.error(err.message || 'No se pudo guardar regla')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deletePlanCanjeValue,
    onSuccess: () => {
      toast.success('Regla eliminada')
      queryClient.invalidateQueries({ queryKey: ['plan-canje'] })
    },
    onError: (error) => {
      const err = error as Error
      toast.error(err.message || 'No se pudo eliminar')
    },
  })

  const onSubmit = (values: unknown) => {
    const parsed = schema.parse(values)

    upsertMutation.mutate({
      id: parsed.id,
      model: parsed.model,
      storage_gb: parsed.storage_gb ?? null,
      battery_min: parsed.battery_min,
      battery_max: parsed.battery_max,
      pct_of_reference: parsed.pct_of_reference ?? null,
      value_ars: parsed.value_ars ?? null,
    })
  }

  const beginEdit = (rule: PlanCanjeValue) => {
    setEditing(rule)
    form.reset({
      id: rule.id,
      model: rule.model,
      storage_gb: rule.storage_gb ?? null,
      battery_min: rule.battery_min,
      battery_max: rule.battery_max,
      pct_of_reference: rule.pct_of_reference ?? null,
      value_ars: rule.value_ars ?? null,
    })
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Plan Canje</h2>
        <p className="text-sm text-[#5B677A]">Matriz editable de valuación por modelo/GB/rango de batería.</p>
      </div>

      <Card className="p-5">
        <h3 className="text-lg font-semibold text-[#0F172A]">{editing ? 'Editar regla' : 'Nueva regla'}</h3>
        <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={form.handleSubmit(onSubmit)}>
          <Field label="Modelo">
            <Input {...form.register('model')} placeholder="iPhone 13" />
          </Field>
          <Field label="GB (opcional)">
            <Input type="number" min={1} {...form.register('storage_gb')} />
          </Field>
          <Field label="Batería mín %">
            <Input type="number" min={0} max={100} {...form.register('battery_min')} />
          </Field>
          <Field label="Batería máx %">
            <Input type="number" min={0} max={100} {...form.register('battery_max')} />
          </Field>
          <Field label="% referencia (opcional)">
            <Input type="number" min={0} max={100} {...form.register('pct_of_reference')} />
          </Field>
          <Field label="Valor fijo ARS (opcional)">
            <Input type="number" min={0} {...form.register('value_ars')} />
          </Field>

          {Object.keys(form.formState.errors).length > 0 && (
            <div className="md:col-span-3 space-y-1 rounded-xl border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.06)] p-3 text-xs text-[#991B1B]">
              {form.formState.errors.model?.message && <p>{form.formState.errors.model.message}</p>}
              {form.formState.errors.battery_min?.message && <p>{form.formState.errors.battery_min.message}</p>}
              {form.formState.errors.battery_max?.message && <p>{form.formState.errors.battery_max.message}</p>}
              {form.formState.errors.pct_of_reference?.message && <p>{form.formState.errors.pct_of_reference.message}</p>}
            </div>
          )}

          <div className="md:col-span-3 flex flex-wrap gap-2">
            <Button type="submit" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? 'Guardando...' : 'Guardar regla'}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditing(null)
                  form.reset({
                    battery_min: 85,
                    battery_max: 100,
                    pct_of_reference: 0,
                    value_ars: 0,
                  })
                }}
              >
                Cancelar edición
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Table headers={['Modelo', 'GB', 'Batería %', '% Referencia', 'Valor fijo', 'Acciones']}>
        {rulesQuery.isLoading ? (
          <tr>
            <td className="px-4 py-6 text-sm text-[#5B677A]" colSpan={6}>
              Cargando reglas...
            </td>
          </tr>
        ) : (rulesQuery.data ?? []).length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-sm text-[#5B677A]" colSpan={6}>
              Sin reglas definidas.
            </td>
          </tr>
        ) : (
          (rulesQuery.data ?? []).map((rule) => (
            <tr key={rule.id}>
              <td className="px-4 py-3 text-sm">{rule.model}</td>
              <td className="px-4 py-3 text-sm">{rule.storage_gb ?? '—'}</td>
              <td className="px-4 py-3 text-sm">
                {rule.battery_min}% - {rule.battery_max}%
              </td>
              <td className="px-4 py-3 text-sm">{rule.pct_of_reference != null ? `${rule.pct_of_reference}%` : '—'}</td>
              <td className="px-4 py-3 text-sm">{formatMoney(rule.value_ars)}</td>
              <td className="px-4 py-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => beginEdit(rule)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => deleteMutation.mutate(rule.id)}>
                    Eliminar
                  </Button>
                </div>
              </td>
            </tr>
          ))
        )}
      </Table>
    </div>
  )
}
