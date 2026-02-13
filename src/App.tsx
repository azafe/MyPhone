import { Suspense, lazy, type ReactNode } from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { RequireAuth } from './components/guards/RequireAuth'
import { RequireRole } from './components/guards/RequireRole'

const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const StockPage = lazy(() => import('./pages/StockPage').then((m) => ({ default: m.StockPage })))
const SalesPage = lazy(() => import('./pages/SalesPage').then((m) => ({ default: m.SalesPage })))
const SalesNewPage = lazy(() => import('./pages/SalesNewPage').then((m) => ({ default: m.SalesNewPage })))
const TradeInsPage = lazy(() => import('./pages/TradeInsPage').then((m) => ({ default: m.TradeInsPage })))
const InstallmentsPage = lazy(() => import('./pages/InstallmentsPage').then((m) => ({ default: m.InstallmentsPage })))
const WarrantiesPage = lazy(() => import('./pages/WarrantiesPage').then((m) => ({ default: m.WarrantiesPage })))
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
          { path: '/', element: withSuspense(<DashboardPage />) },
          { path: '/dashboard', element: withSuspense(<DashboardPage />) },
          { path: '/stock', element: withSuspense(<StockPage />) },
          { path: '/sales', element: withSuspense(<SalesPage />) },
          { path: '/sales/new', element: withSuspense(<SalesNewPage />) },
          { path: '/tradeins', element: withSuspense(<TradeInsPage />) },
          { path: '/installments', element: withSuspense(<InstallmentsPage />) },
          { path: '/warranties', element: withSuspense(<WarrantiesPage />) },
          { path: '/finance', element: withSuspense(<FinancePage />) },
          {
            element: <RequireRole role="admin" />,
            children: [{ path: '/admin/users', element: withSuspense(<AdminUsersPage />) }],
          },
        ],
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
