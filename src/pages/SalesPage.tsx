import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchSales, fetchSellers } from '../services/sales'
import type { Sale } from '../types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Table } from '../components/ui/Table'

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-AR')
}

function formatMoney(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `$${value.toLocaleString('es-AR')}`
}

function resolveCustomer(sale: Sale) {
  return sale.customer_name || sale.customer?.name || sale.customer?.full_name || '—'
}

function resolvePaymentMethod(sale: Sale) {
  return sale.payment_method || sale.method || '—'
}

export function SalesPage() {
  const navigate = useNavigate()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sellerId, setSellerId] = useState('')
  const [query, setQuery] = useState('')

  const sellersQuery = useQuery({
    queryKey: ['users', 'sellers'],
    queryFn: fetchSellers,
  })

  const salesQuery = useQuery({
    queryKey: ['sales', from, to, sellerId, query],
    queryFn: () =>
      fetchSales({
        from: from || undefined,
        to: to || undefined,
        seller_id: sellerId || undefined,
        query: query || undefined,
      }),
  })

  const sales = salesQuery.data ?? []

  const totals = useMemo(() => {
    const totalArs = sales.reduce((sum, sale) => sum + Number(sale.total_ars || 0), 0)
    const pendingArs = sales.reduce((sum, sale) => sum + Number(sale.balance_due_ars || 0), 0)
    return {
      totalArs,
      pendingArs,
      count: sales.length,
    }
  }, [sales])

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Ventas</h2>
          <p className="text-sm text-[#5B677A]">Listado por fecha y vendedor.</p>
        </div>
        <Button onClick={() => navigate('/sales/new')}>Nueva venta</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        <Select value={sellerId} onChange={(event) => setSellerId(event.target.value)}>
          <option value="">Todos los vendedores</option>
          {(sellersQuery.data ?? []).map((seller) => (
            <option key={seller.id} value={seller.id}>
              {seller.full_name}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Buscar cliente, DNI, IMEI"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[#E6EBF2] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Ventas</p>
          <p className="mt-2 text-2xl font-semibold text-[#0F172A]">{totals.count}</p>
        </div>
        <div className="rounded-2xl border border-[#E6EBF2] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Total</p>
          <p className="mt-2 text-2xl font-semibold text-[#0F172A]">{formatMoney(totals.totalArs)}</p>
        </div>
        <div className="rounded-2xl border border-[#E6EBF2] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Saldo pendiente</p>
          <p className="mt-2 text-2xl font-semibold text-[#B91C1C]">{formatMoney(totals.pendingArs)}</p>
        </div>
      </div>

      <Table
        headers={[
          'Fecha',
          'Cliente',
          'Vendedor',
          'Pago',
          'Moneda',
          'Total',
          'Saldo pendiente',
          'Cubo 20W',
        ]}
      >
        {salesQuery.isLoading ? (
          <tr>
            <td className="px-4 py-6 text-sm text-[#5B677A]" colSpan={8}>
              Cargando ventas...
            </td>
          </tr>
        ) : sales.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-sm text-[#5B677A]" colSpan={8}>
              No hay ventas para los filtros seleccionados.
            </td>
          </tr>
        ) : (
          sales.map((sale) => (
            <tr key={sale.id}>
              <td className="px-4 py-3 text-sm">{formatDate(sale.sale_date ?? sale.created_at)}</td>
              <td className="px-4 py-3 text-sm">
                <div className="font-medium text-[#0F172A]">{resolveCustomer(sale)}</div>
                <div className="text-xs text-[#5B677A]">{sale.customer_phone || sale.customer?.phone || '—'}</div>
              </td>
              <td className="px-4 py-3 text-sm">{sale.seller_name || sale.seller_full_name || '—'}</td>
              <td className="px-4 py-3 text-sm capitalize">{resolvePaymentMethod(sale)}</td>
              <td className="px-4 py-3 text-sm">{sale.currency || 'ARS'}</td>
              <td className="px-4 py-3 text-sm">{formatMoney(sale.total_ars)}</td>
              <td className="px-4 py-3 text-sm">{formatMoney(sale.balance_due_ars ?? 0)}</td>
              <td className="px-4 py-3 text-sm">{sale.includes_cube_20w ? 'Sí' : 'No'}</td>
            </tr>
          ))
        )}
      </Table>
    </div>
  )
}
