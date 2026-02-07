import { cn } from '../../lib/utils'

const colors: Record<string, string> = {
  available: 'bg-moss/15 text-moss',
  reserved: 'bg-ember/15 text-ember',
  sold: 'bg-ink/10 text-ink',
  pending: 'bg-ember/15 text-ember',
  valued: 'bg-ocean/15 text-ocean',
  added_to_stock: 'bg-moss/15 text-moss',
  rejected: 'bg-red-100 text-red-600',
  expired: 'bg-ink/10 text-ink',
  active: 'bg-moss/15 text-moss',
}

export function Badge({ label, tone }: { label: string; tone?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        tone ? colors[tone] : 'bg-ink/10 text-ink'
      )}
    >
      {label}
    </span>
  )
}
