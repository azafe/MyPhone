import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/stock', label: 'Stock' },
  { to: '/sales', label: 'Ventas' },
  { to: '/tradeins', label: 'Permutas' },
  { to: '/installments', label: 'Cuotas' },
  { to: '/warranties', label: 'Garantías' },
  { to: '/finance', label: 'Finanzas' },
]

export function AppLayout() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-ink/40">MyPhone</p>
            <h1 className="text-lg font-semibold text-ink">Gestión rápida</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-xs text-ink/60">
              <p className="font-medium text-ink">{profile?.full_name ?? profile?.email}</p>
              <p className="uppercase tracking-[0.2em]">{profile?.role ?? '—'}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Salir
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        <aside className="hidden w-56 flex-shrink-0 md:block">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'block rounded-xl px-3 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5',
                    isActive && 'bg-ink text-white'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            {profile?.role === 'admin' && (
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  cn(
                    'block rounded-xl px-3 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5',
                    isActive && 'bg-ink text-white'
                  )
                }
              >
                Usuarios
              </NavLink>
            )}
          </nav>
        </aside>

        <main className="w-full">
          <Outlet />
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink/10 bg-white/90 backdrop-blur md:hidden">
        <div className="flex flex-wrap items-center justify-between gap-1 px-3 py-2 text-xs">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-2 py-1 font-medium text-ink/60',
                  isActive && 'bg-ink text-white'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          {profile?.role === 'admin' && (
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-2 py-1 font-medium text-ink/60',
                  isActive && 'bg-ink text-white'
                )
              }
            >
              Usuarios
            </NavLink>
          )}
        </div>
      </nav>
    </div>
  )
}
