import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { Button } from './Button'

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  actions,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  actions?: ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-[min(860px,calc(100vw-48px))] max-w-[860px] flex-col overflow-hidden rounded-2xl border border-[#E6EBF2] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-all duration-200 ease-out animate-in fade-in slide-in-from-bottom-2">
        <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-[#E6EBF2] bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A]">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-[#5B677A]">{subtitle}</p>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Cerrar"
            className="h-10 w-10 rounded-full p-0 hover:bg-[#F1F5F9]"
          >
            ✕
          </Button>
        </div>
        <div className={cn('flex-1 overflow-y-auto px-6 py-6', actions ? 'pb-20' : undefined)}>{children}</div>
        {actions && (
          <div className="sticky bottom-0 z-20 border-t border-[#E6EBF2] bg-white px-6 py-4">
            <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
          </div>
        )}
      </div>
    </div>
  )
}
