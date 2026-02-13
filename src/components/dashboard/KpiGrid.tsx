import { formatARS, formatUnits, formatUSD } from './formatters'

type KpiGridProps = {
  salesArs: number
  salesUsd: number | null
  marginArs: number
  units: number
  stockAvailable: number
}

export function KpiGrid({ salesArs, salesUsd, marginArs, units, stockAvailable }: KpiGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-[#E6EBF2] bg-white p-4 shadow-[0_6px_16px_rgba(15,23,42,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Ventas</p>
        <div className="mt-2 text-2xl font-semibold text-[#0F172A]">{formatARS(salesArs)}</div>
        <p className="mt-1 text-xs text-[#5B677A]">
          {salesUsd != null ? formatUSD(salesUsd) : 'USD no disponible'}
        </p>
      </div>

      <div className="rounded-2xl border border-[#E6EBF2] bg-white p-4 shadow-[0_6px_16px_rgba(15,23,42,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Margen</p>
        <div className="mt-2 text-2xl font-semibold text-[#0F172A]">{formatARS(marginArs)}</div>
        <p className="mt-1 text-xs text-[#5B677A]">Estimado del período</p>
      </div>

      <div className="rounded-2xl border border-[#E6EBF2] bg-white p-4 shadow-[0_6px_16px_rgba(15,23,42,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Unidades</p>
        <div className="mt-2 text-2xl font-semibold text-[#0F172A]">{formatUnits(units)}</div>
        <p className="mt-1 text-xs text-[#5B677A]">Ventas del período</p>
      </div>

      <div className="rounded-2xl border border-[#E6EBF2] bg-white p-4 shadow-[0_6px_16px_rgba(15,23,42,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Stock disponible</p>
        <div className="mt-2 text-2xl font-semibold text-[#0F172A]">{formatUnits(stockAvailable)}</div>
        <p className="mt-1 text-xs text-[#5B677A]">Equipos listos</p>
      </div>
    </div>
  )
}
