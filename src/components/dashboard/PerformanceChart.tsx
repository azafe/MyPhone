import { useMemo, useRef, useState, useEffect } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Button } from '../ui/Button'
import type { Sale } from '../../types'

export type PerformanceMetric = 'usd' | 'units'
export type PerformanceRange = '7d' | '30d' | '12m'

type Bucket = {
  key: string
  label: string
  value: number
}

type PerformanceChartProps = {
  sales: Sale[]
}

const monthLabels = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function formatCurrencyUSD(value: number) {
  return `$ ${value.toFixed(2)}`
}

function formatInt(value: number) {
  return value.toLocaleString('es-AR')
}

function useContainerWidth() {
  const ref = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (!ref.current) return
    const node = ref.current
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width)
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return { ref, width }
}

function buildBuckets(range: PerformanceRange, now: Date, useWeekly: boolean): Bucket[] {
  const buckets: Bucket[] = []
  if (range === '12m') {
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = monthLabels[d.getMonth()]
      buckets.push({ key, label, value: 0 })
    }
    return buckets
  }

  const days = range === '7d' ? 7 : 30
  if (range === '30d' && useWeekly) {
    const start = new Date(now)
    start.setDate(now.getDate() - (days - 1))
    let weekIndex = 1
    for (let i = 0; i < days; i += 7) {
      const weekStart = new Date(start)
      weekStart.setDate(start.getDate() + i)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      const key = `${weekStart.toISOString().slice(0, 10)}_${weekEnd.toISOString().slice(0, 10)}`
      buckets.push({ key, label: `Sem ${weekIndex}`, value: 0 })
      weekIndex += 1
    }
    return buckets
  }

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const label = `${String(d.getDate()).padStart(2, '0')} ${monthLabels[d.getMonth()]}`
    buckets.push({ key, label, value: 0 })
  }
  return buckets
}

function computeTotal(buckets: Bucket[]) {
  return buckets.reduce((acc, bucket) => acc + bucket.value, 0)
}

export function PerformanceChart({ sales }: PerformanceChartProps) {
  const [metric, setMetric] = useState<PerformanceMetric>('usd')
  const [range, setRange] = useState<PerformanceRange>('7d')
  const now = useMemo(() => new Date(), [])
  const { ref, width } = useContainerWidth()

  const fxRate = useMemo(() => {
    if (typeof window === 'undefined') return 0
    const raw = Number(localStorage.getItem('myphone_fx_rate') ?? 0)
    return Number.isFinite(raw) ? raw : 0
  }, [])

  const showUsd = metric === 'usd' && fxRate > 0
  const metricLabel = metric === 'units' ? 'Unidades' : showUsd ? 'Ventas (USD)' : 'Ventas (ARS)'

  const buckets = useMemo(() => {
    const useWeekly = range === '30d' && width > 0 && width < 720
    const baseBuckets = buildBuckets(range, now, useWeekly)
    const map = new Map(baseBuckets.map((bucket) => [bucket.key, bucket]))

    sales.forEach((sale) => {
      const raw = (sale as { sale_date?: string; created_at?: string }).sale_date ?? sale.created_at
      if (!raw) return
      const date = new Date(raw)
      let key = ''

      if (range === '12m') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      } else if (range === '30d' && useWeekly) {
        const start = new Date(now)
        start.setDate(now.getDate() - 29)
        const diffDays = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays < 0 || diffDays > 29) return
        const weekIndex = Math.floor(diffDays / 7)
        const weekStart = new Date(start)
        weekStart.setDate(start.getDate() + weekIndex * 7)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        key = `${weekStart.toISOString().slice(0, 10)}_${weekEnd.toISOString().slice(0, 10)}`
      } else {
        key = date.toISOString().slice(0, 10)
      }

      const bucket = map.get(key)
      if (!bucket) return
      if (metric === 'units') {
        bucket.value += 1
        return
      }
      const amountArs = Number(sale.total_ars || 0)
      if (showUsd) {
        bucket.value += amountArs / fxRate
      } else {
        bucket.value += amountArs
      }
    })

    return baseBuckets
  }, [sales, range, metric, fxRate, showUsd, width, now])

  const total = useMemo(() => computeTotal(buckets), [buckets])
  const updatedAt = useMemo(() => new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), [])

  const empty = buckets.every((bucket) => bucket.value === 0)

  return (
    <div className="rounded-2xl border border-[#1F2937] bg-[#111827] px-5 py-5 text-white">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">Rendimiento</p>
          <h3 className="mt-2 text-2xl font-semibold">{metricLabel}</h3>
          <p className="mt-2 text-sm text-white/60">
            {range === '7d' ? 'Últimos 7 días' : range === '30d' ? 'Últimos 30 días' : 'Últimos 12 meses'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-3xl font-semibold">
            {metric === 'units' ? formatInt(total) : formatCurrencyUSD(total)}
          </div>
          <div className="text-xs text-white/50">Comparación: —</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <div className="flex gap-2 rounded-full bg-white/10 p-1">
          <Button
            size="sm"
            variant={metric === 'usd' ? 'primary' : 'secondary'}
            onClick={() => setMetric('usd')}
          >
            Ventas (USD)
          </Button>
          <Button
            size="sm"
            variant={metric === 'units' ? 'primary' : 'secondary'}
            onClick={() => setMetric('units')}
          >
            Unidades
          </Button>
        </div>
        <div className="flex gap-2 rounded-full bg-white/10 p-1">
          <Button
            size="sm"
            variant={range === '7d' ? 'primary' : 'secondary'}
            onClick={() => setRange('7d')}
          >
            Últimos 7 días
          </Button>
          <Button
            size="sm"
            variant={range === '30d' ? 'primary' : 'secondary'}
            onClick={() => setRange('30d')}
          >
            Últimos 30 días
          </Button>
          <Button
            size="sm"
            variant={range === '12m' ? 'primary' : 'secondary'}
            onClick={() => setRange('12m')}
          >
            Últimos 12 meses
          </Button>
        </div>
      </div>

      <div className="mt-6" ref={ref}>
        {empty ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/60">
            Sin datos en este período.
          </div>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.08)' }}
                  contentStyle={{
                    background: '#0F172A',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    color: '#F8FAFC',
                  }}
                  formatter={(value: number) =>
                    metric === 'units'
                      ? [`${formatInt(value)} unidades`, metricLabel]
                      : [formatCurrencyUSD(value), metricLabel]
                  }
                />
                <Bar dataKey="value" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-white/50">Actualizado {updatedAt}</div>
    </div>
  )
}

export const performanceHelpers = {
  buildBuckets,
  computeTotal,
  formatCurrencyUSD,
  formatInt,
}
