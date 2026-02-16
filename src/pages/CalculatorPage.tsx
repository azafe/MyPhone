import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { fetchInstallmentRules, saveQuoteSnapshot } from '../services/installments'
import type { InstallmentMode, QuoteSnapshotPayload } from '../types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Table } from '../components/ui/Table'

function normalize(text: string) {
  return text.trim().toLowerCase()
}

export function CalculatorPage() {
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS')
  const [priceInput, setPriceInput] = useState('0')
  const [usdRateInput, setUsdRateInput] = useState('0')
  const [mode, setMode] = useState<InstallmentMode>('without_mp')
  const [cardBrand, setCardBrand] = useState('')

  const channel = mode === 'with_mp' ? 'mercado_pago' : 'standard'

  const rulesQuery = useQuery({
    queryKey: ['installment-rules', channel],
    queryFn: () => fetchInstallmentRules({ channel }),
  })

  const saveMutation = useMutation({
    mutationFn: saveQuoteSnapshot,
    onSuccess: () => toast.success('Cotización guardada'),
    onError: (error) => {
      const err = error as Error
      toast.error(err.message || 'No se pudo guardar la cotización')
    },
  })

  const basePrice = Number(priceInput || 0)
  const usdRate = Number(usdRateInput || 0)
  const basePriceArs = currency === 'ARS' ? basePrice : basePrice * (usdRate > 0 ? usdRate : 0)

  const rows = useMemo(() => {
    const installments = [1, 3, 6, 9, 12]
    const normalizedBrand = normalize(cardBrand)

    return installments.map((installment) => {
      const matchedRule = (rulesQuery.data ?? []).find((rule) => {
        if (rule.installments !== installment) return false
        if (!normalizedBrand) return true
        return normalize(rule.card_brand) === normalizedBrand
      })

      const surchargePct = Number(matchedRule?.surcharge_pct ?? 0)
      const total = basePriceArs * (1 + surchargePct / 100)
      const installmentArs = installment > 0 ? total / installment : total

      return {
        installments: installment,
        surchargePct,
        total,
        installmentArs,
      }
    })
  }, [basePriceArs, cardBrand, rulesQuery.data])

  const handleSaveQuote = () => {
    const payload: QuoteSnapshotPayload = {
      card_brand: cardBrand || 'General',
      mode,
      currency,
      base_price: basePrice,
      usd_rate: usdRate,
      rows: rows.map((row) => ({
        installments: row.installments,
        surcharge_pct: row.surchargePct,
        total_ars: Number(row.total.toFixed(2)),
        installment_ars: Number(row.installmentArs.toFixed(2)),
      })),
    }

    saveMutation.mutate(payload)
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Calculadora</h2>
        <p className="text-sm text-[#5B677A]">Con/sin Mercado Pago, tarjeta y cuotas con dólar actual.</p>
      </div>

      <Card className="p-5">
        <div className="grid gap-3 md:grid-cols-5">
          <Field label="Moneda precio">
            <Select value={currency} onChange={(event) => setCurrency(event.target.value as 'ARS' | 'USD')}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
          <Field label={`Precio (${currency})`}>
            <Input type="number" min={0} value={priceInput} onChange={(event) => setPriceInput(event.target.value)} />
          </Field>
          <Field label="Dólar actual">
            <Input type="number" min={0} value={usdRateInput} onChange={(event) => setUsdRateInput(event.target.value)} />
          </Field>
          <Field label="Modo">
            <Select value={mode} onChange={(event) => setMode(event.target.value as InstallmentMode)}>
              <option value="without_mp">Sin Mercado Pago</option>
              <option value="with_mp">Con Mercado Pago</option>
            </Select>
          </Field>
          <Field label="Tarjeta">
            <Input value={cardBrand} onChange={(event) => setCardBrand(event.target.value)} placeholder="Visa / Master" />
          </Field>
        </div>

        <div className="mt-4 rounded-xl border border-[#E6EBF2] bg-[#F8FAFC] p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Base ARS</p>
          <p className="mt-1 text-lg font-semibold text-[#0F172A]">${basePriceArs.toLocaleString('es-AR')}</p>
        </div>
      </Card>

      <Table headers={['Cuotas', 'Recargo %', 'Total ARS', 'Cuota ARS']}>
        {rows.map((row) => (
          <tr key={row.installments}>
            <td className="px-4 py-3 text-sm">{row.installments}</td>
            <td className="px-4 py-3 text-sm">{row.surchargePct.toFixed(2)}%</td>
            <td className="px-4 py-3 text-sm">${row.total.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</td>
            <td className="px-4 py-3 text-sm">${row.installmentArs.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</td>
          </tr>
        ))}
      </Table>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={handleSaveQuote} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Guardando...' : 'Guardar cotización (opcional)'}
        </Button>
      </div>
    </div>
  )
}
