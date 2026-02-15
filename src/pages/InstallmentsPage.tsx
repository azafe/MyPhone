import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchInstallmentRules, upsertInstallmentRule } from '../services/installments'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Table } from '../components/ui/Table'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from '../hooks/useAuth'

export function InstallmentsPage() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const { data: rules = [] } = useQuery({
    queryKey: ['installment_rules'],
    queryFn: fetchInstallmentRules,
  })

  const [priceUsd, setPriceUsd] = useState('0')
  const [usdRate, setUsdRate] = useState('0')
  const [brand, setBrand] = useState('')
  const [channel, setChannel] = useState<'standard' | 'mercado_pago'>('standard')
  const [mpExtraPct, setMpExtraPct] = useState('0')
  const [editRule, setEditRule] = useState({
    channel: 'standard',
    card_brand: '',
    installments: '3',
    surcharge_pct: '0',
  })

  const mutation = useMutation({
    mutationFn: upsertInstallmentRule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['installment_rules'] }),
  })

  const tableRows = useMemo(() => {
    const base = Number(priceUsd || 0) * Number(usdRate || 0)
    const mpExtra = channel === 'mercado_pago' ? Number(mpExtraPct || 0) : 0
    return [3, 6, 9, 12].map((installments) => {
      const byChannel =
        rules.find(
          (r) =>
            r.card_brand === brand &&
            r.installments === installments &&
            (r.channel ?? 'standard') === channel,
        ) ??
        rules.find((r) => r.card_brand === brand && r.installments === installments)
      const surcharge = (byChannel?.surcharge_pct ?? 0) + mpExtra
      const total = base * (1 + surcharge / 100)
      return { installments, surcharge, total, monthly: installments > 0 ? total / installments : 0 }
    })
  }, [priceUsd, usdRate, brand, channel, mpExtraPct, rules])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Cuotas</h2>
        <p className="text-sm text-[#5B677A]">Calculadora y reglas por tarjeta.</p>
      </div>

      <Card className="p-5">
        <h3 className="text-lg font-semibold text-[#0F172A]">Calculadora</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Field label="Precio equipo USD">
            <Input value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)} />
          </Field>
          <Field label="Dólar ARS">
            <Input value={usdRate} onChange={(e) => setUsdRate(e.target.value)} />
          </Field>
          <Field label="Tarjeta">
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Visa / Master" />
          </Field>
          <Field label="Canal">
            <Select value={channel} onChange={(e) => setChannel(e.target.value as 'standard' | 'mercado_pago')}>
              <option value="standard">Sin Mercado Pago</option>
              <option value="mercado_pago">Con Mercado Pago</option>
            </Select>
          </Field>
          {channel === 'mercado_pago' && (
            <Field label="Cargo MP %">
              <Input value={mpExtraPct} onChange={(e) => setMpExtraPct(e.target.value)} placeholder="Ej: 10" />
            </Field>
          )}
        </div>

        <div className="mt-4">
          <Table headers={['Cuotas', 'Recargo', 'Total ARS', 'Cuota ARS']}>
            {tableRows.map((row) => (
              <tr key={row.installments}>
                <td className="px-4 py-3 text-sm">{row.installments}</td>
                <td className="px-4 py-3 text-sm">{row.surcharge}%</td>
                <td className="px-4 py-3 text-sm">${row.total.toLocaleString('es-AR')}</td>
                <td className="px-4 py-3 text-sm">${row.monthly.toLocaleString('es-AR')}</td>
              </tr>
            ))}
          </Table>
        </div>
      </Card>

      {profile?.role === 'admin' && (
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-[#0F172A]">Reglas (admin)</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            <Field label="Canal">
              <Select
                value={editRule.channel}
                onChange={(e) => setEditRule({ ...editRule, channel: e.target.value })}
              >
                <option value="standard">Sin Mercado Pago</option>
                <option value="mercado_pago">Con Mercado Pago</option>
              </Select>
            </Field>
            <Field label="Tarjeta">
              <Input
                value={editRule.card_brand}
                onChange={(e) => setEditRule({ ...editRule, card_brand: e.target.value })}
              />
            </Field>
            <Field label="Cuotas">
              <Select
                value={editRule.installments}
                onChange={(e) => setEditRule({ ...editRule, installments: e.target.value })}
              >
                <option value="3">3</option>
                <option value="6">6</option>
                <option value="9">9</option>
                <option value="12">12</option>
              </Select>
            </Field>
            <Field label="Recargo %">
              <Input
                value={editRule.surcharge_pct}
                onChange={(e) => setEditRule({ ...editRule, surcharge_pct: e.target.value })}
              />
            </Field>
            <Button
              onClick={() =>
                mutation.mutate({
                  channel: editRule.channel,
                  card_brand: editRule.card_brand,
                  installments: Number(editRule.installments),
                  surcharge_pct: Number(editRule.surcharge_pct),
                })
              }
            >
              Guardar regla
            </Button>
          </div>

          <div className="mt-4">
            <Table headers={['Canal', 'Tarjeta', 'Cuotas', 'Recargo']}>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td className="px-4 py-3 text-sm">{rule.channel === 'mercado_pago' ? 'Con MP' : 'Sin MP'}</td>
                  <td className="px-4 py-3 text-sm">{rule.card_brand}</td>
                  <td className="px-4 py-3 text-sm">{rule.installments}</td>
                  <td className="px-4 py-3 text-sm">{rule.surcharge_pct}%</td>
                </tr>
              ))}
            </Table>
          </div>
        </Card>
      )}
    </div>
  )
}
