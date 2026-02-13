import { useQuery } from '@tanstack/react-query'
import { fetchSales } from '../services/sales'
import { PerformanceCard } from '../components/dashboard/PerformanceCard'
import { KpiGrid } from '../components/dashboard/KpiGrid'
import { useDashboardKpis } from '../components/dashboard/useDashboardKpis'

export function DashboardPage() {
  const { data: sales = [] } = useQuery({
    queryKey: ['sales', 'month'],
    queryFn: () => fetchSales(),
  })

  const { items } = useDashboardKpis()

  return (
    <div className="space-y-6 pb-6 md:pb-0">
      <PerformanceCard sales={sales} />

      <KpiGrid items={items} />
    </div>
  )
}
