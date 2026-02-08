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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
      <div className={cn('h-full w-full max-w-md border-l border-[#E6EBF2] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]')}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E6EBF2] bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-[#0F172A]">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-10 w-10 rounded-full p-0">
            ✕
          </Button>
        </div>
        <div className="max-h-[90vh] overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  )
}
