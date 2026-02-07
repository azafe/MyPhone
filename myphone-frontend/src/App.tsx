import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { RequireAuth } from './components/guards/RequireAuth'
import { RequireRole } from './components/guards/RequireRole'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { StockPage } from './pages/StockPage'
import { SalesPage } from './pages/SalesPage'
import { SalesNewPage } from './pages/SalesNewPage'
import { TradeInsPage } from './pages/TradeInsPage'
import { InstallmentsPage } from './pages/InstallmentsPage'
import { WarrantiesPage } from './pages/WarrantiesPage'
import { FinancePage } from './pages/FinancePage'
import { AdminUsersPage } from './pages/AdminUsersPage'

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/stock', element: <StockPage /> },
          { path: '/sales', element: <SalesPage /> },
          { path: '/sales/new', element: <SalesNewPage /> },
          { path: '/tradeins', element: <TradeInsPage /> },
          { path: '/installments', element: <InstallmentsPage /> },
          { path: '/warranties', element: <WarrantiesPage /> },
          { path: '/finance', element: <FinancePage /> },
          {
            element: <RequireRole role="admin" />,
            children: [{ path: '/admin/users', element: <AdminUsersPage /> }],
          },
        ],
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
