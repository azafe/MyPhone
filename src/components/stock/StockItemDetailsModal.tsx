import type { StockItem } from '../../types'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

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
  const batteryValue = item.condition === 'new' ? 100 : item.battery_pct
  const categoryLabel: Record<string, string> = {
    new: 'Nuevo',
    promotion: 'Promoción',
    outlet: 'Outlet',
    used_premium: 'Usado Premium',
  }

  const warrantyDate = item.created_at
    ? new Date(new Date(item.created_at).getTime() + (item.warranty_days ?? 0) * 24 * 60 * 60 * 1000)
    : null
  const formattedWarrantyDate = warrantyDate ? warrantyDate.toLocaleDateString('es-AR') : null
  const hasPrice = Boolean(item.sale_price_ars)
  const marginTone =
    marginPct == null
      ? 'text-[#5B677A]'
      : marginPct > 15
      ? 'text-[#166534]'
      : marginPct >= 8
      ? 'text-[#92400E]'
      : 'text-[#991B1B]'

  return (
    <Modal
      open={open}
      title={`${item.brand} ${item.model}`}
      subtitle={[item.storage_gb ? `${item.storage_gb} GB` : null, item.color, conditionLabel[item.condition]].filter(Boolean).join(' · ')}
      onClose={onClose}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge label={conditionLabel[item.condition] ?? item.condition} tone="active" />
        <Badge label={statusLabel[item.status] ?? item.status} tone={item.status} />
        {!hasPrice && <Badge label="⚠️ Sin precio" tone="reserved" />}
      </div>

      {!hasPrice && (
        <div className="mt-3 rounded-xl border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.12)] px-3 py-2 text-xs text-[#92400E]">
          Precio de venta no definido
        </div>
      )}

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
              <span>{batteryValue != null ? `${batteryValue}%` : '—'}</span>
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
            {formattedWarrantyDate && (
              <div className="flex justify-between gap-3">
                <span className="text-[#5B677A]">Vence</span>
                <span>{formattedWarrantyDate}</span>
              </div>
            )}
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
            <div className="mt-2 rounded-lg bg-[#F8FAFC] px-3 py-2">
              <div className="flex justify-between text-sm font-semibold text-[#0F172A]">
                <span>Precio venta ARS</span>
                <span>{item.sale_price_ars ? `$${item.sale_price_ars.toLocaleString('es-AR')}` : '—'}</span>
              </div>
              <div className="mt-1 flex justify-between text-xs text-[#5B677A]">
                <span>Precio USD</span>
                <span>{item.sale_price_usd ? `$${item.sale_price_usd}` : '—'}</span>
              </div>
              {marginPct != null && gainArs != null && (
                <div className={cn('mt-2 text-xs', marginTone)}>
                  Margen {marginPct.toFixed(1)}% · Ganancia ARS ${gainArs.toLocaleString('es-AR')}
                </div>
              )}
            </div>
          </dl>
        </section>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
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
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onEdit}>
            Editar
          </Button>
          <Button variant="danger" onClick={onDelete}>
            Eliminar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
