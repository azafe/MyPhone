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
  provider_name?: string | null
  details?: string | null
  received_at?: string | null
  is_promo?: boolean | null
}

type StockItemDetailsModalProps = {
  open: boolean
  item: StockItemExtended | null
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onSell: () => void
  onStatusChange: (status: StockItem['status']) => void
}

export function StockItemDetailsModal({
  open,
  item,
  onClose,
  onEdit,
  onDelete,
  onSell,
  onStatusChange,
}: StockItemDetailsModalProps) {
  if (!item) return null

  const marginPct =
    item.purchase_ars && item.sale_price_ars
      ? ((item.sale_price_ars - item.purchase_ars) / item.sale_price_ars) * 100
      : null
  const gainArs =
    item.purchase_ars && item.sale_price_ars ? item.sale_price_ars - item.purchase_ars : null
  const refFx = item.fx_rate_used ? Number(item.fx_rate_used) : null
  const referentialUsd =
    item.sale_price_ars && refFx ? Math.round(Number(item.sale_price_ars) / refFx) : null
  const showReferentialUsd =
    referentialUsd != null &&
    (!item.sale_price_usd || Math.abs(Number(item.sale_price_usd) - referentialUsd) < 1)
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
    service_tech: 'Servicio técnico',
    drawer: 'Cajón',
  }
  const statusOptions: Array<{ value: StockItem['status']; label: string }> = [
    { value: 'available', label: 'Disponible' },
    { value: 'reserved', label: 'Reservado' },
    { value: 'sold', label: 'Vendido' },
    { value: 'service_tech', label: 'Servicio técnico' },
    { value: 'drawer', label: 'Cajón' },
  ]
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
  const receivedLabel = item.received_at
    ? new Date(item.received_at).toLocaleDateString('es-AR')
    : item.created_at
      ? new Date(item.created_at).toLocaleDateString('es-AR')
      : null
  const hasPrice = Boolean(item.sale_price_ars)
  return (
    <Modal
      open={open}
      title={`${item.brand} ${item.model}`}
      subtitle={categoryLabel[item.category] ?? item.category}
      onClose={onClose}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Badge label={conditionLabel[item.condition] ?? item.condition} tone="active" />
        <div className="flex items-center gap-2">
          <Badge label={statusLabel[item.status] ?? item.status} tone={item.status} />
          <select
            className="h-9 rounded-lg border border-[#E6EBF2] bg-white px-3 text-xs font-medium text-[#0F172A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[rgba(11,74,162,0.25)]"
            value={item.status}
            onChange={(event) => onStatusChange(event.target.value as StockItem['status'])}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {item.is_promo && <Badge label="Promoción" tone="rejected" />}
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
              <span className="text-[#5B677A]">Batería</span>
              <span>{batteryValue != null ? `${batteryValue}%` : '—'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#5B677A]">IMEI</span>
              <span>{item.imei ?? 'Sin IMEI'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#5B677A]">Proveedor</span>
              <span>{item.provider_name ?? '—'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#5B677A]">Fecha ingreso</span>
              <span>{receivedLabel ?? '—'}</span>
            </div>
            {item.details && (
              <div className="space-y-1 rounded-lg bg-[#F8FAFC] px-3 py-2">
                <div className="text-[#5B677A]">Detalle</div>
                <div>{item.details}</div>
              </div>
            )}
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
          <p className="mt-2 text-xs text-[#5B677A]">
            Tipo de cambio de referencia: {refFx ? `${refFx} ARS/USD` : '—'}
          </p>
          <p className="mt-1 text-[11px] text-[#5B677A]">
            Se usa para cálculos estimados de stock (no es venta final).
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-[#E6EBF2] bg-white px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Costo</p>
              <div className="mt-2 text-sm font-semibold text-[#0F172A]">
                {item.purchase_usd ? `USD ${item.purchase_usd}` : 'USD —'}
              </div>
              <div className="mt-1 text-xs text-[#5B677A]">
                Costo ARS: {item.purchase_ars ? `$${item.purchase_ars.toLocaleString('es-AR')}` : '—'}
              </div>
            </div>
            <div className="rounded-xl border border-[#E6EBF2] bg-white px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Precio de venta</p>
              <div className="mt-2 text-sm font-semibold text-[#0F172A]">
                {showReferentialUsd ? `USD ${referentialUsd}` : 'USD —'}
              </div>
              <div className="mt-1 text-xs text-[#5B677A]">
                Precio venta ARS: {item.sale_price_ars ? `$${item.sale_price_ars.toLocaleString('es-AR')}` : '—'}
              </div>
              {!item.sale_price_ars && <div className="mt-1 text-xs text-[#92400E]">Sin precio</div>}
            </div>
          </div>

          <div
            className={cn(
              'mt-3 rounded-lg px-3 py-2 text-xs',
              marginPct == null || gainArs == null
                ? 'bg-[#F1F5F9] text-[#5B677A]'
                : marginPct > 15
                ? 'bg-[rgba(22,163,74,0.12)] text-[#166534]'
                : marginPct >= 8
                ? 'bg-[rgba(245,158,11,0.14)] text-[#92400E]'
                : 'bg-[rgba(220,38,38,0.12)] text-[#991B1B]',
            )}
          >
            <div className="flex flex-wrap gap-2">
              <span>Margen estimado: {marginPct != null ? `${marginPct.toFixed(1)}%` : '—'}</span>
              <span>· Ganancia estimada: {gainArs != null ? `ARS $${gainArs.toLocaleString('es-AR')}` : '—'}</span>
            </div>
            {marginPct == null || gainArs == null ? (
              <div className="mt-1 text-[11px]">Faltan datos para calcular margen</div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {item.status !== 'sold' && <Button onClick={onSell}>Vender</Button>}
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
