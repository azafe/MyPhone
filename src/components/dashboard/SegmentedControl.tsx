import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

export type SegmentedOption<T extends string> = {
  label: string
  value: T
}

type SegmentedControlProps<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: Array<SegmentedOption<T>>
  ariaLabel: string
}

export function SegmentedControl<T extends string>({ value, onChange, options, ariaLabel }: SegmentedControlProps<T>) {
  return (
    <div
      className="flex w-full gap-2 overflow-x-auto rounded-xl bg-[#F1F5F9] p-1"
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <Button
            key={option.value}
            size="sm"
            variant={active ? 'primary' : 'secondary'}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-w-[68px] flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs md:text-sm',
              'focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2',
              !active && 'bg-white text-[#0F172A]'
            )}
            role="tab"
            aria-selected={active}
          >
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}
