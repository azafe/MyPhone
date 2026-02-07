import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { Button } from './Button'

export function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30">
      <div className={cn('h-full w-full max-w-md bg-white p-6 shadow-soft')}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
        <div className="mt-4 space-y-3">{children}</div>
      </div>
    </div>
  )
}
