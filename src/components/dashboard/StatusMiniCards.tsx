import { formatUnits } from './formatters'

type StatusMiniCardsProps = {
  available: number
  reserved: number
}

export function StatusMiniCards({ available, reserved }: StatusMiniCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-[#E6EBF2] bg-white p-4 shadow-[0_6px_16px_rgba(15,23,42,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Stock</p>
        <div className="mt-2 text-2xl font-semibold text-[#0F172A]">{formatUnits(available)}</div>
        <p className="mt-1 text-xs text-[#5B677A]">Disponible</p>
      </div>
      <div className="rounded-2xl border border-[#E6EBF2] bg-white p-4 shadow-[0_6px_16px_rgba(15,23,42,0.06)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Reservas</p>
        <div className="mt-2 text-2xl font-semibold text-[#0F172A]">{formatUnits(reserved)}</div>
        <p className="mt-1 text-xs text-[#5B677A]">Equipos reservados</p>
      </div>
    </div>
  )
}
