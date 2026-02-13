import { useMemo, useRef, useState, useEffect } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import type { Sale } from '../../types'
import { SegmentedControl } from './SegmentedControl'
import { formatARS, formatPercent, formatUnits, formatUSD } from './formatters'
import { computeComparison } from './comparison'

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

function buildBuckets(range: PerformanceRange, now: Date, useWeekly: boolean, offset = 0): Bucket[] {
  const buckets: Bucket[] = []
  if (range === '12m') {
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i - offset, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = monthLabels[d.getMonth()]
      buckets.push({ key, label, value: 0 })
    }
    return buckets
  }

  const days = range === '7d' ? 7 : 30
  const start = new Date(now)
  start.setDate(now.getDate() - (days - 1 + offset * days))

  if (range === '30d' && useWeekly) {
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
    const d = new Date(start)
    d.setDate(start.getDate() + (days - 1 - i))
    const key = d.toISOString().slice(0, 10)
    const label = `${String(d.getDate()).padStart(2, '0')} ${monthLabels[d.getMonth()]}`
    buckets.push({ key, label, value: 0 })
  }
  return buckets
}

function computeTotal(buckets: Bucket[]) {
  return buckets.reduce((acc, bucket) => acc + bucket.value, 0)
}

function resolveBucketKey(
  date: Date,
  range: PerformanceRange,
  now: Date,
  useWeekly: boolean,
  offset = 0,
) {
  if (range === '12m') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  if (range === '30d' && useWeekly) {
    const days = 30
    const start = new Date(now)
    start.setDate(now.getDate() - (days - 1 + offset * days))
    const diffDays = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0 || diffDays > days - 1) return null
    const weekIndex = Math.floor(diffDays / 7)
    const weekStart = new Date(start)
    weekStart.setDate(start.getDate() + weekIndex * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    return `${weekStart.toISOString().slice(0, 10)}_${weekEnd.toISOString().slice(0, 10)}`
  }

  return date.toISOString().slice(0, 10)
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

  const { buckets, previousBuckets } = useMemo(() => {
    const useWeekly = range === '30d' && width > 0 && width < 360
    const currentBuckets = buildBuckets(range, now, useWeekly, 0)
    const previousBuckets = buildBuckets(range, now, useWeekly, 1)
    const currentMap = new Map(currentBuckets.map((bucket) => [bucket.key, bucket]))
    const previousMap = new Map(previousBuckets.map((bucket) => [bucket.key, bucket]))

    sales.forEach((sale) => {
      const raw = (sale as { sale_date?: string; created_at?: string }).sale_date ?? sale.created_at
      if (!raw) return
      const date = new Date(raw)

      const currentKey = resolveBucketKey(date, range, now, useWeekly, 0)
      if (currentKey) {
        const bucket = currentMap.get(currentKey)
        if (bucket) {
          const amountArs = Number(sale.total_ars || 0)
          if (metric === 'units') bucket.value += 1
          else bucket.value += showUsd ? amountArs / fxRate : amountArs
        }
      }

      const previousKey = resolveBucketKey(date, range, now, useWeekly, 1)
      if (previousKey) {
        const bucket = previousMap.get(previousKey)
        if (bucket) {
          const amountArs = Number(sale.total_ars || 0)
          if (metric === 'units') bucket.value += 1
          else bucket.value += showUsd ? amountArs / fxRate : amountArs
        }
      }
    })

    return { buckets: currentBuckets, previousBuckets }
  }, [sales, range, metric, fxRate, showUsd, width, now])

  const total = useMemo(() => computeTotal(buckets), [buckets])
  const previousTotal = useMemo(() => computeTotal(previousBuckets), [previousBuckets])
  const comparison = useMemo(() => computeComparison(total, previousTotal), [total, previousTotal])
  const updatedAt = useMemo(() => new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }), [])

  const empty = buckets.every((bucket) => bucket.value === 0)

  const displayTitle = metric === 'units' ? 'Unidades' : 'Ventas'
  const displayValue = metric === 'units' ? formatUnits(total) : showUsd ? formatUSD(total) : formatARS(total)
  const subtitle = metric === 'units' ? '' : showUsd ? 'USD' : 'ARS'

  return (
    <div className="rounded-2xl border border-[#E6EBF2] bg-white px-4 py-5 shadow-[0_6px_20px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-2">
        <div className="text-sm font-semibold text-[#0F172A]">{displayTitle}</div>
        <div className="flex items-end gap-2">
          <div className="text-3xl font-semibold text-[#0B4AA2]">{displayValue}</div>
          {subtitle && <span className="text-xs text-[#5B677A]">{subtitle}</span>}
        </div>
        <div className="text-xs text-[#5B677A]">
          {range === '7d' ? 'Últimos 7 días' : range === '30d' ? 'Últimos 30 días' : 'Últimos 12 meses'}
        </div>
        {comparison && (
          <div
            className={`text-xs font-medium ${
              comparison.direction === 'up' ? 'text-[#166534]' : 'text-[#991B1B]'
            }`}
          >
            {comparison.direction === 'up' ? '↑' : '↓'} {formatPercent(Math.abs(comparison.pct))} vs período anterior
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <SegmentedControl
          value={metric}
          onChange={setMetric}
          ariaLabel="Métrica"
          options={[
            { label: 'Ventas', value: 'usd' },
            { label: 'Unidades', value: 'units' },
          ]}
        />
        <SegmentedControl
          value={range}
          onChange={setRange}
          ariaLabel="Rango"
          options={[
            { label: '7D', value: '7d' },
            { label: '30D', value: '30d' },
            { label: '12M', value: '12m' },
          ]}
        />
      </div>

      <div className="mt-4" ref={ref}>
        {empty ? (
          <div className="rounded-xl border border-[#E6EBF2] bg-[#F8FAFC] px-4 py-6 text-center text-sm text-[#5B677A]">
            Sin datos en este período.
          </div>
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ top: 12, right: 6, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.2)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(11,74,162,0.08)' }}
                  contentStyle={{
                    background: '#FFFFFF',
                    border: '1px solid #E6EBF2',
                    borderRadius: 10,
                    color: '#0F172A',
                    boxShadow: '0 6px 16px rgba(15,23,42,0.12)',
                    padding: '6px 10px',
                  }}
                  formatter={(value, name, item) => {
                    const numeric = typeof value === 'number' ? value : 0
                    const title = item?.payload?.label ?? ''
                    const formatted = metric === 'units' ? `${formatUnits(numeric)} unidades` : showUsd ? formatUSD(numeric) : formatARS(numeric)
                    return [formatted, title]
                  }}
                  labelStyle={{ display: 'none' }}
                />
                <Bar dataKey="value" fill="var(--brand)" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="mt-3 text-[11px] text-[#94A3B8]">Actualizado {updatedAt}</div>
    </div>
  )
}

export const performanceHelpers = {
  buildBuckets,
  computeTotal,
}
