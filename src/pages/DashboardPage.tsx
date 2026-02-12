import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { StatCard } from '../components/ui/StatCard'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { fetchFinanceSummary } from '../services/finance'
import { fetchSales } from '../services/sales'

export function DashboardPage() {
  const navigate = useNavigate()
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
  const marginMonth = finance?.margin_month ?? 0

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
        <StatCard label="Total ventas (mes)" value={`$ ${salesMonth.toLocaleString('es-AR')}`} helper="Consolidado por API" />
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
            <li>Permutas abiertas: {finance?.open_tradeins ?? 0}</li>
            <li>Stock disponible: 0</li>
            <li>Equipos reservados: 0</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
