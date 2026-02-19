import { Suspense, lazy, type ReactNode } from 'react'
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { RequireAuth } from './components/guards/RequireAuth'
import { RequireRole } from './components/guards/RequireRole'

const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const StockPage = lazy(() => import('./pages/StockPage').then((m) => ({ default: m.StockPage })))
const SalesPage = lazy(() => import('./pages/SalesPage').then((m) => ({ default: m.SalesPage })))
const SalesNewPage = lazy(() => import('./pages/SalesNewPage').then((m) => ({ default: m.SalesNewPage })))
const TradeInsPage = lazy(() => import('./pages/TradeInsPage').then((m) => ({ default: m.TradeInsPage })))
const WarrantiesPage = lazy(() => import('./pages/WarrantiesPage').then((m) => ({ default: m.WarrantiesPage })))
const PlanCanjePage = lazy(() => import('./pages/PlanCanjePage').then((m) => ({ default: m.PlanCanjePage })))
const CalculatorPage = lazy(() => import('./pages/CalculatorPage').then((m) => ({ default: m.CalculatorPage })))
const FinancePage = lazy(() => import('./pages/FinancePage').then((m) => ({ default: m.FinancePage })))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })))

function withSuspense(node: ReactNode) {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Cargando...</div>}>
      {node}
    </Suspense>
  )
}

const router = createBrowserRouter([
  { path: '/login', element: withSuspense(<LoginPage />) },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: withSuspense(<Navigate to="/dashboard" replace />) },
          { path: '/dashboard', element: withSuspense(<DashboardPage />) },
          { path: '/stock', element: withSuspense(<StockPage />) },
          { path: '/sales', element: withSuspense(<SalesPage />) },
          { path: '/sales/new', element: withSuspense(<SalesNewPage />) },
          { path: '/tradeins', element: withSuspense(<TradeInsPage />) },
          { path: '/warranties', element: withSuspense(<WarrantiesPage />) },
          { path: '/plan-canje', element: withSuspense(<PlanCanjePage />) },
          { path: '/calculator', element: withSuspense(<CalculatorPage />) },
          {
            element: <RequireRole role="admin" />,
            children: [
              { path: '/finance', element: withSuspense(<FinancePage />) },
              { path: '/admin/users', element: withSuspense(<AdminUsersPage />) },
            ],
          },
        ],
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
