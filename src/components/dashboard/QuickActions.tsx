import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'
import type { ReactNode } from 'react'

const actions = [
  { label: 'Nueva venta', to: '/sales/new', icon: 'sale' },
  { label: 'Permuta', to: '/tradeins', icon: 'swap' },
  { label: 'Cuotas', to: '/installments', icon: 'card' },
  { label: 'Garantías', to: '/warranties', icon: 'shield' },
]

const icons: Record<string, ReactNode> = {
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
}

export function QuickActions() {
  const navigate = useNavigate()

  return (
    <div className="rounded-2xl border border-[#E6EBF2] bg-white p-4 shadow-[0_6px_16px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0F172A]">Acciones rápidas</h3>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => navigate(action.to)}
            aria-label={action.label}
            className={cn(
              'flex items-center gap-3 rounded-xl border border-[#E6EBF2] bg-white px-3 py-3 text-left text-sm text-[#0F172A] transition hover:bg-[#F8FAFC]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2'
            )}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(11,74,162,0.08)] text-[#0B4AA2]">
              {icons[action.icon]}
            </span>
            <span className="font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
