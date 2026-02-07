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
    <div className={cn('rounded-2xl border border-ink/10 bg-white p-4 shadow-soft', className)}>
      <p className="text-xs uppercase tracking-[0.2em] text-ink/50">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      {helper && <p className="mt-2 text-xs text-ink/60">{helper}</p>}
    </div>
  )
}
