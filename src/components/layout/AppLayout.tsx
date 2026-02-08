import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { cn } from '../../lib/utils'
import { useState, type ReactNode } from 'react'
import logo from '../../assets/myphone.jpg'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { to: '/stock', label: 'Stock', icon: 'box' },
  { to: '/sales', label: 'Ventas', icon: 'sale' },
  { to: '/tradeins', label: 'Permutas', icon: 'swap' },
  { to: '/installments', label: 'Cuotas', icon: 'card' },
  { to: '/warranties', label: 'Garantías', icon: 'shield' },
  { to: '/finance', label: 'Finanzas', icon: 'chart' },
]

const icons: Record<string, ReactNode> = {
  grid: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
    </svg>
  ),
  box: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3.5 7.5L12 3l8.5 4.5L12 12z" />
      <path d="M4 7.5V17l8 4 8-4V7.5" />
    </svg>
  ),
  sale: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 12l5 5 11-11" />
      <path d="M20 7V3h-4" />
    </svg>
  ),
  swap: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M7 7h10l-3-3" />
      <path d="M17 17H7l3 3" />
    </svg>
  ),
  card: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6z" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 19h16" />
      <path d="M6 16V8" />
      <path d="M12 16V5" />
      <path d="M18 16v-6" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M16 11a4 4 0 1 0-8 0" />
      <path d="M4 21c1.5-4 6-6 8-6s6.5 2 8 6" />
    </svg>
  ),
}

export function AppLayout() {
  const { profile, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-[#0F172A]">
      <header className="sticky top-0 z-40 border-b border-[#E6EBF2] bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4">
          <div className="flex items-center gap-3 md:hidden">
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E6EBF2] text-[#0F172A]"
            >
              <span className="text-lg leading-none">≡</span>
            </button>
            <span className="text-sm font-semibold tracking-[-0.02em] text-[#0F172A]">MyPhone</span>
          </div>

          <div className="hidden md:flex md:flex-1 md:items-center md:gap-3">
            <div className="max-w-md flex-1">
              <Input placeholder="Buscar cliente, equipo o IMEI" />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Button size="sm" onClick={() => navigate('/sales/new')}>
              Nueva venta
            </Button>
            <div className="hidden items-center gap-3 md:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(11,74,162,0.08)] text-xs font-semibold text-[#0B4AA2]">
                {(profile?.full_name ?? profile?.email ?? 'U').slice(0, 1).toUpperCase()}
              </div>
              <div className="text-right text-xs text-[#5B677A]">
                <p className="font-medium text-[#0F172A]">{profile?.full_name ?? profile?.email}</p>
                <p className="uppercase tracking-[0.2em]">{profile?.role ?? '—'}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={signOut}>
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1200px] gap-6 px-4 py-6">
        <aside
          className={cn(
            'hidden flex-shrink-0 flex-col gap-6 rounded-2xl border border-[#E6EBF2] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.06)] md:flex',
            collapsed ? 'w-20' : 'w-[280px]'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="MyPhone"
                className={cn('rounded-xl object-cover', collapsed ? 'h-10 w-10' : 'h-12 w-12')}
              />
            </div>
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="hidden h-8 w-8 items-center justify-center rounded-full border border-[#E6EBF2] text-xs text-[#5B677A] md:inline-flex"
            >
              {collapsed ? '→' : '←'}
            </button>
          </div>

          <nav className="space-y-1">
            {!collapsed && <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Secciones</p>}
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[#5B677A] transition duration-200 hover:bg-[#F1F5F9]',
                    isActive && 'border-l-2 border-[#0B4AA2] bg-[rgba(11,74,162,0.08)] text-[#0B4AA2]'
                  )
                }
              >
                <span className="text-[#0B4AA2]">{icons[item.icon]}</span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
            {profile?.role === 'admin' && (
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[#5B677A] transition duration-200 hover:bg-[#F1F5F9]',
                    isActive && 'border-l-2 border-[#0B4AA2] bg-[rgba(11,74,162,0.08)] text-[#0B4AA2]'
                  )
                }
              >
                <span className="text-[#0B4AA2]">{icons.users}</span>
                {!collapsed && <span>Usuarios</span>}
              </NavLink>
            )}
          </nav>
        </aside>

        <main className="w-full space-y-6">
          <Outlet />
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E6EBF2] bg-white/90 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-1 px-3 py-2 text-xs">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-[#5B677A]',
                  isActive && 'bg-[rgba(11,74,162,0.08)] text-[#0B4AA2]'
                )
              }
            >
              {icons[item.icon]}
              {item.label}
            </NavLink>
          ))}
          {profile?.role === 'admin' && (
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-[#5B677A]',
                  isActive && 'bg-[rgba(11,74,162,0.08)] text-[#0B4AA2]'
                )
              }
            >
              {icons.users}
              Usuarios
            </NavLink>
          )}
        </div>
      </nav>
    </div>
  )
}
