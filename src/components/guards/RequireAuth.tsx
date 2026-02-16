import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function RequireAuth() {
  const { loading, isAuthenticated } = useAuth()

  if (loading) {
    return <div className="min-h-screen grid place-items-center">Cargando...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
