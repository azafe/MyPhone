import type { SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm text-ink shadow-soft focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}
