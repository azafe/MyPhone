import { KpiCard, type KpiStatus } from './KpiCard'

export type KpiItem = {
  key: string
  title: string
  value: string
  subtitle?: string
  status?: KpiStatus
  trend?: string
  icon?: React.ReactNode
  onClick?: () => void
}

export function KpiGrid({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <KpiCard
          key={item.key}
          title={item.title}
          value={item.value}
          subtitle={item.subtitle}
          status={item.status}
          trend={item.trend}
          icon={item.icon}
          onClick={item.onClick}
        />
      ))}
    </div>
  )
}
