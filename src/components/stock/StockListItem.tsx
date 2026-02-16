import type { StockItem } from '../../types'
import { Badge } from '../ui/Badge'
import { cn } from '../../lib/utils'

type StockListItemProps = {
  item: StockItem & {
    storage_gb?: number | null
    color?: string | null
    battery_pct?: number | null
    sale_price_usd?: number | null
    provider_name?: string | null
    details?: string | null
    received_at?: string | null
    is_promo?: boolean | null
  }
  onClick: () => void
}

export function StockListItem({ item, onClick }: StockListItemProps) {
  const categoryKey = item.category ?? ''
  const statusKey = item.status ?? item.state ?? 'new'
  const saleUsd =
    item.sale_price_usd ??
    (item.sale_price_ars && item.fx_rate_used ? Number(item.sale_price_ars) / Number(item.fx_rate_used) : null)
  const hasPrice = Boolean(item.sale_price_ars || saleUsd)
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
    service_tech: 'Servicio técnico',
    drawer: 'Cajón',
  }
  const batteryValue = item.condition === 'new' ? 100 : item.battery_pct
  const receivedLabel = item.received_at
    ? new Date(item.received_at).toLocaleDateString('es-AR')
    : item.created_at
      ? new Date(item.created_at).toLocaleDateString('es-AR')
      : '—'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full cursor-pointer flex-col gap-2 rounded-2xl border bg-white p-4 text-left transition duration-200 hover:bg-[#F8FAFC] active:bg-[#EEF2F7]',
        item.is_promo ? 'border-[rgba(220,38,38,0.45)]' : 'border-[#E6EBF2]',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-[#0F172A]">
              {item.model ? `${item.brand} ${item.model}` : item.brand}
              {item.imei ? ` - ${item.imei}` : ' - Sin IMEI'}
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
          <div className="mt-2 text-xs text-[#5B677A]">{(categoryLabel[categoryKey] ?? categoryKey) || '—'}</div>
          <div className="mt-1 text-xs text-[#5B677A]">
            Ingreso: {receivedLabel}
            {item.provider_name ? ` · Proveedor: ${item.provider_name}` : ''}
          </div>
          {item.details && (
            <div className="mt-1 text-xs text-[#92400E]">Detalle: {item.details}</div>
          )}
        </div>
        <div className="text-right">
          <div className={cn('text-sm font-semibold', hasPrice ? 'text-[#0F172A]' : 'text-[#F59E0B]')}>
            {hasPrice ? `USD ${Math.round(Number(saleUsd ?? 0)).toLocaleString('es-AR')}` : 'Sin precio'}
          </div>
          <div className="mt-1 text-xs text-[#5B677A]">
            {item.sale_price_ars ? `ARS $${item.sale_price_ars.toLocaleString('es-AR')}` : 'ARS —'}
          </div>
          <div className="mt-2">
            <Badge label={statusLabel[statusKey] ?? statusKey} tone={statusKey} />
          </div>
          {item.is_promo && (
            <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#DC2626]">
              Promoción
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
