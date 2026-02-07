import { Link } from 'react-router-dom'
import { StatCard } from '../components/ui/StatCard'
import { cn } from '../lib/utils'

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Panel principal</h2>
          <p className="text-sm text-ink/60">Tu mostrador en un vistazo.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/sales/new"
            className={cn(
              'rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-soft hover:bg-black'
            )}
          >
            Nueva venta
          </Link>
          <Link
            to="/stock"
            className={cn(
              'rounded-xl border border-ink/10 bg-haze px-4 py-2.5 text-sm font-medium text-ink shadow-soft hover:bg-white'
            )}
          >
            Ver stock
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Ventas del mes" value="$ 0" helper="Consolidado por API" />
        <StatCard label="Margen estimado" value="$ 0" helper="Ventas - costo estimado" />
        <StatCard label="Permutas abiertas" value="0" helper="Pendientes de valoración" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-semibold text-ink">Atajos rápidos</h3>
          <div className="mt-3 grid gap-2">
            <Link to="/tradeins" className="rounded-xl border border-ink/10 px-4 py-3 text-sm">
              Nueva permuta sin venta
            </Link>
            <Link to="/installments" className="rounded-xl border border-ink/10 px-4 py-3 text-sm">
              Calculadora de cuotas
            </Link>
            <Link to="/warranties" className="rounded-xl border border-ink/10 px-4 py-3 text-sm">
              Buscar garantía
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-semibold text-ink">Estado general</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink/70">
            <li>Stock disponible: 0</li>
            <li>Equipos reservados: 0</li>
            <li>Garantías por vencer (7 días): 0</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
