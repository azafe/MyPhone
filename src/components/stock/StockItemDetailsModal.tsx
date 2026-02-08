import type { ReactNode } from 'react'
import type { StockItem } from '../../types'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

type StockItemExtended = StockItem & {
  storage_gb?: number | null
  color?: string | null
  color_other?: string | null
  battery_pct?: number | null
  sale_price_usd?: number | null
}

type StockItemDetailsModalProps = {
  open: boolean
  item: StockItemExtended | null
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onReserve: () => void
  onRelease: () => void
  onSell: () => void
  footer?: ReactNode
}

export function StockItemDetailsModal({
  open,
  item,
  onClose,
  onEdit,
  onDelete,
  onReserve,
  onRelease,
  onSell,
}: StockItemDetailsModalProps) {
  if (!item) return null

  const marginPct =
    item.purchase_ars && item.sale_price_ars
      ? ((item.sale_price_ars - item.purchase_ars) / item.sale_price_ars) * 100
      : null
  const gainArs =
    item.purchase_ars && item.sale_price_ars ? item.sale_price_ars - item.purchase_ars : null
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
  const categoryLabel: Record<string, string> = {
    new: 'Nuevo',
    promotion: 'Promoción',
    outlet: 'Outlet',
    used_premium: 'Usado Premium',
  }

  return (
    <Modal
      open={open}
      title={`${item.brand} ${item.model}`}
      subtitle={[item.storage_gb ? `${item.storage_gb} GB` : null, item.color, item.condition].filter(Boolean).join(' · ')}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onEdit}>
            Editar
          </Button>
          <Button variant="danger" onClick={onDelete}>
            Eliminar
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-2">
        <Badge label={statusLabel[item.status] ?? item.status} tone={item.status} />
        {item.sale_price_ars ? (
          <span className="text-sm font-semibold text-[#0F172A]">
            ${item.sale_price_ars.toLocaleString('es-AR')}
          </span>
        ) : (
          <span className="text-sm text-[#92400E]">Sin precio</span>
        )}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-[#E6EBF2] bg-white p-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Equipo</h4>
          <dl className="mt-3 space-y-2 text-sm text-[#0F172A]">
            <div className="flex justify-between gap-3">
              <span className="text-[#5B677A]">Categoría</span>
              <span>{categoryLabel[item.category] ?? item.category}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#5B677A]">Marca</span>
              <span>{item.brand}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#5B677A]">Modelo</span>
              <span>{item.model}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#5B677A]">Capacidad</span>
              <span>{item.storage_gb ? `${item.storage_gb} GB` : '—'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#5B677A]">Color</span>
              <span>{item.color_other ?? item.color ?? '—'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#5B677A]">IMEI</span>
              <span>{item.imei ?? 'Sin IMEI'}</span>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-[#E6EBF2] bg-white p-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Condición</h4>
          <dl className="mt-3 space-y-2 text-sm text-[#0F172A]">
            <div className="flex justify-between gap-3">
              <span className="text-[#5B677A]">Condición</span>
              <span>{conditionLabel[item.condition] ?? item.condition}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#5B677A]">Batería</span>
              <span>{item.battery_pct != null ? `${item.battery_pct}%` : '—'}</span>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-[#E6EBF2] bg-white p-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Garantía</h4>
          <dl className="mt-3 space-y-2 text-sm text-[#0F172A]">
            <div className="flex justify-between gap-3">
              <span className="text-[#5B677A]">Días</span>
              <span>{item.warranty_days ?? '—'}</span>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-[#E6EBF2] bg-white p-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Costos y precio</h4>
          <dl className="mt-3 space-y-2 text-sm text-[#0F172A]">
            <div className="flex justify-between gap-3">
              <span className="text-[#5B677A]">Costo USD</span>
              <span>{item.purchase_usd ? `$${item.purchase_usd}` : '—'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#5B677A]">Tipo de cambio</span>
              <span>{item.fx_rate_used ?? '—'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#5B677A]">Costo ARS</span>
              <span>{item.purchase_ars ? `$${item.purchase_ars.toLocaleString('es-AR')}` : '—'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#5B677A]">Precio USD</span>
              <span>{item.sale_price_usd ? `$${item.sale_price_usd}` : '—'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#5B677A]">Precio ARS</span>
              <span>{item.sale_price_ars ? `$${item.sale_price_ars.toLocaleString('es-AR')}` : '—'}</span>
            </div>
            {marginPct != null && gainArs != null && (
              <div className="mt-2 rounded-lg bg-[#F8FAFC] px-3 py-2 text-xs text-[#5B677A]">
                Margen {marginPct.toFixed(1)}% · Ganancia ARS ${gainArs.toLocaleString('es-AR')}
              </div>
            )}
          </dl>
        </section>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {item.status === 'available' && (
          <>
            <Button variant="secondary" onClick={onReserve}>
              Reservar
            </Button>
            <Button onClick={onSell}>Vender</Button>
          </>
        )}
        {item.status === 'reserved' && (
          <>
            <Button variant="secondary" onClick={onRelease}>
              Liberar
            </Button>
            <Button onClick={onSell}>Vender</Button>
          </>
        )}
      </div>
    </Modal>
  )
}
