import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { useState, type ReactNode } from 'react'
import logo from '../../assets/myphone.png'
import { UserMenu } from './UserMenu'
import { useAuth } from '../../hooks/useAuth'

const baseNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { to: '/pos', label: 'POS', icon: 'pos' },
  { to: '/stock', label: 'Stock', icon: 'box' },
  { to: '/sales', label: 'Ventas', icon: 'sale' },
  { to: '/tradeins', label: 'Permutas', icon: 'swap' },
  { to: '/warranties', label: 'Garantías', icon: 'shield' },
  { to: '/plan-canje', label: 'Plan Canje', icon: 'table' },
  { to: '/calculator', label: 'Calculadora', icon: 'card' },
]

const adminNavItems = [
  { to: '/finance', label: 'Finance', icon: 'chart' },
  { to: '/admin/users', label: 'Usuarios', icon: 'users' },
]

const baseBottomNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { to: '/stock', label: 'Stock', icon: 'box' },
  { to: '/sales/new', label: 'Nueva', icon: 'plus' },
  { to: '/sales', label: 'Ventas', icon: 'sale' },
  { to: '/calculator', label: 'Calc', icon: 'card' },
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
  pos: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 6h16l-1.4 8H5.4L4 6Z" />
      <circle cx="9" cy="18" r="1.6" />
      <circle cx="16" cy="18" r="1.6" />
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
  shield: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6z" />
    </svg>
  ),
  table: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 5h16v14H4z" />
      <path d="M4 10h16" />
      <path d="M10 10v9" />
      <path d="M16 10v9" />
    </svg>
  ),
  card: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 19h16" />
      <path d="M7 16V9" />
      <path d="M12 16V6" />
      <path d="M17 16v-4" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="3" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a3 3 0 0 1 0 5.75" />
    </svg>
  ),
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { profile } = useAuth()
  const role = String(profile?.role ?? '').toLowerCase()
  const isAdmin = role === 'admin' || role === 'owner'
  const navItems = isAdmin ? [...baseNavItems, ...adminNavItems] : baseNavItems
  const bottomNavItems = isAdmin
    ? [...baseBottomNavItems.slice(0, 4), { to: '/finance', label: 'Finance', icon: 'chart' }]
    : baseBottomNavItems

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-[#0F172A]">
      <header className="sticky top-0 z-40 border-b border-[#E6EBF2] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-4">
          <div className="flex flex-1 items-center justify-start gap-3 md:hidden">
            <img src={logo} alt="MyPhone" className="h-6 w-auto object-contain" />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1280px] gap-6 px-4 py-6">
        <aside
          className={cn(
            'hidden flex-shrink-0 flex-col rounded-2xl border border-[#E6EBF2] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)] md:flex',
            collapsed ? 'w-20' : 'w-[280px]',
          )}
        >
          <div className="flex h-[80px] items-center justify-between border-b border-[#E6EBF2] px-5">
            {collapsed ? (
              <div className="flex h-full w-full items-center justify-center">
                <img src={logo} alt="MyPhone" className="h-10 w-10 rounded-xl object-cover" />
              </div>
            ) : (
              <div className="flex flex-col">
                <img src={logo} alt="MyPhone" className="h-10 w-28 object-contain" />
                <span className="mt-1 text-xs text-[#5B677A]">MVP operativo</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="hidden h-8 w-8 items-center justify-center rounded-full border border-[#E6EBF2] text-xs text-[#5B677A] md:inline-flex"
            >
              {collapsed ? '→' : '←'}
            </button>
          </div>

          <nav className="mt-4 space-y-1 px-4 pb-4">
            {!collapsed && (
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#5B677A]">Secciones</p>
            )}
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[#5B677A] transition duration-200 hover:bg-[#F1F5F9]',
                    isActive && 'border-l-2 border-[#0B4AA2] bg-[rgba(11,74,162,0.08)] text-[#0B4AA2]',
                  )
                }
              >
                <span className="text-[#0B4AA2]">{icons[item.icon]}</span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="w-full space-y-6 pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-0">
          <Outlet />
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E6EBF2] bg-white/90 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-1 px-3 py-2 text-[11px]">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-1 font-medium text-[#5B677A] transition',
                  isActive && 'bg-[rgba(11,74,162,0.08)] text-[#0B4AA2]',
                )
              }
            >
              {icons[item.icon]}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
