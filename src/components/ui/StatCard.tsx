import { cn } from '../../lib/utils'

export function StatCard({
  label,
  value,
  helper,
  className,
}: {
  label: string
  value: string
  helper?: string
  className?: string
}) {
  return (
    <div className={cn('rounded-2xl border border-[#E6EBF2] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.06)]', className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-[#0F172A]">{value}</p>
      {helper && <p className="mt-2 text-xs text-[#5B677A]">{helper}</p>}
    </div>
  )
}
