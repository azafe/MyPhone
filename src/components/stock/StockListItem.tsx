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
  const saleUsd =
    item.sale_price_usd ??
    (item.sale_price_ars && item.fx_rate_used ? Number(item.sale_price_ars) / Number(item.fx_rate_used) : null)
  const hasPrice = Boolean(item.sale_price_ars || saleUsd)
  const conditionLabel: Record<string, string> = {
    new: 'Nuevo',
    like_new: 'Como nuevo',
    used: 'Usado',
    outlet: 'Outlet',
  }
  const categoryLabel: Record<string, string> = {
    new: 'Nuevo',
    promotion: 'Promoción',
    outlet: 'Outlet',
    used_premium: 'Usado Premium',
  }
  const statusLabel: Record<string, string> = {
    available: 'Disponible',
    reserved: 'Reservado',
    sold: 'Vendido',
  }
  const batteryValue = item.condition === 'new' ? 100 : item.battery_pct

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
              {item.imei ? ` - ${item.imei}` : ''}
            </h4>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#5B677A]">
            {item.storage_gb && (
              <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#5B677A]">
                {item.storage_gb} GB
              </span>
            )}
            {batteryValue != null && (
              <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#5B677A]">
                Batería {batteryValue}%
              </span>
            )}
            {(item.color_other ?? item.color) && (
              <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#5B677A]">
                {item.color_other ?? item.color}
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-[#5B677A]">
            {categoryLabel[item.category] ?? item.category} · {conditionLabel[item.condition] ?? item.condition}
          </div>
        </div>
        <div className="text-right">
          <div className={cn('text-sm font-semibold', hasPrice ? 'text-[#0F172A]' : 'text-[#F59E0B]')}>
            {hasPrice ? `USD ${Math.round(Number(saleUsd ?? 0)).toLocaleString('es-AR')}` : 'Sin precio'}
          </div>
          <div className="mt-1 text-xs text-[#5B677A]">
            {item.sale_price_ars ? `ARS $${item.sale_price_ars.toLocaleString('es-AR')}` : 'ARS —'}
          </div>
          <div className="mt-2">
            <Badge label={statusLabel[item.status] ?? item.status} tone={item.status} />
          </div>
        </div>
      </div>
    </button>
  )
}
