import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import type { Role } from '../../types'

export function RequireRole({ role }: { role: Role }) {
  const { loading, profile } = useAuth()

  if (loading) {
    return <div className="min-h-screen grid place-items-center">Cargando...</div>
  }

  if (!profile) {
    return <Navigate to="/login" replace />
  }

  if (profile.role !== role) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
