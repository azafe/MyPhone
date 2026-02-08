import { useNavigate } from 'react-router-dom'
import { StatCard } from '../components/ui/StatCard'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

export function DashboardPage() {
  const navigate = useNavigate()

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
        <StatCard label="Ventas del mes" value="$ 0" helper="Consolidado por API" />
        <StatCard label="Margen estimado" value="$ 0" helper="Ventas - costo estimado" />
        <StatCard label="Permutas abiertas" value="0" helper="Pendientes de valoración" />
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
            <li>Stock disponible: 0</li>
            <li>Equipos reservados: 0</li>
            <li>Garantías por vencer (7 días): 0</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
