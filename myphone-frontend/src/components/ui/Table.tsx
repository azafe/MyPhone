import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function Table({
  headers,
  children,
  className,
}: {
  headers: string[]
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-soft', className)}>
      <table className="w-full text-left text-sm">
        <thead className="bg-haze text-xs uppercase tracking-[0.12em] text-ink/60">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/5">{children}</tbody>
      </table>
    </div>
  )
}
