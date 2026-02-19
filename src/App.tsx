import { Suspense, lazy, type ComponentType, type ReactNode } from 'react'
import { Navigate, RouterProvider, createBrowserRouter, isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { RequireAuth } from './components/guards/RequireAuth'
import { RequireRole } from './components/guards/RequireRole'
import { Button } from './components/ui/Button'

const CHUNK_RELOAD_KEY = 'myphone_chunk_retry'

function isChunkLoadError(error: unknown) {
  const message = String((error as Error)?.message ?? '').toLowerCase()
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('loading module') ||
    message.includes('mime type') ||
    message.includes('chunk') ||
    message.includes('importing a module script failed')
  )
}

function lazyWithRetry<T extends ComponentType<object>>(loader: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const module = await loader()
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY)
      }
      return module
    } catch (error) {
      if (typeof window !== 'undefined' && isChunkLoadError(error)) {
        const reloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY)
        if (!reloaded) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
          window.location.reload()
          return new Promise<never>(() => {})
        }
      }
      throw error
    }
  })
}

const LoginPage = lazyWithRetry(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const DashboardPage = lazyWithRetry(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const StockPage = lazyWithRetry(() => import('./pages/StockPage').then((m) => ({ default: m.StockPage })))
const SalesPage = lazyWithRetry(() => import('./pages/SalesPage').then((m) => ({ default: m.SalesPage })))
const SalesNewPage = lazyWithRetry(() => import('./pages/SalesNewPage').then((m) => ({ default: m.SalesNewPage })))
const TradeInsPage = lazyWithRetry(() => import('./pages/TradeInsPage').then((m) => ({ default: m.TradeInsPage })))
const WarrantiesPage = lazyWithRetry(() => import('./pages/WarrantiesPage').then((m) => ({ default: m.WarrantiesPage })))
const PlanCanjePage = lazyWithRetry(() => import('./pages/PlanCanjePage').then((m) => ({ default: m.PlanCanjePage })))
const CalculatorPage = lazyWithRetry(() => import('./pages/CalculatorPage').then((m) => ({ default: m.CalculatorPage })))
const FinancePage = lazyWithRetry(() => import('./pages/FinancePage').then((m) => ({ default: m.FinancePage })))
const AdminUsersPage = lazyWithRetry(() => import('./pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })))

function withSuspense(node: ReactNode) {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Cargando...</div>}>
      {node}
    </Suspense>
  )
}

function RouterErrorBoundary() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : (error as Error)?.message || 'Error inesperado de navegación'

  return (
    <div className="min-h-screen grid place-items-center bg-[#F6F8FB] p-6">
      <div className="w-full max-w-lg rounded-2xl border border-[#E6EBF2] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
        <h2 className="text-xl font-semibold text-[#0F172A]">No se pudo cargar la pantalla</h2>
        <p className="mt-2 text-sm text-[#5B677A]">{message}</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => window.location.reload()}>Recargar</Button>
          <Button variant="secondary" onClick={() => window.location.assign('/dashboard')}>
            Ir al dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}

const router = createBrowserRouter([
  { path: '/login', element: withSuspense(<LoginPage />), errorElement: <RouterErrorBoundary /> },
  {
    element: <RequireAuth />,
    errorElement: <RouterErrorBoundary />,
    children: [
      {
        element: <AppLayout />,
        errorElement: <RouterErrorBoundary />,
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
            element: <RequireRole allowedRoles={['admin', 'owner']} />,
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
