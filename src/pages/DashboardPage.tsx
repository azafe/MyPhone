import { useQuery } from '@tanstack/react-query'
import { fetchSales } from '../services/sales'
import { PerformanceCard } from '../components/dashboard/PerformanceCard'

export function DashboardPage() {
  const { data: sales = [] } = useQuery({
    queryKey: ['sales', 'month'],
    queryFn: () => fetchSales(),
  })

  return (
    <div className="space-y-6 pb-6 md:pb-0">
      <PerformanceCard sales={sales} />
    </div>
  )
}
