import type { ReactNode, MouseEvent } from 'react'
import { cn } from '../../lib/utils'

export function ActionMenu({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <details className={cn('relative inline-flex', className)}>
      <summary className="list-none cursor-pointer rounded-lg border border-[#E6EBF2] bg-white px-2.5 py-1.5 text-xs text-[#5B677A] shadow-[0_1px_2px_rgba(16,24,40,0.06)] transition hover:bg-[#F8FAFC]">
        •••
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-[#E6EBF2] bg-white p-1 shadow-[0_12px_32px_rgba(15,23,42,0.12)]">
        {children}
      </div>
    </details>
  )
}

export function ActionMenuItem({
  children,
  onClick,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
}) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.()
    const details = event.currentTarget.closest('details')
    if (details) details.removeAttribute('open')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#0F172A] hover:bg-[#F8FAFC]', className)}
    >
      {children}
    </button>
  )
}
