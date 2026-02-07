import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchWarranties } from '../services/warranties'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Table } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'

export function WarrantiesPage() {
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [nearExp, setNearExp] = useState(false)

  const { data = [] } = useQuery({
    queryKey: ['warranties', status, query],
    queryFn: () => fetchWarranties({ status: status || undefined, query: query || undefined }),
  })

  const filtered = useMemo(() => {
    if (!nearExp) return data
    const now = new Date()
    const in7 = new Date()
    in7.setDate(now.getDate() + 7)
    return data.filter((warranty) => new Date(warranty.ends_at) <= in7)
  }, [data, nearExp])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-ink">Garantías</h2>
        <p className="text-sm text-ink/60">Seguimiento de vencimientos y clientes.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Input placeholder="Buscar cliente o IMEI" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todas</option>
          <option value="active">Activas</option>
          <option value="expired">Vencidas</option>
        </Select>
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input type="checkbox" checked={nearExp} onChange={(e) => setNearExp(e.target.checked)} />
          Vence en 7 días
        </label>
      </div>

      <Table headers={['Cliente', 'Equipo', 'Vence', 'Estado']}>
        {filtered.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-sm text-ink/60" colSpan={4}>
              No hay garantías.
            </td>
          </tr>
        ) : (
          filtered.map((warranty) => (
            <tr key={warranty.id}>
              <td className="px-4 py-3">
                <div className="text-sm font-medium text-ink">{warranty.customer_name}</div>
                <div className="text-xs text-ink/50">{warranty.customer_phone}</div>
              </td>
              <td className="px-4 py-3 text-sm">{warranty.imei ?? warranty.stock_item_id}</td>
              <td className="px-4 py-3 text-sm">{new Date(warranty.ends_at).toLocaleDateString('es-AR')}</td>
              <td className="px-4 py-3">
                <Badge label={warranty.status} tone={warranty.status} />
              </td>
            </tr>
          ))
        )}
      </Table>
    </div>
  )
}
