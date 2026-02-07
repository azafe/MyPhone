import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm text-ink shadow-soft placeholder:text-ink/40 focus:border-ember focus:outline-none focus:ring-2 focus:ring-ember/30',
        className
      )}
      {...props}
    />
  )
}
