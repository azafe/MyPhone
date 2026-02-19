import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchFinanceSummary } from '../services/finance'
import type { FinanceSummary } from '../types'
import { StatCard } from '../components/ui/StatCard'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Table } from '../components/ui/Table'
import { Card } from '../components/ui/Card'

type QuickRange = 'today' | 'last7' | 'month'

function toISO(date: Date) {
  return date.toISOString().slice(0, 10)
}

function resolveRange(range: QuickRange) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (range === 'today') {
    return {
      from: toISO(today),
      to: toISO(today),
    }
  }

  if (range === 'last7') {
    const start = new Date(today)
    start.setDate(today.getDate() - 6)
    return {
      from: toISO(start),
      to: toISO(today),
    }
  }

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  return {
    from: toISO(monthStart),
    to: toISO(today),
  }
}

function downloadCsv(filename: string, rows: string[][]) {
  const escapeCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
  const csv = rows.map((row) => row.map((cell) => escapeCell(cell)).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function FinancePage() {
  const defaultRange = resolveRange('month')
  const [quickRange, setQuickRange] = useState<QuickRange>('month')
  const [from, setFrom] = useState(defaultRange.from)
  const [to, setTo] = useState(defaultRange.to)

  const applyQuickRange = (range: QuickRange) => {
    setQuickRange(range)
    const next = resolveRange(range)
    setFrom(next.from)
    setTo(next.to)
  }

  const financeQuery = useQuery({
    queryKey: ['finance', from, to],
    queryFn: () => fetchFinanceSummary(from, to),
  })

  const summary = (financeQuery.data ?? null) as Partial<FinanceSummary> | null

  const mixRows = Array.isArray(summary?.payment_mix) ? summary.payment_mix : []

  const totalSales = summary ? Number(summary.sales_total ?? summary.sales_month ?? 0) : null
  const salesCount = summary ? Number(summary.sales_count ?? summary.total_sales_count ?? summary.orders_count ?? 0) : null
  const estimatedMargin = summary ? Number(summary.margin_total ?? summary.margin_month ?? 0) : null
  const avgTicket =
    summary && salesCount != null && totalSales != null
      ? Number(summary.ticket_avg ?? summary.avg_ticket ?? 0) || (salesCount > 0 ? totalSales / salesCount : 0)
      : null

  const formatArs = (value: number | null) => (value == null ? '—' : `$ ${value.toLocaleString('es-AR')}`)
  const formatCount = (value: number | null) => (value == null ? '—' : value.toLocaleString('es-AR'))

  const handleExportCsv = () => {
    if (!summary || totalSales == null || salesCount == null || estimatedMargin == null || avgTicket == null) {
      return
    }

    const rows: string[][] = [
      ['Métrica', 'Valor'],
      ['Desde', from],
      ['Hasta', to],
      ['Ventas totales', String(totalSales)],
      ['Cantidad de ventas', String(salesCount)],
      ['Margen estimado', String(estimatedMargin)],
      ['Ticket promedio', String(Math.round(avgTicket))],
      [],
      ['Mix de pagos', ''],
      ['Método', 'Total'],
      ...mixRows.map((row) => [row.method, String(row.total)]),
    ]
    downloadCsv(`finance-${from}-to-${to}.csv`, rows)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Finanzas</h2>
          <p className="text-sm text-[#5B677A]">Resumen ejecutivo por período.</p>
        </div>
        <Button
          variant="secondary"
          onClick={handleExportCsv}
          disabled={!summary || financeQuery.isLoading || Boolean(financeQuery.error)}
        >
          Exportar CSV
        </Button>
      </div>

      {financeQuery.error ? (
        <div className="rounded-xl border border-[rgba(185,28,28,0.2)] bg-[rgba(185,28,28,0.08)] px-4 py-3 text-sm text-[#B91C1C]">
          No se pudieron cargar métricas: {(financeQuery.error as Error).message}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Rango rápido</label>
          <Select value={quickRange} onChange={(e) => applyQuickRange(e.target.value as QuickRange)}>
            <option value="today">Hoy</option>
            <option value="last7">Últimos 7 días</option>
            <option value="month">Mes actual</option>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Desde</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Hasta</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ventas totales" value={formatArs(totalSales)} />
        <StatCard label="Cantidad de ventas" value={formatCount(salesCount)} />
        <StatCard label="Margen estimado" value={formatArs(estimatedMargin)} />
        <StatCard label="Ticket promedio" value={avgTicket == null ? '—' : `$ ${Math.round(avgTicket).toLocaleString('es-AR')}`} />
      </div>

      <Card className="p-5">
        <h3 className="text-lg font-semibold text-[#0F172A]">Mix de pagos</h3>
        <div className="mt-4">
          <Table headers={['Método', 'Total']}>
            {financeQuery.isLoading ? (
              <tr>
                <td className="px-4 py-6 text-sm text-[#5B677A]" colSpan={2}>
                  Cargando métricas...
                </td>
              </tr>
            ) : mixRows.length === 0 ? (
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
