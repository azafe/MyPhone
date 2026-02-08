import { cn } from '../../lib/utils'

const colors: Record<string, string> = {
  available: 'bg-[rgba(22,163,74,0.12)] text-[#166534]',
  reserved: 'bg-[rgba(245,158,11,0.14)] text-[#92400E]',
  sold: 'bg-[rgba(91,103,122,0.16)] text-[#334155]',
  pending: 'bg-[rgba(245,158,11,0.14)] text-[#92400E]',
  valued: 'bg-[rgba(11,74,162,0.08)] text-[#0B4AA2]',
  added_to_stock: 'bg-[rgba(22,163,74,0.12)] text-[#166534]',
  rejected: 'bg-[rgba(220,38,38,0.12)] text-[#991B1B]',
  expired: 'bg-[rgba(91,103,122,0.16)] text-[#334155]',
  active: 'bg-[rgba(22,163,74,0.12)] text-[#166534]',
}

export function Badge({ label, tone }: { label: string; tone?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        tone ? colors[tone] : 'bg-[rgba(11,74,162,0.08)] text-[#0B4AA2]'
      )}
    >
      {label}
    </span>
  )
}
