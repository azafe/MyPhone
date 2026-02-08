import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchFinanceSummary } from '../services/finance'
import { StatCard } from '../components/ui/StatCard'
import { Input } from '../components/ui/Input'
import { Table } from '../components/ui/Table'
import { Card } from '../components/ui/Card'

function toISO(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function FinancePage() {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const [from, setFrom] = useState(toISO(firstDay))
  const [to, setTo] = useState(toISO(now))

  const { data } = useQuery({
    queryKey: ['finance', from, to],
    queryFn: () => fetchFinanceSummary(from, to),
  })

  const mixRows = useMemo(() => data?.payment_mix ?? [], [data])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Finanzas</h2>
        <p className="text-sm text-[#5B677A]">Resumen por fechas.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Desde</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Hasta</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Ventas" value={`$ ${data?.sales_month?.toLocaleString('es-AR') ?? 0}`} />
        <StatCard label="Margen" value={`$ ${data?.margin_month?.toLocaleString('es-AR') ?? 0}`} />
        <StatCard label="Permutas abiertas" value={`${data?.open_tradeins ?? 0}`} />
      </div>

      <Card className="p-5">
        <h3 className="text-lg font-semibold text-[#0F172A]">Mix de pagos</h3>
        <div className="mt-4">
          <Table headers={['Método', 'Total']}>
            {mixRows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-[#5B677A]" colSpan={2}>
                  Sin datos para el período.
                </td>
              </tr>
            ) : (
              mixRows.map((row) => (
                <tr key={row.method}>
                  <td className="px-4 py-3 text-sm capitalize">{row.method}</td>
                  <td className="px-4 py-3 text-sm">${row.total.toLocaleString('es-AR')}</td>
                </tr>
              ))
            )}
          </Table>
        </div>
      </Card>
    </div>
  )
}
