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
    <div className={cn('overflow-hidden rounded-2xl border border-[#E6EBF2] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]', className)}>
      <table className="w-full text-left text-sm [&_tbody_tr:nth-child(odd)]:bg-white [&_tbody_tr:nth-child(even)]:bg-[#FAFBFD] [&_tbody_tr:hover]:bg-[#F8FAFC] [&_tbody_tr]:border-b [&_tbody_tr]:border-[#E6EBF2]">
        <thead className="sticky top-0 bg-[#F8FAFC] text-xs font-semibold uppercase tracking-[0.12em] text-[#334155]">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
