import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-black',
  secondary: 'bg-haze text-ink hover:bg-white border border-ink/10',
  ghost: 'bg-transparent text-ink hover:bg-ink/5',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

const sizeClasses: Record<Size, string> = {
  sm: 'text-sm px-3 py-2',
  md: 'text-sm px-4 py-2.5',
  lg: 'text-base px-5 py-3',
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-xl font-medium transition shadow-soft focus:outline-none focus:ring-2 focus:ring-ember/40',
        variantClasses[variant],
        sizeClasses[size],
        props.disabled && 'opacity-60 cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
}
