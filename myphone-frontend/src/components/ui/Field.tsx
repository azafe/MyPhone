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
    <label className="block space-y-1 text-sm text-ink/70">
      <span className="text-xs uppercase tracking-[0.12em] text-ink/50">{label}</span>
      {children}
      {helper && <span className="block text-xs text-ink/40">{helper}</span>}
    </label>
  )
}
