import type { StockItem } from '../../types'
import { Badge } from '../ui/Badge'
import { cn } from '../../lib/utils'

type StockListItemProps = {
  item: StockItem & {
    storage_gb?: number | null
    color?: string | null
    battery_pct?: number | null
    sale_price_usd?: number | null
  }
  onClick: () => void
}

export function StockListItem({ item, onClick }: StockListItemProps) {
  const hasPrice = Boolean(item.sale_price_ars)
  const marginPct =
    item.purchase_ars && item.sale_price_ars
      ? ((item.sale_price_ars - item.purchase_ars) / item.sale_price_ars) * 100
      : null
  const conditionLabel: Record<string, string> = {
    new: 'Nuevo',
    like_new: 'Como nuevo',
    used: 'Usado',
    outlet: 'Outlet',
  }
  const statusLabel: Record<string, string> = {
    available: 'Disponible',
    reserved: 'Reservado',
    sold: 'Vendido',
  }
  const marginTone =
    marginPct == null
      ? 'text-[#5B677A]'
      : marginPct > 15
      ? 'text-[#166534]'
      : marginPct >= 8
      ? 'text-[#92400E]'
      : 'text-[#991B1B]'

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer flex-col gap-2 rounded-2xl border border-[#E6EBF2] bg-white p-4 text-left transition duration-200 hover:bg-[#F8FAFC] active:bg-[#EEF2F7]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-[#0F172A]">
              {item.model ? `${item.brand} ${item.model}` : item.brand}
            </h4>
            {item.storage_gb && (
              <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#5B677A]">
                {item.storage_gb} GB
              </span>
            )}
            {item.color && (
              <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#5B677A]">{item.color}</span>
            )}
          </div>
          <div className="mt-1 text-xs text-[#5B677A]">
            IMEI: {item.imei ?? 'Sin IMEI'} · {conditionLabel[item.condition] ?? item.condition}
            {item.battery_pct != null && ` · Batería ${item.battery_pct}%`}
          </div>
        </div>
        <div className="text-right">
          <div className={cn('text-sm font-semibold', hasPrice ? 'text-[#0F172A]' : 'text-[#F59E0B]')}>
            {hasPrice ? `$${item.sale_price_ars.toLocaleString('es-AR')}` : 'Sin precio'}
          </div>
          <div className="mt-1">
            <Badge label={statusLabel[item.status] ?? item.status} tone={item.status} />
          </div>
        </div>
      </div>

      <div className="text-xs text-[#5B677A]">
        {item.purchase_ars ? `Costo ARS $${item.purchase_ars.toLocaleString('es-AR')}` : 'Costo ARS —'}
        {marginPct != null && (
          <span className={cn('ml-2', marginTone)}>· Margen {marginPct.toFixed(1)}%</span>
        )}
      </div>
    </button>
  )
}
