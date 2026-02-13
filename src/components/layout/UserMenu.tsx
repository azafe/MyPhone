import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

export function UserMenu() {
  const { profile, user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const fullName =
    profile?.full_name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.user_metadata?.name?.trim() ||
    'Sin nombre'
  const email = profile?.email?.trim() || user?.email?.trim() || 'Sin email'
  const role =
    profile?.role?.trim() ||
    user?.user_metadata?.role?.trim() ||
    'Rol no definido'

  const metadataDebug = user?.user_metadata ? JSON.stringify(user.user_metadata, null, 2) : 'Sin metadata'

  const initialSource =
    profile?.full_name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.user_metadata?.name?.trim() ||
    profile?.email?.trim() ||
    user?.email?.trim() ||
    'U'
  const initial = initialSource.slice(0, 1).toUpperCase()

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="Menú de usuario"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0B4AA2] text-sm font-semibold text-white shadow-[0_2px_6px_rgba(11,74,162,0.25)] transition hover:scale-[1.05]"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[240px] rounded-xl border border-[#E6EBF2] bg-white p-4 shadow-[0_10px_25px_rgba(0,0,0,0.08)] animate-in fade-in slide-in-from-top-1">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#0F172A]">{fullName}</p>
            <p className="text-xs text-[#5B677A]">{email}</p>
            <span className="inline-flex rounded-full bg-[rgba(11,74,162,0.08)] px-2 py-0.5 text-[11px] font-semibold text-[#0B4AA2]">
              {role}
            </span>
          </div>
          <pre className="mt-3 max-h-28 overflow-auto rounded-lg bg-[#F8FAFC] p-2 text-[10px] text-[#334155]">
            {metadataDebug}
          </pre>
          <div className="my-3 h-px bg-[#E6EBF2]" />
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              signOut()
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-[#DC2626] transition hover:bg-[rgba(220,38,38,0.08)]"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
