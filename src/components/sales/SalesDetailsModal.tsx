import type { Sale } from '../../types'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'

type SalesDetailsModalProps = {
  open: boolean
  sale: Sale | null
  onClose: () => void
}

const methodLabels: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  mixed: 'Mixto',
  trade_in: 'Permuta',
}

export function SalesDetailsModal({ open, sale, onClose }: SalesDetailsModalProps) {
  if (!sale) return null

  const customer = sale.customer_name || 'Cliente sin nombre'
  const dateLabel = sale.created_at
    ? new Date(sale.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
    : '—'

  return (
    <Modal open={open} title="Detalle de venta" subtitle={customer} onClose={onClose}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm font-semibold text-[#0F172A]">${sale.total_ars.toLocaleString('es-AR')}</div>
        <Badge label={methodLabels[sale.method] ?? sale.method} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-[#E6EBF2] bg-white p-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Cliente</h4>
          <div className="mt-3 space-y-2 text-sm text-[#0F172A]">
            <div>{customer}</div>
            <div className="text-[#5B677A]">{sale.customer_phone || '—'}</div>
          </div>
        </section>

        <section className="rounded-xl border border-[#E6EBF2] bg-white p-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Equipo</h4>
          <div className="mt-3 space-y-2 text-sm text-[#0F172A]">
            <div>{sale.stock_item_id || '—'}</div>
          </div>
        </section>

        <section className="rounded-xl border border-[#E6EBF2] bg-white p-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Pago</h4>
          <div className="mt-3 space-y-2 text-sm text-[#0F172A]">
            <div>Método: {methodLabels[sale.method] ?? sale.method}</div>
            <div>Total ARS: ${sale.total_ars.toLocaleString('es-AR')}</div>
          </div>
        </section>

        <section className="rounded-xl border border-[#E6EBF2] bg-white p-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Meta</h4>
          <div className="mt-3 space-y-2 text-sm text-[#0F172A]">
            <div>Fecha: {dateLabel}</div>
            <div>ID: {sale.id}</div>
          </div>
        </section>
      </div>
    </Modal>
  )
}
