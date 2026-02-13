import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchSales } from '../../services/sales'
import { fetchStock } from '../../services/stock'
import type { Sale, StockItem } from '../../types'
import { formatARS, formatPercent, formatUnits } from './formatters'
import type { KpiItem } from './KpiGrid'

const currency = new Intl.NumberFormat('es-AR')

function formatARSNumber(value: number) {
  return `$ ${currency.format(Math.round(value))}`
}

function formatPercentSafe(value: number) {
  return formatPercent(value)
}

export function useDashboardKpis() {
  const navigate = useNavigate()

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', 'dashboard-kpis'],
    queryFn: () => fetchSales(),
  })

  const { data: stock = [] } = useQuery({
    queryKey: ['stock', 'dashboard-kpis'],
    queryFn: () => fetchStock(),
  })

  const today = new Date()
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const startYesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)

  const salesToday = sales.filter((sale) => {
    const raw = (sale as { sale_date?: string; created_at?: string }).sale_date ?? sale.created_at
    if (!raw) return false
    const date = new Date(raw)
    return date >= startToday
  })

  const salesYesterday = sales.filter((sale) => {
    const raw = (sale as { sale_date?: string; created_at?: string }).sale_date ?? sale.created_at
    if (!raw) return false
    const date = new Date(raw)
    return date >= startYesterday && date < startToday
  })

  const sumSales = (items: Sale[]) => items.reduce((acc, sale) => acc + Number(sale.total_ars || 0), 0)
  const todayTotal = sumSales(salesToday)
  const yesterdayTotal = sumSales(salesYesterday)
  const deltaPct = yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100 : 0

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthlySales = sales.filter((sale) => {
    const raw = (sale as { sale_date?: string; created_at?: string }).sale_date ?? sale.created_at
    if (!raw) return false
    const date = new Date(raw)
    return date >= monthStart
  })

  const marginMonth = monthlySales.reduce((acc, sale) => {
    const total = Number(sale.total_ars || 0)
    const cost = Number((sale as Sale & { cost_ars?: number | null }).cost_ars || 0)
    return acc + (total - cost)
  }, 0)

  const totalMonth = sumSales(monthlySales)
  const marginPct = totalMonth > 0 ? (marginMonth / totalMonth) * 100 : 0

  const last30Start = new Date(today)
  last30Start.setDate(today.getDate() - 30)
  const sales30 = sales.filter((sale) => {
    const raw = (sale as { sale_date?: string; created_at?: string }).sale_date ?? sale.created_at
    if (!raw) return false
    const date = new Date(raw)
    return date >= last30Start
  })

  const ticketAvg = sales30.length ? sumSales(sales30) / sales30.length : 0

  const availableStock = stock.filter((item: StockItem) => item.status === 'available')
  const criticalStock = availableStock.filter((item) => !item.sale_price_ars).length

  // TODO: replace these with real data when endpoints exist
  const cuotasVencidas = { count: 0, total: 0 }
  const cuentasPorCobrar = { count: 0, total: 0 }
  const reservedCount = stock.filter((item: StockItem) => item.status === 'reserved').length

  const items = useMemo<KpiItem[]>(
    () => [
      {
        key: 'sales-today',
        title: 'Ventas hoy',
        value: formatARS(todayTotal),
        subtitle: `Delta vs ayer: ${formatPercentSafe(deltaPct)}`,
        status: deltaPct < 0 ? 'warning' : 'normal',
        onClick: () => navigate('/sales'),
      },
      {
        key: 'margin-month',
        title: 'Margen mes',
        value: formatARS(marginMonth),
        subtitle: `Margen ${formatPercentSafe(marginPct)}`,
        status: marginPct < 10 ? 'warning' : 'normal',
        onClick: () => navigate('/finance'),
      },
      {
        key: 'ticket-avg',
        title: 'Ticket promedio',
        value: formatARS(ticketAvg),
        subtitle: 'Últimos 30 días',
        status: 'normal',
        onClick: () => navigate('/sales'),
      },
      {
        key: 'stock-critical',
        title: 'Stock crítico',
        value: formatUnits(criticalStock),
        subtitle: 'Disponibles sin precio',
        status: criticalStock > 0 ? 'warning' : 'normal',
        onClick: () => navigate('/stock'),
      },
      {
        key: 'cuotas-vencidas',
        title: 'Cuotas vencidas',
        value: formatUnits(cuotasVencidas.count),
        subtitle: formatARSNumber(cuotasVencidas.total),
        status: cuotasVencidas.count > 0 ? 'danger' : 'normal',
        onClick: () => navigate('/installments'),
      },
      {
        key: 'cuentas-por-cobrar',
        title: 'Cuentas por cobrar',
        value: formatARSNumber(cuentasPorCobrar.total),
        subtitle: `${formatUnits(cuentasPorCobrar.count)} clientes`,
        status: cuentasPorCobrar.total > 0 ? 'warning' : 'normal',
        onClick: () => navigate('/finance'),
      },
      {
        key: 'reservados',
        title: 'Equipos reservados',
        value: formatUnits(reservedCount),
        subtitle: 'Reservas activas',
        status: reservedCount > 0 ? 'warning' : 'normal',
        onClick: () => navigate('/stock'),
      },
    ],
    [
      todayTotal,
      deltaPct,
      marginMonth,
      marginPct,
      ticketAvg,
      criticalStock,
      cuotasVencidas.count,
      cuotasVencidas.total,
      cuentasPorCobrar.count,
      cuentasPorCobrar.total,
      reservedCount,
      navigate,
    ],
  )

  return { items }
}
