import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-[#0B4AA2] text-white hover:bg-[#083B82]',
  secondary: 'bg-white text-[#0F172A] border border-[#E6EBF2] hover:bg-[#F1F5F9]',
  ghost: 'bg-transparent text-[#0B4AA2] hover:bg-[rgba(11,74,162,0.08)]',
  danger: 'bg-[#DC2626] text-white hover:bg-[#B91C1C]',
}

const sizeClasses: Record<Size, string> = {
  sm: 'text-sm px-3 py-2',
  md: 'text-sm px-4 py-2',
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
        'rounded-xl font-medium transition duration-200 shadow-[0_1px_2px_rgba(16,24,40,0.06)] focus:outline-none focus:ring-2 focus:ring-[rgba(11,74,162,0.25)]',
        variantClasses[variant],
        sizeClasses[size],
        props.disabled && 'opacity-60 cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
}
