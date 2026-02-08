import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-[#E6EBF2] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]', className)}>
      {children}
    </div>
  )
}
