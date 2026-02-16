import { useNavigate } from 'react-router-dom'

const sections = [
  { to: '/stock', title: 'Stock', description: 'Control diario de equipos, estados y promo.' },
  { to: '/sales', title: 'Ventas', description: 'Registro y listado por fecha/vendedor.' },
  { to: '/tradeins', title: 'Permutas', description: 'Ingreso por canje y conversión a stock.' },
  { to: '/warranties', title: 'Garantías', description: 'Seguimiento de casos y resoluciones.' },
  { to: '/plan-canje', title: 'Plan Canje', description: 'Tabla editable de valuación.' },
  { to: '/calculator', title: 'Calculadora', description: 'Cuotas con/sin Mercado Pago.' },
]

export function DashboardPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Dashboard operativo</h2>
        <p className="text-sm text-[#5B677A]">Accesos rápidos del MVP para la operación diaria.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <button
            key={section.to}
            type="button"
            onClick={() => navigate(section.to)}
            className="rounded-2xl border border-[#E6EBF2] bg-white p-5 text-left shadow-[0_1px_2px_rgba(16,24,40,0.06)] transition hover:bg-[#F8FAFC]"
          >
            <h3 className="text-lg font-semibold text-[#0F172A]">{section.title}</h3>
            <p className="mt-2 text-sm text-[#5B677A]">{section.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
