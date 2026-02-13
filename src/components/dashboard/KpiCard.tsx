import { cn } from '../../lib/utils'

export type KpiStatus = 'normal' | 'warning' | 'danger'

type KpiCardProps = {
  title: string
  value: string
  subtitle?: string
  status?: KpiStatus
  trend?: string
  icon?: React.ReactNode
  onClick?: () => void
}

const statusStyles: Record<KpiStatus, string> = {
  normal: 'border-[#E6EBF2]',
  warning: 'border-[rgba(245,158,11,0.4)]',
  danger: 'border-[rgba(220,38,38,0.4)]',
}

export function KpiCard({ title, value, subtitle, status = 'normal', trend, icon, onClick }: KpiCardProps) {
  const clickable = Boolean(onClick)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full flex-col gap-2 rounded-[14px] border bg-white p-4 text-left shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition',
        statusStyles[status],
        clickable && 'hover:bg-[#F8FAFC]'
      )}
    >
      <div className="flex items-center justify-between text-xs text-[#5B677A]">
        <span className="font-semibold uppercase tracking-[0.2em]">{title}</span>
        {icon && <span className="text-[#0B4AA2]">{icon}</span>}
      </div>
      <div className="text-2xl font-semibold text-[#0F172A]">{value}</div>
      {subtitle && <div className="text-xs text-[#5B677A]">{subtitle}</div>}
      {trend && <div className="text-xs font-medium text-[#0B4AA2]">{trend}</div>}
    </button>
  )
}
