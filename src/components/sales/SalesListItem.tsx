import type { Sale } from '../../types'
import { Badge } from '../ui/Badge'

type SalesListItemProps = {
  sale: Sale
  onClick: () => void
}

const methodLabels: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  mixed: 'Mixto',
  trade_in: 'Permuta',
}

const statusLabels: Record<string, string> = {
  paid: 'Pagada',
  completed: 'Completada',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
}

const statusStyles: Record<string, string> = {
  paid: 'bg-[rgba(22,163,74,0.12)] text-[#166534]',
  completed: 'bg-[rgba(22,163,74,0.12)] text-[#166534]',
  pending: 'bg-[rgba(245,158,11,0.14)] text-[#92400E]',
  cancelled: 'bg-[rgba(91,103,122,0.16)] text-[#334155]',
}

export function SalesListItem({ sale, onClick }: SalesListItemProps) {
  const methodKey = sale.method ?? sale.payment_method ?? 'cash'
  const customer =
    sale.customer_name ||
    sale.customer?.name ||
    sale.customer?.full_name ||
    'Cliente sin nombre'
  const saleDateSource = sale.sale_date ?? sale.created_at
  const dateLabel = saleDateSource
    ? new Date(saleDateSource).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
    : '—'
  const equipmentName = [sale.stock_brand, sale.stock_model].filter(Boolean).join(' ')
  const equipmentMeta = [sale.stock_storage_gb ? `${sale.stock_storage_gb}GB` : null, sale.stock_color]
    .filter(Boolean)
    .join(' · ')
  const imeiSuffix = sale.stock_imei ? sale.stock_imei.slice(-4) : null
  const statusLabel = sale.status ? statusLabels[sale.status] ?? sale.status : null
  const statusStyle = sale.status ? statusStyles[sale.status] ?? 'bg-[rgba(91,103,122,0.16)] text-[#334155]' : ''
  const currency = sale.currency ?? 'ARS'
  const totalMain =
    currency === 'USD' && typeof sale.total_usd === 'number'
      ? `USD ${sale.total_usd.toFixed(2)}`
      : `ARS $${sale.total_ars.toLocaleString('es-AR')}`

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer flex-col gap-2 rounded-2xl border border-[#E6EBF2] bg-white p-4 text-left transition duration-200 hover:bg-[#F8FAFC] active:bg-[#EEF2F7]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-[#0F172A]">{customer}</div>
          <div className="mt-1 text-xs text-[#5B677A]">
            {equipmentName ? (
              <>
                {equipmentName}
                {equipmentMeta ? ` · ${equipmentMeta}` : ''}
                {imeiSuffix ? (
                  <span className="ml-2 text-[11px] text-[#64748B]">IMEI ••••{imeiSuffix}</span>
                ) : null}
              </>
            ) : (
              <span>
                Equipo: — <span className="text-[#94A3B8]">(sin datos)</span>
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#5B677A]">
            <span>{dateLabel}</span>
            <Badge label={methodLabels[methodKey] ?? methodKey} />
            {sale.includes_cube_20w ? <Badge label="Cubo 20W" tone="valued" /> : null}
            {sale.seller_name || sale.seller_full_name ? (
              <span>Vendedor: {sale.seller_name || sale.seller_full_name}</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <div className="text-sm font-semibold text-[#0F172A]">{totalMain}</div>
          {currency === 'USD' ? (
            <div className="text-[11px] text-[#5B677A]">ARS ${sale.total_ars.toLocaleString('es-AR')}</div>
          ) : null}
          {typeof sale.balance_due_ars === 'number' && sale.balance_due_ars > 0 ? (
            <div className="text-[11px] font-medium text-[#DC2626]">
              Saldo pendiente: ARS ${sale.balance_due_ars.toLocaleString('es-AR')}
            </div>
          ) : null}
          {statusLabel ? <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusStyle}`}>{statusLabel}</span> : null}
        </div>
      </div>
    </button>
  )
}
