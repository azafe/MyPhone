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

export function SalesListItem({ sale, onClick }: SalesListItemProps) {
  const customer = sale.customer_name || 'Cliente sin nombre'
  const dateLabel = sale.created_at
    ? new Date(sale.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
    : '—'

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer flex-col gap-2 rounded-2xl border border-[#E6EBF2] bg-white p-4 text-left transition duration-200 hover:bg-[#F8FAFC] active:bg-[#EEF2F7]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[#0F172A]">{customer}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#5B677A]">
            <span>Equipo: {sale.stock_item_id || '—'}</span>
            <Badge label={methodLabels[sale.method] ?? sale.method} />
          </div>
        </div>
        <div className="text-right text-sm font-semibold text-[#0F172A]">
          ${sale.total_ars.toLocaleString('es-AR')}
        </div>
      </div>

      <div className="text-xs text-[#5B677A]">
        {dateLabel}
        {sale.customer_phone ? ` · ${sale.customer_phone}` : ''}
      </div>
    </button>
  )
}
