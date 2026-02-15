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

function buildWhatsAppText({
  saleId,
  customer,
  phone,
  dateLabel,
  equipment,
  total,
}: {
  saleId: string
  customer: string
  phone: string
  dateLabel: string
  equipment: string
  total: string
}) {
  return [
    'MyPhone - Comprobante de venta',
    `Venta: ${saleId}`,
    `Cliente: ${customer}`,
    `Teléfono: ${phone}`,
    `Equipo: ${equipment || '—'}`,
    `Fecha: ${dateLabel}`,
    `Total: ${total}`,
  ].join('\n')
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function SalesDetailsModal({ open, sale, onClose, onEdit, onDelete }: SalesDetailsModalProps) {
  if (!sale) return null

  const customer =
    sale.customer_name ||
    sale.customer?.name ||
    sale.customer?.full_name ||
    'Cliente sin nombre'
  const saleDateSource = sale.sale_date ?? sale.created_at
  const dateLabel = saleDateSource
    ? new Date(saleDateSource).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
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
  const equipmentFallbackMeta = [
    (sale as Sale & { storage_gb?: number | null }).storage_gb
      ? `${(sale as Sale & { storage_gb?: number | null }).storage_gb}GB`
      : null,
    (sale as Sale & { color?: string | null }).color ?? null,
    typeof (sale as Sale & { battery_pct?: number | null }).battery_pct === 'number'
      ? `Batería ${(sale as Sale & { battery_pct?: number | null }).battery_pct}%`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const statusLabel = sale.status ? statusLabels[sale.status] ?? sale.status : null
  const statusStyle = sale.status ? statusStyles[sale.status] ?? 'bg-[rgba(91,103,122,0.16)] text-[#334155]' : ''
  const totalLabel = formatArs(sale.total_ars)
  const currency = sale.currency ?? 'ARS'
  const mainTotalLabel =
    currency === 'USD' && typeof sale.total_usd === 'number'
      ? `USD ${sale.total_usd.toFixed(2)}`
      : `ARS ${totalLabel}`
  const whatsAppText = buildWhatsAppText({
    saleId: sale.id,
    customer,
    phone,
    dateLabel,
    equipment: equipmentName,
    total: mainTotalLabel,
  })

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(whatsAppText)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handlePrintReceipt = () => {
    const popup = window.open('', '_blank', 'width=720,height=860')
    if (!popup) return
    const safeCustomer = escapeHtml(customer)
    const safePhone = escapeHtml(phone)
    const safeDate = escapeHtml(dateLabel)
    const safeEquipment = escapeHtml(equipmentName || '—')
    const safeTotal = escapeHtml(mainTotalLabel)
    const safeSaleId = escapeHtml(sale.id)
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Comprobante de venta</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { font-size: 20px; margin-bottom: 8px; }
            p { margin: 6px 0; }
            .muted { color: #5b677a; }
            .box { border: 1px solid #e6ebf2; border-radius: 10px; padding: 12px; margin-top: 12px; }
          </style>
        </head>
        <body>
          <h1>MyPhone - Comprobante de venta</h1>
          <p class="muted">Venta: ${safeSaleId}</p>
          <div class="box">
            <p><strong>Cliente:</strong> ${safeCustomer}</p>
            <p><strong>Teléfono:</strong> ${safePhone}</p>
            <p><strong>Fecha:</strong> ${safeDate}</p>
            <p><strong>Equipo:</strong> ${safeEquipment}</p>
            <p><strong>Total:</strong> ${safeTotal}</p>
          </div>
        </body>
      </html>
    `
    popup.document.write(html)
    popup.document.close()
    popup.focus()
    popup.print()
  }

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
            <Button variant="secondary" onClick={handlePrintReceipt}>
              Comprobante
            </Button>
            <Button variant="secondary" onClick={handleShareWhatsApp}>
              WhatsApp
            </Button>
            <Button variant="secondary" onClick={onEdit}>
              Nueva venta
            </Button>
            <Button variant="danger" onClick={onDelete}>
              Eliminar
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-lg font-semibold text-[#0F172A]">{mainTotalLabel}</div>
        <Badge label={methodLabels[sale.method] ?? sale.method} />
        {sale.includes_cube_20w ? <Badge label="Cubo 20W" tone="valued" /> : null}
        {statusLabel ? <span className={`rounded-full px-2 py-0.5 text-xs ${statusStyle}`}>{statusLabel}</span> : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-[#E6EBF2] bg-white p-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Resumen</h4>
          <div className="mt-3 space-y-2 text-sm text-[#0F172A]">
            <div className="text-lg font-semibold">{mainTotalLabel}</div>
            <div>Método: {methodLabels[sale.method] ?? sale.method}</div>
            {currency === 'USD' && (
              <div>
                ARS: {formatArs(sale.total_ars)}
                {sale.fx_rate_used ? ` · TC: ${sale.fx_rate_used}` : ''}
              </div>
            )}
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
                {(equipmentMeta || equipmentFallbackMeta) && (
                  <div className="text-[#5B677A]">{equipmentMeta || equipmentFallbackMeta}</div>
                )}
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
            {currency === 'USD' && typeof sale.total_usd === 'number' ? (
              <div>Total USD: USD {sale.total_usd.toFixed(2)}</div>
            ) : null}
            {sale.card_brand ? <div>Tarjeta: {sale.card_brand}</div> : null}
            {sale.installments ? <div>Cuotas: {sale.installments}</div> : null}
            {typeof sale.deposit_ars === 'number' ? <div>Seña ARS: {formatArs(sale.deposit_ars)}</div> : null}
            {typeof sale.balance_due_ars === 'number' && sale.balance_due_ars > 0 ? (
              <div>Saldo pendiente ARS: {formatArs(sale.balance_due_ars)}</div>
            ) : null}
            {sale.notes ? <div>Observaciones: {sale.notes}</div> : null}
          </div>
        </section>
      </div>

    </Modal>
  )
}
