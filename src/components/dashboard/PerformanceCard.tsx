import { PerformanceChart } from './PerformanceChart'
import type { Sale } from '../../types'

export function PerformanceCard({ sales }: { sales: Sale[] }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold text-[#0F172A]">Rendimiento</h3>
        <p className="text-xs text-[#5B677A]">Ventas y unidades del período</p>
      </div>
      <PerformanceChart sales={sales} />
    </div>
  )
}
