import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteSale, fetchSales } from '../services/sales'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'
import { SalesListItem } from '../components/sales/SalesListItem'
import { SalesDetailsModal } from '../components/sales/SalesDetailsModal'
import { Modal } from '../components/ui/Modal'

export function SalesPage() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data = [], isLoading } = useQuery({
    queryKey: ['sales', search],
    queryFn: () => fetchSales(search || undefined),
  })
  const [selected, setSelected] = useState<(typeof data)[number] | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: deleteSale,
    onSuccess: () => {
      toast.success('Venta eliminada')
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      setConfirmDeleteOpen(false)
      setDetailsOpen(false)
      setSelected(null)
    },
    onError: (error) => {
      const err = error as Error & { code?: string; details?: unknown }
      toast.error(err.message || 'No se pudo eliminar la venta')
      if (err.code) {
        console.error('deleteSale error', err.code, err.details)
      }
    },
  })

  const openDetails = (sale: (typeof data)[number]) => {
    setSelected(sale)
    setDetailsOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Ventas</h2>
          <p className="text-sm text-[#5B677A]">Historial de operaciones.</p>
        </div>
        <Button onClick={() => navigate('/sales/new')}>Nueva venta</Button>
      </div>

      <Input placeholder="Buscar cliente, teléfono o IMEI" value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="space-y-3">
        {isLoading ? (
          <div className="rounded-2xl border border-[#E6EBF2] bg-white p-6 text-sm text-[#5B677A]">Cargando...</div>
        ) : data.length === 0 ? (
          <div className="rounded-2xl border border-[#E6EBF2] bg-white p-6 text-sm text-[#5B677A]">
            Todavía no hay ventas registradas.
            <div className="mt-4">
              <Button onClick={() => navigate('/sales/new')}>Crear primera venta</Button>
            </div>
          </div>
        ) : (
          data.map((sale) => <SalesListItem key={sale.id} sale={sale} onClick={() => openDetails(sale)} />)
        )}
      </div>

      <SalesDetailsModal
        open={detailsOpen}
        sale={selected ?? null}
        onClose={() => setDetailsOpen(false)}
        onEdit={() => selected && navigate(`/sales/new?stock=${selected.stock_item_id}`)}
        onDelete={() => setConfirmDeleteOpen(true)}
      />

      <Modal
        open={confirmDeleteOpen}
        title="Eliminar venta"
        onClose={() => setConfirmDeleteOpen(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => selected && deleteMutation.mutate(selected.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-[#5B677A]">¿Eliminar esta venta? Esta acción no se puede deshacer.</p>
      </Modal>
    </div>
  )
}
