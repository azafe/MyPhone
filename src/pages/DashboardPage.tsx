import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchFinanceSummary } from '../services/finance'
import { fetchSales } from '../services/sales'
import { fetchStock } from '../services/stock'
import { KpiGrid } from '../components/dashboard/KpiGrid'
import { StatusMiniCards } from '../components/dashboard/StatusMiniCards'
import { PerformanceCard } from '../components/dashboard/PerformanceCard'

export function DashboardPage() {
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

  return (
    <div className="space-y-6 pb-6 md:pb-0">
      <div>
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#0F172A] md:text-2xl">Panel principal</h2>
        <p className="text-sm text-[#5B677A]">Tu mostrador en un vistazo.</p>
      </div>

      <PerformanceCard sales={sales} />

      <KpiGrid
        salesArs={salesMonth}
        salesUsd={salesMonthUsd}
        marginArs={marginMonth}
        units={soldThisMonth}
        stockAvailable={availableCount}
      />

      <StatusMiniCards available={availableCount} reserved={reservedCount} />
    </div>
  )
}
