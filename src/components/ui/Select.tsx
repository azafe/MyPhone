import type { SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'h-11 w-full rounded-xl border border-[#E6EBF2] bg-white px-3.5 text-sm text-[#0F172A] shadow-[0_1px_2px_rgba(16,24,40,0.06)] focus:border-[#0B4AA2] focus:outline-none focus:ring-2 focus:ring-[rgba(11,74,162,0.25)]',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}
