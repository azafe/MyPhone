import type { ReactNode } from 'react'

export function Field({
  label,
  helper,
  children,
}: {
  label: string
  helper?: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-2 text-sm text-[#0F172A]">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5B677A]">{label}</span>
      {children}
      {helper && <span className="block text-xs text-[#5B677A]">{helper}</span>}
    </label>
  )
}
