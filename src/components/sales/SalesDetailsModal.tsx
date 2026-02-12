import type { Sale } from '../../types'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

type SalesDetailsModalProps = {
  open: boolean
  sale: Sale | null
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
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

const formatArs = (value?: number | null) => (typeof value === 'number' ? `$${value.toLocaleString('es-AR')}` : '—')

export function SalesDetailsModal({ open, sale, onClose, onEdit, onDelete }: SalesDetailsModalProps) {
  if (!sale) return null

  const customer =
    sale.customer_name ||
    sale.customer?.name ||
    sale.customer?.full_name ||
    'Cliente sin nombre'
  const dateLabel = sale.created_at
    ? new Date(sale.created_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
    : '—'
  const phone = sale.customer_phone || sale.customer?.phone || '—'
  const equipmentName = [sale.stock_brand, sale.stock_model].filter(Boolean).join(' ')
  const equipmentMeta = [
    sale.stock_storage_gb ? `${sale.stock_storage_gb}GB` : null,
    sale.stock_color,
    typeof sale.stock_battery_pct === 'number' ? `Batería ${sale.stock_battery_pct}%` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const statusLabel = sale.status ? statusLabels[sale.status] ?? sale.status : null
  const statusStyle = sale.status ? statusStyles[sale.status] ?? 'bg-[rgba(91,103,122,0.16)] text-[#334155]' : ''

  return (
    <Modal
      open={open}
      title="Detalle de venta"
      subtitle={`${customer}${phone ? ` · ${phone}` : ''}`}
      onClose={onClose}
      actions={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={onEdit}>
              Editar
            </Button>
            <Button variant="danger" onClick={onDelete}>
              Eliminar
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-lg font-semibold text-[#0F172A]">{formatArs(sale.total_ars)}</div>
        <Badge label={methodLabels[sale.method] ?? sale.method} />
        {statusLabel ? <span className={`rounded-full px-2 py-0.5 text-xs ${statusStyle}`}>{statusLabel}</span> : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-[#E6EBF2] bg-white p-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Resumen</h4>
          <div className="mt-3 space-y-2 text-sm text-[#0F172A]">
            <div className="text-lg font-semibold">{formatArs(sale.total_ars)}</div>
            <div>Método: {methodLabels[sale.method] ?? sale.method}</div>
            <div>Fecha: {dateLabel}</div>
            {(sale.seller_name || sale.seller_full_name) && (
              <div>Vendedor: {sale.seller_name || sale.seller_full_name}</div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[#E6EBF2] bg-white p-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Cliente</h4>
          <div className="mt-3 space-y-2 text-sm text-[#0F172A]">
            <div>{customer}</div>
            <div className="text-[#5B677A]">{phone}</div>
          </div>
        </section>

        <section className="rounded-xl border border-[#E6EBF2] bg-white p-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Equipo</h4>
          <div className="mt-3 space-y-2 text-sm text-[#0F172A]">
            {equipmentName ? (
              <>
                <div className="font-medium">{equipmentName}</div>
                {sale.stock_imei ? <div className="text-[#5B677A]">IMEI {sale.stock_imei}</div> : null}
                {equipmentMeta ? <div className="text-[#5B677A]">{equipmentMeta}</div> : null}
                {sale.stock_imei ? (
                  <div className="flex items-center gap-2 text-xs text-[#5B677A]">
                    <span className="font-mono text-[#0F172A]">Copiar IMEI</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => navigator.clipboard?.writeText(sale.stock_imei ?? '')}
                    >
                      Copiar
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-sm text-[#5B677A]">Equipo: —</div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[#E6EBF2] bg-white p-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Pago</h4>
          <div className="mt-3 space-y-2 text-sm text-[#0F172A]">
            <div>Total ARS: {formatArs(sale.total_ars)}</div>
            {sale.card_brand ? <div>Tarjeta: {sale.card_brand}</div> : null}
            {sale.installments ? <div>Cuotas: {sale.installments}</div> : null}
            {typeof sale.deposit_ars === 'number' ? <div>Seña ARS: {formatArs(sale.deposit_ars)}</div> : null}
          </div>
        </section>
      </div>

    </Modal>
  )
}
