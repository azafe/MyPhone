import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchSales } from '../services/sales'
import { Table } from '../components/ui/Table'
import { Input } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'

export function SalesPage() {
  const [search, setSearch] = useState('')
  const { data = [], isLoading } = useQuery({
    queryKey: ['sales', search],
    queryFn: () => fetchSales(search || undefined),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Ventas</h2>
          <p className="text-sm text-ink/60">Historial de operaciones.</p>
        </div>
        <Link
          to="/sales/new"
          className="rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-soft hover:bg-black"
        >
          Nueva venta
        </Link>
      </div>

      <Input placeholder="Buscar cliente, teléfono o IMEI" value={search} onChange={(e) => setSearch(e.target.value)} />

      <Table headers={['Cliente', 'Equipo', 'Total', 'Estado']}>
        {isLoading ? (
          <tr>
            <td className="px-4 py-4 text-sm text-ink/60" colSpan={4}>
              Cargando...
            </td>
          </tr>
        ) : data.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-sm text-ink/60" colSpan={4}>
              Sin ventas registradas.
            </td>
          </tr>
        ) : (
          data.map((sale) => (
            <tr key={sale.id}>
              <td className="px-4 py-3">
                <div className="text-sm font-medium text-ink">{sale.customer_name}</div>
                <div className="text-xs text-ink/50">{sale.customer_phone}</div>
              </td>
              <td className="px-4 py-3 text-sm">{sale.stock_item_id}</td>
              <td className="px-4 py-3 text-sm">${sale.total_ars.toLocaleString('es-AR')}</td>
              <td className="px-4 py-3">
                <Badge label={sale.method} />
              </td>
            </tr>
          ))
        )}
      </Table>
    </div>
  )
}
