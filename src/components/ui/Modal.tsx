import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { Button } from './Button'

export function Modal({
  open,
  title,
  onClose,
  children,
  actions,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  actions?: ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={onClose} />
      <div className="relative w-full max-w-[720px] overflow-hidden rounded-3xl bg-white shadow-soft transition-all duration-200 ease-out animate-in fade-in slide-in-from-bottom-2">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink/10 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar">
            ✕
          </Button>
        </div>
        <div className={cn('max-h-[90vh] overflow-y-auto px-6 py-4', actions ? 'pb-24' : undefined)}>{children}</div>
        {actions && (
          <div className="sticky bottom-0 z-10 border-t border-ink/10 bg-white px-6 py-4">
            <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
          </div>
        )}
      </div>
    </div>
  )
}
