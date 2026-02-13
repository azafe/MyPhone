import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { StatCard } from '../components/ui/StatCard'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { fetchFinanceSummary } from '../services/finance'
import { fetchSales } from '../services/sales'
import { fetchStock } from '../services/stock'

export function DashboardPage() {
  const navigate = useNavigate()
  const [range, setRange] = useState<'7d' | '30d' | '12m'>('7d')
  const [metric, setMetric] = useState<'usd' | 'units'>('usd')
  const now = new Date()
  const monthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now])
  const from = monthStart.toISOString().slice(0, 10)
  const to = now.toISOString().slice(0, 10)

  const { data: finance } = useQuery({
    queryKey: ['finance', from, to],
    queryFn: () => fetchFinanceSummary(from, to),
  })

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', 'month'],
    queryFn: () => fetchSales(),
  })

  const { data: stock = [] } = useQuery({
    queryKey: ['stock', 'dashboard'],
    queryFn: () => fetchStock(),
  })

  const availableCount = useMemo(
    () => stock.filter((item) => item.status === 'available').length,
    [stock],
  )
  const reservedCount = useMemo(
    () => stock.filter((item) => item.status === 'reserved').length,
    [stock],
  )

  const soldThisMonth = useMemo(() => {
    const start = new Date(from)
    const end = new Date()
    return sales.filter((sale) => {
      const raw = (sale as { sale_date?: string; created_at?: string }).sale_date ?? sale.created_at
      if (!raw) return false
      const date = new Date(raw)
      return date >= start && date <= end
    }).length
  }, [sales, from, to])

  const salesMonth = finance?.sales_month ?? 0
  const salesMonthUsd = finance?.sales_month_usd ?? null
  const marginMonth = finance?.margin_month ?? 0

  const fxRate = useMemo(() => {
    if (typeof window === 'undefined') return 0
    const raw = Number(localStorage.getItem('myphone_fx_rate') ?? 0)
    return Number.isFinite(raw) ? raw : 0
  }, [])

  const series = useMemo(() => {
    const buckets: Array<{ key: string; label: string; value: number }> = []
    const today = new Date()
    if (range === '12m') {
      for (let i = 11; i >= 0; i -= 1) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`
        buckets.push({ key, label, value: 0 })
      }
    } else {
      const days = range === '7d' ? 7 : 30
      for (let i = days - 1; i >= 0; i -= 1) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
        buckets.push({ key, label, value: 0 })
      }
    }

    const bucketMap = new Map(buckets.map((b) => [b.key, b]))
    sales.forEach((sale) => {
      const raw = (sale as { sale_date?: string; created_at?: string }).sale_date ?? sale.created_at
      if (!raw) return
      const date = new Date(raw)
      const key =
        range === '12m'
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          : date.toISOString().slice(0, 10)
      const bucket = bucketMap.get(key)
      if (!bucket) return
      if (metric === 'units') {
        bucket.value += 1
      } else {
        if (!fxRate) return
        bucket.value += Number(sale.total_ars || 0) / fxRate
      }
    })
    return buckets
  }, [sales, range, metric, fxRate])

  const maxValue = useMemo(() => Math.max(0, ...series.map((point) => point.value)), [series])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Panel principal</h2>
          <p className="text-sm text-[#5B677A]">Tu mostrador en un vistazo.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/sales/new')}>
            Nueva venta
          </Button>
          <Button variant="secondary" onClick={() => navigate('/stock')}>
            Ver stock
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Equipos vendidos (mes)" value={`${soldThisMonth}`} helper="Cantidad de ventas del mes" />
        <StatCard
          label="Total ventas (mes)"
          value={`$ ${salesMonth.toLocaleString('es-AR')}`}
          helper={salesMonthUsd != null ? `USD ${salesMonthUsd.toLocaleString('es-AR')}` : 'USD no disponible'}
        />
        <StatCard label="Margen estimado (mes)" value={`$ ${marginMonth.toLocaleString('es-AR')}`} helper="Ventas - costo estimado" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-[#0F172A]">Atajos rápidos</h3>
          <div className="mt-3 grid gap-2">
            <button
              type="button"
              onClick={() => navigate('/tradeins')}
              className="rounded-xl border border-[#E6EBF2] px-4 py-3 text-left text-sm text-[#0F172A] transition hover:bg-[#F8FAFC]"
            >
              Nueva permuta sin venta
            </button>
            <button
              type="button"
              onClick={() => navigate('/installments')}
              className="rounded-xl border border-[#E6EBF2] px-4 py-3 text-left text-sm text-[#0F172A] transition hover:bg-[#F8FAFC]"
            >
              Calculadora de cuotas
            </button>
            <button
              type="button"
              onClick={() => navigate('/warranties')}
              className="rounded-xl border border-[#E6EBF2] px-4 py-3 text-left text-sm text-[#0F172A] transition hover:bg-[#F8FAFC]"
            >
              Buscar garantía
            </button>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-lg font-semibold text-[#0F172A]">Estado general</h3>
          <ul className="mt-3 space-y-2 text-sm text-[#5B677A]">
            <li>Stock disponible: {availableCount}</li>
            <li>Equipos reservados: {reservedCount}</li>
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#0F172A]">Ventas diarias</h3>
            <p className="text-xs text-[#5B677A]">
              {metric === 'usd'
                ? fxRate
                  ? `USD estimado (TC ${fxRate})`
                  : 'Definí el TC en Stock para ver USD'
                : 'Cantidad de equipos vendidos'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={metric === 'usd' ? 'primary' : 'secondary'}
              onClick={() => setMetric('usd')}
            >
              USD
            </Button>
            <Button
              size="sm"
              variant={metric === 'units' ? 'primary' : 'secondary'}
              onClick={() => setMetric('units')}
            >
              Unidades
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant={range === '7d' ? 'primary' : 'secondary'} onClick={() => setRange('7d')}>
            Últimos 7 días
          </Button>
          <Button size="sm" variant={range === '30d' ? 'primary' : 'secondary'} onClick={() => setRange('30d')}>
            Últimos 30 días
          </Button>
          <Button size="sm" variant={range === '12m' ? 'primary' : 'secondary'} onClick={() => setRange('12m')}>
            Últimos 12 meses
          </Button>
        </div>

        <div className="mt-6">
          <div className="flex h-44 items-end gap-2">
            {series.map((point) => {
              const percent = maxValue ? (point.value / maxValue) * 100 : 0
              const height = point.value > 0 ? Math.max(percent, 6) : 0
              return (
                <div key={point.key} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-36 w-full items-end rounded-xl bg-[#F1F5F9] p-1">
                    <div
                      className="w-full rounded-lg bg-[#0B4AA2]"
                      style={{ height: `${height}%` }}
                      title={`${point.label}: ${metric === 'units' ? point.value : point.value.toFixed(0)}${
                        metric === 'units' ? '' : ' USD'
                      }`}
                    />
                  </div>
                  <div className="text-[10px] text-[#5B677A]">{point.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}
