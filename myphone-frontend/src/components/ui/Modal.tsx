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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
        <div className={cn('mt-4 space-y-3', actions && 'pb-2')}>{children}</div>
        {actions && <div className="mt-6 flex gap-2">{actions}</div>}
      </div>
    </div>
  )
}
