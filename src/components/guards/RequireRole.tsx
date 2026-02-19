import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import type { Role } from '../../types'

type RequireRoleProps = {
  role?: Role
  allowedRoles?: Role[]
}

export function RequireRole({ role, allowedRoles }: RequireRoleProps) {
  const { loading, profile } = useAuth()
  const roles = allowedRoles ?? (role ? [role] : [])

  if (loading) {
    return <div className="min-h-screen grid place-items-center">Cargando...</div>
  }

  if (!profile) {
    return <Navigate to="/login" replace />
  }

  if (roles.length > 0 && !roles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
