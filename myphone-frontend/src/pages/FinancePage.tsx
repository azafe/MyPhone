import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchFinanceSummary } from '../services/finance'
import { StatCard } from '../components/ui/StatCard'
import { Input } from '../components/ui/Input'
import { Table } from '../components/ui/Table'

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
        <h2 className="text-2xl font-semibold text-ink">Finanzas</h2>
        <p className="text-sm text-ink/60">Resumen por fechas.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-ink/50">Desde</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-ink/50">Hasta</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Ventas" value={`$ ${data?.sales_month?.toLocaleString('es-AR') ?? 0}`} />
        <StatCard label="Margen" value={`$ ${data?.margin_month?.toLocaleString('es-AR') ?? 0}`} />
        <StatCard label="Permutas abiertas" value={`${data?.open_tradeins ?? 0}`} />
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft">
        <h3 className="text-lg font-semibold text-ink">Mix de pagos</h3>
        <div className="mt-4">
          <Table headers={['Método', 'Total']}>
            {mixRows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-ink/60" colSpan={2}>
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
      </div>
    </div>
  )
}
